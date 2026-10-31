import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const ua=process.argv[2]?path.resolve(process.argv[2]):here;
const plugin=process.env.PLUGIN_ROOT||path.resolve(ua,'../../../.agents/understand-anything-plugin');
const read=p=>JSON.parse(fs.readFileSync(path.join(ua,p),'utf8'));
const graph=read('knowledge-graph.json');
const scan=read('intermediate/scan-result.json');
const symbols=read('symbol-inventory.json');
const fingerprints=read('fingerprints.json');
const meta=read('meta.json');
const {KnowledgeGraphSchema}=await import(pathToFileURL(path.join(plugin,'packages/core/dist/schema.js')).href);
KnowledgeGraphSchema.parse(graph);
const ids=new Set(graph.nodes.map(n=>n.id));
assert.equal(ids.size,graph.nodes.length,'Node IDs unique');
assert.ok(graph.edges.every(e=>ids.has(e.source)&&ids.has(e.target)),'All edge endpoints exist');
assert.ok(graph.tour.every(s=>s.nodeIds.length&&s.nodeIds.every(id=>ids.has(id))),'Tour references valid');
assert.ok(graph.layers.every(l=>l.nodeIds.every(id=>ids.has(id))),'Layer references valid');
for(const f of scan.files){
 const node=graph.nodes.find(n=>n.filePath===f.path&&!n.lineRange);
 assert.ok(node,'File node missing: '+f.path);
 assert.equal(graph.layers.filter(l=>l.nodeIds.includes(node.id)).length,1,'File layer assignment: '+f.path);
 assert.ok(fingerprints.files[f.path],'Fingerprint missing: '+f.path);
 for(const n of graph.nodes.filter(n=>n.filePath===f.path&&n.lineRange)){assert.ok(n.lineRange[0]>=1&&n.lineRange[1]>=n.lineRange[0]&&n.lineRange[1]<=f.sizeLines,'Invalid source range '+n.id);}
}
for(const f of symbols){
 for(const [type,list]of [['function',f.functions],['class',f.classes]])for(const s of list){assert.ok(graph.nodes.some(n=>n.filePath===f.path&&n.type===type&&n.name===s.name&&n.lineRange?.[0]===s.startLine),'Parser symbol missing '+f.path+':'+s.name);}
}
assert.equal(meta.analyzedFiles,scan.files.length,'Metadata inventory count');
assert.equal(meta.gitCommitHash,graph.project.gitCommitHash,'Metadata baseline hash');
assert.equal(fingerprints.gitCommitHash,graph.project.gitCommitHash,'Fingerprint baseline hash');
assert.ok(fs.existsSync(path.join(ua,'../UNDERSTAND.md')),'Guide exists');
assert.ok(scan.files.every(f=>!/(^|\/)(?:\.env(?:\.|$)|\.local-auth|\.local-data|node_modules|knowledge-inbox|knowledge-base|\.ua)(\/|$)/i.test(f.path)),'Excluded paths absent');
console.log(JSON.stringify({valid:true,project:graph.project.name,files:scan.files.length,nodes:graph.nodes.length,edges:graph.edges.length,layers:graph.layers.length,tourSteps:graph.tour.length,parsedSymbolsCovered:true,fingerprints:Object.keys(fingerprints.files).length}));
