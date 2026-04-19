import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Shield, ArrowLeft, Clock, Sparkles, Award, Flag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetPublicProfile,
  useBlockUser,
  useCreateReport,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface Props { userId: string; }

const EXP_LABEL: Record<string, string> = {
  new: "New to D&D",
  casual: "Casual player",
  experienced: "Experienced",
  veteran: "Veteran",
};

export default function ProfilePage({ userId }: Props) {
  const { isSignedIn, user } = useUser();
  const { toast } = useToast();
  const { data: profile, isLoading, error } = useGetPublicProfile(userId);
  const blockUser = useBlockUser();
  const createReport = useCreateReport();

  function onBlock() {
    if (!isSignedIn) { toast({ title: "Sign in to block users", variant: "destructive" }); return; }
    if (!confirm("Block this user? They'll be hidden from your campaign discovery.")) return;
    blockUser.mutate({ userId }, {
      onSuccess: () => toast({ title: "User blocked" }),
      onError: () => toast({ title: "Could not block user", variant: "destructive" }),
    });
  }

  function onReport() {
    if (!isSignedIn) { toast({ title: "Sign in to report users", variant: "destructive" }); return; }
    const reason = window.prompt("Reason for report?");
    if (!reason) return;
    const details = window.prompt("Any additional details? (optional)") ?? "";
    createReport.mutate(
      { data: { targetType: "user", targetId: userId, reason, details } },
      {
        onSuccess: () => toast({ title: "Report submitted. Thank you." }),
        onError: () => toast({ title: "Could not submit report", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-8 py-4 flex items-center justify-between bg-card">
        <Link href={isSignedIn ? "/characters" : "/discover"} className="flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-serif font-bold text-xl">DDnD</span>
        </Link>
        <Link href="/discover">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />Back to Discover</Button>
        </Link>
      </header>

      <main className="flex-1 p-8 max-w-2xl w-full mx-auto">
        {isLoading ? (
          <div className="text-muted-foreground">Loading profile...</div>
        ) : error || !profile ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="font-serif text-lg mb-1">Profile not found</p>
              <p className="text-muted-foreground text-sm">This user has no public profile or doesn't exist.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name ?? ""} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-serif text-xl text-primary">
                      {(profile.name ?? "A").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle className="font-serif text-2xl">{profile.name ?? "Anonymous Adventurer"}</CardTitle>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="gap-1">
                      <Award className="w-3 h-3" />{EXP_LABEL[profile.experienceLevel] ?? profile.experienceLevel}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />{profile.timezone}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.bio && (
                <section>
                  <h3 className="font-serif text-sm font-bold mb-1.5 text-muted-foreground">About</h3>
                  <p className="text-sm whitespace-pre-line">{profile.bio}</p>
                </section>
              )}
              {profile.playstyleTags.length > 0 && (
                <section>
                  <h3 className="font-serif text-sm font-bold mb-1.5 text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Playstyle
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.playstyleTags.map((t) => <Badge key={t}>{t}</Badge>)}
                  </div>
                </section>
              )}
              {profile.availability && (
                <section>
                  <h3 className="font-serif text-sm font-bold mb-1.5 text-muted-foreground">Availability</h3>
                  <p className="text-sm whitespace-pre-line">{profile.availability}</p>
                </section>
              )}

              {isSignedIn && user?.id !== profile.id && (
                <div className="border-t border-border pt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={onBlock} data-testid="button-block-user">
                    <Ban className="w-3.5 h-3.5 mr-1.5" />Block
                  </Button>
                  <Button variant="outline" size="sm" onClick={onReport} data-testid="button-report-user">
                    <Flag className="w-3.5 h-3.5 mr-1.5" />Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
