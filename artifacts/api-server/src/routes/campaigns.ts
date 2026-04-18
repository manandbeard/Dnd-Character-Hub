import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import {
  db,
  campaignsTable,
  campaignMembersTable,
  campaignCharactersTable,
  partyItemsTable,
  ledgerEntriesTable,
  charactersTable,
  usersTable,
  characterInventoryTable,
} from "@workspace/db";
import { eq, and, ilike, desc, inArray } from "drizzle-orm";
import {
  CreateCampaignBody,
  JoinCampaignBody,
  GetCampaignParams,
  UpdateCampaignParams,
  UpdateCampaignBody,
  DeleteCampaignParams,
  RefreshInviteCodeParams,
  RemoveCampaignMemberParams,
  ListCampaignCharactersParams,
  AttachCharacterToCampaignParams,
  AttachCharacterToCampaignBody,
  DetachCharacterFromCampaignParams,
  ListPartyItemsParams,
  ListPartyItemsQueryParams,
  AddPartyItemParams,
  AddPartyItemBody,
  UpdatePartyItemParams,
  UpdatePartyItemBody,
  RemovePartyItemParams,
  TransferPartyItemParams,
  TransferPartyItemBody,
  DepositCurrencyParams,
  DepositCurrencyBody,
  WithdrawCurrencyParams,
  WithdrawCurrencyBody,
  SplitCurrencyParams,
  SplitCurrencyBody,
  ListLedgerEntriesParams,
  ListLedgerEntriesQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { computeDerivedStats } from "../lib/rules-service";

const router: IRouter = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A3F9C1B2"
}

// Helper: assert user is a campaign member; returns the member row or sends 403
async function assertMember(
  res: Parameters<typeof router.get>[1] extends (req: unknown, res: infer R, next: unknown) => unknown ? R : never,
  campaignId: number,
  userId: string
) {
  const [member] = await db
    .select()
    .from(campaignMembersTable)
    .where(
      and(
        eq(campaignMembersTable.campaignId, campaignId),
        eq(campaignMembersTable.userId, userId)
      )
    );
  return member ?? null;
}

// ── Campaign CRUD ─────────────────────────────────────────────────────────────

// GET /campaigns — list campaigns for user
router.get("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const memberships = await db
    .select({ campaignId: campaignMembersTable.campaignId })
    .from(campaignMembersTable)
    .where(eq(campaignMembersTable.userId, userId));

  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const ids = memberships.map((m) => m.campaignId);
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(inArray(campaignsTable.id, ids))
    .orderBy(desc(campaignsTable.updatedAt));
  res.json(campaigns);
});

// POST /campaigns — create campaign
router.post("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const inviteCode = generateInviteCode();

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      inviteCode,
      dmUserId: userId,
    })
    .returning();

  // DM is also a member
  await db.insert(campaignMembersTable).values({
    campaignId: campaign.id,
    userId,
    role: "dm",
  });

  res.status(201).json(campaign);
});

// POST /campaigns/join — join via invite code (MUST be before /campaigns/:id)
router.post("/campaigns/join", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const parsed = JoinCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.inviteCode, parsed.data.inviteCode.toUpperCase()));

  if (!campaign) {
    res.status(400).json({ error: "Invalid invite code" });
    return;
  }

  // Already a member?
  const existing = await assertMember(res as never, campaign.id, userId);
  if (existing) {
    res.json(campaign);
    return;
  }

  await db.insert(campaignMembersTable).values({
    campaignId: campaign.id,
    userId,
    role: "player",
  });

  res.json(campaign);
});

// GET /campaigns/:id — get campaign details
router.get("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // Load members with user profile
  const members = await db
    .select({
      id: campaignMembersTable.id,
      campaignId: campaignMembersTable.campaignId,
      userId: campaignMembersTable.userId,
      role: campaignMembersTable.role,
      joinedAt: campaignMembersTable.joinedAt,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(campaignMembersTable)
    .leftJoin(usersTable, eq(campaignMembersTable.userId, usersTable.id))
    .where(eq(campaignMembersTable.campaignId, params.data.id));

  res.json({ ...campaign, members });
});

// PATCH /campaigns/:id — update name/description (DM only)
router.patch("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.dmUserId !== userId) {
    res.status(403).json({ error: "Only the DM can update the campaign" });
    return;
  }

  const updates: Partial<typeof campaign> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const [updated] = await db
    .update(campaignsTable)
    .set(updates)
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// DELETE /campaigns/:id — delete campaign (DM only)
router.delete("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.dmUserId !== userId) {
    res.status(403).json({ error: "Only the DM can delete the campaign" });
    return;
  }

  await db.delete(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  res.status(204).send();
});

