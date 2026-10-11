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

- [x] **Auditoria e Otimização do Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`, `src/02_soap_ambulatorial.js`, `src/12_experiencia_bot.js`, `src/07c_telegram_consultas_e_ia.js`, `src/07a_telegram_router.js`, `src/10_pdf_receita.js` e `tests/test_soap_modo_e_receita_ux.cjs`)**:
    - **Diagnóstico e Correção**: Implementadas `processarEntradaSoap` e `formatarRascunhoSoapTelegram`; corrigida rejeição indevida de callbacks (`acaoSoap`) garantindo persistência do caso ativo em memória/cache; eliminadas telas órfãs em `ux:soap:atualizar` e cancelamento de EF; adicionado comando `/soap` com teclado tátil rápido; padronizado botão primário `[📋 Copiar SOAP para PEP]`; e garantido retorno contextual `[🔙 Ambulatório]` (`ux:hub:amb`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de SOAP e receitas (`/rx` e `/receita`).
    - **Validação e Cobertura**: 100% aprovado na suíte `tests/test_soap_modo_e_receita_ux.cjs` (8 blocos cobrindo 100% dos critérios) e recompilado `ultra_rotina_master.js` com sintaxe JS 100% OK.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Interface e Responsividade do Cockpit PWA (`cockpit_movel.html`, `server/runtime.js` e `src/13_cockpit_integracao.js`)**:
    - **Arquivo/Módulo Alvo**: `cockpit_movel.html`, `src/13_cockpit_integracao.js` e `server/runtime.js`
    - **Função/Componente/Seletor**: Funções `cockpitRenderizarSoap`, `abrirModalCalc`, sincronização de `soapview_` com o Telegram e resiliência da fila offline no IndexedDB
    - **Comportamento Esperado / Critério de Aceite**: Garantir sincronização em tempo real do caso SOAP e leitos do Telegram no Cockpit PWA, botões de 1 toque de cópia de conduta sem estouro de layout mobile (320px a 420px), ausência de modais travados e persistência de cálculos recentes em memória offline.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot e Cockpit)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas e menus redundantes.
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva, eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]` / `[📋 Copiar SOAP para PEP]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [x] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**: Concluído com 100% dos submódulos validados (`atb`, `ped`, `gestacao`, `interacao`, `hsl`), retorno contextual, determinismo 0ms e botão de cópia.
2. [x] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**: Concluído com 100% dos submódulos validados (`soap`, `remume`, `cid`, `atestado`), retorno contextual `[🔙 Ambulatório]`, determinismo 0ms e cópia para o PEP.
3. [x] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc` e Cockpit)**: Concluído com 100% das 6 calculadoras principais, retorno contextual `[🔙 Calculadoras]`, Fastify schemas sanitizados, Parkland e Glasgow no Cockpit PWA e botão de cópia.
4. [x] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`)**: Concluído com 100% dos 10 submódulos validados, retorno contextual `[🔙 Hub G&O]` e `[🏠 Início]`, respostas determinísticas em 0ms e botão de cópia de conduta.
5. [x] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**: Concluído com 100% dos fluxos validados (painel, censo, leito individual, evolução, alta segura, ditado por voz e SBAR), respostas determinísticas em 0ms e botão de cópia de conduta.
6. [x] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**: Concluído com 100% dos fluxos validados (agenda hoje/amanhã, tarefas do Notion, briefing matinal, check-in noturno e debriefing de plantão), respostas determinísticas em 0ms e botão de cópia.
7. [x] **Auditoria e Otimização da Sala Vermelha & Emergências Médicas (`ux:hub:sala`, `ux:hub:emerg`)**: Concluído com 100% dos fluxos validados (PCR em 4 tempos, arritmias, choque séptico/CIRCI, crise HAS, Glasgow e DVA rápida), respostas determinísticas em 0ms, retorno contextual `[🔙 Sala Vermelha]` e `[🏠 Início]`.
8. [x] **Auditoria e Otimização do Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`)**: Concluído com 100% dos fluxos validados (Fase 1 e Fase 2 sem perda de contexto, inserção determinística de EF normal estruturado por aparelho, botão `[📋 Copiar SOAP para PEP]`, eliminação de telas órfãs e retorno contextual).
9. [ ] **Auditoria e Otimização do Cockpit PWA Mobile & Sincronização em Tempo Real (`cockpit_movel.html`)**: Validar renderização do SOAP ativo, modais de calculadoras, compatibilidade touch em telas pequenas e resiliência offline.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 99 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 95 (SOAP Ambulatorial / Seleção Tátil de Modelos de Exame Físico por Aparelho no Telegram)*: Permitir que o médico no Telegram, ao clicar em `[🩺 EF Normal]`, escolha entre o Exame Físico Completo Padrão ou modelos dirigidos rápidos (Cardiovascular/HAS, Metabólico/Pés DM, Respiratório/IVAS, Coluna/Lombalgia, Gastrointestinal/Dispepsia) em 1 toque antes de incorporar ao SOAP.
- *Sugestão 96 (SOAP Ambulatorial / Extração Inteligente de Atestado Médico CFM a partir da Avaliação SOAP)*: Adicionar botão `[📄 Gerar Atestado CFM]` na Fase 2 do SOAP quando a queixa e diagnóstico justificarem repouso laboral (ex: IVAS, lombalgia, gastroenterite), preenchendo automaticamente paciente, dias sugeridos conforme patologia e opção de consentimento para CID-10.
- *Sugestão 97 (Prescrição Ambulatorial / Validação Automática de Dispensação por Programa Farmácia Popular)*: No momento da prescrição farmacológica do SOAP, identificar visualmente com badge `[Farmácia Popular]` os medicamentos gratuitos (Losartana, Enalapril, Hidroclorotiazida, Metformina, Glibenclamida, Insulinas, Salbutamol) e com co-pagamento, orientando o paciente sobre retirada sem custo na rede credenciada.
- *Sugestão 98 (SOAP Ambulatorial / Calculadora Automática de Meta de HbA1c Individualizada por Fragilidade)*: Incorporar ao plano SOAP em pacientes diabéticos a definição dinâmica da meta de hemoglobina glicada conforme diretrizes SBD/ADA (jovem sem comorbidades: < 6,5-7,0%; idoso funcional ou com risco cardiovascular: < 7,5-8,0%; idoso frágil ou com expectativa limitada: < 8,5%).
- *Sugestão 99 (SOAP Ambulatorial / Exportação de Resumo Clínico para WhatsApp do Paciente)*: Adicionar botão inline `[📱 Enviar Orientações ao Paciente]` para extrair exclusivamente as orientações não farmacológicas, sinais de alarme e data de retorno em linguagem leiga, acessível e empática para envio direto por mensagem.

---
