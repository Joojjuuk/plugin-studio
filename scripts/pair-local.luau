local fs=require('@lune/fs');local r=require('@lune/roblox')
local roots=r.deserializeModel(fs.readFile('builds/Arc.rbxm'))
local process=require('@lune/process')
local pairing=r.Instance.new('ModuleScript');pairing.Name='LocalPairing';pairing.Source='return {token='..string.format('%q',fs.readFile('.local/token'))..',autoConnectTest='..tostring(process.env.ARC_MCP_TEST_PAIR=='1')..'}';pairing.Parent=roots[1].Modules.MCP
fs.writeFile('.local/Arc-MCP-Local.rbxm',r.serializeModel(roots))
print('Local pairing build ready (token stays local)')