// POST /campaigns/:id/invite/refresh — regenerate invite code (DM only)
router.post("/campaigns/:id/invite/refresh", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = RefreshInviteCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.dmUserId !== userId) {
    res.status(403).json({ error: "Only the DM can refresh the invite code" });
    return;
  }

  const inviteCode = generateInviteCode();
  await db
    .update(campaignsTable)
    .set({ inviteCode })
    .where(eq(campaignsTable.id, params.data.id));

  res.json({ inviteCode });
});

// DELETE /campaigns/:id/members/:userId — remove member (DM only)
router.delete("/campaigns/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const { userId: requesterId } = req;
  const params = RemoveCampaignMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.dmUserId !== requesterId) {
    res.status(403).json({ error: "Only the DM can remove members" });
    return;
  }
  if (params.data.userId === requesterId) {
    res.status(400).json({ error: "DM cannot remove themselves" });
    return;
  }

  const result = await db
    .delete(campaignMembersTable)
    .where(
      and(
        eq(campaignMembersTable.campaignId, params.data.id),
        eq(campaignMembersTable.userId, params.data.userId)
      )
    )
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.status(204).send();
});

// ── Campaign Characters ────────────────────────────────────────────────────────

// GET /campaigns/:id/characters — list party characters
router.get("/campaigns/:id/characters", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = ListCampaignCharactersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const rows = await db
    .select({ characterId: campaignCharactersTable.characterId })
    .from(campaignCharactersTable)
    .where(eq(campaignCharactersTable.campaignId, params.data.id));

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const characterIds = rows.map((r) => r.characterId);
  const characters = await db
    .select()
    .from(charactersTable)
    .where(inArray(charactersTable.id, characterIds));

  res.json(characters.map((c) => ({ ...c, ...computeDerivedStats(c) })));
});

// POST /campaigns/:id/characters — attach character
router.post("/campaigns/:id/characters", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = AttachCharacterToCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AttachCharacterToCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  // Verify user owns the character
  const [character] = await db
    .select()
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.id, parsed.data.characterId),
        eq(charactersTable.userId, userId)
      )
    );

  if (!character) {
    res.status(404).json({ error: "Character not found or not yours" });
    return;
  }

  // Insert (ignore if already attached via unique constraint)
  await db
    .insert(campaignCharactersTable)
    .values({
      campaignId: params.data.id,
      characterId: parsed.data.characterId,
      userId,
    })
    .onConflictDoNothing();

  res.status(201).json({ ...character, ...computeDerivedStats(character) });
});

// DELETE /campaigns/:id/characters/:characterId — detach character
router.delete("/campaigns/:id/characters/:characterId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = DetachCharacterFromCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // Only the character owner or DM can detach
  const [row] = await db
    .select()
    .from(campaignCharactersTable)
    .where(
      and(
        eq(campaignCharactersTable.campaignId, params.data.id),
        eq(campaignCharactersTable.characterId, params.data.characterId)
      )
    );

  if (!row) {
    res.status(404).json({ error: "Character not attached to this campaign" });
    return;
  }

  if (row.userId !== userId && campaign.dmUserId !== userId) {
    res.status(403).json({ error: "Only the character owner or DM can detach" });
    return;
  }

  await db
    .delete(campaignCharactersTable)
    .where(
      and(
        eq(campaignCharactersTable.campaignId, params.data.id),
        eq(campaignCharactersTable.characterId, params.data.characterId)
      )
    );

  res.status(204).send();
});

// ── Party Inventory ────────────────────────────────────────────────────────────

// GET /campaigns/:id/party-items
router.get("/campaigns/:id/party-items", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = ListPartyItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const query = ListPartyItemsQueryParams.safeParse(req.query);
  const search = query.success ? query.data.search : undefined;
  const claimedBy = query.success ? query.data.claimedByCharacterId : undefined;

  let items = await db
    .select()
    .from(partyItemsTable)
    .where(
      search
        ? and(
            eq(partyItemsTable.campaignId, params.data.id),
            ilike(partyItemsTable.name, `%${search}%`)
          )
        : eq(partyItemsTable.campaignId, params.data.id)
    )
    .orderBy(desc(partyItemsTable.addedAt));

  if (claimedBy !== undefined) {
    items = items.filter((i) => i.claimedByCharacterId === claimedBy);
  }

  res.json(items);
});

