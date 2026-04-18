import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { charactersTable } from "./characters";

export const characterInventoryTable = pgTable("character_inventory", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => charactersTable.id, { onDelete: "cascade" }),
  itemSlug: text("item_slug").notNull(), // references items.slug
  name: text("name").notNull(), // denormalized for custom items
  quantity: integer("quantity").notNull().default(1),
  equipped: boolean("equipped").notNull().default(false),
  attuned: boolean("attuned").notNull().default(false),
  notes: text("notes").notNull().default(""),
  customProperties: jsonb("custom_properties").notNull().default({}),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCharacterInventorySchema = createInsertSchema(characterInventoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacterInventory = z.infer<typeof insertCharacterInventorySchema>;
export type CharacterInventory = typeof characterInventoryTable.$inferSelect;
