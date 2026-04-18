import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { charactersTable } from "./characters";
import { usersTable } from "./users";

export const campaignCharactersTable = pgTable("campaign_characters", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  characterId: integer("character_id").notNull().references(() => charactersTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("campaign_characters_unique").on(table.campaignId, table.characterId),
]);

export const insertCampaignCharacterSchema = createInsertSchema(campaignCharactersTable).omit({
  id: true,
  joinedAt: true,
});
export type InsertCampaignCharacter = z.infer<typeof insertCampaignCharacterSchema>;
export type CampaignCharacter = typeof campaignCharactersTable.$inferSelect;
