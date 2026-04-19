import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Shield, Search, Users, Calendar, Swords, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListPublicCampaigns, useCreateJoinRequest } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function DiscoverPage() {
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [levelMin, setLevelMin] = useState<string>("");
  const [levelMax, setLevelMax] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState<{
    search?: string; levelMin?: number; levelMax?: number;
  }>({});

  const { data: listings, isLoading, refetch } = useListPublicCampaigns(appliedFilters);
  const createJoinRequest = useCreateJoinRequest();

  function applyFilters() {
    setAppliedFilters({
      search: search || undefined,
      levelMin: levelMin ? Number(levelMin) : undefined,
      levelMax: levelMax ? Number(levelMax) : undefined,
    });
  }

  function requestJoin(campaignId: number) {
    if (!isSignedIn) {
      toast({ title: "Sign in to request to join", variant: "destructive" });
      return;
    }
    const message = window.prompt("Add a short note to the DM (optional):") ?? "";
    createJoinRequest.mutate(
      { id: campaignId, data: { message } },
      {
        onSuccess: () => toast({ title: "Join request sent!" }),
        onError: (err) => {
          const e = err as { response?: { data?: { error?: string } } };
          toast({
            title: "Could not send request",
            description: e?.response?.data?.error ?? "Please try again later.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center justify-between bg-card">
        <Link href={isSignedIn ? "/characters" : "/"} className="flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-serif font-bold text-xl tracking-wide">DDnD</span>
          <span className="text-muted-foreground text-sm ml-3">Discover</span>
        </Link>
        <div className="flex gap-3">
          {isSignedIn ? (
            <Link href="/characters"><Button variant="outline" size="sm">My Characters</Button></Link>
          ) : (
            <Link href="/"><Button variant="outline" size="sm">Sign In</Button></Link>
          )}
        </div>
      </header>

      <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold mb-2">Find a Campaign</h1>
          <p className="text-muted-foreground">Browse open recruitment listings from DMs around the realm.</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="search">Search by campaign name</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  data-testid="input-discover-search"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="The Sunless Vault..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lmin">Level Min</Label>
              <Input id="lmin" type="number" min="1" max="20" value={levelMin}
                onChange={(e) => setLevelMin(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lmax">Level Max</Label>
              <Input id="lmax" type="number" min="1" max="20" value={levelMax}
                onChange={(e) => setLevelMax(e.target.value)} placeholder="20" />
            </div>
            <div className="md:col-span-4">
              <Button onClick={applyFilters} data-testid="button-apply-filters">Apply Filters</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="text-muted-foreground">Loading listings...</div>
        ) : !listings || listings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-serif text-lg mb-1">No campaigns found</p>
              <p className="text-muted-foreground text-sm">Try widening your filters, or check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {listings.map((l) => (
              <Card key={l.listing.id} data-testid={`listing-${l.listing.id}`} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-serif text-xl">{l.campaignName}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">
                        Hosted by{" "}
                        <Link href={`/profile/${l.dm.id}`} className="text-primary hover:underline">
                          {l.dm.name ?? "A mysterious DM"}
                        </Link>
                      </div>
                    </div>
                    <Badge variant="outline">{l.listing.system}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {l.listing.pitch || l.campaignDescription || "No pitch provided."}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                    <div className="flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-muted-foreground" />
                      Lv {l.listing.levelMin}–{l.listing.levelMax}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      {l.memberCount} {l.memberCount === 1 ? "player" : "players"}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {l.listing.openSlots} open
                    </div>
                  </div>
                  {l.listing.schedule && (
                    <div className="text-xs text-muted-foreground mb-3">
                      <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                      {l.listing.schedule}
                    </div>
                  )}
                  <Button
                    className="mt-auto"
                    size="sm"
                    onClick={() => requestJoin(l.campaignId)}
                    disabled={createJoinRequest.isPending}
                    data-testid={`button-join-${l.listing.id}`}
                  >
                    Request to Join
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          {listings && `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
          {" · "}
          <button onClick={() => refetch()} className="hover:text-foreground underline">Refresh</button>
        </div>
      </main>
    </div>
  );
}
