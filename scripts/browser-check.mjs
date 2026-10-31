// Browser-only synthetic cloud adapter. Never shipped by build.mjs.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const mock = `
import { emptyState, today, createCharges, addPayment } from './model.js';
let state = emptyState();
state.students = ['Ari Santos', 'Bea Reyes', 'Carlo Cruz', 'Dani Ramos', 'Eli Tan', 'Fran Lim'].map((name, n) => ({ id: 'student-'+n, name, school: 'Synthetic School', route: n%2 ? 'East route' : 'West route', contact: '', fee: 300000, archived: false }));
let counter = 0;
state = createCharges(state, {period: today().slice(0,7), due: today().slice(0,7)+'-05', note: '', id: () => 'invoice-'+counter++});
state = addPayment(state, {id:'payment-1', invoiceId:'invoice-0', amount:300000, date:today(), method:'Cash', reference:'Synthetic receipt'});
state = addPayment(state, {id:'payment-2', invoiceId:'invoice-1', amount:150000, date:today(), method:'GCash', reference:'Synthetic receipt'});
let listener;
const user = {id:'synthetic-owner',email:'preview@example.test'};
export const supabase = {auth: {
onAuthStateChange(fn) { listener = fn; },
async getSession() { return {data:{session:null}}; },
async signInWithPassword() { listener('SIGNED_IN',{user}); return {data:{session:{user}}}; },
async signUp() { return {data:{session:null}}; },
async signOut() { listener('SIGNED_OUT', null); return {}; }
}};
export class LedgerStore { constructor() {this.revision=0;} async load(){return structuredClone(state);} async save(next){state=structuredClone(next);state.revision++;return structuredClone(state);} }
`;
const result = await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'esm',minify:true,plugins:[{name:'synthetic-cloud-only',setup(b){b.onResolve({filter:/^\.\/cloud\.js$/},()=>({path:'synthetic-cloud',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,resolveDir:path.resolve('src'),loader:'js'}));}}]});
await mkdir('artifacts/redesign', {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
  const context = await browser.newContext();
  await context.route('**/*', async route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='http://127.0.0.1:5173') return route.abort();
    if(url.pathname==='/src/app.js') return route.fulfill({contentType:'text/javascript',body:result.outputFiles[0].text});
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror', e=>errors.push(e.message));
  for(const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:5173');
    await page.getByRole('heading',{name:'Sign in to your ledger'}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.auth-story img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Auth horizontal overflow');
    await page.screenshot({path:'artifacts/redesign/auth-'+width+'.png',fullPage:true});
  }
  await page.getByRole('button',{name:'Show password',exact:true}).click();
  assert.equal(await page.locator('[name=password]').getAttribute('type'),'text');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Enter a valid email'}).waitFor();
  await page.getByLabel('Email address').fill('preview@example.test');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('heading',{name:'Collections overview'}).waitFor();
  for(const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    for(const route of ['dashboard','students','charges','payments','backup']) {
      await page.locator('nav a[data-view="'+route+'"]').click();
      await page.locator('main h1').waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' overflow at '+width);
      await page.screenshot({path:'artifacts/redesign/'+route+'-'+width+'.png',fullPage:true});
    }
  }
  await page.locator('nav a[data-view=students]').click();
  await page.getByRole('searchbox').fill('No matching synthetic student');
  assert.equal(await page.locator('tbody tr').count(),0);
  await page.getByRole('button',{name:'Clear search'}).click();
  assert.equal(await page.locator('tbody tr').count(),6);
  await page.getByRole('button',{name:/Add student/}).click();
  await page.locator('dialog[open]').waitFor();
  await page.screenshot({path:'artifacts/redesign/dialog-mobile.png',fullPage:true});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('nav a[data-view=dashboard]').click();
  assert.equal(await page.locator('.kpi').count(),4);
  assert.equal(errors.length,0,errors.join('\n'));
  await writeFile('artifacts/redesign/browser-results.json',JSON.stringify({passed:true,widths:[1440,768,390],screens:['auth','dashboard','students','charges','payments','backup'],checks:['synthetic sign-in','validation','password visibility','no document overflow','search and clear','dialog Escape','reduced motion','no page errors'],cloudAccess:'blocked; browser-only synthetic adapter'},null,2));
  console.log('Browser checks passed: 6 screens at 3 widths; synthetic auth, search, dialog and reduced motion. No live cloud access.');
} finally {await browser.close();}
