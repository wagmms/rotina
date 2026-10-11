# Orientações do projeto

- Responda sempre em português. Corrija o inglês do usuário somente quando solicitado.
- No bot médico, a prioridade obrigatória é a qualidade do conteúdo clínico. Não implemente ganhos de velocidade ou custo que reduzam essa qualidade.
- Preserve informações clínicas relevantes, verificações de segurança e rastreabilidade das fontes. Mudanças de modelo, raciocínio ou contexto exigem evidência de que não degradam a qualidade; passar em testes com respostas simuladas não demonstra equivalência clínica.

# Arquitetura Oficial e Proibição Absoluta de Google Apps Script (GAS)

- **Google Apps Script Está Descontinuado**: O projeto NÃO utiliza mais Google Apps Script. É TERMINANTEMENTE PROIBIDO propor, criar, modificar ou fazer deploy de código para Google Apps Script (`.gs`, `clasp`, `gas_deploy/`, `scripts/voos_gas/`, `ultra_rotina_gas.js`, triggers do ScriptApp ou `appsscript.json`).
- **Backend Oficial de Produção**: O backend oficial é uma aplicação **Node.js 20+ (Fastify)** estruturada em `server/` e inicializada por [server.js](file:///home/wagmoraes/Projetos%20IA/Rotina/server.js).
- **Hospedagem e Deploy**: O backend roda em contêiner Docker ([Dockerfile](file:///home/wagmoraes/Projetos%20IA/Rotina/Dockerfile)) hospedado no **Render**. O deploy é realizado automaticamente via Git (`git push origin main`), NUNCA via clasp.
- **Frontend Cockpit PWA**: Front-end estático hospedado no GitHub Pages ([gh_cockpit_deploy](file:///home/wagmoraes/Projetos%20IA/Rotina/gh_cockpit_deploy)), comunicando-se diretamente com a API do Render.
- **Regras de Negócio e Lógica Clínica**: Ficam centralizadas em `src/` e são executadas em memória de altíssima velocidade pelo runtime Node.js ([server/runtime.js](file:///home/wagmoraes/Projetos%20IA/Rotina/server/runtime.js)).
- **Diretórios e Arquivos Legados Congelados**: As pastas `gas_deploy/`, `scripts/voos_gas/` e os scripts que mencionavam clasp são legados estritamente congelados. Nunca modifique esses arquivos nem direcione lógica nova para eles.

# Diretriz Estratégica Absoluta do Autoloop: Desenvolvimento Integral da Aba Rotina

> 📦 **Nota de Backup**: As diretrizes anteriores de "Excelência e Rigor do Conteúdo Clínico" e "Refatoração Contínua" estão preservadas e prontas para restauração a qualquer momento em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md).

## 📅 OBJETIVO PRIORITÁRIO ÚNICO: DESENVOLVIMENTO INTEGRAL DA ABA ROTINA

O autoloop agora concentra **100% dos seus esforços, ciclos e capacidade de execução** no desenvolvimento, modernização e integração da **Aba Rotina** em todo o ecossistema (Cockpit PWA, backend Fastify e bot Telegram). Não há necessidade de conservadorismo: interfaces, contratos de dados, componentes e automações podem ser profundamente remodelados.

### 🎯 Os 5 Pilares de Desenvolvimento da Aba Rotina:

1. **Reestruturação Visual & UI/UX Moderna no Cockpit PWA (`gh_cockpit_deploy/index.html`)**:
   - Modernizar totalmente a interface da aba `#tab-rotina`.
   - Desenvolver uma timeline de *time-blocking* visual, responsiva, fluida e elegante.
   - Cards visuais dinâmicos para cada bloco do dia (horário, atividade, categoria, status de execução, notas).
   - Ações rápidas interativas em 1 toque (concluir bloco, adiar, pular, ativar modo descanso).
   - Indicadores visuais claros de sincronização com a agenda e status em tempo real.

2. **Erradicação Total de Conteúdo Genérico e Mocks Estáticos**:
   - Eliminar dados fictícios, textos hardcoded e placeholders estáticos ("Turma J", "Semana Ativa", blocos de estudo congelados).
   - Exibir e manipular a rotina viva do médico: blocos de rodízio/plantão, blocos de estudo ativo (MedQuest e Anki), horários de treino/recuperação e compromissos dinâmicos.

3. **Integração Real com Agenda Google (Google Calendar) no Backend Fastify (`src/06_rotina_agenda.js`, `server/index.js`)**:
   - Eliminar definitivamente chamadas órfãs de GAS `CalendarApp`.
   - Implementar integração moderna e nativa em Node.js (iCal / Google Calendar API / Service Account) para consumir e sincronizar eventos reais da agenda do médico.
   - Expor endpoints REST Fastify dedicados (`/api/rotina/blocos`, `/api/rotina/status`, `/api/rotina/agenda/sync`, `/api/rotina/resumo`).

4. **Automação e Sincronização Bidirecional no Telegram (`src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`)**:
   - Modernizar a Central de Rotina (`/rotina`, `/agenda`) com teclados inline ágeis e edição de mensagem in-place (`editMessageText`).
   - Sincronização em 2 vias: alterações de blocos feitas no Telegram refletem instantaneamente no Cockpit PWA e vice-versa.
   - Automação inteligente do ciclo autônomo (Briefing Matinal, Check-in Noturno e Sentinela de Hábitos) consumindo os blocos reais da timeline.

5. **Persistência Resiliente e Modo Offline-First (IndexedDB)**:
   - Persistir o estado dos blocos localmente no Cockpit PWA com IndexedDB/LocalStorage, garantindo uso instantâneo e offline beira-leito.
   - Sincronizar automaticamente as alterações quando a conexão com o backend Fastify for restabelecida.

---

## 🛡️ Cláusulas de Segurança e Engenharia de Software

- **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**:
  * As funções clínicas consolidadas de outras abas (Sala Vermelha, Nefrologia, Obstetrícia, Pediatria, etc.) são imutáveis e protegidas. Nenhuma refatoração da aba rotina pode alterar fórmulas, doses, limites de toxicidade ou salvaguardas médicas dessas funções.
- **Execução Direcionada de Testes e Validação Completa (Test Sharding / Fast-Fail)**:
  * *Fase de Iteração (Fast-Fail / Test Sharding)*: Durante o desenvolvimento e refatoração, execute EXCLUSIVAMENTE a suíte de testes direcionada ao módulo editado (ex: `node scripts/run_tests.cjs tests/test_central_rotina_plantao_ux.cjs`), obtendo feedback imediato em ~0.3s a 0.5s. Proibido rodar a bateria completa repetidas vezes enquanto itera.
  * *Fase de Conclusão (Recibo de Estabilidade & Zero Regressões)*: Apenas quando as alterações da tarefa estiverem concluídas, dispare UMA ÚNICA vez a bateria completa de regressão (`npm test`) para certificar zero regressões e emitir o recibo oficial de estabilidade antes do commit final.
- **Redação Cirúrgica Obrigatória no PROGRESS.md**:
  * Toda tarefa em andamento ou no backlog deve citar explicitamente:
    1. Arquivo/Módulo Alvo relativo.
    2. Função/Componente/Seletor exato de intervenção.
    3. Comportamento Esperado / Critério de Aceite objetivo e verificável.


