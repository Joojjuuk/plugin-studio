# Auditoria do VFX Studio

Arquivo local confirmado: `135581141962270/36372145307849/Plugin.rbxm`. Foram inspecionadas 5.531 instâncias e 90.718 linhas de scripts, incluindo dependências embarcadas. Hash e autoria constam em `provenance.json`. O inventário registra funções e hierarquia; o código não foi copiado para upstream nem incorporado à extensão.

O bootstrap é `MainPluginScript`. `Core/PluginUIManager` gerencia interface e docking; `StudioPanelManager` e `StudioIntegration` coordenam painéis e a seleção. `VFXDataManager` e `UserDataManager` tratam dados de catálogo, atualizações e saves do usuário. `AudioSaver` e `MeshDataManager` mantêm conteúdo reutilizável.

`Panels/EmitterController` implementa emissão isolada, loops persistentes, trails, escala e atributos de emissão. `Core/TweenExecutor` coordena cadeias de efeitos e propriedades. `BezierPanel` (2.830 linhas), `BezierUtils` e `BezierPathController` oferecem caminhos, handles 3D e avaliação Bezier. `ViewportEmitter` contém uma simulação própria para preview de partículas; `VFXViewportController` reconstrói hierarquias em previews. `PropertiesViewController`, `MeshesViewController` e `AddPropertiesController` dão produtividade ao catálogo. `Core/CodeGenerator` gera código de disparo.

Recursos úteis para esta extensão: busca por metadados, presets versionados, controles de emissão e composição reutilizável. Foram implementados independentemente no catálogo JSON e nas operações tipadas; curvas e reprodução reutilizam o Arc. Não se transplantou o simulador de partículas, o BezierPanel ou o catálogo do VFX Studio.

Não foi localizada uma licença permissiva geral para incorporar o código do plugin. A licença pública da biblioteca exige acordo assinado por projeto e impõe restrições a assets. A instalação local não comprova esse acordo. Veja [licenciamento](licensing.md).

Fontes primárias: [Creator Store](https://create.roblox.com/store/asset/135581141962270/VFX-Studio), [repositório do autor](https://github.com/Sytranom/VFXStudio), [documentação](https://sytranom.github.io/vfx-studio-docs/).
