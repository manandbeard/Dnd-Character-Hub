import { Link } from "wouter";
import { Plus, Sword, Shield, Star } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListCharacters, getListCharactersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteCharacter } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Characters() {
  const { data: characters, isLoading } = useListCharacters();
  const deleteCharacter = useDeleteCharacter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    deleteCharacter.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCharactersQueryKey() });
          toast({ title: `${name} deleted` });
        },
        onError: () => {
          toast({ title: "Failed to delete character", variant: "destructive" });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">Characters</h1>
            <p className="text-muted-foreground text-sm mt-1">Your adventurers</p>
          </div>
          <Link href="/characters/new">
            <Button data-testid="button-new-character">
              <Plus className="w-4 h-4 mr-2" />
              New Character
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-lg bg-card animate-pulse border border-border" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!characters || characters.length === 0) && (
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-characters">
            <Sword className="w-10 h-10 text-muted-foreground mb-4" />
            <h2 className="font-serif text-xl font-semibold mb-2">No characters yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Create your first adventurer to get started.</p>
            <Link href="/characters/new">
              <Button data-testid="button-create-first">Create Character</Button>
            </Link>
          </div>
        )}

        {/* Grid */}
        {!isLoading && characters && characters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <Card key={char.id} className="group hover:border-primary/50 transition-colors" data-testid={`card-character-${char.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-serif font-bold text-lg leading-tight" data-testid={`text-character-name-${char.id}`}>
                        {char.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {capitalize(char.race)} {capitalize(char.class)}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs" data-testid={`text-character-level-${char.id}`}>
                      Lv {char.level}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      AC {char.armorClass}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {char.currentHp}/{char.maxHp} HP
                    </span>
                    <span>{capitalize(char.alignment)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/characters/${char.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-character-${char.id}`}>
                        View Sheet
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(char.id, char.name)}
                      data-testid={`button-delete-character-${char.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
