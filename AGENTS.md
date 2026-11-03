# Project instructions: School Service Payments

Shared rules: [workspace](../../../AGENTS.md) and [personal projects](../../AGENTS.md). This file adds only project-specific guidance.

## Scope

Personal school-service payment ledger with email/password authentication, owner-private records and cross-device synchronization. Preserve ledger arithmetic and backup compatibility during UI changes.

## Architecture

Plain JavaScript/CSS, esbuild static output in `dist/`, Vercel static hosting and direct Supabase Auth/database access. One JSONB ledger per owner uses RLS, server validation, monotonic revisions and mutation identifiers. There is no separate hosted application server or payment-transfer integration.

## Commands

Run from this directory; `package.json` is the command source of truth. Node 22+ is declared.

| Task                        | Command         |
| --------------------------- | --------------- |
| Install locked dependencies | `npm ci`        |
| Build and run locally       | `npm start`     |
| Syntax checks               | `npm run check` |
| Build and run Node tests    | `npm test`      |
| Build static output         | `npm run build` |

For browser prerequisites use README.md and `npm run test:ui`. The local source app uses the configured cloud ledger; it is not an offline sandbox.

## Project restrictions

- Preserve owner isolation, stale-revision rejection and lost-response reconciliation. Never silently overwrite a newer device's ledger.
- Browser configuration contains only the public Supabase URL and publishable key. Changes to live Auth settings, schema or deployment are separate operations.
- Restoring a backup replaces the account's ledger; preserve explicit confirmation and backup advice. Keep cloud tests isolated from real students and payments.
- Receipts are cash acknowledgements, not tax invoices. Recorded payment methods do not implement money transfers, automatic fees or penalties.

## Documentation

- Setup, hosting, data model and recovery: [README.md](README.md).
- Design and interactions: [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md).
- Verification boundaries: [VERIFICATION.md](VERIFICATION.md).
- Decisions and work status: [DECISIONS.md](DECISIONS.md), [TASKS.md](TASKS.md).
