import { useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useGetCharacter,
  useUpdateCharacter,
  useGetCharacterDerivedStats,
  useListCharacterInventory,
  useAddInventoryItem,
  useRemoveInventoryItem,
  useUpdateInventoryItem,
  useGenerateBackstory,
  useGenerateBuildAdvice,
  getGetCharacterQueryKey,
  getGetCharacterDerivedStatsQueryKey,
  getListCharacterInventoryQueryKey,
} from "@workspace/api-client-react";
import AIPanel from "@/components/AIPanel";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield, Zap, Plus, Trash2, ArrowUp, Heart, Skull, Wand2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { id: number; }

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
type AbilityKey = typeof ABILITIES[number];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: "Strength", dexterity: "Dexterity", constitution: "Constitution",
  intelligence: "Intelligence", wisdom: "Wisdom", charisma: "Charisma",
};
const ABILITY_SHORT: Record<AbilityKey, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON",
  intelligence: "INT", wisdom: "WIS", charisma: "CHA",
};

const SKILLS = [
  { key: "acrobatics", label: "Acrobatics", ability: "DEX" },
  { key: "animalHandling", label: "Animal Handling", ability: "WIS" },
  { key: "arcana", label: "Arcana", ability: "INT" },
  { key: "athletics", label: "Athletics", ability: "STR" },
  { key: "deception", label: "Deception", ability: "CHA" },
  { key: "history", label: "History", ability: "INT" },
  { key: "insight", label: "Insight", ability: "WIS" },
  { key: "intimidation", label: "Intimidation", ability: "CHA" },
  { key: "investigation", label: "Investigation", ability: "INT" },
  { key: "medicine", label: "Medicine", ability: "WIS" },
  { key: "nature", label: "Nature", ability: "INT" },
  { key: "perception", label: "Perception", ability: "WIS" },
  { key: "performance", label: "Performance", ability: "CHA" },
  { key: "persuasion", label: "Persuasion", ability: "CHA" },
  { key: "religion", label: "Religion", ability: "INT" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "DEX" },
  { key: "stealth", label: "Stealth", ability: "DEX" },
  { key: "survival", label: "Survival", ability: "WIS" },
];

