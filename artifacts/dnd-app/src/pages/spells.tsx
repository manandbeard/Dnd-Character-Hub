import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListSpells, getListSpellsQueryKey } from "@workspace/api-client-react";
import type { ListSpellsParams } from "@workspace/api-client-react";
import { Search, Zap } from "lucide-react";

const SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const CLASSES = ["barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"];

function levelLabel(level: number) {
  if (level === 0) return "Cantrip";
  const ordinals = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  return `${ordinals[level]} Level`;
}

export default function SpellsPage() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [school, setSchool] = useState<string>("all");
  const [cls, setCls] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);

  const params: ListSpellsParams = {};
  if (search) params.search = search;
  if (level !== "all") params.level = Number(level);
  if (school !== "all") params.school = school;
  if (cls !== "all") params.class = cls;

  const { data: spells, isLoading } = useListSpells(params, {
    query: { queryKey: getListSpellsQueryKey(params) },
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold mb-1">Spell Compendium</h1>
          <p className="text-muted-foreground text-sm">Browse all SRD spells</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search spells..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-spell-search"
            />
          </div>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-36" data-testid="select-spell-level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="0">Cantrip</SelectItem>
              {[1,2,3,4,5,6,7,8,9].map((l) => (
                <SelectItem key={l} value={String(l)}>{levelLabel(l)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={school} onValueChange={setSchool}>
            <SelectTrigger className="w-40" data-testid="select-spell-school">
              <SelectValue placeholder="School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {SCHOOLS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="w-36" data-testid="select-spell-class">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <div className="text-sm text-muted-foreground mb-4">
          {isLoading ? "Loading..." : `${spells?.length ?? 0} spells`}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 rounded-md bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {(spells ?? []).map((spell) => (
              <button
                key={spell.id}
                className="w-full text-left bg-card border border-border rounded-md px-4 py-3 hover:border-primary/50 transition-colors"
                onClick={() => setSelected(spell)}
                data-testid={`row-spell-${spell.slug}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{spell.name}</span>
                    {spell.concentration && <Badge variant="outline" className="text-[10px]">Conc</Badge>}
                    {spell.ritual && <Badge variant="outline" className="text-[10px]">Ritual</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{spell.school}</span>
                    <span>{levelLabel(spell.level)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && spells?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No spells match your filters.</p>
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-spell-detail">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">{selected.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {levelLabel(selected.level)} {selected.school}
                    {selected.ritual ? " (ritual)" : ""}
                  </p>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Casting Time:</span> {selected.castingTime}</div>
                    <div><span className="text-muted-foreground">Range:</span> {selected.range}</div>
                    <div><span className="text-muted-foreground">Components:</span> {(selected.components as string[]).join(", ")}</div>
                    <div><span className="text-muted-foreground">Duration:</span> {selected.duration}</div>
                  </div>
                  {selected.damageType && (
                    <div><span className="text-muted-foreground">Damage Type:</span> {selected.damageType}</div>
                  )}
                  <p>{selected.description}</p>
                  {selected.higherLevel && (
                    <p className="text-muted-foreground italic"><strong>At Higher Levels:</strong> {selected.higherLevel}</p>
                  )}
                  <div>
                    <span className="text-muted-foreground">Classes:</span>{" "}
                    {(selected.classes as string[]).map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
