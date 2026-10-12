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

- [x] **Aba Rotina — Reestruturação Visual no Cockpit PWA, Desacoplamento Modular e Quebra do Monolito (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `cockpit_movel.html`, `gh_cockpit_deploy/index.html`, `sw.js`, `gh_cockpit_deploy/sw.js`, `tests/test_aba_rotina_cockpit.cjs`)**:
    - **Desacoplamento Arquitetural & Quebra do Monolito**: Criado o módulo desacoplado `rotina_timeline.js` (com paridade em `gh_cockpit_deploy/`), extraindo a lógica da rotina do monolito para um arquivo atômico de alta manutenibilidade, integrado com Cache-First no Service Worker (`sw.js`).
    - **UI/UX Moderna de Time-Blocking**: Card hero com contadores do dia (`concluídos / total`), barra de progresso visual, filtros rápidos por categoria clínica (Plantão, MedQuest, Treino) e ações rápidas em 1 toque (Concluir, Adiar, Pular e Modo Descanso).
    - **Validação e Estabilidade**: 51/51 suítes aprovadas no `npm test` (incluindo `test_aba_rotina_cockpit.cjs`) e 160/160 testes do autoloop aprovados com zero regressões.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Rotas REST Fastify e Endpoint de Blocos e Status (`server/index.js`, `src/13_cockpit_integracao.js`)**:
    - **Arquivo/Módulo Alvo**: `server/index.js` e `src/13_cockpit_integracao.js`
    - **Função/Componente/Seletor**: Rotas Fastify `/api/rotina/blocos`, `/api/rotina/status` e função `cockpitPerfil`
    - **Comportamento Esperado / Critério de Aceite**: Criar rotas REST para ler, atualizar status de blocos e resetar a grade diária conectadas diretamente ao `RotinaService`, permitindo que o Cockpit PWA sincronize alterações em tempo real via HTTP/JSON.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Integração Real com Google Calendar no Backend Node.js (`src/06_rotina_agenda.js`, `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/06_rotina_agenda.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `RotinaService.sincronizarComGoogleCalendar`, `detectarPlantaoStatus` e rota Fastify `/api/rotina/agenda/sync`
    - **Comportamento Esperado / Critério de Aceite**: Substituir dependência inoperante de `CalendarApp` (GAS) por conector moderno em Node.js (iCal / Google Calendar API) para consumir a agenda real do médico e sincronizar eventos de plantão, internato e rotina pessoal com precisão de minutos.

2. [ ] **Aba Rotina — Sincronização Bidirecional e Ações Rápidas no Telegram (`src/07g_telegram_ajuda_e_protocolos.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Handlers de `/rotina`, callbacks de transição de status e `RotinaService.formatarTimelineMarkdown`
    - **Comportamento Esperado / Critério de Aceite**: Atualizar o teclado inline e a formatação da timeline no Telegram para permitir marcar conclusão de bloco com 1 toque (in-place `editMessageText`), sincronizando o estado com o banco de dados e refletindo imediatamente no Cockpit PWA.

3. [ ] **Aba Rotina — Persistência Offline-First e Fila de Sincronização no Cockpit PWA (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `gh_cockpit_deploy/sw.js`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js` e `gh_cockpit_deploy/sw.js`
    - **Função/Componente/Seletor**: Armazenamento IndexedDB de rotina e fila de sincronização em segundo plano
    - **Comportamento Esperado / Critério de Aceite**: Salvar blocos do dia no IndexedDB local do navegador para renderização offline instantânea (0ms), sincronizando mutações pendentes com o backend Fastify assim que a conexão for restabelecida.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Notificações Push)*: Disparo de Web Push Notifications no Cockpit PWA 10 minutos antes do início de blocos críticos (ex: plantão, rodízio e bloco MedQuest).
- *Sugestão 02 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 03 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 04 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 05 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.

---
