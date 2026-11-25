import { useState, type FormEvent } from "react";
import { BookOpen, Flower2, Plus } from "lucide-react";
import {
  Badge,
  Empty,
  Field,
  Filter,
  Heading,
  formattedDate,
} from "@/components/fields";
import { Button } from "@/components/ui/button";
import type { Update, View } from "@/components/hub";
import type { Draft } from "@/components/message-library";
import {
  demoCopy,
  languages,
  localDate,
  matches,
  money,
  noteOptions,
  orderAmounts,
  roles,
  taskTopics,
  toCents,
  variantOptions,
  type KnowledgeRecord,
  type Product,
  type Role,
  type Store,
  type Task,
} from "@/lib/domain";
import { demoCustomers, demoEmployees } from "@/lib/fixtures";

type DataProps = { store: Store; update: Update };
type SelectProps = { selected: string; select: (id: string) => void };
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

function useFilter() {
  const [query, setQuery] = useState("");
  const [value, setValue] = useState("");
  return { query, setQuery, value, setValue };
}

export function Customers({
  store,
  update,
  selected,
  select,
  prepare,
  go,
}: DataProps &
  SelectProps & {
    prepare: (draft: Draft) => void;
    go: (view: View, id?: string) => void;
  }) {
  const filters = useFilter();
  const customer = store.customers.find((entry) => entry.id === selected);
  const [creating, setCreating] = useState(false);
  const available = demoCustomers.filter(
    (item) => !store.customers.some((customer) => customer.id === item.id),
  );
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = available.find(
      (entry) =>
        entry.id === value(new FormData(event.currentTarget), "customer"),
    );
    if (!item) return;
    update((current) =>
      current.customers.some((entry) => entry.id === item.id)
        ? current
        : {
            ...current,
            customers: [...current.customers, { ...item, notes: [] }],
          },
    );
    setCreating(false);
    select(item.id);
  }
  function addNote(event: FormEvent<HTMLFormElement>, customerId: string) {
    event.preventDefault();
    const note = noteOptions.find(
      (item) => item === value(new FormData(event.currentTarget), "note"),
    );
    if (!note) return;
    update((current) => ({
      ...current,
      customers: current.customers.map((entry) =>
        entry.id === customerId && !entry.notes.includes(note)
          ? { ...entry, notes: [...entry.notes, note] }
          : entry,
      ),
    }));
  }
  const rows = store.customers.filter(
    (entry) =>
      (!filters.value || entry.language === filters.value) &&
      matches(filters.query, entry.name, entry.email, entry.city),
  );
  return (
    <>
      <div className="page-toolbar">
        <Heading
          title="Clients 360°"
          subtitle="Coordonnées fictives, commandes, rappels et notes de suivi."
        />
        <Button
          disabled={!available.length}
          onClick={() => setCreating(!creating)}
        >
          <Plus size={16} /> Ajouter un profil fictif
        </Button>
      </div>
      {creating && (
        <form className="panel form-grid" onSubmit={create}>
          <Field label="Profil fictif">
            <select name="customer" required>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-action">
            <Button>Ajouter le profil</Button>
          </div>
        </form>
      )}
      {customer && (
        <section className="panel detail">
          <div className="section-heading">
            <h2>{customer.name}</h2>
            <Button variant="ghost" onClick={() => select("")}>
              Fermer la fiche
            </Button>
          </div>
          <p>
            {customer.title} · {customer.email} · {customer.phone} ·{" "}
            {customer.address}, {customer.city} · {customer.language}
          </p>
          <div className="profile-grid">
            <div>
              <h3>Historique des commandes</h3>
              {store.orders
                .filter((o) => o.customerId === customer.id)
                .map((o) => (
                  <p key={o.id}>
                    <button
                      className="text-link"
                      onClick={() => go("orders", o.id)}
                    >
                      {o.id}
                    </button>{" "}
                    · {o.status} · {money(orderAmounts(o).total)}
                  </p>
                ))}
              {!store.orders.some((o) => o.customerId === customer.id) && (
                <p>Aucune commande.</p>
              )}
            </div>
            <div>
              <h3>Tâches et rappels</h3>
              {store.tasks
                .filter((t) => t.customerId === customer.id)
                .map((t) => (
                  <p key={t.id}>
                    <button
                      className="text-link"
                      onClick={() => go("tasks", t.id)}
                    >
                      {t.title}
                    </button>{" "}
                    · {t.done ? "Terminé" : formattedDate(t.due)}
                  </p>
                ))}
              {!store.tasks.some((t) => t.customerId === customer.id) && (
                <p>Aucun suivi planifié.</p>
              )}
            </div>
            <div>
              <h3>Notes internes</h3>
              {customer.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              {!customer.notes.length && <p>Aucune note.</p>}
            </div>
          </div>
          <form
            key={customer.id}
            className="inline-form"
            onSubmit={(event) => addNote(event, customer.id)}
          >
            <Field label="Note de suivi">
              <select name="note" required>
                <option value="">Choisir une note</option>
                {noteOptions
                  .filter((item) => !customer.notes.includes(item))
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </Field>
            <Button disabled={customer.notes.length === noteOptions.length}>
              Ajouter la note
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                prepare({ customerId: customer.id, kind: "Rappel" })
              }
            >
              Préparer un message
            </Button>
          </form>
        </section>
      )}
      <section className="panel list-panel">
        <Filter {...filters} options={languages} all="Toutes les langues" />
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Ville</th>
                  <th>Langue</th>
                  <th>Commandes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => select(entry.id)}
                      >
                        {entry.name}
                      </button>
                      <small>{entry.email}</small>
                    </td>
                    <td>{entry.city}</td>
                    <td>{entry.language}</td>
                    <td>
                      {
                        store.orders.filter((o) => o.customerId === entry.id)
                          .length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}

function CatalogEditor({
  product,
  products,
  onSave,
  onClose,
}: {
  product: Product;
  products: Product[];
  onSave: (item: Product) => void;
  onClose: () => void;
}) {
  const options = variantOptions(products).filter(
    (item) => item.kind === "Produit",
  );
  const [error, setError] = useState("");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const variants = product.variants.map((variant) => {
      const price = value(data, variant.id + "-price"),
        stock = value(data, variant.id + "-stock");
      return {
        ...variant,
        price: price ? toCents(price) : null,
        stock: stock ? Number(stock) : null,
      };
    });
    const components =
      product.kind === "Coffret"
        ? options.flatMap((item) => {
            const quantity = Number(data.get(item.id));
            return quantity ? [{ variantId: item.id, quantity }] : [];
          })
        : [];
    if (
      variants.some(
        (item) => item.price !== null && !Number.isSafeInteger(item.price),
      )
    )
      return setError("Vérifiez les prix fictifs saisis.");
    onSave({ ...product, variants, components });
  }
  return (
    <form className="panel editor" onSubmit={save}>
      <div className="section-heading">
        <h2>{product.name}</h2>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fermer la fiche
        </Button>
      </div>
      <p>
        Prix, stock et composition saisis ici sont des valeurs de simulation.
      </p>
      {product.variants.map((variant) => (
        <fieldset className="variant-fields" key={variant.id}>
          <legend>
            {variant.size || "Coffret"} · {variant.availability}
          </legend>
          <Field label={`Prix fictif ${variant.size} (MAD)`}>
            <input
              type="number"
              name={variant.id + "-price"}
              min="0"
              max="999999.99"
              step=".01"
              defaultValue={variant.price === null ? "" : variant.price / 100}
            />
          </Field>
          <Field label={`Stock fictif ${variant.size}`.trim()}>
            <input
              type="number"
              name={variant.id + "-stock"}
              min="0"
              max="999999"
              defaultValue={variant.stock ?? ""}
            />
          </Field>
        </fieldset>
      ))}
      {product.kind === "Coffret" && (
        <fieldset className="variant-fields">
          <legend>Composants du coffret · quantité fictive</legend>
          {options.map((item) => (
            <Field key={item.id} label={item.label}>
              <input
                type="number"
                name={item.id}
                min="0"
                max="999"
                defaultValue={
                  product.components.find(
                    (component) => component.variantId === item.id,
                  )?.quantity ?? ""
                }
              />
            </Field>
          ))}
        </fieldset>
      )}
      {error && <p role="alert">{error}</p>}
      <div>
        <Button>Enregistrer la fiche</Button>
      </div>
    </form>
  );
}

