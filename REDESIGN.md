# Imagegen redesign · 2026-10-29

Initially implemented and verified locally at http://127.0.0.1:5173 with synthetic records. Subsequently published to https://school-service-payments.vercel.app at the user's explicit request. See RELEASE-REVIEW.md for the production artifact, independent reviews and the OPEN delivered-CSP check. No app account was created and no database or Supabase configuration mutation was performed during this revamp.

## Scope and design decisions

Assumption: redesign the existing personal school-transport collection ledger; retain its stack, authentication and financial rules. This remains a record of money received, not an online payment processor.

The owner opens the ledger to see collections for a service month and record a payment. Objects remain students, monthly charges and payment receipts, with amounts stored as integer centavos. All totals and charts come from these objects. No sample data is shipped into customer accounts. The browser-only test adapter uses six synthetic students and intercepts the JS bundle; every external browser request is blocked.

Primary question: what has been collected, and what balance needs following up? The signature is a pale green collected total and gold current-month cash bar. A locally generated school shuttle illustration makes the sign-in screen specific to the school run. Navigation recedes into a neutral selected row. Four readable metrics replace icon tiles. The top bar owns account controls, and document scrolling stays natural. Tables retain internal horizontal scrolling on small screens so full financial values and actions remain available.

Taste direction: Achromatic ledger, seed 180218024, with existing palette/type kept at draw time. The user's imagegen request establishes the final direction; evergreen actions and pale collected-balance field intentionally depart from the sheet's monochrome chrome. DESIGN.md records the actual implementation.

## Generated assets and exact prompts

Used the built-in imagegen tool; no API key or CLI fallback. These are generated illustrations/concepts, not sourced photos. No real student information was supplied to imagegen.

Concept saved at `artifacts/redesign-concept.png` (reference only, not shipped as UI):

> Use case: ui-mockup. Create a high fidelity desktop web application redesign concept for 'Service ledger', a Philippine school transport operator's private collections notebook. Wide 1440px dashboard composition. Warm white canvas, deep evergreen ink, restrained golden yellow used only on collection data. Refined humanist sans typography, large readable financial figures. Slim white left navigation with small school bus line mark and product name, links Overview, Students, Monthly charges, Payment history, Backups & exports; neutral selected row. Main title 'Collections overview' and right-aligned 'Record payment' dark green button. Four unboxed metrics with tabular peso values, first collected total on a pale green field; no icons on metrics. Below a six-month green bar chart with yellow current month, beside an understated collection progress panel. Full width outstanding balances table below, realistic explicitly fictional student initials and PHP amounts, no private data. A tiny tasteful flat illustration of a golden school shuttle on a winding route near the workspace identity, never covering data. Flat surfaces, precise generous alignment, restrained 10px radii, no gradients, no floating glass, no decorative sparkles, no KPI icon circles, no fake growth metrics. This is an implementable financial tool, not a marketing landing page. Show the whole browser-free UI, no device bezel.

Sign-in illustration saved at `assets/school-route.png` (shipped locally):

> Use case: illustration-story. Asset type: sign-in illustration for a private Philippine school transport collection ledger. A beautifully restrained editorial illustration of a small golden yellow school shuttle minibus on a gently winding country road, a few deep evergreen and pale sage tropical trees, a distant simple school building, warm off-white paper background #F8F9F6. Wide landscape composition, bus in lower middle, ample empty space above. Cut-paper shapes with very subtle printed texture, precise sophisticated adult financial-product illustration, natural daylight, calm and dependable. No people, no children, no writing, no letters, no numbers, no logos, no currency symbols, no UI, no gradients, no watermarks. Evergreen #164B43 and muted ochre #E9BC54, soft sage. This is a decorative supporting illustration, not a chart.

Instrument Sans 400/600 WOFF2 files are self-hosted; the license is at `assets/FONT-LICENSE.txt`. No remote font dependency. Artwork uses empty alt because adjacent text identifies the product and its purpose.

## Verification

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: production static build and all 21 model/cloud/server tests passed. Extended the server test to verify exact new asset routes and MIME types.
- `npm run test:ui`: passed against the built static app, using a browser-only synthetic cloud adapter and Chrome. Six screens at 1440, 768 and 390px; no document overflow; synthetic sign-in, invalid submission, password visibility, no-results/clear, dialog Escape, reduced-motion mode and no page errors. This is not a live Supabase authentication test.
- Taste source lint: zero failures. Date zero-padding is required ISO month formatting; the remaining eyebrow selector is a hidden legacy compatibility style, not visible content.
- Taste production-build inspection: zero failures, one warning. Its unused-canvas heuristic assumes the hidden sidebar occupies space; the actual sign-in composition is centered with equal desktop outer margins. Captures and report are in `artifacts/taste-after`.
- Inspected all 19 browser screenshots (six screens at three widths plus mobile dialog) and all six inspector captures.
- Premium Python audit could not run: Python is unavailable. Full WCAG audit, Safari/Firefox, physical-device keyboard/touch testing and live auth/cloud checks remain open.
- A measurable before screenshot was not captured: initial dependencies were missing and the first browser launch was sandbox-blocked. Do not infer numerical before/after scores.

## Visual critique

ROUND 2

Seen in one second: a school-service collection ledger with a clear sign-in entry and readable collections overview.

Idea (one sentence): give the operator a calmer collection book, grounded in the everyday school run.

Live thing: service-month metrics, live balance rows, payment actions and search.

Layout words by section: sign-in=illustration/form split; overview=metric strip/chart/progress/follow-up table; roster and history=searchable ledger; backup=paired information panels.

Scores (subjective self-review): design 8 · usability 8 · creativity 7 · content 8 → overall 7.8.

Caps applied: this is an application screen, so marketing-page photography and decorative-motion quotas do not apply.

Top three problems from the first screenshot review and fixes:

1. dashboard-1440.png: account actions consumed a separate row. Moved them into the top bar.
2. auth-1440.png: password guidance was too small. Raised sign-in help and password-toggle text to 13px.
3. students-1440.png: financial headers did not align with values. Applied shared right-aligned amount headers.

Remaining limitations: long financial tables intentionally scroll horizontally on phones; some secondary action labels wrap on narrow cards. The generated illustration does not represent a real school or vehicle. No claim of independent visual review.

## Rollback

No schema, RLS, payment arithmetic or cloud-store mutation logic changed. A UI rollback should restore the previous src/app.js, src/styles.css, index.html and DESIGN.md together, and remove the added asset-copy/allowlist entries from build.mjs/server.mjs only after removing their consumers. Keep existing ledger records untouched. Rebuild static dist and rerun npm test. Nothing was published, so no production rollback is currently required.
