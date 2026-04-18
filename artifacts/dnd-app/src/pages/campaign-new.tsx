import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateCampaign, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Swords } from "lucide-react";

export default function CampaignNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createMutation = useCreateCampaign();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const campaign = await createMutation.mutateAsync({
        data: { name: name.trim(), description: description.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
      toast({ title: `Campaign "${campaign.name}" created!` });
      navigate(`/campaigns/${campaign.id}`);
    } catch {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-lg mx-auto">
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-muted-foreground"
          onClick={() => navigate("/campaigns")}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Campaigns
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <CardTitle className="font-serif text-2xl">New Campaign</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll become the DM. Share the invite code with your party.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  data-testid="input-campaign-name"
                  placeholder="e.g. The Lost Mines of Phandelver"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  data-testid="input-campaign-description"
                  placeholder="A short description of your campaign…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/campaigns")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !name.trim()}
                  data-testid="button-create-campaign-submit"
                >
                  {createMutation.isPending ? "Creating…" : "Create Campaign"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
