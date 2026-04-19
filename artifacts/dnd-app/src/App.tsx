import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@clerk/react";
import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import Characters from "@/pages/characters";
import CharacterNew from "@/pages/character-new";
import CharacterSheet from "@/pages/character-sheet";
import CharacterLevelUp from "@/pages/character-level-up";
import SpellsPage from "@/pages/spells";
import ItemsPage from "@/pages/items";
import AccountPage from "@/pages/account";
import DiscoverPage from "@/pages/discover";
import ProfilePage from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/** Keeps the API client's auth token getter in sync with the Clerk session. */
function ClerkTokenSync() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => setAuthTokenGetter(null);
  }, [isSignedIn, getToken]);
  return null;
}

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
      <Route path="/sign-in">
        {isLoaded && isSignedIn ? <Redirect to="/characters" /> : <SignInPage />}
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
      <Route path="/discover">
        <DiscoverPage />
      </Route>
      <Route path="/profile/:userId">
        {(params) => <ProfilePage userId={String(params.userId)} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClerkTokenSync />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
