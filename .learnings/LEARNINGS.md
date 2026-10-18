# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice
**Areas**: frontend | backend | infra | tests | docs | config
**Statuses**: pending | in_progress | resolved | wont_fix | promoted | promoted_to_skill

## [LRN-20261018-001] best_practice

**Logged**: 2026-10-18T18:05:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Sincronização mandante entre tabela de comandos de roteamento do Telegram e módulos delegados (Módulo 07i), além de autorização interna de calculadoras clínicas sem bypass indevido.

### Details
1. Ao introduzir novos comandos slash ou em linguagem natural em submódulos (`/sniper`, `/vagas`, `/piso`, `/ctg`, `/distocia`), é mandatório registrar os identificadores na tabela principal de roteamento (`TABELA_COMANDOS_AGENDA_ROTINA_AUDIO_` e `comandosSemBarra`), caso contrário o despachante rejeita na raiz com "Comando não reconhecido".
2. Em testes e em execução do bot que persistem dados em disco (`PropertiesService` / `data/properties.json`), todo teste deve implementar setup determinístico (`redefinirConfigPadrao()` e `destravarTodaAgendaSniper()`) e limpeza no `teardown`, garantindo idempotência e prevenindo asserções quebradas por *state bleed*.
3. O middleware `cockpitAutorizar_` em `src/13_cockpit_integracao.js` deve autorizar chamadas internas em memória do motor (`bot`, `internal`, `interno`) sem depender exclusivamente de `NODE_ENV === 'test'`, uma vez que a camada de borda HTTP do Fastify (`server/controllers/cockpit.controller.js`) já bloqueia e rejeita identificadores reservados de sistema com HTTP 401.

### Suggested Action
Sempre auditar comandos novos de ponta a ponta chamando `processarMensagemTexto` em vez de apenas o método isolado do módulo secundário.

### Metadata
- Source: project_evolution
- Related Files: `src/07a_telegram_router.js`, `src/14_sniper_plantoes.js`, `src/13_cockpit_integracao.js`, `tests/test_sniper_plantoes_rotina.cjs`
- Tags: routing, telegram, state-isolation, properties, cockpit-auth
- Pattern-Key: backend.telegram_router_and_state_isolation
- Recurrence-Count: 1
- First-Seen: 2026-10-18
- Last-Seen: 2026-10-18

---

## [LRN-20261017-007] best_practice

**Logged**: 2026-10-17T15:15:00-03:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
Arquitetura híbrida de testes em saúde: Runner determinístico em milissegundos + Auditoria semântica pós-teste via LLM (Argon).

### Details
1. A execução de testes contínuos não deve depender de LLM direto para cada cálculo de dose ou checagem de HTTP/DOM: a dependência de inferência geraria minutos de espera, custo de tokens e falta de determinismo matemático estrito (`===`).
2. O papel do modelo de fronteira (Gemini 4 Argon) brilha na auditoria pós-execução do relatório JSON: filtragem de falsos positivos de layout (diferenciar botões "Fechar" legítimos em modais locais vs botões repetidos desnecessários), avaliação de segurança clínica de prescrições e geração de código pronto para aplicar.
3. Analisadores de DOM de formulários clínicos devem diferenciar rigorosamente `<input type="number">` (que exige `inputmode="decimal"`) de `<select>` (que abre pickers nativos sem teclado virtual) e campos de busca/texto livre.

### Suggested Action
Manter o padrão de pipeline em dois tempos: `npm run test:prime` para o ciclo ágil de desenvolvimento (< 35s, custo 0) e `npm run test:prime:argon` para release final e auditoria de preceptoria médica.

### Metadata
- Source: project_evolution
- Related Files: `tooling/testador_prime/`, `scripts/testador_prime_argon.sh`, `cockpit_movel.html`
- Tags: testing, llm-as-a-judge, argon, mobile-ux, inputmode
- Pattern-Key: tests.hybrid_runner_and_cognitive_judge
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-006] insight

**Logged**: 2026-10-17T14:45:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Heurísticas ingênuas de filtragem por contagem de caracteres (`len(text) < threshold`) descartam fluxogramas clínicos e tabelas estruturadas na ingestão.

### Details
1. Em scripts de raspagem ou ingestão de conhecimento médico (ex: acervo do Tá de Clinicagem), aplicar filtros ingênuos de tamanho de texto corrido para eliminar páginas "vazias" descartou mais de 2.000 fluxogramas visuais, tabelas posológicas e nós de decisão que continham poucas palavras mas altíssima densidade clínica em elementos estruturados (SVGs, `table`, `img`).
2. O usuário percebeu que as primeiras categorias tinham muitos dados e as últimas quase nenhum, apontando a assimetria na extração.

