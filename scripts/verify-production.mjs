// Read-only signed-out checks. No login, account data, mutations or bypasses.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const origin='https://school-service-payments.vercel.app';
const candidate=JSON.parse(await readFile('artifacts/release/candidate.json','utf8'));
assert.equal(candidate.production,origin);
const settings=JSON.parse(await readFile('vercel.json','utf8'));
const expectedHeaders=settings.headers[0].headers;
const results=[];
const headerMismatches=[];
for(const file of candidate.files) {
  const pathname=file.file==='index.html' ? '/' : '/'+file.file;
  const response=await fetch(origin+pathname,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,pathname+' status; stop rather than bypass protection');
  const bytes=Buffer.from(await response.arrayBuffer());
  const sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256,file.sha256,pathname+' differs from reviewed artifact');
  for(const header of expectedHeaders) {
    const observed=response.headers.get(header.key);
    if(observed!==header.value) headerMismatches.push({pathname,header:header.key,expected:header.value,observed});
  }
  results.push({pathname,status:response.status,bytes:bytes.length,sha256});
}
for(const pathname of ['/REDESIGN.md','/src/model.js','/src/config.js','/scripts/browser-check.mjs','/package.json','/artifacts/redesign-concept.png']) {
  const response=await fetch(origin+pathname,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,404,'Unexpected public source/report route: '+pathname);
  await response.body?.cancel(); results.push({pathname,status:response.status});
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
  const context=await browser.newContext();
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(origin,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Sign in to your ledger',exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.auth-story img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'artifacts/release/production-'+width+'.png',fullPage:true});
  }
  assert.equal(errors.length,0,errors.join('\n'));
} finally {await browser.close();}
await mkdir('artifacts/release',{recursive:true});
await writeFile('artifacts/release/production-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,candidateDigest:candidate.digest,passed:headerMismatches.length===0,artifactChecksPassed:true,headerChecksPassed:headerMismatches.length===0,headerMismatches,results,browser:{widths:[1440,390],signedOut:true,externalRequests:'blocked',pageErrors:errors},limits:'No live login, private ledger, account mutation, protection bypass or physical-device test. Header mismatches remain failures; no normalization or policy bypass is applied.'},null,2)+'\n');
console.log('PASS: all 7 exact reviewed static files; 6 source/report routes deny access; signed-out Chrome at 1440/390px renders artwork and fonts without page errors or horizontal overflow.');
if(headerMismatches.length) {
  console.error('OPEN: '+headerMismatches.length+' strict response-header comparisons failed. See production-checks.json. This is not a full smoke-test pass.');
  process.exitCode=1;
} else console.log('PASS: retained security headers match exactly.');
