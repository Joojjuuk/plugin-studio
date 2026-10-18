import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';
const clients=[new Client({name:'arc-isolation-a',version:'1'}),new Client({name:'arc-isolation-b',version:'1'})],evidence=[];
async function call(c,tool,args={},ok=true){const r=await c.callTool({name:tool,arguments:args});const result=r.structuredContent;evidence.push({client:clients.indexOf(c),tool,args,result});writeFileSync('tests/evidence/multi-studio.json',JSON.stringify(evidence,null,2));assert.equal(result?.ok,ok,JSON.stringify(result));return result.data;}
try{
 for(const c of clients)await c.connect(new StdioClientTransport({command:process.execPath,args:['mcp/dist/server/index.js'],cwd:process.cwd(),stderr:'inherit'}));
 const studios=(await call(clients[0],'vfx_list_studios')).studios;
 const targets=['ARC_MCP_VERIFICATION.rbxl','ARC_MCP_DEMOS.rbxl'].map(name=>{const matches=studios.filter(s=>s.name===name);assert.equal(matches.length,1,`Missing real Studio ${name}`);return matches[0];});
 assert.notEqual(targets[0].studioId,targets[1].studioId);const projects=[];
 for(let i=0;i<2;i++){const c=clients[i],s=targets[i];await call(c,'vfx_connect',{studioId:s.studioId,sessionId:s.sessionId});const active=await call(c,'vfx_get_active_project');if(active.projectId)await call(c,'vfx_close_project',{projectId:active.projectId});const p=await call(c,'vfx_create_project',{name:`ARC_MCP_ISOLATION_${i}`,fps:60,duration:1});projects.push(p);await call(c,'vfx_create_object',{projectId:p.projectId,name:`OnlyStudio${i}`,type:'Part',properties:{}});}
 for(let i=0;i<2;i++){const c=clients[i],own=projects[i],foreign=projects[1-i];const list=await call(c,'vfx_list_objects',{projectId:own.projectId});assert.equal(list.objects.length,1);assert.equal(list.objects[0].name,`OnlyStudio${i}`);await call(c,'vfx_set_properties',{projectId:foreign.projectId,objectId:list.objects[0].objectId,properties:{Transparency:1}},false);assert.equal((await call(c,'vfx_get_object',{projectId:own.projectId,objectId:list.objects[0].objectId})).properties.Transparency.v,0);await call(c,'vfx_close_project',{projectId:own.projectId});}
 console.log('TWO REAL STUDIO INSTANCES: isolated edits and foreign project rejection PASSED');
}finally{for(const c of clients)await c.close();}
