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

- [x] **Pré-aquecimento do Contexto do Repositório (Prompt Caching / Context Caching) (`tooling/autoloop/core/task_context.py`, `tooling/autoloop/autoloop.py`, `tooling/autoloop/tests/test_task_context.py` e `tooling/autoloop/install.py`)**:
    - **Diagnóstico e Correção**:
      * Identificado que o autoloop injetava campos dinâmicos (`Objetivo Geral: ...`, `Tarefa selecionada: ...`) nas primeiras linhas do prompt do CLI, quebrando o cálculo de prefixo do Google Gemini e Claude Sonnet/Opus logo nos primeiros ~30 tokens e impedindo o reaproveitamento de cache para milhares de tokens estáticos de diretrizes.
      * Em `tooling/autoloop/core/task_context.py`: Criado cabeçalho inicial canônico imutável (`CANONICAL_PROMPT_CACHE_HEADER`, `obter_cabecalho_estatico_cache`) com mais de 5.000 caracteres (~1.300+ tokens estimados, superando o threshold de 1.024 tokens de Context Caching) contendo arquitetura Fastify/Render/Docker, Cockpit PWA, salvaguardas clínicas pétreas, regras ágeis, Single-Agent padrão, catálogo de subagentes e gates de qualidade (test sharding direcionado).
      * Em `tooling/autoloop/autoloop.py`: Refatorada `montar_prompt_ciclo` para fixar o cabeçalho canônico estático no topo (prefixo de cache 100% idêntico byte a byte em todas as tarefas) e alocar o escopo, squad, diretriz kaizen e tarefa ativa no sufixo dinâmico; adicionado indicador de Prompt Caching ativo no log do autoloop.
      * Em `tooling/autoloop/tests/test_task_context.py`: Criados testes unitários validando comprimento mínimo (>= 4.000 chars / >= 1.024 tokens), cláusulas obrigatórias e prefixo comum estritamente compartilhado entre tarefas distintas de diferentes escopos.
      * Instalação verificada via `tooling/autoloop/install.py` e atualizado `install_manifest.json`.
    - **Validação e Cobertura**: 100% aprovado nas suítes unitárias do autoloop (118/118 testes em 4.93s) e no runner oficial (`npm run test:autoloop`, 2/2 suítes em 7.24s).

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
