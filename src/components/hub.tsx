"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardList,
  Flower2,
  LayoutGrid,
  Menu,
  MessageSquareText,
  Package,
  Search,
  ShoppingBag,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Catalog,
  Customers,
  Employees,
  Knowledge,
  Tasks,
} from "@/components/operations";
import { Messages, type Draft } from "@/components/message-library";
import { Orders } from "@/components/order-management";
import { Dashboard, Performance } from "@/components/overview";
import { fictionalStore } from "@/lib/fixtures";
import { matches, templateKinds, type Store } from "@/lib/domain";
import {
  legacyStorageKey,
  readDemoStorage,
  storageKey,
  validateStore,
} from "@/lib/storage";

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
export type View = (typeof navigation)[number][0];
export type Update = (change: (store: Store) => Store) => void;
const empty: Store = {
  customers: [],
  orders: [],
  products: [],
  tasks: [],
  employees: [],
  knowledge: [],
  templates: [],
};

export function Hub() {
  const [store, setStore] = useState<Store | null>(null);
  const [view, setView] = useState<View>("workspace");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [resetPrompt, setResetPrompt] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const sync = () => {
      const [hash, selection] = window.location.hash.slice(1).split("/");
      if (hash === "content") return;
      setView(navigation.find(([id]) => id === hash)?.[0] ?? "workspace");
      setSelected(selection ?? "");
      setMenu(false);
      setSearch("");
    };
    const timer = window.setTimeout(() => {
      sync();
      try {
        const result = readDemoStorage(window.localStorage);
        setStore(result.store);
        setNotice(result.notice);
      } catch {
        setStore(fictionalStore());
        setNotice("Le stockage local est indisponible.");
      }
    }, 0);
    window.addEventListener("popstate", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/demo/sw.js", { scope: "/demo/" }).catch(() => {});
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  useEffect(() => {
    if (!store) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch {
      const timer = window.setTimeout(
        () =>
          setNotice("Les changements restent en mémoire pour cette session."),
        0,
      );
      return () => clearTimeout(timer);
    }
  }, [store]);
  const update: Update = (change) =>
    setStore((current) => {
      if (!current) return current;
      const next = change(current);
      return next === current || validateStore(next) ? next : current;
    });
  function go(next: View, selection = "") {
    if (next !== view || (selection && selection !== selected)) {
      history.pushState(
        null,
        "",
        next === "workspace"
          ? "/demo/"
          : "#" + next + (selection ? "/" + selection : ""),
      );
      window.scrollTo(0, 0);
    }
    setView(next);
    setSelected(selection);
    setMenu(false);
    setSearch("");
  }
  function prepare(next: Draft) {
    setDraft(next);
    go("messages");
  }
  function reset() {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyStorageKey);
    } catch {
      /* In-memory data can still be reset. */
    }
    setStore(fictionalStore());
    setResetPrompt(false);
    setDraft({});
    setRevision((value) => value + 1);
    setNotice("Données fictives réinitialisées.");
    go("workspace");
  }
  const data = store ?? empty;
  const results = search.trim()
    ? [
        ...data.orders
          .filter((o) =>
            matches(
              search,
              o.id,
              o.city,
              o.status,
              data.customers.find((c) => c.id === o.customerId)?.name,
              ...o.lines.map((line) => line.label),
            ),
          )
          .map((o) => ({
            label: o.id,
            type: "Commande",
            view: "orders" as const,
            id: o.id,
          })),
        ...data.customers
          .filter((c) => matches(search, c.name, c.email, c.city))
          .map((c) => ({
            label: c.name,
            type: "Client",
            view: "customers" as const,
            id: c.id,
          })),
        ...data.products
          .filter((p) =>
            matches(
              search,
              p.name,
              p.kind,
              ...p.variants.flatMap((variant) => [
                variant.size,
                variant.availability,
              ]),
            ),
          )
          .map((p) => ({
            label: p.name,
            type: p.kind,
            view: "catalog" as const,
            id: p.id,
          })),
        ...data.knowledge
          .filter((item) => matches(search, item.title, item.group, item.text))
          .map((item) => ({
            label: item.title,
            type: item.group,
            view:
              item.kind === "guide" ? ("guides" as const) : ("faq" as const),
            id: item.id,
          })),
        ...data.tasks
          .filter((item) =>
            matches(
              search,
              item.title,
              item.kind,
              item.orderId,
              data.customers.find((customer) => customer.id === item.customerId)
                ?.name,
            ),
          )
          .map((item) => ({
            label: item.title,
            type: item.kind,
            view: "tasks" as const,
            id: item.id,
          })),
        ...data.employees
          .filter((item) => matches(search, item.name, item.role))
          .map((item) => ({
            label: item.name,
            type: item.role,
            view: "employees" as const,
            id: item.id,
          })),
        ...templateKinds.flatMap((kind, index) =>
          matches(search, kind, "Modèle de message")
            ? [
                {
                  label: kind,
                  type: "Modèle de message",
                  view: "messages" as const,
                  id: String(index),
                },
              ]
            : [],
        ),
      ].slice(0, 8)
    : [];
  function openResult(result: (typeof results)[number]) {
    if (result.view === "messages")
      prepare({ kind: templateKinds[Number(result.id)] });
    else go(result.view, result.id);
  }
  const title = navigation.find(([id]) => id === view)?.[3];
  return (
    <div className="shell">
      <a className="skip" href="#content">
        Aller au contenu
      </a>
      {menu && (
        <button
          className="scrim"
          aria-label="Fermer la navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside id="navigation" className={menu ? "sidebar open" : "sidebar"}>
        <button type="button" className="brand" onClick={() => go("workspace")}>
          <span className="brand-icon">
            <Flower2 size={22} />
          </span>
          <span>
            <strong>Rose Care Hub</strong>
            <small>M’GOUNA ROSE</small>
          </span>
        </button>
        <nav aria-label="Navigation principale">
          {navigation.map(([id, label, Icon], index) => (
            <div key={id}>
              {index === 0 && <p className="nav-label">Espace de travail</p>}
              {index === 8 && <p className="nav-label team-label">Pilotage</p>}
              <button
                className="nav-button"
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
              >
                <Icon size={17} />
                {label}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="avatar">MR</span>
          <div>
            <strong>M’Gouna Rose</strong>
            <small>Équipe service client</small>
          </div>
        </div>
      </aside>
      <div className="stage">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              className="menu-toggle"
              aria-label={menu ? "Fermer le menu" : "Ouvrir le menu"}
              aria-controls="navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </Button>
            <span className="breadcrumb">{title}</span>
          </div>
          <div className="global-search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Recherche globale"
              placeholder="Rechercher…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearch("");
                if (event.key === "Enter" && results.length)
                  openResult(results[0]);
              }}
            />
            {search.trim() && (
              <div className="search-results">
                {results.length ? (
                  results.map((result) => (
                    <button
                      key={result.view + result.id}
                      onClick={() => openResult(result)}
                    >
                      <strong>{result.label}</strong>
                      <span>{result.type}</span>
                    </button>
                  ))
                ) : (
                  <p>Aucun résultat.</p>
                )}
              </div>
            )}
          </div>
          <span className="demo-tag">Démonstration</span>
        </header>
        <main id="content" className="content" tabIndex={-1}>
          <section
            className="demo-warning"
            aria-label="Avertissement de démonstration"
          >
            <AlertTriangle size={19} aria-hidden="true" />
            <p>
              <strong>Démonstration uniquement.</strong> Utilisez exclusivement
              des données fictives. Les modifications restent dans ce
              navigateur.
            </p>
            <Button
              variant="outline"
              onClick={() => setResetPrompt(true)}
              disabled={!store || resetPrompt}
            >
              Réinitialiser les données
            </Button>
          </section>
          {resetPrompt && (
            <div
              role="group"
              aria-label="Confirmer la réinitialisation"
              className="notice actions"
            >
              <span>Toutes les modifications locales seront effacées.</span>
              <Button onClick={reset}>Confirmer la réinitialisation</Button>
              <Button variant="outline" onClick={() => setResetPrompt(false)}>
                Conserver les données
              </Button>
            </div>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          {!store ? (
            <p role="status">Chargement de l’espace…</p>
          ) : (
            <div key={revision}>
              {view === "workspace" && <Dashboard store={store} go={go} />}
              {view === "orders" && (
                <Orders
                  store={store}
                  update={update}
                  selected={selected}
                  select={setSelected}
                  prepare={prepare}
                  go={go}
                />
              )}
              {view === "customers" && (
                <Customers
                  store={store}
                  update={update}
                  selected={selected}
                  select={setSelected}
                  prepare={prepare}
                  go={go}
                />
              )}
              {view === "catalog" && (
                <Catalog
                  store={store}
                  update={update}
                  selected={selected}
                  select={setSelected}
                />
              )}
              {view === "messages" && (
                <Messages
                  key={JSON.stringify(draft)}
                  store={store}
                  update={update}
                  initial={draft}
                />
              )}
              {view === "guides" && (
                <Knowledge
                  title="Guides de soin"
                  subtitle="Les gestes et conseils à transmettre lors de vos échanges."
                  kind="guide"
                  items={store.knowledge.filter(
                    (item) => item.kind === "guide",
                  )}
                  selected={selected}
                  update={update}
                  share={(guideId) =>
                    prepare({ kind: "Partage de guide", guideId })
                  }
                />
              )}
              {view === "faq" && (
                <Knowledge
                  title="Base de connaissances"
                  subtitle="Les réponses aux questions courantes de l’équipe."
                  kind="faq"
                  items={store.knowledge.filter((item) => item.kind === "faq")}
                  selected={selected}
                  update={update}
                  share={() => {}}
                />
              )}
              {view === "tasks" && (
                <Tasks
                  store={store}
                  update={update}
                  selected={selected}
                  go={go}
                />
              )}
              {view === "employees" && (
                <Employees store={store} update={update} selected={selected} />
              )}
              {view === "performance" && <Performance store={store} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
