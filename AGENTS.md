# Rose Care Hub

- Keep the interface French-first. Message templates support French, Moroccan Darija (Latin script), Arabic and English.
- Use Next.js App Router, TypeScript, Tailwind CSS and the local shadcn/ui components.
- Use the predefined fictional profiles for customer and delivery details. Do not query the private Supabase schema, expose credentials, access real customer records, modify Shopify, send messages or deploy this prototype.
- Preserve order history and line prices when editing catalog items. Keep business rules in `src/lib`.
- The service worker can cache only the public fixture shell and its allowlisted assets. Keep authenticated routes and runtime responses out of the cache.
- Before requesting review, run `pnpm audit`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e`.
