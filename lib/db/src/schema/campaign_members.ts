import { pgTable, text, serial, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { campaignsTable } from "./campaigns";

export const campaignRoleEnum = pgEnum("campaign_role", ["dm", "player"]);

export const campaignMembersTable = pgTable("campaign_members", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: campaignRoleEnum("role").notNull().default("player"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("campaign_members_unique").on(table.campaignId, table.userId),
]);

export const insertCampaignMemberSchema = createInsertSchema(campaignMembersTable).omit({
  id: true,
  joinedAt: true,
});
export type InsertCampaignMember = z.infer<typeof insertCampaignMemberSchema>;
export type CampaignMember = typeof campaignMembersTable.$inferSelect;
