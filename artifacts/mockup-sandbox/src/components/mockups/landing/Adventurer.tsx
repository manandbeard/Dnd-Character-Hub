import React from "react";
import { Shield, Users, BookOpen, Map, Sparkles, ShieldAlert, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.01 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

const StatBlock = ({ label, value, modifier }: { label: string; value: number; modifier: string }) => (
  <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-sm">
    <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{label}</span>
    <span className="text-xl font-bold text-slate-900 mt-1">{value}</span>
    <div className="mt-1 px-2 py-0.5 bg-white rounded-full border border-slate-200 text-xs font-medium text-slate-700">
      {modifier}
    </div>
  </div>
);

export function Adventurer() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Subtle modern gradient background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/80 via-white to-transparent" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-100/40 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">DDnD</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/sign-in" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </a>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex-1 flex flex-col justify-center pt-12 pb-24 lg:pt-20 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>The modern tabletop companion</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
                Run your campaigns <br className="hidden lg:block" />
                <span className="text-indigo-600">without the chaos.</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 leading-relaxed mb-10 max-w-lg">
                The fastest way to build characters, track party inventory, and manage your D&D 5e campaigns. Less paperwork, more playing.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button 
                  onClick={() => { /* graduation will hook Clerk here */ }}
                  className="h-12 px-6 w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 shadow-sm hover:shadow text-base font-semibold transition-all"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
                <div className="flex flex-col justify-center h-12">
                  <span className="text-sm text-slate-500">
                    or <a href="/sign-in" className="text-indigo-600 font-medium hover:underline">sign in with email</a>
                  </span>
                </div>
              </div>

              <div className="mt-10 flex items-center gap-3 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white" />
                  <div className="w-7 h-7 rounded-full bg-slate-300 border-2 border-white" />
                  <div className="w-7 h-7 rounded-full bg-slate-400 border-2 border-white" />
                </div>
                <p>Trusted by <span className="font-semibold text-slate-700">1,200+</span> tables worldwide.</p>
              </div>
            </div>

            {/* Right Column: Stylized Mockup */}
            <div className="relative lg:ml-auto w-full max-w-[540px]">
              {/* Decorative background elements for the mockup */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-transparent rounded-3xl transform translate-x-4 translate-y-4 -z-10 blur-xl opacity-60" />
              <div className="absolute inset-0 border border-slate-200/50 rounded-2xl transform translate-x-3 translate-y-3 -z-10 bg-white" />
              
              {/* The actual UI Mockup */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Aelar Vael</h3>
                    <p className="text-sm text-slate-400 font-medium">Level 5 · Wood Elf · Ranger</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-300" />
                  </div>
                </div>

                {/* Main content */}
                <div className="p-6 bg-slate-50/50">
                  {/* Top stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <ShieldAlert className="w-5 h-5 text-indigo-600 mb-1" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Armor Class</span>
                      <span className="text-2xl font-bold text-slate-900">16</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <Heart className="w-5 h-5 text-emerald-500 mb-1 fill-emerald-500" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hit Points</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">44</span>
                        <span className="text-sm text-slate-500 font-medium">/ 44</span>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <Zap className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Initiative</span>
                      <span className="text-2xl font-bold text-slate-900">+4</span>
                    </div>
                  </div>

                  {/* Ability Scores */}
                  <div className="grid grid-cols-6 gap-2 mb-6">
                    <StatBlock label="Str" value={10} modifier="+0" />
                    <StatBlock label="Dex" value={18} modifier="+4" />
                    <StatBlock label="Con" value={14} modifier="+2" />
                    <StatBlock label="Int" value={12} modifier="+1" />
                    <StatBlock label="Wis" value={16} modifier="+3" />
                    <StatBlock label="Cha" value={8} modifier="-1" />
                  </div>

                  {/* Weapons / Attacks */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <h4 className="font-semibold text-slate-800 text-sm">Attacks & Spellcasting</h4>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-default">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">🏹</div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">Longbow</p>
                            <p className="text-xs text-slate-500">150/600 ft</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-indigo-600">+7 <span className="text-slate-400 font-normal text-xs ml-1">to hit</span></p>
                          <p className="text-xs font-medium text-slate-600">1d8+4 <span className="text-slate-400">Piercing</span></p>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-default">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">⚔️</div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">Shortsword</p>
                            <p className="text-xs text-slate-500">Finesse, light</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-indigo-600">+7 <span className="text-slate-400 font-normal text-xs ml-1">to hit</span></p>
                          <p className="text-xs font-medium text-slate-600">1d6+4 <span className="text-slate-400">Piercing</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features */}
        <section className="py-20 border-t border-slate-200">
          <div className="grid md:grid-cols-3 gap-12 lg:gap-8">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Digital Character Sheets</h3>
              <p className="text-slate-600 leading-relaxed">
                Build characters in minutes with guided creation. Track HP, spell slots, and inventory in real-time during your sessions.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                <Map className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Campaign Management</h3>
              <p className="text-slate-600 leading-relaxed">
                DMs can oversee the entire party. Share a unified ledger for party gold, distribute items, and manage encounter tracking.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Integrated SRD Compendium</h3>
              <p className="text-slate-600 leading-relaxed">
                Instant access to spells, items, rules, and monsters. Search the full SRD 5.1 database without leaving your character sheet.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-slate-200 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-slate-400">
            DDnD — Not affiliated with Wizards of the Coast. Built on the SRD 5.1.
          </p>
        </footer>
      </div>
    </div>
  );
}
