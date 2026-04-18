import { useState } from "react";
import { Link, useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useListCampaigns,
  useJoinCampaign,
  getListCampaignsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Swords, Users, Coins, LogIn } from "lucide-react";

const COIN_LABELS = ["pp", "gp", "ep", "sp", "cp"] as const;

function currencySummary(c: { pp: number; gp: number; ep: number; sp: number; cp: number }) {
  const parts = COIN_LABELS.filter((k) => c[k] > 0).map((k) => `${c[k]} ${k}`);
  return parts.length > 0 ? parts.join(", ") : "Empty";
}

export default function CampaignsPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useListCampaigns();
  const joinMutation = useJoinCampaign();

  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      const campaign = await joinMutation.mutateAsync({ data: { inviteCode: inviteCode.trim() } });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      toast({ title: `Joined "${campaign.name}"!` });
      setJoinOpen(false);
      setInviteCode("");
      navigate(`/campaigns/${campaign.id}`);
    } catch {
      toast({ title: "Invalid invite code", variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Your adventures and party ledgers</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setJoinOpen(true)} data-testid="button-join-campaign">
              <LogIn className="w-4 h-4 mr-2" />
              Join with Code
            </Button>
            <Button asChild data-testid="button-create-campaign">
              <Link href="/campaigns/new">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </div>
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="text-muted-foreground">Loading campaigns…</div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Swords className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No campaigns yet</p>
            <p className="text-sm">Create one or join with an invite code.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="font-serif text-xl">{c.name}</CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">{c.inviteCode}</Badge>
                    </div>
                    {c.description && (
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        {currencySummary(c)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                data-testid="input-invite-code"
                placeholder="e.g. A3F9C1B2"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="font-mono mt-1.5"
                maxLength={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setJoinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={joinMutation.isPending || !inviteCode.trim()} data-testid="button-confirm-join">
                {joinMutation.isPending ? "Joining…" : "Join Campaign"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
