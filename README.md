# Arc VFX MCP

Extensão local para **Arc 2.0.0, de sevenIIl**. Mantém editor, timeline, keyframes, preview e exportador do Arc. Node.js expõe 61 ferramentas MCP por stdio e uma ponte autenticada em `127.0.0.1:41573`.

O código e os assets originais permanecem locais. Nenhum código ou textura do VFX Studio foi incorporado. As demonstrações usam geometria Roblox e referências a texturas embutidas no engine.

## Preparar e executar

No PowerShell, dentro desta pasta:

```powershell
npm ci
& 'C:\tools\lune\lune.exe' run scripts/extract.luau
npm run build
npm test
npm run install:local
npm run bridge
```

A extração exige o `Plugin.rbxm` original fornecido pelo usuário. Lune 0.10.5 já estava instalado; `LUNE` pode apontar para outro executável compatível. A instalação cria `Arc-MCP-Local.rbxm` em `%LOCALAPPDATA%\Roblox\Plugins`, preservando backups de versões anteriores desta extensão. Os plugins originais instalados não são substituídos.

Abra `builds/ARC_MCP_TEST.rbxl` em um Studio independente. Na toolbar **Arc**, abra **MCP** e clique **Connect**. A instalação local preenche o token; o build compartilhável não contém token. Caso o Studio solicite permissão de HTTP para localhost, conceda-a manualmente à extensão. Não é necessário habilitar execução arbitrária de scripts pelo MCP.

O cliente MCP inicia:

```powershell
node C:\projects_joojjuuk\roblox\plugin_roblox\arc-vfx\mcp\dist\server\index.js
```

Use a configuração de projeto `.codex/config.toml` ou `.mcp.json` para Claude Code. Mantenha `npm run bridge` em outro terminal. Não execute `npm run mcp` em terminal esperando uma interface: esse processo recebe mensagens MCP por stdin.

## Fluxo

1. `vfx_list_studios` → escolha `studioId` e `sessionId`.
2. `vfx_connect` → vincule explicitamente o cliente à sessão.
3. `vfx_create_project` → guarde `projectId`.
4. Crie objetos, keyframes e emissões; ou use `vfx_import_recipe` com o JSON em `library/recipes/`.
5. `vfx_seek`, `vfx_play`, `vfx_pause`, `vfx_stop` usam a reprodução do Arc.
6. `vfx_save_project` salva no sistema Arc dentro do lugar. Salve também o lugar no Studio para persistência em disco.
7. `vfx_export_runtime` gera o ModuleScript Arc no projeto. Mova **a pasta completa do projeto** para seu jogo quando desejar consumi-lo.

```luau
local effect = require(project.Animation[project.Name])
local handle = effect.Start({Target = CFrame.new(0, 5, 0), Attach = false})
-- handle.Cancel() interrompe esta execução.
```

## Entregáveis locais

- `builds/Arc.rbxm`: editor Arc com extensão MCP, sem token.
- `.local/Arc-MCP-Local.rbxm`: instalação pareada, privada.
- `builds/IceExplosion.rbxm`, `builds/SwordSlash.rbxm`: projetos com runtime exportado.
- `builds/ARC_MCP_VERIFICATION.rbxl`: fixture com os projetos de demonstração.
- `library/catalog.json`: 55 presets curados de parâmetros.
- `library/recipes/`: explosão congelante e corte de espada.
- `tests/evidence/`: respostas reais e verificações locais; não publicadas automaticamente.

Veja [documentação](docs/README.md), [resultados](docs/validation.md) e [limitações](docs/limitations.md). A existência de uma ferramenta registrada não substitui o teste registrado no relatório.
