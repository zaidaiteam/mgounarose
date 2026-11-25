import { redirect } from "next/navigation";
import { Flower2, Search } from "lucide-react";
import { verifiedSession, passwordFlow } from "@/lib/staff/auth";
import { StaffDenied, staffRepository } from "@/lib/staff/repository";
import { roleLabels, statusLabels, type Workspace } from "@/lib/staff/types";
import { dateAgo, localDate, matches } from "@/lib/domain";
import { Badge, Empty, Field, Heading } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { StaffCustomers } from "@/components/staff/customers";
import { StaffOrders, staffMoney } from "@/components/staff/orders";
import {
  StaffCatalog,
  StaffKnowledge,
  StaffMessages,
} from "@/components/staff/resources";
import { StaffAudit, StaffTasks, StaffTeam } from "@/components/staff/team";
import { WorkerGate } from "@/components/staff/worker-gate";
import { signOut } from "../actions";
import { z } from "zod";

const views = {
  overview: "Tableau de bord",
  orders: "Commandes",
  customers: "Clients 360°",
  catalog: "Catalogue",
  messages: "Atelier de messages",
  guides: "Guides de soin",
  faq: "Base de connaissances",
  tasks: "Tâches et rappels",
  employees: "Équipe",
  performance: "Performance",
  audit: "Journal d’audit",
} as const;
type View = keyof typeof views;
const notices: Record<string, string> = {
  ok: "Modifications enregistrées.",
  denied: "Cette opération n’est pas autorisée.",
  invalid: "Vérifiez les champs et essayez à nouveau.",
  conflict:
    "La fiche a changé. Consultez sa version actuelle avant de réessayer.",
  unavailable: "L’opération est momentanément indisponible.",
};
const querySchema = z.object({
  section: z.enum(Object.keys(views) as [View, ...View[]]).catch("overview"),
  id: z.uuid().optional().catch(undefined),
  status: z.string().max(40).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  notice: z.string().max(30).optional().catch(undefined),
  customer: z.uuid().optional().catch(undefined),
  order: z.uuid().optional().catch(undefined),
  template: z.uuid().optional().catch(undefined),
  guide: z.uuid().optional().catch(undefined),
  period: z.enum(["7", "30", "90"]).catch("7"),
});

