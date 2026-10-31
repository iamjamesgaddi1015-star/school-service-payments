# UI release security review

Reviewer: `/root/security_review`, independent of the implementer. Date: 2026-10-29. Candidate: current school-service-payments UI redesign and the seven-file static `dist` artifact listed below. Target described by the coordinator: the existing Vercel deployment. This is a focused security source/artifact-boundary review, not a comprehensive application audit or a deployment authorization.

## Assessment

**No security blocker identified in the reviewed UI-only change.** No confirmed critical, high, medium or low vulnerability was established in the changed static allowlist, asset-copy path or authentication markup. This supports the security portion of promoting this exact UI artifact after the coordinator confirms its current QA/build evidence and existing target. It does not certify unchanged cloud authorization, the deployed provider configuration or real-account behavior.

The parent reports that the 21 model/cloud/server tests and synthetic browser checks passed. REDESIGN.md records those checks and limitations. This reviewer did not execute application-controlled code or independently rerun those tests. No production request, deployment, account creation or database action was performed.

## Scope and safety

Read workspace/category instructions, the release-review skill and relevant kit release/rollback guidance, REDESIGN.md, the UI diff, changed build/server/test sources, Vercel public deployment configuration and the synthetic browser-check script. Inspected static output filenames/sizes and computed SHA-256 digests.

Did not open `src/config.js`, environment files, `.local`, `.vercel` credentials, real ledger records, or unrelated projects. Did not inspect the contents of the bundled JavaScript, which incorporates unchanged configuration; its hash is an opaque artifact identifier. No target code was executed because the security skill's required isolated execution controls were not available in this reviewer context.

## Findings and boundary evidence

- **Static routing:** the local server adds exactly three literal asset routes. Request paths are mapped through a fixed Map; no request-provided filename is joined into the filesystem path. Only GET/HEAD serve the allowlist. The changed routes add image/png and font/woff2 MIME types while retaining nosniff, no-store, referrer policy and CSP. The local server remains loopback-bound. This local server is not the Vercel serving implementation.
- **Production serving:** unchanged `vercel.json` sets `outputDirectory` to `dist` and retains the existing security headers/CSP. The reviewed `dist` inventory contains only HTML, bundled application JS, CSS, the generated illustration, two font files and their license. No report, screenshot, test fixture, synthetic adapter source, environment file, credential directory, backup or raw model/cloud source is present in that output inventory.
- **Build boundaries:** `build.mjs` still bundles `src/app.js` as its production entry; its only functional addition copies `assets` into `dist/assets`. The current assets directory contains exactly the four expected illustration/font/license files. Recursive copying makes future asset-directory hygiene relevant: do not put private data, QA screenshots or reference-only concepts in `assets`.
- **Synthetic adapter isolation:** `scripts/browser-check.mjs` builds with `write:false`, injects a test-only replacement for `./cloud.js` into an in-memory browser response, and writes reports/screenshots under `artifacts/redesign`. It is invoked only by `test:ui`; the production build neither imports it nor runs that script. Its route handler blocks external browser requests. The output inventory contains no standalone adapter or report files. A byte-for-byte scan of the bundle for fixture sentinels was not performed; source/build separation is the evidence for adapter exclusion.
- **Authentication markup:** the redesigned sign-in retains the existing `novalidate` form, email/password field semantics, submit intents and password-visibility control. Dynamic authentication messages remain escaped through `esc(message)`. The added illustration is a self-hosted static path, and fonts are self-hosted; no new external tracking recipient is added. The `signed-out` body class and moved account toolbar are presentation state, not relied upon as an authorization control. Existing auth and LedgerStore behavior are outside this UI-only diff.
- **Financial behavior:** inspected diffs change labels, class names, visual composition and markup, not money arithmetic or persistence. A scoped `git diff --name-only` showed no changes to `src/cloud.js`, `src/model.js`, `supabase` or `vercel.json`. Those unchanged areas were not re-audited, and their previous evidence must not be represented as newly exercised.

The source project includes `artifacts` and review documents outside `dist`. Output-directory isolation prevents their static publication in the reviewed configuration; this is not proof of their exclusion from a provider's private source/build upload. If the release mechanism uploads the whole checkout, exclude unnecessary artifacts and reports from that upload or package only the approved release inputs.

## Reviewed source hashes

