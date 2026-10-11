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

- [x] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`, `src/12_experiencia_bot.js`, `src/07a_telegram_router.js` e `tests/test_ambulatorio_ux.cjs`)**:
    - **Diagnóstico e Otimização UX**: A aba `ux:hub:amb` delegava botões táteis (`ux:amb:remume`, `ux:amb:cid`, `ux:amb:atestado`) para comandos textuais livres sem botões (`texto('/rx')`, etc.), gerando telas órfãs, dependência de IA em casos protocolares e ausência do comando `/cid` no roteador do Telegram.
    - **Implementação Determinística (0ms) e Protocolo Beira-Leito**: Implementadas telas canônicas em `src/12_experiencia_bot.js` com edição in-place via `enviarTelaBot`: `enviarTelaAmbSoap` (SOAP em 4 tempos com exame físico normal pronto e casos de HAS, DM2, IVAS e Lombalgia), `enviarTelaAmbRemume` (guia farmacológico e receituários completos com via, posologia, horários e MEV), `enviarTelaAmbCid` (catálogo dos 17 diagnósticos mais frequentes na APS e fichas detalhadas com CIAP-2 e alertas sentinela) e `enviarTelaAmbAtestado` (emissão conforme Resolução CFM 1.658/2002 com dias por extenso e sigilo do Art. 5º).
    - **Roteador Telegram & Retorno Contextual**: No `src/07a_telegram_router.js`, comandos `/ambulatorio`, `/atestado`, `/cid` e `/remume` integrados com teclado inline determinístico em 0ms. Garantidos botões `[🔙 Ambulatório]` (`ux:hub:amb`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% das telas, além de botão `[📋 Copiar ...]` (`ux:copiar:<hash>`) com cache de 6h para colagem direta no PEP/prontuário.
    - **Validação e Cobertura**: Criada suíte `tests/test_ambulatorio_ux.cjs` (6 blocos) integrada ao manifesto de testes (`scripts/test_manifest.json`). Recompilado `ultra_rotina_master.js` (`npm run build`). 100% aprovado na baseline `npm test` (43/43 suítes verdes em 5.96s).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc`, Cockpit e Telegram)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`, `src/07f_telegram_calculadoras_parser.js` e `cockpit_movel.html`
    - **Função/Componente/Seletor**: Função `enviarMenuUXCalculadoras`, rotas de cálculo `/calc` e modais interativos do Cockpit
    - **Comportamento Esperado / Critério de Aceite**: Garantir retorno contextual para `[🔙 Calculadoras]` (`ux:hub:calc`) e `[🏠 Início]` (`ux:hub:inicio`), respostas determinísticas em 0ms sem chamadas desnecessárias de IA, botões de 1 toque para cálculo direto (Gasometria arterial completa, Cockcroft vs CKD-EPI, Holliday-Segar, Glasgow, Parkland e Drogas Vasoativas) com botão de cópia `[📋 Copiar Cálculo para Prontuário]`.

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
2. [x] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**:
    - Concluído com 100% dos submódulos validados (`soap`, `remume`, `cid`, `atestado`), retorno contextual `[🔙 Ambulatório]`, respostas determinísticas em 0ms e botão de cópia de conduta para o PEP.
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

> 💡 Catálogo completo de 77 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 73 (Consultas de Bolso / Pediatria)*: Implementar conversão automática de apresentações pediátricas líquidas para gotas em seringa dosadora ou colheres-medida (ex: 5 mL = 1 colher de chá, 15 mL = 1 colher de sopa) nos cards de cópia de conduta pediátrica (`ux:bolso:ped`), minimizando erros de administração domiciliar pelos cuidadores.
- *Sugestão 74 (Consultas de Bolso / Farmacovigilância)*: Adicionar busca multi-droga combinada em 1 toque no crosscheck de interações (`ux:bolso:interacao`) permitindo colar a lista completa de medicamentos de uso crônico da admissão hospitalar (conciliação medicamentosa) com matriz visual de alertas graduada em cores (Verde: Seguro, Amarelo: Monitorar, Vermelho: Contraindicação Absoluta).
- *Sugestão 75 (Ambulatório / CIAP-2 Multicêntrico)*: Adicionar mapeamento cruzado bidirecional entre CIAP-2 (Capítulo / Razão de Encontro) e CID-10 no seletor de diagnósticos da atenção básica (`ux:amb:cid`) com filtro por linha de cuidado (saúde da criança, da mulher, do adulto e do idoso).
- *Sugestão 76 (Ambulatório / Controle Especial e Notificação)*: Adicionar templates estruturados em 1 toque de Receituário de Controle Especial (Portaria SVS/MS nº 344/98 - Listas C1 e B1) e Notificação de Receita B (Psicotrópicos) com cálculo automático da quantidade necessária para 30 ou 60 dias de tratamento.
- *Sugestão 77 (Ambulatório / Validação de Atestado Digital com QR Code)*: Implementar hash de integridade e metadados criptográficos para validação de atestado médico pelo empregador ou serviço de perícia, minimizando adulterações em declarações emitidas pelo consultório digital.

---
