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
- **Testes Sistemáticos de Todas as Funções**: A cada ciclo autônomo, testar metódica e exaustivamente as funções do bot, Cockpit e calculadoras clínicas (rodando e ampliando as suítes automatizadas `npm test` e scripts em `tests/`), verificando se todas as funções respondem corretamente, sem travamentos, exceções ou regressões.
- **Conserto, Otimização e Eficiência**: Qualquer inconsistência, quebra, lentidão ou atrito de usabilidade detectado deve ser corrigido de imediato, otimizando o código para torná-lo mais rápido, limpo e eficiente.
- **Preservação Absoluta da Qualidade Teórica e Clínica**: Otimizações de performance, melhorias de UX e refatorações NUNCA devem reduzir o rigor científico, os cálculos matemáticos/farmacológicos, as doses de segurança ou as diretrizes clínicas estabelecidas.
- **Registro de Sugestões para o Futuro**: Durante a análise e os testes das funções, o agente deve documentar ideias, oportunidades e melhorias futuras na seção dedicada `## 💡 Sugestões de Melhorias Futuras` no `PROGRESS.md`.
  * *Regra Estrita*: Tratar estritamente como sugestões documentadas para o futuro; NÃO implementar novas funcionalidades no código neste momento.
- **Alocação de Modelos**: O modelo Gemini Pro (`gemini-3.1-pro-high`) é reservado para auditoria e garantia da robustez de conteúdo clínico teórico. O Gemini Flash (`gemini-3.8-flash-high`) executa todas as demais tarefas (testes de funções, consertos de código, UI/UX, bot Telegram, Cockpit, Fastify e otimizações).

