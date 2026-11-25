"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
export function CopyDraft({ text }: { text: string }) {
  const [draft, setDraft] = useState(text);
  const [notice, setNotice] = useState("");
  return (
    <>
      <textarea
        aria-label="Brouillon du message"
        dir="auto"
        maxLength={12000}
        rows={8}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setNotice("");
        }}
      />
      <div className="actions">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(draft);
              setNotice("Message copié.");
            } catch {
              setNotice("Sélectionnez le texte pour le copier.");
            }
          }}
        >
          Copier
        </Button>
        <span role="status">{notice}</span>
      </div>
    </>
  );
}