| Source | SHA-256 |
| --- | --- |
| `server.mjs` | `CDF71C06E0E7631A27B9753B04947BB32D4C6B9B74761F873CC8FCC9FEF3E3D7` |
| `build.mjs` | `FE8108B7872D16A0501702B83429E85C358F8D0D0FDD1CE5E8AAF2F2740595FF` |
| `index.html` | `ADCBD78042EE93988E794A30D7FBE6725881DCFCCC56A5739E5113AA5E8B30F1` |
| `src/app.js` | `C69A559478D7C08E5D616B2D41B8AD0F3BDC56B90B5D892B03F0380232559B55` |
| `src/styles.css` | `73B3E66214F364B64AF43706A8CC807BCAAEC1997F6BB0690F1F986A937978E8` |
| `vercel.json` | `5E478B531B398E81917C493097C518AC03BB08A07C9EE76B0DEAE10F8A5DC875` |
| `scripts/browser-check.mjs` | `8DC6531DF41C299FAF224692AD77A7C6A4825C6A796507827715F9D769896F08` |
| `tests/server.test.js` | `29EA130EE9A3A92A78BEBAB63D4E95B02B96D7916B81B0D547FF149AEA5C867B` |
| `package-lock.json` | `A6C0648BA1A6BB15E8ED4F42EAC7F27C798C183B8F15E7FD35D440B2B93AB32E` |

## Exact reviewed static output

| `dist` path | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 3024 | `ADCBD78042EE93988E794A30D7FBE6725881DCFCCC56A5739E5113AA5E8B30F1` |
| `src/app.js` | 261069 | `FE877B260F76F7F57F3BEA58BD889C1A154300915367CEFE8D82A6EAD6D30D8F` |
| `src/styles.css` | 26694 | `73B3E66214F364B64AF43706A8CC807BCAAEC1997F6BB0690F1F986A937978E8` |
| `assets/school-route.png` | 2505704 | `1B206B1D21E909E300DF061526A647665D6611478356975F59B4484AF4766A7C` |
| `assets/instrument-sans-latin-400-normal.woff2` | 16860 | `9A91EFAA3599A6EF01B2F49E9EC670E3A2F39BAEEF09C73198F1052CF3BB0850` |
| `assets/instrument-sans-latin-600-normal.woff2` | 17408 | `EFB770916EDA95A0E31D80CCCDE9651D4E8617010B21220E9F227C4820D675DA` |
| `assets/FONT-LICENSE.txt` | 4538 | `C27A3C53C3BEED7F5C26853AFA15991478FF7145D3754A36B0382F84E10C0D03` |

The local server does not expose the license route; the Vercel static output can serve it. That difference is harmless and supports font licensing.

## Remaining gates and rollback

No blocking finding specific to the reviewed change. Live sign-in/email confirmation, cross-device user acceptance, current Supabase RLS/session behavior, provider policies and full accessibility remain outside this review. No new provider, schema, migration or data-policy change is justified by this UI release. Preserve the existing Vercel audience/protection, Supabase configuration and ledger records.

Before promotion, bind the actual release to these digests or re-review material changes. Confirm the deployment mechanism serves `dist` and excludes private configuration/runtime records from public output; package selection is the coordinator's responsibility. Signed-out production smoke checks should verify illustration/font delivery and retained headers without opening real ledger data. Test results and production approval must remain separate records.

Rollback: restore the previous known-good UI artifact/configuration under the user's permitted recovery scope; do not alter database tables or ledger records. If rebuilding from source, restore coordinated UI/build/asset consumer changes together and rerun the existing checks. Unknown deployment identity, artifact mismatch, failed checks, unintended public files or a change to authentication/data processing should stop promotion and return to review.

Only this review document was added by the reviewer. No implementation file was edited and no deployment was executed.

## Release packaging follow-up — 2026-10-29

Reviewed `scripts/prepare-release.mjs`, the added `.release-candidate/` ignore entry, the non-secret candidate manifest and the generated Build Output API configuration. The script was not executed by this reviewer; existing staged files were inventoried and hashed read-only. No credential/project-link file was opened and no CLI/cloud action was performed.

No new blocking security finding in this packaging change. The script:

- requires `dist` to contain exactly the seven reviewed files and rejects symbolic links/non-files in its source inventory;
- checks each source file against the exact SHA-256 in this review before retaining its bytes;
- writes the checked buffers into a digest-named staging directory, without copying the source checkout, reports, screenshots, tests or runtime/configuration directories;
- writes a v3 output configuration containing the retained headers, a root-to-index rewrite and filesystem routing;
- checks the staged output inventory for exactly its config plus seven static files; and
- performs no deployment, provider request, shell command or account mutation.

The staged directory `.release-candidate/97cfa95aff87f121/.vercel/output` contains exactly eight files: the seven earlier reviewed static paths under `static/` plus `config.json`. Independently computed staged hashes match all seven original static hashes. There are no functions, synthetic adapters, reports, screenshots or private configuration files in that output inventory. The generated config preserves no-store, no-referrer, nosniff, frame denial and the existing CSP/Supabase connect destination. This addresses the earlier whole-checkout packaging concern **provided the release mechanism actually submits this staged prebuilt output** rather than selecting the source root.

