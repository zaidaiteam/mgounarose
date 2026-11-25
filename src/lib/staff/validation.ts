import { z } from "zod";
import { validTemplate } from "../templates.ts";
import { roles, staffLanguages, statuses } from "./types.ts";

const optionalId = z.union([z.uuid(), z.literal("")]).optional();
const version = z.coerce.number().int().positive().max(2147483647);
const amount = z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/);
const optionalAmount = z
  .union([amount, z.literal("")])
  .transform((value) => value || undefined)
  .optional();
const text = (limit: number) => z.string().trim().min(1).max(limit);
const editorialRoles = roles.slice(1) as [
  Exclude<(typeof roles)[number], "admin">,
  ...Exclude<(typeof roles)[number], "admin">[],
];
const checked = z
  .enum(["on", "off"])
  .default("off")
  .transform((value) => value === "on");
export const fictionalEmail = z
  .email()
  .max(200)
  .transform((value) => value.toLowerCase())
  .refine((value) => /^[a-z0-9._+-]+@example[.]test$/.test(value));
export const newPassword = z.string().min(12).max(128);
export const tokenHash = z
  .string()
  .min(12)
  .max(512)
  .regex(/^[a-zA-Z0-9_-]+$/);

const commandSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("order.transition"),
    id: z.uuid(),
    version,
    status: z.enum(statuses),
  }),
  z.strictObject({
    action: z.literal("order.assign"),
    id: z.uuid(),
    version,
    preparation_id: optionalId,
    logistics_id: optionalId,
  }),
  z.strictObject({
    action: z.literal("order.create"),
    customer_id: z.uuid(),
    address_id: z.uuid(),
    shipping: optionalAmount,
    discount: optionalAmount,
    lines: z
      .array(
        z.strictObject({
          variant_id: z.uuid(),
          quantity: z.coerce.number().int().min(1).max(999),
          unit_price: optionalAmount,
        }),
      )
      .min(1)
      .max(16),
  }),
  z.strictObject({
    action: z.literal("customer.create"),
    name: text(100).refine((value) => value.startsWith("Démo ")),
    title: z.enum(["Mme", "M."]),
    email: fictionalEmail,
    phone: z.string().regex(/^DEMO-\d{3,8}$/),
    address: text(200).refine((value) => value.startsWith("Adresse fictive ")),
    city: text(80),
    language: z.enum(staffLanguages),
    advisor_id: optionalId,
  }),
  z.strictObject({
    action: z.literal("customer.note"),
    customer_id: z.uuid(),
    note: text(500),
  }),
  z.strictObject({
    action: z.literal("customer.preferences"),
    customer_id: z.uuid(),
    channel: z.enum(["phone", "email", "none"]),
  }),
  z.strictObject({
    action: z.literal("complaint.create"),
    customer_id: z.uuid(),
    order_id: optionalId,
    category: text(80),
    details: text(1500),
  }),
  z.strictObject({ action: z.literal("complaint.close"), id: z.uuid() }),
  z.strictObject({
    action: z.literal("conversation.create"),
    customer_id: z.uuid(),
  }),
  z.strictObject({
    action: z.literal("message.record"),
    conversation_id: z.uuid(),
    body: text(3000),
  }),
  z.strictObject({
    action: z.literal("task.create"),
    customer_id: optionalId,
    order_id: optionalId,
    assignee_id: optionalId,
    title: text(120),
    kind: z.enum(["task", "callback"]),
    due: z.iso.date(),
  }),
  z.strictObject({
    action: z.literal("task.toggle"),
    id: z.uuid(),
    status: z.enum(["open", "done"]),
  }),
  z.strictObject({
    action: z.literal("template.save"),
    id: optionalId,
    version: version.optional(),
    category: text(80),
    language: z.enum(staffLanguages),
    approved: checked,
    body: text(2000).refine(validTemplate),
  }),
  z.strictObject({
    action: z.literal("knowledge.save"),
    id: optionalId,
    kind: z.enum(["guide", "faq"]),
    category: text(80),
    title: text(140),
    body: text(3000),
    language: z.enum(staffLanguages),
    approved: checked,
  }),
  z.strictObject({
    action: z.literal("catalog.variant"),
    id: z.uuid(),
    price: optionalAmount,
    stock: z.union([z.literal(""), z.string().regex(/^\d{1,6}$/)]).optional(),
  }),
  z.strictObject({
    action: z.literal("catalog.bundle"),
    id: z.uuid(),
    component_id: z.uuid(),
    quantity: z.coerce.number().int().min(0).max(999),
  }),
  z.strictObject({
    action: z.literal("employee.change"),
    id: z.uuid(),
    role: z.enum(editorialRoles),
    active: checked,
  }),
  z.strictObject({
    action: z.literal("employee.invite"),
    email: fictionalEmail,
    name: text(100),
    role: z.enum(editorialRoles),
  }),
]);
export type Command = z.infer<typeof commandSchema>;

export function parseCommand(form: FormData) {
  const entries = [...form.entries()].filter(
    ([key]) => !key.startsWith("$ACTION_") && key !== "return_to",
  );
  if (entries.some(([, value]) => typeof value !== "string")) return null;
  const payload = Object.fromEntries(entries);
  if (payload.action === "order.create") {
    const variants = form.getAll("variant_id");
    const quantities = form.getAll("quantity");
    const prices = form.getAll("unit_price");
    if (
      variants.length !== quantities.length ||
      (prices.length && variants.length !== prices.length) ||
      variants.length > 16
    )
      return null;
    delete payload.variant_id;
    delete payload.quantity;
    delete payload.unit_price;
    const lines = variants.flatMap((variant_id, index) =>
      variant_id
        ? [
            {
              variant_id,
              quantity: quantities[index],
              unit_price: prices[index],
            },
          ]
        : [],
    );
    const parsed = commandSchema.safeParse({ ...payload, lines });
    return parsed.success ? parsed.data : null;
  }
  if (Object.keys(payload).length !== entries.length) return null;
  const parsed = commandSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}
