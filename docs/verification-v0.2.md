# Rose Care Hub V0.2 verification

## Scope

The prototype uses predefined fictional profiles and browser-local storage. The catalog is based on the product and size list supplied for V0.2. Catalog prices, stocks and bundle compositions are initially blank. Existing sample orders use explicitly fictional monetary amounts.

## Automated checks

On 25 November 2026, the frozen install, audit, lint, type checking and production build passed. The npm registry audit returned zero known advisories. All 10 unit tests and all 10 Playwright cases passed locally. The local macOS runner used a fresh single-process Chromium for each case because its sandbox prevents the standard multiprocess launch. The GitHub Actions workflow uses the standard Chromium configuration.

| Check | Coverage |
| --- | --- |
| `pnpm audit` | Registry advisories for the locked production and development dependency graph |
| `pnpm test` | Order transitions, immutable unit-price snapshots, decimal-to-cent conversion, COD, catalog, all 40 template variants, unsafe storage, search, Casablanca date rollover and restricted service-worker caching |
| `pnpm lint` | ESLint and Next.js rules |
| `pnpm typecheck` | Generated Next.js route types and TypeScript checks for application, tests and config |
| `pnpm build` | Optimized production build and prerender of the public offline shell |
| `pnpm test:e2e` | Five end-to-end scenarios in desktop and mobile Chromium against a local production server |

The five browser scenarios cover multi-line checkout with fees and discount, preparation and dispatch, failed delivery and recovery, linked callbacks and their performance impact, returns and cancellation, catalog variants and bundle composition, guide editing and sharing, all four message languages, template persistence and rejection of contact details, fixture-only profiles, reset confirmation, viewport fit, production response headers and offline reload. The tests use the local server and fictional records.

## Data isolation

- The validated storage format pins customer and employee identities to fixture definitions and checks contact snapshots, item variants, relationships and status histories. Untrusted or incompatible payloads restore the defaults. The old key is purged because V0.1 supported free-form customer details.
- No integration, outbound message transport or live data source is configured. Free-form editorial text is intended for generic prose and rejects common phone, email and URL patterns. Such checks cannot classify every arbitrary name or address. The demo must never be used with live records.
- Production responses include a Content Security Policy, frame denial, MIME sniffing prevention, a restricted permissions policy, a no-referrer policy and indexing directives. Static Next.js hydration requires inline scripts in this build. Production forbids script evaluation and restricts connections to the same origin. Indexing directives do not provide access control.

## Service worker

The installer fetches only `/offline-demo` and allowlisted static files, omits credentials and rejects redirects, private and no-store responses, and responses that vary on cookies or authorization. The shell must explicitly opt in. Once installed, the worker writes no runtime responses to its cache. A root navigation gets the public fixture shell only on network failure. An HTTP error such as 401 is returned unchanged. URLs with queries, authenticated request headers, API paths and cross-origin requests are outside this fallback.

Activation removes older Rose Care shell caches. If no eligible shell can be cached, the new worker still retires the old cache. Keep the offline route fixture-only. Reassess or unregister the demo service worker before serving an authenticated application from the same origin.

## CI

The workflow uses a read-only token, leaves checkout credentials unpersisted and pins actions by commit SHA. It uses standard GitHub-hosted Ubuntu runners without a deployment step. See the pull request checks for the remote run.
