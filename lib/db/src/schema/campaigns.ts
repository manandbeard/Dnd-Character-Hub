import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const campaignPrivacyEnum = pgEnum("campaign_privacy", ["public", "invite_only", "private"]);

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  inviteCode: text("invite_code").notNull().unique(),
  dmUserId: text("dm_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),

  // Phase 4: privacy
  privacy: campaignPrivacyEnum("privacy").notNull().default("invite_only"),

  // Party currency pool
  cp: integer("cp").notNull().default(0),
  sp: integer("sp").notNull().default(0),
  ep: integer("ep").notNull().default(0),
  gp: integer("gp").notNull().default(0),
  pp: integer("pp").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
  cp: true, sp: true, ep: true, gp: true, pp: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
