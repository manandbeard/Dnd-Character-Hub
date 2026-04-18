import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const racesTable = pgTable("races", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull().default("SRD"),
  speed: integer("speed").notNull().default(30),
  abilityBonuses: jsonb("ability_bonuses").notNull().default({}),
  traits: jsonb("traits").notNull().default([]),
  languages: jsonb("languages").notNull().default([]),
  size: text("size").notNull().default("Medium"),
  darkvision: integer("darkvision").notNull().default(0),
  description: text("description"),
  rawData: jsonb("raw_data").notNull().default({}),
});

export const insertRaceSchema = createInsertSchema(racesTable).omit({ id: true });
export type InsertRace = z.infer<typeof insertRaceSchema>;
export type Race = typeof racesTable.$inferSelect;
