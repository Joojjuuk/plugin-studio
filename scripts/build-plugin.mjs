import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('builds', {recursive:true});
const result = spawnSync(process.env.LUNE ?? 'C:/tools/lune/lune.exe', ['run','scripts/build.luau'], {stdio:'inherit'});
process.exit(result.status ?? 1);
