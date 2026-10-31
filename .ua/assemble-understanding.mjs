import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Analysis artifact only: consumes bundled extractor output, never executes project code.
const root=path.resolve(process.argv[2]);
const plugin=path.resolve(process.env.PLUGIN_ROOT);
const ua=path.join(root,'.ua');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const scan=read(path.join(ua,'intermediate/scan-result.json'));
const batches=read(path.join(ua,'intermediate/batches.json')).batches;
const isPayment=path.basename(root)==='school-service-payments';
const java='backend/src/main/java/local/knowledge/';
const descriptions=isPayment ? {
 'src/app.js':'Browser application coordinating Supabase account state, cloud refreshes, dashboard/roster/charge/payment views, accessible forms, confirmations, receipts, and backup/export flows. Domain arithmetic lives in model.js and persistence in LedgerStore.',
 'src/model.js':'Pure ledger rules using integer centavos, date-only validation, student/invoice/payment integrity checks, immutable charge/payment updates, service-month metrics, and spreadsheet-safe CSV output.',
 'src/cloud.js':'Creates the Supabase client with persisted PKCE authentication sessions and implements owner-filtered JSON ledger loading and revision-checked writes with mutation-ID reconciliation.',
 'src/config.js':'Browser-visible Supabase endpoint and publishable-key configuration. These public settings are not a substitute for RLS; no value is reproduced in this graph.',
 'src/styles.css':'Complete responsive ledger presentation, including navigation, tables, status badges, modal states, reduced-motion behavior, and print receipt styling.',
 'index.html':'Static application shell containing navigation, content region, account/sync status, dialog, toast, and printable receipt targets populated by app.js.',
 'build.mjs':'Recreates dist, bundles app.js and Supabase dependencies into a minified ES module, and copies the HTML/CSS for static hosting.',
 'server.mjs':'Loopback development server allowing only the built HTML, JavaScript, and stylesheet through GET/HEAD; sends security and no-store headers and rejects other paths/methods.',
 'vercel.json':'Static deployment build/output settings and browser security headers, including a fixed Supabase connection destination.',
 'package.json':'Pinned Supabase/esbuild dependencies, Node 22 requirement, and start/check/test/build command definitions.',
 'supabase/migrations/20261020163028_cloud_ledger.sql':'Defines one JSONB ledger per authenticated owner, payload validation, owner-only non-anonymous RLS policies, limited grants, revision/mutation triggers, and update timestamps.',
 'tests/model.test.js':'Synthetic unit cases for exact money/date handling, duplicate-safe charges, partial/full/void payments, metrics, backup validation, and CSV formula neutralization.',
 'tests/cloud.test.js':'Fluent-client mocks verify owner-scoped loads, first inserts, expected-revision updates, stale-device rejection, uncertain responses, and invalid-save prevention without contacting Supabase.',
 'tests/server.test.js':'Starts a synthetic loopback child server to check static allowlisting, security headers, unsupported paths, and write rejection; requires built files and a free port.',
 'tests/cloud-rls.sql':'Transactional database regression script for owner isolation, anonymous denial, stale updates, and invalid payloads. It is source evidence only; not executed by this analysis.',
 'tests/MANUAL.md':'Human browser acceptance checklist for ledger flows, cloud sign-in, multi-device conflicts, backups, accessibility, and mobile behavior.',
 'DESIGN.md':'Persisted ledger visual direction and interaction rationale; design intent is distinct from runtime acceptance evidence.',
 'PRODUCT.md':'Product goals, scope boundaries, records, payment rules, and exclusions for the personal school-service ledger.',
 'README.md':'User/developer guide for hosted and local usage, cloud privacy/concurrency, backup migration, verification, deployment, and recovery.',
 'TASKS.md':'Development task history and recorded delivery outcomes; historical status is not a fresh test result.',
 'UX-CONTRACT.md':'Written UI behavior contract covering navigation, forms, loading/errors, confirmation/recovery, and accessibility expectations.',
 'VERIFICATION.md':'Recorded prior verification scope and unresolved manual checks; this analysis does not re-run or independently certify those results.',
 'premium-audit.json':'Machine-readable historical UI audit findings and verification status.',
 'premium-ui.json':'Machine-readable UI context and product design settings.'
} : {
 'src/main.tsx':'React root implementing transient conversation state, question submission/cancellation, source citations, library listing, reviewed import/edit/delete flows, and a sequential file-review queue.',
 'src/api.ts':'Typed browser API contracts and a same-origin fetch wrapper adding the custom mutation header, a 90-second abort timeout, JSON/multipart handling, and sanitized error messages.',
 'src/AIConnection.tsx':'Modal for checking provider status, preparing account sign-in, selecting returned models or API configuration, explicitly approving sharing/request allowance, disconnecting, and choosing offline search.',
 'src/ThemeToggle.tsx':'Accessible theme toggle that updates the document theme and persists only the visual preference.',
 'src/theme-boot.js':'Early theme initialization before React renders, using the stored preference when valid.',
 'src/styles.css':'Responsive chat/library/connection-dialog styling, light/dark tokens, focus and busy/error states, and mobile layout rules.',
 'index.html':'Minimal static entry document loading the pre-render theme script and the bundled React application.',
 'scripts/build.mjs':'Bundles the React entry and stylesheet to dist and copies the HTML and early theme script; does not build the Java backend.',
 'package.json':'Pinned React/TypeScript/esbuild dependencies and typecheck/build/browser-test scripts.',
 'tsconfig.json':'TypeScript compiler settings for the React frontend and API contract checking.',
 'Start Runbook.cmd':'Windows launcher entering backend and running knowledge-chat-0.2.0.jar; reports missing build artifacts and leaves shutdown to Ctrl+C.',
 'backend/pom.xml':'Java 21 Maven application pinned to Spring Boot 3.5.16 with web, validation, test, and executable JAR packaging.',
 'backend/src/main/resources/application.properties':'Loopback listener, port, multipart/body limits, virtual threads, static frontend location, content logging suppression, local data location, and provider selection defaults.',
 [java+'KnowledgeApplication.java']:'Spring Boot entry point; framework scanning wires controllers, services, request filter, and configuration.',
 [java+'ApiController.java']:'REST surface for status, AI selection, source preview/CRUD, and retrieval-backed chat; selects offline, direct provider, account provider, or explicitly verified local-Ollama behavior.',
 [java+'ApiErrors.java']:'Controller advice converting invalid input, unavailable operations, validation failures, and unexpected exceptions into bounded generic API errors.',
 [java+'Extractor.java']:'Strict UTF-8/text and bounded DOCX body-text extraction with extension allowlist, ZIP expansion limits, hardened XML parsing, and recursion limits; no script execution.',
 [java+'KnowledgeStore.java']:'Synchronized in-memory source catalog backed by per-source JSON files, atomic replacement saves, UUID path validation, keyword-ranked excerpts, and budgeted AI context selection.',
 [java+'LocalBoundary.java']:'First request filter enforcing loopback Host/same-Origin/custom mutation header and body caps, a narrow navigation exception for OAuth callback, and browser security headers.',
 [java+'OpenAiProvider.java']:'Single-flight text-only provider adapter using a fixed Responses endpoint, in-memory API credential or subscription token, bounded allowance/context/output, no automatic retry, and strict citation-ID response validation.',
 [java+'Redactor.java']:'Regex-based replacement of common sensitive patterns in preview titles/text, stored sources, questions, context, and replies; incomplete detection still requires human review.',
 [java+'SubscriptionAuth.java']:'Public-client sign-in state machine with fresh state/nonce/PKCE, one-use callbacks, fixed discovery/token/key endpoints, RSA identity validation, memory-only credentials, refresh, model allowlisting, and best-effort revocation.',
 [java+'SubscriptionController.java']:'REST wrapper for account connection status/start/models/disconnect plus a constant-content callback page; explicitly offline mode blocks cloud setup.',
 'backend/src/test/java/local/knowledge/KnowledgeTests.java':'Synthetic extraction, redaction, store, retrieval, HTTP-boundary, approval, local-model metadata, and XML-depth unit tests.',
 'backend/src/test/java/local/knowledge/ApiIntegrationTests.java':'Synthetic Spring integration check for preview non-persistence and required mutation-header behavior.',
 'backend/src/test/java/local/knowledge/OpenAiProviderTests.java':'Injected-transport tests for context redaction, memory-only configuration, attempt budgeting, no retries, no requests without evidence, strict citation validation, and completed-stream handling.',
 'backend/src/test/java/local/knowledge/SubscriptionAuthTests.java':'Synthetic OAuth/token-key tests for fresh PKCE, expiry/replay handling, model allowlisting, signature/claims verification, permission rejection, and callback non-disclosure.',
 'tests/browser-check.mjs':'Synthetic Playwright flow using sibling browser tooling and an isolated Java process; covers library/chat and theme behavior but references an older JAR/name baseline.',
 'README.md':'End-user setup, reviewed source import, AI/offline modes, privacy/storage, build/check, and rollback guide.',
 'backend/README.md':'Backend API and trust-boundary documentation; contains an older 0.1.0 JAR command while current pom/launcher use 0.2.0.',
 'backend/RESEARCH.md':'Recorded provider-integration research and limits; prior alternatives do not prove the currently implemented remote contracts work.',
 'PROJECT-START.md':'Historical project startup record, requirements/roles/skill choices, and delivery constraints.',
 'QA-REVIEW.md':'Prior synthetic QA observations; results are scoped to the recorded candidate rather than this analysis session.',
 'SECURITY-REVIEW.md':'Prior independent baseline security review and subsequent provider notes; new OAuth/provider behavior still needs fresh independent/live verification.',
 'RELEASE-REVIEW.md':'Recorded release gate and changes, including remaining provider/account/UI verification limits.',
 'DECISIONS.md':'Project design/technology decisions and stated boundaries.',
 'DESIGN.md':'Persistent frontend design and interaction direction.',
 'TASKS.md':'Task history and known outstanding checks.',
 'UX-CONTRACT.md':'Behavioral contract for reviewed knowledge imports and chat interactions.',
 'knowledge-sources.json':'Source registration metadata describing an original document awaiting a user-sanitized copy; referenced documents are not opened or imported by this analysis.',
 'premium-audit.json':'Historical frontend audit metadata; not fresh browser verification.'
};

