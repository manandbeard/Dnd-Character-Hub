import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListItems, getListItemsQueryKey } from "@workspace/api-client-react";
import type { ListItemsParams, ItemRef } from "@workspace/api-client-react";
import { Search, Package } from "lucide-react";

const TYPES = ["weapon", "armor", "potion", "tool", "adventuring-gear", "wondrous-item"];
const RARITIES = ["common", "uncommon", "rare", "very rare", "legendary"];

function capitalize(s: string) {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  "very rare": "text-purple-400",
  legendary: "text-amber-400",
};

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [rarity, setRarity] = useState<string>("all");
  const [selected, setSelected] = useState<ItemRef | null>(null);

  const params: ListItemsParams = {};
  if (search) params.search = search;
  if (type !== "all") params.type = type;
  if (rarity !== "all") params.rarity = rarity;

  const { data: items, isLoading } = useListItems(params, {
    query: { queryKey: getListItemsQueryKey(params) },
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold mb-1">Item Compendium</h1>
          <p className="text-muted-foreground text-sm">Browse all SRD equipment and magic items</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-item-search"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44" data-testid="select-item-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{capitalize(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={rarity} onValueChange={setRarity}>
            <SelectTrigger className="w-36" data-testid="select-item-rarity">
              <SelectValue placeholder="Rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              {RARITIES.map((r) => <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {isLoading ? "Loading..." : `${items?.length ?? 0} items`}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 rounded-md bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {(items ?? []).map((item) => (
              <button
                key={item.id}
                className="w-full text-left bg-card border border-border rounded-md px-4 py-3 hover:border-primary/50 transition-colors"
                onClick={() => setSelected(item)}
                data-testid={`row-item-${item.slug}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.name}</span>
                    {item.requiresAttunement && <Badge variant="outline" className="text-[10px]">Attunement</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{capitalize(item.type)}</span>
                    <span className={RARITY_COLORS[item.rarity] ?? "text-muted-foreground"}>
                      {capitalize(item.rarity)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isLoading && items?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No items match your filters.</p>
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg" data-testid="dialog-item-detail">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">{selected.name}</DialogTitle>
                  <p className={`text-sm ${RARITY_COLORS[selected.rarity] ?? "text-muted-foreground"}`}>
                    {capitalize(selected.rarity)} {capitalize(selected.type)}
                  </p>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  {selected.description && <p>{selected.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    {selected.weight && <div>Weight: {selected.weight} lb</div>}
                    {selected.cost && (
                      <div>Cost: {selected.cost.amount} {selected.cost.currency}</div>
                    )}
                    {selected.armorClass && <div>AC: {selected.armorClass}</div>}
                    {selected.damageRoll && (
                      <div>Damage: {selected.damageRoll} {selected.damageType}</div>
                    )}
                  </div>
                  {(selected.properties as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(selected.properties as string[]).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs">{capitalize(p)}</Badge>
                      ))}
                    </div>
                  )}
                  {selected.requiresAttunement && (
                    <p className="text-amber-400 text-xs">Requires attunement</p>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
