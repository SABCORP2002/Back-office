# JAL Trade — Back Office

Web admin platform (React + TypeScript + Vite + Tailwind), built to match the
10-screen maquette: Dashboard, Transactions, Utilisateurs, KYC & Conformité,
Fournisseurs, Taux & Marges, Pays & Paiements, Support & Litiges, Finance &
Rapports, Paramètres & Sécurité.

## Client delivery

This folder is self-contained. `server/` contains the NestJS backend and its
PostgreSQL Prisma schema. `docker-compose.production.yml` starts the web
interface, API, database, and HTTPS proxy together.

For the client installation, follow **[DEPLOYMENT.md](DEPLOYMENT.md)**. It
does not require Vercel, Neon, or a separate backend repository.

The Docker delivery must be the **single central API and PostgreSQL database**
for both the backoffice and the mobile app. See the mobile-app integration
section in `DEPLOYMENT.md`; a second API/database would create separate data.

## Status

**All 10 screens wired to the real NestJS backend (`../backend`) — no
`src/data/*.ts` mock layer remains; it was deleted once nothing imported
from it anymore.**

A note on an earlier version of this README: it previously claimed the
Transactions screen was "proven end-to-end" against a live Postgres
instance, with a `backend/db/migrations/003_backoffice_extensions.sql` file
and routes under `backend/src/routes/`. **Neither of those paths ever
existed** — the real backend is 100% Prisma + NestJS modules
(`backend/src/*/​*.controller.ts`, `backend/prisma/schema.prisma`), and this
sandbox has no live database to test against (no Docker, no Postgres
service). That claim was false and has been removed. What's true instead:
every function in `src/lib/api.ts` calls a route that genuinely exists in
the backend source, with field names verified against the real Prisma
schema — but it has only been **type-checked and build-verified**, not
click-tested against a running instance, because that instance doesn't
exist here.

## What's real vs. genuinely unbuilt

| Area | Status |
|---|---|
| Auth (login, refresh, sessions) | Real — `AdminSession`-backed refresh, matches `backend/src/admin-security` |
| Dashboard | Real aggregation queries. "Résultat net" = gross margin (no cost ledger exists to compute a true net figure — documented in `backend/src/dashboard/dashboard.service.ts`) |
| Transactions | Real list/detail/timeline/intervene/force-provider/retry/refund/CSV export |
| Utilisateurs | Real list/detail/suspend/reactivate/tier/request-KYC/notes. No `name` field exists on the real `User` model — shown by phone/email |
| KYC & Conformité | Real submissions/approve/reject/risk-level. No document-number/birth-date/ID-verification-provider fields exist (KYC document storage is a deliberate stub — TDS §1) |
| Fournisseurs | Real provider config/health/toggle/test-connections + routing-rule overrides. Per-provider volume/transaction-count and the mockup's webhook/logs/docs buttons had no backing endpoint and were dropped, not faked |
| Taux & Marges | Real margin config CRUD + real rate breakdown (calls the actual pricing engine) + real rate history (from persisted `Quote` rows — empty until real quotes exist) |
| Pays & Paiements | Real `Country`/`CountryPaymentMethod` CRUD — this table didn't exist anywhere before this pass |
| Support & Litiges | Real tickets + internal notes. No priority/type field or two-way client-visible chat exists on the real model — shown honestly as "Notes internes" |
| Finance & Rapports | Real revenue (= `SUM(jalMargin)`) + real withdrawal ledger (new `PlatformWithdrawal` table) + CSV export. "Imprimer"/"Planifier un rapport" had no real backing and were dropped |
| Paramètres & Sécurité | Real settings singleton + real sessions + real audit log. 2FA, password-change, and "Informations système" (version/storage/backup) had no backing and were dropped |

## Structure

```
src/
  layout/       Sidebar, Topbar, Screen shell, PageHeader
  components/   ui.tsx, Badge.tsx, RequireAuth.tsx — shared primitives
  lib/          api.ts (every backend call), auth.ts (session storage),
                format.ts, statusLabels.ts
  pages/        One file per sidebar section, plus Login.tsx
```

## Design tokens

`tailwind.config.js` — dark theme, gold/amber primary — matches the
approved mockup screenshots.

## Running it

For the client delivery and production deployment, use the single Docker
command documented in **[DEPLOYMENT.md](DEPLOYMENT.md)**. The older local
development instructions below are only for developers working on source.

Backend first (needs a real `DATABASE_URL` — see `../backend/.env.example`;
this sandbox has none):

```bash
cd backend && npm install && npm run build && npm run start:prod
```

Then the back office:

```bash
cd backoffice && npm install && cp .env.example .env && npm run dev   # http://localhost:5173
```

Log in with the bootstrap admin account (`ADMIN_BOOTSTRAP_EMAIL` /
`ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env`).

### Troubleshooting: `npm run build` fails with a rolldown "Cannot find native binding" error

This is npm's own long-standing optional-dependency bug
([npm/cli#4828](https://github.com/npm/cli/issues/4828)) — Vite 8's
rolldown backend needs a platform-specific native binding package (e.g.
`@rolldown/binding-win32-x64-msvc` on Windows) that npm sometimes fails to
resolve. Fix: `npm install <the missing package name from the error> --no-save`,
or delete `node_modules`/`package-lock.json` and reinstall. Not added as a
hard dependency here since the correct package name differs per OS/arch.
