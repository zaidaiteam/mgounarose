"use client";

import { useEffect, useState, type ReactNode } from "react";

export function WorkerGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ready" | "blocked">(
    "checking",
  );
  useEffect(() => {
    let active = true;
    const refreshRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) location.reload();
    };
    window.addEventListener("pageshow", refreshRestoredPage);
    async function retire() {
      try {
        localStorage.removeItem("rose-care-demo-v1");
      } catch {
        /* Storage may be unavailable. */
      }
      if ("serviceWorker" in navigator) {
        const scope = location.origin + "/";
        const registration = (
          await navigator.serviceWorker.getRegistrations()
        ).find((item) => item.scope === scope);
        if (registration) await registration.unregister();
        if ("caches" in window) {
          for (const key of await caches.keys())
            if (key.startsWith("rose-care-shell-")) await caches.delete(key);
        }
        if (
          navigator.serviceWorker.controller &&
          new URL(navigator.serviceWorker.controller.scriptURL).pathname ===
            "/sw.js"
        ) {
          if (registration) location.reload();
          if (active) setState("blocked");
          return;
        }
      }
      if (active) setState("ready");
    }
    void retire().catch(() => {
      if (active) setState("blocked");
    });
    return () => {
      active = false;
      window.removeEventListener("pageshow", refreshRestoredPage);
    };
  }, []);
  if (state === "checking")
    return (
      <p className="empty" role="status">
        Vérification de l’espace sécurisé…
      </p>
    );
  if (state === "blocked")
    return (
      <p className="notice" role="alert">
        L’ancien mode hors ligne est encore actif. Fermez cet onglet, puis
        rouvrez l’espace sécurisé.
      </p>
    );
  return children;
}
