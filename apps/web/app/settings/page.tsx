import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { AppearanceToggle } from "@/components/settings/appearance-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Settings
      </p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">Preferences</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how MyCareerArchive looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceToggle />
        </CardContent>
      </Card>
    </main>
  );
}
