import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const c=new Client({name:'arc-final-preview',version:'1'}),calls=[];
async function call(name,args={}){const r=await c.callTool({name,arguments:args});const x=r.structuredContent;assert(x?.ok,JSON.stringify(x));calls.push({tool:name,args,result:x});return x.data;}
try{
 await c.connect(new StdioClientTransport({command:process.execPath,args:['mcp/dist/server/index.js'],cwd:process.cwd(),stderr:'inherit'}));
 const studios=(await call('vfx_list_studios')).studios.filter(s=>s.name==='ARC_MCP_DEMOS.rbxl');assert.equal(studios.length,1);await call('vfx_connect',{studioId:studios[0].studioId,sessionId:studios[0].sessionId});
 const active=await call('vfx_get_active_project');if(active.projectId)await call('vfx_close_project',{projectId:active.projectId});
 const projects=(await call('vfx_list_projects')).projects.filter(p=>p.name==='ice_explosion_01');assert.equal(projects.length,1);const projectId=projects[0].projectId;
 await call('vfx_open_project',{projectId});await call('vfx_seek',{projectId,frame:21});const timeline=await call('vfx_get_timeline',{projectId});assert.equal(timeline.keys.length,42);
 writeFileSync('tests/evidence/final-preview.json',JSON.stringify(calls,null,2));console.log('Final Arc preview open: ice, frame 21, 42 real keys');
}finally{await c.close();}
