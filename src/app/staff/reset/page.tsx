import { requestReset } from "../actions";
import { AuthShell } from "@/components/staff/auth-shell";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui/button";

export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <AuthShell
      title="Réinitialiser l’accès"
      subtitle="Saisissez l’adresse e-mail de votre compte invité."
    >
      {notice === "requested" && (
        <p className="notice" role="status">
          Si le compte est éligible, un lien de réinitialisation sera disponible
          dans la boîte de test.
        </p>
      )}
      <form className="auth-form" action={requestReset}>
        <Field label="Adresse e-mail">
          <input
            name="email"
            type="email"
            autoComplete="username"
            maxLength={200}
            required
          />
        </Field>
        <Button>Demander un lien</Button>
      </form>
      <a className="text-link" href="/staff/login">
        Revenir à la connexion
      </a>
    </AuthShell>
  );
}
