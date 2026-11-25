import { useState, type FormEvent } from "react";
import { BookOpen, Copy, Flower2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Empty, Field, Filter, Heading, formattedDate } from "@/components/fields";
import { languages, localDate, matches, message, money, roles, statuses, transitions, updateOrder, type Language, type MessageKind, type Product, type Role, type Store } from "@/lib/domain";
import type { Update, View } from "@/components/hub";

export type Draft = { customerId?: string; orderId?: string };
type DataProps = { store: Store; update: Update };
type SelectProps = { selected: string; select: (id: string) => void };
const id = () => crypto.randomUUID();
const values = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); return new FormData(event.currentTarget); };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

function useFilter() {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  return { query, setQuery, value, setValue };
}

export function Orders({ store, update, selected, select, prepare, go }: DataProps & SelectProps & { prepare: (draft: Draft) => void; go: (view: View, id?: string) => void }) {
  const filters = useFilter();
  const [creating, setCreating] = useState(false);
  const order = store.orders.find((entry) => entry.id === selected);
  const customer = (id: string) => store.customers.find((entry) => entry.id === id);
  const product = (id: string) => store.products.find((entry) => entry.id === id);
  const rows = store.orders.filter((entry) => (!filters.value || filters.value === entry.status) && matches(filters.query, entry.id, customer(entry.customerId)?.name, product(entry.productId)?.name));
  function create(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const item = product(value(data, "product"));
    const customerId = value(data, "customer");
    if (!item || !customer(customerId)) return;
    const orderId = "RCH-" + id().slice(0, 8).toUpperCase();
    update((current) => ({ ...current, orders: [{ id: orderId, customerId, productId: item.id, quantity: Number(data.get("quantity")), unitPrice: item.price, status: "À confirmer", date: localDate() }, ...current.orders] }));
    setCreating(false); select(orderId);
  }

  return <>
    <div className="page-toolbar"><Heading title="Commandes" subtitle="Confirmer les commandes et suivre leur traitement." /><Button onClick={() => setCreating(!creating)}><Plus size={16} /> Nouvelle commande</Button></div>
    {creating && <form className="panel form-grid" onSubmit={create}>
      <Field label="Client"><select name="customer" required>{store.customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
      <Field label="Produit ou coffret"><select name="product" required>{store.products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
      <Field label="Quantité"><input name="quantity" type="number" min="1" max="999" defaultValue="1" required /></Field>
      <div className="form-action"><Button>Créer la commande</Button></div>
    </form>}
    {order && <section className="panel detail">
      <div className="section-heading"><h2>{order.id}</h2><Button variant="ghost" onClick={() => select("")}>Fermer la fiche</Button></div>
      <p>{order.quantity} × {product(order.productId)?.name} · {money(order.quantity * order.unitPrice)} · {formattedDate(order.date)}</p>
      <div className="actions">
        <Badge>{order.status}</Badge>
        {transitions[order.status].map((status) => <Button key={status} variant={status === "Annulée" ? "outline" : "default"} onClick={() => update((current) => updateOrder(current, order.id, status))}>{({ Confirmée: "Confirmer", Expédiée: "Marquer expédiée", Livrée: "Marquer livrée", Annulée: "Annuler", "À confirmer": "Mettre en attente" })[status]}</Button>)}
        <Button variant="outline" onClick={() => go("customers", order.customerId)}>{customer(order.customerId)?.name}</Button>
        <Button variant="outline" onClick={() => prepare({ customerId: order.customerId, orderId: order.id })}>Préparer un message</Button>
      </div>
    </section>}
    <section className="panel list-panel"><Filter {...filters} options={statuses} all="Tous les statuts" />
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Produit</th><th>Total</th><th>Statut</th></tr></thead><tbody>
        {rows.map((entry) => <tr key={entry.id}><td><button className="text-link" onClick={() => select(entry.id)}>{entry.id}</button><small>{formattedDate(entry.date)}</small></td><td>{customer(entry.customerId)?.name}</td><td>{product(entry.productId)?.name}</td><td>{money(entry.quantity * entry.unitPrice)}</td><td><Badge>{entry.status}</Badge></td></tr>)}
      </tbody></table></div> : <Empty />}
    </section>
  </>;
}

export function Customers({ store, update, selected, select, prepare, go }: DataProps & SelectProps & { prepare: (draft: Draft) => void; go: (view: View, id?: string) => void }) {
  const filters = useFilter();
  const customer = store.customers.find((entry) => entry.id === selected);
  const [creating, setCreating] = useState(false);
  function create(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const name = value(data, "name"), city = value(data, "city");
    if (!name || !city) return;
    const customerId = id();
    update((current) => ({ ...current, customers: [...current.customers, { id: customerId, name, city, email: value(data, "email"), language: value(data, "language") as Language, notes: [] }] }));
    setCreating(false); select(customerId);
  }
  function addNote(event: FormEvent<HTMLFormElement>, customerId: string) {
    const data = values(event);
    const note = value(data, "note");
    if (!note) return;
    update((current) => ({ ...current, customers: current.customers.map((entry) => entry.id === customerId ? { ...entry, notes: [...entry.notes, note] } : entry) }));
    event.currentTarget.reset();
  }
  const rows = store.customers.filter((entry) => (!filters.value || entry.language === filters.value) && matches(filters.query, entry.name, entry.email, entry.city));
  return <>
    <div className="page-toolbar"><Heading title="Clients 360°" subtitle="Retrouvez les coordonnées, commandes, rappels et notes de suivi." /><Button onClick={() => setCreating(!creating)}><Plus size={16} /> Nouveau profil</Button></div>
    {creating && <form className="panel form-grid" onSubmit={create}>
      <Field label="Nom complet"><input name="name" required maxLength={100} /></Field><Field label="Ville"><input name="city" required maxLength={80} /></Field>
      <Field label="E-mail"><input name="email" type="email" required maxLength={150} /></Field><Field label="Langue"><select name="language">{languages.map((entry) => <option key={entry}>{entry}</option>)}</select></Field>
      <div className="form-action"><Button>Créer le profil</Button></div>
    </form>}
    {customer && <section className="panel detail">
      <div className="section-heading"><h2>{customer.name}</h2><Button variant="ghost" onClick={() => select("")}>Fermer la fiche</Button></div>
      <p>{customer.city} · {customer.email} · {customer.language}</p>
      <div className="profile-grid">
        <div><h3>Historique des commandes</h3>{store.orders.filter((o) => o.customerId === customer.id).map((o) => <p key={o.id}><button className="text-link" onClick={() => go("orders", o.id)}>{o.id}</button> · {o.status} · {money(o.unitPrice * o.quantity)}</p>)}{!store.orders.some((o) => o.customerId === customer.id) && <p>Aucune commande.</p>}</div>
        <div><h3>Tâches et rappels</h3>{store.tasks.filter((t) => t.customerId === customer.id).map((t) => <p key={t.id}>{t.title} · {t.done ? "Terminé" : formattedDate(t.due)}</p>)}{!store.tasks.some((t) => t.customerId === customer.id) && <p>Aucun suivi planifié.</p>}</div>
        <div><h3>Notes internes</h3>{customer.notes.map((note, index) => <p key={index}>{note}</p>)}{!customer.notes.length && <p>Aucune note.</p>}</div>
      </div>
      <form key={customer.id} className="inline-form" onSubmit={(event) => addNote(event, customer.id)}><Field label="Note de suivi"><input required name="note" maxLength={500} /></Field><Button>Ajouter la note</Button><Button type="button" variant="outline" onClick={() => prepare({ customerId: customer.id })}>Préparer un message</Button></form>
    </section>}
    <section className="panel list-panel"><Filter {...filters} options={languages} all="Toutes les langues" />
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Client</th><th>Ville</th><th>Langue</th><th>Commandes</th></tr></thead><tbody>
        {rows.map((entry) => <tr key={entry.id}><td><button className="text-link" onClick={() => select(entry.id)}>{entry.name}</button><small>{entry.email}</small></td><td>{entry.city}</td><td>{entry.language}</td><td>{store.orders.filter((o) => o.customerId === entry.id).length}</td></tr>)}
      </tbody></table></div> : <Empty />}
    </section>
  </>;
}

