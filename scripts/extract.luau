local fs = require('@lune/fs')
local roblox = require('@lune/roblox')
local serde = require('@lune/serde')
local luau = require('@lune/luau')
local function mkdir(path) if not fs.isDir(path) then fs.writeDir(path) end end
mkdir('upstream'); mkdir('upstream/arc'); mkdir('docs'); mkdir('builds')
local function scan(file, extract)
    local roots = roblox.deserializeModel(fs.readFile(file))
    local rows, scripts, lines = {}, 0, 0
    local function visit(obj, indices, names)
        local row = {indices=indices,path=names,class=obj.ClassName,name=obj.Name}
        if obj:IsA('LuaSourceContainer') then
            scripts += 1
            row.lines = select(2, obj.Source:gsub('\n','')) + 1
            lines += row.lines
            if extract then
                local path = 'upstream/arc/src/' .. names
                mkdir(path)
                row.file = path .. '/init.luau'
                fs.writeFile(row.file, obj.Source)
            else
                row.functions = {}
                for name in obj.Source:gmatch('function%s+([%w_%.:]+)%s*%(') do table.insert(row.functions,name) end
                row.licenseMentions = {}
                for line in obj.Source:gmatch('[^\n]+') do
                    if line:lower():find('license') or line:lower():find('copyright') then
                        table.insert(row.licenseMentions,line:sub(1,240))
                    end
                end
            end
        end
        table.insert(rows,row)
        for i, child in obj:GetChildren() do
            local nextIndices = table.clone(indices); table.insert(nextIndices,i)
            visit(child,nextIndices,names .. '/' .. child.Name:gsub('[<>:"/\\|%?%*]', '_'))
        end
    end
    for i,root in roots do visit(root,{i},root.Name) end
    return {source=file,instances=#rows,scripts=scripts,lines=lines,rows=rows}
end
local arc=scan('Plugin.rbxm',true)
fs.writeFile('upstream/arc/manifest.json',serde.encode('json',arc,true))
fs.writeFile('docs/vfx-studio-inventory.json',serde.encode('json',scan('../135581141962270/36372145307849/Plugin.rbxm',false),true))
print('Arc',arc.instances,arc.scripts,arc.lines)