export function Catalog({
  store,
  update,
  selected,
  select,
}: DataProps & SelectProps) {
  const filters = useFilter();
  const product = store.products.find((entry) => entry.id === selected);
  const variants = variantOptions(store.products);
  const rows = store.products.filter(
    (item) =>
      (!filters.value ||
        item.kind === filters.value ||
        item.variants.some(
          (variant) => variant.availability === filters.value,
        )) &&
      matches(
        filters.query,
        item.name,
        item.kind,
        ...item.variants.flatMap((variant) => [
          variant.size,
          variant.availability,
        ]),
      ),
  );
  return (
    <>
      <Heading
        title="Catalogue"
        subtitle="Variantes et coffrets M’Gouna Rose. Les valeurs de simulation sont identifiées."
      />
      {product && (
        <CatalogEditor
          key={product.id}
          product={product}
          products={store.products}
          onClose={() => select("")}
          onSave={(item) => {
            update((current) => ({
              ...current,
              products: current.products.map((entry) =>
                entry.id === item.id ? item : entry,
              ),
            }));
            select("");
          }}
        />
      )}
      <section className="panel list-panel">
        <Filter
          {...filters}
          options={["Produit", "Coffret", "Précommande"]}
          all="Tous les types"
        />
      </section>
      {rows.length ? (
        <div className="cards">
          {rows.map((item) => (
            <article className="panel product-card" key={item.id}>
              <span className="resource-icon">
                <Flower2 size={22} />
              </span>
              <Badge>{item.kind}</Badge>
              <h2>{item.name}</h2>
              <ul>
                {item.variants.map((variant) => (
                  <li key={variant.id}>
                    {variant.size || "Coffret"} ·{" "}
                    {variant.availability === "Précommande"
                      ? "Précommande · "
                      : ""}
                    {variant.price === null
                      ? "Prix non renseigné"
                      : `${money(variant.price)} fictifs`}
                    {variant.stock === null
                      ? ""
                      : ` · Stock fictif : ${variant.stock}`}
                  </li>
                ))}
              </ul>
              {item.kind === "Coffret" &&
                (item.components.length ? (
                  <ul>
                    {item.components.map((component) => (
                      <li key={component.variantId}>
                        {component.quantity} ×{" "}
                        {
                          variants.find(
                            (variant) => variant.id === component.variantId,
                          )?.label
                        }{" "}
                        (simulation)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <small>Composition non renseignée</small>
                ))}
              <Button
                variant="outline"
                onClick={() => {
                  select(item.id);
                  window.scrollTo(0, 0);
                }}
              >
                Modifier {item.name}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </>
  );
}

export function Knowledge({
  kind,
  title,
  subtitle,
  items,
  selected,
  update,
  share,
}: {
  kind: KnowledgeRecord["kind"];
  title: string;
  subtitle: string;
  items: KnowledgeRecord[];
  selected: string;
  update: Update;
  share: (id: string) => void;
}) {
  const filters = useFilter();
  const [editing, setEditing] = useState("");
  const [error, setError] = useState("");
  const record = items.find((entry) => entry.id === editing);
  const rows = items.filter(
    (entry) =>
      (!filters.value || entry.group === filters.value) &&
      matches(filters.query, entry.title, entry.group, entry.text),
  );
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = {
      id: record?.id ?? crypto.randomUUID(),
      kind,
      title: value(data, "title"),
      group: value(data, "group"),
      text: value(data, "text"),
    };
    if (
      ![item.title, item.group, item.text].every(
        (entry) => entry && demoCopy(entry),
      )
    )
      return setError(
        "Utilisez un texte générique sans coordonnées ni lien externe.",
      );
    update((current) => ({
      ...current,
      knowledge: record
        ? current.knowledge.map((entry) =>
            entry.id === item.id ? item : entry,
          )
        : [...current.knowledge, item],
    }));
    setEditing("");
    setError("");
  }
  return (
    <>
      <div className="page-toolbar">
        <Heading title={title} subtitle={subtitle} />
        <Button
          disabled={items.length >= 50}
          onClick={() => {
            setEditing("new");
            setError("");
          }}
        >
          Ajouter un article
        </Button>
      </div>
      {editing && (
        <form className="panel editor" key={editing} onSubmit={save}>
          <Field label="Titre">
            <input
              required
              name="title"
              maxLength={100}
              defaultValue={record?.title}
            />
          </Field>
          <Field label="Catégorie">
            <input
              required
              name="group"
              maxLength={60}
              defaultValue={record?.group}
            />
          </Field>
          <Field label="Contenu générique">
            <textarea
              required
              name="text"
              maxLength={3000}
              defaultValue={record?.text}
              rows={5}
            />
          </Field>
          {error && <p role="alert">{error}</p>}
          <div className="actions">
            <Button>Enregistrer l’article</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing("")}
            >
              Fermer l’éditeur
            </Button>
          </div>
        </form>
      )}
      <section className="panel list-panel">
        <Filter
          {...filters}
          options={[...new Set(items.map((entry) => entry.group))]}
          all="Toutes les catégories"
        />
        {rows.length ? (
          rows.map((entry) => (
            <details
              key={entry.id + selected}
              open={entry.id === selected || undefined}
            >
              <summary>
                <BookOpen size={17} />
                <strong>{entry.title}</strong>
                <Badge>{entry.group}</Badge>
              </summary>
              <p className="knowledge-text">{entry.text}</p>
              <div className="actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(entry.id);
                    setError("");
                    window.scrollTo(0, 0);
                  }}
                >
                  Modifier l’article
                </Button>
                {kind === "guide" && (
                  <Button variant="outline" onClick={() => share(entry.id)}>
                    Préparer le partage
                  </Button>
                )}
              </div>
            </details>
          ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}

export function Tasks({
  store,
  update,
  selected,
  go,
}: DataProps & { selected: string; go: (view: View, id?: string) => void }) {
  const filters = useFilter();
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const today = localDate();
  const employeeName = (id: string) =>
    store.employees.find((item) => item.id === id)?.name;
  const customerName = (id: string) =>
    store.customers.find((item) => item.id === id)?.name;
  const rows = store.tasks
    .filter(
      (task) =>
        (!filters.value ||
          [task.kind, task.done ? "Terminé" : "En attente"].includes(
            filters.value,
          )) &&
        matches(
          filters.query,
          task.title,
          task.orderId,
          employeeName(task.employeeId),
          customerName(task.customerId),
        ),
    )
    .sort(
      (a, b) =>
        Number(b.id === selected) - Number(a.id === selected) ||
        Number(a.done) - Number(b.done) ||
        a.due.localeCompare(b.due),
    );
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = taskTopics.find((item) => item === value(data, "title"));
    if (!title) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      due: value(data, "due"),
      customerId,
      employeeId: value(data, "employee"),
      orderId: value(data, "order") || undefined,
      kind: value(data, "kind") === "Rappel" ? "Rappel" : "Tâche",
      done: false,
    };
    update((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setCreating(false);
    setCustomerId("");
  }
  return (
    <>
      <div className="page-toolbar">
        <Heading
          title="Tâches et rappels"
          subtitle="Planifiez les suivis et répartissez les prochaines actions."
        />
        <Button onClick={() => setCreating(!creating)}>
          <Plus size={16} /> Nouvelle tâche
        </Button>
      </div>
      {creating && (
        <form className="panel form-grid" onSubmit={create}>
          <Field label="Objet">
            <select name="title">
              {taskTopics.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select name="kind">
              <option>Tâche</option>
              <option>Rappel</option>
            </select>
          </Field>
          <Field label="Échéance">
            <input type="date" name="due" required defaultValue={today} />
          </Field>
          <Field label="Client fictif">
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">Aucun client</option>
              {store.customers.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </Field>
          {customerId && (
            <Field label="Commande liée">
              <select name="order" key={customerId}>
                <option value="">Aucune commande</option>
                {store.orders
                  .filter((item) => item.customerId === customerId)
                  .map((item) => (
                    <option key={item.id}>{item.id}</option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Responsable">
            <select name="employee">
              <option value="">Sans responsable</option>
              {store.employees
                .filter((entry) => entry.active)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-action">
            <Button>Enregistrer la tâche</Button>
          </div>
        </form>
      )}
      <section className="panel list-panel">
        <Filter
          {...filters}
          options={["En attente", "Terminé", "Rappel", "Tâche"]}
          all="Toutes les tâches"
        />
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Objet</th>
                  <th>Responsable</th>
                  <th>Échéance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr
                    key={entry.id}
                    className={
                      selected === entry.id ? "selected-row" : undefined
                    }
                  >
                    <td>
                      <strong>{entry.title}</strong>
                      <small>
                        {entry.kind} ·{" "}
                        {customerName(entry.customerId) ?? "Interne"}
                      </small>
                      {entry.orderId && (
                        <button
                          className="text-link"
                          onClick={() => go("orders", entry.orderId)}
                        >
                          {entry.orderId}
                        </button>
                      )}
                    </td>
                    <td>
                      {employeeName(entry.employeeId) ?? "Sans responsable"}
                    </td>
                    <td>
                      {formattedDate(entry.due)}
                      {!entry.done && entry.due < today && (
                        <small className="overdue">En retard</small>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        onClick={() =>
                          update((current) => ({
                            ...current,
                            tasks: current.tasks.map((task) =>
                              task.id === entry.id
                                ? {
                                    ...task,
                                    done: !task.done,
                                    completedAt: task.done ? undefined : today,
                                  }
                                : task,
                            ),
                          }))
                        }
                      >
                        {entry.done ? "Rouvrir" : "Terminer"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}

export function Employees({
  store,
  update,
  selected,
}: DataProps & { selected: string }) {
  const filters = useFilter();
  const [editing, setEditing] = useState("");
  const [closed, setClosed] = useState("");
  const target = editing || (closed !== selected ? selected : "");
  const employee = store.employees.find((entry) => entry.id === target);
  const available = demoEmployees.filter(
    (entry) => !store.employees.some((item) => item.id === entry.id),
  );
  const rows = store.employees.filter(
    (entry) =>
      (!filters.value ||
        filters.value === (entry.active ? "Actif" : "Inactif")) &&
      matches(filters.query, entry.name, entry.role),
  );
  function close() {
    setEditing("");
    setClosed(selected);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fixture =
      employee ?? available.find((item) => item.id === value(data, "member"));
    if (!fixture) return;
    const next = {
      ...fixture,
      role: value(data, "role") as Role,
      active: value(data, "status") === "Actif",
    };
    update((current) => ({
      ...current,
      employees: employee
        ? current.employees.map((entry) =>
            entry.id === employee.id ? next : entry,
          )
        : [...current.employees, next],
    }));
    close();
  }
  return (
    <>
      <div className="page-toolbar">
        <Heading
          title="Équipe"
          subtitle="Gérez les rôles et statuts des membres fictifs."
        />
        <Button disabled={!available.length} onClick={() => setEditing("new")}>
          <Plus size={16} /> Nouveau membre fictif
        </Button>
      </div>
      {target && (
        <form className="panel form-grid" key={target} onSubmit={save}>
          {employee ? (
            <h2>{employee.name}</h2>
          ) : (
            <Field label="Membre fictif">
              <select name="member" required>
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Rôle">
            <select name="role" defaultValue={employee?.role}>
              {roles.map((entry) => (
                <option key={entry}>{entry}</option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select
              name="status"
              defaultValue={employee?.active === false ? "Inactif" : "Actif"}
            >
              <option>Actif</option>
              <option>Inactif</option>
            </select>
          </Field>
          <div className="form-action actions">
            <Button>Enregistrer le membre</Button>
            <Button type="button" variant="outline" onClick={close}>
              Fermer
            </Button>
          </div>
        </form>
      )}
      <section className="panel list-panel">
        <Filter
          {...filters}
          options={["Actif", "Inactif"]}
          all="Tous les statuts"
        />
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Tâches ouvertes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.name}</strong>
                    </td>
                    <td>{entry.role}</td>
                    <td>
                      <Badge>{entry.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td>
                      {
                        store.tasks.filter(
                          (task) => task.employeeId === entry.id && !task.done,
                        ).length
                      }
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(entry.id)}
                      >
                        Modifier {entry.name}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
