"use client";
import { useState } from "react";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui/button";

type Person = {
  id: string;
  name: string;
  addresses: { id: string; label: string }[];
};
type Item = { id: string; title: string; price: number | null };

export function OrderFields({
  people,
  items,
  editorial,
}: {
  people: Person[];
  items: Item[];
  editorial: boolean;
}) {
  const [customerId, setCustomer] = useState("");
  const [lines, setLines] = useState([0]);
  const addresses =
    people.find((item) => item.id === customerId)?.addresses ?? [];
  return (
    <>
      <div className="profile-grid">
        <Field label="Client fictif">
          <select
            name="customer_id"
            required
            value={customerId}
            onChange={(event) => setCustomer(event.target.value)}
          >
            <option value="">Choisir un profil</option>
            {people.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adresse de livraison">
          <select key={customerId} name="address_id" required>
            <option value="">Choisir une adresse</option>
            {addresses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {lines.map((key, index) => (
        <div key={key} className="order-line">
          <Field label={`Article ${index + 1}`}>
            <select name="variant_id" required>
              <option value="">Choisir une variante</option>
              {items
                .filter((item) => editorial || item.price !== null)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                    {item.price === null
                      ? " · prix à renseigner"
                      : ` · ${item.price} MAD`}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={`Quantité ${index + 1}`}>
            <input
              name="quantity"
              type="number"
              min="1"
              max="999"
              required
              defaultValue="1"
            />
          </Field>
          {editorial && (
            <Field label={`Prix fictif ${index + 1} (MAD)`}>
              <input
                name="unit_price"
                type="number"
                min="0"
                max="999999.99"
                step="0.01"
              />
            </Field>
          )}
          {lines.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setLines((current) => current.filter((line) => line !== key))
              }
            >
              Retirer l’article {index + 1}
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={lines.length >= Math.min(items.length, 16)}
          onClick={() =>
            setLines((current) => [...current, Math.max(...current) + 1])
          }
        >
          Ajouter un article
        </Button>
      </div>
      {editorial && (
        <div className="profile-grid">
          <Field label="Livraison (MAD)">
            <input
              name="shipping"
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              defaultValue="0"
            />
          </Field>
          <Field label="Remise (MAD)">
            <input
              name="discount"
              type="number"
              min="0"
              max="999999.99"
              step="0.01"
              defaultValue="0"
            />
          </Field>
        </div>
      )}
    </>
  );
}
