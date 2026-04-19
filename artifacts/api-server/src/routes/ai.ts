import { Router, type IRouter } from "express";
import {
  db,
  charactersTable,
  campaignsTable,
  campaignMembersTable,
  campaignCharactersTable,
  partyItemsTable,
  ledgerEntriesTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  GenerateBackstoryParams,
  GenerateBackstoryBody,
  GenerateBuildAdviceParams,
  GenerateBuildAdviceBody,
  GenerateSessionRecapParams,
  GenerateSessionRecapBody,
  GenerateLedgerAdviceParams,
  GenerateLedgerAdviceBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  generateBackstory,
  generateBuildAdvice,
  generateSessionRecap,
  generateLedgerAdvice,
  AINotConfiguredError,
} from "../lib/ai-service";

const router: IRouter = Router();

// Helper: report common AI failure modes uniformly
function aiError(res: Parameters<typeof router.post>[1] extends (req: unknown, res: infer R, next: unknown) => unknown ? R : never, err: unknown) {
  const message = err instanceof Error ? err.message : "AI request failed";
  if (err instanceof AINotConfiguredError) {
    res.status(503).json({ error: "AI features are not configured on this server." });
    return;
  }
  // OpenAI quota / rate-limit surfaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const status = (err as any)?.status;
  if (status === 429) {
    res.status(429).json({ error: "AI provider is rate-limited; please try again shortly." });
    return;
  }
  res.status(502).json({ error: `AI generation failed: ${message}` });
}

// POST /ai/characters/:id/backstory
router.post("/ai/characters/:id/backstory", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = GenerateBackstoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateBackstoryBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.id, params.data.id));
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  if (character.userId !== userId) {
    res.status(403).json({ error: "Not your character" });
    return;
  }

  try {
    const backstory = await generateBackstory(character, {
      tone: body.data.tone,
      themes: body.data.themes,
    });

    // Persist on character record
    const [updated] = await db
      .update(charactersTable)
      .set({ backstory })
      .where(eq(charactersTable.id, character.id))
      .returning();

    res.json({ backstory, character: updated });
  } catch (err) {
    aiError(res, err);
  }
});

// POST /ai/characters/:id/advice
router.post("/ai/characters/:id/advice", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = GenerateBuildAdviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateBuildAdviceBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.id, params.data.id));
  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }
  if (character.userId !== userId) {
    res.status(403).json({ error: "Not your character" });
    return;
  }

  try {
    const advice = await generateBuildAdvice(character, body.data.focus);
    res.json({ advice });
  } catch (err) {
    aiError(res, err);
  }
});

// Helper: assert membership and return campaign + member role
async function loadCampaignForMember(
  campaignId: number,
  userId: string,
): Promise<{ campaign: typeof campaignsTable.$inferSelect; role: string } | null> {
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, campaignId));
  if (!campaign) return null;
  const [member] = await db
    .select()
    .from(campaignMembersTable)
    .where(
      and(
        eq(campaignMembersTable.campaignId, campaignId),
        eq(campaignMembersTable.userId, userId),
      ),
    );
  if (!member) return null;
  return { campaign, role: member.role };
}

async function loadParty(campaignId: number) {
  const links = await db
    .select({ characterId: campaignCharactersTable.characterId })
    .from(campaignCharactersTable)
    .where(eq(campaignCharactersTable.campaignId, campaignId));
  if (links.length === 0) return [];
  return db
    .select()
    .from(charactersTable)
    .where(inArray(charactersTable.id, links.map((l) => l.characterId)));
}

// POST /ai/campaigns/:id/recap (DM only)
router.post("/ai/campaigns/:id/recap", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = GenerateSessionRecapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateSessionRecapBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const ctx = await loadCampaignForMember(params.data.id, userId);
  if (!ctx) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }
  if (ctx.role !== "dm") {
    res.status(403).json({ error: "Only the DM can generate session recaps" });
    return;
  }

  const [party, recentLedger] = await Promise.all([
    loadParty(ctx.campaign.id),
    db
      .select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.campaignId, ctx.campaign.id))
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(20),
  ]);

  try {
    const recap = await generateSessionRecap(
      ctx.campaign,
      party,
      recentLedger,
      body.data.sessionNotes,
    );
    res.json({ recap });
  } catch (err) {
    aiError(res, err);
  }
});

// POST /ai/campaigns/:id/ledger-advice (any member)
router.post("/ai/campaigns/:id/ledger-advice", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const params = GenerateLedgerAdviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateLedgerAdviceBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const ctx = await loadCampaignForMember(params.data.id, userId);
  if (!ctx) {
    res.status(403).json({ error: "Not a campaign member" });
    return;
  }

  const [party, partyItems, recentLedger] = await Promise.all([
    loadParty(ctx.campaign.id),
    db
      .select()
      .from(partyItemsTable)
      .where(eq(partyItemsTable.campaignId, ctx.campaign.id)),
    db
      .select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.campaignId, ctx.campaign.id))
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(15),
  ]);

  try {
    const advice = await generateLedgerAdvice(
      ctx.campaign,
      party,
      partyItems,
      recentLedger,
      {
        cp: ctx.campaign.cp,
        sp: ctx.campaign.sp,
        ep: ctx.campaign.ep,
        gp: ctx.campaign.gp,
        pp: ctx.campaign.pp,
      },
      body.data.question,
    );
    res.json({ advice });
  } catch (err) {
    aiError(res, err);
  }
});

export default router;
