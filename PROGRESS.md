### STATUS: DESENVOLVIMENTO_ABA_ROTINA

# 📅 Ultra Rotina — Desenvolvimento Integral da Aba Rotina

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZ ESTRATÉGICA ATUAL DO USUÁRIO (FOCO 100% NA ABA ROTINA)**:
1. **OBJETIVO ABSOLUTO: DESENVOLVIMENTO INTEGRAL DA ABA ROTINA**:
   - *Foco Total & Sem Conservadorismo*: O autoloop concentra 100% de sua capacidade em refatorar, expandir e integrar a **Aba Rotina** em todo o ecossistema (Cockpit PWA, rotas Fastify e Telegram Bot).
   - *Reestruturação Visual no Cockpit PWA*: Substituir a interface legada de `#tab-rotina` por uma timeline de time-blocking moderna, rica e responsiva, com cards dinâmicos do dia (horários, atividades, tags, status e notas).
   - *Erradicação de Conteúdo Genérico e Mocks*: Remover textos fixos ("Turma J", "Semana Ativa", blocos de estudo congelados), conectando a rotina viva do médico (escala de plantão, MedQuest, Anki, treino e recuperação).
   - *Integração Real com Google Calendar no Backend Fastify*: Descontinuar definitivamente dependências órfãs de GAS `CalendarApp` e integrar via Node.js nativo (iCal / Google Calendar API / Service Account).
   - *Sincronização Bidirecional & Offline-First*: Comunicação fluida entre Telegram e Cockpit PWA com persistência local em IndexedDB para uso beira-leito sem latência.
2. **Validação Rigorosa (Test Sharding)**: Iterar exclusivamente com o teste do módulo alterado (~0.3s a 0.5s); ao concluir a tarefa, certificar zero regressões com `npm test`.

---

## 🔄 Tarefa Concluída

- [x] **Notion Habit Log & Tasks DB — Sincronização em Nuvem (Render), Normalização de UUIDs e Telemetria de Configuração (`src/05_notion.js`, `server/index.js`, `tests/test_notion_habit_log_resiliencia.cjs`)**:
    - **Resolução de Ambiente no Render**: Diagnóstico e configuração das variáveis de ambiente (`NOTION_TOKEN`, `NOTION_HABIT_LOG_DB_ID` e `NOTION_TASKS_DB_ID`) no Render; verificado status `token_configurado: true`, `habit_log_db_configurado: true` e `tasks_db_configurado: true` ao vivo no contêiner via `/api/status`.
    - **Normalização e Tratamento Defensivo**: Implementada `normalizarNotionId` para saneamento automático de URLs/queries e logs ricos da API do Notion.
    - **Recibo de Estabilidade**: Bateria completa de testes aprovada com 55/55 suítes verdes (zero regressões).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Painel de Estatísticas e Aderência Semanal (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Função `calcularAderenciaSemanal` e componente de resumo no topo da aba rotina
    - **Comportamento Esperado / Critério de Aceite**: Exibir percentual real de blocos cumpridos na semana e indicadores visuais de rodízio/estudo ativo com atualização offline-first.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Painel de Estatísticas e Aderência Semanal (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Função `calcularAderenciaSemanal` e componente de resumo no topo da aba rotina
    - **Comportamento Esperado / Critério de Aceite**: Exibir percentual real de blocos cumpridos na semana e indicadores visuais de rodízio/estudo ativo com atualização offline-first.

2. [ ] **Aba Rotina — Alertas Web Push 10 Minutos Antes de Blocos Críticos (`gh_cockpit_deploy/sw.js`, `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/sw.js` e `server/index.js`
    - **Função/Componente/Seletor**: Service Worker push notification handler e cron de notificações da agenda
    - **Comportamento Esperado / Critério de Aceite**: Disparo de notificação local/push no smartphone do médico 10 minutos antes de plantões e blocos de estudo ativo MedQuest.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Notificações Push)*: Disparo de Web Push Notifications no Cockpit PWA 10 minutos antes do início de blocos críticos (ex: plantão, rodízio e bloco MedQuest).
- *Sugestão 02 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 03 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 04 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 05 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.

---
