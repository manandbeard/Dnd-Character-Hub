import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  usersTable,
  campaignsTable,
  campaignMembersTable,
  campaignListingsTable,
  joinRequestsTable,
  userBlocksTable,
  reportsTable,
} from "@workspace/db";
import { eq, and, or, ilike, desc, gte, lte, inArray, sql, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── Public discovery (no auth) ──────────────────────────────────────────────

router.get("/discovery/campaigns", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const levelMin = req.query.levelMin ? Number(req.query.levelMin) : undefined;
  const levelMax = req.query.levelMax ? Number(req.query.levelMax) : undefined;
  const system = typeof req.query.system === "string" ? req.query.system : undefined;

  const conds = [
    eq(campaignsTable.privacy, "public"),
    eq(campaignListingsTable.isOpen, true),
  ];
  if (search) conds.push(ilike(campaignsTable.name, `%${search}%`));
  if (system) conds.push(ilike(campaignListingsTable.system, `%${system}%`));
  if (levelMin !== undefined) conds.push(gte(campaignListingsTable.levelMax, levelMin));
  if (levelMax !== undefined) conds.push(lte(campaignListingsTable.levelMin, levelMax));

  const rows = await db
    .select({
      listing: campaignListingsTable,
      campaign: campaignsTable,
      dm: usersTable,
    })
    .from(campaignListingsTable)
    .innerJoin(campaignsTable, eq(campaignListingsTable.campaignId, campaignsTable.id))
    .innerJoin(usersTable, eq(campaignsTable.dmUserId, usersTable.id))
    .where(and(...conds))
    .orderBy(desc(campaignListingsTable.updatedAt));

  // Filter by viewer block list if signed in
  let blockedIds = new Set<string>();
  const viewerId = req.userId; // requireAuth not applied; userId may be undefined
  if (viewerId) {
    const blocks = await db
      .select({ blockedUserId: userBlocksTable.blockedUserId })
      .from(userBlocksTable)
      .where(eq(userBlocksTable.blockerUserId, viewerId));
    blockedIds = new Set(blocks.map((b) => b.blockedUserId));
  }

  // Member counts in one query
  const campaignIds = rows.map((r) => r.campaign.id);
  const counts = campaignIds.length
    ? await db
        .select({
          campaignId: campaignMembersTable.campaignId,
          count: sql<number>`count(*)::int`,
        })
        .from(campaignMembersTable)
        .where(inArray(campaignMembersTable.campaignId, campaignIds))
        .groupBy(campaignMembersTable.campaignId)
    : [];
  const countMap = new Map(counts.map((c) => [c.campaignId, c.count]));

  const result = rows
    .filter((r) => !blockedIds.has(r.dm.id))
    .map((r) => ({
      listing: r.listing,
      campaignId: r.campaign.id,
      campaignName: r.campaign.name,
      campaignDescription: r.campaign.description,
      memberCount: countMap.get(r.campaign.id) ?? 0,
      dm: toPublicProfile(r.dm),
    }));

  res.json(result);
});

router.get("/discovery/profiles/:userId", async (req, res): Promise<void> => {
  const targetId = String(req.params.userId);
  const viewerId = req.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!user || !user.isPublic) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  // Hide profile if either side has blocked the other.
  if (viewerId && viewerId !== targetId) {
    const blocks = await db
      .select()
      .from(userBlocksTable)
      .where(
        or(
          and(eq(userBlocksTable.blockerUserId, viewerId), eq(userBlocksTable.blockedUserId, targetId)),
          and(eq(userBlocksTable.blockerUserId, targetId), eq(userBlocksTable.blockedUserId, viewerId)),
        ),
      );
    if (blocks.length > 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
  }
  res.json(toPublicProfile(user));
});

// ── Campaign privacy + listing (DM) ─────────────────────────────────────────

router.patch("/campaigns/:id/privacy", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const privacy = req.body?.privacy as "public" | "invite_only" | "private";
  if (!["public", "invite_only", "private"].includes(privacy)) {
    res.status(400).json({ error: "Invalid privacy value" });
    return;
  }
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.dmUserId !== userId) { res.status(403).json({ error: "Only the DM can change privacy" }); return; }
  const [updated] = await db.update(campaignsTable).set({ privacy }).where(eq(campaignsTable.id, id)).returning();
  res.json(updated);
});

