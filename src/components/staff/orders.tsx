import { Field, Empty, Badge } from "@/components/fields";
import { money } from "@/lib/domain";
import type { Actor } from "@/lib/staff/repository";
import {
  statusLabels,
  type Status,
  type StaffRole,
  type Workspace,
} from "@/lib/staff/types";
import { StaffForm, EmployeeField } from "./forms";
import { OrderFields } from "./order-fields";

const advisorActions: Partial<Record<Status, Status[]>> = {
  new: ["confirmed", "cancelled"],
  contacting: ["confirmed", "cancelled"],
  callback: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  preparing: ["cancelled"],
  delivered: ["return_requested"],
  failed_delivery: ["cancelled"],
};
const logisticsActions: Partial<Record<Status, Status[]>> = {
  preparing: ["dispatched"],
  dispatched: ["delivered", "failed_delivery"],
  failed_delivery: ["return_requested"],
  return_requested: ["returned"],
};
const preparationActions: Partial<Record<Status, Status[]>> = {
  confirmed: ["preparing"],
  failed_delivery: ["preparing"],
};
const actionLabels: Partial<Record<Status, string>> = {
  confirmed: "Confirmer",
  preparing: "Mettre en préparation",
  dispatched: "Marquer expédiée",
  delivered: "Marquer livrée",
  failed_delivery: "Signaler un échec",
  cancelled: "Confirmer l’annulation",
  return_requested: "Ouvrir un retour",
  returned: "Clôturer le retour",
};
function allowed(role: StaffRole, status: Status) {
  if (role === "advisor") return advisorActions[status] ?? [];
  if (role === "preparation") return preparationActions[status] ?? [];
  if (role === "logistics") return logisticsActions[status] ?? [];
  return [
    ...(advisorActions[status] ?? []),
    ...(preparationActions[status] ?? []),
    ...(logisticsActions[status] ?? []),
  ];
}
export const staffDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
export const staffMoney = (value: number) => money(Math.round(value * 100));

export function StaffOrders({
  data,
  actor,
  selected,
  filter,
}: {
  data: Workspace;
  actor: Actor;
  selected?: string;
  filter?: string;
}) {
  const manage = ["admin", "manager"].includes(actor.role);
  const items = data.products.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      title: product.title + " · " + variant.title,
      price: variant.price,
    })),
  );
  const customers = data.customers.map(({ id, name, addresses }) => ({
    id,
    name,
    addresses: addresses.map((item) => ({
      id: item.id,
      label: [item.address, item.city].filter(Boolean).join(", "),
    })),
  }));
  const orders = data.orders.filter(
    (order) => !filter || order.status === filter,
  );
  return (
    <>
      <form method="get" className="inline-form staff-search">
        <input type="hidden" name="section" value="orders" />
        <Field label="Statut">
          <select name="status" defaultValue={filter ?? ""}>
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-outline">Filtrer</button>
      </form>
      {(manage || actor.role === "advisor") &&
        !!customers.length &&
        !!items.length && (
          <details className="panel detail">
            <summary>Nouvelle commande</summary>
            <StaffForm
              action="order.create"
              section="orders"
              label="Créer la commande"
            >
              <OrderFields
                people={customers}
                items={items}
                editorial={manage}
              />
            </StaffForm>
          </details>
        )}
      <section className="panel detail">
        {orders.length ? (
          orders.map((order) => (
            <details
              className="staff-detail"
              key={order.id}
              open={selected === order.id || undefined}
            >
              <summary>
                <strong>RCH-{order.reference}</strong>
                {order.customer_name && <span>{order.customer_name}</span>}
                <Badge>{statusLabels[order.status]}</Badge>
              </summary>
              {order.delivery_address && (
                <p>
                  {[
                    order.delivery_phone,
                    order.delivery_address,
                    order.delivery_city,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {order.total != null && (
                <p>
                  <strong>Total COD {staffMoney(order.total)}</strong> ·
                  Livraison {staffMoney(order.shipping ?? 0)} · Remise{" "}
                  {staffMoney(order.discount ?? 0)}
                </p>
              )}
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.title}
                    {item.unit_price != null &&
                      " · " + staffMoney(item.unit_price)}
                  </li>
                ))}
              </ul>
              <h3>Historique</h3>
              {order.history.length ? (
                <ol>
                  {order.history.map((entry, index) => (
                    <li key={index}>
                      {staffDate(entry.at)} · {statusLabels[entry.status]}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>Aucun évènement de statut.</p>
              )}
              {data.tasks.some((task) => task.order_id === order.id) && (
                <ul>
                  {data.tasks
                    .filter((task) => task.order_id === order.id)
                    .map((task) => (
                      <li key={task.id}>
                        <a
                          className="text-link"
                          href={`?section=tasks&id=${task.id}`}
                        >
                          {task.title}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
              <div className="actions">
                {allowed(actor.role, order.status).map((status) => (
                  <StaffForm
                    key={status}
                    inline
                    action="order.transition"
                    section="orders"
                    fields={{ id: order.id, version: order.version, status }}
                    label={actionLabels[status] ?? statusLabels[status]}
                  />
                ))}
                {order.customer_id && (
                  <a
                    className="btn btn-outline"
                    href={`?section=messages&customer=${order.customer_id}&order=${order.id}`}
                  >
                    Préparer un message
                  </a>
                )}
              </div>
              <details>
                <summary>Planifier un rappel</summary>
                <StaffForm
                  action="task.create"
                  section="orders"
                  fields={{ order_id: order.id, kind: "callback" }}
                  label="Enregistrer le rappel"
                >
                  <Field label="Objet">
                    <input
                      name="title"
                      required
                      maxLength={120}
                      defaultValue="Rappel de suivi"
                    />
                  </Field>
                  <Field label="Date">
                    <input name="due" type="date" required />
                  </Field>
                  {manage && (
                    <EmployeeField
                      name="assignee_id"
                      label="Responsable"
                      list={data.employees}
                    />
                  )}
                </StaffForm>
              </details>
              {manage && (
                <details>
                  <summary>Affecter la préparation et la livraison</summary>
                  <StaffForm
                    action="order.assign"
                    section="orders"
                    label="Enregistrer l’affectation"
                    fields={{ id: order.id, version: order.version }}
                  >
                    <EmployeeField
                      name="preparation_id"
                      label="Préparation"
                      list={data.employees.filter(
                        (item) => item.role === "preparation",
                      )}
                      initial={order.preparation_id}
                    />
                    <EmployeeField
                      name="logistics_id"
                      label="Logistique"
                      list={data.employees.filter(
                        (item) => item.role === "logistics",
                      )}
                      initial={order.logistics_id}
                    />
                  </StaffForm>
                </details>
              )}
            </details>
          ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
