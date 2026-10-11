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

- [x] **Auditoria e Otimização da Sala Vermelha & Emergências Médicas (`ux:hub:sala`, `ux:hub:emerg`, `src/12_experiencia_bot.js`, `src/02_emergencia_choque_septico_circi.js`, `src/02_emergencia_crise_hipertensiva.js`, `src/02_pcr_gestante.js`, `src/07a_telegram_router.js`, `src/07d_telegram_callbacks.js`, `src/07g_telegram_ajuda_e_protocolos.js` e `tests/test_sala_vermelha_ux.cjs`)**:
    - **Diagnóstico e Causa Raiz**: O protocolo de PCR na gestante acessava propriedade inexistente (`viaAerea.recomendacao`), gerando `undefined` no bot; faltava formatação Telegram em choque séptico e persistência em cache nos comandos `/choqueseptico`, `/dva` e `/sri`; callbacks de retorno misturavam `ux:sala` e `ux:hub:sala`; atalhos de 1 toque de PALS (`pals_10kg`, `pals_20kg`) não eram interceptados; e `/crisehas` não estava mapeado no roteador.
    - **Determinismo 0ms e Protocolos Beira-Leito**: Respostas instantâneas em 0ms sem IA generativa para 100% dos protocolos: PCR em 4 tempos (ritmos chocáveis, não chocáveis, gestante com DULE/cesariana aos 4 min, PALS dosado por peso, drogas e cuidados pós-RCE), Arritmias (instável/CVE, TSV, TV, FA, Bradicardias), Choque Séptico/CIRCI (Hidrocortisona e Vasopressina com Nora ≥ 0,25 mcg/kg/min), Crise HAS, Glasgow com alerta de via aérea (≤ 8) e DVA rápida com compatibilidade em Y.
    - **Navegação Contextual e Ação de Cópia**: Garantidos botões `[🔙 Sala Vermelha]` (`ux:sala` / `ux:hub:sala`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos e comandos de emergência, eliminação absoluta de botões fantasmas e inclusão de botão de 1 toque `[📋 Copiar para Prontuário]` (`ux:copiar:<uuid>`) persistido em cache.
    - **Validação e Cobertura**: 100% aprovado na suíte `tests/test_sala_vermelha_ux.cjs` (10 blocos cobrindo 100% dos critérios) e recompilado `ultra_rotina_master.js` com sintaxe JS 100% OK.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização do Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`)**:
    - **Arquivo/Módulo Alvo**: `src/02_soap_ambulatorial.js`, `src/12_experiencia_bot.js`, `src/07c_telegram_consultas_e_ia.js` e `src/10_pdf_receita.js`
    - **Função/Componente/Seletor**: Funções `iniciarModoBot` (modo 'soap'), `processarEntradaSoap`, `formatarRascunhoSoapTelegram`, botões `ux:soap:plano`, `ux:soap:ef_normal`, `ux:soap:atualizar` e comando `/receita`
    - **Comportamento Esperado / Critério de Aceite**: Garantir preenchimento e revisão de SOAP em 1 toque sem perda de contexto entre Fases 1 e 2, atalho imediato `[📋 Copiar SOAP para PEP]`, inserção determinística de EF normal estruturado por aparelho, eliminação de formulários órfãos e teclado de retorno contextual para `[🔙 Ambulatório]` (`ux:hub:amb`) e `[🏠 Início]` (`ux:hub:inicio`).

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas (`Gerar PDF` inútil em emergência, etc.) e menus redundantes ("outras opções" duplicando opções já visíveis).
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva (sem "alterações não relatadas"), eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [x] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**: Concluído com 100% dos submódulos validados (`atb`, `ped`, `gestacao`, `interacao`, `hsl`), retorno contextual, determinismo 0ms e botão de cópia.
2. [x] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**: Concluído com 100% dos submódulos validados (`soap`, `remume`, `cid`, `atestado`), retorno contextual `[🔙 Ambulatório]`, determinismo 0ms e cópia para o PEP.
3. [x] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc` e Cockpit)**: Concluído com 100% das 6 calculadoras principais, retorno contextual `[🔙 Calculadoras]`, Fastify schemas sanitizados, Parkland e Glasgow no Cockpit PWA e botão de cópia ````text`.
4. [x] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`)**: Concluído com 100% dos 10 submódulos validados, retorno contextual `[🔙 Hub G&O]` e `[🏠 Início]`, respostas determinísticas em 0ms e botão de cópia de conduta.
5. [x] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**: Concluído com 100% dos fluxos validados (painel, censo, leito individual, evolução, alta segura, ditado por voz e SBAR), respostas determinísticas em 0ms e botão `[📋 Copiar Conduta/Passagem para Prontuário]`.
6. [x] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**: Concluído com 100% dos fluxos validados (agenda hoje/amanhã, tarefas do Notion, briefing matinal, check-in noturno e debriefing de plantão), respostas determinísticas em 0ms e botão `[📋 Copiar Resumo do Plantão]`.
7. [x] **Auditoria e Otimização da Sala Vermelha & Emergências Médicas (`ux:hub:sala`, `ux:hub:emerg`)**: Concluído com 100% dos fluxos validados (PCR em 4 tempos, arritmias, choque séptico/CIRCI, crise HAS, Glasgow e DVA rápida), respostas determinísticas em 0ms, retorno contextual `[🔙 Sala Vermelha]` e `[🏠 Início]` e botão de cópia.
8. [ ] **Auditoria e Otimização do Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`)**:
    - Validar fluxo conversacional SOAP Fase 1 e Fase 2, persistência de contexto em cache, inserção rápida de EF normal e geração de receita.
    - Garantir botões de 1 toque, retorno contextual para `[🔙 Ambulatório]` e cópia limpa para PEP.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 94 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 90 (Sala Vermelha & Emergências / Cronômetro e Metrônomo Sonoro de RCP 100-120 bpm no Cockpit PWA)*: Implementar metrônomo auditivo e visual sincronizado a 110 bpm com temporizador de ciclos de 2 minutos para checagem de pulso/ritmo e troca ágil de compressores durante RCP.
- *Sugestão 91 (Sala Vermelha & Emergências / Seletor de Carga de Desfibrilação Bifásica vs Monofásica)*: Adicionar visualizador rápido beira-leito com seleção de tecnologia do desfibrilador disponível no serviço (Bifásico 120-200J vs Monofásico 360J) e carga de cardioversão sincronizada imediata por arritmia.
- *Sugestão 92 (Sala Vermelha & Emergências / Prescrição Estruturada de Resgate em Hipercalemia Grave)*: Adicionar kit de prescrição em 1 toque combinando Estabilização de Membrana (Gluconato 10%), Shift Intracelular (Glicoinsulina + Beta-2) e Eliminação Corpórea (Furosemida / Resinas) com vigilância seriada.
- *Sugestão 93 (Sala Vermelha & Emergências / Protocolo Multidisciplinar de Histerotomia de Ressuscitação em 4 Minutos)*: Adicionar checklist tátil de prontidão perimortem no Telegram/Cockpit para PCR em gestante ≥ 20 semanas com contagem regressiva para incisão aos 4 minutos se RCE não for obtido.
- *Sugestão 94 (Sala Vermelha & Emergências / Matriz Rápida de Interações Farmacológicas na SRI)*: Adicionar checagem automática de risco de colapso hemodinâmico pré-IOT combinando droga indutora selecionada e dose de vasopressor atual.

---