router.get("/campaigns/:id/listing", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const [member] = await db
    .select()
    .from(campaignMembersTable)
    .where(and(eq(campaignMembersTable.campaignId, id), eq(campaignMembersTable.userId, userId)));
  if (!member) { res.status(403).json({ error: "Not a campaign member" }); return; }
  const [listing] = await db.select().from(campaignListingsTable).where(eq(campaignListingsTable.campaignId, id));
  res.json(listing ?? null);
});

router.put("/campaigns/:id/listing", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.dmUserId !== userId) { res.status(403).json({ error: "Only the DM can manage the listing" }); return; }

  const body = req.body ?? {};
  const values = {
    campaignId: id,
    system: typeof body.system === "string" ? body.system : "D&D 5e",
    levelMin: Number.isInteger(body.levelMin) ? body.levelMin : 1,
    levelMax: Number.isInteger(body.levelMax) ? body.levelMax : 20,
    schedule: typeof body.schedule === "string" ? body.schedule : "",
    pitch: typeof body.pitch === "string" ? body.pitch : "",
    openSlots: Number.isInteger(body.openSlots) ? body.openSlots : 1,
    isOpen: typeof body.isOpen === "boolean" ? body.isOpen : true,
  };
  if (values.levelMin > values.levelMax) {
    res.status(400).json({ error: "levelMin must be <= levelMax" });
    return;
  }

  const [existing] = await db.select().from(campaignListingsTable).where(eq(campaignListingsTable.campaignId, id));
  let row;
  if (existing) {
    [row] = await db.update(campaignListingsTable).set(values).where(eq(campaignListingsTable.campaignId, id)).returning();
  } else {
    [row] = await db.insert(campaignListingsTable).values(values).returning();
  }
  res.json(row);
});

router.delete("/campaigns/:id/listing", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.dmUserId !== userId) { res.status(403).json({ error: "Only the DM can remove the listing" }); return; }
  await db.delete(campaignListingsTable).where(eq(campaignListingsTable.campaignId, id));
  res.status(204).send();
});

// ── Join requests ──────────────────────────────────────────────────────────

router.post("/campaigns/:id/join-requests", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.privacy !== "public") { res.status(403).json({ error: "This campaign is not accepting public requests" }); return; }

  // Already a member?
  const [member] = await db
    .select()
    .from(campaignMembersTable)
    .where(and(eq(campaignMembersTable.campaignId, id), eq(campaignMembersTable.userId, userId)));
  if (member) { res.status(400).json({ error: "Already a member of this campaign" }); return; }

  // Existing row? (DB enforces unique on campaign+user). Re-open declined/cancelled requests by updating in place.
  const [existing] = await db
    .select()
    .from(joinRequestsTable)
    .where(and(eq(joinRequestsTable.campaignId, id), eq(joinRequestsTable.userId, userId)));
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  if (existing) {
    if (existing.status === "pending") {
      res.status(400).json({ error: "Join request already pending" });
      return;
    }
    const [reopened] = await db
      .update(joinRequestsTable)
      .set({ status: "pending", message, decidedAt: null, createdAt: new Date() })
      .where(eq(joinRequestsTable.id, existing.id))
      .returning();
    res.status(201).json(reopened);
    return;
  }
  const [created] = await db
    .insert(joinRequestsTable)
    .values({ campaignId: id, userId, message })
    .returning();
  res.status(201).json(created);
});

router.get("/campaigns/:id/join-requests", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const id = Number(req.params.id);
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.dmUserId !== userId) { res.status(403).json({ error: "Only the DM can view join requests" }); return; }

  const rows = await db
    .select({ jr: joinRequestsTable, u: usersTable })
    .from(joinRequestsTable)
    .leftJoin(usersTable, eq(joinRequestsTable.userId, usersTable.id))
    .where(eq(joinRequestsTable.campaignId, id))
    .orderBy(desc(joinRequestsTable.createdAt));

  res.json(rows.map((r) => ({ ...r.jr, user: r.u ? toPublicProfile(r.u) : undefined })));
});

router.get("/join-requests/me", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const rows = await db
    .select()
    .from(joinRequestsTable)
    .where(eq(joinRequestsTable.userId, userId))
    .orderBy(desc(joinRequestsTable.createdAt));
  res.json(rows);
});