function signedInt(n: number) {
  return n >= 0 ? `+${n}` : String(n);
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = pct > 50 ? "bg-chart-2" : pct > 25 ? "bg-chart-3" : "bg-destructive";
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CharacterSheet({ id }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: character, isLoading } = useGetCharacter(id, {
    query: { queryKey: getGetCharacterQueryKey(id) },
  });
  const { data: derived } = useGetCharacterDerivedStats(id, {
    query: { enabled: !!character, queryKey: getGetCharacterDerivedStatsQueryKey(id) },
  });
  const { data: inventory } = useListCharacterInventory(id, {
    query: { enabled: !!character, queryKey: getListCharacterInventoryQueryKey(id) },
  });

  const updateCharacter = useUpdateCharacter();
  const addItem = useAddInventoryItem();
  const removeItem = useRemoveInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const [hpDelta, setHpDelta] = useState(0);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);

  // ── AI: Backstory + Build Advisor ─────────────────────────────────────────
  const [backstoryResult, setBackstoryResult] = useState<string | null>(null);
  const [backstoryError, setBackstoryError] = useState<string | null>(null);
  const generateBackstory = useGenerateBackstory({
    mutation: {
      onSuccess: (data) => {
        setBackstoryResult(data.backstory);
        setBackstoryError(null);
        queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(id) });
        toast({ title: "Backstory ready", description: "The threads of fate have been woven." });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to generate backstory";
        setBackstoryError(msg);
      },
    },
  });

  const [adviceResult, setAdviceResult] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const generateAdvice = useGenerateBuildAdvice({
    mutation: {
      onSuccess: (data) => {
        setAdviceResult(data.advice);
        setAdviceError(null);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to generate advice";
        setAdviceError(msg);
      },
    },
  });

  function handleHpChange(delta: number) {
    if (!character) return;
    const newHp = Math.max(0, Math.min(character.maxHp, character.currentHp + delta));
    updateCharacter.mutate(
      { id, data: { currentHp: newHp } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(id) }),
        onError: () => toast({ title: "Failed to update HP", variant: "destructive" }),
      }
    );
  }

  function handleAddItem() {
    if (!newItemName.trim()) return;
    addItem.mutate(
      { id, data: { name: newItemName.trim(), quantity: newItemQty, isCustom: true, itemSlug: "" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCharacterInventoryQueryKey(id) });
          setAddItemOpen(false);
          setNewItemName("");
          setNewItemQty(1);
        },
        onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
      }
    );
  }

  function handleRemoveItem(itemId: number) {
    removeItem.mutate(
      { id, itemId },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCharacterInventoryQueryKey(id) }),
        onError: () => toast({ title: "Failed to remove item", variant: "destructive" }),
      }
    );
  }

  function handleUpdateItemQty(itemId: number, qty: number) {
    if (qty < 1) {
      handleRemoveItem(itemId);
      return;
    }
    updateItem.mutate(
      { id, itemId, data: { quantity: qty } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCharacterInventoryQueryKey(id) }),
      }
    );
  }

  if (isLoading) return <AppLayout><div className="p-8 text-muted-foreground">Loading character...</div></AppLayout>;
  if (!character) return <AppLayout><div className="p-8 text-muted-foreground">Character not found.</div></AppLayout>;

  const derivedSkills = (derived?.skills ?? {}) as Record<string, { mod: number; proficient: boolean }>;
  const derivedSaves = (derived?.savingThrows ?? {}) as Record<string, { mod: number; proficient: boolean }>;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-primary bg-clip-text text-transparent" data-testid="text-character-name">{character.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Level {character.level} {capitalize(character.race)} {capitalize(character.class)}
              {character.background && ` · ${capitalize(character.background)}`}
              {" · "}{character.alignment}
            </p>
          </div>
          <Link href={`/characters/${id}/level-up`}>
            <Button variant="outline" size="sm" data-testid="button-level-up">
              <ArrowUp className="w-4 h-4 mr-1.5" />
              Level Up
            </Button>
          </Link>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* HP */}
          <Card data-testid="card-hp">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Hit Points</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold" data-testid="text-current-hp">{character.currentHp}</span>
                <span className="text-muted-foreground">/ {character.maxHp}</span>
                {character.temporaryHp > 0 && (
                  <span className="text-xs text-chart-4 ml-1">+{character.temporaryHp} temp</span>
                )}
              </div>
              <HpBar current={character.currentHp} max={character.maxHp} />
            </CardContent>
          </Card>

          {/* AC */}
          <Card data-testid="card-ac">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Armor Class</div>
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-3xl font-bold" data-testid="text-armor-class">{character.armorClass}</span>
              </div>
            </CardContent>
          </Card>

          {/* Initiative & Speed */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Initiative</div>
                  <div className="font-bold text-xl" data-testid="text-initiative">
                    {signedInt(derived?.initiative ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Speed</div>
                  <div className="font-bold" data-testid="text-speed">{character.speed} ft</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prof & Passives */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">Prof. Bonus</div>
                  <div className="font-bold text-xl" data-testid="text-proficiency-bonus">
                    {signedInt(derived?.proficiencyBonus ?? 2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Pass. Perception</div>
                  <div className="font-bold" data-testid="text-passive-perception">
                    {derived?.passivePerception ?? 10}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Overview | Combat | Features & Traits | Spells | Inventory */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="combat" data-testid="tab-combat">Combat</TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">Features &amp; Traits</TabsTrigger>
            <TabsTrigger value="spells" data-testid="tab-spells">Spells</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB: Ability Scores + Saving Throws + Spellcasting ── */}
          <TabsContent value="overview" className="space-y-4">
            {/* AI Build Advisor */}
            <AIPanel
              title="Build Advisor"
              description="Ask a seasoned DM for tactical guidance and what to pick next."
              buttonLabel="Ask the Advisor"
              icon={<Wand2 className="h-4 w-4 text-chart-3" />}
              testId="ai-build-advisor"
              inputs={[
                { key: "focus", label: "Specific question (optional)", placeholder: "Should I take Sharpshooter or +2 DEX at level 4?", rows: 2 },
              ]}
              result={adviceResult}
              isPending={generateAdvice.isPending}
              error={adviceError}
              onGenerate={(values) =>
                generateAdvice.mutate({
                  id,
                  data: { focus: values.focus?.trim() || undefined },
                })
              }
            />

            {/* Ability Scores */}
            <div className="grid grid-cols-6 gap-3">
              {ABILITIES.map((ability) => {
                const score = character[ability as keyof typeof character] as number;
                const modVal = Math.floor((score - 10) / 2);
                return (
                  <Card key={ability} className="text-center" data-testid={`card-ability-${ability}`}>
                    <CardContent className="p-3">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                        {ABILITY_SHORT[ability]}
                      </div>
                      <div className="text-2xl font-bold" data-testid={`text-score-${ability}`}>{score}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-mod-${ability}`}>
                        {signedInt(modVal)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Saving Throws */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Saving Throws</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {ABILITIES.map((ability) => {
                    const save = derivedSaves[ability];
                    return (
                      <div key={ability} className="flex items-center justify-between text-sm py-0.5"
                        data-testid={`row-save-${ability}`}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full border",
                            save?.proficient ? "bg-primary border-primary" : "border-muted-foreground")} />
                          <span>{ABILITY_LABELS[ability]}</span>
                        </div>
                        <span className="font-mono text-sm">{signedInt(save?.mod ?? 0)}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Currency + Spellcasting */}
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Currency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2 text-center text-sm">
                      {(["cp", "sp", "ep", "gp", "pp"] as const).map((coin) => (
                        <div key={coin} data-testid={`text-currency-${coin}`}>
                          <div className="text-xs text-muted-foreground uppercase">{coin}</div>
                          <div className="font-bold">{character[coin]}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {character.spellcastingAbility && derived?.spellSaveDC && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Spellcasting</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-sm text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Ability</div>
                        <div className="font-bold capitalize">{character.spellcastingAbility}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Save DC</div>
                        <div className="font-bold" data-testid="text-spell-save-dc">{derived.spellSaveDC}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Attack</div>
                        <div className="font-bold" data-testid="text-spell-attack">
                          {signedInt(derived.spellAttackBonus ?? 0)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── COMBAT TAB: HP management + Conditions + Death Saves ── */}
          <TabsContent value="combat" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* HP Management */}
              <Card data-testid="card-combat-hp">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-destructive" />
                    Hit Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold" data-testid="text-combat-current-hp">{character.currentHp}</span>
                    <span className="text-muted-foreground text-lg">/ {character.maxHp}</span>
                    {character.temporaryHp > 0 && (
                      <span className="text-sm text-chart-4">+{character.temporaryHp} temp</span>
                    )}
                  </div>
                  <HpBar current={character.currentHp} max={character.maxHp} />
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={hpDelta || ""}
                      onChange={(e) => setHpDelta(parseInt(e.target.value) || 0)}
                      className="h-8 w-24 text-sm"
                      data-testid="input-hp-delta"
                    />
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => handleHpChange(-Math.abs(hpDelta))}
                      data-testid="button-hp-damage">
                      Damage
                    </Button>
                    <Button size="sm" variant="outline" className="text-chart-2 border-chart-2/40 hover:bg-chart-2/10"
                      onClick={() => handleHpChange(Math.abs(hpDelta))}
                      data-testid="button-hp-heal">
                      Heal
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Combat Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Combat Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center bg-muted/20 rounded p-3">
                      <div className="text-xs text-muted-foreground">Armor Class</div>
                      <div className="text-3xl font-bold flex items-center justify-center gap-1">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span data-testid="text-combat-ac">{character.armorClass}</span>
                      </div>
                    </div>
                    <div className="text-center bg-muted/20 rounded p-3">
                      <div className="text-xs text-muted-foreground">Initiative</div>
                      <div className="text-3xl font-bold" data-testid="text-combat-initiative">
                        {signedInt(derived?.initiative ?? 0)}
                      </div>
                    </div>
                    <div className="text-center bg-muted/20 rounded p-3">
                      <div className="text-xs text-muted-foreground">Speed</div>
                      <div className="text-2xl font-bold" data-testid="text-combat-speed">{character.speed} ft</div>
                    </div>
                    <div className="text-center bg-muted/20 rounded p-3">
                      <div className="text-xs text-muted-foreground">Hit Die</div>
                      <div className="text-2xl font-bold">d?</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Death Saves */}
            {character.currentHp === 0 && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <Skull className="w-4 h-4" />
                    Death Saving Throws
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-2">Successes (3 = stable)</p>
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-8 h-8 rounded-full border border-chart-2 bg-chart-2/10" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-2">Failures (3 = dead)</p>
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-8 h-8 rounded-full border border-destructive bg-destructive/20" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills quick-reference */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skill Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {SKILLS.map(({ key, label, ability }) => {
                    const skill = derivedSkills[key];
                    return (
                      <div key={key} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0"
                        data-testid={`row-skill-${key}`}>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full border flex-shrink-0",
                            skill?.proficient ? "bg-primary border-primary" : "border-muted-foreground")} />
                          <span className="text-xs">{label}</span>
                          <span className="text-[10px] text-muted-foreground">({ability})</span>
                        </div>
                        <span className="font-mono text-xs" data-testid={`text-skill-mod-${key}`}>
                          {signedInt(skill?.mod ?? 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FEATURES & TRAITS TAB ── */}
          <TabsContent value="features" className="space-y-4">
            {/* Personality */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "personalityTraits" as const, label: "Personality Traits" },
                { key: "ideals" as const, label: "Ideals" },
                { key: "bonds" as const, label: "Bonds" },
                { key: "flaws" as const, label: "Flaws" },
              ].map(({ key, label }) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {character[key] || <em className="opacity-50">None recorded</em>}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Backstory */}
            {character.backstory && (
              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm">Backstory</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setBackstoryResult(null); setBackstoryError(null); }}
                    className="text-xs h-7"
                    data-testid="button-rewrite-backstory"
                  >
                    <Wand2 className="h-3 w-3 mr-1" /> Rewrite with AI
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{character.backstory}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Backstory Generator (always available) */}
            <AIPanel
              title={character.backstory ? "Rewrite Backstory with AI" : "Generate Backstory with AI"}
              description="Hand the quill to a seasoned DM. Optionally guide the tone or themes."
              buttonLabel={character.backstory ? "Rewrite Backstory" : "Weave a Backstory"}
              icon={<BookOpen className="h-4 w-4 text-chart-3" />}
              testId="ai-backstory"
              inputs={[
                { key: "tone", label: "Tone (optional)", placeholder: "tragic, hopeful, comedic, mysterious…", rows: 1 },
                { key: "themes", label: "Themes & hooks (optional)", placeholder: "lost sibling, oath sworn at the crossroads, debt to a hag…", rows: 2 },
              ]}
              result={backstoryResult}
              isPending={generateBackstory.isPending}
              error={backstoryError}
              onGenerate={(values) =>
                generateBackstory.mutate({
                  id,
                  data: {
                    tone: values.tone?.trim() || undefined,
                    themes: values.themes?.trim() || undefined,
                  },
                })
              }
            />

            {/* Skill proficiencies */}
            {(character.skillProficiencies as string[]).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Skill Proficiencies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {(character.skillProficiencies as string[]).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Class / racial features */}
            {(character.features as unknown as string[]).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Class &amp; Racial Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {(character.features as unknown as string[]).map((f, i) => (
                      <Badge key={i} variant="outline">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── SPELLS TAB ── */}
          <TabsContent value="spells">
            <div className="space-y-4">
              {character.spellcastingAbility ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground">Spellcasting Ability</div>
                        <div className="font-bold text-lg capitalize">{character.spellcastingAbility}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground">Spell Save DC</div>
                        <div className="font-bold text-lg">{derived?.spellSaveDC ?? "—"}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground">Spell Attack</div>
                        <div className="font-bold text-lg">
                          {derived?.spellAttackBonus != null ? signedInt(derived.spellAttackBonus) : "—"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Known Spells</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(character.knownSpells as string[]).length === 0 ? (
                        <p className="text-muted-foreground text-sm">No spells known yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(character.knownSpells as string[]).map((slug) => (
                            <Badge key={slug} variant="outline" data-testid={`badge-spell-${slug}`}>
                              {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>This class doesn't use spellcasting.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── INVENTORY TAB ── */}
          <TabsContent value="inventory">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{(inventory ?? []).length} items</p>
                <Button size="sm" onClick={() => setAddItemOpen(true)} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Item
                </Button>
              </div>

              {(inventory ?? []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Inventory is empty.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(inventory ?? []).map((item) => (
                    <div key={item.id}
                      className="flex items-center justify-between bg-card border border-border rounded px-3 py-2"
                      data-testid={`row-inventory-${item.id}`}>
                      <span className="text-sm font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => handleUpdateItemQty(item.id, (item.quantity ?? 1) - 1)}
                            data-testid={`button-item-minus-${item.id}`}>-</Button>
                          <span className="text-sm w-5 text-center" data-testid={`text-item-qty-${item.id}`}>{item.quantity ?? 1}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => handleUpdateItemQty(item.id, (item.quantity ?? 1) + 1)}
                            data-testid={`button-item-plus-${item.id}`}>+</Button>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                          data-testid={`button-remove-item-${item.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Item Dialog */}
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogContent data-testid="dialog-add-item">
                  <DialogHeader>
                    <DialogTitle>Add Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="item-name">Item Name</Label>
                      <Input
                        id="item-name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="e.g. Potion of Healing"
                        data-testid="input-item-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="item-qty">Quantity</Label>
                      <Input
                        id="item-qty"
                        type="number"
                        min={1}
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24"
                        data-testid="input-item-quantity"
                      />
                    </div>
                    <Button
                      onClick={handleAddItem}
                      disabled={!newItemName.trim() || addItem.isPending}
                      data-testid="button-confirm-add-item"
                    >
                      {addItem.isPending ? "Adding..." : "Add to Inventory"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
