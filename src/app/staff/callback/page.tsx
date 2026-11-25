import { AuthShell } from "@/components/staff/auth-shell";
import { TokenForm } from "@/components/staff/token-form";
export default function Callback() {
  return (
    <AuthShell
      title="Vérifier l’accès"
      subtitle="Confirmez votre invitation ou votre demande de réinitialisation."
    >
      <TokenForm />
    </AuthShell>
  );
}
