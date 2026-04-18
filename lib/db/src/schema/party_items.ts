import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";
import { usersTable } from "./users";

export const partyItemsTable = pgTable("party_items", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  itemSlug: text("item_slug").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  isCustom: boolean("is_custom").notNull().default(false),
  claimedByCharacterId: integer("claimed_by_character_id").references(() => charactersTable.id, { onDelete: "set null" }),
  notes: text("notes").notNull().default(""),
  customProperties: jsonb("custom_properties").notNull().default({}),
  addedByUserId: text("added_by_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPartyItemSchema = createInsertSchema(partyItemsTable).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});
export type InsertPartyItem = z.infer<typeof insertPartyItemSchema>;
export type PartyItem = typeof partyItemsTable.$inferSelect;
