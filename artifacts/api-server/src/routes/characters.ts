import { Router, type IRouter } from "express";
import { db, charactersTable, characterInventoryTable } from "@workspace/db";
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
import {
  computeDerivedStats,
  computeStartingMaxHp,
  computeAbilityModifier,
  getClassBySlug,
  getRaceBySlug,
  getBackgroundBySlug,
  getSpellcastingAbility,
  getClassSavingThrows,
  SKILLS,
  type AbilityName,
} from "../lib/rules-service";

const router: IRouter = Router();

function attachDerived(character: typeof charactersTable.$inferSelect) {
  const derived = computeDerivedStats(character);
  return { ...character, derived };
}

// GET /characters — list user's characters
router.get("/characters", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const characters = await db
    .select()
    .from(charactersTable)
    .where(eq(charactersTable.userId, userId))
    .orderBy(charactersTable.updatedAt);
  res.json(characters);
});

const ALL_SKILL_KEYS = Object.keys(SKILLS);

// POST /characters — create a character
router.post("/characters", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
  const parsed = CreateCharacterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  // Look up class, race, and background rules data in parallel
  const [classData, raceData, bgData] = await Promise.all([
    getClassBySlug(data.class),
    getRaceBySlug(data.race),
    getBackgroundBySlug(data.background),
  ]);

  // Validate skill proficiencies against class rules
  const skillChoices = classData?.skillChoices as { choose?: number; from?: string[] } | null;
  const allowedClassSkills = skillChoices?.from ?? ALL_SKILL_KEYS;
  const maxClassSkills = skillChoices?.choose ?? 2;
  const bgSkillProfs = (bgData?.skillProficiencies as string[] | null) ?? [];
  const submittedSkills = data.skillProficiencies ?? [];
  const classOnlySkills = submittedSkills.filter((s) => !bgSkillProfs.includes(s));
  const invalidSkills = classOnlySkills.filter((s) => !allowedClassSkills.includes(s));
  if (invalidSkills.length > 0) {
    res.status(400).json({ error: `Invalid class skill choices: ${invalidSkills.join(", ")}` });
    return;
  }
  if (classOnlySkills.length > maxClassSkills) {
    res.status(400).json({
      error: `Too many class skills selected. ${classData?.name ?? "This class"} allows ${maxClassSkills}.`,
    });
    return;
  }

  // Apply race ability bonuses server-side
  const abilityBonuses = (raceData?.abilityBonuses as Partial<Record<AbilityName, number>> | null) ?? {};
  const applyBonus = (base: number, key: AbilityName) =>
    Math.min(20, base + (abilityBonuses[key] ?? 0));

  const finalScores: Record<AbilityName, number> = {
    strength: applyBonus(data.strength, "strength"),
    dexterity: applyBonus(data.dexterity, "dexterity"),
    constitution: applyBonus(data.constitution, "constitution"),
    intelligence: applyBonus(data.intelligence, "intelligence"),
    wisdom: applyBonus(data.wisdom, "wisdom"),
    charisma: applyBonus(data.charisma, "charisma"),
  };

  const constitutionMod = computeAbilityModifier(finalScores.constitution);
  const hitDie = classData?.hitDie ?? 8;
  const startingHp = computeStartingMaxHp(hitDie, constitutionMod);

  // Derive spellcasting ability and saving throw proficiencies from class rules
  const spellcastingAbility = classData ? getSpellcastingAbility(classData) : null;
  const classSavingThrows = classData ? getClassSavingThrows(classData) : [];

  try {
    const [character] = await db.insert(charactersTable).values({
      userId,
      name: data.name,
      race: data.race,
      subrace: data.subrace ?? null,
      class: data.class,
      background: data.background,
      alignment: data.alignment,
      ...finalScores,
      maxHp: startingHp,
      currentHp: startingHp,
      skillProficiencies: submittedSkills,
      savingThrowProficiencies: classSavingThrows,
      spellcastingAbility,
      personalityTraits: data.personalityTraits ?? "",
      ideals: data.ideals ?? "",
      bonds: data.bonds ?? "",
      flaws: data.flaws ?? "",
      backstory: data.backstory ?? "",
      appearance: data.appearance ?? "",
    }).returning();

    // Seed starting equipment inventory items
    if (data.startingEquipment && data.startingEquipment.length > 0) {
      const inventoryItems = data.startingEquipment.map((item, idx) => ({
        characterId: character.id,
        itemSlug: `starting-equipment-${idx + 1}`,
        name: item,
        quantity: 1,
        equipped: false,
        attuned: false,
        notes: "Starting equipment",
        customProperties: {},
        isCustom: true,
      }));
      await db.insert(characterInventoryTable).values(inventoryItems);
    }

    res.status(201).json(character);
  } catch (err) {
    req.log.error({ err }, "Failed to insert character");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /characters/:id — get single character with derived stats
router.get("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
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
  const { userId } = req;
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
    .set(parsed.data)
    .where(eq(charactersTable.id, params.data.id))
    .returning();

  res.json(attachDerived(updated));
});

// DELETE /characters/:id
router.delete("/characters/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req;
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
  const { userId } = req;
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
  const { userId } = req;
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
  type AbilityField = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
  const ABILITY_FIELDS = new Set<string>(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);
  const asiUpdates: Partial<Record<AbilityField, number>> = {};
  if (data.abilityScoreImprovements) {
    for (const [ability, bonus] of Object.entries(data.abilityScoreImprovements)) {
      if (ABILITY_FIELDS.has(ability)) {
        const key = ability as AbilityField;
        asiUpdates[key] = Math.min(20, existing[key] + (bonus as number));
      }
    }
  }

  // Merge new features
  const existingFeatures = Array.isArray(existing.features) ? (existing.features as unknown[]) : [];
  const newFeatures = data.newFeatures || [];
  const mergedFeatures = [...existingFeatures, ...newFeatures];

  // Merge new spells
  const existingSpells = Array.isArray(existing.knownSpells) ? (existing.knownSpells as string[]) : [];
  const newSpells = data.newSpells || [];
  const mergedSpells = [...new Set([...existingSpells, ...newSpells])];

  const subclassUpdate = data.subclass && !existing.subclass ? { subclass: data.subclass } : {};

  const [updated] = await db
    .update(charactersTable)
    .set({
      level: existing.level + 1,
      maxHp: newMaxHp,
      currentHp: existing.currentHp + hpGain,
      features: mergedFeatures,
      knownSpells: mergedSpells,
      ...asiUpdates,
      ...subclassUpdate,
    })
    .where(eq(charactersTable.id, params.data.id))
    .returning();

  res.json(attachDerived(updated));
});

export default router;
