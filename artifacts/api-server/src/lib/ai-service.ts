import { openai, isOpenAIConfigured } from "@workspace/integrations-openai-ai-server";
import type { Character, Campaign, PartyItem, LedgerEntry } from "@workspace/db";

export class AINotConfiguredError extends Error {
  constructor() {
    super("AI integration is not configured on this server");
    this.name = "AINotConfiguredError";
  }
}

export { isOpenAIConfigured };

const MODEL = "gpt-5.2";
const MAX_TOKENS = 8192;

const SYSTEM_DM = `You are a seasoned Dungeons & Dragons 5e Dungeon Master and writer.
Speak with the warmth and confidence of a longtime gaming friend.
Keep advice grounded in the official 5e SRD where relevant.
Avoid headings and markdown unless asked; use clear flowing prose.`;

async function chat(prompt: string, system: string = SYSTEM_DM): Promise<string> {
  if (!isOpenAIConfigured()) throw new AINotConfiguredError();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned an empty response");
  }
  return content;
}

function characterSummary(c: Character): string {
  return [
    `Name: ${c.name}`,
    `Race: ${c.race}${c.subrace ? ` (${c.subrace})` : ""}`,
    `Class: ${c.class}${c.subclass ? ` (${c.subclass})` : ""}`,
    `Background: ${c.background}`,
    `Alignment: ${c.alignment}`,
    `Level: ${c.level}`,
    `Ability Scores — STR ${c.strength}, DEX ${c.dexterity}, CON ${c.constitution}, INT ${c.intelligence}, WIS ${c.wisdom}, CHA ${c.charisma}`,
    c.personalityTraits ? `Personality: ${c.personalityTraits}` : "",
    c.ideals ? `Ideals: ${c.ideals}` : "",
    c.bonds ? `Bonds: ${c.bonds}` : "",
    c.flaws ? `Flaws: ${c.flaws}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateBackstory(
  character: Character,
  options: { tone?: string; themes?: string } = {},
): Promise<string> {
  const { tone, themes } = options;
  const prompt = `Write an evocative origin backstory (3-5 paragraphs) for this D&D 5e character.
Anchor the story in their race, class, background, and alignment. Hint at lasting motivations
and unfinished business that a DM can hook adventures onto. Use second-person perspective
sparingly; prefer vivid third-person prose.

${characterSummary(character)}
${tone ? `\nDesired tone: ${tone}` : ""}
${themes ? `\nDesired themes / hooks: ${themes}` : ""}

Return only the backstory prose. No headings, no preamble.`;
  return chat(prompt);
}

export async function generateBuildAdvice(
  character: Character,
  focus?: string,
): Promise<string> {
  const prompt = `Act as a thoughtful D&D 5e build advisor. Review the character below and offer
concise, practical guidance for their next 1-3 levels. Cover what to optimize next
(ability score increases vs. feats, spell picks, multiclassing only if it clearly helps),
plus 2-3 actionable tactics they should use in combat or roleplay.

${characterSummary(character)}
HP ${c_hp(character)}  AC ${character.armorClass}  Speed ${character.speed}
${focus ? `\nThe player specifically asked: ${focus}` : ""}

Return advice as flowing paragraphs (no bullet lists). 250-400 words.`;
  return chat(prompt);
}

function c_hp(c: Character): string {
  return `${c.currentHp}/${c.maxHp}${c.temporaryHp ? ` (+${c.temporaryHp} temp)` : ""}`;
}

export async function generateSessionRecap(
  campaign: Campaign,
  party: Character[],
  recentLedger: LedgerEntry[],
  sessionNotes?: string,
): Promise<string> {
  const partyList = party
    .map((c) => `- ${c.name} (Level ${c.level} ${c.race} ${c.class})`)
    .join("\n");
  const ledgerList = recentLedger.length
    ? recentLedger
        .slice(0, 20)
        .map((e) => `- ${new Date(e.createdAt).toLocaleDateString()}: ${e.type}${e.notes ? ` — ${e.notes}` : ""}`)
        .join("\n")
    : "(no ledger entries yet)";

  const prompt = `Write a "Previously, in ${campaign.name}…" style session recap to read aloud at the
start of the next session. Capture the rising action, key choices, loot, and unresolved threads.
Aim for 2-4 short paragraphs of dramatic narration.

Campaign: ${campaign.name}
${campaign.description ? `Premise: ${campaign.description}` : ""}

Party:
${partyList || "(no characters attached yet)"}

Recent party ledger entries:
${ledgerList}

${sessionNotes ? `\nDM's session notes:\n${sessionNotes}` : ""}

Return only the recap prose.`;
  return chat(prompt);
}

export async function generateLedgerAdvice(
  campaign: Campaign,
  party: Character[],
  partyItems: PartyItem[],
  recentLedger: LedgerEntry[],
  pool: { cp: number; sp: number; ep: number; gp: number; pp: number },
  question?: string,
): Promise<string> {
  const partyCount = party.length;
  const itemList = partyItems.length
    ? partyItems
        .slice(0, 25)
        .map((i) => `- ${i.name} ×${i.quantity}${i.notes ? ` (${i.notes})` : ""}`)
        .join("\n")
    : "(no shared items)";
  const ledgerList = recentLedger.length
    ? recentLedger
        .slice(0, 15)
        .map((e) => `- ${e.type}${e.notes ? `: ${e.notes}` : ""}`)
        .join("\n")
    : "(no recent transactions)";

  const prompt = `You are a party treasurer / ledger assistant for the D&D campaign "${campaign.name}".
Help the party think clearly about their shared resources. Give a brief situation read,
then 2-3 concrete suggestions (fair splits, useful purchases, items to identify or sell, etc).

Party size: ${partyCount}
Shared coin pool: ${pool.pp}pp ${pool.gp}gp ${pool.ep}ep ${pool.sp}sp ${pool.cp}cp

Shared items:
${itemList}

Recent ledger:
${ledgerList}

${question ? `\nThe party asks: ${question}` : ""}

Reply in 200-350 words of friendly, plain prose.`;
  return chat(prompt);
}
