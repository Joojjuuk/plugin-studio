local Http=game:GetService('HttpService')
local RunService=game:GetService('RunService')
local Adapter=require(script.Parent.Adapter)
local Bridge={};Bridge.__index=Bridge
function Bridge.new(app)
 local self=setmetatable({app=app,adapter=Adapter.new(app),studioId=Http:GenerateGUID(false),sessionId=nil,running=false,alive=true,cache={},pending=nil},Bridge)
 local info=DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float,false,false,380,200,300,180)
 self.widget=app.plugin:CreateDockWidgetPluginGuiAsync('ArcMCPLocalBridge',info);self.widget.Title='Arc MCP — Local connection'
 local label=Instance.new('TextLabel');label.Size=UDim2.new(1,-16,0,65);label.Position=UDim2.fromOffset(8,4);label.TextWrapped=true;label.BackgroundTransparency=1;label.Text='Local bridge: 127.0.0.1:41573\nPaste local token, then Connect. Edits target selected Arc project.';label.Parent=self.widget;self.label=label
 local input=Instance.new('TextBox');input.Size=UDim2.new(1,-16,0,35);input.Position=UDim2.fromOffset(8,75);input.PlaceholderText='Local token (.local/token)';input.ClearTextOnFocus=false;input.Text='';input.Parent=self.widget;self.input=input
 local pair=script.Parent:FindFirstChild('LocalPairing')
 if pair then
  local config=require(pair);input.Text=config.token
  if config.autoConnectTest and game:GetService('ServerStorage'):GetAttribute('ArcMCPTestPlace')==true then
   self:connect(config.token)
  end
 end
 local button=Instance.new('TextButton');button.Size=UDim2.new(1,-16,0,35);button.Position=UDim2.fromOffset(8,120);button.Text='Connect / Disconnect';button.Parent=self.widget
 self.buttonConnection=button.MouseButton1Click:Connect(function() if self.running then self:disconnect() else self:connect(input.Text) end end)
 self.toolbarButton=app.toolbar:CreateButton('MCP','Configure local MCP connection','');self.toolbarButton.ClickableWhenViewportHidden=true
 self.toolbarConnection=self.toolbarButton.Click:Connect(function() self.widget.Enabled=not self.widget.Enabled end)
 task.spawn(function() self:loop() end)
 return self
end
function Bridge:request(path,body)
 local response=Http:RequestAsync({Url='http://127.0.0.1:41573'..path,Method='POST',Headers={['Content-Type']='application/json',Authorization='Bearer '..self.token},Body=Http:JSONEncode(body)})
 if response.StatusCode==409 then
  local ok,decoded=pcall(function() return Http:JSONDecode(response.Body) end)
  if ok and decoded.error and decoded.error.code=='STALE_SESSION' and not self.pending then self.sessionId=nil end
  if ok and decoded.error and decoded.error.code=='UNKNOWN_COMMAND' and self.pending then
   self.running=false
   error('RECOVERY_REQUIRED: Bridge lost pending operation. Inspect project before reconnecting; command will not be re-executed.')
  end
 end
 assert(response.Success,'HTTP '..response.StatusCode..': '..response.Body)
 return Http:JSONDecode(response.Body)
end
function Bridge:connect(token)
 assert(typeof(token)=='string' and #token>=32,'Invalid local token')
 self.token=token;self.running=true;self.sessionId=nil;self.label.Text='Connecting to local bridge…'
end
function Bridge:disconnect()
 self.running=false;self.label.Text='Disconnected. Pending results retained until reconnect.'
end
function Bridge:cycle()
 if not self.sessionId then
  local hello=self:request('/hello',{studioId=self.studioId,name=game.Name,placeId=game.PlaceId,version='0.1.0'})
  self.sessionId=hello.sessionId;self.label.Text='Connected: '..self.studioId
 end
 local auth={studioId=self.studioId,sessionId=self.sessionId}
 if self.pending then
  local result=table.clone(self.pending);result.studioId=self.studioId;result.sessionId=self.sessionId
  local ack=self:request('/result',result);assert(ack.ack==result.id,'Result not acknowledged');self.pending=nil
 end
 local response=self:request('/poll',auth);local command=response.command
 if command then
  local prior=self.cache[command.id]
  if prior then self.pending=prior;return end
  local ok,data=pcall(function()
   assert(not RunService:IsRunning(),'EDIT_ONLY: Stop playtest first')
   assert(DateTime.now().UnixTimestampMillis<=command.deadline,'EXPIRED: Request expired before execution')
   return self.adapter:execute(command.tool,command.args)
  end)
  local result=if ok then {id=command.id,ok=true,data=data} else {id=command.id,ok=false,error={code='ARC_ERROR',message=tostring(data)}}
  -- Encode before acknowledging execution; unsupported values are explicit errors.
  local encodable=pcall(function() Http:JSONEncode(result) end)
  if not encodable then result={id=command.id,ok=false,error={code='RESULT_ENCODING',message='Operation ran but result cannot be serialized',outcome='unknown'}} end
  self.cache[command.id]=result;self.pending=result
 end
end
function Bridge:loop()
 while self.alive do
  if self.running then
   local ok,err=pcall(function() self:cycle() end)
   if not ok then self.label.Text=tostring(err):sub(1,250);task.wait(2) end
  end
  task.wait(0.25)
 end
end
function Bridge:destroy()
 self.alive=false;self.running=false;self.buttonConnection:Disconnect();self.toolbarConnection:Disconnect();self.widget:Destroy()
end
return Bridge
