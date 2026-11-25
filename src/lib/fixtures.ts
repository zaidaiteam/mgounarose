import { dateAgo, type Store } from "@/lib/domain";

export function fictionalStore(): Store {
  return {
    customers: [
      { id: "c1", name: "Salma Amrani", city: "Casablanca", email: "salma@example.test", language: "Français", notes: ["Préfère être contactée en fin de journée."] },
      { id: "c2", name: "Yasmine Idrissi", city: "Rabat", email: "yasmine@example.test", language: "Darija", notes: [] },
      { id: "c3", name: "Nour El Fassi", city: "Marrakech", email: "nour@example.test", language: "العربية", notes: [] },
      { id: "c4", name: "Lina Bennis", city: "Tanger", email: "lina@example.test", language: "English", notes: [] },
    ],
    products: [
      { id: "p1", name: "Eau de rose", kind: "Produit", price: 120, stock: 48, description: "Brume florale pour la routine quotidienne." },
      { id: "p2", name: "Rituel de la vallée", kind: "Coffret", price: 320, stock: 14, description: "Coffret découverte composé d’une eau de rose et d’une huile de soin." },
      { id: "p3", name: "Huile de soin", kind: "Produit", price: 220, stock: 22, description: "Huile pour accompagner le massage du soir." },
      { id: "p4", name: "Duo floral", kind: "Coffret", price: 210, stock: 9, description: "Deux eaux de rose à offrir ou à partager." },
    ],
    orders: [
      { id: "RCH-1048", customerId: "c1", productId: "p2", quantity: 1, unitPrice: 320, status: "À confirmer", date: dateAgo(0) },
      { id: "RCH-1047", customerId: "c2", productId: "p1", quantity: 2, unitPrice: 120, status: "À confirmer", date: dateAgo(0) },
      { id: "RCH-1046", customerId: "c3", productId: "p3", quantity: 1, unitPrice: 220, status: "Confirmée", date: dateAgo(1) },
      { id: "RCH-1045", customerId: "c4", productId: "p4", quantity: 1, unitPrice: 210, status: "Expédiée", date: dateAgo(2) },
      { id: "RCH-1044", customerId: "c1", productId: "p1", quantity: 1, unitPrice: 120, status: "Livrée", date: dateAgo(4) },
    ],
    tasks: [
      { id: "t1", title: "Confirmer le coffret de Salma", due: dateAgo(0), customerId: "c1", employeeId: "e1", kind: "Rappel", done: false },
      { id: "t2", title: "Vérifier la livraison de Lina", due: dateAgo(0), customerId: "c4", employeeId: "e2", kind: "Tâche", done: false },
      { id: "t3", title: "Préparer les conseils pour Nour", due: dateAgo(-1), customerId: "c3", employeeId: "e1", kind: "Tâche", done: false },
    ],
    employees: [
      { id: "e1", name: "Inès Amani", role: "Conseiller", active: true },
      { id: "e2", name: "Adam Naciri", role: "Logistique", active: true },
      { id: "e3", name: "Sofia El Kadi", role: "Responsable", active: true },
    ],
  };
}

export const guides = [
  { title: "Le rituel à l’eau de rose", group: "Routine", text: "Après le nettoyage, appliquer la brume sur le visage en évitant le contact avec les yeux, puis poursuivre la routine habituelle. Se référer aux indications de l’étiquette." },
  { title: "Intégrer une huile à sa routine", group: "Routine", text: "Réchauffer quelques gouttes entre les mains et masser doucement, en suivant les instructions figurant sur l’emballage." },
  { title: "Conserver les soins", group: "Conservation", text: "Refermer les flacons après utilisation. Respecter les conditions de conservation et la durée après ouverture indiquées sur chaque produit." },
];
export const faq = [
  { title: "Comment confirmer une commande ?", group: "Commandes", text: "Vérifier le produit et la quantité avec la cliente ou le client, puis sélectionner Confirmée dans la fiche de commande." },
  { title: "Comment organiser un rappel ?", group: "Service client", text: "Créer un rappel dans Tâches, renseigner la personne à contacter, l’échéance et le membre de l’équipe chargé du suivi." },
  { title: "Comment retrouver un brouillon de confirmation ?", group: "Service client", text: "Ouvrir la commande, sélectionner Préparer un message, puis choisir le modèle Confirmation et la langue souhaitée." },
];
