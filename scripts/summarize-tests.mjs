import {readFileSync,writeFileSync} from 'node:fs';import {schemas} from '../mcp/dist/schemas/contracts.js';
const files=['studio-smoke.json','studio-demos.json','studio-operations.json','protocol-local.json'];
const rows=files.flatMap(file=>JSON.parse(readFileSync(`tests/evidence/${file}`,'utf8')).map(row=>({...row,file})));
const summary=Object.keys(schemas).map(tool=>({tool,passed:rows.some(r=>r.tool===tool&&r.result?.ok),sources:[...new Set(rows.filter(r=>r.tool===tool&&r.result?.ok).map(r=>r.file))]}));
writeFileSync('docs/tool-validation.json',JSON.stringify({date:'2026-10-18',registered:summary.length,exercised:summary.filter(x=>x.passed).length,meaning:'At least one successful execution; not exhaustive coverage of every parameter combination.',tools:summary},null,2));
if(summary.some(s=>!s.passed))throw Error('Unexercised tools: '+summary.filter(s=>!s.passed).map(s=>s.tool).join(', '));
console.log(`${summary.length} tools exercised; see evidence for independent state assertions`);
