import React from 'react';
import { Shield, BookOpen, Users, Search } from 'lucide-react';

export function Quill() {
  return (
    <div className="min-h-screen bg-[#0a0806] text-[#e8dcc7] font-['Cormorant_Garamond',serif] selection:bg-[#8b1c1c] selection:text-[#f4ead5] relative">
      {/* Noise overlay */}
      <div 
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden border-b border-[#2a241b]">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/quill-hero.png" 
            alt="Dimly lit tavern table with d20s and parchment" 
            className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0806] via-[#0a0806]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0806]/80 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center mt-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12 opacity-80 hover:opacity-100 transition-opacity">
            <Shield className="w-6 h-6 text-[#8b1c1c]" />
            <span className="text-xl tracking-widest uppercase font-semibold">DDnD</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1] text-[#f4ead5] drop-shadow-lg">
            Chronicle Your <br />
            <span className="text-[#8b1c1c] italic font-medium">Legend</span>
          </h1>
          
          <p className="text-lg md:text-2xl mb-12 max-w-2xl text-[#c4b69d] font-light leading-relaxed">
            A sanctuary for dungeon masters and players. Manage campaigns, forge heroes, and consult the ancient tomes of the SRD.
          </p>

          <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <button 
              onClick={() => { /* graduation will hook Clerk here */ }}
              className="w-full flex items-center justify-center gap-3 bg-[#f4ead5] hover:bg-white text-[#0a0806] rounded-full py-4 px-8 font-sans font-medium text-base transition-all transform hover:scale-[1.02] shadow-lg shadow-[#0a0806]/50"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <a href="/sign-in" className="text-sm text-[#8a7b62] hover:text-[#c4b69d] transition-colors font-sans underline underline-offset-4 decoration-[#8a7b62]/30 hover:decoration-[#c4b69d]">
              or sign in with email
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col md:flex-row items-start gap-6 group">
            <div className="p-4 rounded-full border border-[#2a241b] bg-[#12100d] text-[#c4b69d] group-hover:text-[#8b1c1c] group-hover:border-[#8b1c1c]/50 transition-colors">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2 text-[#f4ead5]">Heroes & Legends</h3>
              <p className="text-lg text-[#8a7b62] font-light max-w-2xl">
                Draft characters with precision. Track hit points, spell slots, and inventory in a beautifully wrought digital sheet that gets out of your way.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6 group">
            <div className="p-4 rounded-full border border-[#2a241b] bg-[#12100d] text-[#c4b69d] group-hover:text-[#8b1c1c] group-hover:border-[#8b1c1c]/50 transition-colors">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2 text-[#f4ead5]">Campaigns & Discovery</h3>
              <p className="text-lg text-[#8a7b62] font-light max-w-2xl">
                Weave your narrative threads. Manage party members, distribute loot, and find new companions seeking adventure at your virtual table.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6 group">
            <div className="p-4 rounded-full border border-[#2a241b] bg-[#12100d] text-[#c4b69d] group-hover:text-[#8b1c1c] group-hover:border-[#8b1c1c]/50 transition-colors">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-2 text-[#f4ead5]">The SRD Compendium</h3>
              <p className="text-lg text-[#8a7b62] font-light max-w-2xl">
                A searchable, cross-referenced grimoire of spells, items, and monsters. Knowledge is power, readily available when you need it most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2a241b] text-center px-6">
        <p className="text-xs text-[#5c5241] font-sans tracking-wide">
          DDnD — Not affiliated with Wizards of the Coast. Built on the SRD 5.1.
        </p>
      </footer>
    </div>
  );
}