// POST /campaigns/:id/party-items — add item to stash
router.post("/campaigns/:id/party-items", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = AddPartyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddPartyItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [item] = await db
    .insert(partyItemsTable)
    .values({
      campaignId: params.data.id,
      itemSlug: parsed.data.itemSlug,
      name: parsed.data.name,
      quantity: parsed.data.quantity ?? 1,
      isCustom: parsed.data.isCustom ?? false,
      claimedByCharacterId: parsed.data.claimedByCharacterId ?? null,
      notes: parsed.data.notes ?? "",
      customProperties: parsed.data.customProperties ?? {},
      addedByUserId: userId,
    })
    .returning();

  // Log to ledger
  await db.insert(ledgerEntriesTable).values({
    campaignId: params.data.id,
    type: "add_item",
    actorUserId: userId,
    itemName: item.name,
    itemQuantity: item.quantity,
    notes: item.notes,
  });

  res.status(201).json(item);
});

// PATCH /campaigns/:id/party-items/:itemId — update item
router.patch("/campaigns/:id/party-items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = UpdatePartyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePartyItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const [item] = await db
    .select()
    .from(partyItemsTable)
    .where(
      and(
        eq(partyItemsTable.id, params.data.itemId),
        eq(partyItemsTable.campaignId, params.data.id)
      )
    );

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  // DM or item adder can update
  const isDm = campaign.dmUserId === userId;
  const isAdder = item.addedByUserId === userId;
  if (!isDm && !isAdder) {
    res.status(403).json({ error: "Only the DM or item adder can update this item" });
    return;
  }

  const updates: Partial<typeof item> = {};
  if (parsed.data.quantity !== undefined) updates.quantity = parsed.data.quantity;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if ("claimedByCharacterId" in parsed.data) updates.claimedByCharacterId = parsed.data.claimedByCharacterId ?? null;

  const [updated] = await db
    .update(partyItemsTable)
    .set(updates)
    .where(eq(partyItemsTable.id, params.data.itemId))
    .returning();

  res.json(updated);
});

// DELETE /campaigns/:id/party-items/:itemId — remove item
router.delete("/campaigns/:id/party-items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = RemovePartyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const [item] = await db
    .select()
    .from(partyItemsTable)
    .where(
      and(
        eq(partyItemsTable.id, params.data.itemId),
        eq(partyItemsTable.campaignId, params.data.id)
      )
    );

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const isDm = campaign.dmUserId === userId;
  const isAdder = item.addedByUserId === userId;
  if (!isDm && !isAdder) {
    res.status(403).json({ error: "Only the DM or item adder can remove this item" });
    return;
  }

  await db.delete(partyItemsTable).where(eq(partyItemsTable.id, params.data.itemId));

  // Log to ledger
  await db.insert(ledgerEntriesTable).values({
    campaignId: params.data.id,
    type: "remove_item",
    actorUserId: userId,
    itemName: item.name,
    itemQuantity: item.quantity,
    notes: `Removed from party stash`,
  });

  res.status(204).send();
});

