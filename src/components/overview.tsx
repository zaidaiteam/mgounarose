import { useState } from "react";
import { CalendarDays, ClipboardList, Flower2, MessageSquareText, PackageCheck, ShoppingBag, UsersRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Field, Heading, formattedDate } from "@/components/fields";
import { dateAgo, localDate, money, orderAmounts, statuses, type Store } from "@/lib/domain";
import type { View } from "@/components/hub";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: LucideIcon }) {
  return <article className="panel metric"><div><h2>{label}</h2><span className="metric-icon"><Icon size={18} /></span></div><strong>{value}</strong><small>{detail}</small></article>;
}

export function Dashboard({ store, go }: { store: Store; go: (view: View, id?: string) => void }) {
  const today = localDate();
  const pending = store.orders.filter((o) => o.status === "À confirmer");
  const openTasks = store.tasks.filter((t) => !t.done);
  const failed = store.orders.filter((order) => order.status === "Échec de livraison");
  const overdue = openTasks.filter((t) => t.due < today).length;
  const nextTasks = [...openTasks].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  return <>
    <section className="hero">
      <div className="hero-copy"><div className="hero-date"><CalendarDays size={15} /> {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Casablanca" }).format(new Date())}</div>
        <h1>Tableau de bord</h1><p>Suivez les commandes et retrouvez les priorités de votre équipe.</p>
        <div className="actions"><Button onClick={() => go("orders")}><ShoppingBag size={16} /> Voir les commandes</Button><Button variant="outline" onClick={() => go("messages")}><MessageSquareText size={16} /> Préparer un message</Button></div>
      </div>
      <div className="hero-art" aria-hidden="true"><Flower2 strokeWidth={0.65} /></div>
    </section>
    <div className="metrics">
      <Metric label="Commandes" value={store.orders.length} detail="Toutes les commandes" icon={ShoppingBag} />
      <Metric label="À confirmer" value={pending.length} detail="En attente de confirmation" icon={PackageCheck} />
      <Metric label="Clients" value={store.customers.length} detail="Profils dans le répertoire" icon={UsersRound} />
      <Metric label="Tâches ouvertes" value={openTasks.length} detail={overdue ? `${overdue} en retard` : "Aucun retard"} icon={ClipboardList} />
    </div>
    <div className="dashboard-grid">
      <section className="panel dashboard-panel">
        <div className="section-heading"><h2>Commandes prioritaires</h2><Button variant="ghost" onClick={() => go("orders")}>Tout voir</Button></div>
        <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
          {[...pending, ...failed, ...store.orders.filter((order) => !pending.includes(order) && !failed.includes(order))].slice(0, 5).map((o) => <tr key={o.id}><td><button className="text-link" onClick={() => go("orders", o.id)}>{o.id}</button><small>{formattedDate(o.date)}</small></td><td>{store.customers.find((c) => c.id === o.customerId)?.name}</td><td>{money(orderAmounts(o).total)}</td><td><Badge>{o.status}</Badge></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="panel dashboard-panel">
        <div className="section-heading"><h2>À faire</h2><Button variant="ghost" onClick={() => go("tasks")}>Ouvrir les tâches</Button></div>
        {nextTasks.length ? <ul className="agenda">{nextTasks.map((task) => <li key={task.id}><span className="metric-icon">{task.kind === "Rappel" ? <CalendarDays size={16} /> : <ClipboardList size={16} />}</span><div><button className="text-link" onClick={() => go("tasks", task.id)}>{task.title}</button><small>{task.due === today ? "Aujourd’hui" : formattedDate(task.due)} · {task.kind}</small></div></li>)}</ul> : <p className="empty">Aucune tâche ouverte.</p>}
      </section>
    </div>
  </>;
}

export function Performance({ store }: { store: Store }) {
  const [period, setPeriod] = useState("7");
  const from = dateAgo(Number(period) - 1);
  const today = localDate();
  const orders = store.orders.filter((o) => o.date >= from && o.date <= today);
  const confirmed = orders.filter((o) => o.history.some((event) => event.status === "Confirmée"));
  const revenue = confirmed.reduce((total, o) => total + (["Annulée", "Retournée"].includes(o.status) ? 0 : orderAmounts(o).total), 0);
  const tasks = store.tasks.filter((t) => t.done && t.completedAt && t.completedAt >= from && t.completedAt <= today);
  const rate = orders.length ? Math.round(confirmed.length / orders.length * 100) : 0;
  return <>
    <div className="page-toolbar"><Heading title="Performance" subtitle="Suivez le traitement des commandes et l’activité de l’équipe." /><Field label="Période"><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select></Field></div>
    <div className="metrics">
      <Metric label="Commandes créées" value={orders.length} detail="Sur la période" icon={ShoppingBag} />
      <Metric label="Taux de confirmation" value={orders.length ? rate + " %" : "—"} detail={`${confirmed.length} confirmées ou traitées`} icon={PackageCheck} />
      <Metric label="Valeur confirmée" value={money(revenue)} detail="Hors annulations et retours clôturés" icon={ShoppingBag} />
      <Metric label="Tâches terminées" value={tasks.length} detail="Selon la date de clôture" icon={ClipboardList} />
    </div>
    <div className="workspace-grid">
      <section className="panel editor"><h2>Commandes par statut</h2>{statuses.map((status) => {
        const count = orders.filter((o) => o.status === status).length;
        return <div className="bar-row" key={status}><div><span>{status}</span><strong>{count}</strong></div><meter aria-label={status} min={0} max={Math.max(orders.length, 1)} value={count} /></div>;
      })}</section>
      <section className="panel editor"><h2>Suivi par membre</h2><div className="table-wrap"><table><thead><tr><th>Membre</th><th>Terminées</th><th>Ouvertes</th></tr></thead><tbody>{store.employees.map((employee) => <tr key={employee.id}><td>{employee.name}</td><td>{tasks.filter((t) => t.employeeId === employee.id).length}</td><td>{store.tasks.filter((t) => t.employeeId === employee.id && !t.done).length}</td></tr>)}</tbody></table></div><p>Les tâches ouvertes affichent le total à ce jour.</p></section>
    </div>
  </>;
}
