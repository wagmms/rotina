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

- [x] **Otimização de Baixa Latência do Bot Telegram com Gemini 4 Argon: Fast-Lane de Navegação, Persistência O(1) e Calibragem de Thinking Budget (`server/index.js`, `server/runtime.js`, `src/11_entrega_confiavel.js`, `src/04_motores_ia.js`, `ultra_rotina_master.js`)**:
    - **Diagnóstico e Causa Raiz**: Head-of-line blocking na fila do webhook com comandos e botões imediatos enfileirados atrás de LLMs pesadas; indentação de JSON com overhead de I/O em disco; recálculo O(n) e fatiamento herdado do GAS em `PersistenciaBot`; e thinking budget excessivo na anamnese do SOAP Fase 1.
    - **Correções Implementadas**:
      1. *Fast-Lane Prioritária*: Fila de webhook com priorização de comandos e botões imediatos de navegação rápida (`🚨 Sala Vermelha`, `/calc`, `/dva`, menus diretos), furando a fila sem esperar o término de chamadas de LLM.
      2. *Gravação Atômica Compacta*: Serialização direta via `JSON.stringify(valor)` em `escreverPropriedades()`, reduzindo ~40% do tamanho em disco e acelerando escritas atômicas.
      3. *Rastreamento O(1) e Bloco Único*: Cache incremental de bytes `_totalBytesCache`, gravação em pedaço único (`nPartes = 1`) no Node.js e cache de objetos `_objCache` com cópia profunda defensiva `structuredClone`.
      4. *Calibragem de Thinking Budget*: `thinkingBudget: 0` no SOAP Fase 1 (reduzindo TTFT em ~1.5-2s) e `thinkingBudget: 512` em imagens médicas multimodais.
      5. *Sincronia de Bundles*: Recompilação do master e verificação de hashes SHA-256 dos espelhos do Cockpit.
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 14.14s** via `npm test`. Código estável e zero regressões.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Ergonomia Mobile, Thumb-Zone de 42px e Foco Inteligente no Card Ativo (`gh_cockpit_deploy/rotina_timeline.js`, `rotina_timeline.js`, `gh_cockpit_deploy/index.html`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/rotina_timeline.js`, `rotina_timeline.js` e `gh_cockpit_deploy/index.html`
    - **Função/Componente/Seletor**: Função `criarCardBloco` (alvos de toque de 42px) e auto-scroll no card ativo (`scrollIntoView`)
    - **Comportamento Esperado / Critério de Aceite**: Elevar altura tátil mínima dos botões de ação para 42px (padrão Apple HIG / Material), isolar botão de pular e focar automaticamente o card em andamento ao carregar a aba.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `gh_cockpit_deploy/rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Callbacks inline `rt_concluir:ID`, `rt_adiar:ID` e rota `/api/rotina/status`
    - **Comportamento Esperado / Critério de Aceite**: Ao interagir com o teclado inline do Telegram (`/rotina`), a alteração de status reflete instantaneamente no Cockpit PWA e vice-versa, sem inconsistências de cache.

2. [ ] **Aba Rotina — Modo Plantão 24h & Alternância de Contraste Beira-Leito (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`, `rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Botão de alternância `#modo-plantao-toggle` e classe `.tema-plantao-urgente`
    - **Comportamento Esperado / Critério de Aceite**: Ativação com 1 toque de visual escuro de altíssimo contraste para uso em emergência/sala vermelha, priorizando blocos de DVA, SRI e acesso vascular sem rolagem.

3. [ ] **Aba Rotina — Gamificação & Consistência Visual de Streaks (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`, `rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Componente visual `#streak-semanal-banner` e função `RotinaService.calcularStreakSemanal`
    - **Comportamento Esperado / Critério de Aceite**: Exibir sequência ininterrupta de dias com metas de MedQuest e plantão cumpridas, aumentando a motivação diária de estudo.

4. [ ] **Aba Rotina — Pomodoro Integrado no Card de Estudo (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html` e `rotina_timeline.js`
    - **Função/Componente/Seletor**: Timer tátil `iniciarTimerPomodoroEstudo` no card de bloco MedQuest
    - **Comportamento Esperado / Critério de Aceite**: Cronômetro regressivo de 25 min/50 min com alerta sonoro suave e botão de conclusão imediata refletindo no Telegram.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 02 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 03 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 04 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.
- *Sugestão 05 (Aba Rotina / Notificações Nativas do Calendário)*: Alinhamento das descrições de alertas nativos do Google Calendar com links diretos para condutas da Sala Vermelha.

---
