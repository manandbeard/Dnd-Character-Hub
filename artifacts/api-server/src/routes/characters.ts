import { Router, type IRouter } from "express";
import { db, charactersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateCharacterBody,
  UpdateCharacterBody,
  LevelUpCharacterBody,
  GetCharacterParams,
  UpdateCharacterParams,
  DeleteCharacterParams,
  GetCharacterDerivedStatsParams,
  LevelUpCharacterParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { computeDerivedStats, computeStartingMaxHp, computeAbilityModifier } from "../lib/rules-service";

const router: IRouter = Router();

function attachDerived(character: typeof charactersTable.$inferSelect) {
  const derived = computeDerivedStats(character);
  return { ...character, derived };
}

// GET /characters — list user's characters
router.get("/characters", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.userId, userId))
    .orderBy(charactersTable.updatedAt);
  res.json(characters);
});

// POST /characters — create a character
router.post("/characters", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const constitutionMod = computeAbilityModifier(data.constitution);

  // Compute starting HP based on a default hit die (Wizard=6 is minimum; we set 8 as fallback)
  // The actual hit die should come from class data, but we store it in the character
  const startingHp = Math.max(1, 8 + constitutionMod);

  const [character] = await db.insert(charactersTable).values({
    userId,
    name: data.name,
    race: data.race,
    subrace: data.subrace,
    class: data.class,
    background: data.background,
    alignment: data.alignment,
    strength: data.strength,
    dexterity: data.dexterity,
    constitution: data.constitution,
    intelligence: data.intelligence,
    wisdom: data.wisdom,
    charisma: data.charisma,
    maxHp: startingHp,
    currentHp: startingHp,
    skillProficiencies: data.skillProficiencies || [],
    personalityTraits: data.personalityTraits || "",
    ideals: data.ideals || "",
    bonds: data.bonds || "",
    flaws: data.flaws || "",
    backstory: data.backstory || "",
    appearance: data.appearance || "",
  }).returning();

  res.status(201).json(character);
});

// GET /characters/:id — get single character with derived stats
router.get("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = GetCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.userId, userId)));

  if (!character) {
    const [anyChar] = await db.select().from(charactersTable).where(eq(charactersTable.id, params.data.id));
    if (anyChar) {
      res.status(403).json({ error: "Forbidden" });
    } else {
      res.status(404).json({ error: "Character not found" });
    }
    return;
  }

  res.json(attachDerived(character));
});

// PATCH /characters/:id — update character
router.patch("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = UpdateCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  const [updated] = await db
    .update(charactersTable)
    .set(parsed.data as any)
    .where(eq(charactersTable.id, params.data.id))
    .returning();

  res.json(attachDerived(updated));
});

// DELETE /characters/:id
router.delete("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = DeleteCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  await db.delete(charactersTable).where(eq(charactersTable.id, params.data.id));
  res.sendStatus(204);
});

// GET /characters/:id/derived-stats
router.get("/characters/:id/derived-stats", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = GetCharacterDerivedStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [character] = await db
    .select()
    .from(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.userId, userId)));

  if (!character) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  res.json(computeDerivedStats(character));
});

// POST /characters/:id/level-up
router.post("/characters/:id/level-up", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const params = LevelUpCharacterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = LevelUpCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(charactersTable)
    .where(and(eq(charactersTable.id, params.data.id), eq(charactersTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Character not found" });
    return;
  }

  if (existing.level >= 20) {
    res.status(400).json({ error: "Character is already at max level (20)" });
    return;
  }

  const data = parsed.data;
  const constitutionMod = computeAbilityModifier(existing.constitution);
  const hpGain = Math.max(1, (data.hpIncrease ?? 1)) + constitutionMod;
  const newMaxHp = existing.maxHp + hpGain;

  // Apply ability score improvements
  const asiUpdates: Partial<typeof existing> = {};
  if (data.abilityScoreImprovements) {
    for (const [ability, bonus] of Object.entries(data.abilityScoreImprovements)) {
      const key = ability as keyof typeof existing;
      if (typeof existing[key] === "number") {
        (asiUpdates as any)[key] = Math.min(20, (existing[key] as number) + (bonus as number));
      }
    }
  }

  // Merge new features
  const existingFeatures = (existing.features as object[]) || [];
  const newFeatures = data.newFeatures || [];
  const mergedFeatures = [...existingFeatures, ...newFeatures];

  // Merge new spells
  const existingSpells = (existing.knownSpells as string[]) || [];
  const newSpells = data.newSpells || [];
  const mergedSpells = [...new Set([...existingSpells, ...newSpells])];

  const updateData: any = {
    level: existing.level + 1,
    maxHp: newMaxHp,
    currentHp: existing.currentHp + hpGain, // restore HP on level-up
    features: mergedFeatures,
    knownSpells: mergedSpells,
    ...asiUpdates,
  };

  if (data.subclass && !existing.subclass) {
    updateData.subclass = data.subclass;
  }

  const [updated] = await db
    .update(charactersTable)
    .set(updateData)
    .where(eq(charactersTable.id, params.data.id))
    .returning();

  res.json(attachDerived(updated));
});

export default router;
