import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, ScrollText, Map, Users } from "lucide-react";
import { Dice3D } from "../../Dice3D";

const goToRealSignIn = () => {
  const top = window.top ?? window;
  top.location.href = "/sign-in";
};

export function Tavern() {
  return (
    <div className="min-h-screen w-full flex flex-col-reverse md:flex-row bg-[#110e1b] text-slate-200 overflow-hidden font-sans">
      {/* LEFT HALF: Sign-in Card */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 relative z-10">
        
        {/* Logo / Header */}
        <div className="w-full max-w-sm mb-12 flex items-center justify-center md:justify-start gap-3">
          <div className="bg-purple-600/20 p-2 rounded-xl border border-purple-500/30">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-purple-300 to-teal-400 bg-clip-text text-transparent">
            DDnD
          </h1>
        </div>

        {/* Sign In Card */}
        <div className="w-full max-w-sm bg-[#1a1625] rounded-3xl p-8 border border-white/5 shadow-2xl shadow-purple-900/20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-3xl pointer-events-none" />
          
          <h2 className="text-2xl font-bold mb-6 text-white text-center md:text-left">Begin Your Quest</h2>

          <Button 
            className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-base mb-6 shadow-sm flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
            onClick={goToRealSignIn}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1625] px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-400">Email address</Label>
              <Input 
                id="email" 
                placeholder="adventurer@party.com" 
                type="email" 
                className="h-12 bg-black/20 border-white/10 focus-visible:ring-purple-500 rounded-xl"
              />
            </div>
            <Button 
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-900/50"
            >
              Continue with Email
            </Button>
          </div>
          
          <div className="mt-6 text-center">
             <a href="/sign-in" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
               Use email link instead
             </a>
          </div>
        </div>

        {/* Features trio */}
        <div className="w-full max-w-sm mt-12 grid gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-teal-500/10 p-3 rounded-lg border border-teal-500/20 mt-1">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">Character Forge</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Build & manage heroes with automated rules, leveling, and inventory tracking.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 mt-1">
              <Map className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">Campaigns & Discovery</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Find tables seeking players or organize your own epic long-running campaigns.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 mt-1">
              <ScrollText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-200">SRD Compendium</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Instant access to 5e spells, items, monsters, and rules to keep the game moving.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-sm mt-auto pt-12">
          <p className="text-xs text-slate-600 text-center md:text-left">
            DDnD — Not affiliated with Wizards of the Coast. Built on the SRD 5.1.
          </p>
        </div>

      </div>

      {/* RIGHT HALF: Live 3D Hero */}
      <div className="w-full md:w-1/2 relative bg-[#0a0812] flex items-center justify-center overflow-hidden min-h-[50vh] md:min-h-screen">

        {/* Misty backdrop wash */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(40,20,60,0.55) 0%, rgba(10,8,18,0.95) 70%), linear-gradient(180deg, #0a0812 0%, #07050d 100%)",
          }}
        />

        {/* Radial molten halo behind the die */}
        <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
          <div
            className="w-[65%] aspect-square rounded-full blur-3xl animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(255,90,30,0.35) 0%, rgba(168,85,247,0.18) 40%, transparent 70%)" }}
          />
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.55; }
            50%      { opacity: 1; }
          }
          .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        `}} />

        {/* Live 3D D20 */}
        <div className="absolute inset-0 z-10">
          <Dice3D />
        </div>

        {/* Overlay Content — pinned to bottom so it doesn't fight the die */}
        <div className="relative z-20 px-8 pb-16 mt-auto self-end text-center max-w-lg">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
            Your Table,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-teal-300">
              Levelled Up.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium drop-shadow-lg max-w-md mx-auto">
            The ultimate digital character sheet, campaign manager, and rulebook for 5th Edition D&D. Less bookkeeping, more adventuring.
          </p>
        </div>

      </div>
    </div>
  );
}