const fnDescriptions={
 emptyState:'Creates the version-1, revision-zero ledger with empty student, invoice, and payment arrays.',
 today:'Formats the current calendar date in Asia/Manila; ledger due-date decisions use this timezone.',
 validDate:'Checks ISO date shape, allowed year range, parsing, and exact calendar round-trip.',
 cents:'Parses a positive decimal PHP amount into safe integer centavos and rejects exponent notation, excess precision, zero, and excessive amounts.',
 money:'Formats integer centavos as PHP currency for display.',
 paid:'Sums non-voided payments linked to an invoice.',
 balance:'Subtracts active payments from the charge amount.',
 status:'Classifies zero balance as Paid, then past-due balances as Overdue, otherwise Partial or Unpaid.',
 validateState:'Checks ledger version/revision, collection limits, global ID uniqueness, valid records/references, unique student-month charges, and absence of overpayments.',
 addPayment:'Rejects unknown invoices, future/invalid dates, and overpayments; clones the ledger, adds a non-voided payment, and validates the result.',
 createCharges:'Clones the ledger and adds one fee-snapshot charge for each active student missing the selected month, then validates the result.',
 metrics:'Computes billed, collected, outstanding, overdue, paid-count, and total metrics for invoice service month.',
 csv:'Builds BOM-prefixed quoted CSV with escaped quotes and a protective apostrophe before spreadsheet formula prefixes.',
 commit:'Serializes cloud writes, requires a loaded online ledger, detects account-generation changes, and adopts state only after a confirmed save.',
 refreshLedger:'Loads the owner ledger without overwriting an open modal, adopts revision only when safe, updates status, and preserves state on failure.',
 authScreen:'Renders sign-in/signup UI, validates credentials locally, and delegates account operations to Supabase Auth.',
 setAccount:'Resets account-scoped state and dialogs, creates an owner-bound store, and refreshes the selected account ledger.',
 modal:'Opens an accessible dialog, captures the original form draft, serializes submission, checks fields, and keeps failed edits available.',
 close:'Closes a non-saving dialog, clears its draft, and restores focus to its opener or the main region.',
 dirty:'Compares current form entries against the captured draft to detect unsaved changes.',
 requestClose:'Blocks closing while saving and presents an explicit discard choice when the form is dirty.',
 studentForm:'Creates or edits a student and agreed monthly fee while preserving historical charges.',
 chargesForm:'Previews duplicate-safe monthly charge creation for active students, then commits the selected month.',
 paymentForm:'Selects an unpaid charge, collects actual receipt details, applies model validation, and commits a partial or full payment.',
 editCharge:'Updates charge amount/due/note while preventing reductions below payments already received.',
 archiveStudent:'Confirms archive/restore and toggles future-charge eligibility while retaining financial history.',
 voidPayment:'Requires a correction reason, marks the payment voided, and retains the original record in history.',
 receipt:'Builds an escaped printable payment acknowledgment with dates, method, reference, and void status.',
 download:'Creates a temporary Blob URL for a browser download and revokes it after use.',
 exportCharges:'Exports selected-month charges with student details, amounts, balances, and derived status.',
 exportPayments:'Exports the full payment history, including voided entries and correction reasons.',
 dashboard:'Renders service-month accounting totals, cash activity, outstanding balances, and navigation actions.',
 trend:'Builds six months of cash-received activity using payment dates rather than service months.',
 render:'Selects the current account/loading/page state, renders the matching view, and updates display metrics.',
 navigate:'Resolves known hash routes and resets pagination/search/filter state for the next view.',
 App:'Owns React application state and orchestrates source-library CRUD, reviewed file imports, transient chat/citations, cancellation, and provider settings.',
 AIConnection:'Displays connection setup and approval controls; checks model/status data through the API and clears transient credential inputs after configuration.',
 ThemeToggle:'Toggles the document theme, accessible label, and local theme preference.',
 api:'Adds the required local-client header and bounded cancellation to API fetches, selects JSON/multipart headers, and exposes safe failures.',
 mode:'Selects the effective answer mode from explicit offline choice, configured provider, connection status, and optional local-model configuration.',
 aiStatus:'Returns non-secret provider/model/remaining-attempt status for the UI.',
 configureAi:'Requires an allowed mode and delegates approved API configuration to OpenAiProvider.',
 clearAi:'Clears configured API/provider state without exposing credentials.',
 offline:'Clears provider configuration and selects source-only local search.',
 requireAiMode:'Rejects online setup when this process was explicitly forced into local-search mode.',
 sources:'Returns source metadata summaries without complete source text.',
 source:'Looks up a saved source and returns 404 when absent.',
 preview:'Redacts a pasted source title/text into a transient preview without saving.',
 previewFile:'Applies file-size and basename rules, extracts allowed text, and returns a redacted preview without storing the original.',
 sanitize:'Redacts source name/text and returns the human-review warnings alongside replacement counts.',
 chat:'Redacts the question, retrieves supporting source citations, and chooses provider/local-model/offline response behavior; missing evidence returns without provider use.',
 generate:'Verifies explicitly local-only Ollama metadata, serializes generation, sends bounded evidence/context, and rejects missing or oversized replies.',
 verifyLocalMetadata:'Rejects remote/cloud metadata and requires a GGUF local model format.',
 readBounded:'Reads local-model output with a byte cap and timed virtual-thread task, closing/canceling timed-out work.',
 extract:'Enforces allowed extension, upload bytes, strict UTF-8 or DOCX extraction, and nonempty bounded text.',
 docx:'Reads only DOCX body XML after bounded ZIP traversal, disables XML external access, and collects paragraphs under size/depth limits.',
 collect:'Recursively collects DOCX text/tab/break nodes with a maximum nesting depth.',
 retrieve:'Ranks source text chunks by matched non-stopword terms normalized by chunk vocabulary size, returning up to five citations.',
 retrieveForAi:'Uses whole small libraries up to an 80,000-character budget, otherwise prioritizes matched documents and falls back to ranked passages.',
 terms:'Tokenizes Unicode letters/numbers, removes short terms and common stopwords, and deduplicates search terms.',
 validId:'Restricts source storage IDs to UUID-shaped lowercase hexadecimal strings.',
 doFilterInternal:'Checks local Host, matching Origin, cross-site metadata, mutation header, and body size, then adds security headers and forwards only accepted requests.',
 configure:'Requires explicit sharing/allowance approval and valid credential/model input; sets in-memory API state under single-flight exclusion.',
 configureSubscription:'Requires approved plan usage, a connected account, an allowlisted model, and a bounded request allowance before choosing account-based answers.',
 erase:'Overwrites the in-memory character buffer before releasing the API credential reference.',
 answer:'Requires evidence, an approved configured provider, single-flight access, and remaining allowance; reserves one attempt and validates the sole remote response without automatic retry.',
 completedEvent:'Parses account-provider SSE and requires exactly one completed response; rejects failed/incomplete/error or ambiguous streams.',
 payload:'Builds redacted, bounded recent conversation and numbered source evidence with a strict claim/citation schema, storage disabled, and tools disabled.',
 validateReply:'Requires completed text-only structured output, validates each nonempty claim and in-range citation ID, redacts claims, and rejects malformed/uncited output.',
 safeFailure:'Maps provider HTTP failures to generic non-provider-content messages without retrying.',
 productionTransport:'Creates a fixed HttpClient transport that does not follow redirects and bounds response bytes/read time.',
 start:'Creates a fresh five-minute one-use sign-in attempt with state, nonce, PKCE verifier/challenge, loopback callback, requested resource, and scopes.',
 finish:'Consumes a matched callback attempt once, validates expiry/client/discovery/token/identity/permissions, and activates credentials only after metadata succeeds.',
 activeToken:'Returns an unexpired in-memory token or performs bounded refresh, clearing account state when renewal fails or required permission is lost.',
 models:'Loads the signed-in model catalog and retains a bounded allowlist of visible model IDs for subsequent configuration.',
 isModelAllowed:'Checks that a connected account has the requested ID in its fetched model allowlist.',
 disconnect:'Clears all in-memory account state immediately and attempts remote refresh-token revocation, reporting whether confirmation was received.',
 discovery:'Fetches discovery metadata and rejects issuer or fixed authorization/token/JWKS endpoint mismatches.',
 tokenRequest:'Posts encoded grant parameters to the fixed token endpoint and returns parsed success data or a generic failure.',
 readCredentials:'Validates token type, bounded credential strings, expiry, and granted scope data before constructing an in-memory credential record.',
 keys:'Caches fetched verification keys for five minutes and rejects unsuccessful key retrieval.',
 verifyIdentity:'Verifies bounded RS256 JWT signature/key parameters and issuer, audience, authorized-party, time, nonce, and subject claims.',
 writeMetadata:'Atomically writes only app host/client registration metadata under a validated local metadata directory.',
 randomValue:'Generates 32 cryptographically random bytes encoded as URL-safe unpadded base64.',
 validClient:'Checks the provider-issued public client identifier syntax.',
 required:'Requires a present bounded string field or returns a generic validation failure.',
 form:'URL-encodes request form values for the authentication transport.',
 validatedAuthEndpoint:'Permits only HTTPS auth.openai.com endpoints without userinfo, ports, query, or fragment.',
 responseLimit:'Gives the model catalog a larger body allowance while retaining a smaller bound for credential responses.',
 defaultTransport:'Performs bounded no-redirect HTTPS requests with time-limited body reads and no persistence of provider content.',
 callback:'Completes the pending sign-in and returns a fixed success/failure HTML page without echoing codes, identity, or provider errors.',
 requireCloud:'Rejects cloud sign-in operations for explicitly local-search processes.',
 redact:'Applies configured regex replacement rules to common sensitive patterns and returns text plus replacement count.',
 rule:'Creates one compiled replacement rule for common sensitive input patterns.',
 assertTheme:'Checks keyboard theme toggling, reload persistence, narrow layout, screenshots, and theme-only browser storage in synthetic contexts.'
};

