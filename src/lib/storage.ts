import { z } from "zod";
import { catalog } from "./catalog.ts";
import {
  demoCopy,
  languages,
  noteOptions,
  orderAmounts,
  roles,
  statuses,
  taskTopics,
  templateKinds,
  transitions,
  variantOptions,
  type Store,
} from "./domain.ts";
import { demoCustomers, demoEmployees, fictionalStore } from "./fixtures.ts";
import { validTemplate } from "./templates.ts";

export const storageKey = "rose-care-demo-v2";
export const legacyStorageKey = "rose-care-demo-v1";
const date = z.iso.date();
const time = z.iso.datetime();
const id = z.string().regex(/^[\w-]{1,48}$/);
const label = z.string().trim().min(1).max(140);
const text = (limit: number) =>
  z.string().trim().min(1).max(limit).refine(demoCopy);
const orderStatus = z.enum(statuses);
const cents = z.number().int().min(0).max(99_999_999);
const quantity = z.number().int().min(1).max(999);

const schema = z.strictObject({
  customers: z
    .array(
      z.strictObject({
        id,
        name: label,
        title: z.enum(["Mme", "M."]),
        city: label,
        email: label,
        phone: label,
        address: label,
        language: z.enum(languages),
        notes: z.array(z.enum(noteOptions)).max(noteOptions.length),
      }),
    )
    .max(demoCustomers.length),
  employees: z
    .array(
      z.strictObject({
        id,
        name: label,
        role: z.enum(roles),
        active: z.boolean(),
      }),
    )
    .max(demoEmployees.length),
  products: z
    .array(
      z.strictObject({
        id,
        name: label,
        kind: z.enum(["Produit", "Coffret"]),
        variants: z
          .array(
            z.strictObject({
              id,
              size: z.string().max(24),
              availability: z.enum(["Standard", "Précommande"]),
              price: cents.nullable(),
              stock: z.number().int().min(0).max(999999).nullable(),
            }),
          )
          .min(1)
          .max(3),
        components: z
          .array(z.strictObject({ variantId: id, quantity }))
          .max(11),
      }),
    )
    .length(10),
  orders: z
    .array(
      z.strictObject({
        id: z.string().regex(/^RCH-[A-Z\d]{4,12}$/),
        customerId: id,
        lines: z
          .array(
            z.strictObject({
              variantId: id,
              label,
              quantity,
              unitPrice: cents,
            }),
          )
          .min(1)
          .max(16),
        phone: label,
        address: label,
        city: label,
        advisorId: id,
        deliveryFee: cents,
        discount: cents,
        status: orderStatus,
        date,
        history: z
          .array(z.strictObject({ status: orderStatus, at: time }))
          .min(1)
          .max(500),
      }),
    )
    .max(500),
  tasks: z
    .array(
      z.strictObject({
        id,
        title: z.enum(taskTopics),
        due: date,
        customerId: id.or(z.literal("")),
        employeeId: id.or(z.literal("")),
        orderId: id.optional(),
        kind: z.enum(["Tâche", "Rappel"]),
        done: z.boolean(),
        completedAt: date.optional(),
      }),
    )
    .max(500),
  knowledge: z
    .array(
      z.strictObject({
        id,
        kind: z.enum(["guide", "faq"]),
        title: text(100),
        group: text(60),
        text: text(3000),
      }),
    )
    .max(100),
  templates: z
    .array(
      z.strictObject({
        kind: z.enum(templateKinds),
        language: z.enum(languages),
        body: text(2000).refine(validTemplate),
      }),
    )
    .length(languages.length * templateKinds.length),
});

function unique<T>(items: T[], key: (item: T) => string) {
  return new Set(items.map(key)).size === items.length;
}

