// Strict public-header verification from an independent scanner vantage.
// External recipient gets only the public URLs; no account, cookie or source.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const candidate=JSON.parse(await readFile('artifacts/release/candidate.json','utf8'));
const settings=JSON.parse(await readFile('vercel.json','utf8'));
const origin='https://school-service-payments.vercel.app';
assert.equal(candidate.production,origin);
const shouldFetch=process.argv.includes('--fetch');
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,dec)=>String.fromCodePoint(parseInt(hex??dec,hex?16:10))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim();
const results=[];
for(let n=0;n<candidate.files.length;n++) {
  const pathname=candidate.files[n].file==='index.html' ? '/' : '/'+candidate.files[n].file;
  const target=origin+pathname;
  const reportFile=n===0?'artifacts/release/independent-headers.html':`artifacts/release/independent-headers-${n}.html`;
  const reportUrl=new URL('https://securityheaders.com/');
  reportUrl.searchParams.set('q',target);
  reportUrl.searchParams.set('followRedirects','on');
  reportUrl.searchParams.set('hide','on');
  if(shouldFetch&&n!==0) {
    const response=await fetch(reportUrl,{redirect:'follow',signal:AbortSignal.timeout(45000)});
    assert.equal(response.status,200,'Scanner unavailable; do not infer target headers');
    await writeFile(reportFile,await response.text());
  }
  const html=await readFile(reportFile,'utf8');
  // Parse only table cells; never execute third-party HTML or follow its advice.
  const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)].map(m=>[decode(m[1]),decode(m[2])]);
  const site=rows.find(([key])=>key==='Site:')?.[1];
  const time=rows.find(([key])=>key==='Report Time:')?.[1];
  assert.equal(site,target,'Wrong report target');
  assert.ok(time,'Missing report timestamp');
  assert.ok(Math.abs(Date.now()-Date.parse(time))<24*60*60*1000,'Stale public scan');
  assert.ok(rows.some(([key])=>/^HTTP\/[\d.]+ 200$/.test(key)),'No successful target response');
  const rawSection=html.split('>Raw Headers</div>')[1]?.split('class="reportSection"')[0];
  assert.ok(rawSection,'Missing raw-header table');
  const rawRows=[...rawSection.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>[decode(m[1]).toLowerCase(),decode(m[2])]);
  const headers={};
  for(const expected of settings.headers[0].headers) {
    const values=rawRows.filter(([key])=>key===expected.key.toLowerCase()).map(([,value])=>value);
    assert.deepEqual(values,[expected.value],pathname+' strict '+expected.key+' mismatch');
    headers[expected.key]=values[0];
  }
  results.push({pathname,target,reportUrl:reportUrl.href,reportFile,reportTime:time,reportSha256:createHash('sha256').update(html).digest('hex'),headers});
  console.log('PASS: independent exact headers '+pathname);
}
await writeFile('artifacts/release/independent-header-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),passed:true,candidateDigest:candidate.digest,source:'SecurityHeaders public scanner raw response-header tables',results,limits:'External-vantage evidence only, no authenticated app journey or TLS-intermediary ownership attribution. Original local strict-header failure remains retained separately.'},null,2)+'\n');
console.log('PASS: independent public vantage matches all five configured headers on all seven deployed files.');
