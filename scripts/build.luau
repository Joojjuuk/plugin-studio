local fs=require('@lune/fs')
local r=require('@lune/roblox')
local serde=require('@lune/serde')
local luau=require('@lune/luau')
local manifest=serde.decode('json',fs.readFile('upstream/arc/manifest.json'))
local roots=r.deserializeModel(fs.readFile('Plugin.rbxm'))
local count=0
for _,row in manifest.rows do
    if row.file then
        local obj=roots[row.indices[1]]
        for i=2,#row.indices do obj=obj:GetChildren()[row.indices[i]] end
        assert(obj.Name==row.name and obj.ClassName==row.class,'Upstream structure changed')
        local source=fs.readFile(row.file)
        luau.compile(source)
        obj.Source=source
        count+=1
    end
end
local root=roots[1]
local extension=r.Instance.new('Folder'); extension.Name='MCP'; extension.Parent=root.Modules
for _,name in {'Adapter','Bridge'} do
    local source=fs.readFile('plugin/src/'..name..'.luau')
    luau.compile(source)
    local module=r.Instance.new('ModuleScript'); module.Name=name; module.Source=source; module.Parent=extension
end
root.Bootstrap.Source=[[if not plugin then return end
local app = require(script.Parent.Modules.Application).new(plugin, script.Parent)
if not game:GetService('RunService'):IsRunning() then
    local bridge = require(script.Parent.Modules.MCP.Bridge).new(app)
    plugin.Unloading:Connect(function() bridge:destroy() end)
end
]]
fs.writeFile('builds/Arc.rbxm',r.serializeModel(roots))
local check=r.deserializeModel(fs.readFile('builds/Arc.rbxm'))
assert(#check[1]:GetDescendants()==#root:GetDescendants(),'Build lost instances')
print('Built Arc.rbxm; original scripts:',count,'instances:',#root:GetDescendants()+1)
local place=r.Instance.new('DataModel')
local ws=place:GetService('Workspace')
local base=r.Instance.new('Part'); base.Name='Baseplate'; base.Anchored=true; base.Size=r.Vector3.new(128,1,128); base.Position=r.Vector3.new(0,-1,0); base.Parent=ws
place:GetService('ServerStorage'):SetAttribute('ArcMCPTestPlace',true)
if not fs.isFile('builds/ARC_MCP_TEST.rbxl') then fs.writeFile('builds/ARC_MCP_TEST.rbxl',r.serializePlace(place)) end
