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

# Diretrizes Oficiais do Autoloop (Refatoração Contínua e Código "Liso" - Elegância Estrutural)

> 📦 **Nota de Backup**: As diretrizes anteriores de "Conserto de Erros e Otimização de Experiência" estão preservadas e prontas para restauração a qualquer momento em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](file:///home/wagmoraes/Projetos%20IA/Rotina/docs/BACKUP_DIRETRIZES_AUTOLOOP.md).

- **Foco Primário Absoluto**: Refatoração Contínua e Código "Liso" (Elegância Estrutural). Concentrar todas as energias em:
  1. Simplificar funções longas e pesadas, decompondo-as em fluxos modulares e objetivos.
  2. Remover aninhamentos profundos (*early returns*, *guard clauses* e redução de complexidade ciclomática).
  3. Desobstruir lógicas espaguete e eliminar repetições de código, garantindo manutenibilidade e clareza.
  4. Tornar o código limpo, elegante, modular, legível e fluido ("liso"), sem construções truncadas desnecessárias.
- **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**:
  * A busca por código limpo, conciso e elegante NUNCA, SOB HIPÓTESE ALGUMA, PODE REDUZIR, DILUIR OU DEGRADAR A QUALIDADE, O DETALHAMENTO, AS SALVAGUARDAS DE SEGURANÇA OU O RIGOR DO CONTEÚDO MÉDICO.
  * Doses farmacológicas, limites de toxicidade, contraindicações, alertas sentinela, semiologia descritiva e evidências científicas canônicas são imutáveis e sagradas. O código deve ficar mais limpo, liso e ágil, mas a inteligência médica e a segurança beira-leito permanecem em nível máximo absoluto.
- **Execução Direcionada de Testes e Validação Completa (Test Sharding / Fast-Fail)**:
  * *Fase de Iteração (Fast-Fail / Test Sharding)*: Durante a refatoração de código, execute EXCLUSIVAMENTE a suíte de testes direcionada ao arquivo/módulo editado (ex: `node scripts/run_tests.cjs tests/test_modulo.cjs` ou `node tests/test_modulo.cjs`), obtendo feedback imediato em ~0.3s a 0.5s. É terminantemente proibido disparar a bateria completa (`npm run test:all`) repetidas vezes enquanto itera.
  * *Fase de Conclusão (Recibo de Estabilidade & Zero Regressões)*: Apenas quando todas as alterações de código e documentação da tarefa de refatoração estiverem concluídas, dispare UMA ÚNICA vez a bateria completa de regressão (`npm run test:all`) para certificar zero regressões e emitir o recibo oficial de estabilidade antes do commit final.
- **Alocação de Modelos**: O modelo Gemini Flash (`gemini-3.8-flash-high`) executa as tarefas de refatoração de código, simplificação de estruturas e testes direcionados; o Gemini Pro (`gemini-3.1-pro-high`) é reservado para auditoria e garantia da robustez de conteúdo clínico teórico.
- **Redação Cirúrgica Obrigatória no PROGRESS.md**:
  * Toda tarefa movida para 'Próxima Tarefa em Andamento' ou inserida no '[Backlog Prioritário]' deve citar explicitamente:
    1. O caminho do arquivo alvo (ex: `src/07e_telegram_midia_e_leitos.js`, `server/routes/...`).
    2. A função, método, componente ou rota a intervir.
    3. O critério de aceite objetivo (o que foi simplificado e como foi validado).
  * Tarefas vagas ("melhorar UI", "revisar rotas") são proibidas.


