# Autoria e distribuição

Arc é de **sevenIIl**. No [post 10 do tópico oficial](https://devforum.roblox.com/t/arc-a-vfx-animation-plugin/4903133/10), o autor permite obter a fonte e criar forks, com condições: não revender o plugin, não mudar seu nome ou ícone e não reivindicar sua autoria. Não foi encontrada uma licença SPDX abrangente no arquivo local. A fonte primária foi consultada em 18/10/2026, inclusive pela resposta JSON do próprio DevForum.

Esta extensão conserva o nome Arc, ícones, créditos, fontes e recursos locais. O servidor adicional se identifica como `arc-vfx-mcp`; isso não altera a identidade do editor. O build é somente local. Nenhum asset ou plugin foi publicado no Roblox.

Fontes extraídas, RBXM original, builds e binários pareados ficam fora do Git. Isso também evita distribuir catálogos embarcados cuja licença individual ainda não foi confirmada. O repositório pode conter a extensão, scripts de reconstrução, metadados de auditoria e presets originais. Quem reconstruir precisa fornecer sua própria cópia válida do Arc.

VFX Studio aparece no [Creator Store](https://create.roblox.com/store/asset/135581141962270/VFX-Studio) como de XxOmqxXNerd; o repositório público é de Sytranom. A [licença da biblioteca](https://github.com/Sytranom/VFXStudio/blob/main/LICENSE.md) exige acordo assinado e contrassinado. Seu [README](https://github.com/Sytranom/VFXStudio) descreve licença por lugar/plugin, restrições de modificação de texturas e de distribuição de arquivos brutos. Não há prova local de licença para este projeto; nenhum código ou asset foi reutilizado.

Os presets novos são combinações originais de parâmetros e primitivas. Referências `rbxasset://textures/particles/...` apontam para conteúdo embarcado no Roblox, não para arquivos de textura redistribuídos. O usuário deve continuar respeitando as condições da plataforma.

Dependências Node têm licenças próprias no lockfile e em `node_modules`: SDK oficial MCP 2.3.1 declara Apache-2.0; Zod, TypeScript e tipos mantêm seus avisos. A extensão não concede direitos sobre componentes de terceiros nem atribui ao usuário a autoria do Arc.