| Artifact | SHA-256 / digest |
| --- | --- |
| `scripts/prepare-release.mjs` | `A46CE0CE7B29D15A85CF6229DFCEE86E4C83124EF431369EBB1BCF71DE5C570C` |
| `.gitignore` | `224900A10F213313CF048D6F75927D6737D45BC8355C41CB5C068F66818CC930` |
| Generated output `config.json` (615 bytes) | `872167CDD25C3B38AA095900E5478A03884517C649E6CF096F4D2149C6C24DE2` |
| `artifacts/release/candidate.json` | `F2F58A316CA52F6985BC3B55315F79D98F6BBAA982FCA6300DEE7C502904332E` |
| Aggregate candidate identifier recorded by preparer | `97cfa95aff87f1212d8b99557c0d97cd884b1bef4cf428c50899327285a73ad1` |

The preparer's aggregate formula combines its ordered static manifest and generated config text; this reviewer inspected that formula but did not execute it. Individual staged file/config digests were independently computed. Preserve the exact candidate identifier and staged hashes through promotion. If headers, static bytes, inventory or target change, regenerate and re-review rather than treating the old approval as evidence for the replacement.

Runtime handling of the v3 routes, actual uploaded inputs and deployed headers still requires coordinator smoke verification. `.gitignore` is repository hygiene, not a cloud access-control mechanism. This follow-up does not expand the review into unchanged cloud/model behavior and grants no deployment or rollback permission.

## Post-deployment header observation — bounded assessment

The coordinator reports deployment `dpl_5Uo3La3QPk222jXAsys2CE4cA7pr` as READY on the existing production alias, with the root response body matching the reviewed artifact and the uploaded output config matching the reviewed config hash. These deployment facts were supplied by the coordinator, not independently queried by this reviewer.

The coordinator also reports that strict CSP equality failed: observed source lists include additional `*.opendns.com`, `gateway.id.swg.umbrella.com`, `*.sse.cisco.com` and `*.ciscosecureaccess.cn` entries, plus a trailing semicolon. The additional allowed sources are a substantive policy difference, even if the trailing separator alone is cosmetic. They must not be silently discarded to obtain a pass. The hostnames are consistent with an intermediary security product, but the location/cause of modification has not been established. Describe gateway rewriting as an inference, not a verified fact.

This is an **OPEN production-delivery/header-verification issue**, not evidence by itself of a new source defect, unauthorized artifact content or compromised ledger. An unchanged source/config hash does not establish the effective response policy observed by users. Equally, this single vantage does not prove that the deployment itself weakened its configuration. A rollback or security-setting change is not established as necessary solely by this observation.

Reviewed the sanitized `scripts/verify-production.mjs` source. Its checks separate exact static hashes, source/report route denial and signed-out browser rendering from strict header comparisons; it retains mismatches and a nonzero overall result. That distinction is appropriate. Do not report a complete production smoke pass while the header gate is open. Finish only the authorized bounded checks and retain the raw observed header evidence without stripping additions or changing protection/settings. Resolve attribution through an approved independent delivery vantage or provider-origin confirmation; this review does not authorize bypassing any network security product.

No live request, real data inspection or target script execution was performed by this reviewer for this assessment. Source/artifact review conclusions remain unchanged. Full production security-header verification remains incomplete until the discrepancy is explained and the intended delivered policy is evidenced.

## Independent public-root header closure — 2026-10-29

The coordinator retained a SecurityHeaders report for the exact public alias `https://school-service-payments.vercel.app/` at `artifacts/release/independent-headers.html`. Report timestamp: **29 Oct 2026 15:15:48 UTC**. Saved-report SHA-256 independently computed by this reviewer: `9D10A8456C8AA7D322D00C834B2D344496943911AE5257D1F1997AD6EA3C31A0`.

The reviewer treated the external HTML as untrusted evidence, executed none of it, and extracted only the site's **Raw Headers** table. HTML markup was removed and character references decoded for comparison; no source expressions, domains or directives were stripped or normalized away. All five configured header values match `vercel.json` and the staged output configuration exactly:

| Header | Independent public-root result |
| --- | --- |
| `X-Content-Type-Options` | Exact match: `nosniff` |
| `Referrer-Policy` | Exact match: `no-referrer` |
| `X-Frame-Options` | Exact match: `DENY` |
| `Cache-Control` | Exact match: `no-store` |
| `Content-Security-Policy` | Exact match to the full reviewed directive string |

