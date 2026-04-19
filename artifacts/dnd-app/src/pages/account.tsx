import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

type ExpLevel = "new" | "casual" | "experienced" | "veteran";

interface AccountForm {
  name: string;
  bio: string;
  experienceLevel: ExpLevel;
  availability: string;
  timezone: string;
  isPublic: boolean;
}

const SUGGESTED_TAGS = [
  "Roleplay-heavy", "Tactical", "Rules-light", "Story-driven",
  "Combat-focused", "Sandbox", "Comedy", "Horror", "Pathfinder-ready",
  "New player friendly", "Theater of the mind", "Battle maps",
];

export default function AccountPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const me = useGetMe();
  const updateMe = useUpdateMe();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<AccountForm>({
    defaultValues: {
      name: "", bio: "", experienceLevel: "casual",
      availability: "", timezone: "UTC", isPublic: true,
    },
  });

  useEffect(() => {
    if (me.data) {
      form.reset({
        name: me.data.name ?? "",
        bio: me.data.bio ?? "",
        experienceLevel: (me.data.experienceLevel ?? "casual") as ExpLevel,
        availability: me.data.availability ?? "",
        timezone: me.data.timezone ?? "UTC",
        isPublic: me.data.isPublic ?? true,
      });
      setTags(me.data.playstyleTags ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data]);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function onSubmit(values: AccountForm) {
    updateMe.mutate(
      { data: { ...values, playstyleTags: tags } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Profile saved" });
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="font-serif text-2xl font-bold mb-6">Account & Profile</h1>

        {me.isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identity</CardTitle>
                <CardDescription>Your display name and email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" data-testid="input-name" {...form.register("name")} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={me.data?.email ?? ""} disabled data-testid="text-email" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
                <CardDescription>What other adventurers see on the discovery page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
                  <div>
                    <Label htmlFor="isPublic" className="text-sm">Discoverable</Label>
                    <p className="text-xs text-muted-foreground">Allow your profile to appear in player searches and DM views.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <Switch
                        id="isPublic"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-public"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" data-testid="input-bio" rows={4}
                    {...form.register("bio")}
                    placeholder="Tell other players about yourself, your favorite settings, character archetypes..." />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Experience Level</Label>
                    <Controller
                      control={form.control}
                      name="experienceLevel"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-experience"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New to D&D</SelectItem>
                            <SelectItem value="casual">Casual player</SelectItem>
                            <SelectItem value="experienced">Experienced</SelectItem>
                            <SelectItem value="veteran">Veteran</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Input id="timezone" data-testid="input-timezone"
                      {...form.register("timezone")} placeholder="America/New_York" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="availability">Availability</Label>
                  <Textarea id="availability" rows={2} data-testid="input-availability"
                    {...form.register("availability")}
                    placeholder="Weeknights after 7pm ET, alternate Saturdays..." />
                </div>

                <div className="space-y-1.5">
                  <Label>Playstyle Tags</Label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <Badge key={t} variant="default" className="gap-1">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                      placeholder="Add a tag and press Enter..."
                      data-testid="input-tag"
                    />
                    <Button type="button" variant="outline" onClick={() => addTag(tagInput)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addTag(t)}
                        className="text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground hover:bg-muted"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" disabled={updateMe.isPending} data-testid="button-save-account">
              {updateMe.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
