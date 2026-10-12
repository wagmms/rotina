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

- [x] **Ambulatório & SOAP — Filtro Contextual Anti-Poluição e Integração com Consultório APS (`gh_cockpit_deploy/index.html`, `cockpit_movel.html`, `tests/test_cockpit_soap_modais_responsividade.cjs`)**:
    - **Filtro Contextual Anti-Poluição**: Barra seletora tátil em 5 contextos (`Todos`, `Ambulatório`, `Emergência`, `Materno`, `PEP`) eliminando a desordem visual de 21 botões misturados, com persistência da preferência em `localStorage` (`rotina_soap_filtro_acoes`).
    - **Atalho Rápido 'Consultório APS'**: Botão de acesso em 1 toque no cabeçalho do Copiloto Clínico ao lado de `Copiar PEP`, abrindo diretamente o prontuário ambulatorial ágil.
    - **Sincronização Bidirecional & Copiar PEP**: O SOAP gerado no modal reflete imediatamente no `#soap-integral` e no status da tela principal; a função `copiarSOAPProntuario()` agora conta com fallback seguro para copiar prontuários originados tanto no chat do Telegram quanto no modal ambulatorial.
    - **Validação e Zero Regressões**: Suíte `tests/test_cockpit_soap_modais_responsividade.cjs` expandida (0.42s), paridade estrita SHA-256 e aprovação global de 51/51 suítes íntegras no `npm test` em 9.76s.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina — Sincronização Bidirecional e Ações Rápidas no Telegram (`src/07g_telegram_ajuda_e_protocolos.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07g_telegram_ajuda_e_protocolos.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Handlers de `/rotina`, callbacks de transição de status `rotina:check:*` e `RotinaService.formatarTimelineMarkdown`
    - **Comportamento Esperado / Critério de Aceite**: Atualizar o teclado inline e a formatação da timeline no Telegram para permitir marcar conclusão de bloco com 1 toque (in-place `editMessageText`), sincronizando o estado com o banco de dados e refletindo imediatamente no Cockpit PWA.

---

## 📋 Backlog Prioritário: Desenvolvimento Integral da Aba Rotina

1. [ ] **Aba Rotina — Persistência Offline-First e Fila de Sincronização no Cockpit PWA (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `gh_cockpit_deploy/sw.js`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js` e `gh_cockpit_deploy/sw.js`
    - **Função/Componente/Seletor**: Armazenamento IndexedDB de rotina e fila de sincronização em segundo plano
    - **Comportamento Esperado / Critério de Aceite**: Salvar blocos do dia no IndexedDB local do navegador para renderização offline instantânea (0ms), sincronizando mutações pendentes com o backend Fastify assim que a conexão for restabelecida.

2. [ ] **Aba Rotina — Painel de Estatísticas e Aderência Semanal (`rotina_timeline.js`, `src/06_rotina_agenda.js`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js` e `src/06_rotina_agenda.js`
    - **Função/Componente/Seletor**: Função `calcularAderenciaSemanal` e componente de resumo no topo da aba rotina
    - **Comportamento Esperado / Critério de Aceite**: Exibir percentual real de blocos cumpridos na semana e indicadores visuais de rodízio/estudo ativo.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Notificações Push)*: Disparo de Web Push Notifications no Cockpit PWA 10 minutos antes do início de blocos críticos (ex: plantão, rodízio e bloco MedQuest).
- *Sugestão 02 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 03 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 04 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 05 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.

---
