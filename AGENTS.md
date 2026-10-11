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

# Diretrizes Oficiais: Os 2 Grandes Objetivos Estratégicos do Projeto

> 📦 **Nota de Backup**: As diretrizes anteriores de "Refatoração Contínua e Código Liso" estão preservadas e prontas para restauração a qualquer momento em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md).

## 🩺 Grande Objetivo 1: Excelência e Rigor do Conteúdo Clínico das Funções Existentes (Todas as Abas)

- **PROIBIÇÃO ESTRITA DE NOVAS FUNÇÕES OU ROTAS CLÍNICAS**:
  * A malha de navegação, arquitetura e interfaces clínicas existentes estão congeladas. Concentrar 100% dos esforços em aprofundar, enriquecer e calibrar o conteúdo médico retornado pelas funções que já existem em todas as abas do bot e do Cockpit:
    1. *Sala Vermelha*: DVA com diluições e fórmulas de vazão (mL/h), PCR/pós-PCR, choque séptico e CIRCI, crise hipertensiva, intubação SRI, CAD e DHE graves.
    2. *Consultas de Bolso & Farmacologia*: Apresentações exatas, diluições (SF 0,9% vs SG 5%), velocidade horária, tempo de infusão, ajustes por ClCr/TFG e compatibilidade em Y.
    3. *Ambulatório*: Alvos das diretrizes SBC, ADA, GOLD e GINA, associações farmacológicas de 1ª linha, critérios de encaminhamento e doses-alvo.
    4. *Ginecologia & Obstetrícia*: Protocolos de pré-natal, sulfato de magnésio (Zuspan/Pritchard) com vigilância, antimicrobianos seguros e condutas de sangramento.
    5. *Enfermaria & Leitos*: Hidratação basal, analgesia escalonada da OMS, profilaxia de TEV com enoxaparina ajustada ao risco e SBAR canônico.
    6. *Calculadoras*: Interpretações clínicas completas, alertas de corte e condutas imediatas atreladas ao resultado.
    7. *SOAP*: Semiologia médica real padrão PEP nos aparelhos do Objetivo (O) e receitas/prescrições completas no Plano (P).
- **Prescrição Canônica Pronta para Prontuário (PEP)**: Toda saída farmacológica deve ser entregue pronta para cópia direta (`[📋 Copiar para Prontuário]`), contendo apresentação exata, diluição, volume, velocidade horária em BIC, via e aprazamento.

## 📅 Grande Objetivo 2: Reestruturação, Organização e Integração Real da Aba Rotina

- **Eliminação da Desorganização e Layout Quebrado**:
  * Reorganizar e unificar a Aba Rotina (`#tab-rotina` no Cockpit PWA e Central de Rotina `/rotina` no Telegram Bot), entregando uma timeline de time-blocking limpa, moderna, funcional e intuitiva.
- **Integração Real com a Agenda Google (Google Calendar)**:
  * Substituir dependências legadas/órfãs de GAS CalendarApp por integração moderna em Node.js Fastify (Google Calendar API / Service Account / OAuth / iCal) para consumir, sincronizar e exibir eventos reais da agenda do médico no Cockpit PWA e no Telegram, eliminando telas desconectadas ou dados cegos.
- **Erradicação de Conteúdo Genérico e Mocks Estáticos**:
  * Eliminar dados fictícios, cartões estáticos e placeholders genéricos (ex: "Turma J", "Semana Ativa", blocos de estudo congelados).
  * Exibir a rotina médica viva do médico: escala de plantão/internato real, blocos de estudo ativo MedQuest e Anki personalizados, horários de treino/recuperação e compromissos sincronizados em tempo real.
- **Protocolo Mandatório de UX Beira-Leito (6 Pilares)**:
  1. *Navegação Contextual*: Botão `[🔙 Nome da Aba]` (retorno contextual ao submenu de origem) e `[🏠 Início]` em 1 toque em todas as telas, cards e calculadoras, eliminando telas órfãs ou retornos cegos à raiz.
  2. *Edição In-Place (`editMessageText`)*: Priorizar edição da mensagem existente em transições de teclado/menu, evitando flood de novas mensagens e rolagem infinita no chat do Telegram.
  3. *Determinismo 0ms*: Entregar condutas protocoladas, tabelas, kits de medicação e calculadoras instantaneamente em 0ms; reservar IA generativa exclusivamente para raciocínio clínico aberto e casos complexos.
  4. *Higienização de Teclados*: Eliminar botões fantasmas (`Gerar PDF`, `Ver critérios`), botões prematuros e menus redundantes.
  5. *Redação Semiológica Canônica*: Formatar textos de exame físico e condutas no padrão médico real de prontuário (PEP), sem frases burocráticas ou saudações prolixas.
  6. *Ação Rápida de Cópia*: Fornecer botão `[📋 Copiar para Prontuário]` ou `[📋 Copiar Prescrição]` em 1 toque em todas as saídas de conduta.
- **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**:
  * A busca por código limpo, conciso e elegante NUNCA, SOB HIPÓTESE ALGUMA, PODE REDUZIR, DILUIR OU DEGRADAR A QUALIDADE, O DETALHAMENTO, AS SALVAGUARDAS DE SEGURANÇA OU O RIGOR DO CONTEÚDO MÉDICO. Doses farmacológicas, limites de toxicidade, contraindicações, alertas sentinela, semiologia descritiva e evidências científicas canônicas são imutáveis e sagradas.
- **Execução Direcionada de Testes e Validação Completa (Test Sharding / Fast-Fail)**:
  * *Fase de Iteração (Fast-Fail / Test Sharding)*: Durante a escrita, refatoração e depuração de código, execute EXCLUSIVAMENTE a suíte de testes direcionada ao arquivo/módulo editado (ex: `node scripts/run_tests.cjs tests/test_sala_vermelha_ux.cjs`), obtendo feedback imediato em ~0.3s a 0.5s. É terminantemente proibido disparar a bateria completa repetidas vezes enquanto itera.
  * *Fase de Conclusão (Recibo de Estabilidade & Zero Regressões)*: Apenas quando todas as alterações de código e documentação da tarefa estiverem concluídas, dispare UMA ÚNICA vez a bateria completa de regressão (`npm test`) para certificar zero regressões e emitir o recibo oficial de estabilidade antes do commit final.
- **Alocação de Modelos**: O modelo Gemini Pro (`gemini-3.1-pro-high`) é reservado para auditoria e garantia da robustez de conteúdo clínico teórico. O Gemini Flash (`gemini-3.8-flash-high`) executa todas as demais tarefas (testes de funções, consertos de código, UI/UX, bot Telegram, Cockpit, Fastify e otimizações).
- **Redação Cirúrgica Obrigatória no PROGRESS.md**:
  * Toda tarefa movida para 'Próxima Tarefa em Andamento' ou inserida no '[Backlog Prioritário]' deve citar explicitamente:
    1. O caminho do arquivo alvo (ex: `src/02_nefrologia_dhe.js`, `src/12_experiencia_bot.js`).
    2. A função, método, componente ou rota a intervir.
    3. O critério de aceite objetivo (o que deve ser validado).
  * Tarefas vagas ("melhorar UI", "revisar rotas") são proibidas.