### Suggested Action
Nunca utilizar comprimento de texto puro como critério de descarte em extratores. A validação de conteúdo deve checar a presença de tags estruturadas (`<svg>`, `<table>`, `<img>`, nós de grafos) antes de considerar um documento vazio.

### Metadata
- Source: user_feedback
- Related Files: `scripts/extrator_tdc.py`, `data/tdc_knowledge.db`
- Tags: scraping, ingestion, flowcharts, data_integrity
- Pattern-Key: backend.scraper_visual_flowcharts_preservation
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-005] best_practice

**Logged**: 2026-10-17T14:45:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Ergonomia de contingência offline: proibição de respostas genéricas volumosas ("textão alucinatório") que simulam atendimento falso.

### Details
1. Quando a IA falha por oscilação de rede, despejar um bloco estático de 30 linhas com `🚨 SISTEMATIZAÇÃO DETERMINÍSTICA DE EMERGÊNCIA (MÉTODO ABCDE / MOV)` para qualquer pergunta (inclusive dúvidas simples de ambulatório) gera a sensação imediata de que o bot está "bugado" ou alucinando.
2. Em modo de contingência, o bot deve ser transparente, conciso e admitir a indisponibilidade temporária da IA de forma enxuta, apresentando apenas referências canônicas puras ou solicitando dados objetivos em vez de tentar inventar conduta geral.

### Suggested Action
Extirpar checklists acadêmicos descabidos e cabeçalhos de engenheiro de TI do módulo `src/04_ia_local_fallback.js`. Responder de forma ágil, admitindo contingência com cartões visuais limpos.

### Metadata
- Source: user_feedback
- Related Files: `src/04_ia_local_fallback.js`, `src/07c_telegram_consultas_e_ia.js`
- Tags: fallback, offline, ux, ergonomics, contingency
- Pattern-Key: backend.offline_fallback_ergonomics
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-004] best_practice

**Logged**: 2026-10-17T14:45:00-03:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Erradicação de Fake Search e filtros ingênuos sobre arrays estáticos reduzidos em ferramentas clínicas.

### Details
1. A ferramenta de "Busca Inteligente de CID" mantinha um array estático de apenas 13 a 19 códigos pré-definidos no frontend e backend. Se o médico digitasse doenças corriqueiras (pneumonia, otite, amigdalite, sinusite, dengue, herpes, cólica renal), a busca retornava "nenhum resultado", frustrando o uso clínico beira-leito.
2. Componentes de pesquisa médica nunca devem fingir inteligência sobre coleções mockadas. Devem conectar-se a bases completas indexadas (como SQLite com FTS5, bases oficiais do DATASUS/CID-10 ou buscas semânticas via IA com fallback amplo).

### Suggested Action
Remover filtros ingênuos estáticos de componentes de busca e vincular a endpoints reais de banco de dados ou índices canônicos integrais com suporte a busca fonética/sinônimos.

### Metadata
- Source: user_feedback
- Related Files: `gh_cockpit_deploy/index.html`, `src/13_cockpit_integracao.js`, `src/03_bases_locais.js`
- Tags: search, cid10, fts5, anti_mock, clinical_ux
- Pattern-Key: frontend.anti_mock_clinical_search
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-003] best_practice


**Logged**: 2026-10-17T14:40:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Autoridade soberana de provedor externo (Google Calendar) sobre cache local e prevenção de ressurreição anti-zumbi de eventos excluídos.

### Details
1. **Autoridade Soberana da Fonte da Verdade**: Quando o usuário realiza ajustes de agenda diretamente no Google Calendar (fonte externa primária), os horários retornados pela API (`b.inicio`, `b.fim`) não devem ser sobrescritos por estados salvos locais (`sv.inicio`, `sv.fim`), mesmo que houvesse marcações anteriores de adiamento.
2. **Prevenção Anti-Zumbi de Eventos Deletados**: Ao mesclar eventos frescos de uma API com dados persistidos localmente (`salvos`), o algoritmo de reconciliação não pode reinserir eventos excluídos da fonte externa caso pertençam àquele provedor (`ehEventoGoogle`). Apenas blocos nativos/manuais gerados localmente devem ser preservados.
3. **Erradicação de Botões Manuais Redundantes**: Se a sincronização com a API possui TTL reduzido (ex: 20s) e revalidação contínua transparente no backend e na renderização do PWA/bot, botões manuais de "Sincronizar" ou "Ajustar" causam confusão e devem ser substituídos por indicadores visuais de estado ativo.

