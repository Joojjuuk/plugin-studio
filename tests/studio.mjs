import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const client=new Client({name:'arc-studio-e2e',version:'0.1.0'});
const transport=new StdioClientTransport({command:process.execPath,args:['mcp/dist/server/index.js'],cwd:process.cwd(),stderr:'inherit'});
const evidence=[];mkdirSync('tests/evidence',{recursive:true});
async function call(name,args={}){const start=Date.now();const r=await client.callTool({name,arguments:args});const data=r.structuredContent??JSON.parse(r.content[0].text);evidence.push({tool:name,args,result:data,elapsedMs:Date.now()-start});writeFileSync('tests/evidence/studio-smoke.json',JSON.stringify(evidence,null,2));if(!data.ok)throw Error(`${name}: ${JSON.stringify(data.error)}`);console.log(name,'OK');return data.data;}
try{
 await client.connect(transport);const tools=await client.listTools();assert.equal(tools.tools.length,61);
 const {studios}=await call('vfx_list_studios');const test=studios.filter(x=>x.name==='ARC_MCP_TEST.rbxl');assert.equal(test.length,1,'Exactly one isolated test Studio');
 await call('vfx_connect',{studioId:test[0].studioId,sessionId:test[0].sessionId});
 const cap=await call('vfx_get_capabilities');assert.equal(cap.engine,'Arc');
 const active=await call('vfx_get_active_project');const project=active.projectId?active:await call('vfx_create_project',{name:'ARC_MCP_TEST',duration:2,fps:60});const projectId=project.projectId;
 const o=await call('vfx_create_object',{projectId,name:'AnimatedIce',type:'WedgePart',properties:{Anchored:true,CanCollide:false,Color:{t:'Color3',v:[.3,.8,1]},Material:{t:'EnumItem',v:['Material','Neon']}}});
 for(const [frame,x,size,t] of [[0,0,1,1],[30,5,3,.1],[90,10,.2,1]])await call('vfx_add_keyframe',{projectId,objectId:o.objectId,frame,properties:{CFrame:{t:'CFrame',v:[x,5,0,1,0,0,0,1,0,0,0,1]},Size:{t:'Vector3',v:[size,size*2,size]},Transparency:t}});
 await call('vfx_set_easing',{projectId,objectId:o.objectId,frame:0,style:'Sine',direction:'Out'});
 const emitter=await call('vfx_create_emitter',{projectId,name:'IceBurst',properties:{Enabled:false,Rate:0,Texture:'rbxasset://textures/particles/sparkles_main.dds'}});
 await call('vfx_add_keyframe',{projectId,objectId:emitter.objectId,frame:20,kind:'emit',emit:{EmitCount:25,EmitDuration:0,EmitDelay:0}});
 const timeline=await call('vfx_get_timeline',{projectId});assert.equal(timeline.keys.filter(k=>k.objectId===o.objectId).length,3);
 await call('vfx_seek',{projectId,frame:30});const posed=await call('vfx_get_object',{projectId,objectId:o.objectId});assert(Math.abs(posed.properties.Transparency.v-.1)<1e-5);
 await call('vfx_play',{projectId});await new Promise(r=>setTimeout(r,200));const pause=await call('vfx_pause',{projectId});assert.equal(pause.playing,false);assert(pause.frame>30);
 await call('vfx_stop',{projectId});await call('vfx_save_project',{projectId});await call('vfx_close_project',{projectId});await call('vfx_open_project',{projectId});
 const reopened=await call('vfx_get_timeline',{projectId});assert.equal(reopened.keys.length,timeline.keys.length);
 const out=await call('vfx_export',{projectId});assert(out.runtimeModules>0);
 const recipe=await call('vfx_export_recipe',{projectId});writeFileSync('tests/evidence/smoke-recipe.json',JSON.stringify(recipe,null,2));
 await call('vfx_validate',{projectId});
 writeFileSync('tests/evidence/smoke-state.json',JSON.stringify({projectId,objectId:o.objectId,emitterId:emitter.objectId,export:out},null,2));
 console.log('STUDIO SMOKE PASSED; UI and runtime still require independent checks');
}finally{await client.close();}
