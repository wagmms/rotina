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

- [x] **Saneamento de UX e Remoção de Funções Ruidosas: Erradicação de "Ouvir no Fone" (SOAP, Laudo de Imagem, Conversa Livre e Plantão) e Keep-Alive Nativo (`src/07c_telegram_consultas_e_ia.js`, `src/07e_telegram_midia_e_leitos.js`, `src/07a_telegram_router.js`, `tests/test_leitor_imagens_ostensivo.cjs`)**:
    - **Remoção de "Ouvir no Fone" no SOAP (`src/07c_telegram_consultas_e_ia.js`)**: Eliminação de botões de TTS nas Fases 1 (Rascunho) e 2 (Consolidado) do SOAP; reorganização do teclado em matriz simétrica 2x2 + 1 com `📋 Fechar Plano`, `🩺 EF Normal`, `🔬 Exames` e `🧹 Novo Paciente`.
    - **Limpeza nos Laudos de Imagem Médica (`src/07e_telegram_midia_e_leitos.js`)**: Remoção de `🎧 Ouvir no Fone` em laudos multimodais de ECG, Radiografia e Exames; teclado reestruturado com `➕ Incorporar ao SOAP`, `📁 Salvar no Notion` e `📋 Copiar Laudo`.
    - **Keep-Alive Nativo do Telegram (`src/07e_telegram_midia_e_leitos.js`)**: Substituição de mensagens de texto intermediárias pelo sinalizador nativo `enviarChatAction(chatId, "upload_photo")`, economizando requisições HTTP e eliminando poluição visual no chat.
    - **Saneamento em Conversas Livres e Passagem de Plantão (`src/07a_telegram_router.js`, `src/07c_telegram_consultas_e_ia.js`)**: Descarte de botão de TTS em respostas de dúvidas clínicas e passagens de plantão SBAR, mantendo apenas ações de alto valor (`📁 Salvar no Notion` e `👨‍⚕️ Pitch do Round`).
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 40.91s** (`npm test`). Zero regressões.

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
