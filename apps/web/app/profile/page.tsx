import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { initialsFor } from "@/components/site-header-user";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const displayName = (user.name ?? "").trim() || user.email.split("@")[0];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Profile
      </p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">Your profile</h1>

      <Card className="mt-6">
        <CardHeader>
          <span className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initialsFor(user.name, user.email)}
            </span>
            <span className="min-w-0">
              <CardTitle className="truncate">{displayName}</CardTitle>
              <CardDescription className="truncate">{user.email}</CardDescription>
            </span>
          </span>
        </CardHeader>
        <CardContent>
          <ProfileForm initialName={displayName} />
          <p className="mt-4 text-xs text-muted-foreground">
            Only your display name is editable here. Your email address is tied
            to your sign-in and cannot be changed on this page.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
