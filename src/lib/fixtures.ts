import {
  dateAgo,
  transitions,
  type Customer,
  type Employee,
  type KnowledgeRecord,
  type Order,
  type OrderStatus,
  type Store,
} from "./domain.ts";
import { catalog } from "./catalog.ts";
import { defaultTemplates } from "./templates.ts";

export const demoCustomers: readonly Omit<Customer, "notes">[] = [
  {
    id: "c1",
    name: "Démo Atlas",
    title: "Mme",
    city: "Casablanca",
    email: "atlas@example.test",
    phone: "DEMO-001",
    address: "Adresse fictive Atlas",
    language: "Français",
  },
  {
    id: "c2",
    name: "Démo Oasis",
    title: "M.",
    city: "Rabat",
    email: "oasis@example.test",
    phone: "DEMO-002",
    address: "Adresse fictive Oasis",
    language: "Darija",
  },
  {
    id: "c3",
    name: "Démo Vallée",
    title: "Mme",
    city: "Marrakech",
    email: "vallee@example.test",
    phone: "DEMO-003",
    address: "Adresse fictive Vallée",
    language: "العربية",
  },
  {
    id: "c4",
    name: "Démo Dune",
    title: "M.",
    city: "Tanger",
    email: "dune@example.test",
    phone: "DEMO-004",
    address: "Adresse fictive Dune",
    language: "English",
  },
  {
    id: "c5",
    name: "Démo Jardin",
    title: "Mme",
    city: "Agadir",
    email: "jardin@example.test",
    phone: "DEMO-005",
    address: "Adresse fictive Jardin",
    language: "Français",
  },
  {
    id: "c6",
    name: "Démo Rivage",
    title: "M.",
    city: "Essaouira",
    email: "rivage@example.test",
    phone: "DEMO-006",
    address: "Adresse fictive Rivage",
    language: "Darija",
  },
];
export const demoEmployees: readonly Employee[] = [
  { id: "e1", name: "Conseiller Démo Olive", role: "Conseiller", active: true },
  { id: "e2", name: "Agent Démo Lin", role: "Logistique", active: true },
  {
    id: "e3",
    name: "Responsable Démo Rose",
    role: "Responsable",
    active: true,
  },
  {
    id: "e4",
    name: "Conseiller Démo Ivoire",
    role: "Conseiller",
    active: true,
  },
  { id: "e5", name: "Agent Démo Sauge", role: "Logistique", active: true },
];

const knowledge: KnowledgeRecord[] = [
  {
    id: "g1",
    kind: "guide",
    title: "Le rituel à l’eau de rose",
    group: "Routine",
    text: "Consulter les indications de l’étiquette avant d’intégrer l’eau de rose à votre routine.",
  },
  {
    id: "g2",
    kind: "guide",
    title: "Intégrer une huile à sa routine",
    group: "Routine",
    text: "Suivre les instructions figurant sur l’emballage pour l’utilisation et la quantité.",
  },
  {
    id: "g3",
    kind: "guide",
    title: "Conserver les soins",
    group: "Conservation",
    text: "Refermer les flacons après utilisation et suivre les consignes de conservation sur l’étiquette.",
  },
  {
    id: "f1",
    kind: "faq",
    title: "Comment confirmer une commande ?",
    group: "Commandes",
    text: "Vérifier les produits, quantités et le total à la livraison, puis confirmer depuis la fiche.",
  },
  {
    id: "f2",
    kind: "faq",
    title: "Comment organiser un rappel ?",
    group: "Service client",
    text: "Planifier le rappel depuis une commande ou depuis Tâches et rappels.",
  },
  {
    id: "f3",
    kind: "faq",
    title: "Comment retrouver un brouillon de confirmation ?",
    group: "Service client",
    text: "Depuis la commande, préparer un message et sélectionner le modèle Confirmation.",
  },
];

export function fictionalStore(): Store {
  const products = catalog();
  const customers: Customer[] = demoCustomers
    .slice(0, 4)
    .map((customer) => ({
      ...customer,
      notes: customer.id === "c1" ? ["Rappeler en fin de journée"] : [],
    }));
  const makeOrder = (
    number: number,
    customer: Customer,
    variantId: string,
    label: string,
    quantity: number,
    unitPrice: number,
    days: number,
    steps: number,
  ): Order => {
    const date = dateAgo(days);
    const statuses: OrderStatus[] = ["À confirmer"];
    for (let index = 0; index < steps; index++)
      statuses.push(transitions[statuses.at(-1)!][0]);
    return {
      id: "RCH-" + number,
      customerId: customer.id,
      city: customer.city,
      phone: customer.phone,
      address: customer.address,
      advisorId: "e1",
      lines: [{ variantId, label, quantity, unitPrice }],
      deliveryFee: 2000,
      discount: 0,
      date,
      status: statuses.at(-1)!,
      history: statuses.map((status, index) => ({
        status,
        at: `${date}T00:0${index}:00.000Z`,
      })),
    };
  };
  return {
    customers,
    products,
    orders: [
      makeOrder(
        1048,
        customers[0],
        "mist-1",
        "Rose Water Mist · 125 mL",
        1,
        10000,
        0,
        0,
      ),
      makeOrder(
        1047,
        customers[1],
        "water-1",
        "Pure Rose Water · 250 mL",
        2,
        8000,
        0,
        0,
      ),
      makeOrder(
        1046,
        customers[2],
        "oil-1",
        "Rose Oil · 30 mL",
        1,
        13000,
        1,
        1,
      ),
      makeOrder(
        1045,
        customers[3],
        "buds-1",
        "Dried Damask Rose Buds · 100 g",
        1,
        6000,
        2,
        3,
      ),
      makeOrder(
        1044,
        customers[0],
        "mist-2",
        "Rose Water Mist · 200 mL",
        1,
        12000,
        4,
        4,
      ),
    ],
    tasks: [
      {
        id: "t1",
        title: "Confirmer la commande",
        due: dateAgo(0),
        customerId: "c1",
        employeeId: "e1",
        orderId: "RCH-1048",
        kind: "Rappel",
        done: false,
      },
      {
        id: "t2",
        title: "Vérifier la livraison",
        due: dateAgo(0),
        customerId: "c4",
        employeeId: "e2",
        orderId: "RCH-1045",
        kind: "Tâche",
        done: false,
      },
      {
        id: "t3",
        title: "Préparer les conseils",
        due: dateAgo(-1),
        customerId: "c3",
        employeeId: "e1",
        kind: "Tâche",
        done: false,
      },
    ],
    employees: demoEmployees.slice(0, 3).map((item) => ({ ...item })),
    knowledge: knowledge.map((entry) => ({ ...entry })),
    templates: defaultTemplates(),
  };
}
