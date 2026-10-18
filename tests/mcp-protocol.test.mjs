import test from 'node:test';import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
test('Official SDK stdio discovery, local library and schema rejection',async()=>{
 const client=new Client({name:'arc-protocol-test',version:'1'});
 try{
  await client.connect(new StdioClientTransport({command:process.execPath,args:['mcp/dist/server/index.js'],cwd:process.cwd(),stderr:'inherit'}));
  const tools=await client.listTools();assert.equal(tools.tools.length,61);assert(tools.tools.every(t=>t.inputSchema.additionalProperties===false));
  const catalog=(await client.callTool({name:'vfx_list_assets',arguments:{}})).structuredContent;
  assert.equal(catalog.ok,true);const stock=JSON.parse(readFileSync('library/catalog.json','utf8'));assert.equal(stock.length,55);assert(stock.every(a=>catalog.data.assets.some(x=>x.id===a.id)));
  mkdirSync('tests/evidence',{recursive:true});writeFileSync('tests/evidence/protocol-local.json',JSON.stringify([{tool:'vfx_list_assets',args:{},result:catalog}],null,2));
  const search=(await client.callTool({name:'vfx_search_assets',arguments:{query:'ice'}})).structuredContent;assert(search.data.assets.some(a=>a.id==='ice_shard'));
  const invalid=await client.callTool({name:'vfx_create_object',arguments:{projectId:'p',name:'bad',type:'Script',properties:{}}});assert.equal(invalid.isError,true);
 }finally{await client.close();}
});
