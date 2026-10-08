import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-session";
import { SecurityForm } from "@/components/settings/security-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SecurityPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Security
      </p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">Change password</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Signed in as {user.email}. Your other sessions stay signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecurityForm />
        </CardContent>
      </Card>
    </main>
  );
}
