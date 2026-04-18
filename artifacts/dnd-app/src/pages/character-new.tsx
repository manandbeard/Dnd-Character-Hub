import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useListRaces, useListClasses, useListBackgrounds, useCreateCharacter, getListCharactersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Dice6 } from "lucide-react";
import { cn } from "@/lib/utils";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
type AbilityKey = typeof ABILITIES[number];

const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const ALL_SKILLS = [
  "acrobatics", "animalHandling", "arcana", "athletics", "deception",
  "history", "insight", "intimidation", "investigation", "medicine",
  "nature", "perception", "performance", "persuasion", "religion",
  "sleightOfHand", "stealth", "survival",
] as const;

const SKILL_LABELS: Record<string, string> = {
  acrobatics: "Acrobatics", animalHandling: "Animal Handling", arcana: "Arcana",
  athletics: "Athletics", deception: "Deception", history: "History",
  insight: "Insight", intimidation: "Intimidation", investigation: "Investigation",
  medicine: "Medicine", nature: "Nature", perception: "Perception",
  performance: "Performance", persuasion: "Persuasion", religion: "Religion",
  sleightOfHand: "Sleight of Hand", stealth: "Stealth", survival: "Survival",
};

function modifier(score: number) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : String(m);
}

const STEPS = ["Identity", "Ability Scores", "Background", "Skills", "Equipment", "Review"];

function rollAbilityScore() {
  const dice = [1, 2, 3, 4].map(() => Math.floor(Math.random() * 6) + 1);
  dice.sort((a, b) => a - b);
  return dice.slice(1).reduce((a, b) => a + b, 0);
}

interface FormState {
  name: string;
  race: string;
  class: string;
  alignment: string;
  scores: Record<AbilityKey, number>;
  background: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  skillProficiencies: string[];
  selectedStartingEquipment: string[];
}

