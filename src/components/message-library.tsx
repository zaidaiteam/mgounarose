import { useState, type FormEvent } from "react";
import { Copy, Pencil } from "lucide-react";
import { Field, Heading } from "@/components/fields";
import { Button } from "@/components/ui/button";
import type { Update } from "@/components/hub";
import {
  demoCopy,
  languages,
  templateKinds,
  templateVariables,
  type Language,
  type Store,
  type TemplateKind,
} from "@/lib/domain";
import {
  messageValues,
  renderTemplate,
  templateTokens,
  validTemplate,
} from "@/lib/templates";

export type Draft = {
  customerId?: string;
  orderId?: string;
  kind?: TemplateKind;
  guideId?: string;
};

export function Messages({
  store,
  update,
  initial,
}: {
  store: Store;
  update: Update;
  initial: Draft;
}) {
  const [customerId, setCustomerId] = useState(initial.customerId ?? "");
  const [orderId, setOrderId] = useState(initial.orderId ?? "");
  const [language, setLanguage] = useState<Language>(
    store.customers.find((entry) => entry.id === initial.customerId)
      ?.language ?? "Français",
  );
  const [kind, setKind] = useState<TemplateKind>(
    initial.kind ?? "Confirmation",
  );
  const [guideId, setGuideId] = useState(initial.guideId ?? "");
  const [advisorId, setAdvisorId] = useState("");
  const [draft, setDraft] = useState("");
  const [editor, setEditor] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const customer = store.customers.find((entry) => entry.id === customerId);
  const orders = store.orders.filter(
    (entry) => entry.customerId === customerId,
  );
  const order = orders.find((entry) => entry.id === orderId);
  const advisor = store.employees.find(
    (entry) => entry.id === (order?.advisorId ?? advisorId),
  );
  const guides = store.knowledge.filter((item) => item.kind === "guide");
  const template = store.templates.find(
    (item) => item.kind === kind && item.language === language,
  )!;
  const tokens = templateTokens(template.body);
  const needsOrder = tokens.some((name) =>
    [
      "commande",
      "produits",
      "quantites",
      "prix",
      "prix_unitaires",
      "livraison",
      "remise",
      "total",
    ].includes(name),
  );
  const needsGuide = tokens.includes("guide");
  const needsAdvisor = tokens.includes("conseiller");
  const guideLink =
    needsGuide && guides.some((guide) => guide.id === guideId)
      ? new URL("/#guides/" + guideId, window.location.origin).href
      : undefined;
  function clear() {
    setDraft("");
    setFeedback("");
    setError("");
  }
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    const result = renderTemplate(
      template.body,
      messageValues(language, customer, order, advisor, guideLink),
    );
    if (result.missing.length)
      return setError("Complétez les champs requis par le modèle.");
    setDraft(result.text);
    setFeedback("");
    setError("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body")).trim();
    if (!body || !demoCopy(body) || !validTemplate(body))
      return setError(
        "Utilisez uniquement les variables proposées et un texte générique sans coordonnées ni lien externe.",
      );
    update((current) => ({
      ...current,
      templates: current.templates.map((entry) =>
        entry.kind === kind && entry.language === language
          ? { ...entry, body }
          : entry,
      ),
    }));
    clear();
    setEditor(false);
    setFeedback("Modèle enregistré.");
  }
  async function copy() {
    // Only the generated guide URL is allowed in a draft.
    if (!demoCopy(guideLink ? draft.replaceAll(guideLink, "") : draft))
      return setError(
        "Retirez les coordonnées et les liens externes du brouillon.",
      );
    try {
      await navigator.clipboard.writeText(draft);
      setFeedback("Message copié.");
    } catch {
      setFeedback("Sélectionnez le texte pour le copier manuellement.");
    }
  }
  return (
    <>
      <Heading
        title="Atelier de messages"
        subtitle="Personnalisez un modèle fictif. Le brouillon reste disponible à la copie dans cet écran."
      />
      <div className="workspace-grid">
        <form className="panel editor" onSubmit={generate} onChange={clear}>
          <h2>Personnalisation</h2>
          <Field label="Client fictif">
            <select
              required
              value={customerId}
              onChange={(event) => {
                const next = event.target.value;
                setCustomerId(next);
                setOrderId("");
                setLanguage(
                  store.customers.find((item) => item.id === next)?.language ??
                    "Français",
                );
              }}
            >
              <option value="">Choisir un client</option>
              {store.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modèle">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as TemplateKind)}
            >
              {templateKinds.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Langue">
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {languages.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          {(needsOrder || needsAdvisor) && (
            <Field label="Commande">
              <select
                required={needsOrder}
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
              >
                <option value="">Choisir une commande</option>
                {orders.map((item) => (
                  <option key={item.id}>{item.id}</option>
                ))}
              </select>
            </Field>
          )}
          {needsAdvisor && !order && (
            <Field label="Conseiller">
              <select
                required
                value={advisorId}
                onChange={(event) => setAdvisorId(event.target.value)}
              >
                <option value="">Choisir un membre</option>
                {store.employees
                  .filter((item) => item.active)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          {needsGuide && (
            <Field label="Guide">
              <select
                required
                value={guideId}
                onChange={(event) => setGuideId(event.target.value)}
              >
                <option value="">Choisir un guide</option>
                {guides.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="actions">
            <Button>Générer le message</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditor(!editor);
                setError("");
              }}
            >
              <Pencil size={16} /> Modifier le modèle
            </Button>
          </div>
        </form>
        <section className="panel editor">
          <h2>Brouillon du message</h2>
          <textarea
            aria-label="Brouillon du message"
            dir="auto"
            value={draft}
            placeholder="Le brouillon apparaîtra ici."
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
              setFeedback("");
            }}
            rows={8}
            maxLength={12000}
          />
          <div className="actions">
            <Button variant="outline" disabled={!draft.trim()} onClick={copy}>
              <Copy size={16} /> Copier
            </Button>
            <span role="status">{feedback}</span>
          </div>
        </section>
      </div>
      {editor && (
        <form key={kind + language} className="panel editor" onSubmit={save}>
          <h2>
            {kind} · {language}
          </h2>
          <Field label="Texte générique du modèle">
            <textarea
              name="body"
              dir="auto"
              defaultValue={template.body}
              required
              maxLength={2000}
              rows={7}
            />
          </Field>
          <p>
            Variables disponibles ·{" "}
            {templateVariables.map((item) => (
              <code className="template-token" key={item}>{`{{${item}}}`}</code>
            ))}
          </p>
          <div className="actions">
            <Button>Enregistrer le modèle</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditor(false)}
            >
              Fermer l’éditeur
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </>
  );
}