export function validateStore(raw: unknown): Store | null {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (
    ![
      data.customers,
      data.employees,
      data.orders,
      data.products,
      data.tasks,
      data.knowledge,
    ].every((rows) => unique<{ id: string }>(rows, (row) => row.id))
  )
    return null;
  if (
    !unique(
      data.templates,
      (template) => template.language + "/" + template.kind,
    )
  )
    return null;
  if (
    !data.customers.every((customer) => {
      const fixture = demoCustomers.find((item) => item.id === customer.id);
      return (
        fixture &&
        (
          [
            "name",
            "title",
            "city",
            "email",
            "phone",
            "address",
            "language",
          ] as const
        ).every((field) => customer[field] === fixture[field])
      );
    })
  )
    return null;
  if (
    !data.employees.every((employee) =>
      demoEmployees.some(
        (item) => item.id === employee.id && item.name === employee.name,
      ),
    )
  )
    return null;
  const base = catalog();
  const variants = new Map(
    variantOptions(base).map((variant) => [variant.id, variant]),
  );
  if (
    !data.products.every((product) => {
      const original = base.find((item) => item.id === product.id);
      return (
        original &&
        product.name === original.name &&
        product.kind === original.kind &&
        original.variants.length === product.variants.length &&
        unique(product.variants, (item) => item.id) &&
        product.variants.every((item) =>
          original.variants.some(
            (variant) =>
              variant.id === item.id &&
              variant.size === item.size &&
              variant.availability === item.availability,
          ),
        ) &&
        (product.kind === "Coffret" || product.components.length === 0) &&
        unique(product.components, (item) => item.variantId) &&
        product.components.every(
          (item) => variants.get(item.variantId)?.kind === "Produit",
        )
      );
    })
  )
    return null;
  const customers = new Map(data.customers.map((item) => [item.id, item]));
  const advisors = new Set(data.employees.map((item) => item.id));
  const orders = new Map(data.orders.map((item) => [item.id, item]));
  if (
    !data.orders.every((order) => {
      const customer = customers.get(order.customerId);
      return (
        customer &&
        order.phone === customer.phone &&
        order.city === customer.city &&
        order.address === customer.address &&
        advisors.has(order.advisorId) &&
        unique(order.lines, (item) => item.variantId) &&
        order.lines.every(
          (line) => variants.get(line.variantId)?.label === line.label,
        ) &&
        orderAmounts(order).valid &&
        order.history[0].status === "À confirmer" &&
        order.history.at(-1)?.status === order.status &&
        order.history.every(
          (entry, index) =>
            !index ||
            (transitions[order.history[index - 1].status].includes(
              entry.status,
            ) &&
              entry.at >= order.history[index - 1].at),
        )
      );
    })
  )
    return null;
  if (
    !data.tasks.every(
      (task) =>
        (!task.customerId || customers.has(task.customerId)) &&
        (!task.employeeId || advisors.has(task.employeeId)) &&
        (!task.orderId ||
          orders.get(task.orderId)?.customerId === task.customerId) &&
        task.done === Boolean(task.completedAt),
    )
  )
    return null;
  return data;
}

export function readDemoStorage(
  storage: Pick<Storage, "getItem" | "removeItem">,
) {
  try {
    if (storage.getItem(legacyStorageKey) !== null)
      storage.removeItem(legacyStorageKey);
    const saved = storage.getItem(storageKey);
    if (saved !== null) {
      const store =
        saved.length < 2_000_000 ? validateStore(JSON.parse(saved)) : null;
      if (store) return { store, notice: "" };
      storage.removeItem(storageKey);
      return {
        store: fictionalStore(),
        notice:
          "Les données locales incompatibles ont été remplacées par les données fictives.",
      };
    }
  } catch {
    try {
      storage.removeItem(storageKey);
    } catch {
      /* Storage may be disabled. */
    }
    return {
      store: fictionalStore(),
      notice:
        "Le stockage local n’a pas pu être lu. Les données fictives ont été chargées.",
    };
  }
  return { store: fictionalStore(), notice: "" };
}