function human(s){return s.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' ').toLowerCase();}
function symbolSummary(f,n){
 if (/Tests?\.java$/.test(f)||f.includes('.test.')||f.includes('.spec.')) return 'Synthetic test/helper for '+human(n)+'. Read the test body for exact fixture and assertions; its existence is not evidence it passed in this analysis.';
 if(n===path.basename(f,'.java'))return 'Constructs '+n+' and its injected collaborators/configuration; overloaded constructors support production wiring or synthetic tests.';
 if(f.endsWith('KnowledgeStore.java')) {
   const d={save:'Redacts and validates a reviewed source, writes a per-source JSON file atomically when supported, and updates the synchronized catalog.',delete:'Removes a valid source JSON file and catalog entry while leaving original uploads unchanged.',list:'Returns compact summaries of the in-memory approved-source catalog.',get:'Looks up a source by its generated ID without reading arbitrary file paths.'};if(d[n])return d[n];
 }
 if(n==='status')return 'Returns non-secret current status for '+path.basename(f)+', without exposing account credentials or source text.';
 return fnDescriptions[n] || ('Implements '+human(n)+' within '+path.basename(f)+'. See its source range and caller/dependency links for the exact behavior.');
}
function fileType(f){if(f.fileCategory==='docs')return 'document';if(f.fileCategory==='config')return 'config';if(f.fileCategory==='data')return 'schema';return 'file';}
const fileIds=new Map(scan.files.map(f=>[f.path,fileType(f)+':'+f.path]));
const allFragments=[];const extractionByFile=new Map();const warnings=['Static source analysis only; no app/browser/provider/database acceptance tests were run.','Excluded credentials, saved knowledge, uploaded documents, runtime stores, dependencies, generated outputs, and binary media.','Bundled scanner used recursive traversal because git ls-files was unavailable.','Symbol and call coverage is parser-derived, not whole-program dynamic execution or proof of behavior.'];
for(const b of batches){const ex=read(path.join(ua,`tmp/extract-${b.batchIndex}.json`));if(ex.filesUnreadable?.length)throw new Error('Unreadable files: '+JSON.stringify(ex.filesUnreadable));for(const r of ex.results)extractionByFile.set(r.path,r);if(ex.filesSkipped?.length)warnings.push('No structural parser for: '+ex.filesSkipped.join(', ')+'. File nodes and semantic/manual source review retained.');}
if(isPayment)warnings.push('SQL parser labeled public.service_ledgers as public; semantic table node corrects the qualified name using the migration source.');
else warnings.push('Historical backend README and browser test reference knowledge-chat-0.1.0.jar; current pom and launcher use 0.2.0.','Historical browser checks target earlier UI text; they were not run or claimed current.','Live account sign-in, account model catalog, provider inference, revocation, and fresh independent cloud-adapter review remain unverified.');
for(const b of batches){
 const nodes=[],edges=[];
 const edge=(s,t,type,description)=>{if(s!==t)edges.push({source:s,target:t,type,direction:'forward',weight:({contains:1,exports:.8,calls:.8,imports:.7}[type]??.6),...(description?{description}:{} )});};
 for(const f of b.files){
  const r=extractionByFile.get(f.path);const fid=fileIds.get(f.path);const type=fileType(f);const content=fs.readFileSync(path.join(root,f.path),'utf8');
  const summary=descriptions[f.path] || (type==='document'?'Documentation covering '+content.split(/\r?\n/).filter(l=>/^#{1,3}\s/.test(l)).slice(0,5).map(l=>l.replace(/^#+\s*/, '')).join('; ')+'.':'Project '+f.fileCategory+' artifact '+f.path+'.');
  const tags=[f.fileCategory,f.language,(/test/i.test(f.path)?'test':type==='document'?'documentation':'project-source')];
  nodes.push({id:fid,type,name:path.basename(f.path),filePath:f.path,summary,tags,complexity:f.sizeLines>200?'complex':f.sizeLines>50?'moderate':'simple'});
  const byName=new Map();const classByName=new Map();
  for(const c of r?.classes??[]){if(!c.name)continue;const id=`class:${f.path}:${c.name}`;nodes.push({id,type:'class',name:c.name,filePath:f.path,lineRange:[c.startLine,c.endLine],summary:descriptions[f.path]||`Groups ${c.name} behavior in ${f.path}.`,tags:['class',f.language,/test/i.test(f.path)?'test':'domain-logic'],complexity:c.endLine-c.startLine>200?'complex':'moderate'});classByName.set(c.name,id);edge(fid,id,'contains');if((r.exports??[]).some(x=>x.name===c.name))edge(fid,id,'exports');}
  // Include all parsed declarations, including short helpers, for the requested deep view.
  for(const fn of r?.functions??[]){if(!fn.name)continue;const duplicates=(r.functions??[]).filter(x=>x.name===fn.name).length>1;const id=`function:${f.path}:${fn.name}${duplicates?'@'+fn.startLine:''}`;const owner=(r.classes??[]).find(c=>fn.startLine>=c.startLine&&fn.endLine<=c.endLine);nodes.push({id,type:'function',name:fn.name,filePath:f.path,lineRange:[fn.startLine,fn.endLine],summary:symbolSummary(f.path,fn.name),tags:['function',f.language,/test/i.test(f.path)?'test':owner?'method':'implementation'],complexity:fn.endLine-fn.startLine>50?'complex':fn.endLine-fn.startLine>10?'moderate':'simple',languageNotes:fn.params?.length?'Parameters: '+fn.params.join(', ')+'.':undefined});if(!byName.has(fn.name))byName.set(fn.name,[]);byName.get(fn.name).push(id);edge(fid,id,'contains');if(owner&&classByName.has(owner.name))edge(classByName.get(owner.name),id,'contains');if((r.exports??[]).some(x=>x.name===fn.name))edge(fid,id,'exports');}
  for(const imp of b.batchImportData?.[f.path]??[])if(fileIds.has(imp))edge(fid,fileIds.get(imp),'imports');
  // Local lexical call names only. External/built-in/dynamic receivers are not guessed.
  for(const c of r?.callGraph??[]){if(byName.get(c.caller)?.length===1 && byName.get(c.callee)?.length===1)edge(byName.get(c.caller)[0],byName.get(c.callee)[0],'calls','Parser call expression; dynamic execution is not established.');}
  if(type==='document')for(const target of scan.files){if(target.path!==f.path&&(content.includes(target.path)||content.includes('`'+path.basename(target.path)+'`')))edge(fid,fileIds.get(target.path),'documents','Explicit file reference in documentation.');}
 }
 allFragments.push({batch:b,nodes,edges});
}
function addFileEdge(a,b,type,description){if(!fileIds.has(a)||!fileIds.has(b))return;const frag=allFragments.find(x=>x.batch.files.some(f=>f.path===a));frag.edges.push({source:fileIds.get(a),target:fileIds.get(b),type,direction:'forward',weight:.6,description});}
if(isPayment){
 const cloud=allFragments.find(x=>x.batch.files.some(f=>f.path==='src/cloud.js'));
 for(const [name,start,end,summary] of [['constructor',8,8,'Stores the Supabase client and owner ID with initial expected revision zero.'],['load',9,14,'Reads only the selected owner row and validates its ledger; intentionally leaves expected revision adoption to the UI.'],['save',15,32,'Increments the expected revision, validates the snapshot, inserts/compares revision atomically, and reconciles uncertain completion by a unique mutation ID.']]) {const id=`function:src/cloud.js:LedgerStore.${name}`;cloud.nodes.push({id,type:'function',name:'LedgerStore.'+name,filePath:'src/cloud.js',lineRange:[start,end],summary,tags:['method','persistence','cloud-sync'],complexity:name==='save'?'complex':'simple'});for(const source of ['file:src/cloud.js','class:src/cloud.js:LedgerStore'])cloud.edges.push({source,target:id,type:'contains',direction:'forward',weight:1});}
 const migration='supabase/migrations/20261020163028_cloud_ledger.sql';const frag=allFragments.find(x=>x.batch.files.some(f=>f.path===migration));
 const tid=`table:${migration}:public.service_ledgers`;frag.nodes.push({id:tid,type:'table',name:'public.service_ledgers',filePath:migration,lineRange:[59,66],summary:'One row per auth owner: owner_id UUID primary key, revision bigint, validated ledger data JSONB, last_mutation UUID, updated_at timestamp. RLS and grants permit authenticated non-anonymous owners to select/insert/update only their row.',tags:['database','owner-isolation','jsonb-ledger'],complexity:'complex'});frag.edges.push({source:fileIds.get(migration),target:tid,type:'defines_schema',direction:'forward',weight:.8});
 for(const [name,start,end,summary] of [['public.valid_service_ledger',2,56,'Validates JSONB ledger structure, bounded amounts/arrays/fields, unique IDs/student-month charges, references, dates and absence of overpayment; invalid input returns false.'],['public.guard_service_ledger_revision',77,90,'Enforces insert revision one, immutable owner, revision increment, changed mutation ID, and update timestamp.']]){const id=`function:${migration}:${name}`;frag.nodes.push({id,type:'function',name,filePath:migration,lineRange:[start,end],summary,tags:['database','validation','plpgsql'],complexity:'complex'});frag.edges.push({source:fileIds.get(migration),target:id,type:'contains',direction:'forward',weight:1});}
 addFileEdge('src/cloud.js',migration,'depends_on','LedgerStore requires the owner ledger table, validation, grants, RLS, and revision trigger.');addFileEdge(migration,'tests/cloud-rls.sql','tested_by','Static transactional database regression source; not run here.');
 addFileEdge('src/model.js','tests/model.test.js','tested_by');addFileEdge('src/cloud.js','tests/cloud.test.js','tested_by');addFileEdge('server.mjs','tests/server.test.js','tested_by');
 for(const t of ['build.mjs','server.mjs','src/app.js'])addFileEdge('package.json',t,'configures');addFileEdge('build.mjs','src/app.js','depends_on');addFileEdge('index.html','src/app.js','depends_on');addFileEdge('index.html','src/styles.css','depends_on');addFileEdge('vercel.json','build.mjs','configures');
} else {
 const nested=[
 ['src/main.tsx','App.refresh',32,35,'Loads safe status and source summaries together, updating the library and answer-mode display.'],
 ['src/main.tsx','App.fail',41,41,'Converts a caught failure into visible UI error text.'],
 ['src/main.tsx','App.ask',42,53,'Serializes question submission, appends transient messages, sends recent history, handles abort/errors, and clears the request lock.'],
 ['src/main.tsx','App.previewFile',54,59,'Uploads one chosen file for a transient redacted preview while preserving the rest of the review queue.'],
 ['src/main.tsx','App.choose',60,66,'Filters hidden/generated paths, caps selection at 100 files, and starts sequential per-file review.'],
 ['src/main.tsx','App.save',67,71,'Requires an approved draft, saves reviewed knowledge, clears chat context, and refreshes source metadata.'],
 ['src/main.tsx','App.edit',72,75,'Loads an existing full source into the draft editor and resets approval before changes can be saved.'],
 ['src/main.tsx','App.deleteSource',76,80,'Deletes the explicitly selected source, clears transient conversation state, and refreshes the library.'],
 ['src/AIConnection.tsx','AIConnection.load',20,24,'Fetches connection and account status; loads the allowed catalog only for an eligible connected account.'],
 ['src/AIConnection.tsx','AIConnection.run',26,26,'Serializes connection operations and presents safe caught errors while honoring cancellation.'],
 ['src/AIConnection.tsx','AIConnection.configured',27,27,'Clears the browser credential input, notifies the parent, and closes the setup modal.'],
 ['src/ThemeToggle.tsx','ThemeToggle.toggle',4,4,'Updates visual theme and saves only the theme preference, tolerating unavailable localStorage.']
 ];
 for(const [f,name,start,end,summary] of nested){const frag=allFragments.find(x=>x.batch.files.some(y=>y.path===f));const id=`function:${f}:${name}`;frag.nodes.push({id,type:'function',name,filePath:f,lineRange:[start,end],summary,tags:['nested-function','react','manual-semantic-supplement'],complexity:end-start>10?'moderate':'simple'});frag.edges.push({source:fileIds.get(f),target:id,type:'contains',direction:'forward',weight:1});const owner=frag.nodes.find(x=>x.type==='function'&&x.name===name.split('.')[0]);if(owner)frag.edges.push({source:owner.id,target:id,type:'contains',direction:'forward',weight:1});}
 warnings.push('React nested handlers were manually supplemented from source because the structural extractor reports their top-level component only; callback arrows and framework-generated record accessors are not separate nodes.');
 const api=java+'ApiController.java',sub=java+'SubscriptionController.java';
 const endpointSpecs=[
 [api,'GET','/api/status','status',51],[api,'GET','/api/ai/status','aiStatus',52],[api,'POST','/api/ai/configure','configureAi',59],[api,'POST','/api/ai/subscription','configureSubscription',62],[api,'DELETE','/api/ai/configure','clearAi',65],[api,'POST','/api/ai/local-search','offline',66],[api,'GET','/api/sources','sources',68],[api,'GET','/api/sources/{id}','source',69],[api,'POST','/api/preview','preview',72],[api,'POST','/api/preview/file','previewFile',73],[api,'POST','/api/sources','save',85],[api,'DELETE','/api/sources/{id}','delete',89],[api,'POST','/api/chat','chat',92],
 [sub,'GET','/api/subscription/status','status',17],[sub,'POST','/api/subscription/start','start',18],[sub,'GET','/api/subscription/models','models',22],[sub,'DELETE','/api/subscription','disconnect',23],[sub,'GET','/auth/callback','callback',24]];
 for(const [f,method,url,handler,line]of endpointSpecs){const frag=allFragments.find(x=>x.batch.files.some(y=>y.path===f));const id=`endpoint:${f}:${method}-${url}`;frag.nodes.push({id,type:'endpoint',name:method+' '+url,filePath:f,lineRange:[line,line],summary:`${method} ${url} is implemented by ${handler}. ${symbolSummary(f,handler)}`,tags:['http-endpoint',method.toLowerCase(),'loopback-only'],complexity:'moderate'});frag.edges.push({source:fileIds.get(f),target:id,type:'contains',direction:'forward',weight:1});const fn=frag.nodes.find(x=>x.type==='function'&&x.filePath===f&&x.name===handler);if(fn)frag.edges.push({source:id,target:fn.id,type:'routes',direction:'forward',weight:.6});}
 const dependencies={ApiController:['KnowledgeStore','OpenAiProvider','Extractor','Redactor'],OpenAiProvider:['SubscriptionAuth','Redactor'],KnowledgeStore:['Redactor','Extractor'],SubscriptionController:['SubscriptionAuth'],SubscriptionAuth:['Redactor']};for(const [a,targets]of Object.entries(dependencies))for(const b of targets)addFileEdge(java+a+'.java',java+b+'.java','depends_on','Same-package collaborator referenced by source; separate from explicit imports.');
 for(const target of ['ApiController.java','SubscriptionController.java'])addFileEdge(java+'LocalBoundary.java',java+target,'middleware','Runs before controllers to enforce local browser request boundaries.');
 for(const [source,test]of [['ApiController','ApiIntegrationTests'],['KnowledgeStore','KnowledgeTests'],['Extractor','KnowledgeTests'],['Redactor','KnowledgeTests'],['LocalBoundary','KnowledgeTests'],['OpenAiProvider','OpenAiProviderTests'],['SubscriptionAuth','SubscriptionAuthTests']])addFileEdge(java+source+'.java','backend/src/test/java/local/knowledge/'+test+'.java','tested_by','Synthetic source-level test relationship; not run in this session.');
 addFileEdge('src/main.tsx','src/api.ts','depends_on');addFileEdge('src/api.ts',api,'depends_on','Browser routes map to REST controller endpoints.');addFileEdge('src/AIConnection.tsx',sub,'depends_on','Connection dialog uses subscription routes.');addFileEdge('backend/src/main/resources/application.properties',java+'KnowledgeApplication.java','configures');addFileEdge('backend/pom.xml',java+'KnowledgeApplication.java','configures');addFileEdge('Start Runbook.cmd',java+'KnowledgeApplication.java','triggers');addFileEdge('package.json','scripts/build.mjs','configures');addFileEdge('scripts/build.mjs','src/main.tsx','depends_on');addFileEdge('index.html','src/theme-boot.js','depends_on');
}
// Canonical deduplication within each original batch; preserve every original index.
for(const frag of allFragments){const nodes=[...new Map(frag.nodes.map(n=>[n.id,n])).values()];const edges=[...new Map(frag.edges.filter(e=>e.source!==e.target).map(e=>[[e.source,e.target,e.type].join('|'),e])).values()];const nParts=Math.ceil(Math.max(nodes.length/60,edges.length/120));if(nParts<=1)write(path.join(ua,`intermediate/batch-${frag.batch.batchIndex}.json`),{nodes,edges});else{const files=frag.batch.files.map(f=>f.path).sort();const size=Math.ceil(files.length/nParts);let part=1;for(let i=0;i<files.length;i+=size){const group=new Set(files.slice(i,i+size));const ns=nodes.filter(n=>group.has(n.filePath));const ids=new Set(ns.map(n=>n.id));write(path.join(ua,`intermediate/batch-${frag.batch.batchIndex}-part-${part++}.json`),{nodes:ns,edges:edges.filter(e=>ids.has(e.source))});}}}
write(path.join(ua,'analysis-warnings.json'),warnings);
write(path.join(ua,'symbol-inventory.json'),[...extractionByFile.values()].map(r=>({path:r.path,functions:r.functions??[],classes:r.classes??[],exports:r.exports??[],metrics:r.metrics??{},callGraph:r.callGraph??[]})));
console.log(JSON.stringify({project:scan.name,files:scan.files.length,nodes:allFragments.reduce((s,x)=>s+x.nodes.length,0),edges:allFragments.reduce((s,x)=>s+x.edges.length,0),batches:batches.length,warnings:warnings.length}));
