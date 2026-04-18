import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { usersTable } from "./users";
import { charactersTable } from "./characters";

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  // Type of transaction
  type: text("type").notNull(),
  // Who performed the action
  actorUserId: text("actor_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  // Which character was involved (optional)
  characterId: integer("character_id").references(() => charactersTable.id, { onDelete: "set null" }),
  // Currency deltas on the party pool (positive = added, negative = removed)
  cpDelta: integer("cp_delta").notNull().default(0),
  spDelta: integer("sp_delta").notNull().default(0),
  epDelta: integer("ep_delta").notNull().default(0),
  gpDelta: integer("gp_delta").notNull().default(0),
  ppDelta: integer("pp_delta").notNull().default(0),
  // Item snapshot (denormalized for audit trail)
  itemName: text("item_name"),
  itemQuantity: integer("item_quantity"),
  // Notes and flexible metadata
  notes: text("notes").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
