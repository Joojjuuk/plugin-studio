import { createServer,IncomingMessage } from 'node:http';
import { randomUUID,timingSafeEqual } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { schemas } from '../schemas/contracts.js';
import { token,port,local } from './config.js';
type Command={id:string;clientId:string;tool:string;args:Record<string,any>;projectId?:string;deadline:number};
type Studio={studioId:string;sessionId:string;name:string;placeId:number;version:string;lastSeen:number;queue:Command[];inflight?:Command};
type Result={ok:boolean;data?:unknown;error?:{code:string;message:string;outcome?:string}};
type Pending={fingerprint:string;command:Command;result?:Result;resolve:(v:Result)=>void;promise:Promise<Result>;timer:NodeJS.Timeout};
const fail=(code:string,message:string,outcome?:string):Result=>({ok:false,error:{code,message,...(outcome?{outcome}:{})}});
export function makeBridge(secret=token,timeout=15000){
 const studios=new Map<string,Studio>(),bindings=new Map<string,{studioId:string;sessionId:string}>(),pending=new Map<string,Pending>();
 const log=(event:string,data:unknown)=>appendFileSync(new URL('bridge.jsonl',local),JSON.stringify({time:new Date().toISOString(),event,data})+'\n');
 function finish(p:Pending,result:Result){clearTimeout(p.timer);p.result=result;p.resolve(result);log('result',{id:p.command.id,tool:p.command.tool,ok:result.ok});}
 const auth=z.object({studioId:z.string(),sessionId:z.string()});
 async function body(req:IncomingMessage){req.setEncoding('utf8');let text='';for await(const c of req){text+=c;if(Buffer.byteLength(text)>2*1024*1024)throw Error('Body exceeds 2 MiB');}return JSON.parse(text||'{}');}
 const server=createServer(async(req,res)=>{
  const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   const got=Buffer.from(req.headers.authorization??''),expected=Buffer.from(`Bearer ${secret}`);
   if(req.headers.origin||got.length!==expected.length||!timingSafeEqual(got,expected)){send(401,fail('UNAUTHORIZED','Local token required; browser origins refused'));return;}
   if(req.method!=='POST'){send(405,fail('METHOD','POST required'));return;}
   const b=await body(req);
   if(req.url==='/hello'){
    const h=z.object({studioId:z.string().uuid(),name:z.string().max(100),placeId:z.number(),version:z.string().max(50)}).strict().parse(b);
    const old=studios.get(h.studioId);if(old?.inflight){send(409,fail('BUSY','Previous session operation unresolved'));return;}
    const s:Studio={...h,sessionId:randomUUID(),lastSeen:Date.now(),queue:[]};studios.set(s.studioId,s);log('hello',{studioId:s.studioId,name:s.name});send(200,{sessionId:s.sessionId});return;
   }
   if(req.url==='/poll'||req.url==='/result'){
    const a=auth.parse(b),s=studios.get(a.studioId);if(!s||s.sessionId!==a.sessionId){send(409,fail('STALE_SESSION','Register again'));return;}s.lastSeen=Date.now();
    if(req.url==='/poll'){
     if(s.inflight){send(200,{});return;}
     const c=s.queue.shift();if(c&&c.deadline>Date.now()){s.inflight=c;log('dispatch',{id:c.id,studioId:s.studioId});send(200,{command:c});}else send(200,{});return;
    }
    const result=z.object({id:z.string().uuid(),ok:z.boolean(),data:z.json().optional(),error:z.object({code:z.string(),message:z.string(),outcome:z.string().optional()}).optional()}).parse(b);
    const p=pending.get(result.id);if(!p||s.inflight?.id!==result.id){send(409,fail('UNKNOWN_COMMAND','Response not assigned to this session'));return;}
    s.inflight=undefined;finish(p,result);send(200,{ack:result.id});return;
   }
   if(req.url!=='/rpc'){send(404,fail('ROUTE','Unknown route'));return;}
   const call=z.object({clientId:z.string().uuid(),id:z.string().uuid(),tool:z.string(),args:z.record(z.string(),z.json())}).strict().parse(b);
   const schema=schemas[call.tool];if(!schema){send(400,fail('TOOL','Unknown tool'));return;}
   const args:Record<string,any>=schema.parse(call.args),fingerprint=JSON.stringify({clientId:call.clientId,tool:call.tool,args});
   const existing=pending.get(call.id);if(existing){if(existing.fingerprint!==fingerprint){send(409,fail('ID_CONFLICT','Request ID reused with different arguments'));return;}send(200,existing.result??await existing.promise);return;}
   const live=[...studios.values()].filter(s=>Date.now()-s.lastSeen<10000);
   if(call.tool==='vfx_status'||call.tool==='vfx_list_studios'){send(200,{ok:true,data:{version:'0.1.0',studios:live.map(({queue,inflight,...s})=>({...s,busy:!!inflight})),boundStudioId:bindings.get(call.clientId)?.studioId??null}});return;}
   if(call.tool==='vfx_connect'){const s=studios.get(args.studioId);if(!s||!live.includes(s)||s.sessionId!==args.sessionId){send(409,fail('STUDIO_OFFLINE','Studio/session not live'));return;}bindings.set(call.clientId,{studioId:s.studioId,sessionId:s.sessionId});send(200,{ok:true,data:{studioId:s.studioId,sessionId:s.sessionId}});return;}
   if(call.tool==='vfx_disconnect'){bindings.delete(call.clientId);send(200,{ok:true,data:{disconnected:true}});return;}
   const binding=bindings.get(call.clientId),studioId=binding?.studioId,s=studioId?studios.get(studioId):undefined;
   if(!s||!live.includes(s)||s.sessionId!==binding?.sessionId){send(409,fail('NOT_CONNECTED','Explicitly connect to a live Studio session'));return;}
   if(pending.size>=4096){send(503,fail('CAPACITY','Restart bridge after resolving pending operations'));return;}
   const command:Command={id:call.id,clientId:call.clientId,tool:call.tool,args,projectId:args.projectId,deadline:Date.now()+timeout};
   let resolve!:(v:Result)=>void;const promise=new Promise<Result>(r=>resolve=r);
   const p:Pending={command,fingerprint,promise,resolve,timer:setTimeout(()=>{s.queue=s.queue.filter(c=>c.id!==call.id);finish(p,fail('TIMEOUT','Query same request ID before retrying',s.inflight?.id===call.id?'unknown':'not_dispatched'));},timeout)};
   pending.set(call.id,p);s.queue.push(command);log('queued',{id:call.id,tool:call.tool,studioId});send(200,await promise);
  }catch(e){send(400,fail('INVALID_REQUEST',e instanceof Error?e.message:String(e)));}
 });
 server.on('close',()=>{for(const p of pending.values())if(!p.result)finish(p,fail('SHUTDOWN','Bridge closed','unknown'));});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)makeBridge().listen(port,'127.0.0.1',()=>console.error(`Arc bridge: 127.0.0.1:${port}`));
