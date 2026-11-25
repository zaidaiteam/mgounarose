import {
  languages,
  money,
  templateKinds,
  templateVariables,
  type Customer,
  type Employee,
  type Language,
  type Order,
  type Template,
  type TemplateVariable,
} from "./domain.ts";
import { orderAmounts } from "./domain.ts";

const copy: Record<
  Language,
  readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
> = {
  Français: [
    "Bonjour {{civilite}} {{client}}, pouvez-vous confirmer la commande {{commande}} : {{produits}} ? Sous-total : {{prix}}. Livraison à {{ville}} : {{livraison}}. Remise : {{remise}}. Total à payer à la livraison : {{total}}.",
    "Bonjour {{client}}, nous avons essayé de vous joindre au sujet de la commande {{commande}}. À quel moment pouvons-nous vous rappeler ?",
    "Bonjour {{client}}, nous revenons vers vous comme convenu. Êtes-vous disponible pour un appel ?",
    "Bonjour {{client}}, votre commande {{commande}} a été expédiée vers {{ville}}. Le montant à régler à la livraison est de {{total}}.",
    "Bonjour {{client}}, la livraison de votre commande {{commande}} prend du retard. Merci pour votre patience.",
    "Bonjour {{client}}, merci d’avoir choisi M’Gouna Rose. Nous espérons que votre commande vous plaît.",
    "Bonjour {{client}}, voici le guide dont nous avons parlé : {{guide}}.",
    "Bonjour {{client}}, comment s’est passée votre expérience avec votre commande {{commande}} ? Votre retour nous intéresse.",
    "Bonjour {{client}}, merci de nous avoir signalé le problème concernant {{commande}}. Nous allons examiner votre demande et revenir vers vous.",
    "Bonjour {{client}}, la livraison de {{commande}} à {{ville}} n’a pas abouti. Pouvons-nous convenir d’un nouveau créneau ?",
  ],
  Darija: [
    "Salam {{civilite}} {{client}}, wach momkin t2eked lina la commande {{commande}} dyal {{produits}}? Taman {{prix}}, livraison l-{{ville}} {{livraison}}, remise {{remise}}. Lmajmou3 f livraison {{total}}.",
    "Salam {{client}}, 3eyetna lik 3la la commande {{commande}}. Foqach nqedro n3eyto lik tani?",
    "Salam {{client}}, rje3na ntwaslo m3ak kifma ttafqna. Wach momkin n3eyto lik daba?",
    "Salam {{client}}, la commande {{commande}} tsiftat l-{{ville}}. Lmajmou3 f livraison {{total}}.",
    "Salam {{client}}, livraison dyal {{commande}} ghadi t2ekher chwiyya. Chokran 3la sber dyalk.",
    "Salam {{client}}, chokran 7it khtariti M’Gouna Rose. Ntmennaw t3jbek la commande dyalk.",
    "Salam {{client}}, hada howa dalil li hdrna 3lih: {{guide}}.",
    "Salam {{client}}, kifach dazet tajriba dyalk m3a la commande {{commande}}? Bghina nsm3o ra2y dyalk.",
    "Salam {{client}}, chokran 7it khbertina b lmochkil dyal {{commande}}. Ghadi nchoufo talab dyalk w nrj3o lik.",
    "Salam {{client}}, livraison dyal {{commande}} l-{{ville}} ma tmmatch. Nqedro nttafqo 3la waqt akhor?",
  ],
  العربية: [
    "مرحبًا {{civilite}} {{client}}، هل يمكنك تأكيد الطلب {{commande}} للمنتجات التالية: {{produits}}؟ المجموع الفرعي {{prix}}، والتوصيل إلى {{ville}} {{livraison}}، والخصم {{remise}}. المبلغ عند الاستلام {{total}}.",
    "مرحبًا {{client}}، حاولنا الاتصال بك بشأن الطلب {{commande}}. متى يناسبك أن نعاود الاتصال؟",
    "مرحبًا {{client}}، نعاود التواصل معك كما اتفقنا. هل يناسبك تلقي مكالمة؟",
    "مرحبًا {{client}}، تم شحن طلبك {{commande}} إلى {{ville}}. المبلغ عند الاستلام هو {{total}}.",
    "مرحبًا {{client}}، تأخر توصيل طلبك {{commande}}. نشكرك على صبرك.",
    "مرحبًا {{client}}، شكرًا لاختيارك مكونة روز. نتمنى أن ينال طلبك إعجابك.",
    "مرحبًا {{client}}، إليك الدليل الذي تحدثنا عنه: {{guide}}.",
    "مرحبًا {{client}}، كيف كانت تجربتك مع الطلب {{commande}}؟ يهمنا سماع رأيك.",
    "مرحبًا {{client}}، شكرًا لإبلاغنا بالمشكلة المتعلقة بالطلب {{commande}}. سنراجع طلبك ونتواصل معك.",
    "مرحبًا {{client}}، لم يكتمل توصيل الطلب {{commande}} إلى {{ville}}. هل يمكننا الاتفاق على موعد آخر؟",
  ],
  English: [
    "Hello {{civilite}} {{client}}, please confirm order {{commande}} for {{produits}}. Subtotal: {{prix}}. Delivery to {{ville}}: {{livraison}}. Discount: {{remise}}. Cash on delivery: {{total}}.",
    "Hello {{client}}, we tried to reach you about order {{commande}}. When would be a good time to call you back?",
    "Hello {{client}}, we’re following up as agreed. Are you available for a call?",
    "Hello {{client}}, order {{commande}} has been dispatched to {{ville}}. The amount due on delivery is {{total}}.",
    "Hello {{client}}, delivery of order {{commande}} is taking longer than expected. Thank you for your patience.",
    "Hello {{client}}, thank you for choosing M’Gouna Rose. We hope you’re enjoying your order.",
    "Hello {{client}}, here’s the care guide we discussed: {{guide}}.",
    "Hello {{client}}, how was your experience with order {{commande}}? We’d like to hear your feedback.",
    "Hello {{client}}, thank you for telling us about the issue with order {{commande}}. We’ll look into it and get back to you.",
    "Hello {{client}}, we couldn’t complete delivery of order {{commande}} to {{ville}}. Can we arrange another time?",
  ],
};

