"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChartNoAxesCombined, CircleHelp, ClipboardList, Flower2, LayoutGrid, Menu, MessageSquareText, Package, Search, ShoppingBag, UserRoundCog, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Catalog, Customers, Employees, Knowledge, Messages, Orders, Tasks, type Draft } from "@/components/operations";
import { Dashboard, Performance } from "@/components/overview";
import { fictionalStore, faq, guides } from "@/lib/fixtures";
import { matches, type Store } from "@/lib/domain";

const navigation = [
  ["workspace", "Vue d’ensemble", LayoutGrid, "Tableau de bord"],
  ["orders", "Commandes", ShoppingBag, "Commandes"],
  ["customers", "Clients", UsersRound, "Clients 360°"],
  ["catalog", "Catalogue", Package, "Catalogue"],
  ["messages", "Messages", MessageSquareText, "Atelier de messages"],
  ["guides", "Guides de soin", BookOpen, "Guides de soin"],
  ["faq", "Base de connaissances", CircleHelp, "Base de connaissances"],
  ["tasks", "Tâches et rappels", ClipboardList, "Tâches et rappels"],
  ["employees", "Équipe", UserRoundCog, "Équipe"],
  ["performance", "Performance", ChartNoAxesCombined, "Performance"],
] as const;
export type View = typeof navigation[number][0];
export type Update = (change: (store: Store) => Store) => void;
const storageKey = "rose-care-demo-v1";
const empty: Store = { customers: [], orders: [], products: [], tasks: [], employees: [] };

export function Hub() {
  const [store, setStore] = useState<Store | null>(null);
  const [view, setView] = useState<View>("workspace");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      setView(navigation.find(([id]) => id === hash)?.[0] ?? "workspace");
      setSelected("");
    };
    const timer = window.setTimeout(() => {
      sync();
      try {
        const saved = localStorage.getItem(storageKey);
        setStore(saved ? JSON.parse(saved) as Store : fictionalStore());
      } catch {
        setStore(fictionalStore());
        setNotice("Le stockage local n’a pas pu être lu.");
      }
    }, 0);
    window.addEventListener("popstate", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
    return () => { clearTimeout(timer); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    if (!store) return;
    try { localStorage.setItem(storageKey, JSON.stringify(store)); }
    catch {
      const timer = window.setTimeout(() => setNotice("Les changements restent en mémoire pour cette session."), 0);
      return () => clearTimeout(timer);
    }
  }, [store]);
  const update: Update = (change) => setStore((current) => current ? change(current) : current);
  function go(next: View, selection = "") {
    if (next !== view) {
      history.pushState(null, "", next === "workspace" ? "/" : "#" + next);
      window.scrollTo(0, 0);
    }
    setView(next); setSelected(selection); setMenu(false); setSearch("");
  }
  function prepare(next: Draft) { setDraft(next); go("messages"); }
  const data = store ?? empty;
  const results = search.trim() ? [
    ...data.orders.filter((o) => matches(search, o.id, data.customers.find((c) => c.id === o.customerId)?.name)).map((o) => ({ label: o.id, type: "Commande", view: "orders" as const, id: o.id })),
    ...data.customers.filter((c) => matches(search, c.name, c.email, c.city)).map((c) => ({ label: c.name, type: "Client", view: "customers" as const, id: c.id })),
    ...data.products.filter((p) => matches(search, p.name, p.kind)).map((p) => ({ label: p.name, type: p.kind, view: "catalog" as const, id: p.id })),
    ...[...guides.map((item) => ({ ...item, view: "guides" as const })), ...faq.map((item) => ({ ...item, view: "faq" as const }))]
      .filter((item) => matches(search, item.title, item.group)).map((item) => ({ label: item.title, type: item.group, view: item.view, id: item.title })),
  ].slice(0, 8) : [];
  const title = navigation.find(([id]) => id === view)?.[3];
  return <div className="shell">
    <a className="skip" href="#content">Aller au contenu</a>
    {menu && <button className="scrim" aria-label="Fermer la navigation" onClick={() => setMenu(false)} />}
    <aside id="navigation" className={menu ? "sidebar open" : "sidebar"}>
      <button type="button" className="brand" onClick={() => go("workspace")}><span className="brand-icon"><Flower2 size={22} /></span><span><strong>Rose Care Hub</strong><small>M’GOUNA ROSE</small></span></button>
      <nav aria-label="Navigation principale">
        {navigation.map(([id, label, Icon], index) => <div key={id}>
          {index === 0 && <p className="nav-label">Espace de travail</p>}
          {index === 8 && <p className="nav-label team-label">Pilotage</p>}
          <button className="nav-button" aria-current={view === id ? "page" : undefined} onClick={() => go(id)}><Icon size={17} />{label}</button>
        </div>)}
      </nav>
      <div className="sidebar-foot"><span className="avatar">MR</span><div><strong>M’Gouna Rose</strong><small>Équipe service client</small></div></div>
    </aside>
    <div className="stage">
      <header className="topbar">
        <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" className="menu-toggle" aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"} aria-controls="navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={22} /> : <Menu size={22} />}</Button><span className="breadcrumb">{title}</span></div>
        <div className="global-search">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Recherche globale" placeholder="Rechercher…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearch(""); if (event.key === "Enter" && results.length) go(results[0].view, results[0].id); }} />
          {search.trim() && <div className="search-results">{results.length ? results.map((result) => <button key={result.view + result.id} onClick={() => go(result.view, result.id)}><strong>{result.label}</strong><span>{result.type}</span></button>) : <p>Aucun résultat.</p>}</div>}
        </div>
        <span className="demo-tag">Démonstration</span>
      </header>
      <main id="content" className="content">
        {notice && <p role="status" className="notice">{notice}</p>}
        {!store ? <p role="status">Chargement de l’espace…</p> : <>
          {view === "workspace" && <Dashboard store={store} go={go} />}
          {view === "orders" && <Orders store={store} update={update} selected={selected} select={setSelected} prepare={prepare} go={go} />}
          {view === "customers" && <Customers store={store} update={update} selected={selected} select={setSelected} prepare={prepare} go={go} />}
          {view === "catalog" && <Catalog store={store} update={update} selected={selected} select={setSelected} />}
          {view === "messages" && <Messages key={JSON.stringify(draft)} store={store} initial={draft} />}
          {view === "guides" && <Knowledge title="Guides de soin" subtitle="Les gestes et conseils à transmettre lors de vos échanges." items={guides} selected={selected} />}
          {view === "faq" && <Knowledge title="Base de connaissances" subtitle="Les réponses aux questions courantes de l’équipe." items={faq} selected={selected} />}
          {view === "tasks" && <Tasks store={store} update={update} />}
          {view === "employees" && <Employees store={store} update={update} />}
          {view === "performance" && <Performance store={store} />}
        </>}
      </main>
    </div>
  </div>;
}
