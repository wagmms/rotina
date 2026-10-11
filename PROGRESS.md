### STATUS: CONSERTO_ERROS_E_OTIMIZACAO_EXPERIENCIA

# 🛠️ Ultra Rotina — Conserto de Erros, Otimização da Experiência e Testes Contínuos

**DIRETRIZ ATUAL DO USUÁRIO (NOVO FOCO)**:
1. **Conserto de Erros e Estabilidade Total**: Foco absoluto em identificar, rastrear e consertar qualquer erro, bug, exceção ou inconsistência no bot do Telegram, no Cockpit PWA e no backend Fastify.
2. **Otimização Contínua da Experiência (UI/UX)**: Refinar a experiência prática de uso para torná-la ultra-ágil, intuitiva e sem atrito para o médico (respostas rápidas beira-leito, teclados limpos, menus objetivos e cópia de conduta facilitada).
3. **Refatoração Contínua e Código "Liso" (Elegância Estrutural)**: Revisar sistematicamente as funções analisadas em busca de simplificar trechos demasiadamente truncados à toa, eliminando lógicas espaguete, repetições e aninhamentos desnecessários. O código deve se tornar mais liso, mais bonito, mais limpo e organizado.
4. **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**: A simplificação e elegância do código NUNCA podem reduzir, diluir ou degradar a qualidade do conteúdo médico, doses, posologias, limites de toxicidade, alertas de segurança e diretrizes canônicas.
5. **Bateria Contínua de Testes de Todas as Funções**: Testar metódica e progressivamente todas as funções do sistema (função por função do bot, do Cockpit e calculadoras), executando suítes automatizadas e testes práticos para assegurar funcionamento 100% correto.
6. **Documentação de Sugestões para o Futuro**: Conforme as funções forem analisadas e testadas, registrar ideias de evolução e melhorias futuras na seção dedicada `## 💡 Sugestões de Melhorias Futuras` (exclusivamente como documentação de sugestões, sem desviar a execução para implementação de novas features agora).

---

## 🔄 Tarefa Concluída

