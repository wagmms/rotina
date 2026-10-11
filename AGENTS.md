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

# Diretrizes Oficiais do Autoloop (Conserto de Erros, Otimização de Experiência e Testes Contínuos)

- **Foco Primário**: Conserto metódico de erros, eliminação de bugs e otimização profunda da experiência do usuário (UI/UX, agilidade, clareza e fluidez do bot do Telegram, Cockpit PWA e rotas Fastify).
- **Execução Direcionada de Testes e Validação Completa (Test Sharding / Fast-Fail)**:
  * *Fase de Iteração (Fast-Fail / Test Sharding)*: Durante a escrita, refatoração e depuração de código, execute EXCLUSIVAMENTE a suíte de testes direcionada ao arquivo/módulo editado (ex: `node scripts/run_tests.cjs tests/test_obstetricia_prenatal.cjs` ou `node tests/test_obstetricia_prenatal.cjs`), obtendo feedback imediato em ~0.3s a 0.5s. É terminantemente proibido disparar a bateria completa (`npm run test:all`) repetidas vezes enquanto itera.
  * *Fase de Conclusão (Recibo de Estabilidade & Zero Regressões)*: Apenas quando todas as alterações de código e documentação da tarefa estiverem concluídas, dispare UMA ÚNICA vez a bateria completa de regressão (`npm run test:all`) para certificar zero regressões e emitir o recibo oficial de estabilidade antes do commit final.
- **Conserto, Otimização e Eficiência**: Qualquer inconsistência, quebra, lentidão ou atrito de usabilidade detectado deve ser corrigido de imediato, otimizando o código para torná-lo mais rápido, limpo e eficiente.
- **Refatoração Contínua, Código Liso e Elegância Estrutural (Prioridade Mandatória)**:
  * Em todo ciclo autônomo, revisar ativamente o código das rotas e funções sob análise para desobstruir trechos truncados, lógicas espaguete e estruturas desnecessariamente pesadas ou confusas à toa.
  * Simplificar funções excessivamente longas, aninhamentos profundos e repetições de código, transformando-as em fluxos limpos, legíveis, fluidos ("lisos"), elegantes e arquiteturalmente organizados.
  * **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**: A busca por código limpo, conciso e elegante NUNCA, SOB HIPÓTESE ALGUMA, PODE REDUZIR, DILUIR OU DEGRADAR A QUALIDADE, O DETALHAMENTO, AS SALVAGUARDAS DE SEGURANÇA OU O RIGOR DO CONTEÚDO MÉDICO. Doses farmacológicas, limites de toxicidade, contraindicações, alertas sentinela, semiologia descritiva e evidências científicas canônicas são imutáveis e sagradas. O código deve ficar mais limpo, liso e ágil, mas a inteligência médica e a segurança beira-leito permanecem em nível máximo absoluto.
- **Preservação Absoluta da Qualidade Teórica e Clínica**: Otimizações de performance, melhorias de UX e refatorações NUNCA devem reduzir o rigor científico, os cálculos matemáticos/farmacológicos, as doses de segurança ou as diretrizes clínicas estabelecidas.
- **Registro de Sugestões para o Futuro**: Durante a análise e os testes das funções, o agente deve documentar ideias, oportunidades e melhorias futuras na seção dedicada `## 💡 Sugestões de Melhorias Futuras` no `PROGRESS.md`.
- **Matriz de Auditoria UX Beira-Leito (Protocolo das 6 Regras de Ouro em Todas as Abas)**:
  1. *Navegação Contextual*: Garantir botão `[🔙 Nome da Aba]` (retorno contextual ao submenu exato de origem) e `[🏠 Início]` em 1 toque em todas as telas, cards e calculadoras, eliminando telas órfãs ou retornos cegos à raiz.
  2. *Edição In-Place (`editMessageText`)*: Priorizar edição da mensagem existente em transições de teclado/menu, evitando flood de novas mensagens e rolagem infinita no chat do Telegram.
  3. *Determinismo 0ms*: Entregar condutas protocoladas, tabelas, kits de medicação e calculadoras instantaneamente em 0ms; reservar IA generativa exclusivamente para raciocínio clínico aberto e casos complexos.
  4. *Higienização de Teclados*: Eliminar botões fantasmas (`Gerar PDF`, `Ver critérios`), botões prematuros (ex: recalcular antes de prescrever) e menus redundantes ("outras opções" duplicando opções já visíveis).
  5. *Redação Semiológica Canônica*: Formatar textos de exame físico e condutas no padrão médico real de prontuário (PEP), sem frases burocráticas ("sem alterações relatadas") ou saudações prolixas.
  6. *Ação Rápida de Cópia*: Fornecer botão `[📋 Copiar para Prontuário]` ou `[📋 Copiar Prescrição]` em 1 toque em todas as saídas de conduta.
- **Alocação de Modelos**: O modelo Gemini Pro (`gemini-3.1-pro-high`) é reservado para auditoria e garantia da robustez de conteúdo clínico teórico. O Gemini Flash (`gemini-3.8-flash-high`) executa todas as demais tarefas (testes de funções, consertos de código, UI/UX, bot Telegram, Cockpit, Fastify e otimizações).
- **Redação Cirúrgica Obrigatória no PROGRESS.md**:
  * Toda tarefa movida para 'Próxima Tarefa em Andamento' ou inserida no '[Backlog Prioritário]' deve citar explicitamente:
    1. O caminho do arquivo alvo (ex: `src/07_telegram_handlers.js`, `cockpit_movel.html`, `server/routes/...`).
    2. A função, método, componente ou rota a intervir.
    3. O critério de aceite objetivo (o que deve ser validado).
  * Tarefas vagas ("melhorar UI", "revisar rotas") são proibidas.


