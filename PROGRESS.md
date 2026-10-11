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

- [x] **Alocação Exclusiva de Luna para Revisões e Liberação de Deploy sem Cota do ChatGPT (`tooling/autoloop/core/model_router.py`, `tooling/autoloop/core/scoped_audit.py`, `tooling/autoloop/autoloop.py`)**:
    - **Luna para Todas as Revisões**: Toda matriz de rotas de auditoria migrada para a família Luna (`gpt-6-luna`), preservando 100% da cota externa de outros modelos.
    - **Deploy Desbloqueado com Cota Esgotada**: Auditoria que encontre esgotamento de cota do ChatGPT/Codex não suspende mais o deploy; emite aviso e autoriza o envio para produção imediatamente mantendo a integridade do código.
    - **Validação e Resultados**: 160/160 testes do autoloop e 49/49 suítes completas de testes no `npm test` aprovadas com zero regressões.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Reestruturação Visual no Cockpit PWA e Desmockagem da Timeline (`gh_cockpit_deploy/index.html`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html`
    - **Função/Componente/Seletor**: Container `#tab-rotina` e função `renderizarRotinaBlocos(blocos)`
    - **Comportamento Esperado / Critério de Aceite**: Substituir cards estáticos genéricos ("Turma J", "Semana Ativa", "Sangramento de 1º Trimestre") por layout limpo e responsivo de time-blocking, com cards visuais de blocos do dia (horário, atividade, categoria, status de execução, notas), ações rápidas (concluir, pular, descanso) e badge de sincronização com a agenda.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Rotas REST Fastify e Endpoint de Blocos e Status (`server/index.js`, `src/13_cockpit_integracao.js`)**:
    - **Arquivo/Módulo Alvo**: `server/index.js` e `src/13_cockpit_integracao.js`
    - **Função/Componente/Seletor**: Rotas Fastify `/api/rotina/blocos`, `/api/rotina/status` e função `cockpitPerfil`
    - **Comportamento Esperado / Critério de Aceite**: Criar rotas REST para ler, atualizar status de blocos e resetar a grade diária conectadas diretamente ao `RotinaService`, permitindo que o Cockpit PWA sincronize alterações em tempo real via HTTP/JSON.

2. [ ] **Aba Rotina — Integração Real com Google Calendar no Backend Node.js (`src/06_rotina_agenda.js`, `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/06_rotina_agenda.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `RotinaService.sincronizarComGoogleCalendar`, `detectarPlantaoStatus` e rota Fastify `/api/rotina/agenda/sync`
    - **Comportamento Esperado / Critério de Aceite**: Substituir dependência inoperante de `CalendarApp` (GAS) por conector moderno em Node.js (iCal / Google Calendar API) para consumir a agenda real do médico e sincronizar eventos de plantão, internato e rotina pessoal com precisão de minutos.

3. [ ] **Aba Rotina — Sincronização Bidirecional e Ações Rápidas no Telegram (`src/07g_telegram_ajuda_e_protocolos.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Handlers de `/rotina`, callbacks de transição de status e `RotinaService.formatarTimelineMarkdown`
    - **Comportamento Esperado / Critério de Aceite**: Atualizar o teclado inline e a formatação da timeline no Telegram para permitir marcar conclusão de bloco com 1 toque (in-place `editMessageText`), sincronizando o estado com o banco de dados e refletindo imediatamente no Cockpit PWA.

4. [ ] **Aba Rotina — Persistência Offline-First e Sincronização no Cockpit PWA (`gh_cockpit_deploy/index.html`, `gh_cockpit_deploy/sw.js`)**:
    - **Arquivo/Módulo Alvo**: `gh_cockpit_deploy/index.html` e `gh_cockpit_deploy/sw.js`
    - **Função/Componente/Seletor**: Armazenamento IndexedDB de rotina e fila de sincronização em segundo plano
    - **Comportamento Esperado / Critério de Aceite**: Salvar blocos do dia no IndexedDB local do navegador para renderização offline instantânea (0ms), sincronizando mutações pendentes com o backend Fastify assim que a conexão for restabelecida.

5. [ ] **Aba Rotina — Suíte de Testes Automatizados E2E e Resiliência da Rotina (`tests/test_aba_rotina_cockpit.cjs`, `tests/test_central_rotina_plantao_ux.cjs`)**:
    - **Arquivo/Módulo Alvo**: `tests/test_aba_rotina_cockpit.cjs` e `tests/test_central_rotina_plantao_ux.cjs`
    - **Função/Componente/Seletor**: Suíte de testes unitários e de integração
    - **Comportamento Esperado / Critério de Aceite**: Validar ciclo de vida completo dos blocos (carregamento, transição de status, modo descanso, sincronização de agenda e fallback offline) com execução em menos de 0.5s.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Notificações Push)*: Disparo de Web Push Notifications no Cockpit PWA 10 minutos antes do início de blocos críticos (ex: plantão, rodízio e bloco MedQuest).
- *Sugestão 02 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 03 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 04 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 05 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.

---
