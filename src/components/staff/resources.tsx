import { Badge, Empty, Field } from "@/components/fields";
import { Button } from "@/components/ui/button";
import { defaultTemplates, renderTemplate } from "@/lib/templates";
import { money } from "@/lib/domain";
import type { Actor } from "@/lib/staff/repository";
import type { StaffLanguage, Workspace } from "@/lib/staff/types";
import { LanguageField, StaffForm } from "./forms";
import { CopyDraft } from "./copy-draft";
import { staffMoney } from "./orders";

const languageCodes = {
  Français: "fr",
  Darija: "darija",
  العربية: "ar",
  English: "en",
} as const;
const salutations = {
  fr: ["Mme", "M."],
  darija: ["Lalla", "Ssi"],
  ar: ["السيدة", "السيد"],
  en: ["Ms", "Mr"],
};

export function StaffCatalog({
  data,
  editorial,
  canSeePrices,
  selected,
}: {
  data: Workspace;
  editorial: boolean;
  canSeePrices: boolean;
  selected?: string;
}) {
  const components = data.products
    .filter((item) => item.kind === "product")
    .flatMap((item) =>
      item.variants.map((variant) => ({
        id: variant.id,
        label: item.title + " · " + variant.title,
      })),
    );
  return data.products.length ? (
    <div className="cards">
      {data.products.map((product) => (
        <article className="panel product-card" key={product.id}>
          <Badge>{product.kind === "bundle" ? "Coffret" : "Produit"}</Badge>
          <h2>{product.title}</h2>
          {product.variants.map((variant) => (
            <details
              key={variant.id}
              open={selected === product.id || undefined}
            >
              <summary>
                {variant.title}
                {variant.preorder && " · Précommande"}
                {canSeePrices &&
                  (variant.price === null
                    ? " · Prix non renseigné"
                    : " · " + staffMoney(variant.price))}
              </summary>
              <p>Stock {variant.stock ?? "non renseigné"}</p>
              {variant.components.map((component) => (
                <p key={component.variant_id}>
                  {component.quantity} × {component.title}
                </p>
              ))}
              {editorial && (
                <StaffForm
                  action="catalog.variant"
                  section="catalog"
                  label="Mettre à jour la variante"
                  fields={{ id: variant.id }}
                >
                  <Field label="Prix fictif (MAD)">
                    <input
                      name="price"
                      type="number"
                      min="0"
                      max="999999.99"
                      step="0.01"
                      defaultValue={variant.price ?? ""}
                    />
                  </Field>
                  <Field label="Stock fictif">
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      max="999999"
                      defaultValue={variant.stock ?? ""}
                    />
                  </Field>
                </StaffForm>
              )}
              {editorial && product.kind === "bundle" && (
                <StaffForm
                  action="catalog.bundle"
                  section="catalog"
                  label="Enregistrer le composant"
                  fields={{ id: variant.id }}
                >
                  <Field label="Composant">
                    <select name="component_id" required>
                      <option value="">Choisir une variante</option>
                      {components.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quantité (0 pour retirer)">
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      max="999"
                      required
                    />
                  </Field>
                </StaffForm>
              )}
            </details>
          ))}
        </article>
      ))}
    </div>
  ) : (
    <Empty />
  );
}

function KnowledgeEditor({
  section,
  record,
}: {
  section: "guides" | "faq";
  record?: {
    id: string;
    title: string;
    category: string;
    body: string | null;
    language: StaffLanguage;
    approved: boolean;
  };
}) {
  return (
    <StaffForm
      action="knowledge.save"
      section={section}
      fields={{
        kind: section === "guides" ? "guide" : "faq",
        ...(record ? { id: record.id } : {}),
      }}
      label="Enregistrer l’article"
    >
      <Field label="Titre">
        <input
          name="title"
          defaultValue={record?.title}
          maxLength={140}
          required
        />
      </Field>
      <Field label="Catégorie">
        <input
          name="category"
          defaultValue={record?.category}
          maxLength={80}
          required
        />
      </Field>
      <LanguageField defaultValue={record?.language} />
      <Field label="Contenu">
        <textarea
          name="body"
          defaultValue={record?.body ?? ""}
          maxLength={3000}
          required
        />
      </Field>
      <label>
        <input
          name="approved"
          type="checkbox"
          defaultChecked={record?.approved}
        />{" "}
        Article approuvé
      </label>
    </StaffForm>
  );
}
export function StaffKnowledge({
  section,
  data,
  editorial,
  selected,
}: {
  section: "guides" | "faq";
  data: Workspace;
  editorial: boolean;
  selected?: string;
}) {
  const records =
    section === "guides"
      ? data.guides
      : data.faqs.map((item) => ({
          ...item,
          title: item.question,
          body: item.answer,
          file_available: false,
        }));
  return (
    <>
      {editorial && (
        <details className="panel detail">
          <summary>Ajouter un article</summary>
          <KnowledgeEditor section={section} />
        </details>
      )}
      <section className="panel detail">
        {records.length ? (
          records.map((item) => (
            <details
              className="staff-detail"
              key={item.id}
              open={selected === item.id || undefined}
            >
              <summary>
                <strong>{item.title}</strong>
                <Badge>{item.category}</Badge>
              </summary>
              <p className="knowledge-text">{item.body}</p>
              <div className="actions">
                {item.file_available && (
                  <form method="post" action="/staff/guide">
                    <input type="hidden" name="guide_id" value={item.id} />
                    <Button variant="outline">Ouvrir le guide privé</Button>
                  </form>
                )}
                {section === "guides" && item.approved && (
                  <a
                    className="btn btn-outline"
                    href={`?section=messages&guide=${item.id}`}
                  >
                    Préparer le partage interne
                  </a>
                )}
              </div>
              {editorial && (
                <details>
                  <summary>Modifier l’article</summary>
                  <KnowledgeEditor section={section} record={item} />
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

export function StaffMessages({
  data,
  actor,
  editorial,
  params,
}: {
  data: Workspace;
  actor: Actor;
  editorial: boolean;
  params: {
    customer?: string;
    order?: string;
    template?: string;
    guide?: string;
  };
}) {
  const templates = data.templates;
  const customer = data.customers.find((item) => item.id === params.customer);
  const order = data.orders.find(
    (item) => item.id === params.order && item.customer_id === customer?.id,
  );
  const template = templates.find(
    (item) => item.id === params.template && item.approved,
  );
  const guide = data.guides.find(
    (item) => item.id === params.guide && item.approved,
  );
  const guideLink = guide
    ? `/staff/workspace?section=guides&id=${guide.id}`
    : undefined;
  const isTitle = customer?.title === "Mme" ? 0 : 1;
  const draft =
    customer && template
      ? renderTemplate(template.body, {
          client: customer.name,
          civilite: salutations[template.language][isTitle],
          commande: order ? "RCH-" + order.reference : undefined,
          produits: order?.items
            .map((item) => `${item.quantity} × ${item.title}`)
            .join(", "),
          quantites: order?.items
            .map((item) => `${item.title} × ${item.quantity}`)
            .join(", "),
          prix: order
            ? money(
                order.items.reduce(
                  (total, item) =>
                    total +
                    Math.round((item.unit_price ?? 0) * 100) * item.quantity,
                  0,
                ),
              )
            : undefined,
          prix_unitaires: order?.items
            .map(
              (item) => item.title + " · " + staffMoney(item.unit_price ?? 0),
            )
            .join(", "),
          livraison: order ? staffMoney(order.shipping ?? 0) : undefined,
          remise: order ? staffMoney(order.discount ?? 0) : undefined,
          total: order?.total != null ? staffMoney(order.total) : undefined,
          conseiller:
            data.employees.find((item) => item.id === order?.advisor_id)
              ?.name ?? actor.name,
          ville:
            order?.delivery_city ?? customer.addresses[0]?.city ?? undefined,
          guide: guideLink,
        })
      : null;

  return (
    <>
      <div className="workspace-grid">
        <form method="get" className="panel editor">
          <input type="hidden" name="section" value="messages" />
          <h2>Personnalisation</h2>
          <Field label="Client fictif">
            <select
              name="customer"
              defaultValue={params.customer ?? ""}
              required
            >
              <option value="">Choisir un client</option>
              {data.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modèle et langue">
            <select
              name="template"
              defaultValue={params.template ?? ""}
              required
            >
              <option value="">Choisir un modèle approuvé</option>
              {templates
                .filter((item) => item.approved)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.language}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Commande">
            <select name="order" defaultValue={params.order ?? ""}>
              <option value="">Sans commande</option>
              {data.orders
                .filter((item) => item.customer_id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    RCH-{item.reference} · {item.customer_name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Guide interne">
            <select name="guide" defaultValue={params.guide ?? ""}>
              <option value="">Sans guide</option>
              {data.guides
                .filter((item) => item.approved)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
          </Field>
          <Button>Générer le message</Button>
        </form>
        <section className="panel editor">
          <h2>Brouillon du message</h2>
          {draft?.missing.length ? (
            <p role="status">Champs manquants · {draft.missing.join(", ")}</p>
          ) : draft ? (
            <CopyDraft key={draft.text} text={draft.text} />
          ) : (
            <p>Choisissez un client et un modèle approuvé.</p>
          )}
        </section>
      </div>
      <section className="panel detail">
        {templates.map((item) => (
          <details key={item.id} className="staff-detail">
            <summary>
              <strong>
                {item.title} · {item.language}
              </strong>
              <Badge>{item.approved ? "Approuvé" : "Brouillon"}</Badge>
            </summary>
            {editorial ? (
              <StaffForm
                action="template.save"
                section="messages"
                label="Enregistrer le modèle"
                fields={{
                  id: item.id,
                  version: item.version,
                  category: item.category,
                  language: item.language,
                }}
              >
                <Field label="Texte du modèle">
                  <textarea
                    name="body"
                    defaultValue={item.body}
                    maxLength={2000}
                    rows={5}
                    required
                    dir="auto"
                  />
                </Field>
                <label>
                  <input
                    type="checkbox"
                    name="approved"
                    defaultChecked={item.approved}
                  />{" "}
                  Modèle approuvé
                </label>
              </StaffForm>
            ) : (
              <p className="knowledge-text" dir="auto">
                {item.body}
              </p>
            )}
          </details>
        ))}
        {editorial && (
          <details>
            <summary>Ajouter un modèle</summary>
            {defaultTemplates()
              .filter(
                (item) =>
                  !templates.some(
                    (row) =>
                      row.category === item.kind &&
                      row.language === languageCodes[item.language],
                  ),
              )
              .slice(0, 1)
              .map((item) => (
                <StaffForm
                  key={item.kind}
                  action="template.save"
                  section="messages"
                  label="Enregistrer le nouveau modèle"
                >
                  <Field label="Scénario">
                    <input
                      name="category"
                      defaultValue={item.kind}
                      required
                      maxLength={80}
                    />
                  </Field>
                  <LanguageField defaultValue={languageCodes[item.language]} />
                  <Field label="Texte du modèle">
                    <textarea
                      name="body"
                      defaultValue={item.body}
                      maxLength={2000}
                      rows={5}
                      required
                      dir="auto"
                    />
                  </Field>
                  <label>
                    <input type="checkbox" name="approved" /> Modèle approuvé
                  </label>
                </StaffForm>
              ))}
            {templates.length >= 40 && (
              <p>Les modèles de référence sont présents.</p>
            )}
          </details>
        )}
      </section>
    </>
  );
}
