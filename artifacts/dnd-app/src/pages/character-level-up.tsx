import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetCharacter, useLevelUpCharacter, getGetCharacterQueryKey, getListCharactersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dice6 } from "lucide-react";

const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
type AbilityKey = typeof ABILITIES[number];
const ABILITY_LABELS: Record<AbilityKey, string> = {
  strength: "STR", dexterity: "DEX", constitution: "CON",
  intelligence: "INT", wisdom: "WIS", charisma: "CHA",
};

interface Props { id: number; }

export default function CharacterLevelUp({ id }: Props) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: character, isLoading } = useGetCharacter(id, {
    query: { queryKey: getGetCharacterQueryKey(id) },
  });
  const levelUp = useLevelUpCharacter();

  const [hpIncrease, setHpIncrease] = useState<number>(4);
  const [asiPoints, setAsiPoints] = useState<Record<string, number>>({});

  // Determine hit die from a reasonable default based on class
  function rollHp() {
    // Without knowing hit die we use d8 as a common average
    const roll = Math.floor(Math.random() * 8) + 1;
    setHpIncrease(roll);
  }

  const totalAsi = Object.values(asiPoints).reduce((a, b) => a + b, 0);
  const asiLevel = character ? (character.level + 1) : 0;
  const isAsiLevel = [4, 8, 12, 16, 19].includes(asiLevel);

  function addAsi(ability: string, delta: number) {
    setAsiPoints((prev) => {
      const cur = (prev[ability] ?? 0) + delta;
      if (cur < 0 || totalAsi + delta > 2) return prev;
      return { ...prev, [ability]: cur };
    });
  }

  async function handleLevelUp() {
    if (!character) return;
    levelUp.mutate(
      {
        id,
        data: {
          hpIncrease,
          abilityScoreImprovements: isAsiLevel ? asiPoints : {},
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCharacterQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
          toast({ title: `${character.name} reached level ${character.level + 1}!` });
          navigate(`/characters/${id}`);
        },
        onError: () => {
          toast({ title: "Level-up failed", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) return <AppLayout><div className="p-8 text-muted-foreground">Loading...</div></AppLayout>;
  if (!character) return <AppLayout><div className="p-8 text-muted-foreground">Character not found.</div></AppLayout>;
  if (character.level >= 20) return <AppLayout><div className="p-8">This character is already at max level!</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-8 max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold">{character.name}</h1>
          <p className="text-muted-foreground text-sm">Level {character.level} → {character.level + 1}</p>
        </div>

        <div className="space-y-5">
          {/* HP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hit Points</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Current max HP: <strong>{character.maxHp}</strong>. Choose your HP increase for this level.
              </p>
              <div className="flex items-center gap-3">
                <div className="space-y-1.5">
                  <Label>HP Increase (before CON modifier)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={hpIncrease}
                    onChange={(e) => setHpIncrease(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                    data-testid="input-hp-increase"
                  />
                </div>
                <div className="mt-5">
                  <Button variant="outline" size="sm" onClick={rollHp} data-testid="button-roll-hp">
                    <Dice6 className="w-4 h-4 mr-1.5" />
                    Roll d8
                  </Button>
                </div>
                <div className="mt-5 text-sm text-muted-foreground">
                  New max HP: <strong className="text-foreground">~{character.maxHp + hpIncrease}</strong>
                  <span className="text-xs ml-1">(+CON mod)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ASI */}
          {isAsiLevel && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Ability Score Improvement
                  <Badge variant="outline" className="text-xs">{2 - totalAsi} points remaining</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Level {character.level + 1} grants +2 points to distribute among your ability scores (max 20).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ABILITIES.map((ability) => {
                    const cur = (character as any)[ability] as number;
                    const added = asiPoints[ability] ?? 0;
                    return (
                      <div key={ability} className="flex items-center justify-between bg-muted/20 rounded p-2">
                        <div>
                          <div className="text-sm font-medium">{ABILITY_LABELS[ability]}</div>
                          <div className="text-xs text-muted-foreground">{cur} → {Math.min(20, cur + added)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => addAsi(ability, -1)}
                            disabled={!added}
                            data-testid={`button-asi-minus-${ability}`}
                          >-</Button>
                          <span className="w-4 text-center text-sm font-bold">{added}</span>
                          <Button
                            variant="ghost" size="sm" className="h-6 w-6 p-0"
                            onClick={() => addAsi(ability, 1)}
                            disabled={totalAsi >= 2 || cur + added >= 20}
                            data-testid={`button-asi-plus-${ability}`}
                          >+</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={() => navigate(`/characters/${id}`)} data-testid="button-cancel-levelup">
            Cancel
          </Button>
          <Button onClick={handleLevelUp} disabled={levelUp.isPending} data-testid="button-confirm-levelup">
            {levelUp.isPending ? "Leveling up..." : `Advance to Level ${character.level + 1}`}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
