import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@clerk/react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Characters from "@/pages/characters";
import CharacterNew from "@/pages/character-new";
import CharacterSheet from "@/pages/character-sheet";
import CharacterLevelUp from "@/pages/character-level-up";
import SpellsPage from "@/pages/spells";
import ItemsPage from "@/pages/items";
import AccountPage from "@/pages/account";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading...</div></div>;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {isLoaded && isSignedIn ? <Redirect to="/characters" /> : <Landing />}
      </Route>
      <Route path="/characters">
        <AuthGuard><Characters /></AuthGuard>
      </Route>
      <Route path="/characters/new">
        <AuthGuard><CharacterNew /></AuthGuard>
      </Route>
      <Route path="/characters/:id/level-up">
        {(params) => <AuthGuard><CharacterLevelUp id={Number(params.id)} /></AuthGuard>}
      </Route>
      <Route path="/characters/:id">
        {(params) => <AuthGuard><CharacterSheet id={Number(params.id)} /></AuthGuard>}
      </Route>
      <Route path="/spells">
        <AuthGuard><SpellsPage /></AuthGuard>
      </Route>
      <Route path="/items">
        <AuthGuard><ItemsPage /></AuthGuard>
      </Route>
      <Route path="/account">
        <AuthGuard><AccountPage /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
