import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull().default("SRD"),
  hitDie: integer("hit_die").notNull(),
  primaryAbility: text("primary_ability").notNull(),
  savingThrows: jsonb("saving_throws").notNull().default([]),
  skillChoices: jsonb("skill_choices").notNull().default({}),
  armorProficiencies: jsonb("armor_proficiencies").notNull().default([]),
  weaponProficiencies: jsonb("weapon_proficiencies").notNull().default([]),
  toolProficiencies: jsonb("tool_proficiencies").notNull().default([]),
  startingEquipment: jsonb("starting_equipment").notNull().default([]),
  features: jsonb("features").notNull().default([]),
  spellcasting: jsonb("spellcasting").notNull().default({}),
  description: text("description"),
  rawData: jsonb("raw_data").notNull().default({}),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classesTable.$inferSelect;
