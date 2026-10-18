import { spawnSync } from 'node:child_process';
await import('../mcp/dist/transport/config.js');
const r=spawnSync(process.env.LUNE??'C:/tools/lune/lune.exe',['run','scripts/pair-local.luau'],{stdio:'inherit'});process.exit(r.status??1);