export default function CharacterNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  const { data: races } = useListRaces();
  const { data: classes } = useListClasses();
  const { data: backgrounds } = useListBackgrounds();
  const createCharacter = useCreateCharacter();

  const [form, setForm] = useState<FormState>({
    name: "",
    race: "",
    class: "",
    alignment: "True Neutral",
    scores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    background: "",
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    skillProficiencies: [],
    selectedStartingEquipment: [],
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setScore(ability: AbilityKey, value: number) {
    const clamped = Math.max(1, Math.min(20, value));
    setForm((prev) => ({ ...prev, scores: { ...prev.scores, [ability]: clamped } }));
  }

  function rollAll() {
    const rolled = {} as Record<AbilityKey, number>;
    for (const a of ABILITIES) {
      rolled[a] = rollAbilityScore();
    }
    setForm((prev) => ({ ...prev, scores: rolled }));
  }

  function toggleSkill(skill: string, bgSkills: string[], maxClass: number) {
    setForm((prev) => {
      const isFixed = bgSkills.includes(skill);
      if (isFixed) return prev;
      const classOnly = prev.skillProficiencies.filter((s) => !bgSkills.includes(s));
      if (classOnly.includes(skill)) {
        return { ...prev, skillProficiencies: prev.skillProficiencies.filter((s) => s !== skill) };
      }
      if (classOnly.length >= maxClass) return prev;
      return { ...prev, skillProficiencies: [...prev.skillProficiencies, skill] };
    });
  }

  function toggleEquipmentItem(item: string) {
    setForm((prev) => {
      const already = prev.selectedStartingEquipment.includes(item);
      return {
        ...prev,
        selectedStartingEquipment: already
          ? prev.selectedStartingEquipment.filter((e) => e !== item)
          : [...prev.selectedStartingEquipment, item],
      };
    });
  }

  function canProceed() {
    if (step === 0) return form.name.trim() && form.race && form.class;
    if (step === 1) return ABILITIES.every((a) => form.scores[a] >= 1 && form.scores[a] <= 20);
    if (step === 2) return !!form.background;
    if (step === 3) return true; // skills are optional
    if (step === 4) return true; // equipment choices are optional
    return true;
  }

  async function handleCreate() {
    createCharacter.mutate(
      {
        data: {
          name: form.name,
          race: form.race,
          class: form.class,
          background: form.background,
          alignment: form.alignment,
          ...form.scores,
          personalityTraits: form.personalityTraits,
          ideals: form.ideals,
          bonds: form.bonds,
          flaws: form.flaws,
          backstory: form.backstory,
          skillProficiencies: form.skillProficiencies,
          startingEquipment: form.selectedStartingEquipment,
        },
      },
      {
        onSuccess: (character) => {
          queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
          toast({ title: `${character.name} created!` });
          navigate(`/characters/${character.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create character", variant: "destructive" });
        },
      }
    );
  }

  const selectedRace = races?.find((r) => r.slug === form.race);
  const selectedClass = classes?.find((c) => c.slug === form.class);
  const selectedBg = backgrounds?.find((b) => b.slug === form.background);

  // Background-granted skills (fixed)
  const bgSkills = (selectedBg?.skillProficiencies as string[] | null) ?? [];

  // Class skill choice metadata
  const classSkillChoices = selectedClass?.skillChoices as { choose?: number; from?: string[] } | null;
  const classChooseCount = classSkillChoices?.choose ?? 2;
  const classSkillPool = (classSkillChoices?.from as string[] | null) ?? [...ALL_SKILLS];

  // Skills selected by the player as class choices (excluding bg-granted)
  const classChosenSkills = form.skillProficiencies.filter((s) => !bgSkills.includes(s));

  // Pre-populate starting equipment with all class items when entering equipment step
  useEffect(() => {
    if (step === 4 && selectedClass && form.selectedStartingEquipment.length === 0) {
      const classEquipment = selectedClass.startingEquipment ?? [];
      if (classEquipment.length > 0) {
        setForm((prev) => ({ ...prev, selectedStartingEquipment: [...classEquipment] }));
      }
    }
  }, [step, selectedClass]);

  function finalScore(ability: AbilityKey) {
    const bonus = (selectedRace?.abilityBonuses as Record<string, number> | null)?.[ability] ?? 0;
    return form.scores[ability] + bonus;
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-muted text-muted-foreground" : "bg-muted/30 text-muted-foreground/50"
              )}>
                {i + 1}
              </div>
              <span className={cn("text-sm whitespace-nowrap", i === step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 0: Identity */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">Who are you?</h2>

            <div className="space-y-1.5">
              <Label htmlFor="char-name">Character Name</Label>
              <Input
                id="char-name"
                data-testid="input-character-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Aldric Stonehammer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Race</Label>
                <Select value={form.race} onValueChange={(v) => set("race", v)}>
                  <SelectTrigger data-testid="select-race">
                    <SelectValue placeholder="Choose race..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(races ?? []).map((r) => (
                      <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.class} onValueChange={(v) => set("class", v)}>
                  <SelectTrigger data-testid="select-class">
                    <SelectValue placeholder="Choose class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRace && (
              <Card className="bg-accent/30">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">{selectedRace.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{selectedRace.description}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Speed {selectedRace.speed} ft ·</span>
                    {Object.entries((selectedRace.abilityBonuses as Record<string, number>) ?? {}).map(([a, b]) => (
                      <Badge key={a} variant="outline" className="text-xs">{ABILITY_LABELS[a as AbilityKey]} +{b}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedClass && (
              <Card className="bg-accent/30">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">{selectedClass.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{selectedClass.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Hit Die: d{selectedClass.hitDie}</span>
                    <span>Primary: {String(selectedClass.primaryAbility).toUpperCase()}</span>
                    <span>Saves: {(selectedClass.savingThrows as string[]).join(", ").toUpperCase()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label>Alignment</Label>
              <Select value={form.alignment} onValueChange={(v) => set("alignment", v)}>
                <SelectTrigger data-testid="select-alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALIGNMENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 1: Ability Scores */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">Ability Scores</h2>
              <Button variant="outline" size="sm" onClick={rollAll} data-testid="button-roll-all">
                <Dice6 className="w-4 h-4 mr-2" />
                Roll 4d6
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Set your base ability scores (1–20). Racial bonuses will be applied automatically.</p>

            <div className="grid grid-cols-2 gap-4">
              {ABILITIES.map((ability) => {
                const bonus = (selectedRace?.abilityBonuses as Record<string, number> | null)?.[ability] ?? 0;
                return (
                  <div key={ability} className="space-y-1.5">
                    <Label>{ability.charAt(0).toUpperCase() + ability.slice(1)} ({ABILITY_LABELS[ability]})</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={form.scores[ability]}
                        onChange={(e) => setScore(ability, parseInt(e.target.value) || 10)}
                        className="w-20"
                        data-testid={`input-score-${ability}`}
                      />
                      <div className="text-sm">
                        <span className="text-muted-foreground">Base </span>
                        {bonus > 0 && <span className="text-primary">+{bonus} racial → </span>}
                        <span className="font-bold">{form.scores[ability] + bonus}</span>
                        <span className="text-muted-foreground ml-1">({modifier(form.scores[ability] + bonus)})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Background & Story */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">Background &amp; Story</h2>

            <div className="space-y-1.5">
              <Label>Background</Label>
              <Select value={form.background} onValueChange={(v) => {
                set("background", v);
                // Pre-populate background skill proficiencies
                const bg = backgrounds?.find((b) => b.slug === v);
                if (bg) {
                  const bgProfs = (bg.skillProficiencies as string[] | null) ?? [];
                  setForm((prev) => ({
                    ...prev,
                    background: v,
                    skillProficiencies: [
                      ...bgProfs,
                      ...prev.skillProficiencies.filter((s) => !bgProfs.includes(s) && bgSkills.includes(s) === false),
                    ],
                  }));
                }
              }}>
                <SelectTrigger data-testid="select-background">
                  <SelectValue placeholder="Choose background..." />
                </SelectTrigger>
                <SelectContent>
                  {(backgrounds ?? []).map((b) => (
                    <SelectItem key={b.slug} value={b.slug}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBg && (
              <Card className="bg-accent/30">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium mb-1">{selectedBg.name}</p>
                  <p className="text-muted-foreground text-xs mb-2">{selectedBg.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Skills: {(selectedBg.skillProficiencies as string[]).map((s) => SKILL_LABELS[s] ?? s).join(", ")}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="personality">Personality Traits</Label>
                <Textarea id="personality" data-testid="input-personality" value={form.personalityTraits}
                  onChange={(e) => set("personalityTraits", e.target.value)}
                  placeholder={selectedBg ? `e.g. "${(selectedBg.personalityTraits as string[])?.[0] ?? ""}"` : "Describe your character's personality..."}
                  rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ideals">Ideals</Label>
                <Textarea id="ideals" data-testid="input-ideals" value={form.ideals}
                  onChange={(e) => set("ideals", e.target.value)}
                  placeholder="What does your character believe in?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bonds">Bonds</Label>
                <Textarea id="bonds" data-testid="input-bonds" value={form.bonds}
                  onChange={(e) => set("bonds", e.target.value)}
                  placeholder="What connections does your character have?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flaws">Flaws</Label>
                <Textarea id="flaws" data-testid="input-flaws" value={form.flaws}
                  onChange={(e) => set("flaws", e.target.value)}
                  placeholder="What weaknesses does your character have?" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="backstory">Backstory</Label>
                <Textarea id="backstory" data-testid="input-backstory" value={form.backstory}
                  onChange={(e) => set("backstory", e.target.value)}
                  placeholder="Tell your character's story..." rows={4} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">Skill Proficiencies</h2>

            {/* Background skills */}
            {bgSkills.length > 0 && (
              <Card className="bg-accent/30">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">Background: {selectedBg?.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">These skills are automatically granted:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bgSkills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs" data-testid={`badge-bg-skill-${s}`}>
                        {SKILL_LABELS[s] ?? s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Class skill choices */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">
                  {selectedClass?.name ?? "Class"} Skills
                  <span className="text-muted-foreground font-normal ml-2 text-xs">
                    ({classChosenSkills.length} / {classChooseCount} chosen)
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose {classChooseCount} skill{classChooseCount !== 1 ? "s" : ""} from the options below:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {classSkillPool.map((skill) => {
                  const isFixed = bgSkills.includes(skill);
                  const isChosen = form.skillProficiencies.includes(skill);
                  const isClassChosen = classChosenSkills.includes(skill);
                  const isMaxed = classChosenSkills.length >= classChooseCount && !isClassChosen;

                  return (
                    <div
                      key={skill}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 border transition-colors",
                        isFixed ? "opacity-60 bg-muted/20 border-transparent" :
                        isChosen ? "bg-primary/10 border-primary/30" :
                        isMaxed ? "opacity-40 border-border" : "border-border hover:bg-accent/20 cursor-pointer"
                      )}
                      onClick={() => !isFixed && toggleSkill(skill, bgSkills, classChooseCount)}
                      data-testid={`skill-option-${skill}`}
                    >
                      <Checkbox
                        checked={isChosen}
                        disabled={isFixed || (isMaxed && !isChosen)}
                        onCheckedChange={() => !isFixed && toggleSkill(skill, bgSkills, classChooseCount)}
                        className="pointer-events-none"
                        data-testid={`checkbox-skill-${skill}`}
                      />
                      <span className="text-sm">{SKILL_LABELS[skill] ?? skill}</span>
                      {isFixed && <span className="text-xs text-muted-foreground ml-auto">(BG)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Equipment */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">Starting Equipment</h2>
            <p className="text-sm text-muted-foreground">
              Select the equipment your character begins with. Toggle items to customize your starting kit.
            </p>

            {selectedClass && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{selectedClass.name} Starting Equipment</p>
                <div className="space-y-2">
                  {(selectedClass.startingEquipment as string[] | null ?? []).map((item) => {
                    const isSelected = form.selectedStartingEquipment.includes(item);
                    return (
                      <div
                        key={item}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 border cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10 border-primary/30" : "border-border hover:bg-accent/20"
                        )}
                        onClick={() => toggleEquipmentItem(item)}
                        data-testid={`equipment-item-${item.slice(0, 20).replace(/\s+/g, "-")}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEquipmentItem(item)}
                          className="pointer-events-none"
                        />
                        <span className="text-sm">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedBg && (selectedBg.equipment as string[] | null ?? []).length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Background Equipment (auto-included)</p>
                <Card className="bg-muted/20">
                  <CardContent className="p-3">
                    <ul className="text-sm space-y-1">
                      {(selectedBg.equipment as string[]).map((item) => (
                        <li key={item} className="text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {form.selectedStartingEquipment.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No class equipment selected. You can add items from the inventory on your character sheet.</p>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">Review</h2>
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold">{form.name}</h3>
                <p className="text-muted-foreground text-sm">
                  Level 1 {form.race.charAt(0).toUpperCase() + form.race.slice(1)} {form.class.charAt(0).toUpperCase() + form.class.slice(1)} · {form.alignment}
                </p>
                {form.background && (
                  <p className="text-muted-foreground text-sm">Background: {form.background.charAt(0).toUpperCase() + form.background.slice(1)}</p>
                )}
              </div>

              <div className="grid grid-cols-6 gap-2">
                {ABILITIES.map((a) => (
                  <div key={a} className="text-center bg-muted/20 rounded p-2">
                    <div className="text-xs text-muted-foreground mb-0.5">{ABILITY_LABELS[a]}</div>
                    <div className="font-bold text-lg">{finalScore(a)}</div>
                    <div className="text-xs text-muted-foreground">{modifier(finalScore(a))}</div>
                  </div>
                ))}
              </div>

              {form.skillProficiencies.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Skill Proficiencies</p>
                  <div className="flex flex-wrap gap-1">
                    {form.skillProficiencies.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{SKILL_LABELS[s] ?? s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {form.personalityTraits && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Personality</p>
                  <p className="text-sm">{form.personalityTraits}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            data-testid="button-step-back"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              data-testid="button-step-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={createCharacter.isPending}
              data-testid="button-create-character"
            >
              {createCharacter.isPending ? "Creating..." : "Create Character"}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
