import { SignIn } from "@clerk/react";
import { Shield, Sword, ScrollText } from "lucide-react";

const FEATURES = [
  { icon: Shield, title: "Full Character Sheets", description: "Track every stat, skill, spell slot, and inventory item across all your characters." },
  { icon: Sword, title: "Guided Level-Up", description: "Step through level-up with HP rolls, ability score improvements, and new features." },
  { icon: ScrollText, title: "SRD Compendium", description: "Browse the full SRD spell and item catalog. Filter by class, school, level, and more." },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="font-serif text-5xl font-bold tracking-wide">DDnD</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-lg mb-12">
          The character builder and companion for players who obsess over every modifier, every gold piece, every spell slot.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-16">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-card border border-border rounded-lg p-5 text-left">
              <Icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-serif font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        {/* Clerk SignIn */}
        <div className="w-full max-w-sm">
          <SignIn routing="hash" />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        DDnD — D&amp;D 5e Character Builder. Not affiliated with Wizards of the Coast.
      </footer>
    </div>
  );
}
