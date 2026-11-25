# Supabase integration and environment setup

## Review scope

V0.3 has two separate entry points. `/demo/` is the offline-capable V0.2-style PWA with browser-local fictional data. `/staff/` is an opt-in, authenticated, fixture-only application backed by Supabase Auth, PostgreSQL and private Storage. Its server rendering and mutations do not use demo state. Keep `ROSE_STAFF_ENABLED=false` on any origin until review and worker retirement are complete.

The reference project is `fbfgdbeiitmfotydtxgp` in Paris. A subsequent privileged read-only catalog inspection confirmed all 18 original base tables in `rose_care`, with RLS enabled on all 18 and no direct SELECT grants to anon or authenticated. The earlier count of 16 was incomplete. The existing `rose-care-guides` bucket was private. The inspection did not read rows from business tables or storage objects. The migration targets the existing tables and adds `employee_invites`, for an expected total of 19. Before remote application, match the fixture numeric(12,2) precision for orders.total, orders.shipping, order_items.unit_price and variants.price, verify all constraints and grants, and pass actual disposable Supabase Auth and Storage tests.

## Environment

Copy `.env.example` to an ignored local environment file when using an approved fixture stack.

| Key | Purpose |
| --- | --- |
| `ROSE_STAFF_ENABLED` | Set to `true` only for an authorized fictional environment |
| `ROSE_APP_ORIGIN` | Exact external origin, including port if used. All staff POSTs require this origin. Use HTTPS outside loopback. |
| `SUPABASE_URL` | Auth and Storage project URL for the test stack |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key, or the local legacy `anon` equivalent. It is used server-side. |
| `ROSE_DATABASE_URL` | Role-scoped PostgreSQL connection string for `rose_care_app` or its tenant-qualified pooler username. Remote connections require verified TLS. |
| `ROSE_FLOW_SECRET` | Random secret of at least 43 characters to sign the short-lived invite/recovery gate. Rotate through the hosting secret store. |

No Supabase service-role key is required. Never place the database connection or flow secret in a `NEXT_PUBLIC_` variable. Limit pool sizes according to expected concurrency and the test stack's connection limits. Configure infrastructure log scrubbing for POST bodies, Cookie/Authorization headers and signed Storage URL query strings.

## Testing locally

`pnpm test` bootstraps the reviewed schema shape in PGlite from inspected metadata, applies the real migration and inserts fictional data. `pnpm build && pnpm test:e2e` starts the demo plus a separate loopback-only staff fixture using the real Next application, Supabase SSR client, SQL repository and migration. The staff fixture substitutes a controlled Auth/Storage server, so tests neither contact the reference project nor send email. CI additionally tests overlapping transactions against a disposable PostgreSQL 17 database. This is contract verification, so validate the real Auth and Storage provider with a local Supabase stack before approving any live environment.

For a local Supabase stack, start an **unlinked disposable** stack from a temporary directory. Configure Auth with public and anonymous signup disabled, verified email, short access-token lifetime, and the app origin as the site URL. Use the bundled invite and recovery email templates with the local mail sink. If its database is blank, initialize the controlled copy of the existing schema from the portion of `tests/fixtures/rose-baseline.sql` beginning at `create schema rose_care;`. The earlier part is a PGlite-only stand-in for Auth and Storage and must not be used in Supabase. Then apply the reviewed V0.3 migration and `supabase/fixtures/content.sql` to that local database. The fixtures leave unknown prices and compositions blank.

The migration creates the role as `NOLOGIN`. In the authorized test database, a database operator enables login and sets a generated password using a secure interactive tool. Set no role membership or table grants. Provision the first Admin directly against the UUID of a fictional Auth account and set its employee `staff_fixture=true`. Use the same explicit fixture marker for any approved synthetic records added by a test operator. Create a private `rose-care-guides` bucket on the disposable stack and use a harmless fixture PDF under `fictional/` for the signed-URL smoke test.

## Invitation, recovery and sign-out

1. An Admin preauthorizes the fictional email and non-admin role in **Équipe**. The reservation expires in 24 hours.
2. A trusted Auth operator invites that exact fictional account through the Supabase Auth console using the local mail sink. The app holds no Auth Admin key. Configure the invite/recovery templates in `supabase/templates/`. The email places the hash in the URL fragment and submits it only via an explicit same-origin POST.
3. The application exchanges the verified hash for an SSR session. The password flow is HMAC-bound to the Supabase user, session and purpose. Onboarding consumes a matching reservation and inserts the trusted role in a transaction. The app never creates a staff employee through public signup. The role on any browser or JWT metadata is ignored.
4. Password recovery returns the same user-facing response regardless of account status. It requires a verified active employee before setting the new password. Normal sign-out revokes the current Supabase session, and subsequent database access checks the Auth session row. Configure local provider Auth rate limits and leaked-password protection where supported before use.

## Repositories and migration

The application connects as `rose_care_app` with no direct table grants. Parameterized calls use five reviewable PostgreSQL entry points for identity, scoped workspaces, commands, invitation redemption and guide signing eligibility. `SECURITY DEFINER` functions use an empty search path and explicitly qualified schema names. The server passes only the verified Supabase user and session UUIDs, and the functions validate that binding in `auth.sessions` before authorizing. Database credential theft is outside that trust boundary, so keep the role secret and rotate it independently.

The workspace projects only authorized columns and related rows from employees; customers, addresses and preferences; orders, items and events; products, variants and bundles; templates, conversations and messages; guides and FAQ; tasks, complaints and audit. Operational roles receive no financial amounts. Core record lists are bounded for the review workspace. The app stores COD amounts in PostgreSQL numeric fields and uses order versions plus row locks for order changes. Order creation and transition events share a transaction with the audit entry. Logs hold the actor ID, operation, entity, entity ID and timestamp. They exclude message text, passwords, tokens and contact fields. The migration revokes the existing broad service-role permissions on history/audit and adds append-only triggers. Review that ACL change with any existing privileged writers when planning rollout.

Storage remains private. A staff POST signs only approved fixture PDF paths under `fictional/` and independently passes a user-authenticated Storage RLS check. Signed links remain bearer URLs for 60 seconds and can be used until they expire. A staff guide link in a draft points back to the secured library.

## Worker retirement and hosting gate

Keep deployment out of the V0.3 review. For a later approved transition on the same origin, first deploy the root `/sw.js` retirement script with staff mode disabled. Verify that previously controlled browsers have unregistered the legacy worker and deleted `rose-care-shell-*` caches. Only then enable the staff flag for an approved environment. The staff screen also checks for remaining root control before offering forms and discards obsolete V0.1 browser data. The only new worker is scoped to `/demo/`. Staff responses carry private/no-store, use a per-request script nonce and re-check access after browser history restoration. No service worker caches the staff workspace. Vercel is a hosting target only.
