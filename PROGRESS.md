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

- [x] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`, `src/12_experiencia_bot.js` e `tests/test_consultas_bolso_ux.cjs`)**:
    - **Diagnóstico e Otimização UX**: A aba `ux:hub:bolso` delegava cliques (`atb`, `ped`, `gestacao`, `interacao`, `hsl`) para comandos textuais livres (`texto('/atb')`, etc.), gerando novas mensagens sem edição in-place, telas órfãs sem botão de retorno e potencial lentidão por chamadas a modelos generativos de IA em consultas protocolares.
    - **Implementação Determinística (0ms) e Protocolo Beira-Leito**: Criadas telas ricas e handlers canônicos com edição in-place via `enviarTelaBot`: `enviarTelaBolsoATB` (PAC CURB-65, ITU cistite/pielonefrite, foco abdominal, sepse e ajuste renal), `enviarTelaBolsoPed` (Dipirona 12kg, Amoxi 15kg, Prednisolona 10kg, Azitro 12kg com memória de cálculo), `enviarTelaBolsoGestacao` (analgésicos seguros vs bloqueio de AINEs no 3º tri, anti-hipertensivos com contraindicação de IECA/BRA, antibióticos e antieméticos), `enviarTelaBolsoInteracao` (alertas sentinela de QT longo, sangramento, hipercalemia e choque de Nitrato+5-PDE) e `enviarTelaBolsoHSL` (diluições oficiais de Ceftriaxona sem cálcio, Vancomicina lenta, Meropenem estendido e Noradrenalina concentrada em SG 5%).
    - **Retorno Contextual e Cópia Rápida**: Garantidos botões `[🔙 Consultas de Bolso]` (`ux:hub:bolso`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% das telas, além de botão `[📋 Copiar ...]` (`ux:copiar:<hash>`) com cache de 6h para transferência imediata ao PEP/prontuário.
    - **Validação e Cobertura**: Criada suíte `tests/test_consultas_bolso_ux.cjs` (7 blocos) integrada à baseline de testes (`scripts/test_manifest.json`). Recompilado `ultra_rotina_master.js` (`npm run build`). 100% aprovado na baseline `npm test` (42/42) e na bateria completa `npm run test:all` (230/230 suítes verdes em 16.75s).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js` e `src/07a_telegram_router.js`
    - **Função/Componente/Seletor**: Função `enviarMenuAmbulatorio` e callbacks `ux:amb:*` (`soap`, `remume`, `cid`, `atestado`)
    - **Comportamento Esperado / Critério de Aceite**: Garantir retorno contextual para `[🔙 Ambulatório]` e `[🏠 Início]`, respostas determinísticas em 0ms sem chamadas desnecessárias de IA, botões táteis de 1 toque para busca ágil de CID-10/CIAP-2, receituário REMUME SUS e atestados médicos CFM com botão de cópia `[📋 Copiar Conduta]`.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas (`Gerar PDF` inútil em emergência, etc.) e menus redundantes ("outras opções" duplicando opções já visíveis).
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva (sem "alterações não relatadas"), eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [x] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**:
    - Concluído com 100% dos submódulos validados (`atb`, `ped`, `gestacao`, `interacao`, `hsl`), retorno contextual, respostas determinísticas em 0ms e botão de cópia de conduta.
2. [ ] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**:
    - Validar fluxos de CID-10 & CIAP-2 Rápido (`ux:amb:cid`), Prescrição REMUME SUS (`ux:amb:remume`), Atestado Médico CFM (`ux:amb:atestado`) e Receituário de Controle Especial (C1/B1).
    - Assegurar botões de retorno para `[🔙 Ambulatório]` e `[🏠 Início]`, além de botões imediatos de cópia e impressão sem passos intermediários desnecessários.
