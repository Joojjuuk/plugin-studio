local fs=require('@lune/fs');local r=require('@lune/roblox')
local place=r.deserializePlace(fs.readFile('builds/ARC_MCP_TEST.rbxl'))
local roots=r.deserializeModel(fs.readFile('builds/StudioFinal.rbxm'))
local storage,ids=nil,{}
for _,o in roots do
 if o.ClassName=='ServerStorage' then storage=o
 else o.Parent=place:GetService('Workspace');ids[o:GetAttribute('ArcSaveId')]=true end
end
assert(storage,'Missing saved data')
local saves=storage:FindFirstChild('ArcSavedProjects')
if saves then
 local destination=r.Instance.new('Folder');destination.Name=saves.Name;destination.Parent=place:GetService('ServerStorage')
 for _,slot in saves:GetChildren() do if ids[slot:GetAttribute('ArcSaveId')] then slot.Parent=destination end end
end
place:GetService('ServerStorage'):SetAttribute('ArcMCPTestPlace',true)
fs.writeFile('builds/ARC_MCP_DEMOS.rbxl',r.serializePlace(place))
print('Wrote clean demonstration place with three projects and their saves')
