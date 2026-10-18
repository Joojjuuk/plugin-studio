import {mkdirSync} from 'node:fs';import {spawnSync} from 'node:child_process';
mkdirSync('builds',{recursive:true});
// Archive only tracked extension sources; upstream, tokens and local binaries stay private.
const result=spawnSync('git',['archive','--format=zip','--output=builds/arc-vfx-mcp-source.zip','HEAD'],{stdio:'inherit'});
process.exit(result.status??1);
