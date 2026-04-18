import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { Users, BookOpen, Package, Settings, Shield, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Swords },
  { href: "/spells", label: "Spells", icon: BookOpen },
  { href: "/items", label: "Items", icon: Package },
  { href: "/account", label: "Account", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-sidebar-border">
          <Link href="/characters" className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold text-xl tracking-wide text-sidebar-foreground">DDnD</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5" data-testid="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-sidebar-foreground/70 truncate">My Account</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
