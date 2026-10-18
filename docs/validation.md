# Testes e resultados — 18/10/2026

Estado: núcleo funcional demonstrado. Há limitações de produção e de observação visual listadas em `limitations.md`; esta versão não equivale à cobertura de todas as combinações de propriedades do Roblox.

## Verificações automatizadas

`npm run typecheck` passou. O build compilou os 239 scripts upstream e os dois módulos da extensão, gerando RBXM que foi reaberto e conferido: 1.213 instâncias. O `Bootstrap` original foi substituído somente no artefato gerado.

`npm test` passou com cinco testes: schemas das 61 ferramentas; rejeição de receitas inconsistentes; perfis de emissão; protocolo stdio com SDK oficial e catálogo; e integração da ponte com autenticação, vinculação explícita, duas sessões, deduplicação, conflito de IDs, timeout antes/depois do despacho e ACK tardio. Os participantes Studio do teste da ponte são clientes de teste, não provas de renderização no Roblox.

## Testes reais no Studio

Os scripts `tests/studio.mjs`, `tests/demos.mjs` e `tests/operations.mjs` usam exclusivamente o **novo MCP stdio** para criar e editar os projetos. Ferramentas Roblox Studio MCP independentes foram usadas para inspeção do DataModel, captura, exportação local de fixtures e execução/verificação do runtime. O engine da extensão foi carregado como plugin local pelo Studio, não apenas requerido de ServerStorage.

- **A — conexão:** versão, UUID Studio e sessionId conferidos. Mais de uma instância Studio real foi detectada; somente as fixtures marcadas foram editadas.
- **B — criação:** `ARC_MCP_TEST`, WedgePart e ParticleEmitter criados por MCP.
- **C — timeline:** três keys de CFrame/Size/Transparency e uma emissão. Seek ao frame 30 confirmou transparência 0,1. Inspeção independente encontrou os quatro GuiButtons reais. Na demo de gelo, encontrou **42 GuiButtons Keyframe** na timeline com ScreenGui habilitado. A captura nativa da janela falhou; não há screenshot completo da timeline.
- **D — preview:** play avançou frames; pause preservou frame; stop voltou a zero; seek aplicou os valores esperados. Demos também usaram play/pause/seek.
- **E — persistência:** SaveController, fechar e reabrir preservaram keys. A fixture foi serializada localmente e aberta em outro processo; os quatro keyframes e dois objetos foram conferidos novamente. A serialização do lugar usada no teste foi uma ferramenta de fixture, não uma promessa de salvamento de disco automático pelo MCP.
- **F — exportação:** ExportController gerou módulo e 22 descendentes runtime. Em servidor real Run, posição, tamanho e transparência mudaram entre amostras. Cancelamento removeu clones. As duas demos exportadas também animaram; no corte, Attachment0/1 do trail apontaram para clones no runtime.
- **G — resiliência:** Studio/sessão incorretos, cliente desconectado, objeto fora do projeto, projeto não autorizado, propriedade Source inválida e repetição de comando foram recusados ou deduplicados. O estado foi consultado após falha. Timeout e ACK tardio foram testados na ponte. Reinício ocioso do daemon foi exercitado com reconexão real. `tests/multi-studio.mjs` conectou dois plugins Arc reais em processos Studio distintos: cada cliente criou seu próprio projeto e objeto; referências ao projeto da outra instância foram rejeitadas e os valores originais permaneceram. Fechar o plugin durante uma mutação continua sem teste específico.

## Demonstrações

`ice_explosion_01`: dez objetos declarados e 42 keys; cristais, névoa, burst e dissipação. `sword_slash_01`: cinco objetos e sete keys; guia de corte animada, attachments, trail e burst de impacto. Cada efeito foi salvo e exportado. As receitas exportadas foram importadas em projetos vazios e os dados `arcKeys` comparados integralmente. Houve uma segunda comparação de receitas com groups Organizer e track Events.

`tests/operations.mjs` verificou componentes, curva customizada, update/move/delete de keys, duplicação com keys, checkpoints undo/redo, grupos nativos, effect tracks, evento Hit, FPS/duração, presets, validação e isolamento. As 61 ferramentas foram exercitadas ao menos uma vez, somando operações Studio e biblioteca local. O relatório por ferramenta está em `tool-validation.json`.

## Evidências locais

- `tests/evidence/studio-smoke.json`, `studio-demos.json`, `studio-operations.json`: requisições e respostas reais.
- `tests/evidence/runtime-proof.json`: amostras independentes antes/depois e cancelamento.
- `tests/evidence/multi-studio.json`: duas instâncias Arc reais com edições isoladas.
- `tests/evidence/*-roundtrip.json`: dados exportados e reimportados.
- `.local/bridge.jsonl`: IDs e transições da ponte.
- `builds/IceExplosion.rbxm`, `builds/SwordSlash.rbxm`: projetos completos.

Não houve benchmark de GPU, teste móvel, revisão humana final da direção artística, teste de interação manual completa na GUI ou publicação de assets. O catálogo tem 55 presets originais, não 55 assets artísticos com texturas próprias e previews aprovados.

Uma tentativa de serializar Workspace inteiro como RBXM foi recusada pela API do Studio. Os artefatos de persistência e demonstração foram gerados exportando as pastas de projeto e seus dados de save explicitamente. Não foi contado como sucesso o backup recusado de uma sessão de testes descartável.