### Suggested Action
Em integrações com Google Calendar ou outros provedores de calendário, garantir que os horários e a existência dos eventos venham incondicionalmente da API, usando o cache local estritamente para status de conclusão (concluído/pulado) e metadados contextuais.

### Metadata
- Source: user_feedback
- Related Files: `src/06_rotina_agenda.js`, `server/google_calendar.js`, `tests/test_google_calendar_sync.cjs`
- Tags: google_calendar, sync, state_reconciliation, anti_zombie, ttl_cache
- Pattern-Key: backend.google_calendar_sovereignty_and_auto_sync
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-002] best_practice

**Logged**: 2026-10-17T14:26:00-03:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
Conexão dinâmica de sabatinas socráticas à IA com fallback resiliente e paridade em espelhos de PWA.

### Details
1. **Erradicação de Conteúdo Hardcoded em Componentes Clínicos**: Interfaces de mentoria clínica e sabatina médica não devem exibir perguntas estáticas repetitivas de catálogos locais. Ao disparar uma auditoria ou sabatina de ponto cego (`solicitarSabatinaPreceptorPlantao`), a requisição deve ser delegada via RPC à IA (Gemini 4 Argon), injetando o contexto rico do tema (`pontoAtencao`, `perolaClinica`, `diretriz`) ou os dados do SOAP ativo.
2. **Resiliência e Fallback Transparente**: Se houver falha de rede beira-leito ou modo offline, o card renderiza a pergunta de contingência clínica com badge visual explícito `(Modo Offline)` e botão de reconexão à IA.
3. **Controles Interativos Beira-Leito**: Cards de sabatina devem oferecer ações ágeis em 1 toque:
   - Ouvir no fone (`SpeechSynthesis` em PT-BR).
   - Responder no chat (foco e scroll suave até `#input-conversa-texto`).
   - Regeneração imediata de nova pergunta com IA (`[🔄]`).
4. **Sincronia Estrita de Espelhos PWA**: No ecossistema do Cockpit, qualquer modificação em `gh_cockpit_deploy/index.html` deve ser replicada para `cockpit_movel.html`, `index.html` e `gh_cockpit_deploy/cockpit_movel.html` com paridade SHA-256 de 100%.

### Suggested Action
Sempre vincular botões de sabatina e preceptor aos endpoints de IA do backend, garantindo feedback visual de carregamento e testes de integridade em todas as telas.

### Metadata
- Source: user_feedback
- Related Files: `gh_cockpit_deploy/index.html`, `cockpit_movel.html`, `src/13_cockpit_integracao.js`, `src/04_motores_ia.js`
- Tags: preceptor, socratic_ai, gemini_argon, pwa, speech_synthesis, offline_resilience
- Pattern-Key: frontend.socratic_preceptor_ai_connection
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261017-001] best_practice

**Logged**: 2026-10-17T13:10:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: backend

### Summary
Blindagem de fronteiras HTTP, integridade do validador Ajv/Fastify, desacoplamento de RPC e parsing sintático de alergias clínicas.

### Details
1. **Ajv e `additionalProperties: false` em Fastify**: Schemas de entrada do Fastify que definem `additionalProperties: false` acionam o descarte automático (`removeAdditional`) de propriedades enviadas fora do formato rígido antes de chegar na rota. Para APIs clínicas com múltiplos clientes (PWA, bot, formulários legados), permitir campos compatíveis e `additionalProperties: true` no schema de entrada evita a mutilação silenciosa de dados vitais (`idade`, `alergias`, `pas`, `pad`).
2. **Resolução de Alergias em Orações Compostas**: Analisar strings clínicas como um bloco único com regex simples causa falsos negativos graves se o paciente disser "alergia à amoxicilina; nega alergia à dipirona". O parsing deve obrigatoriamente segmentar o texto por orações/cláusulas adversativas (`split(/[;.\n/]+|\b(?:mas|porem|contudo|entretanto)\b/i)`) antes de avaliar marcadores de negação.
3. **Isolamento de Sessões e Despacho RPC**: NUNCA permitir que strings literais ou reservadas (`'internal'`, `'bot'`) passem como credenciais válidas na camada de transporte HTTP externa (`/api/cockpit`). Requisições externas devem ser autenticadas via WebApp initData HMAC ou tokens criptográficos. No despachante RPC, a execução de funções de `ctx` deve ser estritamente restrita a um mapa estático (`_rpcMap`), proibindo reflexão dinâmica arbitrária.
4. **Nunca Fabricar Negativas Clínicas**: Quando dados basais ou red flags não forem informados, o prontuário eletrônico deve omitir o campo ou sinalizar "Não informado", NUNCA gerando declarações afirmativas falsas ("Nega alergias", "Red Flags: Ausentes").

