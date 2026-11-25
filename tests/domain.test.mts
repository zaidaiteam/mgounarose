import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../src/lib/catalog.ts";
import {
  dateAgo,
  languages,
  localDate,
  matches,
  orderAmounts,
  templateKinds,
  toCents,
  updateOrder,
  type OrderStatus,
} from "../src/lib/domain.ts";
import { fictionalStore } from "../src/lib/fixtures.ts";
import {
  legacyStorageKey,
  readDemoStorage,
  storageKey,
  validateStore,
} from "../src/lib/storage.ts";
import {
  defaultTemplates,
  messageValues,
  renderTemplate,
  validTemplate,
} from "../src/lib/templates.ts";

test("order lifecycle records preparation, failed delivery, retry and return without changing line prices", () => {
  const seed = fictionalStore();
  const order = seed.orders[0];
  const steps: OrderStatus[] = [
    "Confirmée",
    "En préparation",
    "Expédiée",
    "Échec de livraison",
    "En préparation",
    "Expédiée",
    "Livrée",
    "Retour demandé",
    "Retournée",
  ];
  const updated = steps.reduce(
    (store, status) => updateOrder(store, order.id, status),
    seed,
  );
  assert.deepEqual(
    updated.orders[0].history.map((entry) => entry.status),
    ["À confirmer", ...steps],
  );
  assert.deepEqual(updated.orders[0].lines, order.lines);
  assert.equal(seed.orders[0].status, "À confirmer");
  assert.equal(updateOrder(updated, order.id, "Expédiée"), updated);
  assert.ok(validateStore(updated));
});

test("invalid, repeated, missing and terminal order transitions leave state untouched", () => {
  const seed = fictionalStore();
  const id = seed.orders[0].id;
  assert.equal(updateOrder(seed, id, "Livrée"), seed);
  assert.equal(updateOrder(seed, id, "À confirmer"), seed);
  assert.equal(updateOrder(seed, "unknown", "Confirmée"), seed);
  const cancelled = updateOrder(seed, id, "Annulée");
  assert.equal(updateOrder(cancelled, id, "Confirmée"), cancelled);
});

test("COD combines line quantities, fees and discounts exactly in cents", () => {
  const lines = [
    { variantId: "one", label: "One", quantity: 3, unitPrice: toCents("1.10") },
    {
      variantId: "two",
      label: "Two",
      quantity: 2,
      unitPrice: toCents("12.55"),
    },
  ];
  assert.deepEqual(
    orderAmounts({
      lines,
      deliveryFee: toCents("20.50"),
      discount: toCents("15.99"),
    }),
    { subtotal: 2840, total: 3291, valid: true },
  );
  assert.equal(
    orderAmounts({ lines, deliveryFee: 0, discount: 4000 }).valid,
    false,
  );
  for (const value of ["-1", "", "1e2", "1000000", "2.001"])
    assert.ok(Number.isNaN(toCents(value)));
});

test("catalog includes all sizes and pre-orders and leaves prices and compositions unset", () => {
  const products = catalog();
  assert.equal(products.length, 10);
  assert.equal(
    products.filter((product) => product.kind === "Coffret").length,
    5,
  );
  const essential = products.find((item) => item.id === "essential")!;
  assert.deepEqual(
    essential.variants.map((variant) => variant.size),
    ["5 mL", "10 mL", "20 mL"],
  );
  assert.ok(
    essential.variants.every(
      (variant) => variant.availability === "Précommande",
    ),
  );
  assert.ok(
    products.every(
      (item) =>
        item.components.length === 0 &&
        item.variants.every((variant) => variant.price === null),
    ),
  );
});

test("forty templates render all required variables with per-language salutations and no interpolation of inserted text", () => {
  const seed = fictionalStore();
  const templates = defaultTemplates();
  assert.equal(templates.length, languages.length * templateKinds.length);
  for (const template of templates) {
    assert.ok(validTemplate(template.body));
    const result = renderTemplate(
      template.body,
      messageValues(
        template.language,
        seed.customers[0],
        seed.orders[0],
        seed.employees[0],
        "http://localhost/#guides/g1",
      ),
    );
    assert.deepEqual(result.missing, []);
    assert.match(result.text, /Démo Atlas/);
    assert.match(result.text, /Conseiller Démo Olive/);
  }
  assert.equal(
    renderTemplate("{{client}}", { client: "{{total}}" }).text,
    "{{total}}",
  );
  assert.deepEqual(renderTemplate("{{total}}", {}).missing, ["total"]);
  assert.equal(validTemplate("{{unknown}}"), false);
  assert.equal(validTemplate("{{total}"), false);
});

test("storage rejects foreign profiles, contact mutations, unknown references and bad template text", () => {
  const seed = fictionalStore();
  assert.deepEqual(validateStore(seed), seed);
  assert.equal(validateStore({ ...seed, guests: [] }), null);
  for (const change of [
    (data: typeof seed) => {
      data.customers[0].email = "private@example.com";
    },
    (data: typeof seed) => {
      data.orders[0].address = "An arbitrary delivery address";
    },
    (data: typeof seed) => {
      data.orders[0].advisorId = "unknown";
    },
    (data: typeof seed) => {
      data.orders[0].lines[0].label = "External product";
    },
    (data: typeof seed) => {
      data.templates[0].body = "Appelez le 0600000000";
    },
    (data: typeof seed) => {
      data.knowledge[0].text = "Écrivez à test@example.com";
    },
    (data: typeof seed) => {
      data.tasks[0].orderId = "RCH-1046";
    },
  ]) {
    const data = structuredClone(seed);
    change(data);
    assert.equal(validateStore(data), null);
  }
});

test("storage removes legacy and malformed payloads and restores fixture state", () => {
  const saved = new Map([
    [storageKey, "{invalid"],
    [legacyStorageKey, "{}"],
  ]);
  const result = readDemoStorage({
    getItem: (key) => saved.get(key) ?? null,
    removeItem: (key) => {
      saved.delete(key);
    },
  });
  assert.equal(saved.size, 0);
  assert.ok(result.notice);
  assert.equal(result.store.orders.length, 5);
  assert.deepEqual(validateStore(result.store), result.store);
});

test("search and Casablanca business dates support accent and month rollover", () => {
  assert.ok(matches(" expédiée  demo ", "Démo Atlas", "Expediee"));
  assert.ok(matches("رَوز", "روز"));
  assert.ok(!matches("bonjour", "Atlas"));
  const now = new Date("2026-12-01T00:30:00Z");
  assert.equal(localDate(now), "2026-12-01");
  assert.equal(dateAgo(1, now), "2026-11-30");
});
