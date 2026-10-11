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

- [x] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`, `src/12_experiencia_bot.js`, `src/07a_telegram_router.js`, `tests/test_hub_go_ux.cjs` e `tests/test_go_hub_ux.cjs`)**:
    - **Diagnóstico e Causa Raiz**: O teclado `construirTecladoHubGO` utilizava rodapé com retorno à raiz (`ux:menu`) em vez do retorno contextual `[🔙 Hub G&O]` (`ux:rotina:go`) e `[🏠 Início]` (`ux:hub:inicio`), violando o Protocolo das 6 Regras de Ouro. O roteador do Telegram interceptava `/go` e `/obstetricia` antecipadamente. Em `src/12_experiencia_bot.js`, presets de expulsivo, intoxicação por magnésio e anticoncepção OMS possuíam discrepâncias de casing estrito e mapeamento de categorias OMS (`metodosBloqueadosCat4`).
    - **Determinismo 0ms e Protocolo Beira-Leito**: Respostas instantâneas em 0ms sem IA desnecessária para 100% dos 10 submódulos clínicos (Pré-Natal & DPP, Parto/Partograma, HPP 4 Ts, Pré-Eclâmpsia & MgSO4 Zuspan, Prematuridade/RPMO, Toxoplasmose, Vulvovaginites, Preventivo INCA, Anticoncepção OMS e DIP).
    - **Navegação Contextual e Cópia em 1 Toque**: Garantidos botões `[🔙 Hub G&O]` (`ux:rotina:go`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% das telas, presets e comandos clínicos. Respostas formatadas com botão `[📋 Copiar Conduta para Prontuário]` (`ux:copiar:<hash>`) em bloco ````text` para inserção ágil no prontuário eletrônico.
    - **Validação e Cobertura**: 100% aprovado nas duas suítes canônicas: `tests/test_hub_go_ux.cjs` (23/23 testes verdes) e `tests/test_go_hub_ux.cjs` (6 blocos completos), além de `test_saneamento_escopo_clinico.cjs` e `test_hubs_e_comandos_telegram.cjs`. Recompilado `ultra_rotina_master.js` (58.038 linhas, 100% sintaxe OK). Integrado a `scripts/test_manifest.json` com aprovação total de 46/46 suítes em `npm test`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`, `src/09_enfermaria.js` e `src/07e_telegram_midia_e_leitos.js`
    - **Função/Componente/Seletor**: Funções `enviarMenuEnfermaria`, `mostrarPainelLeitos`, `processarAcaoLeito`, `tratarCallbackEnfSBAR` e comandos `/leitos`, `/censo`, `/sbar`
    - **Comportamento Esperado / Critério de Aceite**: Garantir retorno contextual para `[🔙 Enfermaria]` (`ux:hub:enf`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de leitos e SBAR (painel, censo, admissão, evolução diária, alta e passagem de plantão), respostas determinísticas em 0ms sem IA desnecessária e botão de 1 toque `[📋 Copiar Conduta/Passagem para Prontuário]` em todas as saídas de leitos e SBAR.

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
3. [x] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc` e Cockpit)**:
    - Concluído com 100% das 6 calculadoras principais, retorno contextual `[🔙 Calculadoras]`, Fastify schemas sanitizados, Parkland e Glasgow no Cockpit PWA e botão de cópia ````text`.
4. [x] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`)**:
    - Concluído com 100% dos 10 submódulos validados, retorno contextual `[🔙 Hub G&O]` e `[🏠 Início]`, respostas determinísticas em 0ms e botão de cópia de conduta ````text`.
5. [ ] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**:
    - Validar Painel de Leitos (`ux:painel:0`), Abertura de Leito Individual (`ux:leito:*`), Evolução Diária (`ux:evoluir:*`), Alta Hospitalar (`ux:alta:*`) e Passagem SBAR (`ux:enf:sbar`).
    - Garantir que nenhum estado de censo ou evolução deixe o médico sem opções de navegação direta para `[🔙 Enfermaria]` ou `[🏠 Início]`.
6. [ ] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**:
    - Validar Agenda do Dia/Amanhã (`ux:rotina:agenda`, `ux:rotina:agenda_amanha`), Tarefas do Plantão (`ux:rotina:tasks`), Check-in / Briefing (`ux:rotina:checkin`, `rotina_briefing`) e Encerramento de Plantão (`ux:rotina:plantao_fim`).
    - Garantir navegação em 1 toque sem digitação manual, com retorno para `[🔙 Central de Rotina]` e `[🏠 Início]`.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 83 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 79 (Calculadoras / Parkland & Queimados)*: Adicionar temporizador regressivo e alerta horário no Cockpit PWA para término da 1ª etapa de ressuscitação volêmica (primeiras 8h a contar do horário exato do trauma), com campos de input para volume já administrado na ambulância (SAMU) e compensação automática no volume restante de Ringer Lactato.
- *Sugestão 80 (Calculadoras / Glasgow-P Pediátrico)*: Implementar toggle de adaptação pediátrica para a Escala de Coma de Glasgow em lactentes e crianças menores de 4 anos (balbucio/choro consolável em vez de orientação verbal e retração à dor em vez de localização), garantindo acurácia neurológica beira-leito em trauma pediátrico.
- *Sugestão 81 (Ginecologia & Obstetrícia / Partograma Dinâmico)*: Implementar renderização em ASCII/gráfico SVG inline no Telegram e Cockpit PWA da linha de alerta e linha de ação do Partograma da OMS (com marcação temporal de dilatação cervical, descida da apresentação de De Lee e frequência cardíaca fetal), facilitando a identificação imediata de parada secundária de dilatação, fase ativa prolongada e período pélvico retardado.
- *Sugestão 82 (Ginecologia & Obstetrícia / Calculadora de Risco de Pré-Eclâmpsia 1º Trimestre)*: Adicionar algoritmo de rastreamento precoce de pré-eclâmpsia entre 11 e 13+6 semanas baseado na Fetal Medicine Foundation (FMF), combinando fatores maternos, PAM média, IP das artérias uterinas e dosagem de PlGF, com prescrição automática de AAS 150 mg/dia à noite e Carbonato de Cálcio 1,5g/dia se risco elevado.
- *Sugestão 83 (Ginecologia & Obstetrícia / Mapeamento de Anticoncepção Pós-Parto Imediato)*: Adicionar matriz de decisão rápida beira-leito para inserção de DIU de Cobre ou DIU de Levonorgestrel pós-parto imediato (até 10 minutos após dequitação ou transcesariana) e pós-aborto imediato, com taxa de expulsão comparativa e critérios de segurança FIGO/OMS.

---
