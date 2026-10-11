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

- [x] **Auditoria Clínica Pro e Ajuste de Posologia Pediátrica e Schwartz (`src/02_calculadoras_puras.js`)**:
    - **Diagnóstico e Causa Raiz**: `tests/test_auditoria_pediatrica_schwartz.cjs` falhava na asserção de teto de adulto para Amoxicilina em dose alta (`opt.doseAlta: true`), pois `doseMaximaAdultoMgDia` havia sido indevidamente alterada para 3000 mg/dia, além de Cefalexina para 4000 mg/dia, Azitromicina para 3 dias e Amoxi+Clav travada em 50 mg/kg/dia.
    - **Auditoria Clínica Pro com Fontes Identificáveis**: Conforme diretrizes da Sociedade Brasileira de Pediatria (SBP), FTN/Rename (Ministério da Saúde) e Guia Farmacêutico HSL, formulações líquidas ambulatoriais de Amoxicilina 250 mg/5 mL têm teto de segurança fixado em 1500 mg/dia (500 mg de 8/8h = 30 mL/dia) em atenção básica para pacientes em transição (> 50 kg), ativando o alerta sentinela de peso elevado para prevenir sobrecarga de volume líquido hiperosmolar e sobredose. Cefalexina limitada a 2000 mg/dia e Azitromicina mantida em 5 dias.
    - **Correção e Validação**: Restaurados os limites canônicos em `src/02_calculadoras_puras.js` (função `posologiaPediatrica`). Validação 100% aprovada em `tests/test_auditoria_pediatrica_schwartz.cjs` (6/6 asserções), `tests/test_auditoria_pediatrica_extremos.cjs` (27/27 casos) e `tests/test_posologia_deterministica.cjs` (11/11 casos).
    - Evidências arquivadas em `data/autoloop_task_notes/test_auditoria_pediatrica_schwartz.md`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`
    - **Função/Componente/Seletor**: Função `enviarMenuConsultasBolso` e handlers de callbacks `ux:bolso:*` (`atb`, `ped`, `gestacao`, `interacao`, `hsl`).
    - **Comportamento Esperado / Critério de Aceite**: Garantir retorno contextual para `[🔙 Consultas de Bolso]` e `[🏠 Início]`, respostas determinísticas em 0ms sem chamadas redundantes de IA generativa, botões táteis de 1 toque e botão `[📋 Copiar Conduta]`.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas (`Gerar PDF` inútil em emergência, etc.) e menus redundantes ("outras opções" duplicando opções já visíveis).
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva (sem "alterações não relatadas"), eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [ ] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**:
    - Validar submódulos: Antibióticos por Foco (`ux:bolso:atb`), Doses Pediátricas por Peso (`ux:bolso:ped`), Gestação & Lactação (`ux:bolso:gestacao`), Interações Medicamentosas Graves (`ux:bolso:interacao`) e Diluição HSL (`ux:bolso:hsl`).
    - Garantir retorno contextual para `[🔙 Consultas de Bolso]`, entrega de respostas em 0ms sem chamadas redundantes de IA e botão `[📋 Copiar Conduta]`.
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

> 💡 Catálogo completo de 65 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 61 (Telegram / Sala Vermelha)*: Botão de alternância rápida entre apresentação clínica inicial e critérios de desmame/tapering de DVA (Noradrenalina / Dobutamina / Vasopressina) com metas de PAM ≥ 65 mmHg e lactato em clareamento.
- *Sugestão 62 (Telegram / Emergência)*: Protocolo ágil de dose de ataque vs manutenção de Amiodarona venosa com pré-cálculo automático em SF 5% (300 mg em bolus na PCR chocável refratária vs 150 mg em 10 min na TV estável, seguido de 1 mg/min por 6h e 0,5 mg/min por 18h).
- *Sugestão 63 (Telegram / Dengue)*: Alerta visual com calculadora rápida de hematócrito e critério de hemoconcentração (aumento de 20% do Ht basal) para reclassificação dinâmica entre Grupo B e Grupo C no Telegram.
- *Sugestão 64 (Telegram / Cefaleia)*: Escore SNOOP4 com checklist interativo para estratificação imediata de bandeiras vermelhas em cefaleia aguda antes de liberar protocolo de analgesia primária.
- *Sugestão 65 (Pediatria / Farmacologia)*: Transição visual automática para formulação em comprimidos de adulto quando o paciente pediátrico tiver peso > 40-50 kg ou atingir o teto de adulto (exibir sugestão alternativa "Amoxicilina 500 mg: 1 cp VO de 8/8h" ao lado da suspensão de 250 mg/5 mL para evitar sobrecarga de volume líquido).

---
