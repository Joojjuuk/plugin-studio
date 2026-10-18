# Matriz de recursos

| Recurso | Arc encontrado | VFX Studio encontrado | Decisão e fundamento |
|---|---|---|---|
| Timeline | Timeline, TimelineController, KeyframeView | TweenExecutor, sequências nos painéis | Reutilizar sessão e timeline Arc; botões reais refletem seus stores. |
| Keyframes | Animator, KeyframeStore, KeyframeRecorder | Tweens e dados de features | Reutilizar commitEdits/commitEffect; nenhum novo motor. |
| Biblioteca | Create/TextureCatalog e catálogos embutidos | VFXDataManager, MeshDataManager, UserDataManager | Catálogo próprio de parâmetros; assets VFX Studio excluídos por licença. |
| Emissores | ParticleClock, EmitStream, ParticleSnapshot | EmitterController, StudioIntegration | Reutilizar Arc; expor EmitCount/EmitDuration/EmitDelay. |
| Curvas | KeyframeMath, NumberSequence, TweenService, AutoSmooth | BezierPanel, BezierUtils, BezierPathController | Curvas existentes do Arc. Não incorporar código Bezier externo. |
| Objetos | ProjectSession, BoneRig, PropertyCatalog, Organizer | Painéis de propriedades, escala e manipulação | Operar mesma sessão e grupos Arc; validação de classe/propriedade. |
| Preview | Playback, ProjectPreview, EffectPreview, clocks | ViewportEmitter e VFXViewportController | Reprodução real Arc; capturas externas documentadas separadamente. |
| Exportação | ExportController, Runtime/Controller e Player | CodeGenerator | Gerar runtime original Arc; execução comprovada em Run. |
| Câmera/tela | CameraDirector, EffectTracks, ImpactSequence | StudioIntegration e features | Tracks Arc tipadas, preservadas em receitas com arcKeys. |
| Presets | Configurações e catálogos Create | Presets e persistência do usuário | JSON independente, origem/licença/aprovação explícitas. |