The independently observed root CSP is:

```text
default-src 'self'; script-src 'self'; style-src 'self'; connect-src https://jjpaxysocfvumjvbbrlb.supabase.co; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
```

None of the four additional Cisco/OpenDNS host patterns from the original local response occurs in the retained independent report. The scanner's displayed letter grade is not used as evidence of application security or compliance.

**The deployed public-root header-equivalence concern is CLOSED by independent-vantage evidence.** The original local-vantage mismatch remains a genuine retained failed comparison and should not be rewritten as a pass. The observations support a delivery-path-specific modification rather than a demonstrated mismatch in the public root configuration, but they do not identify which intermediary performed the modification. No bypass, security-setting change, rollback or ledger access is needed to obtain this closure.

Scope is deliberately limited to the public root and the five configured headers. This report does not claim independent header checks for every asset path, signed-in authentication, email delivery, two-device synchronization or real-account behavior. The coordinator may append separately obtained evidence for additional public paths. This reviewer made no new network request and inspected no private/account data; the saved public report and local public configuration are the evidence sources.

## All seven public paths — independent closure

The coordinator obtained six additional public scanner reports and recorded a passing run of `node scripts/verify-independent-headers.mjs --fetch` (exit 0). This reviewer inspected the verifier source, then **independently parsed all seven saved reports using separate read-only PowerShell extraction**, without executing the project verifier or making any network request.

For each report the independent check established: exact public target URL; a successful 200 target response in the Raw Headers table; exactly one occurrence of each of the five configured headers; case-sensitive equality of every header value to `vercel.json`; and a saved-report SHA-256 matching the coordinator's structured evidence. All **35 header comparisons passed**. No Cisco/OpenDNS additions occur in any of the seven raw-header tables. Only HTML markup removal and character-reference decoding were used; no policy source, directive or domain was removed to obtain equality.

| Public path | Report time (29 Oct 2026, UTC) | Saved report SHA-256 |
| --- | --- | --- |
| `/` | 15:15:48 | `9D10A8456C8AA7D322D00C834B2D344496943911AE5257D1F1997AD6EA3C31A0` |
| `/src/app.js` | 15:17:40 | `7965DF7F12C885893FE86E2BF2846BB59222666445CAAA634884334C543CAC52` |
| `/src/styles.css` | 15:17:41 | `CBE877CBFD58E1423A36053FF99A41F5127AE71CC43F881A759AC8C8FBB08927` |
| `/assets/school-route.png` | 15:17:42 | `576078FE2A2A13FE7EA1500BAC9122ED0CB77BC94D394E2BA6EFC8E452B5C9CC` |
| `/assets/instrument-sans-latin-400-normal.woff2` | 15:17:43 | `920B92D7AB8F0110298DECE59ED37D1F36EAE213CE6CECB53B2D15120DE02DE9` |
| `/assets/instrument-sans-latin-600-normal.woff2` | 15:17:43 | `67C30FBFA69F7769698DA33B0C5457133B41FC3F6E59C9ED0D0B25EA2A054951` |
| `/assets/FONT-LICENSE.txt` | 15:17:44 | `DDDE190E5EC6F9135C70F478FFE02A51E057474E4B050F1E219C134CA2773C81` |

Retained structured evidence: `artifacts/release/independent-header-checks.json`, SHA-256 `7845AA56C44D59C28DC97E3A87B5C7C8AA47FA63494550E83585CD64C895FDFA`. Inspected verifier source: `scripts/verify-independent-headers.mjs`, SHA-256 `DFCD3637FBD4F989AF55D0E72ECA96F6299DFA1B61CBC9D91E64407EC28A5560`.

The verifier requires the exact configured production alias, verifies scanner target/time/success, reads raw header cells rather than the scanner grade/advice, rejects missing/duplicate/different values, and retains report hashes. Its optional network requests include only public artifact URLs. The reviewer did not execute that network path.

**The delivered-header verification item is CLOSED for all seven reviewed public static paths and all five configured headers.** This supersedes the earlier root-only limitation. The original local-vantage strict-header failures remain preserved as failures, with their delivery-path difference documented; they are not relabelled as passes. No application byte, provider configuration, protection setting or security policy was changed for this closure.

The closure applies to candidate `97cfa95aff87f1212d8b99557c0d97cd884b1bef4cf428c50899327285a73ad1` on the stated public alias at the report times above. It is not evidence of authenticated ledger journeys, live account/email recovery, two-device synchronization or a comprehensive audit. Attribution of the local intermediary modification remains unproved and is not required to establish that the independent public responses carry the intended policy.
