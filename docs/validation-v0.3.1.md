# V0.3.1 integration validation

## Reconciled schema

A read-only PostgreSQL catalog query on the reference project confirmed 18 base tables, RLS on every table and no effective direct SELECT for `anon` or `authenticated`. The private guide bucket remains the configured target. The baseline preserves the verified column types, named constraints and foreign keys, indexes, and existing grants. The metadata-only inventory is in `tests/fixtures/rose-catalog.json`. The migration test verifies all 18, the new private invitation table, the intentional replacement of the order status check, and the intentional removal of service-role grants on audit and order history.

The numeric fields for order total, shipping, item unit price and variant price are `numeric(12,2)`. Orders accept a maximum final COD total of 9,999,999,999.99 MAD. Crossing the maximum by one cent fails before creating the order, lines, history or audit. Staff-entered unit prices, fees and discounts retain the separate 999,999.99 MAD ceiling. PostgreSQL also rejects values that would round above its numeric capacity.

The runtime login has no direct privilege on any private table. Only five explicit entry points are callable by that login. Anonymous, authenticated, service-role and PUBLIC execution of private functions are checked. Storage has a separate user-scoped policy function for approved fixture PDFs. Application orders now require an explicit fixture marker in addition to fixture customer ownership. Assignment mutations use the same order version and row lock as status changes, check active fulfillment assignees while holding share locks, and recheck session expiry after acquiring the order lock.

## Reproduce the disposable environment

Install Node 24, the pinned pnpm from the repository, Supabase CLI 2.75.0, and a local Docker-compatible engine. The GitHub workflow runs the same command on its existing free Linux runner. No linked project is used.

```sh
pnpm install --frozen-lockfile
pnpm audit
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:supabase
```

The last command creates a temporary unlinked CLI directory under ignored `work/`, initializes real Supabase PostgreSQL, GoTrue, Storage and the local mail sink, creates unique fictional accounts, and runs Chromium against the application. It uses fixed loopback ports 3101 and 54320–54324. Stop other dev stacks on those ports first. Teardown removes only that uniquely named stack and its test data. The provider suite prevents non-loopback endpoints and keeps generated credentials in process memory. It disables browser traces for the actual-provider suite to avoid collecting session cookies and one-time tokens.

The suite checks all five roles, inactive and anonymous denial, disabled public signup, invitation and recovery through real local emails, session revocation, cross-advisor isolation, competing writes, audit protection, private signed document access including expiry, and staff cache isolation.

## Bootstrap a fixture administrator

The automatic test harness uses the local Auth administrator API exclusively for fictional accounts. To provision a human-operated fixture stack, create and verify a single account under `example.test` in the **local** Supabase Auth console. Copy its Auth user UUID. Connect through a trusted local operator account with `psql`, verify the target with `\conninfo`, and use the UUID only after confirming the account has no existing employee record.

```sql
\prompt 'Fictional Auth user UUID: ' fixture_admin_uuid
begin;
insert into rose_care.employees(id, display_name, role, active, staff_fixture)
select id, 'Administrateur Démo', 'admin', true, true
from auth.users
where id = :'fixture_admin_uuid'::uuid
  and email ~* '^[a-z0-9._+-]+@example[.]test$'
  and email_confirmed_at is not null;
commit;
```

Confirm the insert reports one row. The bootstrap does not overwrite an existing employee or promote one in place. Use a generated runtime password with the interactive `\password rose_care_app` command and then enable LOGIN for that role in the disposable cluster. Store the scoped DSN and flow secret in an ignored local environment file. Give the application only the publishable Auth key. Keep the local Auth administrator key outside the runtime configuration. Use the local mail sink to invite subsequent roles and keep signup disabled.

## Evidence and limits

The PR records the CI run, actual-provider results, and any tests that could not run. The workstation used for development has no Docker daemon; the provider integration job is executed in a disposable environment on the existing Linux CI runner. No migration or fixture data is applied to the reference project.
