import { signIn } from "../actions";
import { AuthShell } from "@/components/staff/auth-shell";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui/button";

const messages: Record<string, string> = {
  credentials:
    "Connexion indisponible. Vérifiez vos identifiants ou contactez votre responsable.",
  origin:
    "La demande a été refusée. Ouvrez l’espace depuis son adresse habituelle.",
  link: "Ce lien ne peut plus être utilisé. Demandez un nouveau lien.",
  signed_out: "Vous êtes déconnecté.",
  password_saved:
    "Mot de passe enregistré. Connectez-vous avec votre nouveau mot de passe.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  return (
    <AuthShell
      title="Espace équipe"
      subtitle="Accès par invitation aux opérations de M’Gouna Rose. Environnement fictif uniquement."
    >
      {notice && Object.hasOwn(messages, notice) && (
        <p className="notice" role="status">
          {messages[notice]}
        </p>
      )}
      <form className="auth-form" action={signIn}>
        <Field label="Adresse e-mail">
          <input
            name="email"
            type="email"
            autoComplete="username"
            maxLength={200}
            required
          />
        </Field>
        <Field label="Mot de passe">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </Field>
        <Button>Se connecter</Button>
      </form>
      <div className="auth-links">
        <a className="text-link" href="/staff/reset">
          Mot de passe oublié
        </a>
        <a className="text-link" href="/demo/">
          Ouvrir la démonstration
        </a>
      </div>
    </AuthShell>
  );
}
