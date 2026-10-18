local Http=game:GetService('HttpService')
local RunService=game:GetService('RunService')
local CollectionService=game:GetService('CollectionService')
local Serializer=require(script.Parent.Parent.Utility.Serializer)
local Configuration=require(script.Parent.Parent.Utility.Configuration)
local EffectTracks=require(script.Parent.Parent.Animation.EffectTracks)
local LockManager=require(script.Parent.Parent.Project.LockManager)
local HideManager=require(script.Parent.Parent.VFX.HideManager)
local Adapter={}; Adapter.__index=Adapter
local classes={Folder=true,Model=true,Part=true,WedgePart=true,MeshPart=true,SpecialMesh=true,Attachment=true,ParticleEmitter=true,Beam=true,Trail=true,PointLight=true,SpotLight=true,SurfaceLight=true,Sound=true}
local extra={Name=true,Anchored=true,CanCollide=true,CanTouch=true,CanQuery=true,CastShadow=true,Material=true,Shape=true,Texture=true,MeshId=true,TextureID=true,MeshType=true,Scale=true,Offset=true,Attachment0=true,Attachment1=true,SoundId=true,Volume=true,PlaybackSpeed=true,Looped=true,Enabled=true,Rate=true,Width0=true,Width1=true,FaceCamera=true,LightEmission=true,LightInfluence=true,Lifetime=true,MinLength=true,MaxLength=true}
local readOnly={status=true,get_capabilities=true,get_active_project=true,list_projects=true,get_project=true,list_objects=true,get_object=true,get_timeline=true,list_tracks=true,get_playback_state=true,validate=true,get_diagnostics=true,get_performance=true,export_recipe=true}
function Adapter.new(app)
 return setmetatable({app=app,session=app.projectSession,undoStack={},redoStack={},diagnostics={}},Adapter)
end
function Adapter:clearHistory()
 for _,stack in {self.undoStack,self.redoStack} do for _,c in stack do c.project:Destroy() end end
 self.undoStack={};self.redoStack={};self.historyRevision=nil
end
function Adapter:id(o)
 local id=o:GetAttribute('ArcMCPId');if not id then id=Http:GenerateGUID(false);o:SetAttribute('ArcMCPId',id) end;return id
end
function Adapter:project(id)
 local p=self.session:getActiveProject()
 assert(p and p.Parent,'NO_PROJECT: Open an Arc project')
 assert(id==self:id(p),'PROJECT_SCOPE: Active project differs from authorized projectId')
 return p
end
function Adapter:objects()
 local list={}
 local effects=self.session:getEffects()
 for _,o in effects:GetDescendants() do
  if classes[o.ClassName] and o~=effects.PrimaryPart and not o:GetAttribute('ArcHidden') then table.insert(list,o) end
 end
 for _,o in self.session.effectTracks:getTracks() do table.insert(list,o) end
 if self.session.organizer then for _,o in self.session.organizer:getRecords() do table.insert(list,o) end end
 return list
end
function Adapter:object(id)
 for _,o in self:objects() do if self:id(o)==id then return o end end
 error('OBJECT_SCOPE: Object absent from authorized project')
end
function Adapter:keyOf(o)
 if not o.Parent then return nil end
 local p=self.session:getActiveProject()
 assert(p and (o==p or o:IsDescendantOf(p)),'REFERENCE_SCOPE: Reference outside authorized project')
 return self:id(o)
end
function Adapter:codec()
 return Serializer.new(function(o) return self:keyOf(o) end,function(id) return self:object(id) end)
end
function Adapter:propertyNames(o)
 local names={};for _,n in self.session.animator.catalog:getList(o) or {} do names[n]=true end
 for n in extra do local ok=pcall(function() return o[n] end);if ok then names[n]=true end end
 return names