function SearchResults({ data, query }: { data: Workspace; query: string }) {
  const results = [
    ...data.orders.map((item) => ({
      label: "RCH-" + item.reference,
      detail: item.customer_name,
      section: "orders",
      id: item.id,
    })),
    ...data.customers.map((item) => ({
      label: item.name,
      detail: item.language,
      section: "customers",
      id: item.id,
    })),
    ...data.products.map((item) => ({
      label: item.title,
      detail: item.variants.map((variant) => variant.title).join(" "),
      section: "catalog",
      id: item.id,
    })),
    ...data.guides.map((item) => ({
      label: item.title,
      detail: item.category,
      section: "guides",
      id: item.id,
    })),
    ...data.faqs.map((item) => ({
      label: item.question,
      detail: item.category,
      section: "faq",
      id: item.id,
    })),
    ...data.tasks.map((item) => ({
      label: item.title,
      detail: item.kind,
      section: "tasks",
      id: item.id,
    })),
    ...data.employees.map((item) => ({
      label: item.name,
      detail: roleLabels[item.role],
      section: "employees",
      id: item.id,
    })),
  ]
    .filter((item) => matches(query, item.label, item.detail))
    .slice(0, 30);
  return (
    <section className="panel detail">
      <h2>Résultats de recherche</h2>
      {results.length ? (
        <ul>
          {results.map((item) => (
            <li key={item.section + item.id}>
              <a
                className="text-link"
                href={`?section=${item.section}&id=${item.id}`}
              >
                {item.label}
              </a>{" "}
              · {views[item.section as View]}
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      )}
    </section>
  );
}
function Overview({
  data,
  financial,
}: {
  data: Workspace;
  financial: boolean;
}) {
  const priorities = data.orders.filter((item) =>
    [
      "new",
      "contacting",
      "callback",
      "confirmed",
      "preparing",
      "failed_delivery",
    ].includes(item.status),
  );
  const tasks = data.tasks.filter((task) => task.status !== "done");
  return (
    <>
      <div className="metrics">
        <article className="panel metric">
          <h2>Commandes accessibles</h2>
          <strong>{data.orders.length}</strong>
        </article>
        <article className="panel metric">
          <h2>Commandes prioritaires</h2>
          <strong>{priorities.length}</strong>
        </article>
        <article className="panel metric">
          <h2>Tâches ouvertes</h2>
          <strong>{tasks.length}</strong>
        </article>
        {financial && (
          <article className="panel metric">
            <h2>Clients accessibles</h2>
            <strong>{data.customers.length}</strong>
          </article>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel dashboard-panel">
          <h2>Commandes prioritaires</h2>
          <ul className="agenda">
            {priorities.slice(0, 8).map((item) => (
              <li key={item.id}>
                <a className="text-link" href={`?section=orders&id=${item.id}`}>
                  RCH-{item.reference}
                </a>
                <Badge>{statusLabels[item.status]}</Badge>
              </li>
            ))}
          </ul>
          {!priorities.length && <Empty />}
        </section>
        <section className="panel dashboard-panel">
          <h2>À faire</h2>
          <ul className="agenda">
            {tasks.slice(0, 8).map((item) => (
              <li key={item.id}>
                <a className="text-link" href={`?section=tasks&id=${item.id}`}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          {!tasks.length && <Empty />}
        </section>
      </div>
    </>
  );
}
function StaffPerformance({
  data,
  onePeriod,
}: {
  data: Workspace;
  onePeriod: string;
}) {
  const from = dateAgo(Number(onePeriod) - 1);
  const orders = data.orders.filter(
    (item) => localDate(new Date(item.created_at)) >= from,
  );
  const confirmed = orders.filter((item) =>
    item.history.some((event) => event.status === "confirmed"),
  );
  const completed = data.tasks.filter(
    (item) =>
      item.completed_at && localDate(new Date(item.completed_at)) >= from,
  ).length;
  const total = confirmed
    .filter((item) => !["cancelled", "returned"].includes(item.status))
    .reduce((sum, item) => sum + Math.round((item.total ?? 0) * 100), 0);
  return (
    <>
      <form className="inline-form staff-search" method="get">
        <input type="hidden" name="section" value="performance" />
        <Field label="Période">
          <select name="period" defaultValue={onePeriod}>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
        </Field>
        <Button variant="outline">Appliquer</Button>
      </form>
      <div className="metrics">
        <article className="panel metric">
          <h2>Commandes créées</h2>
          <strong>{orders.length}</strong>
        </article>
        <article className="panel metric">
          <h2>Taux de confirmation</h2>
          <strong>
            {orders.length
              ? Math.round((100 * confirmed.length) / orders.length) + " %"
              : "—"}
          </strong>
        </article>
        <article className="panel metric">
          <h2>Valeur confirmée</h2>
          <strong>{staffMoney(total / 100)}</strong>
        </article>
        <article className="panel metric">
          <h2>Tâches terminées</h2>
          <strong>{completed}</strong>
        </article>
      </div>
    </>
  );
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await verifiedSession();
  if (!session) redirect("/staff/login");
  if (await passwordFlow(session)) redirect("/staff/password");
  const actor = await staffRepository.actor(session);
  if (!actor) redirect("/staff/login?notice=credentials");
  let data: Workspace;
  try {
    data = await staffRepository.workspace(session);
  } catch (error) {
    if (error instanceof StaffDenied)
      redirect("/staff/login?notice=credentials");
    throw error;
  }
  const params = querySchema.parse(await searchParams);
  const editorial = actor.role === "admin" || actor.role === "manager";
  const financial = editorial || actor.role === "advisor";
  const availableViews: View[] = [
    "overview",
    "orders",
    ...(financial ? (["customers"] as const) : []),
    "catalog",
    ...(financial ? (["messages", "guides", "faq"] as const) : []),
    "tasks",
    ...(editorial ? (["employees", "performance"] as const) : []),
    ...(actor.role === "admin" ? (["audit"] as const) : []),
  ];
  const selected = availableViews.includes(params.section)
    ? params.section
    : "overview";
  return (
    <WorkerGate>
      <div className="staff-wrap">
        <header className="topbar">
          <div className="actions">
            <span className="brand-icon">
              <Flower2 size={20} />
            </span>
            <strong>Rose Care Hub</strong>
            <span>
              {actor.name} · {roleLabels[actor.role]}
            </span>
          </div>
          <form action={signOut}>
            <Button variant="outline">Se déconnecter</Button>
          </form>
        </header>
        <main className="content" id="content">
          <p className="demo-warning">
            <strong>Espace authentifié de test.</strong> Utilisez uniquement des
            données fictives.
          </p>
          <nav className="staff-nav" aria-label="Navigation équipe">
            {availableViews.map((item) => (
              <a
                key={item}
                className="nav-button"
                aria-current={item === selected ? "page" : undefined}
                href={"/staff/workspace?section=" + item}
              >
                {views[item]}
              </a>
            ))}
          </nav>
          <form method="get" className="inline-form staff-search">
            <input type="hidden" name="section" value={selected} />
            <Field label="Recherche globale">
              <input
                name="q"
                maxLength={100}
                defaultValue={params.q ?? ""}
                placeholder="Rechercher dans votre espace…"
              />
            </Field>
            <Button variant="outline">
              <Search size={16} /> Rechercher
            </Button>
          </form>
          {params.notice && Object.hasOwn(notices, params.notice) && (
            <p className="notice" role="status">
              {notices[params.notice]}
            </p>
          )}
          <Heading
            title={views[selected]}
            subtitle="Espace de travail M’Gouna Rose"
          />
          {params.q?.trim() ? (
            <SearchResults data={data} query={params.q} />
          ) : (
            <>
              {selected === "overview" && (
                <Overview data={data} financial={financial} />
              )}
              {selected === "orders" && (
                <StaffOrders
                  data={data}
                  actor={actor}
                  selected={params.id}
                  filter={params.status}
                />
              )}
              {selected === "customers" && (
                <StaffCustomers
                  data={data}
                  actor={actor}
                  selected={params.id}
                />
              )}
              {selected === "catalog" && (
                <StaffCatalog
                  data={data}
                  editorial={editorial}
                  canSeePrices={financial}
                  selected={params.id}
                />
              )}
              {selected === "messages" && (
                <StaffMessages
                  data={data}
                  actor={actor}
                  editorial={editorial}
                  params={params}
                />
              )}
              {(selected === "guides" || selected === "faq") && (
                <StaffKnowledge
                  section={selected}
                  data={data}
                  editorial={editorial}
                  selected={params.id}
                />
              )}
              {selected === "tasks" && (
                <StaffTasks
                  data={data}
                  editorial={editorial}
                  selected={params.id}
                />
              )}
              {selected === "employees" && (
                <StaffTeam data={data} actor={actor} selected={params.id} />
              )}
              {selected === "performance" && (
                <StaffPerformance data={data} onePeriod={params.period} />
              )}
              {selected === "audit" && <StaffAudit data={data} />}
            </>
          )}
        </main>
      </div>
    </WorkerGate>
  );
}
