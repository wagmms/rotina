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

- [x] **Auditoria de Resiliência de Payload e Sanitização das Rotas Fastify do Servidor (`server/index.js`, `server/validators.js` e `server/runtime.js`)**:
    - **Diagnóstico e Correção**:
      * Em `server/validators.js`: Adicionados novos limites fisiológicos a `LIMITES_FISIOLOGICOS` (temperatura 30-44°C, glicemia 10-2000 mg/dL, lactato 0.1-35 mmol/L, plaquetas 1.000-2.000.000/mm³, leucócitos 100-300.000/mm³ e hemoglobina 1.0-25.0 g/dL); implementada validação hemodinâmica estrita no CURB-65 (rejeitando PAS < PAD) e validação de inteiros no Glasgow-P e HEART Score; criado e exportado `chatBodySchema` para validação em handshake do endpoint `/api/chat`.
      * Em `server/runtime.js`: Blindado `cockpitRpc` contra prototype pollution com validação estrita de `metodo` (rejeitando strings vazias, tipos não-string e propriedades reservadas `__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`) e verificação `hasOwnProperty` em `ctx`.
      * Em `server/index.js`: Implementado endpoint REST dedicado `/api/chat` com schema Ajv e preValidation defensivo; adicionado helper `ehErroAutenticacaoOuSessao` com regex uniforme para status 401 em sessões ausentes, inválidas ou expiradas em `/api/cockpit`, `/api/calcular` e `/api/chat`; adicionada sanitização de mensagens de erro com `sanitizarMensagemErro` para evitar vazamento de stacktrace ou caminhos internos nos status 400, 401 e 500; adicionado tratamento explícito para HTTP 413 (Payload Too Large).
    - **Validação e Cobertura**: 100% aprovado na suíte expandida `tests/test_fastify_resiliencia_payloads.cjs` (11/11 blocos), além de 100% de sucesso nas suítes `test_schemas_validacao_calculadoras.cjs`, `test_fastify_resiliencia.cjs`, `test_server_render.cjs`, `test_caching_etag_fastify.cjs` e `test_seguranca_helmet_ratelimit.cjs`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Motores de IA e Fallback Local (`src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `_iaChamarOllamaNativo`, `executarFallbackLocalOffline` e timeout com fast-ack em caso de indisponibilidade da API Gemini
    - **Comportamento Esperado / Critério de Aceite**: Garantir que timeouts e indisponibilidades transitórias dos modelos Gemini disparem fallback automático e transparente para inferência local Ollama/Mistral sem travar o bot nem degradar as condutas médicas.

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
11. [ ] **Motores de IA e Fallback Local (`src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`)**: Validar timeout resiliente, Fast-Ack e respostas determinísticas locais em caso de indisponibilidade da API do Gemini.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 105 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 101 (Cockpit PWA / Gestos de Swipe para Ações Rápidas nos Leitos e Calculadoras)*: Implementar suporte a gestos touch nativos (`touchstart`/`touchend` com feedback haptic) para que o médico possa deslizar o card de um leito para a direita para marcar como 'Estável' ou para a esquerda para abrir o modal SBAR em 1 gesto rápido durante o round.
- *Sugestão 102 (Cockpit PWA / Exportação do Histórico de Cálculos do Plantão em CSV/JSON Criptografado)*: Adicionar botão de exportação segura do histórico de cálculos do plantão para auditoria médica local ou registro em prontuário eletrônico hospitalar, permitindo download direto com sanitização de identificadores conforme a LGPD.
- *Sugestão 103 (Cockpit PWA / Atalhos de Teclado Físico para Uso em Tablet e Desktop Hospitalar)*: Implementar atalhos globais de teclado (ex: `Alt+1` para Leitos, `Alt+2` para Cálculos, `Alt+3` para Farmacologia, `Ctrl+K` para busca universal e `Esc` para fechar modais) para médicos que utilizam o Cockpit em estações de trabalho de enfermagem ou tablets acoplados com teclado.
- *Sugestão 104 (Cockpit PWA / Modo Alto Contraste Solar para Atendimento Pré-Hospitalar & SAMU)*: Criar modo visual com fundo branco puro, tipografia em preto sólido e bordas reforçadas para uso sob luz solar intensa em viaturas de resgate ou atendimento de rua, mantendo alternância em 1 toque com o tema dark hospitalar padrão.
- *Sugestão 105 (Fastify / Rate-Limiting Dinâmico por IP com Whitelist para Redes Hospitalares)*: Implementar rate-limiting adaptativo na camada Fastify capaz de identificar sub-redes hospitalares internas e IPs corporativos de postos de enfermagem via cabeçalho `X-Forwarded-For` validado, aplicando limites diferenciados e evitando falsos-positivos de bloqueio 429 durante picos de triagem e admissão de múltiplos leitos simultâneos no mesmo terminal.

---