end
function Adapter:describe(o)
 local properties={};local codec=self:codec()
 for n in self:propertyNames(o) do
  if n~='Name' then local ok,v=self.session.animator.catalog:read(o,n)
   if ok and v~=nil then local packed=codec:encode(v);if packed then properties[n]=packed end end
  end
 end
 local p=o.Parent;local parentId=nil
 if p and p~=self.session:getEffects() then
  for _,candidate in self:objects() do if candidate==p then parentId=self:id(p);break end end
 end
 local attributes={};for n,v in o:GetAttributes() do if n~='ArcMCPId' and n~='ArcSaveKey' and n~='ArcWasUnlocked' then local packed=codec:encode(v);assert(packed,'RECIPE: Unsupported attribute type '..n);attributes[n]=packed end end
 local members=nil
 if self.session.organizer and self.session.organizer:isFolder(o) then members={};for _,member in self.session.organizer:getMembers(o) do table.insert(members,self:id(member)) end end
 return {id=self:id(o),objectId=self:id(o),name=o.Name,type=o.ClassName,parentId=parentId,properties=properties,effectType=EffectTracks.getTypeOf(o),groupMembers=members,attributes=attributes,tags=CollectionService:GetTags(o)}
end
function Adapter:decodeProperties(o,properties,animated)
 local decoded={};local codec=self:codec();local allowed=self:propertyNames(o)
 for n,packed in properties do
  assert(allowed[n] and n~='Name','PROPERTY: Unsupported property '..n)
  if animated then assert(self.session.animator.catalog:isSpatialProperty(o,n) or table.find(self.session.animator.catalog:getAnimatedNames(o),n),'PROPERTY: Arc cannot animate '..n) end
  local value=if typeof(packed)=='table' and packed.t then codec:decode(packed) else packed
  assert(value~=nil,'TYPE: Invalid encoded value for '..n)
  local readable,sample=self.session.animator.catalog:read(o,n)
  assert(readable,'PROPERTY: Cannot read '..n)
  if sample~=nil then assert(typeof(value)==typeof(sample),'TYPE: '..n..' expects '..typeof(sample)) end
  local probe=o:Clone();probe.Parent=nil
  local ok,why=self.session.animator.catalog:write(probe,n,value);probe:Destroy()
  assert(ok,'PROPERTY: '..n..': '..tostring(why))
  decoded[n]=value
 end
 return decoded
end
function Adapter:write(o,properties)
 local decoded=self:decodeProperties(o,properties,false)
 for n,v in decoded do assert(self.session.animator.catalog:write(o,n,v),'PROPERTY: Write failed '..n) end
end
function Adapter:parent(parentId,className)
 local parent=if parentId then self:object(parentId) else self.session:getEffects()
 if className=='ParticleEmitter' or className=='Attachment' then
  if not parentId then parent=self.session:getEffects().PrimaryPart end
  assert(parent:IsA('BasePart') or parent:IsA('Attachment'),'HIERARCHY: Component needs BasePart or Attachment')
 elseif className=='SpecialMesh' then assert(parent:IsA('BasePart'),'HIERARCHY: SpecialMesh needs BasePart')
 end
 return parent
end
function Adapter:refreshKeys(o)
 local a=self.session.animator
 if o then a.view:rebuildSource(o) else a.view:rebuildAll() end
 a:applyCurrentPose();a:markChanged();a:schedulePreview();self.session:ensureTimelineFits()
end
function Adapter:frame(f)
 assert(typeof(f)=='number' and f%1==0 and f>=0 and f<=self.session.timeline:getTotalFrames(),'FRAME: Outside timeline')
 return f
end
function Adapter:store(kind) local s=self.session.animator:getStores()[kind or 'normal'];assert(s,'TRACK: Unknown key kind');return s end
function Adapter:key(args)
 local o=self:object(args.objectId);local s=self:store(args.kind);local k=s:getKey(o,self:frame(args.frame));assert(k,'KEYFRAME: Key not found');return o,s,k