router.post("/join-requests/:id/approve", requireAuth, async (req, res): Promise<void> => {
  await decideJoinRequest(req, res, "approved");
});
router.post("/join-requests/:id/decline", requireAuth, async (req, res): Promise<void> => {
  await decideJoinRequest(req, res, "declined");
});

async function decideJoinRequest(req: Request, res: Response, decision: "approved" | "declined"): Promise<void> {
  const { userId } = req;
  const id = Number(req.params.id);
  try {
    const updated = await db.transaction(async (tx) => {
      const [jr] = await tx.select().from(joinRequestsTable).where(eq(joinRequestsTable.id, id));
      if (!jr) throw new HttpError(404, "Join request not found");
      const [campaign] = await tx.select().from(campaignsTable).where(eq(campaignsTable.id, jr.campaignId));
      if (!campaign || campaign.dmUserId !== userId) throw new HttpError(403, "Only the DM can decide join requests");
      if (jr.status !== "pending") throw new HttpError(400, "Already decided");

      if (decision === "approved") {
        // Capacity check (best-effort): if a listing exists with openSlots, ensure there's room.
        const [listing] = await tx.select().from(campaignListingsTable).where(eq(campaignListingsTable.campaignId, jr.campaignId));
        if (listing && listing.openSlots <= 0) {
          throw new HttpError(400, "No open slots remaining on this listing");
        }
        if (listing) {
          await tx
            .update(campaignListingsTable)
            .set({ openSlots: Math.max(0, listing.openSlots - 1) })
            .where(eq(campaignListingsTable.campaignId, jr.campaignId));
        }
        await tx
          .insert(campaignMembersTable)
          .values({ campaignId: jr.campaignId, userId: jr.userId, role: "player" })
          .onConflictDoNothing();
      }

      const [row] = await tx
        .update(joinRequestsTable)
        .set({ status: decision, decidedAt: new Date() })
        .where(eq(joinRequestsTable.id, id))
        .returning();
      return row;
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
    } else {
      throw err;
    }
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ── Blocks ────────────────────────────────────────────────────────────────

router.get("/users/me/blocks", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(userBlocksTable).where(eq(userBlocksTable.blockerUserId, req.userId));
  res.json(rows.map((r) => ({ id: r.id, blockedUserId: r.blockedUserId, createdAt: r.createdAt })));
});

router.post("/users/:userId/block", requireAuth, async (req, res): Promise<void> => {
  const blockedUserId = String(req.params.userId);
  if (blockedUserId === req.userId) { res.status(400).json({ error: "Cannot block yourself" }); return; }
  const [existing] = await db
    .select()
    .from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerUserId, req.userId), eq(userBlocksTable.blockedUserId, blockedUserId)));
  if (existing) { res.status(201).json({ id: existing.id, blockedUserId, createdAt: existing.createdAt }); return; }
  const [row] = await db
    .insert(userBlocksTable)
    .values({ blockerUserId: req.userId, blockedUserId })
    .returning();
  res.status(201).json({ id: row.id, blockedUserId, createdAt: row.createdAt });
});

router.delete("/users/:userId/block", requireAuth, async (req, res): Promise<void> => {
  const blockedUserId = String(req.params.userId);
  await db
    .delete(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerUserId, req.userId), eq(userBlocksTable.blockedUserId, blockedUserId)));
  res.status(204).send();
});

// ── Reports ───────────────────────────────────────────────────────────────

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const { targetType, targetId, reason, details } = req.body ?? {};
  if (!["user", "campaign"].includes(targetType)) { res.status(400).json({ error: "Invalid targetType" }); return; }
  if (typeof targetId !== "string" || targetId.length === 0) { res.status(400).json({ error: "targetId required" }); return; }
  if (typeof reason !== "string" || reason.trim().length === 0) { res.status(400).json({ error: "reason required" }); return; }
  await db.insert(reportsTable).values({
    reporterUserId: req.userId,
    targetType,
    targetId,
    reason,
    details: typeof details === "string" ? details : "",
  });
  res.status(201).json({ ok: true });
});

// ── Helpers ───────────────────────────────────────────────────────────────

function toPublicProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    playstyleTags: user.playstyleTags,
    experienceLevel: user.experienceLevel,
    availability: user.availability,
    timezone: user.timezone,
  };
}

// Suppress unused import lint
void ne;

export default router;
