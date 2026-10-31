# Product brief and implementation decisions

Source: James's request on 2026-10-20 for a responsive school service payment tracker with students, dates, sales, a dashboard, and source under 04-Personal-Projects.

## Scope

A local, single-owner collection ledger. No production hosting, external account access, secrets, real student examples, automatic messages, or money transfers. Opening the app starts with an empty ledger. Financial amounts are PHP; this is configurable in code, not an exchange-rate feature.

## Explicit operator input

The operator sets each student's agreed monthly fee and each service month's due date. No assumed tuition policy, automatic late fees, holiday adjustments, tax, interest, attendance pricing, subscription deductions, or automatic monthly billing. Creating charges is an explicit previewed action: one charge per active student per month, skipping existing charges. Fees can differ by student; existing charges are editable separately and never change just because the roster fee changes.

## Ledger model

Amounts are integer centavos. Positive payments cannot exceed a charge's remaining balance. Partial payments are supported. Actual received dates cannot be in the future. A charge due today is not overdue; remaining balances become overdue the next Philippine calendar day. Status priority: Paid, Overdue, Partial, Unpaid. Dashboard collected/billed/balance totals use service month; the cash chart and all-time cash total use actual payment date and exclude voids. Collected cash is gross receipts, not profit.

## Reversible lifecycle

The request to remove names is implemented as archive/restore to preserve accounting history. Archived students are absent from future charge creation but outstanding invoices remain collectable. There is no hard-delete function. Corrections to payments use void with a required reason, retaining the original record. Payment date/method/reference corrections are performed by voiding and recording the corrected payment.

## Privacy and portability

The browser's localStorage is the only persistent data store; no cloud sync or encryption at rest is claimed. Student name is required; school, route and guardian contact are optional. Use only the personal information needed to run the service. JSON backup includes all records; restoring explicitly replaces the ledger after showing counts and advising a current backup. CSV exports neutralize spreadsheet formula prefixes. Receipts are payment acknowledgments and do not claim to be tax invoices.

## Limitations

For a trusted personal device. Multiuser access, authenticated cloud database, cross-device sync, refunds, prepaid credits and automated billing are future scope. To change these consequential policies, update this document and model tests together.

## Cloud revision · 2026-10-21

The user explicitly requested Vercel hosting and Supabase persistence for use on both devices. This supersedes the original local-only scope and privacy/persistence assumptions above. Authenticated owners now have one private cloud ledger; the same account is required on each device. Owner-based RLS restricts reads and writes. Polling occurs every 15 seconds while visible, on focus and after reconnection, with manual Refresh. No offline writes, automatic merge, or silent last-write-wins. Stale edits retain their form values and require refresh/re-entry. Backup restore replaces the account ledger on all devices. Users initiate account creation and confirmation themselves. No accounts or emails were created/sent by the agent. Source still contains no private credentials.
