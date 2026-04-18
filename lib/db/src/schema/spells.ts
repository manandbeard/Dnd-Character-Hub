import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spellsTable = pgTable("spells", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull().default("SRD"),
  level: integer("level").notNull(),
  school: text("school").notNull(),
  castingTime: text("casting_time").notNull(),
  range: text("range").notNull(),
  components: jsonb("components").notNull().default([]),
  duration: text("duration").notNull(),
  concentration: boolean("concentration").notNull().default(false),
  ritual: boolean("ritual").notNull().default(false),
  description: text("description").notNull(),
  higherLevel: text("higher_level"),
  classes: jsonb("classes").notNull().default([]),
  damageType: text("damage_type"),
  saveType: text("save_type"),
  rawData: jsonb("raw_data").notNull().default({}),
});

export const insertSpellSchema = createInsertSchema(spellsTable).omit({ id: true });
export type InsertSpell = z.infer<typeof insertSpellSchema>;
export type Spell = typeof spellsTable.$inferSelect;
