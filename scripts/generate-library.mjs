import {writeFileSync,mkdirSync} from 'node:fs';
import {recipeSchema} from '../mcp/dist/schemas/contracts.js';
const v=(...v)=>({t:'Vector3',v}),c=(...v)=>({t:'Color3',v}),seq=(...v)=>({t:'NumberSequence',v}),colorSeq=(rgb)=>({t:'ColorSequence',v:[[0,...rgb],[1,...rgb]]});
const en=(type,name)=>({t:'EnumItem',v:[type,name]});
const cf=(x,y,z,angle=0)=>{const s=Math.sin(angle),c=Math.cos(angle);return {t:'CFrame',v:[x,y,z,c,0,s,0,1,0,-s,0,c]};};
const families={fire:[1,.27,.04],ice:[.25,.8,1],stone:[.42,.35,.28],electricity:[.65,.4,1],combat:[1,.85,.55],energy:[.25,1,.8],shadow:[.2,.08,.4],blood:[.7,.035,.05],magic:[.8,.2,1],portal:[.2,.5,1],transformation:[1,.85,.3]};
const assets=[];
for(const [family,rgb] of Object.entries(families)){
 for(const [variant,type,properties] of [
  ['burst','ParticleEmitter',{Enabled:false,Rate:0,Texture:'rbxasset://textures/particles/sparkles_main.dds',Color:colorSeq(rgb),LightEmission:.8,Speed:{t:'NumberRange',v:[8,16]},Lifetime:{t:'NumberRange',v:[.2,.55]},Size:seq([0,.45,0],[1,0,0]),Transparency:seq([0,0,0],[1,1,0]),SpreadAngle:{t:'Vector2',v:[180,180]}}],
  ['mist','ParticleEmitter',{Enabled:false,Rate:0,Texture:'rbxasset://textures/particles/smoke_main.dds',Color:colorSeq(rgb),Speed:{t:'NumberRange',v:[1,3]},Lifetime:{t:'NumberRange',v:[.6,1.2]},Size:seq([0,1,0],[1,4,0]),Transparency:seq([0,.5,0],[1,1,0])}],
  ['shard','WedgePart',{Size:v(.4,2,.6),Color:c(...rgb),Material:en('Material','Neon'),Transparency:.15,Anchored:true,CanCollide:false}],
  ['trail','Trail',{Color:colorSeq(rgb),Lifetime:.14,LightEmission:1,Transparency:seq([0,0,0],[1,1,0]),Enabled:true}],
  ['arc','Beam',{Color:colorSeq(rgb),Width0:.25,Width1:.05,LightEmission:1,FaceCamera:true}],
 ])assets.push({id:`${family}_${variant}`,name:`${family} ${variant}`,category:family,tags:[family,variant],version:'1.0.0',type,properties,resources:properties.Texture?[properties.Texture]:[],origin:'Original parameter preset; Roblox engine primitives and bundled textures',license:'Original preset parameters; bundled texture remains Roblox content',compatibility:['Arc MCP 0.1','Roblox Studio'],approval:'approved',preview:null});
}
mkdirSync('library/recipes',{recursive:true});writeFileSync('library/catalog.json',JSON.stringify(assets,null,2));
const ice={version:1,id:'ice_explosion_01',name:'Explosão congelante',duration:1.8,fps:60,objects:[],timeline:[],metadata:{author:'Original Arc MCP demonstration',license:'Original primitive composition',quality:'standard'}};
for(let i=0;i<8;i++){
 const a=i*Math.PI/4,id=`crystal_${i}`;ice.objects.push({id,name:`Crystal ${i+1}`,type:'WedgePart',preset:'ice_shard',properties:{CFrame:cf(Math.cos(a)*.8,4,Math.sin(a)*.8,a),Size:v(.12,.2,.15),Transparency:1}});
 for(const [frame,r,h,size,t] of [[0,.8,4,[.12,.2,.15],1],[12,.8,4,[.2,.5,.3],.3],[21,3,5,[.7,3,.9],.1],[55,5.5,4.2,[.4,1.6,.5],.5],[94,7,2,[.05,.1,.05],1]])ice.timeline.push({objectId:id,frame,kind:'normal',properties:{CFrame:cf(Math.cos(a)*r,h,Math.sin(a)*r,a),Size:v(...size),Transparency:t},easingStyle:frame===21?'Quint':'Sine',easingDirection:'Out'});
}
ice.objects.push({id:'mist',name:'Cold mist',type:'ParticleEmitter',preset:'ice_mist',properties:{}},{id:'shards',name:'Ice shards',type:'ParticleEmitter',preset:'ice_burst',properties:{}});
ice.timeline.push({objectId:'mist',frame:17,kind:'emit',emit:{EmitCount:20,EmitDuration:.2,EmitDelay:0},properties:{}},{objectId:'shards',frame:20,kind:'emit',emit:{EmitCount:35,EmitDuration:0,EmitDelay:0},properties:{}});
const sword={version:1,id:'sword_slash_01',name:'Corte de espada',duration:1,fps:60,objects:[],timeline:[],metadata:{author:'Original Arc MCP demonstration',license:'Original primitive composition',quality:'standard'}};
sword.objects.push({id:'blade',name:'Animated blade guide',type:'Part',properties:{Size:v(.12,.2,4),CFrame:cf(-3,5,0,-1),Color:c(1,.85,.55),Material:en('Material','Neon'),Transparency:.2,Anchored:true,CanCollide:false}},{id:'a0',name:'Blade root',type:'Attachment',parentId:'blade',properties:{Position:v(0,0,-2)}},{id:'a1',name:'Blade tip',type:'Attachment',parentId:'blade',properties:{Position:v(0,0,2)}},{id:'trail',name:'Sword trail',type:'Trail',parentId:'blade',preset:'combat_trail',properties:{Attachment0:{t:'Instance',v:'a0'},Attachment1:{t:'Instance',v:'a1'}}},{id:'sparks',name:'Impact sparks',type:'ParticleEmitter',preset:'combat_burst',properties:{}});
for(const [frame,x,z,a,t] of [[0,-3,0,-1,1],[7,-3,0,-1,.5],[13,-1,-2,-.5,0],[19,2,-1,.3,0],[25,3,1,1,.25],[40,3,1,1,1]])sword.timeline.push({objectId:'blade',frame,kind:'normal',properties:{CFrame:cf(x,5,z,a),Transparency:t},easingStyle:'Sine',easingDirection:'InOut'});
sword.timeline.push({objectId:'sparks',frame:19,kind:'emit',emit:{EmitCount:24,EmitDuration:0,EmitDelay:0},properties:{}});
for(const r of [ice,sword]){recipeSchema.parse(r);writeFileSync(`library/recipes/${r.id}.json`,JSON.stringify(r,null,2));}
console.log(`Generated ${assets.length} curated parameter presets and two validated recipes`);
