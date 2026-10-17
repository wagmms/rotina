# Feature Requests

Capabilities requested by the user.

---

## [FEAT-20261012-001] painel_aderencia_semanal_rotina

**Logged**: 2026-10-12T11:05:00-03:00
**Priority**: high
**Status**: in_progress
**Area**: frontend

### Summary
Painel de estatísticas e aderência semanal com percentual de blocos cumpridos no topo da Aba Rotina.

### Details
O médico necessita visualizar no topo do Cockpit PWA e no Telegram métricas reais da semana corrente:
1. Percentual de cumprimento dos blocos do time-blocking.
2. Contagem de horas dedicadas a estudo ativo (MedQuest e Anki).
3. Contagem de horas de plantão/rodízio cumpridas e horas de recuperação.

### Suggested Action
Implementar a função `calcularAderenciaSemanal` no backend/frontend com agregação de blocos salvos e renderização de card de progresso semanal em `rotina_timeline.js`.

### Metadata
- Source: user_feedback / PROGRESS.md
- Related Files: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `src/06_rotina_agenda.js`
- Tags: rotina, analytics, aderencia, pwa
- Pattern-Key: rotina.weekly_adherence_dashboard

---

## [FEAT-20261012-002] web_push_notificacoes_antecipadas

**Logged**: 2026-10-12T11:05:00-03:00
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
Alertas via Web Push Notifications 10 minutos antes do início de blocos críticos.

### Details
Disparo de alerta sonoro/vibração no smartphone através do Service Worker (`gh_cockpit_deploy/sw.js`) 10 minutos antes de compromissos críticos (plantão, rodízio e bloco MedQuest), auxiliando na transição de foco.

### Suggested Action
Configurar Web Push Protocol no backend Fastify com chaves VAPID e listener `push` no Service Worker.

### Metadata
- Source: PROGRESS.md sugestões futuras
- Related Files: `gh_cockpit_deploy/sw.js`, `server/index.js`
- Tags: push_notifications, pwa, service_worker
- Pattern-Key: rotina.push_notifications

---

## [FEAT-20261017-001] estacao_soap_telegram_bidirecional

**Logged**: 2026-10-17T14:44:00-03:00
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Comando `/soap` e suporte a áudio no bot Telegram integrado à Estação SOAP com segurança clínica auditada.

### Details
Permitir que o médico envie áudios de relatos clínicos ou execute `/soap` no Telegram. O backend processa via `soap_service.js`, aplica `safety_guard.js` com segmentação de orações adversativas (LRN-20261017-001) e devolve prontuário estruturado e receita médica formatada.

### Suggested Action
Criar módulo desacoplado `src/07_telegram_soap.js` integrado a `src/07a_telegram_router.js` com testes unitários em `tests/test_soap_telegram.cjs`.

### Metadata
- Source: PROGRESS.md / auditoria 17/10
- Related Files: `src/clinical/soap_service.js`, `src/07a_telegram_router.js`, `src/07_telegram_soap.js`
- Tags: soap, telegram, clinical_safety, voice_notes
- Pattern-Key: clinical.soap_telegram_voice

---

## [FEAT-20261017-002] pomodoro_inteligente_indexeddb

**Logged**: 2026-10-17T14:44:00-03:00
**Priority**: high
**Status**: in_progress
**Area**: frontend

### Summary
Timer Pomodoro resiliente no IndexedDB com feedback sonoro/háptico e conclusão de bloco de estudo em 1 toque.

### Details
Timer para blocos de estudo ativo (MedQuest e Anki) na Aba Rotina. Sobrevive a recarregamentos ou minimização da tela, respeita a política de AudioContext em mobile e sincroniza a conclusão via Fastify/Telegram sem colidir com eventos da agenda Google (LRN-20261017-003).

### Suggested Action
Implementar em `rotina_timeline.js` e espelhar em `gh_cockpit_deploy/rotina_timeline.js` com testes em `tests/test_aba_rotina_cockpit.cjs`.

### Metadata
- Source: PROGRESS.md
- Related Files: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `tests/test_aba_rotina_cockpit.cjs`
- Tags: pomodoro, indexeddb, rotina, haptics, webaudio
- Pattern-Key: rotina.pomodoro_resilient_timer
