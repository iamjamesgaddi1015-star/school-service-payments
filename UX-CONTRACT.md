# Service ledger UX contract

Visual contract: [DESIGN.md](DESIGN.md). Product rules: [PRODUCT.md](PRODUCT.md).

## Business-context sources

| Domain | Source | UI consequence |
| --- | --- | --- |
| Billing | User request: who paid, dates, total sales; PRODUCT.md | Explicit charges, manual payments, billed/received/balance separation |
| Student lifecycle | User request: add/remove names; PRODUCT.md | Archive/restore names, preserve historical records |
| Permissions and privacy | Repository AGENTS.md; PRODUCT.md | Local personal data only; no external student records or connectors |
| Data replacement | PRODUCT.md | Preview restore counts, confirm replacement, advise backup |
| Legal copy | PRODUCT.md | Receipt says acknowledgment; no tax-invoice or payment-processing claim |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select in src/app.js | DESIGN.md | Platform-owned popup | Manual browser checklist |
| Date | field helper and native date/month input | PRODUCT.md | Date-only and service month | model.test.js and manual checklist |
| Form | form, field and modal helpers | This contract | Create/edit/confirm | model.test.js and manual checklist |
| Scrollbar | src/styles.css global baseline | DESIGN.md | Forced colors | Static audit; manual checklist |
| Toast | notify in src/app.js | This contract | Success/info | Manual checklist |
| CRUD | commit plus model functions | PRODUCT.md | Archive/restore, void, backup replace | model.test.js and manual checklist |

## Flow ledger

- Add/edit/student/archive/restore and charge/payment mutations save synchronously, close the dialog, rerender the owning view, and announce success. Errors retain all fields and show an associated inline message. Source: PRODUCT.md personal ledger lifecycle.
- Form close/Escape detects dirty values and offers keep editing/discard. A page unload uses the browser's narrow lifecycle warning. Native dialog supplies focus trapping and inert background; close restores the opener or main landmark.
- Archive and restore keep every old charge/payment. Archive excludes future bulk charge creation. Final confirmation initially focuses Cancel. Source: PRODUCT.md lifecycle.
- Void requires a reason; the original payment stays in history. Source: PRODUCT.md correction policy.
- Restore validates the entire backup before confirmation and replaces the current ledger in one write. Source: PRODUCT.md restore policy.

## Lists, persistence and state

- Local pagination is ten rows, clamped after filtering/mutations. Server pagination is inapplicable to a single-device browser ledger. Dashboard follow-ups intentionally show the earliest five open charges.
- Search has immediate clear, composition handling, and no network requests. Search/filter/page are session-local, deliberately absent from shareable URLs because names are personal and this is a private local app. Service month is retained across views during the session.
- Native select and date/month pickers accept OS locale, popup geometry and keyboard behavior. Displayed dates use en-PH; business date boundaries use Asia/Manila. Store date-only YYYY-MM-DD strings; no UTC conversions of billing dates.
- No network loading states: reads/writes are synchronous. Import reads a file asynchronously; errors remain inline. Empty, no-results, storage read/write failures, and other-tab conflicts have explicit recovery text.
- Commit compares the stored snapshot before writing. Other-tab changes refresh automatically when no form is open; an open form cannot overwrite a changed snapshot. Same-event-loop writes are synchronous. LocalStorage is not a multiuser database; see README limits.
- Initial unreadable data disables mutations until a validated restore. Raw saved data can be downloaded for recovery. Storage quota failures retain the draft.

## Accessibility and verification

English content, explicit labels, native semantics, visible focus, reduced motion, horizontal overflow on narrow screens, one shared live region, and error associations target WCAG 2.2 AA. No claim of full conformance without browser/assistive technology verification. Follow tests/MANUAL.md before real use. Automated ledger invariants are exercised by npm test; syntax checks by npm run check. No maintained sibling UI existed; student and charge flows share the same form, dialog, toast and table owners.

## Cloud persistence contract · 2026-10-21 (supersedes local persistence rules)

Source: user's explicit Vercel + Supabase synchronization request; PRODUCT.md cloud revision.

- `LedgerStore` in src/cloud.js owns authenticated reads/writes. `service_ledgers` RLS owns authorization; client account checks are only UI behavior. Owners have separate ledgers; same account on both devices shares data.
- Network mutations await server acknowledgment before closing the form. Submit/cancel are disabled while saving; errors retain fields with shared form feedback. No success toast before persistence.
- A conditional update compares expected revision. Stale saves fail with recovery instructions; no auto-merge. Uncertain responses reconcile via mutation ID and otherwise require checking refreshed history before retry.
- Refresh every 15 seconds while visible, focus/reconnect/manual refresh; skip background refresh during a dialog. A refreshed revision is adopted only with the corresponding ledger snapshot. No offline write queue.
- Signed-out users see a login/create-account panel, never financial data. Supabase sessions persist across reloads. Sign out clears rendered financial data, receipt content and state. Other-tab sign-out follows Supabase Auth events.
- Signup email confirmation uses the deployed origin, which is configured as the Site URL and exact allowlisted redirect in Supabase Auth URL configuration. Email delivery and browser acceptance remain explicit verification gates.
- JSON restore is a cloud-wide replacement for that owner, confirmed with record counts. Existing local version-1 backups validate and can be restored once; no background upload of local data.
