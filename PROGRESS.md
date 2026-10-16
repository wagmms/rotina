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

- [x] **Recriação Integral da Aba de Rotina (v2.0) com Gemini 4 Argon: Radar "AGORA" em Tempo Real, Modo Plantão de Alto Contraste, Pomodoro Integrado, Gamificação de Metas R1 e Caderno de Dúvidas por Grande Área (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `cockpit_movel.html`, `gh_cockpit_deploy/index.html`, `tests/test_aba_rotina_cockpit.cjs`)**:
    - **Diagnóstico e Oportunidades**: A aba de rotina atuava de forma passiva, sem orientação em tempo real ("o que fazer agora?"), sem cronometragem de foco nos blocos de estudo e sem modo de emergência para uso em plantão.
    - **Implementação com Gemini 4 Argon**:
      1. *Radar "AGORA" & Relógio Vivo*: Indicador live do bloco atual com barra de decaimento percentual intra-bloco, relógio vivo e barra de progresso dos blocos do dia.
      2. *Modo Plantão Beira-Leito Ativo (Alto Contraste)*: Banner de emergência com 4 atalhos rápidos (`SRI/IOT`, `DVA/Bomba`, `Passar SBAR`, `+ Dúvida`) e layout de alto contraste ativado em 1 toque.
      3. *Pomodoro & Timer de Foco Integrado*: Cronômetro regressivo de 25m/50m nos cards de estudo MedQuest com alerta sonoro/haptic e botão `+10 Questões` direto no card.
      4. *Gamificação & Metas Diárias R1*: Contadores de 1 toque para Questões MedQuest, Flashcards Anki e Hidratação (ml).
      5. *Seletor de Visualização Trimodal*: Modos `Timeline` (padrão), `Modo Foco` (bloco em andamento/próximo) e `7 Dias` (panorama semanal de consistência).
      6. *Criação e Edição Rápida (+ Bloco)*: Modal autocontido para criar/editar blocos com ordenação horária automática e persistência offline-first.
      7. *Caderno de Dúvidas por Grande Área R1*: Classificação rápida por chips (Clínica, Cirurgia, Pediatria, GO, Preventiva).
      8. *Paridade Absoluta SHA-256*: Espelhamento 100% idêntico entre raiz e `gh_cockpit_deploy/`.
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 16.59s** via `npm test`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `gh_cockpit_deploy/rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Callbacks inline `rt_concluir:ID`, `rt_adiar:ID` e rota `/api/rotina/status`
    - **Comportamento Esperado / Critério de Aceite**: Ao interagir com o teclado inline do Telegram (`/rotina`), a alteração de status reflete instantaneamente no Cockpit PWA e vice-versa, sem inconsistências de cache.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `gh_cockpit_deploy/rotina_timeline.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Callbacks inline `rt_concluir:ID`, `rt_adiar:ID` e rota `/api/rotina/status`
    - **Comportamento Esperado / Critério de Aceite**: Ao interagir com o teclado inline do Telegram (`/rotina`), a alteração de status reflete instantaneamente no Cockpit PWA e vice-versa, sem inconsistências de cache.

2. [ ] **Aba Rotina — Notificações Nativas e Sentinela de Bloco no Cockpit (`gh_cockpit_deploy/rotina_timeline.js`, `sw.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/rotina_timeline.js` e `sw.js`
    - **Função/Componente/Seletor**: Função `notificarTransicaoBlocoPWA` via Notification API / Service Worker
    - **Comportamento Esperado / Critério de Aceite**: Disparar alerta visual suave no início de cada novo bloco (ex: 5 min antes do plantão ou da sessão MedQuest).

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
