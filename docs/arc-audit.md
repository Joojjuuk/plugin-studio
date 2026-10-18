# Auditoria do Arc

Inspeção local em 18/10/2026: versão interna 2.0.0, 1.210 instâncias, 239 scripts e 74.168 linhas. O arquivo fornecido e a instalação `118257542877059/22180630254805/Plugin.rbxm` têm o mesmo SHA-256, registrado em `provenance.json`. O índice de código cobre todos os scripts; não equivale a uma prova formal de correção de cada linha.

## Inicialização e interface

`Bootstrap` retorna quando `plugin` está ausente e instancia `Modules/Application`. `Application.new` instala toolbar, ações, settings, áudio, recuperação, editor e CreateSuite. `UI/Interface` clona o ScreenGui original em CoreGui. `Timeline`, `TimelineController`, `KeyframeView`, `EffectsList` e `PropertyEditor` formam a edição visual. A chamada programática de abertura também precisa habilitar `Interface:setEnabled(true)`; apenas `ProjectSession:enter` não o fazia.

## Projetos e sessão

`ProjectFactory:createEmpty` clona `Template.Project`, marca `ArcProject` e prepara `Effects` e `Base`. `ProjectSetup`, `ProjectOpener` e `ProjectLauncher` tratam a entrada manual. `ProjectSession:enter` prepara timeline, Organizer, tracks, referências e rig; `exit` restaura estados de preview e locks. `rebuildStructure` exporta/importa keys ao recriar o rig. Esse método é a fronteira para edição estrutural por MCP.

## Animação e curvas

`Animator` mantém stores separados: normal, emit, global, effect, event, debris e master. `KeyframeStore` implementa frames inteiros, conflitos, grupos, metadados, caches e avaliação. A interpolação usa `KeyframeMath`, TweenService, NumberSequence customizada e AutoSmooth. `KeyframeRecorder` observa a edição manual. `PoseRig` separa CFrame/Size das propriedades comuns e captura valores relativos ao pai. `PropertyCatalog:read` retorna **sucesso e valor**, não somente valor; isso foi confirmado nos testes de integração.

`commitEdits` registra poses/propriedades/emissões e reconstrói botões; `commitEffect` registra tracks especiais. `KeyframeView.buttons` é a mesma representação usada pela GUI. `Playback` avança frames por Heartbeat. Pausa é `stop` preservando o frame; o comando MCP stop também busca frame zero.

## Preview e componentes

`ParticleClock`, `ParticleSnapshot` e `EmitStream` controlam partículas com scrub e emissões. `MeshClock`, `MeshCurve`, `MeshFlipbook`, `FlipbookClock`, `BoltStrike`, `StrikeClock` e `DebrisClock` tratam componentes especializados. `MasterTransform`, `GlobalScaler`, `BoneRig`, `RigController`, gizmos e `StretchSolver` tratam transformações e manipulação. `CameraDirector`, `EffectPreview`, `ImpactSequence`, `ScreenAttach` e `EffectTracks` cuidam de câmera, Lighting e tela. `SoundClock`, `SoundCue` e `SoundHost` tratam áudio.

## Persistência e runtime

`SaveController:save` exporta keys/grupos, clona em rest pose e usa `SaveManager`. Este mantém slots, snapshots, chunks JSON, IDs e espelho em plugin settings. `Serializer` codifica tipos Roblox como `{t,v}`. Nomes de enum são `Material`, não `Enum.Material`.

`ExportController:buildData` reúne tracks, partículas, meshes, sons, efeitos, debris, eventos e referências. `createModule` escreve `Animation/<nome>`, Data e módulos runtime. `Runtime/Controller` gerencia execuções; `Runtime/Player` clona o efeito, avalia tracks e limpa instâncias no cancelamento. A pasta do projeto precisa acompanhar o ModuleScript, pois o runtime consulta o modelo Effects.

Créditos embutidos, catálogo Create, configurações e templates são conservados localmente. As demonstrações novas não dependem dos assets de procedência individual ainda não auditada desses catálogos.