end
function Adapter:checkpoint()
 local p=self.session:getActiveProject();local clone
 local keys=self.session.animator:exportKeys(function(o) return self:keyOf(o) end)
 -- IDs must exist before cloning so newly created/manual objects resolve after recovery.
 for _,o in self:objects() do self:id(o) end
 self.session.animator:withRestPose(function() clone=p:Clone() end)
 LockManager.stripClone(clone);HideManager.recover(clone)
 return {project=clone,keys=keys,groups=self.session.animator:exportGroups(function(o) return self:keyOf(o) end),frame=self.session.timeline:getFrame()}
end
function Adapter:restore(point)
 local current=self.session:getActiveProject();local parent=current.Parent
 self.session:exit();current.Parent=nil
 local p=point.project:Clone();p.Parent=parent
 self.session:enter(p,nil)
 self.session.animator:importKeys(point.keys,function(id) return self:object(id) end,point.groups)
 self.session.timeline:setFrame(point.frame,true)
 current:Destroy()
end
function Adapter:summary(p)
 return {projectId=self:id(p),name=p.Name,path=p:GetFullName(),settings=self.session.timeline:getSettings(),dirty=self.session:isDirty()}
end
function Adapter:timeline()
 local out={};local codec=self:codec()
 for kind,s in self.session.animator:getStores() do
  for _,k in s:getAllKeys() do table.insert(out,{objectId=self:id(k.source),kind=kind,frame=k.frame,state=codec:encode(k.state)}) end
 end
 table.sort(out,function(a,b) if a.frame==b.frame then return a.objectId<b.objectId end return a.frame<b.frame end)
 return {settings=self.session.timeline:getSettings(),frame=self.session.timeline:getFrame(),keys=out,revision=self.session.animator:getRevision()}
end
function Adapter:recipe()
 local p=self.session:getActiveProject();local objects={}
 local effects=self.session:getEffects();local base=effects.PrimaryPart;local originGui=base and base:FindFirstChild(self.session.originLabelName)
 for _,o in effects:GetDescendants() do
  if o~=base and o~=originGui and not (originGui and o:IsDescendantOf(originGui)) then
   assert(classes[o.ClassName],'RECIPE_UNSUPPORTED: '..o.ClassName..' requires Arc save/export to preserve its data')
   assert(not o:GetAttribute('ArcHidden'),'RECIPE_UNSUPPORTED: Hidden editor objects require Arc save/export')
  end
 end
 self.session.animator:withRestPose(function()
  for _,o in self:objects() do
   local d=self:describe(o)
   d.objectId=nil;table.insert(objects,d)
  end
 end)
 local settings=self.session.timeline:getSettings()
 return {version=1,id=self:id(p),name=p.Name,duration=settings.duration,fps=settings.fps,origin=self:codec():encode(effects:GetPivot()),objects=objects,timeline={},metadata={origin='Arc MCP'},arcKeys=self.session.animator:exportKeys(function(o) return self:keyOf(o) end),arcGroups=self.session.animator:exportGroups(function(o) return self:keyOf(o) end)}
