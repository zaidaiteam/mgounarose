# Rose Care Hub

- Keep the interface French-first. Message templates support French, Darija (Latin script), Arabic and English.
- Use Next.js App Router, TypeScript, Tailwind CSS and the local shadcn/ui components.
- Use fictional development data only. Do not query the private Supabase schema, expose credentials, access real customer records, modify Shopify or deploy as part of V0.1.
- Preserve order history and prices when editing catalog items. Keep business rules in `src/lib`.
- Before requesting review, run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build`.
