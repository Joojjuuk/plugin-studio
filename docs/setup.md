# Build, instalação e clientes

Requisitos usados: Windows 11, Node 22.23.1, Lune 0.10.5 e Roblox Studio 0.743. Rojo 7.7.1 estava disponível, mas não é necessário para este build. O lockfile fixa dependências Node. Não foi instalada nenhuma ferramenta global adicional.

Execute `npm ci`, forneça `Plugin.rbxm`, rode `lune run scripts/extract.luau` e depois `npm run build`. A extração grava fontes `.luau` pela hierarquia e um manifest; o RBXM original mantém templates, GUI, metadados e recursos. `scripts/audit.mjs` gera índices e hashes. `scripts/generate-contracts.mjs` atualiza schemas. `scripts/generate-library.mjs` reconstrói presets e duas receitas.

`npm run build:mcp` compila TypeScript. `npm run typecheck` verifica tipos. O build do plugin compila todas as fontes Luau e reabre o RBXM gerado para conferir a estrutura. Isso não substitui testes no Studio.

`npm run install:local` gera uma versão privada com token e copia somente a extensão para a pasta local de plugins. Um arquivo anterior desta extensão recebe backup com timestamp. Se o diretório de plugins do Studio foi personalizado, passe `-PluginDirectory` ao script PowerShell. Abra/reabra o lugar isolado para carregar a nova versão. A pasta importada em ServerStorage não executa o plugin.

O fluxo normal começa desconectado. Abra Arc → MCP → Connect. A extensão deve receber permissão HTTP para localhost pela interface suportada do Studio, caso solicitada. Não alteramos configurações de segurança por automação. O teste local usou uma variante explicitamente pareada com `ARC_MCP_TEST_PAIR=1`; ela só conecta automaticamente quando ServerStorage tem `ArcMCPTestPlace=true`. Não use essa variante em jogos de produção.

Inicie `npm run bridge` uma única vez. Cada cliente inicia seu próprio `node mcp/dist/server/index.js`. A porta do plugin é fixa em 41573; mantenha esse padrão. `ARC_MCP_PORT` existe para testes do lado Node, mas mudar somente esse valor não reconfigura o plugin.

## Codex

Foi criado `.codex/config.toml` de projeto, sem modificar a configuração global. O Codex aceita configurações MCP de projeto quando o projeto é confiável, conforme [documentação oficial](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Abra este diretório como projeto e reinicie a conexão MCP. A sessão atual não recebe novas ferramentas dinamicamente só porque o arquivo foi criado.

```toml
[mcp_servers.arc_vfx]
command = 'C:\Program Files\nodejs\node.exe'
args = ['C:\projects_joojjuuk\roblox\plugin_roblox\arc-vfx\mcp\dist\server\index.js']
cwd = 'C:\projects_joojjuuk\roblox\plugin_roblox\arc-vfx'
tool_timeout_sec = 30
```

Para registrar globalmente por escolha do usuário: `codex mcp add arc_vfx -- node C:\projects_joojjuuk\roblox\plugin_roblox\arc-vfx\mcp\dist\server\index.js`. Esse comando foi documentado, não aplicado à configuração global.

No ambiente atual, `codex mcp get arc_vfx` não carregou o config de projeto. A alternativa verificada, sem mudar confiança ou config global, é `powershell -File scripts/codex.ps1 mcp get arc_vfx`; o wrapper fornece command/args/cwd por invocação. Execute `powershell -File scripts/codex.ps1` para abrir o cliente com essa configuração. Claude reconheceu `.mcp.json` e informou aprovação pendente; a aprovação deve ser feita pelo usuário no cliente.

## Claude e outros clientes

`.mcp.json` registra o servidor no escopo do projeto Claude Code. O comando local `claude mcp add --help` confirmou suporte a stdio e escopo project. Clientes compatíveis podem usar o mesmo command/args. O teste automatizado usa o SDK cliente oficial e comprova handshake, descoberta de 61 ferramentas e chamadas reais por stdio; não depende de um modelo específico.

Não foi alterado o Jooj Root Connector. A extensão não depende dele.

## Distribuição local

`builds/Arc.rbxm` não contém token. `.local/Arc-MCP-Local.rbxm` contém o token privado e não pode ser compartilhado. Binários e upstream permanecem fora do Git. Copie os projetos exportados completos para consumir runtime em outro lugar; mantenha o editor de testes separado dos jogos existentes.

`npm run package` arquiva somente os arquivos versionados do commit atual em `builds/arc-vfx-mcp-source.zip`. O ZIP não inclui fontes/assets upstream, token, node_modules ou builds locais. Depois de extrair, execute npm ci e forneça o Arc original para reconstruir o editor.
