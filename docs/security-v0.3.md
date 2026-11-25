# V0.3 security verification

## Architecture reviewed

- Verified merged main and inspected the reference Supabase project read-only through PostgreSQL metadata. No business records, guide files or credentials were read.
- Matched the supported Supabase SSR cookie adapter and password verification flow. Supabase SDKs are pinned with the frozen lockfile. The scoped database role has no raw-table permissions and the application does not use a service-role key.
- Verified that there is no public registration, real record import, external message action or deployment step.

## Local results

On 25 November 2026, the frozen install, dependency audit, lint, TypeScript check and production build passed. The registry reported zero known advisories. All 19 local unit and PGlite cases and all 18 enabled browser cases passed. The browser tests use desktop and mobile Chromium. The local macOS sandbox required isolated single-process browser invocations. The GitHub workflow uses standard Playwright and a two-connection PostgreSQL race test that is skipped locally when PostgreSQL is unavailable.

## Verification coverage

| Control | Verification |
| --- | --- |
| Authentication and status | Browser login, denied anonymous route, inactive and out-of-scope employee, verified session cookies, password recovery and invitation flows against a controlled Auth fixture |
| Session revocation | Replay of a revoked test cookie after sign-out, database expiration even when the JWT remains valid, and inactive employee check after a role mutation |
| Assignment and financial isolation | Real SQL projection tests for distinct assigned customers and orders, and browser checks across role-specific pages |
| State and transaction safety | Role-limited confirmation, preparation and dispatch. Integrity tests force an audit-insert failure and verify order creation rolls back. The PostgreSQL 17 CI case races actions with the same version and asserts one surviving event. |
| Record and guide protection | Tests for raw-table privilege denial, unauthorized role mutations, archive/audit immutability, SQL-level Storage RLS, short signed guide access and same-origin enforcement |
| Data and browser cache | Demo worker remains available only under its scope. Staff cookies are HttpOnly and path-scoped. Staff routes serve private/no-store and a nonce script policy without production unsafe-eval. Real customer values are not loaded or placed in browser storage. |

The browser suite exercises the real Next application and SSR library, with a controlled fictional provider. Its success does not replace provider-specific checks against a disposable Supabase Auth/SMTP/Storage setup. The reference project's Auth signup settings, actual email template rendering and Storage signed-file behavior were left untouched and unverified. Auth account invitations require a trusted operator. The scoped runtime and migration are for review before changing any production access policy.

References [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [Supabase SSR advanced guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), and [Supabase invite API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail).
