# Verification · cloud version 2 · 2026-10-21

Story: sign in on computer/tablet → Supabase Auth → owner-protected cloud ledger → conditional save → refreshed data on the second device.

## Completed checks

- `npm run check`: JavaScript syntax checks passed.
- `npm test`: 21 tests passed (12 ledger/model, 8 cloud store, 1 HTTP security/static allowlist).
- `npm run build`: esbuild production bundle completed; only dist frontend assets published.
- Supabase migration applied. `tests/cloud-rls.sql` executed in a rolled-back transaction: owner read/insert, cross-owner read/update/insert denial, anonymous denial, malformed payload rejection, valid revision increment and stale-update rejection all passed. Test auth users and records were rolled back.
- Supabase security advisor returned zero findings.
- Supabase changelog checked: TLS cipher and PostgreSQL minor-release changes do not require code changes for this modern-browser app with no affected extensions.
- Client source reviewed for escaped dynamic text, awaited mutations, duplicate-submit prevention, stale refresh/write races, owner filters and uncertain-response handling. No service-role keys or private credentials.

## Limits / owner setup

- Supabase Auth Site URL and exact redirect allowlist were saved and visibly verified as https://school-service-payments.vercel.app via the dashboard after secure owner sign-in. Signup email delivery and confirmation still require owner acceptance; the app does not create the owner's account or request a password in chat.
- Private Git repository connection failed in Vercel (repo_not_found); direct-source deployment used. Git integration requires granting repository access in Vercel.
- Automatic approval review rejected removing Vercel's additional protection. It remains enabled; no workaround applied.
- Full signed-in browser/tablet acceptance and real cross-device tests require the owner's account. Manual steps are in tests/MANUAL.md. Do not infer full end-to-end acceptance from model/RLS tests.
- Official designmd lint is unavailable in the installed environment; design follows retained runtime tokens and static premium audit evidence.

## Safety and rollback

Cloud writes require internet; no offline queue. Whole-ledger conditional updates target a small personal roster. Browser auth sessions persist, financial snapshots do not. Back up before a cloud-wide restore. UI rollback does not require dropping database tables.

## Deployment acceptance

- Vercel production deployment dpl_GQx1fk8vDGr5B169Gkr7MrRLwtha: READY. Deployed app source commit ed791b618e89f29fa22f76c844e341b8b7684536.
- Production alias https://school-service-payments.vercel.app/ returned HTTP 200 with the configured security headers and rendered the application's email/password sign-in screen in a live browser. No Vercel sign-in wall on that alias. Protection settings remain unchanged.
- Browser console spot check found only an unrelated browser-extension metadata error; no application errors were observed on the signed-out screen.
- Supabase dashboard confirmed the production Site URL and one exact redirect allowlist entry. The saved URL fields were visually verified in the dashboard.
- Account creation, email delivery, and signed-in two-device acceptance remain user-dependent; no test account/password was created in the deployed app.
- Documentation/lockfile version metadata updated after deployment; runtime source and pinned dependency versions are unchanged.

## Imagegen UI release · 2026-10-29

The earlier sections are historical evidence for the cloud migration. Current UI candidate and exact source/output hashes are in QA-RELEASE-REVIEW.md, SECURITY-RELEASE-REVIEW.md and artifacts/release/candidate.json.

- Local build + all 21 tests + syntax checks passed. Browser-only synthetic cloud checks covered six screens at 1440/768/390px and selected interactions; no production account/record was used.
- Independent QA ran four syntax checks and 12 model cases; security reviewed changed source, all static hashes and isolated packaging. Both recorded no blocker for the bounded UI release; their evidence limits remain explicit.
- Explicit user authorization to ship; CLI 65.7.0 deployed the reviewed prebuilt artifact only. Vercel reported READY for `dpl_5Uo3La3QPk222jXAsys2CE4cA7pr`, URL `https://school-service-payments-7yxhn0j51-james-projects-647b0fe5.vercel.app`. Separate `inspect` confirmed `https://school-service-payments.vercel.app` resolves to it. Deployment protection stayed enabled.
- `node scripts/prepare-release.mjs`: exit 0, exact seven-file allowlist and hashes. Aggregate artifact SHA-256 `97cfa95aff87f1212d8b99557c0d97cd884b1bef4cf428c50899327285a73ad1` includes the retained-header routing config. CLI dry run: exactly eight files, 2,835,912 bytes. No source checkout, env, reports or synthetic mock source uploaded.
- `node scripts/verify-production.mjs`: exit 1 because delivered CSP differs. Separate passed checks: every production static body matches its reviewed SHA-256; all six source/report probes return 404; Chrome signed-out page at 1440/390px renders expected image/fonts with no page errors or horizontal overflow; screenshots viewed. No real sign-in or ledger access was attempted.
- All seven responses contain additional Cisco/OpenDNS source domains in CSP; other configured headers match. Original uploaded config is unchanged and matches the independent packaging review. A network rewrite is an inference, not a confirmed cause. Header mismatches remain failed/OPEN pending an independent delivery vantage/provider-origin confirmation. No policy bypass, protection change, normalization or unnecessary rollback was performed. This is not a full production smoke-test pass.
- Existing live-auth, cross-device, full-accessibility/physical-device and restore-drill limits remain. No new subscription, premium build setting, recurring job, schema/RLS/Auth URL change or database mutation was introduced.

Recovery remains the prior production deployment `dpl_GQx1fk8vDGr5B169Gkr7MrRLwtha`; its READY state and alias were inspected before publishing. Reassigning a compatible UI artifact does not require restoring/dropping ledger data. Recovery was prepared, not rehearsed or executed.

## Remaining static-release item closed · 2026-10-29

The OPEN delivered-CSP status above is historical and is superseded by the independent checks here. Original local response/header failures remain unchanged in production-checks.json; they were not suppressed or converted into passes.

- SecurityHeaders public scanner checked the exact production root and six remaining asset paths. Only public URLs were supplied, without credentials or account data. Saved reports are in artifacts/release/independent-headers*.html; these are evidence, not executable product inputs.
- `node scripts/verify-independent-headers.mjs --fetch`: exit 0, all seven public paths and all five configured header values match exactly (35 comparisons). The script requires exact target, HTTP 200 target response, fresh report timestamp, Raw Headers table and unique expected values. No domain stripping, policy weakening or grade-based acceptance.
- Root report time: 29 Oct 2026 15:15:48 UTC; SHA-256 `9d10a8456c8aa7d322d00c834b2d344496943911ae5257d1f1997ad6ea3c31a0`. Per-asset report timestamps/hashes and exact values are stored in artifacts/release/independent-header-checks.json.
- These independent responses contain the approved CSP without Cisco/OpenDNS additions. Together with previously verified exact production artifact hashes and signed-out browser checks, this closes scoped static-release acceptance. The local network-path difference is diagnostic evidence, not a deployed-policy defect established by this investigation.
- No source artifact, cloud settings, protection, auth, ledger or deployment changed while closing the item. Existing deployment `dpl_5Uo3La3QPk222jXAsys2CE4cA7pr` remains the shipped candidate.

Scope remains a UI-only release: no claim of live account/email acceptance, signed-in multi-device operation, physical-device/screen-reader certification or a performed cloud recovery drill. Those require their own permitted environment/user acceptance; they were not the delivered-header blocker.
