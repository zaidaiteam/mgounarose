import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
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
  localDate,
  matches,
  money,
  orderAmounts,
  statuses,
  toCents,
  transitions,
  updateOrder,
  variantOptions,
  type Order,
  type OrderStatus,
  type Store,
} from "@/lib/domain";

type Props = {
  store: Store;
  update: Update;
  selected: string;
  select: (id: string) => void;
  prepare: (draft: Draft) => void;
  go: (view: View, id?: string) => void;
};

const actionLabels: Record<OrderStatus, string> = {
  "À confirmer": "Mettre en attente",
  Confirmée: "Confirmer",
  "En préparation": "Mettre en préparation",
  Expédiée: "Marquer expédiée",
  Livrée: "Marquer livrée",
  "Échec de livraison": "Signaler un échec",
  "Retour demandé": "Ouvrir un retour",
  Retournée: "Clôturer le retour",
  Annulée: "Annuler la commande",
};
const initialLine = { variantId: "", quantity: "1", unitPrice: "" };

function OrderForm({
  store,
  onCreate,
}: {
  store: Store;
  onCreate: (order: Order) => void;
}) {
  const variants = variantOptions(store.products);
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState([{ ...initialLine, id: 0 }]);
  const [delivery, setDelivery] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");
  const customer = store.customers.find((item) => item.id === customerId);
  const lines = rows.map((row) => ({
    variantId: row.variantId,
    label:
      variants.find((variant) => variant.id === row.variantId)?.label ?? "",
    quantity: Number(row.quantity),
    unitPrice: toCents(row.unitPrice),
  }));
  const amounts = {
    lines,
    deliveryFee: toCents(delivery),
    discount: toCents(discount),
  };
  const { subtotal, total, valid } = orderAmounts(amounts);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const advisorId = String(new FormData(event.currentTarget).get("advisor"));
    if (
      !customer ||
      !store.employees.some((item) => item.id === advisorId && item.active)
    )
      return;
    if (
      !valid ||
      lines.some(
        (line) =>
          !line.label ||
          !Number.isSafeInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 999 ||
          !Number.isSafeInteger(line.unitPrice),
      )
    ) {
      return setError(
        "Vérifiez les articles et les montants. La remise doit rester inférieure ou égale au sous-total et aux frais.",
      );
    }
    if (new Set(lines.map((line) => line.variantId)).size !== lines.length)
      return setError(
        "Regroupez les quantités d’une même variante sur une seule ligne.",
      );
    onCreate({
      ...amounts,
      id: "RCH-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      status: "À confirmer",
      customerId,
      advisorId,
      date: localDate(),
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      history: [{ status: "À confirmer", at: new Date().toISOString() }],
    });
  }
  return (
    <form className="panel editor" onSubmit={submit}>
      <p>
        Les coordonnées viennent du profil fictif. Les montants saisis servent
        uniquement à la simulation.
      </p>
      <div className="profile-grid">
        <Field label="Client fictif">
          <select
            required
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Choisir un profil</option>
            {store.customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conseiller attitré">
          <select required name="advisor">
            <option value="">Choisir un membre actif</option>
            {store.employees
              .filter((item) => item.active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {customer && (
        <p>
          {customer.phone} · {customer.address}, {customer.city}
        </p>
      )}
      {rows.map((row, index) => (
        <div className="order-line" key={row.id}>
          <Field label={`Article ${index + 1}`}>
            <select
              required
              value={row.variantId}
              onChange={(event) => {
                const variant = variants.find(
                  (item) => item.id === event.target.value,
                );
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? {
                          ...item,
                          variantId: event.target.value,
                          unitPrice:
                            variant?.price == null
                              ? ""
                              : String(variant.price / 100),
                        }
                      : item,
                  ),
                );
              }}
            >
              <option value="">Choisir une variante</option>
              {variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.availability === "Précommande" ? " (précommande)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Quantité ${index + 1}`}>
            <input
              type="number"
              min="1"
              max="999"
              required
              value={row.quantity}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, quantity: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <Field label={`Prix fictif ${index + 1} (MAD)`}>
            <input
              type="number"
              min="0"
              max="999999.99"
              step=".01"
              required
              value={row.unitPrice}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, unitPrice: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          {rows.length > 1 && (
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.id !== row.id),
                )
              }
            >
              Retirer l’article {index + 1}
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={rows.length >= variants.length}
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                ...initialLine,
                id: Math.max(...current.map((item) => item.id)) + 1,
              },
            ])
          }
        >
          <Plus size={16} /> Ajouter un article
        </Button>
      </div>
      <div className="profile-grid">
        <Field label="Frais de livraison (MAD)">
          <input
            type="number"
            min="0"
            max="999999.99"
            step=".01"
            required
            value={delivery}
            onChange={(event) => setDelivery(event.target.value)}
          />
        </Field>
        <Field label="Remise (MAD)">
          <input
            type="number"
            min="0"
            max="999999.99"
            step=".01"
            required
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </Field>
      </div>
      {valid && (
        <p>
          Sous-total {money(subtotal)} ·{" "}
          <strong>Total à la livraison {money(total)}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className="overdue">
          {error}
        </p>
      )}
      <div>
        <Button>Créer la commande</Button>
      </div>
    </form>
  );
}