end
function Adapter:importRecipe(r)
 assert(#r.objects>0,'RECIPE: No objects')
 assert(#self:objects()==0,'RECIPE: Import requires empty project to prevent collisions')
 self.session:applyTimelineSettings(r.fps,r.duration)
 if r.origin then local pivot=self:codec():decode(r.origin);assert(typeof(pivot)=='CFrame','RECIPE: Invalid origin');self.session:getEffects():PivotTo(pivot) end
 local lookup={};local remaining=table.clone(r.objects)
 assert(self.session:rebuildStructure(function()
  while #remaining>0 do
   local progress=false
   for i=#remaining,1,-1 do
    local d=remaining[i]
    local ready=not d.parentId or lookup[d.parentId]
    for _,member in d.groupMembers or {} do if not lookup[member] then ready=false end end
    if ready then
     assert(classes[d.type],'CLASS: Not allowed')
     local o
     if d.groupMembers then
      local items={};for _,id in d.groupMembers do table.insert(items,lookup[id]) end
      o=self.session.organizer:createFolder(items,{name=d.name});assert(o,'RECIPE: Group creation failed')
     elseif d.effectType then
      assert(d.type=='Folder' and not d.parentId,'RECIPE: Invalid effect track')
      assert(EffectTracks.getDefinition(d.effectType),'RECIPE: Unknown effect type')
      o=self.session.effectTracks:add(d.effectType);assert(o,'RECIPE: Effect track failed')
     else o=Instance.new(d.type) end
     o.Name=d.name;o:SetAttribute('ArcMCPId',d.id)
     if o:IsA('BasePart') then o.Anchored=true;o.CanCollide=false end
     if not d.effectType and not d.groupMembers then o.Parent=if d.parentId then lookup[d.parentId] else self:parent(nil,d.type) end
     lookup[d.id]=o;table.remove(remaining,i);progress=true
    end
   end
   assert(progress,'RECIPE: Hierarchy cycle or missing parent')
  end
  for _,d in r.objects do
   local o=lookup[d.id];self:write(o,d.properties or {})
   for n,packed in d.attributes or {} do assert(n~='ArcMCPId' and n~='ArcSaveKey','ATTRIBUTE: Reserved name');local v=self:codec():decode(packed);assert(v~=nil,'ATTRIBUTE: Invalid value');o:SetAttribute(n,v) end
   for _,tag in d.tags or {} do CollectionService:AddTag(o,tag) end
  end
 end),'RECIPE: Structure rebuild failed')
 self.session:refreshEffectTracks()
 if r.arcKeys then
  for kind,tracks in r.arcKeys do
   assert(self.session.animator:getStores()[kind],'RECIPE: Unknown Arc store')
   for id,frames in tracks do assert(lookup[id] or id=='@master','RECIPE: Missing Arc source '..id);for f in frames do self:frame(assert(tonumber(f),'Invalid frame')) end end
  end
  self.session.animator:importKeys(r.arcKeys,function(id) return lookup[id] end,r.arcGroups)
 end
 for _,k in r.timeline do self:dispatch('add_keyframe',{projectId=self:id(self.session:getActiveProject()),objectId=k.objectId,frame=k.frame,kind=k.kind,properties=k.properties or {},emit=k.emit})
  if k.easingStyle then self:dispatch('set_easing',{projectId=self:id(self.session:getActiveProject()),objectId=k.objectId,frame=k.frame,kind=k.kind,style=k.easingStyle,direction=k.easingDirection or 'InOut',curve=k.easingCurve}) end
 end
 self:refreshKeys();return self:summary(self.session:getActiveProject())
end
function Adapter:performance()
 local result={objects=0,parts=0,emitters=0,continuousParticlesEstimate=0,beams=0,trails=0,textureReferences={},textureDimensions='unknown; Roblox does not expose source dimensions here',frameTime='not measured; use Studio MicroProfiler'}
 local textures={}
 for _,o in self:objects() do
  result.objects+=1
  if o:IsA('BasePart') then result.parts+=1 end
  if o:IsA('ParticleEmitter') then result.emitters+=1;if o.Enabled then result.continuousParticlesEstimate+=o.Rate*o.Lifetime.Max end end
  if o:IsA('Beam') then result.beams+=1 end;if o:IsA('Trail') then result.trails+=1 end
  if o:IsA('ParticleEmitter') or o:IsA('Beam') or o:IsA('Trail') then if o.Texture~='' then textures[o.Texture]=true end end
 end
 for t in textures do table.insert(result.textureReferences,t) end
 return result
end
function Adapter:dispatch(op,a)
 local app,s=self.app,self.session;local anim=s.animator
 if op=='get_capabilities' then return {version='0.1.0',engine='Arc',effectTypes=Configuration.Effects.order,objectClasses=classes,properties=Configuration.Properties,visualCapture=false,undoScope='MCP project checkpoints; manual edits remain in Arc history',recipeEffectTracks=true} end
 if op=='get_active_project' then local p=s:getActiveProject();return if p then self:summary(p) else {active=false} end
 if op=='list_projects' then
  local list={};for _,p in workspace:GetChildren() do if app.projectFactory:isProject(p) then table.insert(list,{projectId=self:id(p),name=p.Name,path=p:GetFullName()}) end end
  return {projects=list}
 end
 if op=='create_project' then
  assert(not s:isActive(),'PROJECT: Close active project first');self:clearHistory()
  local p=app.projectFactory:createEmpty(a.name,CFrame.new(0,4,0));self:id(p)
  p:SetAttribute('ArcFps',a.fps);p:SetAttribute('ArcDuration',a.duration)
  app.interface:setEnabled(true);s:enter(p,nil);s:applyTimelineSettings(a.fps,a.duration);return self:summary(p)
 end
 if op=='open_project' then
  assert(not s:isActive(),'PROJECT: Close active project first');self:clearHistory()
  for _,p in workspace:GetChildren() do if app.projectFactory:isProject(p) and self:id(p)==a.projectId then app.interface:setEnabled(true);s:enter(p,nil);return self:summary(p) end end
  error('PROJECT: Project not found')
 end
 local p=self:project(a.projectId)
 if op=='get_project' then return self:summary(p) end
 if op=='save_project' then assert(app.saveController:save(nil,false,true),'SAVE: Arc save failed');return {saved=true,projectId=self:id(p),diskPersistence='Save place in Studio'} end
 if op=='close_project' then assert(app.saveController:save(nil,false,true),'SAVE: Refusing close after save failure');s:exit();self:clearHistory();return {closed=true,projectId=self:id(p)} end
 if op=='duplicate_project' then
  assert(app.saveController:save(nil,false,true),'SAVE failed')
  local clone;anim:withRestPose(function() clone=p:Clone() end)
  clone.Name=a.name;clone:SetAttribute('ArcSaveId',nil);clone:SetAttribute('ArcMCPId',Http:GenerateGUID(false));clone.Parent=workspace
  local keys=anim:exportKeys(function(o) return self:keyOf(o) end);local groups=anim:exportGroups(function(o) return self:keyOf(o) end)
  s:exit();s:enter(clone,nil);anim:importKeys(keys,function(id) return self:object(id) end,groups);self:clearHistory();return self:summary(clone)
 end
 if op=='list_objects' then local list={};for _,o in self:objects() do table.insert(list,self:describe(o)) end;return {objects=list} end
 if op=='get_object' then return self:describe(self:object(a.objectId)) end
 local components={create_emitter='ParticleEmitter',create_beam='Beam',create_trail='Trail',create_attachment='Attachment',create_mesh='SpecialMesh',create_light='PointLight',create_sound='Sound'}
 if op=='create_object' or components[op] then
  local class=a.type or components[op];assert(classes[class],'CLASS: Not allowed')
  local host
  if op=='create_mesh' and not a.parentId then host=Instance.new('Part');host.Name=a.name..' Host';host.Anchored=true;host.CanCollide=false end
  local parent=host or self:parent(a.parentId,class);local o=Instance.new(class);o.Name=a.name
  if op=='create_mesh' then o.MeshType=Enum.MeshType.Sphere end
  if o:IsA('BasePart') then o.Anchored=true;o.CanCollide=false end
  local ok,err=pcall(function() self:write(o,a.properties or {}) end);if not ok then o:Destroy();error(err) end
  assert(s:rebuildStructure(function() if host then host.Parent=s:getEffects() end;o.Parent=parent;self:id(o) end),'STRUCTURE: Arc rebuild failed');local result=self:describe(o);if host then result.hostId=self:id(host) end;return result
 end
 if op=='set_properties' then local o=self:object(a.objectId);local values=self:decodeProperties(o,a.properties,false)
  assert(s:rebuildStructure(function() for n,v in values do assert(anim.catalog:write(o,n,v),'PROPERTY: Write failed '..n) end end),'STRUCTURE: Arc rebuild failed');return self:describe(o)
 end
 if op=='duplicate_object' then
  local source=self:object(a.objectId);assert(not EffectTracks.getTypeOf(source),'TRACK: Use create_track')
  assert(not s.organizer:isFolder(source),'GROUP: Duplicate member objects, then group them')
  self:id(source);for _,d in source:GetDescendants() do self:id(d) end
  local clone;anim:withRestPose(function() clone=source:Clone() end);clone.Name=a.name
  local copyById={[clone:GetAttribute('ArcMCPId')]=clone}
  clone:SetAttribute('ArcMCPId',nil);for _,d in clone:GetDescendants() do copyById[d:GetAttribute('ArcMCPId')]=d;d:SetAttribute('ArcMCPId',nil) end
  local copied={}
  for kind,store in anim:getStores() do for _,key in store:getAllKeys() do local target=copyById[self:id(key.source)];if target then table.insert(copied,{kind=kind,target=target,frame=key.frame,state=store:copyState(key.state)}) end end end
  assert(s:rebuildStructure(function() clone.Parent=source.Parent end),'STRUCTURE: Arc rebuild failed')
  for _,key in copied do self:store(key.kind):setKeyExact(key.target,key.frame,key.state) end
  self:refreshKeys();return self:describe(clone)
 end
 if op=='delete_object' then local o=self:object(a.objectId);assert(not EffectTracks.getTypeOf(o),'TRACK: Use delete_track');if s.organizer:isFolder(o) then assert(s.organizer:ungroup(o),'GROUP: Ungroup failed');s.effectsList:rebuild();s:markStructureChanged();return {deleted=a.objectId,membersPreserved=true} end;assert(s:rebuildStructure(function() o:Destroy() end),'STRUCTURE failed');return {deleted=a.objectId} end
 if op=='parent_object' then
  local o=self:object(a.objectId);local target=if a.parentId then self:object(a.parentId) else nil
  if target and s.organizer:isFolder(target) then assert(s.organizer:moveInto({o},target),'GROUP: Cannot move into group');s.effectsList:rebuild();s:markStructureChanged();return self:describe(o) end
  if s.organizer:isFolder(o) then assert(not target,'GROUP: Only virtual parent groups supported');assert(s.organizer:moveOut({o}),'GROUP: Cannot move out');s.effectsList:rebuild();s:markStructureChanged();return self:describe(o) end
  local parent=self:parent(a.parentId,o.ClassName);assert(parent~=o and not parent:IsDescendantOf(o),'HIERARCHY: Cycle')
  assert(s:rebuildStructure(function() o.Parent=parent end),'STRUCTURE failed');return self:describe(o)
 end
 if op=='group_objects' then
  local items={};for _,id in a.objectIds do local o=self:object(id);assert(not EffectTracks.getTypeOf(o),'TRACK cannot group');table.insert(items,o) end
  local folder=s.organizer:createFolder(items,{name=a.name});assert(folder,'GROUP: Arc rejected grouping')
  s.effectsList:rebuild();s:markStructureChanged();return self:describe(folder)
 end
 if op=='get_timeline' then return self:timeline() end
 if op=='set_duration' or op=='set_fps' then local t=s.timeline:getSettings();s:applyTimelineSettings(a.fps or t.fps,a.duration or t.duration);return self:timeline() end
 if op=='list_tracks' then local tracks={};for _,o in self:objects() do table.insert(tracks,{objectId=self:id(o),name=o.Name,effectType=EffectTracks.getTypeOf(o),keys=anim.store:countKeys(o)}) end;return {tracks=tracks} end
 if op=='create_track' then assert(EffectTracks.getDefinition(a.type),'TRACK: Unknown Arc effect type');s:addEffectTrack(a.type);local o=s.effectTracks:getTrack(a.type);assert(o,'TRACK failed');return self:describe(o) end
 if op=='delete_track' then local o=self:object(a.objectId);assert(s.effectTracks:isTrack(o),'TRACK: Not an effect track');s:removeEffectTracks({o});return {deleted=a.objectId} end
 if op=='add_keyframe' or op=='update_keyframe' then
  local o=self:object(a.objectId);local frame=self:frame(a.frame);local kind=a.kind or 'normal';local store=self:store(kind)
  if op=='update_keyframe' then assert(store:getKey(o,frame),'KEYFRAME: Missing key') end
  if kind=='effect' or kind=='event' then
   assert(s.effectTracks:isTrack(o),'TRACK: Not effect')
   local typeName=EffectTracks.getTypeOf(o);assert(EffectTracks.getStoreKind(typeName)==kind,'TRACK: Key kind differs from Arc effect store')
   local definition=EffectTracks.getDefinition(typeName);local defaults=s.effectTracks:getDefaults(typeName);local decoded={}
   for n,packed in a.properties do
    assert(table.find(definition.properties,n),'PROPERTY: Unsupported effect property '..n)
    local value=if typeof(packed)=='table' and packed.t then self:codec():decode(packed) else packed
    assert(value~=nil,'TYPE: Invalid effect value')
    if defaults[n]~=nil then assert(typeof(value)==typeof(defaults[n]),'TYPE: Effect property '..n) end
    decoded[n]=value
   end
   assert(anim:commitEffect(o,frame,decoded),'KEYFRAME: Effect rejected')
  elseif kind=='emit' then
   assert(o:IsA('ParticleEmitter') or o:IsA('Sound') or o:IsA('Beam') or o:IsA('Trail'),'EMIT: Unsupported object')
   local changes=a.emit or {};for n,v in changes do assert(({EmitCount=true,EmitDuration=true,EmitDelay=true})[n],'EMIT: Unsupported field '..n);assert(typeof(v)=='number' and v>=0,'EMIT: Nonnegative number required') end
   assert(anim:commitEdits(o,frame,changes,nil),'KEYFRAME: Emit rejected')
  else assert(kind=='normal','KEYFRAME: Use effect track for this kind');assert(not anim.store:isBlocked(o,frame),'KEYFRAME: Frame occupied by other key kind');local properties=self:decodeProperties(o,a.properties,true);assert(next(properties),'KEYFRAME: No properties');assert(anim:commitEdits(o,frame,nil,properties),'KEYFRAME: Arc rejected') end
  local key=store:getKey(o,frame);assert(key,'KEYFRAME: Arc did not create requested frame');return {objectId=self:id(o),frame=key.frame,kind=kind,state=self:codec():encode(key.state)}
 end
 if op=='delete_keyframe' then local o,store,key=self:key(a);store:removeKey(key);self:refreshKeys(o);return {deleted=true} end
 if op=='move_keyframe' then local o,store,key=self:key(a);local f=self:frame(a.toFrame);assert(not store:getKey(o,f) and not store:isBlocked(o,f),'KEYFRAME: Destination occupied');local state=store:copyState(key.state);store:removeKey(key);store:setKeyExact(o,f,state);self:refreshKeys(o);return {frame=f} end
 if op=='set_easing' then
  local o,store,key=self:key(a);assert(a.style=='Custom' or a.style=='AutoSmooth' or Enum.EasingStyle[a.style],'EASING: Unknown style')
  store:setMeta(key,'easingStyle',a.style);store:setMeta(key,'easingDirection',a.direction)
  if a.style=='Custom' then local curve=self:codec():decode(a.curve);assert(typeof(curve)=='NumberSequence','EASING: NumberSequence required');store:setMeta(key,'easingCurve',curve) end
  self:refreshKeys(o);return {updated=true}
 end
 if op=='add_event' then
  self:frame(a.frame);s:addEffectTrack('Events');local o=s.effectTracks:getTrack('Events');assert(o,'EVENT: Arc Events type unavailable');assert(anim:commitEffect(o,a.frame,{EventName=a.name}),'EVENT failed');return {objectId=self:id(o),frame=a.frame}
 end
 if op=='play' or op=='preview' then s.playback:play();assert(s.playback:isPlaying(),'PLAYBACK: Timeline has no playable keys') end
 if op=='pause' then s.playback:stop() end
 if op=='stop' then s.playback:stop();s.timeline:setFrame(0,true) end
 if op=='seek' then self:frame(a.frame);s.playback:stop();s.timeline:setFrame(a.frame,true) end
 if op=='play' or op=='preview' or op=='pause' or op=='stop' or op=='seek' or op=='get_playback_state' then return {playing=s.playback:isPlaying(),frame=s.timeline:getFrame(),fps=s.timeline:getFps()} end
 if op=='export' or op=='export_runtime' then
  s.playback:stop();app.saveController.saveManager:ensureKeys(p)
  local data=app.exportController:buildData(s:getEffects());assert(data,'EXPORT: Empty animation')
  local module=app.exportController:createModule(p,data)
  return {path=module:GetFullName(),class=module.ClassName,runtimeModules=#module:GetDescendants(),executed=false}
 end
 if op=='export_recipe' then return self:recipe() end
 if op=='import_recipe' then return self:importRecipe(a.recipe) end
 if op=='get_performance' then return self:performance() end
 if op=='get_diagnostics' then return {diagnostics=self.diagnostics} end
 if op=='validate' then
  local issues={};for _,o in self:objects() do
   if (o:IsA('Beam') or o:IsA('Trail')) and (not o.Attachment0 or not o.Attachment1) then table.insert(issues,{objectId=self:id(o),code='MISSING_ATTACHMENTS',message='Beam/Trail requires two attachments'}) end
   if o:IsA('MeshPart') and o.MeshId=='' then table.insert(issues,{objectId=self:id(o),code='EMPTY_MESH',message='MeshPart has no geometry'}) end
  end
  for _,k in self:timeline().keys do if k.frame>s.timeline:getTotalFrames() then table.insert(issues,{code='FRAME_OUTSIDE_DURATION',frame=k.frame}) end end
  return {valid=#issues==0,issues=issues,performance=self:performance()}
 end
 error('UNSUPPORTED: '..op)
end
function Adapter:execute(tool,args)
 assert(not RunService:IsRunning(),'EDIT_ONLY: Stop playtest first')
 local op=tool:gsub('^vfx_','')
 if args.projectId and self.session:isActive() and op~='open_project' then self:project(args.projectId) end
 if self.session:isActive() and self.historyRevision and self.historyRevision~=self.session.animator:getRevision() then self:clearHistory() end
 if op=='undo' or op=='redo' then
  self:project(args.projectId)
  local from=if op=='undo' then self.undoStack else self.redoStack;local to=if op=='undo' then self.redoStack else self.undoStack
  local previous=from[#from];assert(previous,'HISTORY: No MCP checkpoint (manual edits invalidate MCP history)')
  assert(previous.project:GetAttribute('ArcMCPId')==args.projectId,'HISTORY: Checkpoint belongs to another project')
  table.remove(from);table.insert(to,self:checkpoint());self:restore(previous);previous.project:Destroy();self.historyRevision=self.session.animator:getRevision();return self:summary(self.session:getActiveProject())
 end
 local transactional=not readOnly[op] and self.session:isActive() and not ({open_project=true,close_project=true,save_project=true,create_project=true,duplicate_project=true,play=true,pause=true,stop=true,seek=true,preview=true,export=true,export_runtime=true})[op]
 local before=if transactional then self:checkpoint() else nil
 local ok,result=pcall(function() return self:dispatch(op,args) end)
 if not ok then
  if before then local recovered,why=pcall(function() self:restore(before) end);before.project:Destroy();if not recovered then error('RECOVERY_FAILED: '..tostring(why)..'; original: '..tostring(result)) end end
  table.insert(self.diagnostics,{time=os.time(),tool=tool,message=tostring(result)})
  if #self.diagnostics>100 then table.remove(self.diagnostics,1) end
  error(result)
 end
 if before then
  table.insert(self.undoStack,before);for _,c in self.redoStack do c.project:Destroy() end;self.redoStack={}
  -- shortcut: 20 in-memory project checkpoints, persist recipes/saves for long-term recovery.
  if #self.undoStack>20 then table.remove(self.undoStack,1).project:Destroy() end
 end
 if self.session:isActive() then self.historyRevision=self.session.animator:getRevision() end
 return result
end
return Adapter