### Suggested Action
Segregar validação de sessão na camada de transporte HTTP, usar FTS5 nativo em SQLite para bases clínicas estáticas e manter testes de aceite cobrindo a integridade dos payloads.

### Metadata
- Source: audit_remediation
- Related Files: `src/clinical/safety_guard.js`, `src/clinical/schemas/soap.schema.js`, `server/controllers/cockpit.controller.js`, `server/runtime.js`
- Tags: security, ajv, fastify, soap, clinical_safety, rpc
- Pattern-Key: backend.clinical_safety_http_boundaries
- Recurrence-Count: 1
- First-Seen: 2026-10-17
- Last-Seen: 2026-10-17

---

## [LRN-20261013-002] best_practice

**Logged**: 2026-10-13T23:05:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Sincronia de eventos e adiamento de rotina com Google Calendar em RFC3339 com fuso explícito e paridade tripla de espelhos HTML.

### Details
1. Ao atualizar horários de eventos no Google Calendar API v3 (`PATCH /calendars/{calendarId}/events/{eventId}`), datas enviadas sem offset explícito podem sofrer desvio de +3h caso o container Node rode em UTC. Construir timestamps RFC3339 com `timeZone: "America/Sao_Paulo"` e `${dataStr}T${horario}:00-03:00` blinda a aplicação contra regressões de fuso horário.
2. Na mesclagem entre eventos do Google Calendar e overrides locais (`ROTINA_OVERRIDE_<data>`), os títulos e notas do Google Calendar devem ter precedência de exibição para manter os temas vivos de estudo (ex: `[MedQuest] ✍️ ...`), enquanto o status (`concluido`, `adiado`) e horários locais devem ser preservados se o usuário tiver feito adiamento ou checagem manual.
3. A automação `build_master.py` deve sincronizar de forma atômica e simultânea todos os pontos de entrada do PWA (`cockpit_movel.html`, `index.html` e `gh_cockpit_deploy/index.html`) para garantir paridade 100% SHA-256 sem falhas de deploy.

### Suggested Action
Sempre anexar `timeZone` e offset explícito ao montar payloads de data/hora no Google Calendar e incluir todos os arquivos de entrada web no pipeline do `build_master.py`.

### Metadata
- Source: feature_delivery
- Related Files: `server/google_calendar.js`, `src/06_rotina_agenda.js`, `build_master.py`, `tests/test_google_calendar_sync.cjs`
- Tags: google_calendar, timezone, rfc3339, rotina, build_master, parity
- Pattern-Key: backend.google_calendar_timezone_rfc3339
- Recurrence-Count: 1
- First-Seen: 2026-10-13
- Last-Seen: 2026-10-13

---

## [LRN-20261013-001] best_practice

**Logged**: 2026-10-13T00:15:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: infra

### Summary
Proteção contra sequestro de bots: Webhook obrigatório com Secret Token e sanitização contínua de segredos em repositórios públicos.

### Details
Quando um token do Telegram Bot vaza em repositórios públicos do GitHub, bots scanners automatizados imediatamente iniciam sessões de long-polling (`getUpdates`). Se o bot legítimo não tiver um Webhook ativo, o invasor intercepta 100% das mensagens dos usuários e responde spam/phishing. A ativação imediata do Webhook (`setWebhook`) corta instantaneamente o sequestro, pois o Telegram passa a retornar `409 Conflict: can't use getUpdates method while webhook is active` para o invasor. Arquivos legados nunca devem ser versionados com chaves reais.

### Suggested Action
1. Manter Webhook registrado no Telegram com `secret_token` exclusivo para rotas de backend.
2. Nunca subir arquivos legados com tokens para repositórios públicos.
3. Revogar imediatamente qualquer token exposto no BotFather.

### Metadata
- Source: error
- Related Files: `radar_voos/Code.js`, `server/index.js`, `.gitignore`
- Tags: telegram, security, token_leak, webhook, botfather
- Pattern-Key: infra.telegram_webhook_anti_hijack
- Recurrence-Count: 1
- First-Seen: 2026-10-13
- Last-Seen: 2026-10-13

---

## [LRN-20261012-002] best_practice

