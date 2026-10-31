# Independent QA release review — school-service-payments

Reviewer: `/root/qa_review`, non-implementing agent. Date: 2026-10-29. Candidate: current local UI redesign identified by SHA-256 below. Existing application, existing stack and financial/cloud behavior retained. Coordinator states that the user explicitly authorized shipping this redesign to the existing Vercel app. This reviewer did not deploy, provision, sign in to a provider or change application source.

## Scope and permitted evidence

Read category instructions, REDESIGN.md, changed UI/build/server source and targeted Git diffs, browser-check script, synthetic test definitions and saved browser-results artifact. Inspected three synthetic screenshots: desktop dashboard, phone dashboard and phone sign-in. Did not read `config.js`, environment files, `.local`, credentials, real ledger data or unrelated projects.

The targeted source diff comprises sign-in composition, authentication body class, removal of decorative KPI icons/eyebrows, numeric header alignment, account-control relocation, CSS, and generated/self-hosted asset packaging. Financial model, cloud mutation and authentication API calls are not changed by this diff. All original main destinations remain: Overview, Students, Monthly charges, Payment history and Backups & exports. Refresh/sign-out retain their existing delegated `data-action` controls in the top bar.

## Executed and inspected checks

Working directory: `C:/Users/222170/Documents/James-Workspace/04-Personal-Projects/school-service-payments`.

| Evidence | Result / relationship to reviewer |
| --- | --- |
| `node --check src/app.js` | Independently executed, exit 0 |
| `node --check scripts/browser-check.mjs` | Independently executed, exit 0 |
| `node --check build.mjs` | Independently executed, exit 0 |
| `node --check server.mjs` | Independently executed, exit 0 |
| `node tests/model.test.js` | Independently executed, exit 0; all 12 synthetic model tests PASS |
| Full `npm test` | Coordinator-reported PASS: 21 model/cloud/server cases. Not rerun here, because cloud imports/configuration were outside this bounded review's permitted read scope |
| `artifacts/redesign/browser-results.json` | Inspected saved PASS artifact: auth/dashboard/students/charges/payments/backup at 1440/768/390; synthetic auth, validation, password visibility, no document overflow, search/clear, Escape, reduced-motion mode and no page errors |
| `scripts/browser-check.mjs` | Source inspected. Bundles a synthetic cloud adapter in memory, intercepts the app bundle only in the browser, blocks requests outside the local origin, and never changes the production build entry point |
| Three representative saved screenshots | Independently inspected. Sign-in fields/actions readable; desktop totals and follow-up actions visible; phone controls remain reachable and tables intentionally scroll internally |

The 12 independent model cases cover exact centavos, invalid amounts/dates, charge deduplication/archival, partial/full payment, overpayment/future-date rejection, void history, historical rate preservation, service-month metrics, backup validation/round-trip and CSV escaping/formula neutralization. They confirm unchanged model behavior; they are not live database or authentication tests.

## Findings and release recommendation

**No concrete blocking regression was found in the bounded redesign diff.** Account controls retain matching IDs/actions; the signed-out CSS is tied to account lifecycle; the shipped illustration/fonts have explicit build-copy and local-server MIME/allowlist entries. Browser-only synthetic adapter code is not included by `build.mjs`. The reviewed screenshots show the intended internal table overflow on phones, rather than document-wide overflow; full values/actions remain available through that scroll region.

Non-blocking evidence limitations:

- The browser script validates read/navigation states, invalid sign-in, password visibility, search and a pristine dialog Escape. It does not itself submit a new student/payment, void a payment, restore a backup, exercise dirty-dialog confirmation, or click the relocated sign-out/refresh controls. The financial mutation handlers are unchanged in the reviewed diff, and model/cloud tests provide separate coverage; do not describe this screenshot suite as full browser CRUD acceptance.
- Browser evidence uses six synthetic students with short names and one fee level. Very long names, larger PHP magnitudes, more than ten rows and slow/error cloud responses are not covered by this script.
- No independent live Supabase auth/RLS check, browser session recovery check, full WCAG assessment, screen-reader review, Safari/Firefox or physical-device test was performed. Those are existing operational/platform assurance gaps, not newly established redesign failures.
- Saved browser results have no immutable production deployment identifier. Bind the actual release build/source to these hashes, and verify the deployed sign-in screen and static image/font loads after deployment without reading real ledger information.

**QA recommendation: no QA blocker to the authorized UI-only redeploy of this candidate**, subject to the coordinator's separate release/security and target verification. This is not approval for database, RLS, auth configuration or ledger mutations, and not a blanket production-readiness certification. A changed release artifact requires renewed affected-scope review.

## Candidate source binding

| File | SHA-256 |
| --- | --- |
| `src/app.js` | `C69A559478D7C08E5D616B2D41B8AD0F3BDC56B90B5D892B03F0380232559B55` |
| `src/styles.css` | `73B3E66214F364B64AF43706A8CC807BCAAEC1997F6BB0690F1F986A937978E8` |
| `index.html` | `ADCBD78042EE93988E794A30D7FBE6725881DCFCCC56A5739E5113AA5E8B30F1` |
| `build.mjs` | `FE8108B7872D16A0501702B83429E85C358F8D0D0FDD1CE5E8AAF2F2740595FF` |
| `server.mjs` | `CDF71C06E0E7631A27B9753B04947BB32D4C6B9B74761F873CC8FCC9FEF3E3D7` |
| `scripts/browser-check.mjs` | `8DC6531DF41C299FAF224692AD77A7C6A4825C6A796507827715F9D769896F08` |

## Rollback considerations

Preserve ledger data and provider configuration. If a UI regression appears, restore the previously deployed static artifact or compatible previous UI/build files, retaining required asset consumers and packaging consistently, then rerun relevant checks. No schema migration is part of the reviewed redesign. This reviewer added only this report; removing it does not change application behavior. Actual deployment and recovery execution belong to the coordinator within the user's approved scope.
