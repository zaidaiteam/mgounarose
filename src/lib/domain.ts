export const languages = ["Français", "Darija", "العربية", "English"] as const;
export type Language = (typeof languages)[number];
export const statuses = [
  "À confirmer",
  "Confirmée",
  "En préparation",
  "Expédiée",
  "Livrée",
  "Échec de livraison",
  "Retour demandé",
  "Retournée",
  "Annulée",
] as const;
export type OrderStatus = (typeof statuses)[number];
export const roles = ["Conseiller", "Responsable", "Logistique"] as const;
export type Role = (typeof roles)[number];
export const noteOptions = [
  "Rappeler en fin de journée",
  "Conseils de soin demandés",
  "Confirmation reçue",
  "Suivi de livraison nécessaire",
] as const;
export const taskTopics = [
  "Confirmer la commande",
  "Vérifier la livraison",
  "Préparer les conseils",
  "Rappeler le profil démo",
  "Traiter le retour",
  "Examiner la réclamation",
] as const;
export const templateKinds = [
  "Confirmation",
  "Appel manqué",
  "Rappel",
  "Expédition",
  "Retard de livraison",
  "Remerciement",
  "Partage de guide",
  "Satisfaction",
  "Réclamation",
  "Relance de livraison",
] as const;
export type TemplateKind = (typeof templateKinds)[number];
export const templateVariables = [
  "client",
  "civilite",
  "commande",
  "produits",
  "quantites",
  "prix",
  "prix_unitaires",
  "livraison",
  "remise",
  "total",
  "conseiller",
  "ville",
  "guide",
] as const;
export type TemplateVariable = (typeof templateVariables)[number];
export type OrderLine = {
  variantId: string;
  label: string;
  quantity: number;
  unitPrice: number;
};
export type Order = {
  id: string;
  customerId: string;
  lines: OrderLine[];
  phone: string;
  address: string;
  city: string;
  advisorId: string;
  deliveryFee: number;
  discount: number;
  status: OrderStatus;
  date: string;
  history: { status: OrderStatus; at: string }[];
};
export type Variant = {
  id: string;
  size: string;
  availability: "Standard" | "Précommande";
  price: number | null;
  stock: number | null;
};
export type Product = {
  id: string;
  name: string;
  kind: "Produit" | "Coffret";
  variants: Variant[];
  components: { variantId: string; quantity: number }[];
};
export type Customer = {
  id: string;
  name: string;
  title: string;
  city: string;
  email: string;
  phone: string;
  address: string;
  language: Language;
  notes: (typeof noteOptions)[number][];
};
export type Employee = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
};
export type Task = {
  id: string;
  title: (typeof taskTopics)[number];
  due: string;
  customerId: string;
  employeeId: string;
  orderId?: string;
  kind: "Rappel" | "Tâche";
  done: boolean;
  completedAt?: string;
};
export type KnowledgeRecord = {
  id: string;
  kind: "guide" | "faq";
  title: string;
  group: string;
  text: string;
};
export type Template = { kind: TemplateKind; language: Language; body: string };
export type Store = {
  customers: Customer[];
  orders: Order[];
  products: Product[];
  tasks: Task[];
  employees: Employee[];
  knowledge: KnowledgeRecord[];
  templates: Template[];
};

export const transitions: Record<OrderStatus, OrderStatus[]> = {
  "À confirmer": ["Confirmée", "Annulée"],
  Confirmée: ["En préparation", "Annulée"],
  "En préparation": ["Expédiée", "Annulée"],
  Expédiée: ["Livrée", "Échec de livraison"],
  Livrée: ["Retour demandé"],
  "Échec de livraison": ["En préparation", "Annulée", "Retour demandé"],
  "Retour demandé": ["Retournée"],
  Retournée: [],
  Annulée: [],
};

export function updateOrder(
  store: Store,
  id: string,
  status: OrderStatus,
  at = new Date().toISOString(),
): Store {
  const order = store.orders.find((entry) => entry.id === id);
  if (!order || !transitions[order.status].includes(status)) return store;
  const previous = order.history.at(-1)?.at;
  const timestamp = previous && at < previous ? previous : at;
  return {
    ...store,
    orders: store.orders.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status,
            history: [...entry.history, { status, at: timestamp }],
          }
        : entry,
    ),
  };
}

export function orderAmounts({
  lines,
  deliveryFee,
  discount,
}: Pick<Order, "lines" | "deliveryFee" | "discount">) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const gross = subtotal + deliveryFee;
  return {
    subtotal,
    total: gross - discount,
    valid:
      Number.isSafeInteger(gross) &&
      Number.isSafeInteger(discount) &&
      discount >= 0 &&
      discount <= gross,
  };
}
export const toCents = (value: string) =>
  /^\d{1,6}(?:\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : NaN;
export const money = (cents: number) =>
  new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(
    cents / 100,
  ) + " MAD";
export const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function dateAgo(days: number, now = new Date()) {
  const date = new Date(localDate(now) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function matches(query: string, ...fields: unknown[]) {
  const normalize = (input: string) =>
    input
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  const haystack = normalize(fields.join(" "));
  return normalize(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
export function variantOptions(products: Product[]) {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productId: product.id,
      kind: product.kind,
      label: product.name + (variant.size ? " · " + variant.size : ""),
    })),
  );
}
export function demoCopy(text: string) {
  // Free-form editorial fields are for generic copy. Catch obvious contact details.
  return !/(?:https?:\/\/|www\.|mailto:|\S@\S|(?:\d[\s().+-]*){7,})/iu.test(
    text,
  );
}
