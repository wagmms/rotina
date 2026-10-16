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

- [x] **Aba Rotina: Sincronização Bidirecional Telegram ↔ Cockpit PWA via SSE + ETag, Sincronização In-Place Anti-Spam e Google Calendar Nativo sem GAS (`server/runtime.js`, `server/index.js`, `src/07i_telegram_rotina_central.js`, `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `tests/test_aba_rotina_sincronizacao_bidirecional.cjs`)**:
    - **Barramento Reativo Monotônico (`server/runtime.js`)**: Criação do `rotinaBus` (EventEmitter) com persistência imediata atômica de chaves `ROTINA_` e `GCAL_` no `PropertiesService` (eliminando atraso de buffer debounce), rastreamento determinístico de origem (`runWithOrigin` para `'cockpit'`, `'telegram'`, `'gcal'`) e versionamento estritamente monotônico (`bumpRotinaVersion` e `getRotinaVersion`).
    - **Endpoints Fastify em Tempo Real e In-Place Anti-Spam (`server/index.js`)**: Implementação de Server-Sent Events em `GET /api/rotina/events` com broadcast instantâneo (< 15ms) para todas as abas do PWA; rota ultraleve `GET /api/rotina/version` com headers ETag (`304 Not Modified`) para economia de dados e revalidação de foco; e função `sincronizarMensagemAtivaTelegramInPlace` usando hash SHA-1 do conteúdo para atualizar mensagens ativas do bot via `editMessageText` sem spam ou erros 400.
    - **Registro de Mensagem Ativa no Bot (`src/07i_telegram_rotina_central.js`)**: Registro automático de `ROTINA_ACTIVE_MSG_<chatId>` ao renderizar ou alterar blocos no Telegram, permitindo que alterações feitas no Cockpit PWA reflitam instantaneamente na mensagem aberta no Telegram.
    - **Cliente Frontend PWA e Paridade Absoluta (`rotina_timeline.js` e `gh_cockpit_deploy/rotina_timeline.js`)**: Conexão EventSource SSE em `conectarSSE()`, listeners de ciclo de vida (`online`, `visibilitychange`, `focus`) com revalidação condicional ETag e paridade SHA-256 de 100% entre raiz e deploy estático.
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 19.48s** (`npm test`). Suíte direcionada `test_aba_rotina_sincronizacao_bidirecional.cjs` com 6/6 testes aprovados.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina: Pomodoro Inteligente com Persistência no IndexedDB e Sincronização Automática de Conclusão (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `tests/test_aba_rotina_cockpit.cjs`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Funções `iniciarPomodoroBloco`, `atualizarDisplayPomodoroCard`, `resetarPomodoroBloco` e integração com `UltraRotinaDB`
    - **Comportamento Esperado / Critério de Aceite**: Garantir que o timer Pomodoro dos blocos de estudo ativo (MedQuest e Anki) persista o tempo restante no IndexedDB/LocalStorage (sobrevivendo a recarregamentos de página ou troca de abas), dispare feedback háptico e sonoro beira-leito ao término do bloco, e ofereça botão de 1 toque para auto-concluir e sincronizar bidirecionalmente via Fastify e Telegram.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina: Notificações Push Locais e Alertas de Transição de Bloco** (`sw.js`, `gh_cockpit_deploy/sw.js`, `rotina_timeline.js`).
2. [ ] **Consolidação Final da Revisão de Protocolos Médicos nos Handlers e Parsers do Telegram** (`src/07f_telegram_calculadoras_parser.js`, `src/07b_telegram_preceptor.js`).
3. [ ] **Aba Rotina: Timeline Horizontal Mobile-First e Zoom de Alta Densidade** (`gh_cockpit_deploy/index.html`, `cockpit_movel.html`).

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 02 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 03 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 04 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.
- *Sugestão 05 (Aba Rotina / Notificações Nativas do Calendário)*: Alinhamento das descrições de alertas nativos do Google Calendar com links diretos para condutas da Sala Vermelha.

---
