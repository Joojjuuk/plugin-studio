import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { randomUUID } from 'node:crypto';
import { readFileSync,writeFileSync,readdirSync,mkdirSync } from 'node:fs';
import { schemas,recipeSchema,responseSchema,applyQuality } from '../schemas/contracts.js';
import { base,token,root,local } from '../transport/config.js';
import { join } from 'node:path';
import { z } from 'zod';
const clientId=randomUUID();
async function rpc(tool:string,args:Record<string,any>,id=args.requestId??randomUUID()):Promise<any>{
 const response=await fetch(`${base}/rpc`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({clientId,id,tool,args}),signal:AbortSignal.timeout(20000)});
 return response.json();
}
const assetSchema=z.object({id:z.string().regex(/^[a-z0-9_-]+$/),name:z.string(),category:z.string(),tags:z.array(z.string()),version:z.string(),type:z.enum(['Part','WedgePart','ParticleEmitter','Beam','Trail','PointLight','Sound','Attachment','SpecialMesh']),properties:z.record(z.string(),z.json()),resources:z.array(z.string()),origin:z.string(),license:z.string(),compatibility:z.array(z.string()),approval:z.enum(['approved','draft']),preview:z.string().nullable()}).strict();
const userPresets=new URL('presets/',local);mkdirSync(userPresets,{recursive:true});
function assets(){const stock=JSON.parse(readFileSync(join(root,'library/catalog.json'),'utf8'));const custom=readdirSync(userPresets).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(readFileSync(new URL(x,userPresets),'utf8')));return z.array(assetSchema).parse([...stock,...custom]);}
const server=new McpServer({name:'arc-vfx-mcp',version:'0.1.0'},{instructions:'Start with vfx_list_studios, explicitly vfx_connect to studioId and sessionId, then use returned projectId for edits. Never retry an uncertain mutation using a new requestId. Data-only recipes; no arbitrary code. vfx_save_project saves in the place; save the place in Studio for disk persistence.'});
for(const [tool,inputSchema] of Object.entries(schemas)){
 server.registerTool(tool,{description:`${tool.slice(4).replaceAll('_',' ')}. Arc operations require explicit Studio session and projectId. Library metadata is local. Roblox values use {t,v}; emit uses EmitCount/EmitDuration/EmitDelay.`,inputSchema,outputSchema:responseSchema},async(raw:any)=>{
  try{
   const args:Record<string,any>=inputSchema.parse(raw);let result:any;
   if(['vfx_list_assets','vfx_list_presets','vfx_search_assets'].includes(tool)){
    let list=assets();if(tool==='vfx_search_assets'){const q=args.query.toLowerCase();list=list.filter(x=>`${x.name} ${x.category} ${x.tags.join(' ')}`.toLowerCase().includes(q));}result={ok:true,data:{assets:list}};
   }else if(tool==='vfx_import_asset'||tool==='vfx_apply_preset'){
    const asset=assets().find(a=>a.id===args.assetId&&a.approval==='approved');if(!asset)throw Error('Approved asset not found');
    result=await rpc('vfx_create_object',{projectId:args.projectId,type:asset.type,name:args.name??asset.name,parentId:args.parentId,properties:{...asset.properties,...args.properties},requestId:args.requestId});
   }else if(tool==='vfx_save_preset'){
    if(!/^[a-z0-9_-]+$/.test(args.id))throw Error('Preset ID: lowercase letters, digits, underscore, hyphen');
    const found=await rpc('vfx_get_object',{projectId:args.projectId,objectId:args.objectId});if(!found.ok)result=found;
    else{const o=found.data;const asset=assetSchema.parse({id:args.id,name:args.name,category:args.category,tags:args.tags,version:'1.0.0',type:o.type,properties:o.properties,resources:[],origin:'User project; resource rights must be reviewed',license:'User-provided',compatibility:['Arc MCP 0.1'],approval:'draft',preview:null});writeFileSync(new URL(`${args.id}.json`,userPresets),JSON.stringify(asset,null,2),{flag:'wx'});result={ok:true,data:asset};}
   }else{
    if(tool==='vfx_import_recipe'){
     const recipe=applyQuality(recipeSchema.parse(args.recipe),args.quality);
     for(const o of recipe.objects){if(o.preset){const a=assets().find(x=>x.id===o.preset&&x.approval==='approved');if(!a||a.type!==o.type)throw Error(`Invalid preset ${o.preset}`);o.properties={...a.properties,...o.properties};}}
     args.recipe=recipe;
    }
    result=await rpc(tool,args);
    if(tool==='vfx_export_recipe'&&result.ok){
     const r=result.data;
     for(const o of r.objects){
      for(const field of ['properties','attributes'])if(Array.isArray(o[field])&&o[field].length===0)o[field]={};
     }
     if(Array.isArray(r.metadata)&&r.metadata.length===0)r.metadata={};
     result.data=recipeSchema.parse(r);
    }
   }
   return {isError:!result.ok,structuredContent:result,content:[{type:'text' as const,text:JSON.stringify(result)}]};
  }catch(e){const result={ok:false,error:{code:'CLIENT_ERROR',message:e instanceof Error?e.message:String(e)}};return {isError:true,structuredContent:result,content:[{type:'text' as const,text:JSON.stringify(result)}]};}
 });
}
await server.connect(new StdioServerTransport());
