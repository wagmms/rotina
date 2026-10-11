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

- [x] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`, `src/12_experiencia_bot.js`, `src/09_enfermaria.js`, `src/07e_telegram_midia_e_leitos.js`, `src/07a_telegram_router.js` e `tests/test_gestao_leitos_sbar_ux.cjs`)**:
    - **Diagnóstico e Causa Raiz**: O comando `/sbar` e o callback `ux:enf:sbar` recorriam a chamadas lentas de IA pela rede (`/passagem` via LLM) mesmo quando a enfermaria já possuía os leitos consolidados em memória, violando o princípio do determinismo em 0ms. Comandos como `/leitos` e `/censo` não possuíam roteamento formal no Telegram. Telas de consulta (`uxTelaLeito`), evolução (`processarAcaoLeito`) e ditado por voz (`processarDitadoEvolucaoLeito`) careciam de botão direto de 1 toque para prontuário (`[📋 Copiar Conduta/Passagem para Prontuário]`) e de retorno ao início (`[🏠 Início]`).
    - **Determinismo 0ms e Passagem SBAR Canônica**: Implementado o gerador determinístico em 0ms `EnfermariaService.gerarPassagemSBARConsolidada()` estruturado em 4 tempos (S - Situação/Censo, B - Histórico, A - Avaliação atual, R - Recomendações e Pendências extraídas de regex semiológico) sem dependência externa de LLM.
    - **Navegação Contextual e Cópia em 1 Toque**: Garantidos botões `[🔙 Enfermaria]` (`ux:hub:enf`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de leitos e SBAR (painel, censo, admissão, evolução diária, confirmação de alta segura e passagem de plantão). Adicionado botão de 1 toque `[📋 Copiar Conduta/Passagem para Prontuário]` em todas as saídas de leitos e SBAR.
    - **Validação e Cobertura**: 100% aprovado na nova suíte canônica `tests/test_gestao_leitos_sbar_ux.cjs` (6 blocos completos) e na suíte de fluxos `tests/test_enfermaria_ux_fluxos.cjs`. Integrado ao manifest e aprovadas todas as 47/47 suítes no baseline de testes.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**:
    - **Arquivo/Módulo Alvo**: `src/06_rotina_agenda.js`, `src/12_experiencia_bot.js`, `src/07g_telegram_ajuda_e_protocolos.js` e `src/07d_telegram_callbacks.js`
    - **Função/Componente/Seletor**: Funções `enviarRotinaBot`, `consultarEventosAgenda`, `tratarCallbackRotina`, `gerarResumoFimPlantao` e comandos `/rotina`, `/agenda`, `/tasks`, `/briefing`, `/checkin`, `/plantao_fim`
    - **Comportamento Esperado / Critério de Aceite**: Garantir navegação em 1 toque sem digitação manual, retorno contextual para `[🔙 Central de Rotina]` (`ux:hub:rotina`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de agenda do dia/amanhã, tarefas do Notion, briefing matinal, check-in noturno e encerramento de plantão, com respostas determinísticas em 0ms e botão de cópia de resumo do plantão.

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
5. [x] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**:
    - Concluído com 100% dos fluxos validados (painel, censo, leito individual, evolução, alta segura, ditado por voz e SBAR), respostas determinísticas em 0ms e botão `[📋 Copiar Conduta/Passagem para Prontuário]`.
6. [ ] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**:
    - Validar Agenda do Dia/Amanhã (`ux:rotina:agenda`, `ux:rotina:agenda_amanha`), Tarefas do Plantão (`ux:rotina:tasks`), Check-in / Briefing (`ux:rotina:checkin`, `rotina_briefing`) e Encerramento de Plantão (`ux:rotina:plantao_fim`).
    - Garantir navegação em 1 toque sem digitação manual, com retorno para `[🔙 Central de Rotina]` e `[🏠 Início]`.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 86 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 82 (Ginecologia & Obstetrícia / Calculadora de Risco de Pré-Eclâmpsia 1º Trimestre)*: Adicionar algoritmo de rastreamento precoce de pré-eclâmpsia entre 11 e 13+6 semanas baseado na Fetal Medicine Foundation (FMF), combinando fatores maternos, PAM média, IP das artérias uterinas e dosagem de PlGF, com prescrição automática de AAS 150 mg/dia à noite e Carbonato de Cálcio 1,5g/dia se risco elevado.
- *Sugestão 83 (Ginecologia & Obstetrícia / Mapeamento de Anticoncepção Pós-Parto Imediato)*: Adicionar matriz de decisão rápida beira-leito para inserção de DIU de Cobre ou DIU de Levonorgestrel pós-parto imediato (até 10 minutos após dequitação ou transcesariana) e pós-aborto imediato, com taxa de expulsão comparativa e critérios de segurança FIGO/OMS.
- *Sugestão 84 (Enfermaria / Alertas de Antibioticoterapia D-Tempo)*: Implementar contagem regressiva e alerta automático de D-tempo de antibióticos nos leitos (ex: alertar quando atingir D7 ou D14 para reavaliação de foco infeccioso, descalonamento de espectro ou transição para terapia oral precoce segundo diretrizes de Antimicrobial Stewardship).
- *Sugestão 85 (Enfermaria / Notificação de Alerta SBAR para Equipe Multidisciplinar)*: Adicionar formatação de exportação rápida da Passagem SBAR adaptada para transmissão via canal seguro ou WhatsApp de enfermagem e fisioterapia, agrupando leitos com suporte ventilatório ativo, drenos e sondas.
- *Sugestão 86 (Enfermaria / Censo Dinâmico com Filtro de Gravidade)*: Adicionar filtros instantâneos no Painel de Leitos (`ux:painel:0`) permitindo visualizar exclusivamente leitos críticos (🔴 Instáveis) ou em vigilância (🟡), facilitando a priorização do médico durante a passagem de plantão e o round matinal.

---