export function defaultTemplates(): Template[] {
  return languages.flatMap((language) =>
    templateKinds.map((kind, index) => ({
      kind,
      language,
      body: copy[language][index] + "\n\n{{conseiller}} · M’Gouna Rose",
    })),
  );
}

const token = /\{\{\s*([^{}]+?)\s*\}\}/g;
export function templateTokens(body: string) {
  return [
    ...new Set([...body.matchAll(token)].map((entry) => entry[1].trim())),
  ];
}
export function validTemplate(body: string) {
  return (
    templateTokens(body).every((key) =>
      (templateVariables as readonly string[]).includes(key),
    ) && !/[{}]/.test(body.replace(token, ""))
  );
}

export function renderTemplate(
  body: string,
  values: Partial<Record<TemplateVariable, string>>,
) {
  const missing = templateTokens(body).filter(
    (key) => !values[key as TemplateVariable],
  );
  return {
    missing,
    text: body
      .replace(
        token,
        (_, name: string) => values[name.trim() as TemplateVariable] ?? "",
      )
      .replace(/ {2,}/g, " "),
  };
}

export function messageValues(
  language: Language,
  customer: Customer,
  order?: Order,
  advisor?: Employee,
  guide?: string,
): Partial<Record<TemplateVariable, string>> {
  const title = customer.title === "Mme" ? 0 : 1;
  const salutations = {
    Français: ["Mme", "M."],
    Darija: ["Lalla", "Ssi"],
    العربية: ["السيدة", "السيد"],
    English: ["Ms", "Mr"],
  };
  const values = {
    client: customer.name,
    civilite: salutations[language][title],
    ville: order?.city ?? customer.city,
    conseiller: advisor?.name,
    guide,
  };
  if (!order) return values;
  const { subtotal, total } = orderAmounts(order);
  return {
    ...values,
    commande: order.id,
    produits: order.lines
      .map((line) => `${line.quantity} × ${line.label}`)
      .join(", "),
    quantites: order.lines
      .map((line) => `${line.label} × ${line.quantity}`)
      .join(", "),
    prix: money(subtotal),
    prix_unitaires: order.lines
      .map((line) => `${line.label}: ${money(line.unitPrice)}`)
      .join(", "),
    livraison: money(order.deliveryFee),
    remise: money(order.discount),
    total: money(total),
  };
}
