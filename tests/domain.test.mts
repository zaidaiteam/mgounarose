import assert from "node:assert/strict";
import test from "node:test";
import { dateAgo, languages, localDate, matches, message, updateOrder, type Store } from "../src/lib/domain.ts";

const seed: Store = {
  customers: [], products: [], tasks: [], employees: [],
  orders: [{ id: "RCH-01", customerId: "c1", productId: "p1", quantity: 2, unitPrice: 120, date: "2026-11-25", status: "À confirmer" }],
};

test("confirmation and fulfillment follow allowed transitions without changing price", () => {
  const confirmed = updateOrder(seed, "RCH-01", "Confirmée");
  const shipped = updateOrder(confirmed, "RCH-01", "Expédiée");
  const delivered = updateOrder(shipped, "RCH-01", "Livrée");
  assert.equal(delivered.orders[0].status, "Livrée");
  assert.equal(delivered.orders[0].unitPrice, 120);
  assert.equal(seed.orders[0].status, "À confirmer");
});
test("invalid, repeated and missing order transitions leave the store untouched", () => {
  assert.equal(updateOrder(seed, "RCH-01", "Livrée"), seed);
  assert.equal(updateOrder(seed, "RCH-01", "À confirmer"), seed);
  assert.equal(updateOrder(seed, "unknown", "Confirmée"), seed);
});
test("all four languages personalize all three message templates", () => {
  const drafts = languages.map((lang) => {
    const confirmation = message(lang, "Confirmation", "Salma", "RCH-01", "Eau de rose");
    assert.match(confirmation, /Salma.*RCH-01.*Eau de rose/s);
    assert.match(message(lang, "Suivi", "Salma", "RCH-01", ""), /Salma.*RCH-01/s);
    assert.match(message(lang, "Conseil", "Salma", "", "Eau de rose"), /Salma.*Eau de rose/s);
    return confirmation;
  });
  assert.equal(new Set(drafts).size, 4);
});
test("search ignores accents and case and supports Arabic", () => {
  assert.ok(matches("  expediee ", "Expédiée"));
  assert.ok(matches("رَوز", "روز"));
  assert.ok(!matches("bonjour", "Salma"));
});
test("business dates use Casablanca and handle month rollover", () => {
  const now = new Date("2026-12-01T00:30:00Z");
  assert.equal(localDate(now), "2026-12-01");
  assert.equal(dateAgo(1, now), "2026-11-30");
});
