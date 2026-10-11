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

- [x] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`, `src/06_rotina_agenda.js`, `src/05_notion.js`, `src/12_experiencia_bot.js`, `src/07g_telegram_ajuda_e_protocolos.js`, `src/07a_telegram_router.js`, `src/07d_telegram_callbacks.js` e `tests/test_central_rotina_plantao_ux.cjs`)**:
    - **Diagnóstico e Causa Raiz**: O menu de rotina e roteador de callbacks executavam desvios que geravam flood no Telegram (`texto('/...')`) ao invés de edição in-place (`messageId` e `editMessageText`), violando o protocolo beira-leito. Telas de agenda (`consultarEventosAgenda`) e tarefas do Notion (`listarTarefasHojeNotion`) careciam de teclados padronizados, gerando telas órfãs quando não havia eventos ou quando os serviços estavam inacessíveis. O fechamento de plantão (`/plantao_fim`) não incluía integração com o censo ativo da enfermaria nem botão de 1 toque para cópia do resumo.
    - **Determinismo 0ms e Debriefing Canônico**: Implementado fechamento de plantão estruturado em `gerarResumoFimPlantao` com checklist de segurança beira-leito (exames críticos, antibióticos com D.A.T, drogas vasoativas e pendências), censo consolidado de leitos ativos da enfermaria e botão de cópia rápida `[📋 Copiar Resumo do Plantão]` via `ux:copiar:<uuid>` em bloco ````text`.
    - **Navegação Contextual e In-Place Edit**: Garantidos botões `[🔙 Central de Rotina]` (`ux:hub:rotina`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de agenda hoje/amanhã, tarefas do Notion, briefing matinal, check-in noturno e debriefing de plantão, com edição in-place prioritária sem flood de mensagens.
    - **Validação e Cobertura**: 100% aprovado na nova suíte canônica `tests/test_central_rotina_plantao_ux.cjs` (5 blocos completos), integrada ao manifest `scripts/test_manifest.json`, e recompilado `ultra_rotina_master.js` com sintaxe JS 100% OK.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização da Sala Vermelha & Emergências Médicas (`ux:hub:sala`, `ux:hub:emerg`)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`, `src/02_emergencia_choque_septico_circi.js`, `src/02_emergencia_crise_hipertensiva.js`, `src/02_pcr_gestante.js` e `src/07a_telegram_router.js`
    - **Função/Componente/Seletor**: Funções `enviarMenuSalaVermelha`, `tratarComandoPcr`, `enviarMenuEmergChoque`, `enviarMenuEmergCriseHas`, `enviarMenuEmergGlasgow`, `enviarMenuEmergDengue`, `enviarMenuEmergCefaleia` e comandos `/sala`, `/emergencia`, `/pcr`, `/acls`, `/choque`, `/crisehas`
    - **Comportamento Esperado / Critério de Aceite**: Garantir navegação em 1 toque sem digitação manual, retorno contextual para `[🔙 Sala Vermelha]` (`ux:hub:sala`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos de emergência (PCR em 4 tempos, choque séptico/cardiogênico, crise hipertensiva, Glasgow e DVA rápida), com respostas determinísticas em 0ms e botão `[📋 Copiar para Prontuário]`.

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
7. [ ] **Auditoria e Otimização da Sala Vermelha & Emergências Médicas (`ux:hub:sala`, `ux:hub:emerg`)**:
    - Validar PCR/ACLS (`ux:conduta:pcr`, `/pcr`), Choque Séptico/Cardiogênico (`ux:emerg:choque`), Crise Hipertensiva (`ux:emerg:crisehas`), Glasgow (`ux:emerg:glasgow`), Dengue (`ux:emerg:dengue`) e DVA.
    - Garantir navegação em 1 toque sem digitação manual, retorno contextual para `[🔙 Sala Vermelha]` e `[🏠 Início]`.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 89 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 85 (Enfermaria / Notificação de Alerta SBAR para Equipe Multidisciplinar)*: Adicionar formatação de exportação rápida da Passagem SBAR adaptada para transmissão via canal seguro ou WhatsApp de enfermagem e fisioterapia, agrupando leitos com suporte ventilatório ativo, drenos e sondas.
- *Sugestão 86 (Enfermaria / Censo Dinâmico com Filtro de Gravidade)*: Adicionar filtros instantâneos no Painel de Leitos (`ux:painel:0`) permitindo visualizar exclusivamente leitos críticos (🔴 Instáveis) ou em vigilância (🟡), facilitando a priorização do médico durante a passagem de plantão e o round matinal.
- *Sugestão 87 (Rotina & Plantão / Sincronização Bidirecional com Google Calendar para Plantões em Escala)*: Adicionar parser inteligente de escala de plantão em PDF/texto que extraia automaticamente datas, hospitais e horários (ex: 12h ou 24h) e crie os eventos em lote no Google Calendar com alertas pré-plantão (D-1 para higiene do sono e D0 com kit de Sala Vermelha).
- *Sugestão 88 (Rotina & Plantão / Check-in de Hábitos por Voz em Fluxo Contínuo)*: Permitir que o médico envie um único áudio relatando os hábitos do dia (ex: "hoje treinei costas, fiz 40 questões do MedQuest e toquei violão por 30 minutos") e o sistema marque todos os checkboxes correspondentes no Notion Habit Log e atualize a timeline adaptativa em 1 única operação atômica.
- *Sugestão 89 (Rotina & Plantão / Exportação do Debriefing de Plantão para Prontuário Eletrônico com Assinatura Digital)*: Adicionar botão para gerar documento de Fechamento de Plantão formatado como laudo/relatório médico em PDF (`pdfkit`) com checklist de segurança preenchido e hash de integridade para anexar ao livro de ocorrências hospitalar.

---
