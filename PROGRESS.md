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

- [x] **Plano Mestre Argon — Desacoplamento de IA, Hardening de Calculadoras e 4 Novos Domínios Puros via Gemini 4 Argon (`src/02_calculadoras_puras.js`, `src/04_motores_ia.js`, `src/07a_telegram_router.js`, `src/12_experiencia_bot.js`, `src/domain/*`)**:
    - **Diagnóstico e Causa Raiz**: Latência artificial de até 18s causada por chamadas síncronas de LLM em intenções de rotina/conversação e calculadoras; bugs silenciosos de limite em `02_calculadoras_puras.js` (`ReferenceError` em posologia pediátrica, tetos ausentes em bloqueadores de SRI, distorção de gotas de ibuprofeno e falha em `cha2ds2vasc`/`meld`); ausência de domínios determinísticos para diluição crítica, kits sindrômicos, checklists e remanejamento dinâmico de agenda.
    - **Correção Implementada pelo Gemini 4 Argon**:
      1. *Fase 1 (Hardening de Calculadoras)*: Correção de `bool()` com `{ opcional: true }` destravando `cha2ds2vasc`/`meld`; substituição de `entradaInvalida` por `falhaCtx`; proteção de idade nula em pediatria; correção de Ibuprofeno 50 mg/mL (2 gts/kg/dose = 10 mg/kg); teto diário de Amoxicilina para 3.000 mg/dia; tetos de SRI (succinilcolina 200 mg, rocurônio 120 mg); nota ATLS 10ª Ed em Parkland.
      2. *Fase 2 (Desacoplamento de IA & Latência Sub-50ms)*: Eliminada chamada síncrona a `_iaExecutar` em `classificarIntencaoMensagem` (classificador léxico determinístico com tokens críticos em Set e fallback 0ms para CONVERSA); despachos diretos em RAM para calculadoras e gasometria no router; memoização de nomes de fármacos.
      3. *Fase 3 (Domínios Puros & Apresentação via Gemini 4 Argon)*: Síntese completa dos 4 módulos de domínio em `src/domain/`: `DiluicaoInjetaveisDomain` (regras Trissel's, compatibilidade em Y), `PacotesSindromicosDomain` (5 kits de emergência, escore Centor/McIsaac, cópia PEP), `ChecklistClinicoDomain` (FAST-HUG SB, SBAR, Alta PS, Cirurgia OMS com bitmask binária < 64 bytes) e `TimeBlockingOptimizerDomain` (degradação graciosa com teto inegociável de sono às 22:30). Integração dos despachantes `ux:dil:`, `ux:kit:`, `ux:chk:` e `ux:tb:` em `src/12_experiencia_bot.js` e rotas no router.
    - **Recibo de Estabilidade**: Novas suítes unitárias aprovadas (`tests/test_calculadoras_puras_audit_argon.cjs`, `tests/test_novos_dominios_argon.cjs`, `tests/test_apresentacao_novos_dominios.cjs`); bateria de regressão oficial `npm test` (`node scripts/run_tests.cjs`) com **57/57 suítes aprovadas com 100% de sucesso em 18.73s**.

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
