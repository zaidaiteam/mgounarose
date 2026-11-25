export const roles = [
  "admin",
  "manager",
  "advisor",
  "logistics",
  "preparation",
] as const;
export type StaffRole = (typeof roles)[number];
export const statuses = [
  "new",
  "contacting",
  "callback",
  "confirmed",
  "preparing",
  "dispatched",
  "delivered",
  "failed_delivery",
  "cancelled",
  "return_requested",
  "returned",
] as const;
export type Status = (typeof statuses)[number];
export const statusLabels: Record<Status, string> = {
  new: "À confirmer",
  contacting: "Contact en cours",
  callback: "Rappel prévu",
  confirmed: "Confirmée",
  preparing: "En préparation",
  dispatched: "Expédiée",
  delivered: "Livrée",
  failed_delivery: "Échec de livraison",
  cancelled: "Annulée",
  return_requested: "Retour demandé",
  returned: "Retournée",
};
export const roleLabels: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
  advisor: "Conseiller",
  logistics: "Logistique",
  preparation: "Préparation",
};
export const staffLanguages = ["fr", "darija", "ar", "en"] as const;
export type StaffLanguage = (typeof staffLanguages)[number];

export type Employee = {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
};
export type Customer = {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  language: StaffLanguage;
  advisor_id: string | null;
  notes: string[];
  addresses: {
    id: string;
    address: string;
    city: string | null;
    country: string;
  }[];
  preferences: {
    preferred_channel: string | null;
    marketing_opt_in: boolean;
    consent_at: string | null;
  } | null;
};
export type Order = {
  id: string;
  reference: string;
  status: Status;
  version: number;
  created_at: string;
  customer_id: string | null;
  customer_name: string | null;
  advisor_id: string | null;
  preparation_id: string | null;
  logistics_id: string | null;
  total: number | null;
  shipping: number | null;
  discount: number | null;
  currency: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_city: string | null;
  items: {
    id: string;
    title: string;
    quantity: number;
    unit_price: number | null;
  }[];
  history: { status: Status; at: string }[];
};
export type Variant = {
  id: string;
  title: string;
  price: number | null;
  stock: number | null;
  preorder: boolean;
  components: { variant_id: string; title: string; quantity: number }[];
};
export type Product = {
  id: string;
  title: string;
  kind: "product" | "bundle";
  variants: Variant[];
};
export type Template = {
  id: string;
  title: string;
  category: string;
  language: StaffLanguage;
  body: string;
  approved: boolean;
  version: number;
};
export type Guide = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  language: StaffLanguage;
  approved: boolean;
  file_available: boolean | null;
};
export type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
  language: StaffLanguage;
  approved: boolean;
};
export type Task = {
  id: string;
  title: string;
  kind: "task" | "callback";
  status: string;
  due_at: string | null;
  completed_at: string | null;
  assignee_id: string;
  order_id: string | null;
  customer_id: string | null;
};
export type Complaint = {
  id: string;
  customer_id: string;
  order_id: string | null;
  category: string;
  details: string | null;
  status: string;
};
export type Conversation = {
  id: string;
  customer_id: string;
  channel: string;
  status: string;
  messages: {
    id: string;
    direction: string;
    body: string;
    created_at: string;
  }[];
};
export type Audit = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
};
export type Workspace = {
  employees: Employee[];
  customers: Customer[];
  orders: Order[];
  products: Product[];
  templates: Template[];
  guides: Guide[];
  faqs: FAQ[];
  tasks: Task[];
  complaints: Complaint[];
  conversations: Conversation[];
  audit: Audit[];
};
