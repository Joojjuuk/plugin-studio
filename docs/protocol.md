# Protocolo MCP e ponte

O servidor usa o SDK oficial `@modelcontextprotocol/server` 2.3.1, transporte stdio e schemas Zod strict. A API não expõe execução Luau, shell, leitura livre de arquivos ou inserção de scripts. O JSON Schema completo está em `tools.schema.json`; a fonte executável é `mcp/src/schemas/contracts.ts`.

O cliente recebe um UUID por processo. Cada chamada à ponte possui UUID de requisição, ferramenta e argumentos. Um `requestId` opcional permite repetir a consulta do mesmo resultado; o cliente deve manter o mesmo processo e os mesmos argumentos. A ponte rejeita reutilização do ID com conteúdo diferente. Repetir uma mutação com um novo ID é uma nova operação.

## Endpoints internos

Todos usam POST, Bearer token local e endereço 127.0.0.1. Requisições com Origin de navegador são rejeitadas. O corpo é limitado a 2 MiB para conter consumo de memória; não é um limite artístico.

- `/hello`: registra UUID do plugin, nome do lugar, placeId e versão; retorna sessionId.
- `/poll`: entrega no máximo uma operação por Studio. Nenhuma segunda operação é entregue enquanto a anterior aguarda resultado.
- `/result`: recebe resultado da operação atribuída à mesma sessão e retorna ACK.
- `/rpc`: entrada interna dos processos MCP, com identificação do cliente.

A fila expira em 15 segundos. Timeout antes do despacho informa `not_dispatched`. Timeout após despacho informa `unknown`, mantém a sessão ocupada e não reexecuta o comando. Um resultado tardio substitui o estado incerto e pode ser consultado repetindo o mesmo ID. São retidos até 4.096 registros por processo de ponte; atingido o limite, novas operações são recusadas até reinício planejado. Não há remoção que permita executar um ID antigo novamente nessa sessão.

O plugin mantém respostas até ACK e repete somente a entrega do resultado. Quedas breves de rede retomam polling. Sessão perdida sem operação pendente registra novamente e exige nova conexão explícita do cliente. Reinício do daemon durante uma operação pendente exige inspeção/recuperação manual; o plugin não supõe que a operação deixou de executar.

## Escopo e edição

É obrigatório conectar `studioId` e `sessionId`. Operações de projeto usam `projectId`; operações de objetos usam também `objectId`, nunca caminhos arbitrários. O Adapter resolve somente objetos do projeto ativo, effect tracks e grupos Organizer. O Base de origem não é um alvo editável comum.

As classes permitidas estão no schema. Propriedades precisam existir no catálogo Arc ou na lista explícita de composição e passar por leitura, comparação de tipos e escrita em clone de validação. Referências Instance resolvem apenas IDs no projeto. Alterações são recusadas durante playtest. Uma falha de edição tenta restaurar o checkpoint e registra diagnóstico; falha de recuperação é reportada separadamente.

Resposta comum:

```json
{"ok":true,"data":{"projectId":"..."}}
```

Ou `ok:false` com `error.code`, `error.message` e, quando aplicável, `error.outcome`. Erros de ferramentas também retornam `isError:true` no MCP. Nunca se considera um teste aprovado somente por `ok:true`: os testes consultam estado, comparam dados e executam runtime.

## Semânticas importantes

- Frames são inteiros; tempo em segundos corresponde a frame/fps. Mudar FPS usa o rescale do Arc.
- Emissões usam os nomes reais `EmitCount`, `EmitDuration`, `EmitDelay`.
- Valores nativos usam `Serializer` Arc: `{t:"Vector3",v:[1,2,3]}`, `{t:"CFrame",v:[12 componentes]}`, `{t:"EnumItem",v:["Material","Neon"]}`. Primitivos também são aceitos diretamente ao editar propriedades.
- Curva customizada usa NumberSequence: `{t:"NumberSequence",v:[[0,0,0],[1,1,0]]}`.
- `vfx_create_mesh` fornece SpecialMesh com host Part próprio quando parentId é omitido. O resultado inclui hostId para animar CFrame/Size. Isso permite malhas primitivas/FileMesh sem fingir que MeshPart.MeshId pode ser escrito livremente. `vfx_create_object` ainda permite um MeshPart vazio para trabalho manual posterior; validate acusa ausência de geometria.
- `vfx_duplicate_object` duplica hierarquia e keys dos membros. Grupos Organizer devem ser recriados a partir de seus membros.
- `vfx_delete_object` em um grupo remove o agrupamento e preserva os membros.
- `vfx_save_project` usa SaveController; o lugar ainda precisa ser salvo em disco.
- `vfx_export` e `vfx_export_runtime` usam ExportController. `executed:false` no retorno significa que a ferramenta gerou o módulo, sem afirmar que o executou.

Logs locais ficam em `.local/bridge.jsonl`, com IDs, ferramenta e estados, sem token ou conteúdo de propriedades. O token está em `.local/token` e no binário privado pareado.

Referência: [SDK MCP oficial](https://ts.sdk.modelcontextprotocol.io/v2/).
