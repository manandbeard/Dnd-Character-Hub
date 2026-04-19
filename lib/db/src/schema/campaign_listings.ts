import { pgTable, text, serial, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";

export const campaignListingsTable = pgTable("campaign_listings", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  system: text("system").notNull().default("D&D 5e"),
  levelMin: integer("level_min").notNull().default(1),
  levelMax: integer("level_max").notNull().default(20),
  schedule: text("schedule").notNull().default(""),
  pitch: text("pitch").notNull().default(""),
  openSlots: integer("open_slots").notNull().default(1),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique("campaign_listing_unique").on(t.campaignId)]);

export const insertCampaignListingSchema = createInsertSchema(campaignListingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaignListing = z.infer<typeof insertCampaignListingSchema>;
export type CampaignListing = typeof campaignListingsTable.$inferSelect;
