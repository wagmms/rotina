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

- [x] **Atenção Primária / Ambulatório — Destaque Determinístico REMUME-RP e Ponte 1-Toque para Receita em PDF & Bloco SOAP (`src/03_bases_locais.js`, `src/07c_telegram_consultas_e_ia.js`, `src/07d_telegram_callbacks.js`, `scripts/test_manifest.json`, `tests/test_remume_soap_pdf_integracao.cjs`)**:
    - **Diagnóstico e Causa Raiz**: Ausência de identificação direta da padronização municipal de Ribeirão Preto (`REMUME_RP.csv`) nas consultas posológicas ambulatoriais no bot Telegram; falta de conexão fluida entre a dosagem consultada e a emissão documental (PDF) ou transcrição para o prontuário eletrônico (SOAP/PEP); risco de falsos negativos em buscas com sais farmacêuticos (`cloridrato`, `sodica`, `maleato`) e de rejeição de receitas no parser regex caso houvesse palavras soltas na posologia.
    - **Correção Implementada**: Criadas em `src/03_bases_locais.js` as funções canônicas `obterItensRemumeRP`, `normalizarPrincipioAtivo` e `consultarRemumeRP`, com resolução de sinônimos comerciais (`DICIONARIO_FARMACO`), normalização de sais e precedência de monoterapias antes de associações; inseridos selos visuais `🟢 [REMUME-RP]` com apresentações da rede nas fichas HSL e PedBook; implementado em `src/07c_telegram_consultas_e_ia.js` o helper `montarRascunhoRxESoapAmbulatorial` gerando botões inline com callbacks < 64 bytes (`gerarPdfRx_<hash>` [43B] e `ux:copiar:<hash>` [42B]) e rascunhos pré-salvos com o prefixo canônico `Posologia: <dose>` aprovados sem restrição em `validarReceitaTemMedicamentos`; ajustado `src/07d_telegram_callbacks.js` com delegação defensiva para `tratarCallbackUX`; criada suíte `tests/test_remume_soap_pdf_integracao.cjs` com 10 testes rigorosos e incorporada ao baseline oficial permanente em `scripts/test_manifest.json`.
    - **Recibo de Estabilidade**: `node scripts/check_syntax.cjs` e `python3 build_master.py` 100% íntegros; suíte completa de regressão `npm test` aprovada com 57/57 suítes verdes (100% de aprovação) em 17.33s com código estável.

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