**Logged**: 2026-10-12T15:43:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: tests

### Summary
Reset e sincronização da memória de erros do Testador Master após conserto de lotes.

### Details
Ao finalizar o conserto de lotes de problemas identificados pelo testador autônomo, a memória acumulada de falhas em disco (`testador_master_relatorio.json`, seeds estáticos como `testador_master_issues_seed.json`) deve ser purgada e sincronizada com a nova rodada pós-conserto. Caso contrário, flags de continuidade como `--resume` re-injetam no reporter centenas de falhas mortas do passado que já foram corrigidas no código-fonte, exibindo dashboards inflados com erros fantasmas.

### Suggested Action
Sempre que um lote de correções for concluído e validado, expurgar seeds estáticos de issues antigas e atualizar o baseline de relatórios e dashboards com a sessão limpa atual do código.

### Metadata
- Source: user_correction
- Related Files: `tooling/testador_master/reporter.py`, `data/testador_master_relatorio.json`
- Tags: testador_master, reporting, cache_invalidation, resume
- Pattern-Key: testador_master.reset_error_memory_post_fix
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

---

## [LRN-20261012-001] best_practice

**Logged**: 2026-10-12T10:45:00-03:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
Testes com contexto de VM devem carregar dinamicamente `src/*.js` em paridade com `server/runtime.js`.

### Details
Testes legados (como `tests/test_rotina_adaptativa.cjs`) continham listas estáticas de módulos (`const files = ['00_config.js', ...]`). Ao criar novos submódulos desacoplados como `src/07i_telegram_rotina_central.js`, o teste quebrava por ausência do módulo recém-criado, enquanto o runtime oficial (`server/runtime.js`) lia dinamicamente a pasta inteira.

### Suggested Action
Sempre utilizar `const files = fs.readdirSync(SRC_DIR).sort().filter(f => f.endsWith('.js'));` ao inicializar contextos de teste Node.js/VM, garantindo paridade absoluta com o runtime oficial de produção.

### Metadata
- Source: error
- Related Files: `tests/test_rotina_adaptativa.cjs`, `server/runtime.js`
- Tags: tests, nodejs, vm, architecture
- Pattern-Key: tests.dynamic_module_loading
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

### Maintenance
- Claim: Testes que simulam o runtime do bot devem carregar dinamicamente todos os módulos JavaScript da pasta `src/` em ordem alfabética.
- Scope: `tests/`
- Authority: `server/runtime.js`
- Decay: task / whenever runtime module loading mechanism changes
- Revalidate: before creating new modules in `src/`
- Validation: validated
- Evidence: 52/52 suítes de testes aprovadas com `fs.readdirSync` dinâmico em `tests/test_rotina_adaptativa.cjs`.
- Disposition: retain
- Guidance: Aplicar este padrão em qualquer novo arquivo de teste que crie VM context próprio.

---

## [LRN-20261012-002] best_practice

**Logged**: 2026-10-12T11:00:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Desacoplamento de rotas e comandos do Telegram em módulos profundos (`codebase-design`).

### Details
O roteador principal `src/07a_telegram_router.js` excedia 5.700 linhas, concentrando comandos clínicos, calculadoras e rotinas pessoais. Extrair a Central de Rotina para `src/07i_telegram_rotina_central.js` e expor uma interface concisa (`despacharComandosRotinaEProdutividade`) reduziu a complexidade ciclomática do roteador principal e isolou os testes de forma independente.

### Suggested Action
Ao adicionar novas grandes áreas de comandos no bot, criar um módulo dedicado `src/07*_*.js` e delegar a partir de `src/07a_telegram_router.js` com seam limpo e verificação defensiva de tipagem.

### Metadata
- Source: best_practice
- Related Files: `src/07a_telegram_router.js`, `src/07i_telegram_rotina_central.js`, `src/07g_telegram_ajuda_e_protocolos.js`
- Tags: architecture, telegram, router, deep_module
- Pattern-Key: backend.telegram_router_decoupling
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

### Maintenance
- Claim: Módulos de domínio do Telegram devem manter interfaces pequenas com alta implementação interna encapsulada, delegadas a partir do roteador central.
- Scope: `src/07*.js`
- Authority: `codebase-design` skill
- Decay: project / architectural pattern
- Revalidate: when adding new slash command domains
- Validation: validated
- Evidence: Redução no router principal e 100% de sucesso nos testes de UX e rotina adaptativa.
- Disposition: retain
- Guidance: Seguir o modelo de `src/07i_telegram_rotina_central.js` para futuros domínios.

---

