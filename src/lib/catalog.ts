import type { Product, Variant } from "./domain.ts";

const definitions: [string, string, string[]][] = [
  ["mist", "Rose Water Mist", ["125 mL", "200 mL"]],
  ["water", "Pure Rose Water", ["250 mL", "500 mL"]],
  ["oil", "Rose Oil", ["30 mL", "50 mL"]],
  ["essential", "Rose Essential Oil", ["5 mL", "10 mL", "20 mL"]],
  ["buds", "Dried Damask Rose Buds", ["100 g", "200 g"]],
  ["discovery", "Rose Discovery Ritual", []],
  ["care", "Rose Care Ritual", []],
  ["blossom", "Rose Blossom Ritual", []],
  ["valley", "Rose Valley Ritual", []],
  ["signature", "Rose Valley Signature Collection", []],
];

export function catalog(): Product[] {
  return definitions.map(([id, name, sizes]) => ({
    id,
    name,
    kind: sizes.length ? "Produit" : "Coffret",
    variants: (sizes.length ? sizes : [""]).map(
      (size, index): Variant => ({
        id: `${id}-${index + 1}`,
        size,
        price: null,
        stock: null,
        availability: id === "essential" ? "Précommande" : "Standard",
      }),
    ),
    components: [],
  }));
}
