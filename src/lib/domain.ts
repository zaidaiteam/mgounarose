export const languages = ["Français", "Darija", "العربية", "English"] as const;
export type Language = typeof languages[number];
export const statuses = ["À confirmer", "Confirmée", "Expédiée", "Livrée", "Annulée"] as const;
export type OrderStatus = typeof statuses[number];
export const roles = ["Conseiller", "Responsable", "Logistique"] as const;
export type Role = typeof roles[number];
export type Customer = { id: string; name: string; city: string; email: string; language: Language; notes: string[] };
export type Order = { id: string; customerId: string; productId: string; quantity: number; unitPrice: number; status: OrderStatus; date: string };
export type Product = { id: string; name: string; kind: "Produit" | "Coffret"; price: number; stock: number; description: string };
export type Employee = { id: string; name: string; role: Role; active: boolean };
export type Task = { id: string; title: string; due: string; customerId: string; employeeId: string; kind: "Rappel" | "Tâche"; done: boolean; completedAt?: string };
export type Store = { customers: Customer[]; orders: Order[]; products: Product[]; tasks: Task[]; employees: Employee[] };
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  "À confirmer": ["Confirmée", "Annulée"],
  Confirmée: ["Expédiée", "Annulée"],
  Expédiée: ["Livrée"],
  Livrée: [],
  Annulée: [],
};
export function updateOrder(store: Store, id: string, status: OrderStatus): Store {
  const order = store.orders.find((entry) => entry.id === id);
  if (!order || !transitions[order.status].includes(status)) return store;
  return { ...store, orders: store.orders.map((entry) => entry.id === id ? { ...entry, status } : entry) };
}
export const localDate = (date = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
export function dateAgo(days: number, now = new Date()) {
  const date = new Date(localDate(now) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function matches(query: string, ...fields: unknown[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  return normalize(fields.join(" ")).includes(normalize(query));
}
export const money = (value: number) => new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(value) + " MAD";
export type MessageKind = "Confirmation" | "Suivi" | "Conseil";
export function message(language: Language, kind: MessageKind, name: string, order: string, product: string) {
  const recipient = name.trim();
  const templates = {
    Français: [
      `Bonjour ${recipient}, pouvez-vous confirmer votre commande ${order} pour ${product} en répondant à ce message ?`,
      `Bonjour ${recipient}, nous revenons vers vous au sujet de votre commande ${order}. Avez-vous besoin d’aide ?`,
      `Bonjour ${recipient}, avez-vous des questions sur l’utilisation de ${product} ? Nous serons ravis de vous aider.`,
    ],
    Darija: [
      `Salam ${recipient}, wach t9dri/t9der t2ekdi/t2eked lina la commande ${order} dyal ${product} b jawab 3la had lmessage?`,
      `Salam ${recipient}, bghina nswlo 3la la commande ${order}. Wach khassk chi mosa3ada?`,
      `Salam ${recipient}, ila 3ndk chi sou2al 3la kifach tsta3mli/tsta3mel ${product}, 7na hna bach n3awnouk.`,
    ],
    "العربية": [
      `مرحبًا ${recipient}، هل يمكنك تأكيد طلبك ${order} لمنتج ${product} بالرد على هذه الرسالة؟`,
      `مرحبًا ${recipient}، نتواصل معك لمتابعة طلبك ${order}. هل تحتاج إلى مساعدة؟`,
      `مرحبًا ${recipient}، هل لديك أسئلة عن طريقة استخدام ${product}؟ يسعدنا مساعدتك.`,
    ],
    English: [
      `Hello ${recipient}, could you reply to confirm your order ${order} for ${product}?`,
      `Hello ${recipient}, we’re checking in about order ${order}. Is there anything we can help you with?`,
      `Hello ${recipient}, do you have any questions about using ${product}? We’re happy to help.`,
    ],
  };
  return templates[language][kind === "Confirmation" ? 0 : kind === "Suivi" ? 1 : 2] + "\n\nM’Gouna Rose";
}