3. [ ] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc` e Cockpit)**:
    - Validar Gasometria Arterial completa (`ux:iniciar:gaso`), Cockcroft vs CKD-EPI (`calc_Cockcroft`, `calc_CKD`), Hidratação Holliday-Segar (`ux:enf:hidratacao`), Glasgow e Escores de Risco.
    - Validar Calculadora de Queimaduras (Parkland / Brooke) no Cockpit (reposição em 24h, regra dos 9 de Wallace, 4 mL/kg/% SCQ, frações 50% nas primeiras 8h e diurese alvo).
    - Validar Calculadora de Drogas Vasoativas (/dva e Cockpit): taxa de infusão (mcg/kg/min para mL/h) com presets táteis de ampolas e salvaguardas anti-dose excessiva.
    - Garantir retorno consistente para `[🔙 Calculadoras]` ou para o cenário clínico chamador (Enfermaria ou Sala Vermelha), eliminando telas órfãs.
4. [ ] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`)**:
    - Validar os 10 submódulos de G&O: Pré-Natal & DPP (`go_prenatal`), Parto/Partograma (`go_parto`), HPP 4 Ts (`go_hpp`), Pré-Eclâmpsia & MgSO4 (`go_mgso4`), Prematuridade/RPMO (`go_prematuridade`), Toxo (`go_toxo`), Vulvovaginites (`go_corrimento`), Preventivo INCA (`go_preventivo`), Anticoncepção OMS (`go_anticoncepcao`) e DIP (`go_dip`).
    - Substituir retornos genéricos para o menu raiz por `[🔙 Hub G&O]` e `[🏠 Início]`, com condutas prescritivas instantâneas (0ms) e botão de cópia de conduta.
5. [ ] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**:
    - Validar Painel de Leitos (`ux:painel:0`), Abertura de Leito Individual (`ux:leito:*`), Evolução Diária (`ux:evoluir:*`), Alta Hospitalar (`ux:alta:*`) e Passagem SBAR (`ux:enf:sbar`).
    - Garantir que nenhum estado de censo ou evolução deixe o médico sem opções de navegação direta para `[🔙 Enfermaria]` ou `[🏠 Início]`.
6. [ ] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**:
    - Validar Agenda do Dia/Amanhã (`ux:rotina:agenda`, `ux:rotina:agenda_amanha`), Tarefas do Plantão (`ux:rotina:tasks`), Check-in / Briefing (`ux:rotina:checkin`, `rotina_briefing`) e Encerramento de Plantão (`ux:rotina:plantao_fim`).
    - Garantir navegação em 1 toque sem digitação manual, com retorno para `[🔙 Central de Rotina]` e `[🏠 Início]`.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 74 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 70 (IA / Otimização de Inferência)*: Cache semântico de embeddings ou KV-cache para prompts extrativos de baixa latência em modelos Gemini 2.5/Flash-Lite quando `semThinking: true`, permitindo reaproveitamento de respostas estruturadas para consultas idênticas de CID-10, posologia e interações em 0ms sem consumo de cota de API.
- *Sugestão 71 (Segurança / RBAC Cockpit)*: Adicionar comando no Telegram `/cockpit_revogar_convidado` para invalidação imediata em cache de tokens HMAC emitidos (`ck_<hmac>`) quando um médico convidado concluir o plantão, oferecendo ciclo de vida de credenciais mais granular sem afetar o titular.
- *Sugestão 72 (Consultas de Bolso / Antimicrobianos)*: Adicionar seletor tátil de sensibilidade local / perfil microbiológico hospitalar (ex: taxa local de ESBL, MRSA ou Pseudomonas) no submenu de Antibióticos por Foco (`ux:bolso:atb`) para escalonamento automático de dose e tempo de infusão estendida de betalactâmicos conforme epidemiologia da UTI local.
- *Sugestão 73 (Consultas de Bolso / Pediatria)*: Implementar conversão automática de apresentações pediátricas líquidas para gotas em seringa dosadora ou colheres-medida (ex: 5 mL = 1 colher de chá, 15 mL = 1 colher de sopa) nos cards de cópia de conduta pediátrica (`ux:bolso:ped`), minimizando erros de administração domiciliar pelos cuidadores.
- *Sugestão 74 (Consultas de Bolso / Farmacovigilância)*: Adicionar busca multi-droga combinada em 1 toque no crosscheck de interações (`ux:bolso:interacao`) permitindo colar a lista completa de medicamentos de uso crônico da admissão hospitalar (conciliação medicamentosa) com matriz visual de alertas graduada em cores (Verde: Seguro, Amarelo: Monitorar, Vermelho: Contraindicação Absoluta).

---
