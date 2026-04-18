import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  // Identity
  name: text("name").notNull(),
  race: text("race").notNull(),
  subrace: text("subrace"),
  class: text("class").notNull(),
  subclass: text("subclass"),
  background: text("background").notNull(),
  alignment: text("alignment").notNull().default("True Neutral"),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  inspiration: boolean("inspiration").notNull().default(false),

  // Ability Scores (raw values 1-20)
  strength: integer("strength").notNull().default(10),
  dexterity: integer("dexterity").notNull().default(10),
  constitution: integer("constitution").notNull().default(10),
  intelligence: integer("intelligence").notNull().default(10),
  wisdom: integer("wisdom").notNull().default(10),
  charisma: integer("charisma").notNull().default(10),

  // HP
  maxHp: integer("max_hp").notNull().default(10),
  currentHp: integer("current_hp").notNull().default(10),
  temporaryHp: integer("temporary_hp").notNull().default(0),

  // Combat
  armorClass: integer("armor_class").notNull().default(10),
  speed: integer("speed").notNull().default(30),
  initiativeBonus: integer("initiative_bonus").notNull().default(0),

  // Proficiencies (stored as JSON arrays of skill names)
  skillProficiencies: jsonb("skill_proficiencies").notNull().default([]),
  savingThrowProficiencies: jsonb("saving_throw_proficiencies").notNull().default([]),
  toolProficiencies: jsonb("tool_proficiencies").notNull().default([]),
  weaponProficiencies: jsonb("weapon_proficiencies").notNull().default([]),
  armorProficiencies: jsonb("armor_proficiencies").notNull().default([]),
  languageProficiencies: jsonb("language_proficiencies").notNull().default([]),

  // Death saves
  deathSaveSuccesses: integer("death_save_successes").notNull().default(0),
  deathSaveFailures: integer("death_save_failures").notNull().default(0),

  // Spellcasting
  spellcastingAbility: text("spellcasting_ability"),
  preparedSpells: jsonb("prepared_spells").notNull().default([]), // array of spell slugs
  knownSpells: jsonb("known_spells").notNull().default([]), // array of spell slugs
  spellSlots: jsonb("spell_slots").notNull().default({}), // { "1": { max: 2, used: 0 }, ... }

  // Currency (in copper pieces equivalents, stored per denomination)
  cp: integer("cp").notNull().default(0),
  sp: integer("sp").notNull().default(0),
  ep: integer("ep").notNull().default(0),
  gp: integer("gp").notNull().default(0),
  pp: integer("pp").notNull().default(0),

  // Narrative
  personalityTraits: text("personality_traits").notNull().default(""),
  ideals: text("ideals").notNull().default(""),
  bonds: text("bonds").notNull().default(""),
  flaws: text("flaws").notNull().default(""),
  backstory: text("backstory").notNull().default(""),
  notes: text("notes").notNull().default(""),
  appearance: text("appearance").notNull().default(""),

  // Features & Traits (stored as JSON)
  features: jsonb("features").notNull().default([]),
  conditions: jsonb("conditions").notNull().default([]),

  // Avatar
  avatarUrl: text("avatar_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
