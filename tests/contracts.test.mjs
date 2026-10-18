import test from 'node:test';import assert from 'node:assert/strict';
import {schemas,recipeSchema,applyQuality} from '../mcp/dist/schemas/contracts.js';
test('All 61 requested tools have strict schemas',()=>{assert.equal(Object.keys(schemas).length,61);assert.throws(()=>schemas.vfx_set_properties.parse({projectId:'x',objectId:'y',properties:{},source:'return 1'}));});
test('Recipe rejects cycles, duplicate IDs, dangling references and out-of-range keys',()=>{
 const r={version:1,id:'test',name:'test',duration:1,fps:60,objects:[{id:'a',name:'A',type:'Part',properties:{}}],timeline:[],metadata:{}};
 assert(recipeSchema.safeParse(r).success);
 for(const change of [{objects:[...r.objects,...r.objects]},{objects:[{...r.objects[0],parentId:'a'}]},{timeline:[{objectId:'missing',frame:0}]},{timeline:[{objectId:'a',frame:61}]}])assert(!recipeSchema.safeParse({...r,...change}).success);
});
test('Quality profile changes author emission counts without changing Arc data',()=>{
 const r=recipeSchema.parse({version:1,id:'test',name:'test',duration:1,fps:60,objects:[{id:'a',name:'A',type:'ParticleEmitter',properties:{Rate:20}}],timeline:[{objectId:'a',frame:0,kind:'emit',emit:{EmitCount:20}}]});
 const low=applyQuality(structuredClone(r),'low');assert.equal(low.timeline[0].emit.EmitCount,10);assert.equal(low.objects[0].properties.Rate,10);
 assert.throws(()=>applyQuality({...r,arcKeys:{}},'low'));
});
