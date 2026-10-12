# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice
**Areas**: frontend | backend | infra | tests | docs | config
**Statuses**: pending | in_progress | resolved | wont_fix | promoted | promoted_to_skill

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

