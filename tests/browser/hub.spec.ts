import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const select = (page: Page, name: string) =>
  page.getByRole("combobox", { name, exact: true });
async function navigate(page: Page, name: string) {
  const toggle = button(page, "Ouvrir le menu");
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("button", { name, exact: true })
    .click();
}

test("multi-item order, COD, callback, failed delivery, return and persisted history", async ({
  page,
}) => {
  await page.goto("/demo/");
  await navigate(page, "Commandes");
  await button(page, "Nouvelle commande").click();
  await select(page, "Client fictif").selectOption("c1");
  await select(page, "Conseiller attitré").selectOption("e1");
  await select(page, "Article 1").selectOption("mist-1");
  await page.getByRole("spinbutton", { name: "Quantité 1" }).fill("2");
  await page
    .getByRole("spinbutton", { name: "Prix fictif 1 (MAD)" })
    .fill("100.25");
  await button(page, "Ajouter un article").click();
  await select(page, "Article 2").selectOption("essential-2");
  await page
    .getByRole("spinbutton", { name: "Prix fictif 2 (MAD)" })
    .fill("25.75");
  await page
    .getByRole("spinbutton", { name: "Frais de livraison (MAD)" })
    .fill("15");
  await page.getByRole("spinbutton", { name: "Remise (MAD)" }).fill("7.25");
  await button(page, "Créer la commande").click();

  const detail = page.getByRole("region", { name: "Fiche de commande" });
  const order = (await detail
    .getByRole("heading", { name: /^RCH-/ })
    .textContent())!;
  await expect(
    detail.getByText(/234[,.]0? MAD|234 MAD/, { exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByText(/DEMO-001.*Adresse fictive Atlas/),
  ).toBeVisible();
  await expect(detail.getByText(/Rose Essential Oil · 10 mL/)).toBeVisible();
  for (const action of [
    "Confirmer",
    "Mettre en préparation",
    "Marquer expédiée",
    "Signaler un échec",
  ])
    await button(page, action).click();
  await button(page, "Planifier un rappel").click();
  await button(page, "Enregistrer le rappel").click();
  await detail.getByRole("button", { name: "Rappeler le profil démo" }).click();
  await page
    .getByRole("row", { name: new RegExp(order) })
    .getByRole("button", { name: "Terminer" })
    .click();
  await navigate(page, "Performance");
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "Tâches terminées" })
      .locator("strong"),
  ).toHaveText("1");

  const search = page.getByRole("textbox", { name: "Recherche globale" });
  await search.fill(order);
  await page.getByRole("button", { name: order + " Commande" }).click();
  await expect(detail.locator(".badge")).toHaveText("Échec de livraison");
  for (const action of [
    "Mettre en préparation",
    "Marquer expédiée",
    "Marquer livrée",
    "Ouvrir un retour",
    "Clôturer le retour",
  ])
    await button(page, action).click();
  await page.reload();
  await expect(detail.locator(".badge")).toHaveText("Retournée");
  await expect(detail.getByText(/Échec de livraison ·/)).toBeVisible();
  await expect(detail.getByText(/Terminé/)).toBeVisible();
  await detail.getByRole("button", { name: "Réassigner" }).click();
  await select(page, "Nouveau conseiller").selectOption("e3");
  await button(page, "Enregistrer l’affectation").click();
  await expect(
    detail.getByText(/Conseiller attitré · Responsable Démo Rose/),
  ).toBeVisible();
  await button(page, "RCH-1047").click();
  await button(page, "Annuler la commande").click();
  await button(page, "Confirmer l’annulation").click();
  await expect(detail.locator(".badge")).toHaveText("Annulée");
});

