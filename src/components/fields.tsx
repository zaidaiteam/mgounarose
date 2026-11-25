import type { ReactNode } from "react";
import { Search } from "lucide-react";

export function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
export function Filter({ query, setQuery, value, setValue, options, all }: {
  query: string; setQuery: (value: string) => void; value: string; setValue: (value: string) => void; options: readonly string[]; all: string;
}) {
  return <div className="filters">
    <label className="filter-search"><Search size={16} /><input aria-label="Rechercher dans cette page" placeholder="Rechercher…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <select aria-label="Filtrer les résultats" value={value} onChange={(event) => setValue(event.target.value)}><option value="">{all}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>
  </div>;
}
export function Empty() { return <p className="empty">Aucun résultat.</p>; }
export function Badge({ children }: { children: string }) {
  const tone = children === "À confirmer" || children === "En attente" ? "warm" : ["Annulée", "Inactif", "Échec de livraison", "Retournée"].includes(children) ? "rose" : "green";
  return <span className={"badge " + tone}>{children}</span>;
}
export function formattedDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}
