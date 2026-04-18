import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface AccountForm {
  name: string;
}

export default function AccountPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const me = useGetMe();
  const updateMe = useUpdateMe();

  const form = useForm<AccountForm>({
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (me.data) {
      form.reset({ name: me.data.name ?? "" });
    }
  }, [me.data]);

  async function onSubmit(values: AccountForm) {
    updateMe.mutate(
      { data: { name: values.name } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Account updated" });
        },
        onError: () => {
          toast({ title: "Failed to update account", variant: "destructive" });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-xl">
        <h1 className="font-serif text-2xl font-bold mb-6">Account Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            {me.isLoading ? (
              <div className="text-muted-foreground text-sm">Loading...</div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    {...form.register("name")}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={me.data?.email ?? ""} disabled data-testid="text-email" />
                </div>
                <Button type="submit" disabled={updateMe.isPending} data-testid="button-save-account">
                  {updateMe.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
