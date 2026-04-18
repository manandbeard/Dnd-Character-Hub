import type { Character } from "@workspace/db";

export const SKILLS = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
} as const;

export type SkillName = keyof typeof SKILLS;
export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export function computeAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function computeProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function computeDerivedStats(character: Character) {
  const level = character.level;
  const proficiencyBonus = computeProficiencyBonus(level);

  const strengthMod = computeAbilityModifier(character.strength);
  const dexterityMod = computeAbilityModifier(character.dexterity);
  const constitutionMod = computeAbilityModifier(character.constitution);
  const intelligenceMod = computeAbilityModifier(character.intelligence);
  const wisdomMod = computeAbilityModifier(character.wisdom);
  const charismaMod = computeAbilityModifier(character.charisma);

  const abilityMods: Record<AbilityName, number> = {
    strength: strengthMod,
    dexterity: dexterityMod,
    constitution: constitutionMod,
    intelligence: intelligenceMod,
    wisdom: wisdomMod,
    charisma: charismaMod,
  };

  const skillProficiencies = (character.skillProficiencies as string[]) || [];
  const savingThrowProficiencies = (character.savingThrowProficiencies as string[]) || [];

  // Compute skill bonuses
  const skills: Record<string, { mod: number; proficient: boolean }> = {};
  for (const [skill, ability] of Object.entries(SKILLS)) {
    const isProficient = skillProficiencies.includes(skill);
    const mod = abilityMods[ability as AbilityName] + (isProficient ? proficiencyBonus : 0);
    skills[skill] = { mod, proficient: isProficient };
  }

  // Compute saving throws
  const savingThrows: Record<string, { mod: number; proficient: boolean }> = {};
  const abilities: AbilityName[] = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
  for (const ability of abilities) {
    const isProficient = savingThrowProficiencies.includes(ability);
    const mod = abilityMods[ability] + (isProficient ? proficiencyBonus : 0);
    savingThrows[ability] = { mod, proficient: isProficient };
  }

  const passivePerception = 10 + skills.perception.mod;
  const passiveInsight = 10 + skills.insight.mod;
  const passiveInvestigation = 10 + skills.investigation.mod;

  // Spell stats
  let spellSaveDC: number | null = null;
  let spellAttackBonus: number | null = null;
  if (character.spellcastingAbility) {
    const spellMod = abilityMods[character.spellcastingAbility as AbilityName] ?? 0;
    spellSaveDC = 8 + proficiencyBonus + spellMod;
    spellAttackBonus = proficiencyBonus + spellMod;
  }

  const initiative = dexterityMod + character.initiativeBonus;
  const carryCapacity = character.strength * 15;

  return {
    proficiencyBonus,
    strengthMod,
    dexterityMod,
    constitutionMod,
    intelligenceMod,
    wisdomMod,
    charismaMod,
    skills,
    savingThrows,
    passivePerception,
    passiveInsight,
    passiveInvestigation,
    spellSaveDC,
    spellAttackBonus,
    initiative,
    carryCapacity,
  };
}

export function computeMaxHpOnLevelUp(
  hitDie: number,
  constitutionMod: number,
  hpIncrease: number,
  level: number,
): number {
  // Level 1: max hit die + con mod. Level 2+: roll or average + con mod
  if (level === 1) {
    return hitDie + constitutionMod;
  }
  return Math.max(1, hpIncrease) + constitutionMod;
}

export function computeStartingMaxHp(hitDie: number, constitutionMod: number): number {
  return hitDie + constitutionMod;
}