## [LRN-20261012-003] best_practice

**Logged**: 2026-10-12T10:30:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Paridade estrita SHA-256 obrigatória entre arquivos de frontend raiz e pasta de deploy `gh_cockpit_deploy/`.

### Details
O Cockpit PWA possui dois pares de arquivos canônicos: `cockpit_movel.html` <-> `gh_cockpit_deploy/index.html` e `rotina_timeline.js` <-> `gh_cockpit_deploy/rotina_timeline.js`. Alterações feitas em um lado sem cópia para o outro causam divergência entre os testes locais e o que é entregue no GitHub Pages.

### Suggested Action
Sempre executar cópia e verificação de paridade com `cmp -s` antes de validar testes e concluir tarefas que envolvam o PWA.

### Metadata
- Source: best_practice
- Related Files: `cockpit_movel.html`, `gh_cockpit_deploy/index.html`, `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`
- Tags: frontend, pwa, deploy, gh_pages
- Pattern-Key: frontend.parity_check
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

### Maintenance
- Claim: Qualquer alteração no frontend do Cockpit PWA deve ser imediatamente sincronizada entre a raiz e `gh_cockpit_deploy/`.
- Scope: `cockpit_movel.html`, `rotina_timeline.js`, `gh_cockpit_deploy/`
- Authority: AGENTS.md / regras do projeto
- Decay: project / structural
- Revalidate: before each commit touching frontend
- Validation: validated
- Evidence: Paridade 100% verificada com `cmp -s`.
- Disposition: retain
- Guidance: Incluir verificação no fluxo de entrega contínua.

---

## [LRN-20261012-004] best_practice

**Logged**: 2026-10-12T16:30:00-03:00
**Priority**: high
**Status**: resolved
**Area**: tooling

### Summary
Dashboards HTML gerados estaticamente a partir de JSON requerem mecanismo de auto-refresh no cliente e reconciliação de status de issues com suporte a detecção de regressão.

### Details
Quando um processo de simulação ou testador em segundo plano/monitor é pausado, o arquivo HTML visualizado no navegador permanece congelado no último snapshot a menos que possua:
1. Um loop de auto-sync (ex: polling/recarregamento a cada 10s) com toggle visual e persistência de abas via `localStorage`.
2. Um modelo de dados que reconcilie o status das issues (`status: "RESOLVIDO"` / `resolvido: true`) e reabra a issue automaticamente (`REABERTO_REGRESSAO`) caso uma falha volte a ocorrer no runtime.

### Suggested Action
Sempre equipar geradores de relatórios e dashboards com controle visual de auto-refresh configurável e renderização diferenciada de issues pendentes vs resolvidas.

### Metadata
- Source: best_practice
- Related Files: `tooling/testador_master/dashboard_generator.py`, `tooling/testador_master/reporter.py`, `data/testador_master_relatorio.json`
- Tags: dashboard, testador_master, live_sync, ui_ux
- Pattern-Key: tooling.dashboard_live_sync
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

### Maintenance
- Claim: Dashboards visuais devem ser auto-sincronizáveis e refletir status de issues resolvidas com guardião contra regressões.
- Scope: `tooling/testador_master/*`
- Authority: Engenharia de confiabilidade do projeto
- Decay: project / tooling
- Revalidate: when updating testador or dashboard generator
- Validation: validated
- Evidence: Dashboard gerado com live-sync de 10s e 96/122 issues marcadas como resolvidas/protegidas.
- Disposition: retain
- Guidance: Manter o timer de auto-sync ativado por padrão.

---

## [LRN-20261013-001] best_practice

**Logged**: 2026-10-13T23:28:00-03:00
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Rascunhos de receita em cache (`ckRx`) para emissão de PDF em 1 toque exigem prefixo explícito `Posologia:` para blindar o parser de prescrição contra desagregação de termos.

### Details
O parser de prescrições ambulatoriais `analisarItensReceita` (`src/07c_telegram_consultas_e_ia.js`) utiliza expressões regulares para identificar linhas de posologia (`^(?:posologia|modo de usar|quantidade|qtd|total)\s*[:=]` ou verbos posológicos no imperativo seguidos de dígito). Se uma linha de posologia incluir palavras intermediárias antes do valor numérico (ex: `Tomar via oral 1 comprimido`), o parser pode classificar incorretamente o texto como uma nova linha de medicamento não reconhecido, falhando a validação estrita em `validarReceitaTemMedicamentos`.
Adicionalmente, ao integrar apresentações de `REMUME_RP.csv` que já contenham o nome do fármaco (ex: `Amoxicilina 250 mg/5 mL`), o gerador de rascunhos deve verificar duplicidade para não gerar termos duplicados (`Amoxicilina Amoxicilina...`).
Por fim, `uxTextoProntuario` em `src/12_experiencia_bot.js` higieniza emojis Unicode para prontuários eletrônicos (PEP), convertendo o selo visual `🟢 [REMUME-RP]` em `[REMUME-RP]` na mensagem de cópia final, preservando o emoji apenas no rascunho de tela.

