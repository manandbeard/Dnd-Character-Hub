import { useSignIn } from "@clerk/react";
import { Link } from "wouter";
import { Shield, Swords, Map, ScrollText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { signIn, isLoaded } = useSignIn();

  const handleGoogle = () => {
    if (!isLoaded || !signIn) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    void signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: `${base}/sso-callback`,
      redirectUrlComplete: `${base}/characters`,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#110e1b] text-slate-200 overflow-hidden font-sans">
      {/* LEFT HALF: Sign-in card */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 relative z-10">
        {/* Logo */}
        <div className="w-full max-w-sm mb-12 flex items-center justify-center md:justify-start gap-3">
          <div className="bg-purple-600/20 p-2 rounded-xl border border-purple-500/30">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-purple-300 to-teal-400 bg-clip-text text-transparent">
            DDnD
          </h1>
        </div>

        {/* Sign in card */}
        <div className="w-full max-w-sm bg-[#1a1625] rounded-3xl p-8 border border-white/5 shadow-2xl shadow-purple-900/20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-3xl pointer-events-none" />

          <h2 className="text-2xl font-bold mb-2 text-white text-center md:text-left">Begin Your Quest</h2>
          <p className="text-sm text-slate-400 mb-6 text-center md:text-left">
            Sign in to forge characters and join campaigns.
          </p>

          <Button
            onClick={handleGoogle}
            disabled={!isLoaded}
            data-testid="button-google-signin"
            className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-base shadow-sm flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center">
            <Link
              href="/sign-in"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              data-testid="link-email-signin"
            >
              or sign in with email
            </Link>
          </div>
        </div>

        {/* Feature trio */}
        <div className="w-full max-w-sm mt-12 grid gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 mt-1">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">Character Forge</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Build & manage heroes with automated rules, leveling, and inventory tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 mt-1">
              <Map className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">Campaigns & Discovery</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Find tables seeking players or organize your own epic long-running campaigns.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mt-1">
              <ScrollText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">SRD Compendium</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Instant access to 5e spells, items, monsters, and rules to keep the game moving.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-sm mt-auto pt-12 flex items-center gap-2 justify-center md:justify-start">
          <Swords className="w-3 h-3 text-slate-700" />
          <p className="text-xs text-slate-600 text-center md:text-left">
            DDnD — Not affiliated with Wizards of the Coast. Built on the SRD 5.1.
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Animated obsidian d20 hero */}
      <div className="w-full md:w-1/2 relative bg-[#0a0812] flex items-center justify-center overflow-hidden min-h-[50vh] md:min-h-screen">
        {/* Atmospheric backdrop */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={`${import.meta.env.BASE_URL}images/tavern-hero.png`}
            alt=""
            aria-hidden
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#110e1b] via-transparent to-transparent md:block hidden" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#110e1b] via-transparent to-transparent md:hidden block" />
        </div>

        {/* Molten halo */}
        <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
          <div
            className="w-[60%] aspect-square rounded-full blur-3xl animate-landing-pulse"
            style={{ background: "radial-gradient(circle, rgba(255,90,30,0.35) 0%, rgba(168,85,247,0.18) 40%, transparent 70%)" }}
          />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes landing-spin-tilt {
            0%   { transform: rotate3d(1, 1.2, 0.4, 0deg); }
            100% { transform: rotate3d(1, 1.2, 0.4, 360deg); }
          }
          @keyframes landing-bob {
            0%, 100% { transform: translateY(0px); }
            50%      { transform: translateY(-14px); }
          }
          @keyframes landing-pulse {
            0%, 100% { opacity: 0.55; }
            50%      { opacity: 1; }
          }
          .animate-landing-spin { animation: landing-spin-tilt 14s linear infinite; transform-style: preserve-3d; }
          .animate-landing-bob  { animation: landing-bob 6s ease-in-out infinite; }
          .animate-landing-pulse { animation: landing-pulse 4s ease-in-out infinite; }
        `}} />

        {/* Spinning obsidian d20 */}
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="animate-landing-bob" style={{ perspective: "1200px" }}>
            <img
              src={`${import.meta.env.BASE_URL}images/obsidian-d20.png`}
              alt="Obsidian d20"
              className="w-[60%] max-w-[420px] mx-auto animate-landing-spin"
              style={{
                mixBlendMode: "screen",
                filter: "drop-shadow(0 0 35px rgba(255,90,30,0.45)) drop-shadow(0 25px 45px rgba(255,80,20,0.25))",
              }}
            />
          </div>
        </div>

        {/* Headline pinned to bottom of right pane */}
        <div className="relative z-20 px-8 pb-16 mt-auto self-end text-center max-w-lg">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
            Your Table,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-teal-300">
              Levelled Up.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium drop-shadow-lg max-w-md mx-auto">
            The ultimate digital character sheet, campaign manager, and rulebook for 5th Edition D&amp;D. Less bookkeeping, more adventuring.
          </p>
        </div>
      </div>
    </div>
  );
}