test("catalog variants, bundle components, editable guide and filtered universal search", async ({
  page,
}) => {
  await page.goto("/demo/");
  const search = page.getByRole("textbox", { name: "Recherche globale" });
  await search.fill("rose essential 20");
  await page
    .getByRole("button", { name: "Rose Essential Oil Produit" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rose Essential Oil" }),
  ).toHaveCount(2);
  await expect(
    page.getByText("20 mL · Précommande", { exact: true }),
  ).toBeVisible();
  await button(page, "Fermer la fiche").click();
  await select(page, "Filtrer les résultats").selectOption("Coffret");
  await expect(page.locator(".product-card")).toHaveCount(5);
  await button(page, "Modifier Rose Discovery Ritual").click();
  await page
    .getByRole("spinbutton", { name: "Rose Water Mist · 125 mL" })
    .fill("2");
  await button(page, "Enregistrer la fiche").click();
  await expect(
    page.getByText("2 × Rose Water Mist · 125 mL (simulation)"),
  ).toBeVisible();

  await navigate(page, "Guides de soin");
  await button(page, "Ajouter un article").click();
  await page
    .getByRole("textbox", { name: "Titre", exact: true })
    .fill("Guide démo navigateur");
  await page.getByRole("textbox", { name: "Catégorie" }).fill("Routine");
  await page
    .getByRole("textbox", { name: "Contenu générique" })
    .fill("Consulter les indications de l’étiquette.");
  await button(page, "Enregistrer l’article").click();
  await search.fill("guide demo navigateur");
  await page
    .getByRole("button", { name: "Guide démo navigateur Routine" })
    .click();
  await expect(
    page.getByText("Consulter les indications de l’étiquette.", {
      exact: true,
    }),
  ).toBeVisible();
  await button(page, "Préparer le partage").click();
  await select(page, "Client fictif").selectOption("c1");
  await select(page, "Conseiller").selectOption("e1");
  await button(page, "Générer le message").click();
  const draft = page.getByRole("textbox", { name: "Brouillon du message" });
  await expect(draft).toHaveValue(
    /http:\/\/127\.0\.0\.1:3100\/demo\/#guides\/[\w-]+/,
  );
});

test("editable multilingual templates interpolate values and reject contact details", async ({
  page,
}) => {
  await page.goto("/demo/");
  await button(page, "RCH-1048").click();
  await button(page, "Préparer un message").click();
  for (const language of ["Français", "Darija", "العربية", "English"]) {
    await select(page, "Langue").selectOption(language);
    await button(page, "Générer le message").click();
    await expect(
      page.getByRole("textbox", { name: "Brouillon du message" }),
    ).toHaveValue(/Démo Atlas.*RCH-1048.*Rose Water Mist/s);
  }
  await button(page, "Modifier le modèle").click();
  const editor = page.getByRole("textbox", {
    name: "Texte générique du modèle",
  });
  await editor.fill("Contact real@example.com");
  await button(page, "Enregistrer le modèle").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "sans coordonnées" }),
  ).toBeVisible();
  await editor.fill(
    "Good day {{client}}. {{quantites}} to {{ville}}. Total: {{total}}. {{conseiller}}",
  );
  await button(page, "Enregistrer le modèle").click();
  await button(page, "Générer le message").click();
  await expect(
    page.getByRole("textbox", { name: "Brouillon du message" }),
  ).toHaveValue(/Good day Démo Atlas.*125 mL × 1.*Casablanca.*120 MAD/);
  await expect(select(page, "Modèle").locator("option")).toHaveCount(10);
  await page.reload();
  await select(page, "Client fictif").selectOption("c1");
  await select(page, "Commande").selectOption("RCH-1048");
  await select(page, "Langue").selectOption("English");
  await button(page, "Générer le message").click();
  await expect(
    page.getByRole("textbox", { name: "Brouillon du message" }),
  ).toHaveValue(/^Good day/);
});

test("demo data is validated, reset requires confirmation, and layout fits viewport", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "yes");
    localStorage.setItem("rose-care-demo-v1", '{"old":true}');
    localStorage.setItem(
      "rose-care-demo-v2",
      '{"customers":[{"name":"External Person","email":"external@example.com"}]}',
    );
  });
  await page.goto("/demo/");
  await expect(page.getByText("Démonstration uniquement.")).toBeVisible();
  await expect(page.getByText(/données locales incompatibles/)).toBeVisible();
  await expect(page.getByText("External Person")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("rose-care-demo-v1")),
  ).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => window.innerWidth),
  );
  await navigate(page, "Clients");
  await button(page, "Ajouter un profil fictif").click();
  await select(page, "Profil fictif").selectOption("c5");
  await button(page, "Ajouter le profil").click();
  await expect(
    page.getByRole("heading", { name: "Démo Jardin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /e-mail|adresse|téléphone/i }),
  ).toHaveCount(0);
  await button(page, "Réinitialiser les données").click();
  await button(page, "Conserver les données").click();
  await expect(
    page.getByRole("heading", { name: "Démo Jardin" }),
  ).toBeVisible();
  await button(page, "Réinitialiser les données").click();
  await button(page, "Confirmer la réinitialisation").click();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  await navigate(page, "Clients");
  await expect(button(page, "Démo Jardin")).toHaveCount(0);
  await navigate(page, "Équipe");
  await button(page, "Nouveau membre fictif").click();
  await select(page, "Membre fictif").selectOption("e4");
  await button(page, "Enregistrer le membre").click();
  await expect(
    page.getByRole("row").filter({ hasText: "Conseiller Démo Ivoire" }),
  ).toBeVisible();
});

test("live routes stay out of the service worker cache and the public demo reloads offline", async ({
  page,
  context,
  request,
}) => {
  const response = await request.get("/demo/");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["content-security-policy"]).not.toContain(
    "unsafe-eval",
  );
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(await response.text()).toMatch(
    /<meta name="robots" content="[^"]*noindex/,
  );

  await page.goto("/demo/");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const requests = await page.evaluate(async () => {
    await fetch("/?test=live");
    await fetch("/api/private", {
      headers: { Authorization: "Bearer fictional-test" },
    });
    const cache = await caches.open("rose-care-demo-v3");
    return (await cache.keys()).map((item) => new URL(item.url).pathname);
  });
  expect(requests).toContain("/demo/offline");
  expect(requests).not.toContain("/demo/");
  expect(requests).not.toContain("/api/private");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  await navigate(page, "Commandes");
  await expect(button(page, "RCH-1048")).toBeVisible();
});
