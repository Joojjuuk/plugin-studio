import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const client=new Client({name:'arc-demo-e2e',version:'0.1.0'});const evidence=[];mkdirSync('tests/evidence',{recursive:true});
async function call(name,args={}){const r=await client.callTool({name,arguments:args});const result=r.structuredContent??JSON.parse(r.content[0].text);evidence.push({tool:name,args,result});writeFileSync('tests/evidence/studio-demos.json',JSON.stringify(evidence,null,2));if(!result.ok)throw Error(`${name}: ${JSON.stringify(result.error)}`);console.log(name,'OK');return result.data;}
try{
 await client.connect(new StdioClientTransport({command:process.execPath,args:['mcp/dist/server/index.js'],cwd:process.cwd(),stderr:'inherit'}));
 const {studios}=await call('vfx_list_studios');const test=studios.filter(s=>s.name==='ARC_MCP_PERSISTENCE.rbxl');assert.equal(test.length,1);
 await call('vfx_connect',{studioId:test[0].studioId,sessionId:test[0].sessionId});
 const active=await call('vfx_get_active_project');if(active.projectId)await call('vfx_close_project',{projectId:active.projectId});
 const saved=JSON.parse(readFileSync('tests/evidence/smoke-state.json','utf8'));
 await call('vfx_open_project',{projectId:saved.projectId});const persisted=await call('vfx_get_timeline',{projectId:saved.projectId});assert.equal(persisted.keys.length,4,'Disk fixture lost keyframes');
 const objects=await call('vfx_list_objects',{projectId:saved.projectId});assert.equal(objects.objects.length,2);
 await call('vfx_close_project',{projectId:saved.projectId});
 const states=[];
 for(const id of ['ice_explosion_01','sword_slash_01']){
  const recipe=JSON.parse(readFileSync(`library/recipes/${id}.json`,'utf8'));
  const p=await call('vfx_create_project',{name:id,duration:recipe.duration,fps:recipe.fps});const projectId=p.projectId;
  await call('vfx_import_recipe',{projectId,recipe});const t=await call('vfx_get_timeline',{projectId});assert.equal(t.keys.length,recipe.timeline.length);
  const validation=await call('vfx_validate',{projectId});assert.equal(validation.valid,true,JSON.stringify(validation.issues));
  await call('vfx_seek',{projectId,frame:id.startsWith('ice')?21:19});
  await call('vfx_play',{projectId});await new Promise(r=>setTimeout(r,150));await call('vfx_pause',{projectId});await call('vfx_seek',{projectId,frame:id.startsWith('ice')?21:19});
  await call('vfx_save_project',{projectId});const exported=await call('vfx_export_runtime',{projectId});
  const roundtrip=await call('vfx_export_recipe',{projectId});writeFileSync(`tests/evidence/${id}-roundtrip.json`,JSON.stringify(roundtrip,null,2));
  states.push({id,projectId,export:exported,keys:t.keys.length,objects:recipe.objects.length});
  await call('vfx_close_project',{projectId});
  const copy=await call('vfx_create_project',{name:`${id}_ROUNDTRIP`,duration:recipe.duration,fps:recipe.fps});
  await call('vfx_import_recipe',{projectId:copy.projectId,recipe:roundtrip});
  const reexport=await call('vfx_export_recipe',{projectId:copy.projectId});assert.deepEqual(reexport.arcKeys,roundtrip.arcKeys,'Arc keys lost during recipe roundtrip');
  await call('vfx_save_project',{projectId:copy.projectId});await call('vfx_close_project',{projectId:copy.projectId});
 }
 await call('vfx_open_project',{projectId:states[0].projectId});await call('vfx_seek',{projectId:states[0].projectId,frame:21});
 writeFileSync('tests/evidence/demo-state.json',JSON.stringify(states,null,2));console.log('DEMOS AND DISK PERSISTENCE PASSED');
}finally{await client.close();}
