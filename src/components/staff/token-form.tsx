"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyToken } from "@/app/staff/actions";

export function TokenForm() {
  const [link, setLink] = useState<{ token: string; type: string } | null>(
    null,
  );
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token_hash") ?? "";
    const type = hash.get("type") ?? "";
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
    const timer = setTimeout(() => setLink({ token, type }), 0);
    return () => clearTimeout(timer);
  }, []);
  if (!link) return <p role="status">Lecture du lien…</p>;
  if (
    !/^[a-zA-Z0-9_-]{12,512}$/.test(link.token) ||
    !["invite", "recovery"].includes(link.type)
  ) {
    return (
      <p role="alert">
        Lien indisponible.{" "}
        <a className="text-link" href="/staff/login">
          Revenir à la connexion
        </a>
      </p>
    );
  }
  return (
    <form action={verifyToken}>
      <input type="hidden" name="token_hash" value={link.token} />
      <input type="hidden" name="type" value={link.type} />
      <Button>Vérifier le lien</Button>
    </form>
  );
}
