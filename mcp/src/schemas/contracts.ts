import { z } from 'zod';
const id=z.string().min(1).max(160);
const name=z.string().trim().min(1).max(100);
const frame=z.number().int().nonnegative();
const props=z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/),z.json());
export const classes=['Folder','Model','Part','WedgePart','MeshPart','SpecialMesh','Attachment','ParticleEmitter','Beam','Trail','PointLight','SpotLight','SurfaceLight','Sound'] as const;
const object=z.object({id,name,type:z.enum(classes),parentId:id.optional(),properties:props.default({}),preset:id.optional(),effectType:z.string().optional(),groupMembers:z.array(id).optional(),attributes:props.optional(),tags:z.array(z.string()).optional()}).strict();
const key=z.object({objectId:id,frame,kind:z.enum(['normal','emit','effect','event']).default('normal'),properties:props.default({}),emit:z.record(z.string(),z.json()).optional(),easingStyle:z.string().optional(),easingDirection:z.enum(['In','Out','InOut']).optional(),easingCurve:z.json().optional()}).strict();
export const recipeSchema=z.object({version:z.literal(1),id,name,duration:z.number().positive(),fps:z.number().int().min(1).max(240),origin:z.json().optional(),objects:z.array(object),timeline:z.array(key),metadata:z.record(z.string(),z.json()).default({}),arcKeys:z.json().optional(),arcGroups:z.json().optional()}).strict().superRefine((r,ctx)=>{
 const ids=new Set<string>();
 for(const o of r.objects){if(ids.has(o.id))ctx.addIssue({code:'custom',message:`Duplicate object ${o.id}`}); ids.add(o.id);}
 for(const o of r.objects){if(o.parentId&&!ids.has(o.parentId))ctx.addIssue({code:'custom',message:`Unknown parent ${o.parentId}`});let p=o.parentId;const seen=new Set([o.id]);while(p){if(seen.has(p)){ctx.addIssue({code:'custom',message:'Hierarchy cycle'});break;}seen.add(p);p=r.objects.find(x=>x.id===p)?.parentId;}}
 for(const k of r.timeline){if(!ids.has(k.objectId))ctx.addIssue({code:'custom',message:`Unknown object ${k.objectId}`});if(k.frame>Math.round(r.duration*r.fps))ctx.addIssue({code:'custom',message:'Key outside duration'});}
});
export const schemas:Record<string,z.ZodObject<any>>={};
function add(names:string[],shape:z.ZodRawShape={}){for(const n of names)schemas[`vfx_${n}`]=z.object(shape).strict();}
const project={projectId:id};
const obj={...project,objectId:id};
const at={...obj,frame,kind:z.enum(['normal','emit','effect','event','global','master','debris']).default('normal')};
add(['status','list_studios','disconnect','get_capabilities','get_active_project','list_projects','list_assets','list_presets']);
add(['connect'],{studioId:id,sessionId:id});
add(['create_project'],{name,duration:z.number().positive().default(2),fps:z.number().int().min(1).max(240).default(60)});
add(['open_project','get_project','save_project','close_project','list_objects','get_timeline','list_tracks','preview','play','pause','stop','get_playback_state','validate','get_diagnostics','export','export_runtime','get_performance','undo','redo','export_recipe'],project);
add(['duplicate_project'],{...project,name});
add(['get_object','delete_object'],obj);
add(['create_object'],{...project,type:z.enum(classes),name,parentId:id.optional(),properties:props.default({})});
for(const c of ['emitter','beam','trail','attachment','mesh','light','sound'])add([`create_${c}`],{...project,name,parentId:id.optional(),properties:props.default({})});
add(['duplicate_object'],{...obj,name});
add(['set_properties'],{...obj,properties:props});
add(['parent_object'],{...obj,parentId:id.optional()});
add(['group_objects'],{...project,objectIds:z.array(id).min(1),name});
add(['set_duration'],{...project,duration:z.number().positive()});
add(['set_fps'],{...project,fps:z.number().int().min(1).max(240)});
add(['create_track'],{...project,type:z.string().min(1)});
add(['delete_track'],obj);
add(['add_keyframe','update_keyframe'],{...at,properties:props.default({}),emit:z.record(z.string(),z.json()).optional()});
add(['delete_keyframe'],at);
add(['move_keyframe'],{...at,toFrame:frame});
add(['set_easing'],{...at,style:z.string(),direction:z.enum(['In','Out','InOut']).default('InOut'),curve:z.json().optional()});
add(['add_event'],{...project,frame,name});
add(['seek'],{...project,frame});
add(['search_assets'],{query:z.string()});
add(['import_asset','apply_preset'],{...project,assetId:id,name:name.optional(),parentId:id.optional(),properties:props.default({})});
add(['save_preset'],{...obj,id,name,category:name,tags:z.array(z.string()).default([])});
add(['import_recipe'],{...project,recipe:recipeSchema,quality:z.enum(['low','standard','high']).default('standard')});
for(const n of Object.keys(schemas)) schemas[n]=schemas[n].extend({requestId:z.string().uuid().optional()});
export const responseSchema=z.object({ok:z.boolean(),id:z.string().optional(),data:z.json().optional(),error:z.object({code:z.string(),message:z.string(),outcome:z.string().optional()}).optional()}).strict();
export function applyQuality(recipe:z.infer<typeof recipeSchema>,quality:'low'|'standard'|'high'){
 if(quality==='standard')return recipe;
 if(recipe.arcKeys)throw Error('Quality variants require declarative timeline; Arc key data must remain unchanged');
 const multiplier=quality==='low'?0.5:1.5;
 for(const k of recipe.timeline)if(k.emit&&typeof k.emit.EmitCount==='number')k.emit.EmitCount=Math.round(k.emit.EmitCount*multiplier);
 for(const o of recipe.objects)if(o.type==='ParticleEmitter'&&typeof o.properties.Rate==='number')o.properties.Rate*=multiplier;
 recipe.metadata.quality=quality;
 return recipe;
}