// POST /campaigns/:id/party-items/:itemId/transfer — transfer item
router.post("/campaigns/:id/party-items/:itemId/transfer", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = TransferPartyItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = TransferPartyItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [partyItem] = await db
    .select()
    .from(partyItemsTable)
    .where(
      and(
        eq(partyItemsTable.id, params.data.itemId),
        eq(partyItemsTable.campaignId, params.data.id)
      )
    );

  if (!partyItem) {
    res.status(404).json({ error: "Party item not found" });
    return;
  }

  const quantity = parsed.data.quantity ?? 1;

  if (parsed.data.direction === "to_character") {
    // Verify character is in campaign
    const [cc] = await db
      .select()
      .from(campaignCharactersTable)
      .where(
        and(
          eq(campaignCharactersTable.campaignId, params.data.id),
          eq(campaignCharactersTable.characterId, parsed.data.characterId)
        )
      );
    if (!cc) {
      res.status(400).json({ error: "Character is not in this campaign" });
      return;
    }

    if (partyItem.quantity < quantity) {
      res.status(400).json({ error: "Not enough quantity in party stash" });
      return;
    }

    // Add to character inventory
    await db.insert(characterInventoryTable).values({
      characterId: parsed.data.characterId,
      itemSlug: partyItem.itemSlug,
      name: partyItem.name,
      quantity,
      notes: partyItem.notes,
      isCustom: partyItem.isCustom,
      customProperties: partyItem.customProperties as Record<string, unknown>,
    });

    // Decrement or remove from party stash
    if (partyItem.quantity <= quantity) {
      await db.delete(partyItemsTable).where(eq(partyItemsTable.id, partyItem.id));
    } else {
      await db
        .update(partyItemsTable)
        .set({ quantity: partyItem.quantity - quantity })
        .where(eq(partyItemsTable.id, partyItem.id));
    }

    const [entry] = await db
      .insert(ledgerEntriesTable)
      .values({
        campaignId: params.data.id,
        type: "transfer_to_character",
        actorUserId: userId,
        characterId: parsed.data.characterId,
        itemName: partyItem.name,
        itemQuantity: quantity,
        notes: parsed.data.notes ?? "",
      })
      .returning();

    res.json(entry);
  } else {
    // to_party: move from character inventory to party stash
    const [charItem] = await db
      .select()
      .from(characterInventoryTable)
      .where(
        and(
          eq(characterInventoryTable.characterId, parsed.data.characterId),
          eq(characterInventoryTable.id, params.data.itemId)
        )
      );

    if (!charItem) {
      res.status(404).json({ error: "Character inventory item not found" });
      return;
    }

    // Add to party stash
    await db.insert(partyItemsTable).values({
      campaignId: params.data.id,
      itemSlug: charItem.itemSlug,
      name: charItem.name,
      quantity,
      isCustom: charItem.isCustom,
      notes: charItem.notes,
      customProperties: charItem.customProperties as Record<string, unknown>,
      addedByUserId: userId,
    });

    // Decrement or remove from character inventory
    if (charItem.quantity <= quantity) {
      await db.delete(characterInventoryTable).where(eq(characterInventoryTable.id, charItem.id));
    } else {
      await db
        .update(characterInventoryTable)
        .set({ quantity: charItem.quantity - quantity })
        .where(eq(characterInventoryTable.id, charItem.id));
    }

    const [entry] = await db
      .insert(ledgerEntriesTable)
      .values({
        campaignId: params.data.id,
        type: "transfer_to_party",
        actorUserId: userId,
        characterId: parsed.data.characterId,
        itemName: charItem.name,
        itemQuantity: quantity,
        notes: parsed.data.notes ?? "",
      })
      .returning();

    res.json(entry);
  }
});

// ── Party Currency ──────────────────────────────────────────────────────────

// POST /campaigns/:id/currency/deposit
router.post("/campaigns/:id/currency/deposit", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = DepositCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = DepositCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const cp = parsed.data.cp ?? 0;
  const sp = parsed.data.sp ?? 0;
  const ep = parsed.data.ep ?? 0;
  const gp = parsed.data.gp ?? 0;
  const pp = parsed.data.pp ?? 0;

  if (cp < 0 || sp < 0 || ep < 0 || gp < 0 || pp < 0) {
    res.status(400).json({ error: "Currency amounts must be non-negative for deposit" });
    return;
  }

  const [updated] = await db
    .update(campaignsTable)
    .set({
      cp: campaign.cp + cp,
      sp: campaign.sp + sp,
      ep: campaign.ep + ep,
      gp: campaign.gp + gp,
      pp: campaign.pp + pp,
    })
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  await db.insert(ledgerEntriesTable).values({
    campaignId: params.data.id,
    type: "currency_deposit",
    actorUserId: userId,
    characterId: parsed.data.characterId ?? null,
    cpDelta: cp,
    spDelta: sp,
    epDelta: ep,
    gpDelta: gp,
    ppDelta: pp,
    notes: parsed.data.notes ?? "",
  });

  res.json({ cp: updated.cp, sp: updated.sp, ep: updated.ep, gp: updated.gp, pp: updated.pp });
});