- [x] **Agendamento LPT (Longest Processing Time First) no Runner de Testes (`scripts/run_tests.cjs` e `tests/test_autoloop_runner.cjs`)**:
    - **Diagnóstico e Correção**:
      * No escalonamento multiprocesso com `--jobs=4` (`runPool`), as suítes eram despachadas em ordem alfabética ou arbitrária, alocando suítes pesadas (3.6s, 2.4s, 1.4s) tardiamente no final da fila e deixando workers ociosos.
      * Em `scripts/run_tests.cjs`: Implementadas funções `loadSuiteDurations(root)` e `orderLPT(tasks, root)` que recuperam durações históricas de `.autoloop_test_receipt.json` / `data/test_reports/` e despacham as tarefas da mais longa para a mais rápida (com desempate alfabético determinístico).
      * Em `tests/test_autoloop_runner.cjs`: Adicionados testes de contrato validando a ordenação decrescente LPT e o desempate determinístico.
    - **Validação e Cobertura**: 100% aprovado no runner (`test_autoloop_runner.cjs`), na suíte de orquestração (128/128 testes) e na bateria oficial de testes (`npm test`, 49/49 suítes aprovadas em 8.21s com código estável).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `processarAudioMensagemTelegram`, `processarAudioClinicoMultimodal` e rota `/api/chat` com `audioBase64`
    - **Comportamento Esperado / Critério de Aceite**: Garantir que áudios clínicos (ditado de corredor, passagem de leito) com ruído, falha de rede ou codecs webm/ogg/mp3 recebam processamento resiliente com fallback transparente para transcrição e estruturação SOAP sem perda de termos médicos nem falha de processo.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot e Cockpit)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas e menus redundantes.
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva, eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]` / `[📋 Copiar SOAP para PEP]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [x] **Hub Consultas Rápidas de Bolso (`ux:hub:bolso`)**: Concluído (100% testado).
2. [x] **Hub Ambulatório & Atenção Primária (`ux:hub:amb`)**: Concluído (100% testado).
3. [x] **Calculadoras Clínicas & Escores (`ux:hub:calc`)**: Concluído (100% testado).
4. [x] **Hub Ginecologia & Obstetrícia (`ux:rotina:go`)**: Concluído (100% testado).
5. [x] **Gestão de Leitos, Passagem SBAR & Prescrição (`ux:hub:enf`)**: Concluído (100% testado).
6. [x] **Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**: Concluído (100% testado).
7. [x] **Sala Vermelha & Emergências Médicas (`ux:hub:sala`)**: Concluído (100% testado).
8. [x] **Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`)**: Concluído (100% testado).
9. [x] **Cockpit PWA Mobile & Sincronização em Tempo Real (`cockpit_movel.html`)**: Concluído (100% testado).
10. [x] **Auditoria de Resiliência de Payload e Sanitização das Rotas Fastify do Servidor (`server/index.js`, `server/validators.js` e `server/runtime.js`)**: Concluído (100% testado).
11. [x] **Motores de IA e Fallback Local (`src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`)**: Concluído (100% testado).
12. [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**: Validar processamento de áudio, ditado de corredor, tolerância a falhas na transcrição multimodal e fallback estruturado para SOAP.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 110 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 106 (Motores de IA / Cache de Respostas Determinísticas em Memória RAM com TTL Inteligente por CID-10)*: Implementar cache determinístico em memória de alta velocidade (LRU Cache com hashing SHA-256 do prompt clínico e normalização de termos) para condutas canônicas de alta incidência (ex: PCR/ACLS, Anafilaxia, AVC, Pré-Eclâmpsia Zuspan), permitindo respostas instantâneas em 0ms sem realizar requisições HTTP locais ou remotas durante picos de emergência no plantão.
- *Sugestão 107 (Motores de IA / Healthcheck Periódico Não-Bloqueante do Daemon Ollama Local)*: Implementar ping periódico a cada 60s em background (`/api/tags`) para aferir latência e aquecimento de modelos locais (Mistral/Llama 3/Qwen) no nó Ollama, mantendo um flag atômico de prontidão em RAM para evitar tentativas síncronas de conexão e timeouts desnecessários quando o daemon estiver pausado ou descarregado da GPU.
- *Sugestão 108 (Motores de IA / Fallback Multinível com Transição Fluida para Modelos Locais Quantizados 4-bit)*: Adicionar perfil de contingência com modelos ultraleves quantizados GGUF (ex: Qwen 2.5 3B ou Llama 3.2 1B em 4 bits) otimizados para execução ultrarrápida em CPUs com baixo consumo de memória RAM (< 2 GB), viabilizando inferência médica offline completa mesmo em servidores hospitalares modestos ou notebooks de plantão sem GPU dedicada.
- *Sugestão 109 (Test Sharding & Watcher Inteligente / Execução Automática por Diff do Git)*: Implementar modo observador (`--watch-diff` no runner de testes) que detecta arquivos modificados via `git status -s` e mapeia automaticamente as suítes de teste unitárias afetadas em tempo real (ex: edição em `src/03_obstetricia.js` aciona imediatamente apenas `tests/test_obstetricia_prenatal.cjs` em background com debouncing de 300ms), proporcionando feedback contínuo instantâneo com zero intervenção manual do desenvolvedor.
- *Sugestão 110 (Autoloop / Telemetria Econômica de Custo por Token Cacheado vs Token Novo no Relatório Diário)*: Adicionar cálculo do valor financeiro economizado (em dólares e reais) a partir do diferencial de custo de Prompt Caching dos provedores (desconto de até 75% a 90% para Cache Read Tokens no Gemini e Claude), exibindo no relatório noturno ou sumário do Telegram o ganho financeiro direto obtido pela arquitetura de pré-aquecimento de contexto.

---
