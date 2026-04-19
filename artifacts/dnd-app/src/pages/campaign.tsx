import { useState } from "react";
import { Link, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetCampaign,
  useListCampaignCharacters,
  useListPartyItems,
  useAddPartyItem,
  useRemovePartyItem,
  useTransferPartyItem,
  useDepositCurrency,
  useWithdrawCurrency,
  useSplitCurrency,
  useListLedgerEntries,
  useRefreshInviteCode,
  useDeleteCampaign,
  useRemoveCampaignMember,
  useListCharacters,
  useAttachCharacterToCampaign,
  useDetachCharacterFromCampaign,
  getGetCampaignQueryKey,
  getListPartyItemsQueryKey,
  getListLedgerEntriesQueryKey,
  getListCampaignsQueryKey,
  getListCampaignCharactersQueryKey,
  useListCampaigns,
  useGenerateSessionRecap,
  useGenerateLedgerAdvice,
} from "@workspace/api-client-react";
import AIPanel from "@/components/AIPanel";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/react";
import {
  ArrowLeft, Copy, RefreshCw, Trash2, Plus, ArrowRightLeft,
  Shield, Heart, Eye, Coins, Clock, Package, Users, Swords,
  ChevronDown, ChevronUp, UserMinus, Scroll, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { id: number; }

const COIN_LABELS: Array<{ key: "pp" | "gp" | "ep" | "sp" | "cp"; label: string; color: string }> = [
  { key: "pp", label: "Platinum", color: "text-purple-400" },
  { key: "gp", label: "Gold", color: "text-yellow-400" },
  { key: "ep", label: "Electrum", color: "text-cyan-400" },
  { key: "sp", label: "Silver", color: "text-slate-300" },
  { key: "cp", label: "Copper", color: "text-orange-400" },
];

type CurrencyKey = "cp" | "sp" | "ep" | "gp" | "pp";

function emptyCoins(): Record<CurrencyKey, string> {
  return { cp: "", sp: "", ep: "", gp: "", pp: "" };
}
function parseCoins(coins: Record<CurrencyKey, string>): Record<CurrencyKey, number> {
  return {
    cp: Number(coins.cp) || 0,
    sp: Number(coins.sp) || 0,
    ep: Number(coins.ep) || 0,
    gp: Number(coins.gp) || 0,
    pp: Number(coins.pp) || 0,
  };
}

function CurrencyRow({ value, onChange }: {
  value: Record<CurrencyKey, string>;
  onChange: (k: CurrencyKey, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {COIN_LABELS.map(({ key, label, color }) => (
        <div key={key} className="text-center">
          <label className={cn("text-xs font-bold block mb-1", color)}>{label.slice(0, 2).toUpperCase()}</label>
          <Input
            type="number"
            min="0"
            value={value[key]}
            onChange={(e) => onChange(key, e.target.value)}
            className="text-center h-9 text-sm"
            placeholder="0"
          />
        </div>
      ))}
    </div>
  );
}

export default function CampaignPage({ id }: Props) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  const { data: campaign, isLoading } = useGetCampaign(id);
  const { data: characters } = useListCampaignCharacters(id);
  const { data: partyItems } = useListPartyItems(id);
  const { data: ledger } = useListLedgerEntries(id, { limit: 100, offset: 0 });
  const { data: myCharacters } = useListCharacters();

  const addItemMutation = useAddPartyItem();
  const removeItemMutation = useRemovePartyItem();
  const transferMutation = useTransferPartyItem();
  const depositMutation = useDepositCurrency();
  const withdrawMutation = useWithdrawCurrency();
  const splitMutation = useSplitCurrency();
  const refreshCodeMutation = useRefreshInviteCode();
  const deleteCampaignMutation = useDeleteCampaign();
  const removeMemberMutation = useRemoveCampaignMember();
  const attachCharacterMutation = useAttachCharacterToCampaign();
  const detachCharacterMutation = useDetachCharacterFromCampaign();

  const isDm = campaign?.dmUserId === user?.id;

  // Add item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", itemSlug: "", quantity: "1", notes: "" });

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferItemId, setTransferItemId] = useState<number | null>(null);
  const [transferDirection, setTransferDirection] = useState<"to_character" | "to_party">("to_character");
  const [transferCharId, setTransferCharId] = useState<string>("");
  const [transferQty, setTransferQty] = useState("1");

  // Currency dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositCoins, setDepositCoins] = useState<Record<CurrencyKey, string>>(emptyCoins());
  const [withdrawCoins, setWithdrawCoins] = useState<Record<CurrencyKey, string>>(emptyCoins());

  // Item search
  const [itemSearch, setItemSearch] = useState("");

  // Attach character dialog
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachCharId, setAttachCharId] = useState<string>("");

  // ── AI: Session Recap + Ledger Advice ──────────────────────────────────────
  const [recapResult, setRecapResult] = useState<string | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);
  const generateRecap = useGenerateSessionRecap({
    mutation: {
      onSuccess: (data) => { setRecapResult(data.recap); setRecapError(null); },
      onError: (err: unknown) => {
        setRecapError(err instanceof Error ? err.message : "Failed to generate recap");
      },
    },
  });

  const [ledgerAdviceResult, setLedgerAdviceResult] = useState<string | null>(null);
  const [ledgerAdviceError, setLedgerAdviceError] = useState<string | null>(null);
  const generateLedgerAdvice = useGenerateLedgerAdvice({
    mutation: {
      onSuccess: (data) => { setLedgerAdviceResult(data.advice); setLedgerAdviceError(null); },
      onError: (err: unknown) => {
        setLedgerAdviceError(err instanceof Error ? err.message : "Failed to generate advice");
      },
    },
  });

  const filteredItems = (partyItems ?? []).filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    try {
      await addItemMutation.mutateAsync({
        id,
        data: {
          itemSlug: newItem.itemSlug || "custom",
          name: newItem.name.trim(),
          quantity: Number(newItem.quantity) || 1,
          isCustom: !newItem.itemSlug,
          notes: newItem.notes,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPartyItemsQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      toast({ title: "Item added to party stash" });
      setAddItemOpen(false);
      setNewItem({ name: "", itemSlug: "", quantity: "1", notes: "" });
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" });
    }
  }

  async function handleRemoveItem(itemId: number, name: string) {
    if (!confirm(`Remove "${name}" from party stash?`)) return;
    try {
      await removeItemMutation.mutateAsync({ id, itemId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPartyItemsQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      toast({ title: "Item removed" });
    } catch {
      toast({ title: "Failed to remove item", variant: "destructive" });
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (transferItemId === null || !transferCharId) return;
    try {
      await transferMutation.mutateAsync({
        id,
        itemId: transferItemId,
        data: {
          direction: transferDirection,
          characterId: Number(transferCharId),
          quantity: Number(transferQty) || 1,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPartyItemsQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      toast({ title: "Item transferred" });
      setTransferOpen(false);
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Transfer failed", variant: "destructive" });
    }
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await depositMutation.mutateAsync({ id, data: parseCoins(depositCoins) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      toast({ title: "Coins deposited" });
      setDepositOpen(false);
      setDepositCoins(emptyCoins());
    } catch {
      toast({ title: "Deposit failed", variant: "destructive" });
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    try {
      await withdrawMutation.mutateAsync({ id, data: parseCoins(withdrawCoins) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      toast({ title: "Coins withdrawn" });
      setWithdrawOpen(false);
      setWithdrawCoins(emptyCoins());
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? "Insufficient funds";
      toast({ title: msg, variant: "destructive" });
    }
  }

  async function handleSplit() {
    if (!confirm("Split party pool evenly among all members?")) return;
    try {
      const result = await splitMutation.mutateAsync({ id, data: {} });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: getListLedgerEntriesQueryKey(id, { limit: 100, offset: 0 }) }),
      ]);
      const { perMember, remainder, memberCount } = result;
      const perStr = COIN_LABELS.filter(({ key }) => perMember[key] > 0)
        .map(({ key, label }) => `${perMember[key]} ${key}`)
        .join(", ") || "0";
      toast({ title: `Split complete! Each of ${memberCount} members gets: ${perStr}` });
    } catch {
      toast({ title: "Split failed", variant: "destructive" });
    }
  }

  async function handleRefreshCode() {
    if (!confirm("Refresh invite code? The old one will stop working.")) return;
    try {
      const { inviteCode } = await refreshCodeMutation.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      toast({ title: `New invite code: ${inviteCode}` });
    } catch {
      toast({ title: "Failed to refresh code", variant: "destructive" });
    }
  }

  async function handleDeleteCampaign() {
    if (!confirm(`Delete "${campaign?.name}"? This cannot be undone.`)) return;
    try {
      await deleteCampaignMutation.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      navigate("/campaigns");
    } catch {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!confirm(`Remove ${name || "this member"} from the campaign?`)) return;
    try {
      await removeMemberMutation.mutateAsync({ id, userId });
      await queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  }

  async function handleAttachCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!attachCharId) return;
    try {
      await attachCharacterMutation.mutateAsync({
        id,
        data: { characterId: Number(attachCharId) },
      });
      await queryClient.invalidateQueries({ queryKey: getListCampaignCharactersQueryKey(id) });
      toast({ title: "Character attached to campaign" });
      setAttachOpen(false);
      setAttachCharId("");
    } catch {
      toast({ title: "Failed to attach character", variant: "destructive" });
    }
  }

  async function handleDetachCharacter(characterId: number, name: string) {
    if (!confirm(`Remove "${name}" from this campaign?`)) return;
    try {
      await detachCharacterMutation.mutateAsync({ id, characterId });
      await queryClient.invalidateQueries({ queryKey: getListCampaignCharactersQueryKey(id) });
      toast({ title: "Character removed from campaign" });
    } catch {
      toast({ title: "Failed to remove character", variant: "destructive" });
    }
  }

  function copyInviteCode() {
    if (campaign) {
      navigator.clipboard.writeText(campaign.inviteCode);
      toast({ title: "Invite code copied!" });
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-muted-foreground">Loading campaign…</div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="p-8">
          <p className="text-muted-foreground">Campaign not found or you're not a member.</p>
          <Button className="mt-4" onClick={() => navigate("/campaigns")}>Back to Campaigns</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" className="-ml-2 mb-4 text-muted-foreground" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Campaigns
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif text-3xl font-bold">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-muted-foreground mt-1">{campaign.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-muted rounded-md px-3 py-2">
                <span className="text-xs text-muted-foreground mr-1">Invite:</span>
                <span className="font-mono font-bold text-sm" data-testid="invite-code">{campaign.inviteCode}</span>
                <button onClick={copyInviteCode} className="text-muted-foreground hover:text-foreground ml-1">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {isDm && (
                <Button variant="ghost" size="icon" onClick={handleRefreshCode} title="Refresh invite code">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              {isDm && (
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDeleteCampaign}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="party">
          <TabsList className="mb-6">
            <TabsTrigger value="party" className="gap-2">
              <Users className="w-4 h-4" /> Party
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <Clock className="w-4 h-4" /> Ledger
            </TabsTrigger>
          </TabsList>

          {/* ── Party Tab ── */}
          <TabsContent value="party">
            <div className="space-y-6">
              {/* DM-only: AI Session Recap */}
              {isDm && (
                <AIPanel
                  title="Session Recap"
                  description="Read this aloud at the start of your next session."
                  buttonLabel="Generate Recap"
                  icon={<Scroll className="h-4 w-4 text-amber-400" />}
                  testId="ai-session-recap"
                  inputs={[
                    { key: "sessionNotes", label: "Notes from last session (optional)", placeholder: "Bullet points, NPCs met, decisions made…", rows: 3 },
                  ]}
                  result={recapResult}
                  isPending={generateRecap.isPending}
                  error={recapError}
                  onGenerate={(values) =>
                    generateRecap.mutate({
                      id,
                      data: { sessionNotes: values.sessionNotes?.trim() || undefined },
                    })
                  }
                />
              )}

              {/* Members section */}
              <div>
                <h2 className="font-serif text-lg font-semibold mb-3">Members</h2>
                <div className="grid gap-3">
                  {campaign.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{member.name ?? "Unknown Player"}</p>
                          <Badge variant="outline" className="text-xs capitalize mt-0.5">{member.role}</Badge>
                        </div>
                      </div>
                      {isDm && member.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.userId, member.name ?? "")}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Party characters */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-lg font-semibold">Party Characters</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAttachCharId(""); setAttachOpen(true); }}
                    data-testid="button-attach-character"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Attach Character
                  </Button>
                </div>
                {!characters || characters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No characters attached yet. Click "Attach Character" to add one of yours.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {characters.map((char) => {
                      const derived = char as typeof char & {
                        proficiencyBonus?: number;
                        passivePerception?: number;
                        armorClass?: number;
                      };
                      return (
                        <Link key={char.id} href={`/characters/${char.id}`}>
                          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                            <CardContent className="pt-4 pb-3">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold">{char.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    Level {char.level} {char.race} {char.class}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">Lv.{char.level}</Badge>
                                  {(isDm || char.userId === user?.id) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDetachCharacter(char.id, char.name);
                                      }}
                                      data-testid={`button-detach-character-${char.id}`}
                                      title="Remove from campaign"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="bg-muted rounded p-1.5">
                                  <Heart className="w-3 h-3 mx-auto mb-0.5 text-red-400" />
                                  <span className="font-bold">{char.currentHp}/{char.maxHp}</span>
                                  <div className="text-muted-foreground">HP</div>
                                </div>
                                <div className="bg-muted rounded p-1.5">
                                  <Shield className="w-3 h-3 mx-auto mb-0.5 text-blue-400" />
                                  <span className="font-bold">{char.armorClass}</span>
                                  <div className="text-muted-foreground">AC</div>
                                </div>
                                <div className="bg-muted rounded p-1.5">
                                  <Eye className="w-3 h-3 mx-auto mb-0.5 text-green-400" />
                                  <span className="font-bold">{derived.passivePerception ?? "—"}</span>
                                  <div className="text-muted-foreground">Perc.</div>
                                </div>
                              </div>
                              {Array.isArray(char.conditions) && char.conditions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(char.conditions as string[]).map((c) => (
                                    <Badge key={c} variant="destructive" className="text-xs">{c}</Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Inventory Tab ── */}
          <TabsContent value="inventory">
            <div className="space-y-6">
              {/* AI Ledger Assistant (any member) */}
              <AIPanel
                title="Ledger Assistant"
                description="Ask the party treasurer for thoughts on the stash."
                buttonLabel="Ask the Treasurer"
                icon={<Wand2 className="h-4 w-4 text-amber-400" />}
                testId="ai-ledger-advice"
                inputs={[
                  { key: "question", label: "Question (optional)", placeholder: "Should we sell the +1 longsword? How do we split this haul?", rows: 2 },
                ]}
                result={ledgerAdviceResult}
                isPending={generateLedgerAdvice.isPending}
                error={ledgerAdviceError}
                onGenerate={(values) =>
                  generateLedgerAdvice.mutate({
                    id,
                    data: { question: values.question?.trim() || undefined },
                  })
                }
              />

              {/* Party Currency Pool */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Party Treasury
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDepositOpen(true)} data-testid="button-deposit">
                        + Deposit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setWithdrawOpen(true)} data-testid="button-withdraw">
                        − Withdraw
                      </Button>
                      {isDm && (
                        <Button size="sm" variant="outline" onClick={handleSplit} data-testid="button-split-coins">
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                          Split
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    {COIN_LABELS.map(({ key, label, color }) => (
                      <div key={key} className="text-center">
                        <div className={cn("text-2xl font-bold", color)}>{campaign[key]}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Party Stash */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-lg font-semibold">Party Stash</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search items…"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-48 h-8 text-sm"
                    />
                    <Button size="sm" onClick={() => setAddItemOpen(true)} data-testid="button-add-party-item">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {partyItems && partyItems.length > 0 ? "No items match your search." : "Party stash is empty."}
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.name}</span>
                            <Badge variant="outline" className="text-xs">×{item.quantity}</Badge>
                            {item.claimedByCharacterId && (
                              <Badge variant="secondary" className="text-xs">Claimed</Badge>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground h-7 px-2"
                            onClick={() => {
                              setTransferItemId(item.id);
                              setTransferDirection("to_character");
                              setTransferCharId("");
                              setTransferQty("1");
                              setTransferOpen(true);
                            }}
                            data-testid={`button-transfer-${item.id}`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7 px-2"
                            onClick={() => handleRemoveItem(item.id, item.name)}
                            data-testid={`button-remove-item-${item.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Ledger Tab ── */}
          <TabsContent value="ledger">
            <div>
              <h2 className="font-serif text-lg font-semibold mb-3">Transaction History</h2>
              {!ledger || ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {ledger.map((entry) => {
                    const currencyDelta = COIN_LABELS
                      .map(({ key }) => {
                        const delta = entry[`${key}Delta` as keyof typeof entry] as number;
                        return delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} ${key}` : null;
                      })
                      .filter(Boolean)
                      .join(", ");

                    const typeLabel: Record<string, string> = {
                      add_item: "Item Added",
                      remove_item: "Item Removed",
                      transfer_to_character: "Transfer → Character",
                      transfer_to_party: "Transfer → Party",
                      currency_deposit: "Currency Deposit",
                      currency_withdrawal: "Currency Withdrawal",
                      coin_split: "Coin Split",
                    };

                    return (
                      <div key={entry.id} className="px-4 py-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{typeLabel[entry.type] ?? entry.type}</span>
                              {entry.itemName && (
                                <Badge variant="outline" className="text-xs">{entry.itemName}{entry.itemQuantity && entry.itemQuantity > 1 ? ` ×${entry.itemQuantity}` : ""}</Badge>
                              )}
                              {currencyDelta && (
                                <span className="text-xs text-muted-foreground">{currencyDelta}</span>
                              )}
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                            )}
                          </div>
                          <time className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Party Stash</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                data-testid="input-party-item-name"
                placeholder="e.g. Healing Potion"
                value={newItem.name}
                onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                className="mt-1.5"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Item Slug (optional)</Label>
                <Input
                  placeholder="e.g. healing-potion"
                  value={newItem.itemSlug}
                  onChange={(e) => setNewItem((p) => ({ ...p, itemSlug: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newItem.notes}
                onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addItemMutation.isPending || !newItem.name.trim()} data-testid="button-confirm-add-item">
                {addItemMutation.isPending ? "Adding…" : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <Label>Direction</Label>
              <Select value={transferDirection} onValueChange={(v) => setTransferDirection(v as "to_character" | "to_party")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_character">Party Stash → Character</SelectItem>
                  <SelectItem value="to_party">Character → Party Stash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Character</Label>
              <Select value={transferCharId} onValueChange={setTransferCharId}>
                <SelectTrigger className="mt-1.5" data-testid="select-transfer-character">
                  <SelectValue placeholder="Select character…" />
                </SelectTrigger>
                <SelectContent>
                  {(characters ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={transferMutation.isPending || !transferCharId} data-testid="button-confirm-transfer">
                {transferMutation.isPending ? "Transferring…" : "Transfer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit Currency</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <CurrencyRow value={depositCoins} onChange={(k, v) => setDepositCoins((p) => ({ ...p, [k]: v }))} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={depositMutation.isPending} data-testid="button-confirm-deposit">
                {depositMutation.isPending ? "Depositing…" : "Deposit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attach Character Dialog */}
      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Character to Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAttachCharacter} className="space-y-4">
            {(() => {
              const attached = new Set((characters ?? []).map((c) => c.id));
              const available = (myCharacters ?? []).filter((c) => !attached.has(c.id));
              if (available.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    All your characters are already attached, or you haven't created any yet.
                  </p>
                );
              }
              return (
                <div>
                  <Label>Character</Label>
                  <Select value={attachCharId} onValueChange={setAttachCharId}>
                    <SelectTrigger className="mt-1.5" data-testid="select-attach-character">
                      <SelectValue placeholder="Select a character…" />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} — Lv.{c.level} {c.race} {c.class}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAttachOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={attachCharacterMutation.isPending || !attachCharId}
                data-testid="button-confirm-attach-character"
              >
                {attachCharacterMutation.isPending ? "Attaching…" : "Attach"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Currency</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <CurrencyRow value={withdrawCoins} onChange={(k, v) => setWithdrawCoins((p) => ({ ...p, [k]: v }))} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={withdrawMutation.isPending} data-testid="button-confirm-withdraw">
                {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
