import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {makeBridge} from '../mcp/dist/transport/bridge.js';
test('Auth, explicit binding, session isolation, deduplication, timeout and delayed acknowledgement',async()=>{
 const secret='test-local-token',bridge=makeBridge(secret,100);await new Promise(r=>bridge.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${bridge.address().port}`;
 async function post(path,b,auth=secret){const r=await fetch(base+path,{method:'POST',headers:{authorization:`Bearer ${auth}`,'content-type':'application/json'},body:JSON.stringify(b)});return {status:r.status,...await r.json()};}
 const clientId=randomUUID(),studioId=randomUUID(),studio2=randomUUID();
 const rpc=(tool,args={},id=randomUUID())=>post('/rpc',{clientId,id,tool,args});
 try{
  assert.equal((await post('/hello',{},'bad')).status,401);
  const hello=await post('/hello',{studioId,name:'Isolated test',placeId:0,version:'test'});const auth={studioId,sessionId:hello.sessionId};
  const other=await post('/hello',{studioId:studio2,name:'Other',placeId:0,version:'test'});
  assert.equal((await rpc('vfx_get_active_project')).error.code,'NOT_CONNECTED');
  assert.equal((await rpc('vfx_connect',{studioId,sessionId:hello.sessionId})).ok,true);
  const id=randomUUID(),args={projectId:'allowed',name:'part',type:'Part',properties:{}};
  const first=rpc('vfx_create_object',args,id);const duplicate=rpc('vfx_create_object',args,id);
  await new Promise(r=>setTimeout(r,15));
  assert.equal((await post('/poll',{studioId:studio2,sessionId:other.sessionId})).command,undefined);
  const command=(await post('/poll',auth)).command;assert.equal(command.id,id);
  assert.equal((await post('/result',{studioId:studio2,sessionId:other.sessionId,id,ok:true,data:{}})).status,409);
  await post('/result',{...auth,id,ok:true,data:{objectId:'real-handler-would-return-this'}});
  assert.equal((await first).ok,true);assert.equal((await duplicate).data.objectId,'real-handler-would-return-this');
  assert.equal((await post('/poll',auth)).command,undefined);
  assert.equal((await rpc('vfx_create_object',{...args,name:'different'},id)).error.code,'ID_CONFLICT');
  const queued=await rpc('vfx_get_active_project');assert.equal(queued.error.outcome,'not_dispatched');
  const lateId=randomUUID(),late=rpc('vfx_get_active_project',{},lateId);await new Promise(r=>setTimeout(r,15));await post('/poll',auth);
  assert.equal((await late).error.outcome,'unknown');
  await post('/result',{...auth,id:lateId,ok:true,data:{recovered:true}});
  assert.equal((await rpc('vfx_get_active_project',{},lateId)).data.recovered,true);
 }finally{await new Promise(r=>bridge.close(r));}
});
