# Receitas e biblioteca

`library/recipe.schema.json` é gerado do schema Zod em uso. A versão 1 contém id, name, duration, fps, objects, timeline e metadata. `origin` preserva o pivot do projeto. Cada objeto tem id estável, classe permitida, pai opcional, propriedades, preset opcional, atributos e tags opcionais. IDs duplicados, pais inexistentes, ciclos de pais e keys além da duração são rejeitados.

```json
{
  "version":1,
  "id":"example",
  "name":"Example",
  "duration":1,
  "fps":60,
  "objects":[{"id":"burst","name":"Burst","type":"ParticleEmitter","preset":"ice_burst","properties":{}}],
  "timeline":[{"objectId":"burst","frame":12,"kind":"emit","properties":{},"emit":{"EmitCount":25,"EmitDuration":0,"EmitDelay":0}}],
  "metadata":{"author":"Local project"}
}
```

O servidor resolve somente presets aprovados e mescla as propriedades antes de enviar a receita ao plugin. A importação exige um projeto vazio, evitando colisões e mesclagens silenciosas. A transação constrói hierarquia, aplica tipos Roblox e usa os commits do Animator. Referências entre objetos, como Attachment0/1, usam `{t:"Instance",v:"id"}` e são resolvidas depois da criação dos objetos.

Exportações incluem `arcKeys` e `arcGroups`, no formato real de `Animator:exportKeys/exportGroups`. Isso conserva estado completo, easing e stores sem reconstruir uma aproximação. `timeline` declarativa fica vazia nessa modalidade. Grupos Organizer usam `groupMembers`; tracks especiais usam `effectType`. Objetos não representáveis pelo schema devem permanecer em save/export Arc, com erro explícito de receita.

O Node normaliza mapas vazios conhecidos, pois o JSONEncode Luau pode representá-los como arrays vazios. A receita exportada passa novamente pelo mesmo schema. Os testes de demonstração reimportam a exportação e comparam `arcKeys` integralmente.

O catálogo possui 55 presets originais: burst, mist, shard, trail e arc para fogo, gelo, pedra, eletricidade, combate, energia, sombra, sangue estilizado, magia, portal e transformação. Cada entrada registra ID, nome, categoria, tags, versão, tipo, parâmetros, recursos, origem, licença, compatibilidade, preview e aprovação. `preview:null` significa que não foi produzido um thumbnail; não é um preview fictício.

Presets são parâmetros reutilizáveis, não uma cópia do catálogo Arc/VFX Studio. `vfx_search_assets` consulta metadados; `vfx_import_asset` e `vfx_apply_preset` criam objetos reais. `vfx_save_preset` salva em `.local/presets` com status draft. A aprovação exige revisão explícita do arquivo local, inclusive de direitos de texturas/meshes; drafts não são importados automaticamente.

`vfx_import_recipe` aceita qualidade low, standard e high. Nas receitas declarativas, esses perfis aplicam multiplicadores autorais de emissão de 0,5 / 1 / 1,5 e ajustam Rate quando declarado. Não são limites de segurança nem garantias de FPS. Receitas com arcKeys exigem standard para conservar seus dados exatos. Nenhuma textura é duplicada entre variantes.

`vfx_get_performance` informa objetos, partes, emissores, beams, trails, texturas referenciadas e estimativa `Rate × Lifetime.Max` das partículas contínuas habilitadas. Dimensão de textura, custo de GPU e frame time não são inventados. A qualidade visual e o orçamento final precisam de profiling no dispositivo alvo.

Demonstrações: `ice_explosion_01.json` cria cristais, névoa e estilhaços com antecipação, expansão e dissipação; `sword_slash_01.json` cria movimento de corte, trail e faíscas sincronizadas. São composições técnicas com primitivas, prontas para refinamento artístico e substituição por recursos próprios autorizados.
