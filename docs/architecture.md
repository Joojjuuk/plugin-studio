# Arquitetura e decisões

```text
Cliente MCP → stdio → servidor TypeScript → HTTP local autenticado
                                               ↓
                                      fila por sessão Studio
                                               ↓ polling
                                      plugin Arc / Bridge
                                               ↓
                                         Adapter Arc
                                               ↓
                      Application.projectSession / Animator / Save / Export
```

O daemon da ponte é único; vários processos stdio podem atendê-lo. Cada cliente recebe um UUID e vincula sua própria sessão Studio. A extensão gera um UUID por carregamento do plugin; o daemon responde com um identificador de sessão. Cada operação contém o projeto autorizado. Não existe escolha automática do primeiro Studio disponível.

O `Bootstrap` do build inicia a `Application` original e acrescenta a ponte no contexto real de `Plugin`. `game.ServerStorage.Arc` serve somente para inspeção. Copiar essa pasta para o DataModel não inicia um plugin. A instalação real foi comprovada nos logs `PluginFileRead` e `PluginLoadingEnhanced` do Studio.

Foram acrescentados dois ModuleScripts, `Modules/MCP/Adapter` e `Modules/MCP/Bridge`, além da substituição do pequeno bootstrap no artefato de build. Os 239 arquivos de fonte extraídos permanecem iguais aos originais. O editor continua com nome Arc e iconografia original.

O Adapter recebe a mesma `Application` usada pela GUI. `commitEdits`, `commitEffect`, `KeyframeStore` e `KeyframeView:rebuildSource` atualizam os dados e os botões reais da timeline. `ProjectSession:rebuildStructure` recria o rig de edição conservando keys e grupos. `Organizer:createFolder` produz os grupos nativos do Arc.

O build usa Lune em vez de Rojo: desserializa o RBXM original, aplica as fontes pelos índices da hierarquia e serializa novamente. Isso conserva GUI, templates, referências entre instâncias e assets binários sem fabricar milhares de arquivos auxiliares. A compilação Luau é verificada antes de gerar o artefato. O build verifica também a quantidade de instâncias após reabrir o RBXM.

Operações de edição usam checkpoints do projeto em memória e rollback em erro. Até 20 checkpoints são mantidos; esse é um limite de retenção de recuperação, não um orçamento de VFX. Alterações manuais que mudem a revisão do Animator invalidam o histórico MCP para evitar substituir trabalho posterior do artista. O histórico normal de keys do Arc continua disponível pela GUI.

A biblioteca é independente e declarativa. Nenhum segundo motor de interpolação ou reprodução foi criado. Runtime e exportação continuam sendo os do Arc.
