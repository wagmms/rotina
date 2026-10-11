# 📦 Backup das Diretrizes Oficiais do Autoloop (Conserto de Erros e Otimização de Experiência)

> **Data do Backup**: 11/10/2026  
> **Origem**: Seção `# Diretrizes Oficiais do Autoloop` de [AGENTS.md](file:///home/wagmoraes/Projetos%20IA/Rotina/AGENTS.md) e [PROGRESS.md](file:///home/wagmoraes/Projetos%20IA/Rotina/PROGRESS.md).  
> **Finalidade**: Este arquivo armazena a versão canônica das diretrizes de **Conserto de Erros, Otimização de Experiência (UI/UX) e Testes Contínuos**, preservada para restauração imediata sob solicitação do usuário.

---

## 1. Diretrizes no AGENTS.md (Versão Preservada)

```markdown
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
- **Registro Padronizado de Sugestões para o Futuro**: Durante a análise e testes de funções, o agente deve documentar ideias e oportunidades futuras diretamente na seção temática correspondente em `docs/SUGESTOES_FUTURAS.md`, utilizando estritamente o formato padrão (`- **Nome do Recurso** (*Área / Contexto*): Descrição clínica ou técnica objetiva.`). É proibido colar blocos de tarefas/progresso nesse arquivo. No `PROGRESS.md`, manter apenas o buffer leve com as 5 sugestões ativas mais prioritárias.
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
```

---

## 2. Cabeçalho de Diretrizes no PROGRESS.md (Versão Preservada)

```markdown
### STATUS: CONSERTO_ERROS_E_OTIMIZACAO_EXPERIENCIA

# 🛠️ Ultra Rotina — Conserto de Erros, Otimização da Experiência e Testes Contínuos

**DIRETRIZ ATUAL DO USUÁRIO (NOVO FOCO)**:
1. **Conserto de Erros e Estabilidade Total**: Foco absoluto em identificar, rastrear e consertar qualquer erro, bug, exceção ou inconsistência no bot do Telegram, no Cockpit PWA e no backend Fastify.
2. **Otimização Contínua da Experiência (UI/UX)**: Refinar a experiência prática de uso para torná-la ultra-ágil, intuitiva e sem atrito para o médico (respostas rápidas beira-leito, teclados limpos, menus objetivos e cópia de conduta facilitada).
3. **Refatoração Contínua e Código "Liso" (Elegância Estrutural)**: Revisar sistematicamente as funções analisadas em busca de simplificar trechos demasiadamente truncados à toa, eliminando lógicas espaguete, repetições e aninhamentos desnecessários. O código deve se tornar mais liso, mais bonito, mais limpo e organizado.
4. **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**: A simplificação e elegância do código NUNCA podem reduzir, diluir ou degradar a qualidade do conteúdo médico, doses, posologias, limites de toxicidade, alertas de segurança e diretrizes canônicas.
5. **Bateria Contínua de Testes de Todas as Funções**: Testar metódica e progressivamente todas as funções do sistema (função por função do bot, do Cockpit e calculadoras), executando suítes automatizadas e testes práticos para assegurar funcionamento 100% correto.
6. **Documentação de Sugestões para o Futuro**: Conforme as funções forem analisadas e testadas, registrar ideias de evolução e melhorias futuras na seção dedicada `## 💡 Sugestões de Melhorias Futuras` (exclusivamente como documentação de sugestões, sem desviar a execução para implementação de novas features agora).
```

---

## 3. Como Restaurar

Quando o usuário solicitar a restauração das diretrizes anteriores:
1. Substituir a seção `# Diretrizes Oficiais do Autoloop` em [AGENTS.md](file:///home/wagmoraes/Projetos%20IA/Rotina/AGENTS.md) pelo conteúdo da Seção 1 acima.
2. Atualizar o cabeçalho de [PROGRESS.md](file:///home/wagmoraes/Projetos%20IA/Rotina/PROGRESS.md) para `### STATUS: CONSERTO_ERROS_E_OTIMIZACAO_EXPERIENCIA` e restaurar o bloco de diretrizes da Seção 2 acima.
