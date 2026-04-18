import { pgTable, text, serial, integer, boolean, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  source: text("source").notNull().default("SRD"),
  type: text("type").notNull(), // weapon, armor, gear, tool, magic, etc.
  rarity: text("rarity").notNull().default("common"),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  cost: jsonb("cost").notNull().default({}), // { amount: number, currency: string }
  requiresAttunement: boolean("requires_attunement").notNull().default(false),
  attunementRequirements: text("attunement_requirements"),
  armorClass: integer("armor_class"),
  damageRoll: text("damage_roll"),
  damageType: text("damage_type"),
  properties: jsonb("properties").notNull().default([]),
  description: text("description"),
  rawData: jsonb("raw_data").notNull().default({}),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
