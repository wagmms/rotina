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