export function Catalog({ store, update, selected, select }: DataProps & SelectProps) {
  const filters = useFilter();
  const [creating, setCreating] = useState(false);
  const product = store.products.find((entry) => entry.id === selected);
  const rows = store.products.filter((entry) => (!filters.value || entry.kind === filters.value) && matches(filters.query, entry.name, entry.description, entry.kind));
  function save(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const name = value(data, "name"), description = value(data, "description");
    if (!name || !description) return;
    const item: Product = { id: product?.id ?? id(), name, description, kind: value(data, "kind") as Product["kind"], price: Number(data.get("price")), stock: Number(data.get("stock")) };
    update((current) => ({ ...current, products: product ? current.products.map((entry) => entry.id === product.id ? item : entry) : [...current.products, item] }));
    select(""); setCreating(false);
  }
  return <>
    <div className="page-toolbar"><Heading title="Catalogue" subtitle="Gérez les fiches des produits et coffrets de démonstration." /><Button onClick={() => { select(""); setCreating(!creating); }}><Plus size={16} /> Ajouter une fiche</Button></div>
    {(creating || product) && <form className="panel form-grid" key={product?.id ?? "new"} onSubmit={save}>
      <Field label="Nom"><input name="name" required defaultValue={product?.name} maxLength={100} /></Field>
      <Field label="Type"><select name="kind" defaultValue={product?.kind}><option>Produit</option><option>Coffret</option></select></Field>
      <Field label="Prix (MAD)"><input name="price" type="number" min="0" max="999999" step="0.01" required defaultValue={product?.price} /></Field>
      <Field label="Stock indicatif"><input name="stock" type="number" min="0" max="999999" required defaultValue={product?.stock} /></Field>
      <Field label="Description"><textarea name="description" required defaultValue={product?.description} maxLength={500} /></Field>
      <div className="form-action actions"><Button>Enregistrer</Button><Button type="button" variant="outline" onClick={() => { select(""); setCreating(false); }}>Fermer</Button></div>
    </form>}
    <section className="panel list-panel"><Filter {...filters} options={["Produit", "Coffret"]} all="Tous les types" /></section>
    {rows.length ? <div className="cards">{rows.map((item) => <article className="panel product-card" key={item.id}><span className="resource-icon"><Flower2 size={22} /></span><Badge>{item.kind}</Badge><h2>{item.name}</h2><p>{item.description}</p><div className="section-heading"><strong>{money(item.price)}</strong><small>{item.stock} en stock</small></div><Button variant="outline" onClick={() => { setCreating(false); select(item.id); window.scrollTo(0, 0); }}>Modifier</Button></article>)}</div> : <Empty />}
  </>;
}

