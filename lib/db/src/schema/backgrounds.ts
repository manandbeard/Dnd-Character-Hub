import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const backgroundsTable = pgTable("backgrounds", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull().default("SRD"),
  skillProficiencies: jsonb("skill_proficiencies").notNull().default([]),
  toolProficiencies: jsonb("tool_proficiencies").notNull().default([]),
  languages: jsonb("languages").notNull().default([]),
  equipment: jsonb("equipment").notNull().default([]),
  feature: jsonb("feature").notNull().default({}),
  personalityTraits: jsonb("personality_traits").notNull().default([]),
  ideals: jsonb("ideals").notNull().default([]),
  bonds: jsonb("bonds").notNull().default([]),
  flaws: jsonb("flaws").notNull().default([]),
  description: text("description"),
  rawData: jsonb("raw_data").notNull().default({}),
});

export const insertBackgroundSchema = createInsertSchema(backgroundsTable).omit({ id: true });
export type InsertBackground = z.infer<typeof insertBackgroundSchema>;
export type Background = typeof backgroundsTable.$inferSelect;
