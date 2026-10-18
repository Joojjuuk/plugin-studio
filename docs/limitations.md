# Limitações e próximos passos

## Limites conhecidos

1. Captura própria de imagem não está exposta pelo novo MCP. `get_capabilities.visualCapture` é false. O Roblox Studio MCP disponível no ambiente capturou o viewport, mas a captura nativa da janela falhou. A existência de GuiButtons na timeline foi verificada no DataModel; não foi produzido screenshot completo da interface.
2. Demos são composições técnicas com primitivas e texturas do engine. Exigem direção artística e recursos próprios para o padrão visual de uma produção final. Não foram declaradas como VFX comercialmente aprovados.
3. `vfx_save_project` salva no sistema Arc dentro do lugar. Salvar o lugar em disco continua sendo uma operação do Studio. Os testes produziram fixtures locais para demonstrar reabertura em outro processo.
4. Reinício do daemon durante operação em andamento perde seu registro em memória. O plugin conserva resultado pendente e bloqueia reexecução, exigindo inspeção manual. Persistência transacional de operações entre crashes de ambos os processos é melhoria futura.
5. Checkpoints MCP são limitados ao projeto e à memória. Revisões manuais do Animator invalidam seu histórico. Não existe promessa de undo global de exportações, saves ou alterações externas ao editor.
6. Importação de receita exige projeto vazio. A tradução suporta as classes declaradas, tracks especiais e grupos; dados não representáveis exigem save/export Arc. Objetos adicionais como SurfaceAppearance ou rigs de Bones precisam de suporte explícito antes de serem tratados como receita sem perda.
7. MeshPart.MeshId não é tratado como uma propriedade livremente gravável. `create_mesh` oferece SpecialMesh e host Part, com ID do host. Geometria MeshPart externa e seus direitos precisam de um fluxo próprio de importação.
8. O relatório de performance é contagem/estimativa. Dimensões de texturas, emissões simultâneas de todos os efeitos, GPU, memória real e desempenho móvel não foram medidos.
9. Biblioteca cobre famílias por parâmetros reutilizáveis. Não contém milhares de texturas nem o acervo do VFX Studio. Drafts salvos exigem revisão local de direitos/aprovação.
10. Codex/Claude têm configuração preparada por projeto; o cliente pode exigir confiança/aprovação e reinício. Não alteramos essas preferências globais. O handshake e as chamadas foram testados pelo SDK oficial. O wrapper `scripts/codex.ps1` permite configuração por invocação.
11. Duas instalações Arc reais foram exercitadas em Studios de teste. A instância original Place1 foi preservada sem edição; encerramento abrupto do plugin no meio de uma mutação ainda não recebeu um teste real específico.

## Melhorias seguintes

- Journal durável de requisições com recuperação explícita após crash e retenção por cliente.
- Captura de viewport por uma API suportada do Studio, sem confundir URI temporária com imagem entregue ao modelo.
- Testes de GUI manual/automação nativa e edição concorrente em dois Studios de teste.
- Fluxo licenciado de meshes, texturas originais, previews e revisão de presets.
- Curadoria artística das duas demos, incluindo arco de corte mais elaborado e silhueta de gelo refinada.
- Profiling por dispositivo, incluindo bursts, overdraw e custos de textura.
- Compatibilidade de atualização do Arc por comparação dos manifests, fontes e interfaces efetivamente usadas.
- Suporte a mais classes/atributos de recursos em receitas, acompanhado de testes de ida e volta.

Root Connector não foi investigado: integração opcional, secundária ao núcleo autônomo.
