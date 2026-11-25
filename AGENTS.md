# Rose Care Hub

- Keep the interface French-first and preserve the isolated fictional PWA under `/demo/`.
- Use Next.js App Router, TypeScript, Tailwind CSS and the local shadcn/ui components.
- Work with fictional data. Use Supabase project metadata only unless a later review explicitly authorizes live records. Never apply unreviewed migrations, deploy, or send external messages.
- Keep Supabase authentication and the scoped PostgreSQL connection server-only. Add record authorization and SQL tests for every data operation. Do not trust user metadata for authorization.
- Never persist authenticated records in localStorage, add staff routes to a worker cache, or expose credentials. Keep the root worker as a retirement script.
- Before requesting review, run frozen install, audit, unit tests, lint, typecheck, production build and desktop/mobile browser tests. Run the lock race against dedicated PostgreSQL in CI.
