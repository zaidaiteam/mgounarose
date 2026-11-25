import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
const password = process.env.ROSE_LOCAL_FIXTURE_PASSWORD!;
const origin = "http://127.0.0.1:3101";
const order = "51000001-0000-4000-8000-000000000001";
const guide = "70000000-0000-4000-8000-000000000001";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const button = (page: Page, label: string) =>
  page.getByRole("button", { name: label, exact: true });
async function login(page: Page, name: string) {
  await page.goto("/staff/login");
  await page.getByLabel("Adresse e-mail").fill(name + "@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await button(page, "Se connecter").click();
}
async function mailLink(email: string, type: "invite" | "recovery") {
  let link = "";
  await expect
    .poll(
      async () => {
        const result = await fetch("http://127.0.0.1:54324/api/v1/messages");
        const inbox = await result.json();
        const message = inbox.messages.find(
          (item: { To: { Address: string }[] }) =>
            item.To.some((recipient) => recipient.Address === email),
        );
        if (!message) return false;
        const detail = await (
          await fetch("http://127.0.0.1:54324/api/v1/message/" + message.ID)
        ).json();
        const match = String(detail.HTML ?? detail.Text).match(
          /http:\/\/127\.0\.0\.1:3101\/staff\/callback#token_hash=[\w-]+(?:&amp;|&)type=(?:invite|recovery)/,
        );
        if (!match) return false;
        const candidate = match[0].replace("&amp;", "&");
        if (!candidate.endsWith("type=" + type)) return false;
        link = candidate;
        return true;
      },
      {
        timeout: 20_000,
        message: "The local email sink received the expected callback",
      },
    )
    .toBe(true);
  return link;
}
test("actual Auth and app enforce all five roles and active status", async ({
  page,
  request,
}) => {
  const anonymous = await request.get("/staff/workspace", { maxRedirects: 0 });
  expect(anonymous.headers().location).toBe("/staff/login");
  expect(anonymous.headers()["cache-control"]).toContain("no-store");
  for (const [user, label] of [
    ["admin", "Admin"],
    ["manager", "Manager"],
    ["advisor-a", "Conseiller"],
    ["logistics", "Logistique"],
    ["preparation", "Préparation"],
  ]) {
    await login(page, user);
    await expect(
      page.getByRole("heading", { name: "Tableau de bord" }),
    ).toBeVisible();
    const staff = page.getByRole("banner");
    await expect(staff).toContainText(" · " + label);
    const nav = page.getByRole("navigation", { name: "Navigation équipe" });
    await expect(
      nav.getByRole("link", { name: "Journal d’audit" }),
    ).toHaveCount(user === "admin" ? 1 : 0);
    await nav.getByRole("link", { name: "Commandes", exact: true }).click();
    await page.getByText("RCH-51000001", { exact: true }).click();
    if (["logistics", "preparation"].includes(user)) {
      await expect(page.getByText("Total COD", { exact: false })).toHaveCount(
        0,
      );
      await expect(button(page, "Confirmer")).toHaveCount(0);
    }
    if (user === "advisor-a")
      await expect(page.getByText("RCH-51000002", { exact: true })).toHaveCount(
        0,
      );
    const storage = await page.evaluate(async () => ({
      controller: navigator.serviceWorker.controller?.scriptURL ?? null,
      keys: Object.keys(localStorage),
      caches: await caches.keys(),
    }));
    expect(storage).toEqual({ controller: null, keys: [], caches: [] });
    await button(page, "Se déconnecter").click();
    await expect(
      page.getByRole("heading", { name: "Espace équipe" }),
    ).toBeVisible();
  }
  await login(page, "inactive");
  await expect(
    page.getByRole("status").filter({ hasText: "Connexion indisponible" }),
  ).toBeVisible();
  const pub = createClient(url, key, options);
  const { error } = await pub.auth.signUp({
    email: "uninvited@example.test",
    password,
  });
  expect(error?.code).toBe("signup_disabled");
});
test("actual email invitation and recovery are redeemed through the app", async ({
  page,
}) => {
  await login(page, "admin");
  await page.getByRole("link", { name: "Équipe", exact: true }).click();
  await page.getByText("Préautoriser une invitation", { exact: true }).click();
  await page.getByLabel("Adresse de test").fill("invite-real@example.test");
  await page.getByLabel("Nom d’affichage").fill("Conseiller Invité Réel Démo");
  await page
    .getByRole("combobox", { name: "Rôle", exact: true })
    .selectOption("advisor");
  await button(page, "Préautoriser l’invitation").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Modifications enregistrées" }),
  ).toBeVisible();
  const admin = createClient(url, process.env.ROSE_LOCAL_API_ADMIN!, options);
  expect(
    (await admin.auth.admin.inviteUserByEmail("invite-real@example.test")).error
      ?.code ?? null,
  ).toBeNull();
  const invite = await mailLink("invite-real@example.test", "invite");
  await button(page, "Se déconnecter").click();
  await page.goto(invite);
  await button(page, "Vérifier le lien").click();
  await expect(
    page.getByRole("heading", { name: "Activer votre accès" }),
  ).toBeVisible();
  await page.getByLabel("Nouveau mot de passe").fill(password);
  await button(page, "Enregistrer le mot de passe").click();
  await expect(page.getByRole("banner")).toContainText(
    "Conseiller Invité Réel Démo · Conseiller",
  );
  await button(page, "Se déconnecter").click();
  await page.goto("/staff/reset");
  await page.getByLabel("Adresse e-mail").fill("advisor-b@example.test");
  await button(page, "Demander un lien").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Si le compte est éligible" }),
  ).toBeVisible();
  await page.goto(await mailLink("advisor-b@example.test", "recovery"));
  await button(page, "Vérifier le lien").click();
  await expect(
    page.getByRole("heading", { name: "Nouveau mot de passe" }),
  ).toBeVisible();
  await page.getByLabel("Nouveau mot de passe").fill(password + "A");
  await button(page, "Enregistrer le mot de passe").click();
  await expect(page.getByRole("banner")).toContainText("Conseiller Démo Oasis");
});
test("actual private Storage, expiration, Auth revocation and database isolation", async ({
  page,
  request,
  context,
}) => {
  await login(page, "advisor-a");
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  const oldCookies = await context.cookies(origin + "/staff/workspace");
  const signed = await context.request.post("/staff/guide", {
    headers: { origin },
    form: { guide_id: guide },
    maxRedirects: 0,
  });
  expect(signed.status()).toBe(303);
  expect(signed.headers()["cache-control"]).toContain("no-store");
  expect((await request.get(signed.headers().location)).ok()).toBe(true);
  const pub = createClient(url, key, options);
  expect(
    (await pub.storage.from("rose-care-guides").download("fictional/demo.pdf"))
      .error,
  ).toBeTruthy();
  const advisor = createClient(url, key, options);
  const auth = await advisor.auth.signInWithPassword({
    email: "advisor-a@example.test",
    password,
  });
  expect(auth.error?.code ?? null).toBeNull();
  const oneSecond = await advisor.storage
    .from("rose-care-guides")
    .createSignedUrl("fictional/demo.pdf", 1);
  expect(oneSecond.error?.name ?? null).toBeNull();
  const expiringUrl = oneSecond.data!.signedUrl;
  await expect
    .poll(async () => (await request.get(expiringUrl)).ok(), { timeout: 8000 })
    .toBe(false);

  const claims = (await advisor.auth.getClaims()).data!.claims!;
  const sql = postgres(process.env.ROSE_DATABASE_URL!, { prepare: false });
  try {
    await expect(
      sql`select rose_care.staff_command(${claims.sub}::uuid,${String(claims.session_id)}::uuid,'order.transition',${sql.json({ id: "51000002-0000-4000-8000-000000000002", version: 1, status: "confirmed" })})`,
    ).rejects.toMatchObject({ code: "42501" });
    await expect(sql`delete from rose_care.audit_logs`).rejects.toMatchObject({
      code: "42501",
    });
    const assignment = async (status: string) =>
      sql`select rose_care.staff_command(${claims.sub}::uuid,${String(claims.session_id)}::uuid,'order.transition',${sql.json({ id: order, version: 1, status })})`;
    const race = await Promise.allSettled([
      assignment("confirmed"),
      assignment("cancelled"),
    ]);
    expect(race.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(
      race.find((result) => result.status === "rejected")?.reason.code,
    ).toBe("40001");
  } finally {
    await sql.end();
  }
  await button(page, "Se déconnecter").click();
  await expect(
    page.getByRole("heading", { name: "Espace équipe" }),
  ).toBeVisible();
  const revoked = await request.get("/staff/workspace", {
    headers: {
      cookie: oldCookies
        .map(({ name, value }) => name + "=" + value)
        .join("; "),
    },
    maxRedirects: 0,
  });
  expect(revoked.headers().location).toContain("/staff/login");
});