### Suggested Action
Sempre formatar linhas posológicas geradas programaticamente com o prefixo canônico `Posologia: <texto>` e aplicar desduplicação de nome de fármaco na apresentação padronizada.

### Metadata
- Source: best_practice
- Related Files: `src/03_bases_locais.js`, `src/07c_telegram_consultas_e_ia.js`, `src/10_pdf_receita.js`, `src/12_experiencia_bot.js`
- Tags: remume_rp, posologia, parser, receita_pdf, soap
- Pattern-Key: backend.rx_parser_posologia_prefix
- Recurrence-Count: 1
- First-Seen: 2026-10-13
- Last-Seen: 2026-10-13

### Maintenance
- Claim: Rascunhos de prescrição e blocos SOAP para cópia devem ser blindados com prefixos canônicos e desduplicação farmacológica.
- Scope: `src/03_bases_locais.js`, `src/07c_telegram_consultas_e_ia.js`, `src/10_pdf_receita.js`
- Authority: Preceptor Médico / Clean Code Guard
- Decay: project / architectural
- Revalidate: when updating recipe parsing or soap extraction
- Validation: validated
- Evidence: 10/10 testes da suíte `tests/test_remume_soap_pdf_integracao.cjs` aprovados e 57/57 aprovados no `npm test`.
- Disposition: retain
- Guidance: Seguir o padrão de `montarRascunhoRxESoapAmbulatorial` em qualquer novo gerador de prescrição.

---

## [LRN-20261013-002] bug_fix

**Logged**: 2026-10-13T23:40:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: pwa

### Summary
Migração de domínio de backend em PWA requer deploy atômico no repositório do GitHub Pages (`gh_cockpit_deploy`), bump do `CACHE_NAME` do Service Worker e sanitização defensiva de `localStorage`.

### Details
Quando o backend de produção do Render foi atualizado de `ultra-rotina-backend.onrender.com` para `rotina-tt8n.onrender.com`, o espelho compilado localmente em `gh_cockpit_deploy/index.html` não havia recebido commit e push para o repositório remoto `wagmms/cockpit.git`. Como resultado:
1. O GitHub Pages continuava servindo o build antigo, que disparava requisições RPC para o domínio 404 sem cabeçalhos CORS, gerando erro de rede (`TypeError: Failed to fetch`) e acionando o banner persistente "Servidor inalcançável no momento".
2. Em dispositivos móveis com o PWA previamente instalado, o Service Worker (`sw.js`) mantinha o App Shell cacheado caso o `CACHE_NAME` não fosse incrementado.
3. Além disso, se o `localStorage` do dispositivo tivesse gravado a URL legada na chave `cockpit_backend_url`, a aplicação continuaria insistindo no endpoint desativado.

### Suggested Action
1. Sempre commitar e fazer push no repositório `gh_cockpit_deploy` (`wagmms/cockpit`) imediatamente após atualizações no build do Cockpit.
2. Incrementar o `CACHE_NAME` no `sw.js` (ex: de `v3.1` para `v3.2`) a cada mudança de infraestrutura crítica para forçar o ciclo de vida do Service Worker (`activate` -> `caches.delete` dos caches antigos e `self.clients.claim()`).
3. Adicionar sanitização defensiva no cliente para expurgar chaves obsoletas do `localStorage` que apontem para hosts extintos.

### Metadata
- Source: bug_fix
- Related Files: `cockpit_movel.html`, `sw.js`, `gh_cockpit_deploy/index.html`, `gh_cockpit_deploy/sw.js`
- Tags: pwa, service_worker, render, cors, cache_invalidation, github_pages
- Pattern-Key: pwa.backend_migration_cache_lifecycle
- Recurrence-Count: 1
- First-Seen: 2026-10-13
- Last-Seen: 2026-10-13

