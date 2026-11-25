import { expect, test, type Page } from "@playwright/test";

const staff = "http://127.0.0.1:3101";
const fixtures = "http://127.0.0.1:3102";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
function login(
  page: Page,
  email: string,
  password = "Fictional-test-password!",
) {
  return page.goto(staff + "/staff/login").then(async () => {
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await button(page, "Se connecter").click();
  });
}

test("staff routes require a session; inactive and non-fixture identities cannot sign in", async ({
  page,
  request,
}) => {
  const noAuth = await request.get(staff + "/staff/workspace", {
    maxRedirects: 0,
  });
  expect(noAuth.headers().location).toBe("/staff/login");
  expect(noAuth.headers()["cache-control"]).toContain("no-store");
  const landing = await page.goto(staff + "/staff/login");
  const csp = landing?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[a-f\d]+'/);
  expect(csp.split("script-src")[1].split(";")[0]).not.toContain(
    "unsafe-inline",
  );
  await expect(
    page.getByRole("heading", { name: "Espace équipe" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /inscription/i })).toHaveCount(0);
  for (const account of ["inactive", "existing"]) {
    await login(page, account + "@example.test");
    await expect(
      page.getByRole("status").filter({ hasText: "Connexion indisponible" }),
    ).toBeVisible();
  }
  const crossSite = await request.post(staff + "/staff/guide", {
    headers: { origin: "https://other.example.test" },
    form: { guide_id: "70000000-0000-4000-8000-000000000001" },
  });
  expect(crossSite.status()).toBe(403);
  const unauthenticated = await request.post(staff + "/staff/guide", {
    headers: { origin: staff },
    form: { guide_id: "70000000-0000-4000-8000-000000000001" },
  });
  expect(unauthenticated.status()).toBe(401);
});

test("staff sees only assigned customers and orders; approved guide is private and sign-out revokes its session", async ({
  page,
  context,
  request,
}) => {
  await login(page, "advisor-a@example.test");
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clients 360°" }).click();
  await expect(page.getByText("Démo Atlas", { exact: true })).toBeVisible();
  await expect(page.getByText("Démo Oasis", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Commandes", exact: true }).click();
  await expect(page.getByText("RCH-51000001", { exact: true })).toBeVisible();
  await expect(page.getByText("RCH-51000002", { exact: true })).toHaveCount(0);
  const cookies = await context.cookies(staff + "/staff/workspace");
  expect(
    cookies.some(
      (cookie) =>
        cookie.name.startsWith("sb-rose-staff-auth") &&
        cookie.httpOnly &&
        cookie.path === "/staff",
    ),
  ).toBe(true);
  const path = "70000000-0000-4000-8000-000000000001";
  const access = await context.request.post(staff + "/staff/guide", {
    headers: { origin: staff },
    form: { guide_id: path },
    maxRedirects: 0,
  });
  expect(access.status()).toBe(303);
  expect(access.headers()["cache-control"]).toContain("no-store");
  expect(access.headers().location).toContain(
    "/rose-care-guides/fictional/demo.pdf",
  );
  const draft = await context.request.post(staff + "/staff/guide", {
    headers: { origin: staff },
    form: { guide_id: "70000000-0000-4000-8000-000000000002" },
    maxRedirects: 0,
  });
  expect(draft.status()).toBe(404);
  await button(page, "Se déconnecter").click();
  await expect(
    page.getByRole("heading", { name: "Espace équipe" }),
  ).toBeVisible();
  const oldCookie = cookies
    .map((cookie) => cookie.name + "=" + cookie.value)
    .join("; ");
  const revoked = await request.get(staff + "/staff/workspace", {
    headers: { cookie: oldCookie },
    maxRedirects: 0,
  });
  expect(revoked.headers().location).toContain("/staff/login");
  expect(
    await page.evaluate(() => localStorage.getItem("rose-care-demo-v2")),
  ).toBeNull();
});

test("logistics cannot see account, order or catalog prices and expiration is enforced without a fresh login", async ({
  page,
  request,
}, testInfo) => {
  // Parallel browser projects use different employees to avoid expiring another case's session.
  const user = testInfo.project.name === "mobile" ? "preparation" : "logistics";
  await login(page, user + "@example.test");
  await page.getByRole("link", { name: "Commandes", exact: true }).click();
  await page.getByText("RCH-51000001", { exact: true }).click();
  await expect(page.getByText(/Total COD|123[,.]45|Démo Atlas/)).toHaveCount(0);
  await expect(button(page, "Confirmer")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Clients 360°" })).toHaveCount(0);
  await page.getByRole("link", { name: "Catalogue", exact: true }).click();
  await expect(page.getByText(/21[,.]25/)).toHaveCount(0);
  await request.post(fixtures + "/_fixture/expire", {
    data: { email: user + "@example.test" },
  });
  await page.goto(staff + "/staff/workspace");
  await expect(
    page.getByRole("heading", { name: "Espace équipe" }),
  ).toBeVisible();
});

test("controlled password recovery uses a one-time page and blocks workspace until password is saved", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The controlled recovery credential is shared by one test",
  );
  await page.goto(staff + "/staff/reset");
  await page.getByLabel("Adresse e-mail").fill("advisor-b@example.test");
  await button(page, "Demander un lien").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Si le compte est éligible" }),
  ).toBeVisible();
  await page.goto(
    staff +
      "/staff/callback#token_hash=controlled-recovery-000003&type=recovery",
  );
  await button(page, "Vérifier le lien").click();
  await expect(
    page.getByRole("heading", { name: "Nouveau mot de passe" }),
  ).toBeVisible();
  await page.goto(staff + "/staff/workspace");
  await expect(
    page.getByRole("heading", { name: "Nouveau mot de passe" }),
  ).toBeVisible();
  await page
    .getByLabel("Nouveau mot de passe")
    .fill("Fictional-recovered-password!");
  await button(page, "Enregistrer le mot de passe").click();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
});

test("a preauthorized invite provisions only the assigned role and cannot be replayed", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Uses a single controlled invitation",
  );
  await login(page, "admin@example.test");
  await page.getByRole("link", { name: "Équipe", exact: true }).click();
  await page.getByText("Préautoriser une invitation", { exact: true }).click();
  await page.getByLabel("Adresse de test").fill("invited@example.test");
  await page.getByLabel("Nom d’affichage").fill("Conseiller Invité Démo");
  await page
    .getByRole("combobox", { name: "Rôle", exact: true })
    .selectOption("advisor");
  await button(page, "Préautoriser l’invitation").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Modifications enregistrées." }),
  ).toBeVisible();
  await button(page, "Se déconnecter").click();
  await page.goto(
    staff + "/staff/callback#token_hash=controlled-invite-000009&type=invite",
  );
  await button(page, "Vérifier le lien").click();
  await expect(
    page.getByRole("heading", { name: "Activer votre accès" }),
  ).toBeVisible();
  await page
    .getByLabel("Nouveau mot de passe")
    .fill("Fictional-invited-password!");
  await button(page, "Enregistrer le mot de passe").click();
  await expect(
    page.getByText("Conseiller Invité Démo · Conseiller"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Journal d’audit" })).toHaveCount(
    0,
  );
  await button(page, "Se déconnecter").click();
  await page.goto(
    staff + "/staff/callback#token_hash=controlled-invite-000009&type=invite",
  );
  await button(page, "Vérifier le lien").click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Ce lien ne peut plus être utilisé." }),
  ).toBeVisible();
});
