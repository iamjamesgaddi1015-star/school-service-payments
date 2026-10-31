// Stage only the reviewed static output, never a checkout, env files or reports.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const expected = {
  'index.html': 'adcbd78042ee93988e794a30d7fbe6725881dcfccc56a5739e5113aa5e8b30f1',
  'src/app.js': 'fe877b260f76f7f57f3bea58bd889c1a154300915367cefe8d82a6ead6d30d8f',
  'src/styles.css': '73b3e66214f364b64af43706a8cc807bcaaec1997f6bb0690f1f986a937978e8',
  'assets/school-route.png': '1b206b1d21e909e300df061526a647665d6611478356975f59b4484af4766a7c',
  'assets/instrument-sans-latin-400-normal.woff2': '9a91efaa3599a6ef01b2f49e9ec670e3a2f39baeef09c73198f1052cf3bb0850',
  'assets/instrument-sans-latin-600-normal.woff2': 'efb770916eda95a0e31d80cccde9651d4e8617010b21220e9f227c4820d675da',
  'assets/FONT-LICENSE.txt': 'c27a3c53c3beed7f5c26853afa15991478ff7145d3754a36b0382f84e10c0d03',
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function files(dir, prefix='') {
  const entries = await readdir(dir, {withFileTypes:true});
  const result=[];
  for(const e of entries) {
    assert.ok(!e.isSymbolicLink(), 'No symlinks allowed');
    const name=prefix+e.name;
    if(e.isDirectory()) result.push(...await files(path.join(dir,e.name), name+'/'));
    else { assert.ok(e.isFile()); result.push(name); }
  }
  return result.sort();
}
assert.deepEqual(await files('dist'), Object.keys(expected).sort(), 'Unexpected static output');
const buffers=new Map();
const manifest=[];
for(const [file,sha256] of Object.entries(expected)) {
  const bytes=await readFile(path.join('dist',file));
  assert.equal(hash(bytes),sha256,'Reviewed artifact changed: '+file);
  buffers.set(file,bytes); manifest.push({file,bytes:bytes.length,sha256});
}
const settings=JSON.parse(await readFile('vercel.json','utf8'));
assert.equal(settings.headers.length,1);
assert.equal(settings.headers[0].source,'/(.*)');
const headers=Object.fromEntries(settings.headers[0].headers.map(h=>[h.key,h.value]));
const config={version:3,routes:[{src:'/(.*)',headers,continue:true},{src:'^/$',dest:'/index.html'},{handle:'filesystem'}]};
const configText=JSON.stringify(config,null,2)+'\n';
const digest=hash(JSON.stringify(manifest)+'\n'+configText);
const stage=path.join('.release-candidate',digest.slice(0,16));
const output=path.join(stage,'.vercel','output');
await mkdir(output,{recursive:true});
for(const [file,bytes] of buffers) {
  const target=path.join(output,'static',file);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,bytes);
}
await writeFile(path.join(output,'config.json'),configText);
assert.deepEqual(await files(output), ['config.json',...Object.keys(expected).map(f=>'static/'+f)].sort());
await mkdir('artifacts/release',{recursive:true});
await writeFile('artifacts/release/candidate.json',JSON.stringify({digest,stage,projectId:'prj_KtMN7EL6MWSDgv7d10PtdEpgwuJK',production:'https://school-service-payments.vercel.app',headersConfigSha256:hash(configText),files:manifest},null,2)+'\n');
console.log(JSON.stringify({digest,stage,files:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0),status:'Staged reviewed static build; no deployment performed'}));