export function Messages({ store, initial }: { store: Store; initial: Draft }) {
  const [customerId, setCustomerId] = useState(initial.customerId ?? "");
  const [orderId, setOrderId] = useState(initial.orderId ?? "");
  const [language, setLanguage] = useState<Language>(store.customers.find((entry) => entry.id === initial.customerId)?.language ?? "Français");
  const [kind, setKind] = useState<MessageKind>(initial.customerId && !initial.orderId ? "Conseil" : "Confirmation");
  const [productId, setProductId] = useState(initial.orderId ? store.orders.find((entry) => entry.id === initial.orderId)?.productId ?? "" : "");
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const customer = store.customers.find((entry) => entry.id === customerId);
  const orders = store.orders.filter((entry) => entry.customerId === customerId);
  const order = orders.find((entry) => entry.id === orderId);
  const product = store.products.find((entry) => entry.id === (kind === "Confirmation" ? order?.productId : productId));
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || (kind !== "Conseil" && !order) || (kind !== "Suivi" && !product)) return;
    setDraft(message(language, kind, customer.name, order?.id ?? "", product?.name ?? "")); setFeedback("");
  }
  async function copy() {
    try { await navigator.clipboard.writeText(draft); setFeedback("Message copié."); }
    catch { setFeedback("Sélectionnez le texte pour le copier manuellement."); }
  }
  return <>
    <Heading title="Atelier de messages" subtitle="Préparez un brouillon personnalisé pour votre prochain échange." />
    <div className="workspace-grid">
      <form className="panel editor" onSubmit={generate} onChange={() => { setDraft(""); setFeedback(""); }}>
        <h2>Personnalisation</h2>
        <Field label="Client"><select required value={customerId} onChange={(event) => { const next = event.target.value; setCustomerId(next); setOrderId(""); setLanguage(store.customers.find((entry) => entry.id === next)?.language ?? "Français"); }}><option value="">Choisir un client</option>{store.customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
        <Field label="Modèle"><select value={kind} onChange={(event) => setKind(event.target.value as MessageKind)}><option>Confirmation</option><option>Suivi</option><option>Conseil</option></select></Field>
        <Field label="Langue"><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>{languages.map((entry) => <option key={entry}>{entry}</option>)}</select></Field>
        {kind !== "Conseil" && <Field label="Commande"><select required value={orderId} onChange={(event) => setOrderId(event.target.value)}><option value="">Choisir une commande</option>{orders.map((entry) => <option key={entry.id}>{entry.id}</option>)}</select></Field>}
        {kind === "Conseil" && <Field label="Produit"><select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choisir un produit</option>{store.products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>}
        <Button>Générer le message</Button>
      </form>
      <section className="panel editor"><h2>Brouillon du message</h2><textarea aria-label="Brouillon du message" dir="auto" value={draft} placeholder="Le brouillon apparaîtra ici." onChange={(event) => setDraft(event.target.value)} rows={8} />
        <div className="actions"><Button variant="outline" disabled={!draft.trim()} onClick={copy}><Copy size={16} /> Copier</Button><span role="status">{feedback}</span></div>
      </section>
    </div>
  </>;
}

export function Knowledge({ title, subtitle, items, selected }: { title: string; subtitle: string; items: { title: string; group: string; text: string }[]; selected: string }) {
  const filters = useFilter();
  const rows = items.filter((entry) => (!filters.value || entry.group === filters.value) && matches(filters.query, entry.title, entry.group, entry.text));
  return <><Heading title={title} subtitle={subtitle} /><section className="panel list-panel"><Filter {...filters} options={[...new Set(items.map((entry) => entry.group))]} all="Toutes les catégories" />
    {rows.length ? rows.map((entry) => <details key={entry.title + selected} open={entry.title === selected || undefined}><summary><BookOpen size={17} /><strong>{entry.title}</strong><Badge>{entry.group}</Badge></summary><p>{entry.text}</p></details>) : <Empty />}
  </section></>;
}

export function Tasks({ store, update }: DataProps) {
  const filters = useFilter();
  const [creating, setCreating] = useState(false);
  const options = ["En attente", "Terminé", "Rappel", "Tâche"];
  const today = localDate();
  const rows = store.tasks.filter((entry) => (!filters.value || filters.value === entry.kind || filters.value === (entry.done ? "Terminé" : "En attente")) && matches(filters.query, entry.title, store.customers.find((c) => c.id === entry.customerId)?.name, store.employees.find((employee) => employee.id === entry.employeeId)?.name)).sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
  function create(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const title = value(data, "title");
    if (!title) return;
    const task = { id: id(), title, due: value(data, "due"), customerId: value(data, "customer"), employeeId: value(data, "employee"), kind: value(data, "kind") as "Rappel" | "Tâche", done: false };
    update((current) => ({ ...current, tasks: [...current.tasks, task] })); setCreating(false);
  }
  return <>
    <div className="page-toolbar"><Heading title="Tâches et rappels" subtitle="Planifiez les suivis et répartissez les prochaines actions." /><Button onClick={() => setCreating(!creating)}><Plus size={16} /> Nouvelle tâche</Button></div>
    {creating && <form className="panel form-grid" onSubmit={create}>
      <Field label="Objet"><input name="title" required maxLength={120} /></Field>
      <Field label="Type"><select name="kind"><option>Tâche</option><option>Rappel</option></select></Field>
      <Field label="Échéance"><input type="date" name="due" required defaultValue={today} /></Field>
      <Field label="Client"><select name="customer"><option value="">Aucun client</option>{store.customers.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
      <Field label="Responsable"><select name="employee"><option value="">Sans responsable</option>{store.employees.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
      <div className="form-action"><Button>Enregistrer la tâche</Button></div>
    </form>}
    <section className="panel list-panel"><Filter {...filters} options={options} all="Toutes les tâches" />
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Objet</th><th>Responsable</th><th>Échéance</th><th>Action</th></tr></thead><tbody>
        {rows.map((entry) => <tr key={entry.id}><td><strong>{entry.title}</strong><small>{entry.kind} · {store.customers.find((c) => c.id === entry.customerId)?.name ?? "Interne"}</small></td><td>{store.employees.find((e) => e.id === entry.employeeId)?.name ?? "Sans responsable"}</td><td>{formattedDate(entry.due)}{!entry.done && entry.due < today && <small className="overdue">En retard</small>}</td><td><Button variant="outline" onClick={() => update((current) => ({ ...current, tasks: current.tasks.map((t) => t.id === entry.id ? { ...t, done: !t.done, completedAt: t.done ? undefined : today } : t) }))}>{entry.done ? "Rouvrir" : "Terminer"}</Button></td></tr>)}
      </tbody></table></div> : <Empty />}
    </section>
  </>;
}

export function Employees({ store, update }: DataProps) {
  const filters = useFilter();
  const [editing, setEditing] = useState("");
  const employee = store.employees.find((entry) => entry.id === editing);
  const rows = store.employees.filter((entry) => (!filters.value || filters.value === (entry.active ? "Actif" : "Inactif")) && matches(filters.query, entry.name, entry.role));
  function save(event: FormEvent<HTMLFormElement>) {
    const data = values(event);
    const name = value(data, "name");
    if (!name) return;
    const next = { id: employee?.id ?? id(), name, role: value(data, "role") as Role, active: value(data, "status") === "Actif" };
    update((current) => ({ ...current, employees: employee ? current.employees.map((entry) => entry.id === employee.id ? next : entry) : [...current.employees, next] }));
    setEditing("");
  }
  return <>
    <div className="page-toolbar"><Heading title="Équipe" subtitle="Gérez l’annuaire, les rôles et le statut des membres de l’équipe." /><Button onClick={() => setEditing("new")}><Plus size={16} /> Nouveau membre</Button></div>
    {editing && <form className="panel form-grid" key={editing} onSubmit={save}>
      <Field label="Nom complet"><input name="name" defaultValue={employee?.name} required maxLength={100} /></Field>
      <Field label="Rôle"><select name="role" defaultValue={employee?.role}>{roles.map((entry) => <option key={entry}>{entry}</option>)}</select></Field>
      <Field label="Statut"><select name="status" defaultValue={employee?.active === false ? "Inactif" : "Actif"}><option>Actif</option><option>Inactif</option></select></Field>
      <div className="form-action actions"><Button>Enregistrer</Button><Button type="button" variant="outline" onClick={() => setEditing("")}>Fermer</Button></div>
    </form>}
    <section className="panel list-panel"><Filter {...filters} options={["Actif", "Inactif"]} all="Tous les statuts" />
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Membre</th><th>Rôle</th><th>Statut</th><th>Tâches ouvertes</th><th>Action</th></tr></thead><tbody>
        {rows.map((entry) => <tr key={entry.id}><td><strong>{entry.name}</strong></td><td>{entry.role}</td><td><Badge>{entry.active ? "Actif" : "Inactif"}</Badge></td><td>{store.tasks.filter((task) => task.employeeId === entry.id && !task.done).length}</td><td><Button variant="outline" onClick={() => setEditing(entry.id)}>Modifier</Button></td></tr>)}
      </tbody></table></div> : <Empty />}
    </section>
  </>;
}