export function Orders({
  store,
  update,
  selected,
  select,
  prepare,
  go,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [callback, setCallback] = useState(false);
  const [cancel, setCancel] = useState(false);
  const order = store.orders.find((entry) => entry.id === selected);
  const customer = (id: string) =>
    store.customers.find((entry) => entry.id === id);
  const rows = store.orders.filter(
    (entry) =>
      (!filter || filter === entry.status) &&
      matches(
        query,
        entry.id,
        entry.status,
        entry.city,
        store.employees.find((item) => item.id === entry.advisorId)?.name,
        customer(entry.customerId)?.name,
        ...entry.lines.map((line) => line.label),
      ),
  );
  function show(id: string) {
    setCreating(false);
    setCallback(false);
    setCancel(false);
    setAssigning(false);
    select(id);
  }
  function schedule(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const employeeId = String(data.get("employee"));
    if (!store.employees.some((item) => item.id === employeeId && item.active))
      return;
    update((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: crypto.randomUUID(),
          title: "Rappeler le profil démo",
          due: String(data.get("due")),
          customerId: order.customerId,
          employeeId,
          orderId: order.id,
          kind: "Rappel",
          done: false,
        },
      ],
    }));
    setCallback(false);
  }
  function assign(event: FormEvent<HTMLFormElement>, order: Order) {
    event.preventDefault();
    const advisorId = String(new FormData(event.currentTarget).get("advisor"));
    if (!store.employees.some((item) => item.id === advisorId && item.active))
      return;
    update((current) => ({
      ...current,
      orders: current.orders.map((entry) =>
        entry.id === order.id ? { ...entry, advisorId } : entry,
      ),
    }));
    setAssigning(false);
  }
  function changeStatus(id: string, status: OrderStatus) {
    update((current) => updateOrder(current, id, status));
    setCancel(false);
  }
  return (
    <>
      <div className="page-toolbar">
        <Heading
          title="Commandes"
          subtitle="Du panier au retour, suivez chaque étape et son historique."
        />
        <Button
          onClick={() => {
            show("");
            setCreating(!creating);
          }}
        >
          <Plus size={16} /> Nouvelle commande
        </Button>
      </div>
      {creating && (
        <OrderForm
          store={store}
          onCreate={(entry) => {
            update((current) => ({
              ...current,
              orders: [entry, ...current.orders],
            }));
            show(entry.id);
          }}
        />
      )}
      {order && (
        <section
          key={order.id}
          className="panel detail"
          aria-label="Fiche de commande"
        >
          <div className="section-heading">
            <h2>{order.id}</h2>
            <Button variant="ghost" onClick={() => show("")}>
              Fermer la fiche
            </Button>
          </div>
          <p>
            {customer(order.customerId)?.name} · {order.phone} · {order.address}
            , {order.city}
          </p>
          <p>
            Conseiller attitré ·{" "}
            {store.employees.find((item) => item.id === order.advisorId)?.name}
          </p>
          <div className="profile-grid">
            <div>
              <h3>Articles</h3>
              <ul>
                {order.lines.map((line) => (
                  <li key={line.variantId}>
                    {line.quantity} × {line.label} · {money(line.unitPrice)} /
                    unité
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Total à la livraison</h3>
              <p>
                Sous-total {money(orderAmounts(order).subtotal)} · Livraison{" "}
                {money(order.deliveryFee)} · Remise {money(order.discount)}
              </p>
              <strong>{money(orderAmounts(order).total)}</strong>
            </div>
            <div>
              <h3>Historique de la commande</h3>
              <ol>
                {[...order.history].reverse().map((entry, index) => (
                  <li key={index}>
                    {entry.status} ·{" "}
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Africa/Casablanca",
                    }).format(new Date(entry.at))}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Rappels liés</h3>
              {store.tasks.some((item) => item.orderId === order.id) ? (
                <ul>
                  {store.tasks
                    .filter((item) => item.orderId === order.id)
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          className="text-link"
                          onClick={() => go("tasks", item.id)}
                        >
                          {item.title}
                        </button>{" "}
                        · {item.done ? "Terminé" : formattedDate(item.due)}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Aucun rappel planifié.</p>
              )}
            </div>
          </div>
          <div className="actions">
            <Badge>{order.status}</Badge>
            {transitions[order.status].map((status) => (
              <Button
                key={status}
                variant={status === "Annulée" ? "outline" : "default"}
                onClick={() =>
                  status === "Annulée"
                    ? setCancel(true)
                    : changeStatus(order.id, status)
                }
              >
                {actionLabels[status]}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setAssigning(!assigning)}>
              Réassigner
            </Button>
            <Button variant="outline" onClick={() => setCallback(!callback)}>
              Planifier un rappel
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                prepare({
                  customerId: order.customerId,
                  orderId: order.id,
                  kind:
                    order.status === "Échec de livraison"
                      ? "Relance de livraison"
                      : order.status === "Expédiée"
                        ? "Expédition"
                        : undefined,
                })
              }
            >
              Préparer un message
            </Button>
            <Button
              variant="ghost"
              onClick={() => go("customers", order.customerId)}
            >
              Voir le profil client
            </Button>
          </div>
          {cancel && transitions[order.status].includes("Annulée") && (
            <div className="notice actions">
              <span>Annuler cette commande fictive ?</span>
              <Button onClick={() => changeStatus(order.id, "Annulée")}>
                Confirmer l’annulation
              </Button>
              <Button variant="ghost" onClick={() => setCancel(false)}>
                Conserver la commande
              </Button>
            </div>
          )}
          {assigning && (
            <form
              className="inline-form"
              onSubmit={(event) => assign(event, order)}
            >
              <Field label="Nouveau conseiller">
                <select name="advisor" defaultValue={order.advisorId} required>
                  {store.employees
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Button>Enregistrer l’affectation</Button>
            </form>
          )}
          {callback && (
            <form
              className="inline-form"
              onSubmit={(event) => schedule(event, order)}
            >
              <Field label="Échéance du rappel">
                <input
                  type="date"
                  name="due"
                  defaultValue={localDate()}
                  required
                />
              </Field>
              <Field label="Responsable du rappel">
                <select name="employee" defaultValue={order.advisorId} required>
                  {store.employees
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Button>Enregistrer le rappel</Button>
            </form>
          )}
        </section>
      )}
      <section className="panel list-panel">
        <Filter
          query={query}
          setQuery={setQuery}
          value={filter}
          setValue={setFilter}
          options={statuses}
          all="Tous les statuts"
        />
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Articles</th>
                  <th>Total COD</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          show(entry.id);
                          window.scrollTo(0, 0);
                        }}
                      >
                        {entry.id}
                      </button>
                      <small>{formattedDate(entry.date)}</small>
                    </td>
                    <td>{customer(entry.customerId)?.name}</td>
                    <td>
                      {entry.lines.reduce(
                        (sum, line) => sum + line.quantity,
                        0,
                      )}
                    </td>
                    <td>{money(orderAmounts(entry).total)}</td>
                    <td>
                      <Badge>{entry.status}</Badge>
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
