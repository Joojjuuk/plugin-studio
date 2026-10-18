local fs=require('@lune/fs');local r=require('@lune/roblox')
local place=r.deserializePlace(fs.readFile('builds/ARC_MCP_TEST.rbxl'))
local process=require('@lune/process')
local roots=r.deserializeModel(fs.readFile(process.env.ARC_FIXTURE_MODEL or 'builds/StudioPersistence.rbxm'))
for _,o in roots do
 if o.ClassName=='ServerStorage' then
  for _,child in o:GetChildren() do child.Parent=place:GetService('ServerStorage') end
 else o.Parent=place:GetService('Workspace') end
end
fs.writeFile(process.env.ARC_FIXTURE_OUTPUT or 'builds/ARC_MCP_PERSISTENCE.rbxl',r.serializePlace(place))
print('Saved independent disk-persistence fixture')
