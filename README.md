# Service ledger · School service payments

Responsive school-service payment monitoring with Supabase sign-in and a private cloud ledger. Sign in with the **same email account** on your computer and Android tablet; updates refresh within about 15 seconds or immediately using Refresh.

## Use the hosted app

Open **https://school-service-payments.vercel.app/** in your browser. No Termux, Node.js, or running PC is needed for normal use. Create an account, confirm the email, then sign in. If Vercel shows its own sign-in protection, use the Vercel account that owns this project first. A different app account has a different private ledger.

### Authentication configuration

Production Site URL and the exact redirect allowlist have been configured and verified in Supabase as `https://school-service-payments.vercel.app`. No wildcards or unrelated redirect destinations were added. Keep these values aligned if the production domain changes.

If using Supabase's default email delivery, delivery may be restricted to organization members; configure your own SMTP provider for other addresses. Do not share passwords or keys in chat. Account creation and confirmation are initiated by the user in the application.

## First use

1. Create the owner account and sign in on both devices with the same account.
2. Add students and agreed monthly fees in Students.
3. Create monthly charges for a selected service month; review the new-charge count, amount and due date.
4. Record received payments, including partial payments and actual received dates.
5. Use the dashboard to monitor billed, collected, outstanding and overdue balances. Cash activity uses actual payment dates.
6. Download regular JSON backups. Use CSV exports for Excel or Google Sheets.

## Migrate the previous local version

Download a JSON backup from the old local app's Backups & exports. Sign in to the hosted app and restore that file **once**. Restoring replaces your entire account ledger on every device, after confirmation. It does not merge competing device copies. Back up both copies first if you have already entered data independently on multiple devices. Browser data is not automatically accessible from a new website address.

## Features

Student add/edit/archive/restore; monthly fees and charges; due-date tracking; paid/partial/unpaid/overdue status; searchable paginated rosters and ledgers; cash/GCash/bank/other records; payment references; void correction reasons; printable acknowledgments; dashboard; backup/restore and CSV export.

## Cloud design and privacy

- Supabase Auth email/password sessions and `service_ledgers` owner-based row-level security.
- One JSONB ledger per owner preserves atomic financial snapshots and compatibility with version-1 backups. This suits a small personal roster, not a high-volume multi-operator accounting service.
- All changes validate client-side and server-side. Server triggers enforce monotonic revisions. Updates compare the loaded revision; another device's save causes a clear conflict, not a silent overwrite.
- Writes need internet. No offline queue or automatic merge. On a conflict, keep a note of the unsaved entry, close the form, Refresh, and enter it again.
- A unique mutation ID reconciles a save whose HTTP response was lost. If the result remains uncertain, Refresh and check history before recording again.
- Financial records are not cached in browser localStorage by the app. Supabase authentication sessions are persisted by its SDK. Sign out on shared devices.
- Only the public project URL and publishable key are in browser configuration. No service-role key, database password or other private credential is used by the app.
- Receipts are acknowledgments, not tax invoices. Collected totals are gross receipts, not profit. No automatic charges, penalties, tax or money transfers.

## Run source locally

Requires Node.js 22+:

```powershell
git pull
cd 04-Personal-Projects\school-service-payments
npm ci
npm start
```

Open http://localhost:5173. This now uses the same Supabase account ledger as the hosted app; it is not a separate offline ledger. For signup confirmation from local development, add the exact localhost origin to Supabase Redirect URLs.

## Build and verify

```powershell
npm run check
npm test
npm run build
```

Pinned dependencies and lockfile are committed. Node tests cover ledger arithmetic, backup/CSV validation, HTTP boundaries, cloud revision handling and failures. `tests/cloud-rls.sql` verifies owner isolation, anonymous access denial, stale writes, and validation in a rolled-back transaction on Supabase. See VERIFICATION.md for actual results and tests/MANUAL.md for remaining browser acceptance.

## Vercel deployment

Project `school-service-payments`, id `prj_KtMN7EL6MWSDgv7d10PtdEpgwuJK`. Source is deployed directly because Vercel currently cannot access the private GitHub repository. For Git integration, grant Vercel access to `iamjamesgaddi1015-star/James-Workspace` and set Root Directory to `04-Personal-Projects/school-service-payments`, build command `npm run build`, output `dist`. The direct-source deployment has the app folder as its root. Only built frontend files are published.

## Database migration

Project `jjpaxysocfvumjvbbrlb`, Singapore region. Initial schema is in `supabase/migrations/20261020163028_cloud_ledger.sql` (filename generated by Supabase CLI). RLS policies allow authenticated owners to select/insert/update their own row. Anonymous and DELETE privileges are absent. Functions are security invoker with fixed search paths; triggers and constraints validate payloads and revisions.

## Recovery / rollback

Download a backup before restoring data or deploying schema-changing updates. Roll back app code with Git/Vercel if needed; cloud records remain in Supabase. Do not roll back to the old local-only application expecting cloud synchronization. Restoring a JSON backup deliberately replaces the cloud ledger. Do not drop database tables for a UI rollback. Keep production Auth URL configuration aligned with the production origin.