// POST /campaigns/:id/currency/withdraw
router.post("/campaigns/:id/currency/withdraw", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = WithdrawCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = WithdrawCurrencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const cp = parsed.data.cp ?? 0;
  const sp = parsed.data.sp ?? 0;
  const ep = parsed.data.ep ?? 0;
  const gp = parsed.data.gp ?? 0;
  const pp = parsed.data.pp ?? 0;

  if (
    campaign.cp < cp ||
    campaign.sp < sp ||
    campaign.ep < ep ||
    campaign.gp < gp ||
    campaign.pp < pp
  ) {
    res.status(400).json({ error: "Insufficient funds in party pool" });
    return;
  }

  const [updated] = await db
    .update(campaignsTable)
    .set({
      cp: campaign.cp - cp,
      sp: campaign.sp - sp,
      ep: campaign.ep - ep,
      gp: campaign.gp - gp,
      pp: campaign.pp - pp,
    })
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  await db.insert(ledgerEntriesTable).values({
    campaignId: params.data.id,
    type: "currency_withdrawal",
    actorUserId: userId,
    characterId: parsed.data.characterId ?? null,
    cpDelta: -cp,
    spDelta: -sp,
    epDelta: -ep,
    gpDelta: -gp,
    ppDelta: -pp,
    notes: parsed.data.notes ?? "",
  });

  res.json({ cp: updated.cp, sp: updated.sp, ep: updated.ep, gp: updated.gp, pp: updated.pp });
});

// POST /campaigns/:id/currency/split — split pool evenly among members
router.post("/campaigns/:id/currency/split", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = SplitCurrencyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SplitCurrencyBody.safeParse(req.body);

  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  if (campaign.dmUserId !== userId) {
    res.status(403).json({ error: "Only the DM can split coins" });
    return;
  }

  const members = await db
    .select()
    .from(campaignMembersTable)
    .where(eq(campaignMembersTable.campaignId, params.data.id));

  const count = members.length;
  if (count === 0) {
    res.status(400).json({ error: "No members in campaign" });
    return;
  }

  const perCp = Math.floor(campaign.cp / count);
  const perSp = Math.floor(campaign.sp / count);
  const perEp = Math.floor(campaign.ep / count);
  const perGp = Math.floor(campaign.gp / count);
  const perPp = Math.floor(campaign.pp / count);

  const remainCp = campaign.cp - perCp * count;
  const remainSp = campaign.sp - perSp * count;
  const remainEp = campaign.ep - perEp * count;
  const remainGp = campaign.gp - perGp * count;
  const remainPp = campaign.pp - perPp * count;

  // Zero out the pool (remainder stays)
  await db
    .update(campaignsTable)
    .set({
      cp: remainCp,
      sp: remainSp,
      ep: remainEp,
      gp: remainGp,
      pp: remainPp,
    })
    .where(eq(campaignsTable.id, params.data.id));

  await db.insert(ledgerEntriesTable).values({
    campaignId: params.data.id,
    type: "coin_split",
    actorUserId: userId,
    cpDelta: -(campaign.cp - remainCp),
    spDelta: -(campaign.sp - remainSp),
    epDelta: -(campaign.ep - remainEp),
    gpDelta: -(campaign.gp - remainGp),
    ppDelta: -(campaign.pp - remainPp),
    notes: (parsed.success ? parsed.data.notes : "") ?? "",
    metadata: { memberCount: count, perMember: { cp: perCp, sp: perSp, ep: perEp, gp: perGp, pp: perPp } },
  });

  res.json({
    perMember: { cp: perCp, sp: perSp, ep: perEp, gp: perGp, pp: perPp },
    remainder: { cp: remainCp, sp: remainSp, ep: remainEp, gp: remainGp, pp: remainPp },
    memberCount: count,
  });
});

// ── Ledger ─────────────────────────────────────────────────────────────────────

// GET /campaigns/:id/ledger
router.get("/campaigns/:id/ledger", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = ListLedgerEntriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const member = await assertMember(res as never, params.data.id, userId);
  if (!member) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const query = ListLedgerEntriesQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 50) : 50;
  const offset = query.success ? (query.data.offset ?? 0) : 0;
  const typeFilter = query.success ? query.data.type : undefined;
  const characterFilter = query.success ? query.data.characterId : undefined;

  let entries = await db
    .select()
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.campaignId, params.data.id))
    .orderBy(desc(ledgerEntriesTable.createdAt));

  if (typeFilter) {
    entries = entries.filter((e) => e.type === typeFilter);
  }
  if (characterFilter !== undefined) {
    entries = entries.filter((e) => e.characterId === characterFilter);
  }

  res.json(entries.slice(offset, offset + limit));
});

export default router;
