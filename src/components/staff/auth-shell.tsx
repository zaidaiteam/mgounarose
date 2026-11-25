import { Flower2 } from "lucide-react";
import type { ReactNode } from "react";
import { WorkerGate } from "./worker-gate";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-brand" aria-hidden="true">
        <Flower2 strokeWidth={0.75} />
        <span>M’GOUNA ROSE</span>
      </div>
      <section className="panel auth-card">
        <div className="brand">
          <span className="brand-icon">
            <Flower2 size={22} />
          </span>
          <span>
            <strong>Rose Care Hub</strong>
            <small>M’GOUNA ROSE</small>
          </span>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <WorkerGate>{children}</WorkerGate>
      </section>
    </main>
  );
}
