import { redirect } from "next/navigation";
import { savePassword } from "../actions";
import { AuthShell } from "@/components/staff/auth-shell";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { passwordFlow, verifiedSession } from "@/lib/staff/auth";

export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await verifiedSession();
  const flow = session && (await passwordFlow(session));
  if (!flow) redirect("/staff/login?notice=link");
  const { notice } = await searchParams;
  return (
    <AuthShell
      title={flow === "invite" ? "Activer votre accès" : "Nouveau mot de passe"}
      subtitle="Choisissez un mot de passe d’au moins 12 caractères."
    >
      {notice === "password" && (
        <p role="status" className="notice">
          Le mot de passe n’a pas pu être enregistré.
        </p>
      )}
      <form className="auth-form" action={savePassword}>
        <Field label="Nouveau mot de passe">
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </Field>
        <Button>Enregistrer le mot de passe</Button>
      </form>
    </AuthShell>
  );
}