### Maintenance
- Claim: Deploys do PWA no GitHub Pages devem ser sincronizados e com versionamento do Service Worker atualizado.
- Scope: `cockpit_movel.html`, `sw.js`, `gh_cockpit_deploy/*`
- Authority: Arquitetura PWA e Resiliência
- Decay: project / architectural
- Revalidate: when updating PWA caching or backend hosting
- Validation: validated
- Evidence: Deploy no GitHub Pages concluído com sucesso e verificado via curl com HTTP 200, Service Worker v3.2 e endpoint `rotina-tt8n.onrender.com`.
- Disposition: retain
- Guidance: Manter o fluxo de deploy atômico no repositório do Cockpit e bump de versão no `sw.js`.

---

## [LRN-20261016-001] bug_fix

**Logged**: 2026-10-16T00:40:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: backend

### Summary
Gemini Live API (gemini-3.8-live), supressão de loop acústico de microfone e prevenção de vozes simultâneas no Preceptor Live.

### Details
1. **Modelo Bidi Live Correto**: A Gemini Live API de voz full-duplex requer o modelo oficial `gemini-3.8-live`. Modelos tradicionais como `gemini-2.5-flash` ou prévias descontinuadas retornam erro 1008 ("not found for API version v1beta, or is not supported for bidiGenerateContent") e forçavam o sistema a cair em fallback de contingência imperfeito.
2. **Transcrição em Tempo Real**: Na Live API em modalidade de áudio (`responseModalities: [Modality.AUDIO]`), os chunks em `modelTurn.parts` não possuem `part.text` (são `undefined`). A transcrição correta do usuário e da IA deve ser habilitada via `inputAudioTranscription: {}` e `outputAudioTranscription: {}` no config de conexão, sendo lida a partir de `serverContent.inputTranscription.text` e `serverContent.outputTranscription.text`.
3. **Loop de Eco Acústico**: O microfone capturava a própria voz do Preceptor emitida pelos alto-falantes/fones e retransmitia em tempo real para a IA. Implementar `isPreceptorSpeaking()` no frontend garante o descarte dos buffers de áudio durante a reprodução da IA, eliminando a confusão de vozes e as respostas alucinatórias.
4. **Vozes Duplas Simultâneas**: A reprodução concorrente ocorria por colisão entre o fallback de `window.speechSynthesis` (que disparava indevidamente no `turnComplete` por reset da flag de áudio durante o streaming de texto) e os nós de áudio da Web Audio API (`AudioBufferSourceNode`), além da falta de trava de concorrência (`processandoTurno`) no backend.

### Suggested Action
Sempre utilizar `gemini-3.8-live` para WebSockets Bidi, habilitar transcrições explícitas de entrada/saída, aplicar bloqueio de captura de microfone enquanto a IA estiver falando (`isPreceptorSpeaking`), cancelar `speechSynthesis` ativamente e manter fila unificada de reprodução no `AudioContext`.

### Metadata
- Source: user_report
- Related Files: `server/index.js`, `gh_cockpit_deploy/index.html`, `index.html`, `cockpit_movel.html`, `tests/test_preceptor_live_anti_eco_e_transcricao.cjs`
- Tags: gemini_live, audio, websocket, anti_echo, vad, transcricao, webaudio
- Pattern-Key: audio.gemini_live_echo_cancellation_transcription
- Recurrence-Count: 1
- First-Seen: 2026-10-16
- Last-Seen: 2026-10-16



## [LRN-20261017-AUD] Contratos clínicos e procedência precisam de provas independentes

**Logged**: 2026-10-17
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Na auditoria integral, nove suítes novas passaram apesar de reproduções demonstrarem descarte de dados SOAP, alergia positiva perdida por negação em outra oração, is_safe verdadeiro com alerta pediátrico crítico e classificação adulta de IMC em criança. Oito presets municipais e RENAME tinham os mesmos 255 itens do REMUME_RP.csv, com verificado:true.

### Suggested Action
Testar o payload do formulário contra o schema real e a resposta real contra a renderização; preservar dados ausentes como desconhecidos; verificar fonte/versão/conteúdo de catálogos, não só rótulos. Casos simulados não provam equivalência clínica entre modelos.

### Metadata
- Pattern-Key: clinical.contract-provenance-verification
- Related Files: docs/auditorias/2026-10-17/reproducoes.cjs, src/clinical/, src/data/remumes/

### Maintenance
- Claim: no snapshot auditado, testes de componentes não cobrem os contratos e a procedência acima.
- Scope: SOAP novo e catálogos REMUME/RENAME do Rotina
- Type: reality
- Validation: validated
- Evidence: reproducoes.cjs e relatório de 17/10/2026
- Revalidate: após correção desses contratos/dados
- Disposition: retain

