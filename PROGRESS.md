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

- [x] **Otimização do Pool de Modelos Gemini, Correção de HTTP 400 em thinkingBudget e Eliminação de Gargalo 429**:
    - **Diagnóstico e Correção de Argumento (HTTP 400)**: Mapeado que a Google AI API rejeita `thinkingBudget: 0` com `400 INVALID_ARGUMENT` em modelos rápidos/extrativos; removido o parâmetro para omitir `thinkingConfig` de forma limpa, permitindo que `gemini-3.5-flash-lite` e `gemini-flash-lite-latest` rodem em ~700ms sem erro.
    - **Mitigação do Esgotamento de Cota Diária (429 / 20 RPD)**: Deslocado `gemini-3.5-flash` (limitado a 20 RPD no Free Tier GCP) do topo para contingência tardia; promovido `gemini-3.7-flash` (200 OK) como prioritário clínico e `gemini-flash-lite-latest` como esteira rápida ultra-disponível.
    - **Saneamento de Modelos em Configurações e Utils**: Atualizados `IA_PADROES.GEMINI`, `IA_PADROES.GEMINI_GROUNDING`, `IA_MODELOS_RAPIDOS_GEMINI` e `IA_MODELOS_TTS_GEMINI` (`gemini-3.8-flash-tts` e `gemini-3.8-flash-lite-tts`, eliminando o modelo 2.5 obsoleto).
    - **Recompilação e Validação**: `npm run build` gerou `ultra_rotina_master.js` com 100% de integridade sintática e testes de callbacks e formatação PEP aprovados sem erros.
> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria de UX Beira-Leito e Navegação Contextual na Aba Emergências & Sala Vermelha Interna (Telegram)**:
    - Aplicar o protocolo das 6 regras de ouro (navegação contextual sem ficar preso, edição in-place sem flood, determinismo 0ms sem IA desnecessária, eliminação de botões fantasmas, redação canônica e botão de cópia de conduta) nos fluxos internos:
      * PCR (/pcr) e Arritmias Cardíacas (Taquiarritmias, Bradiarritmias, FA, ritmos de PCR).
      * Condutas de Sala Vermelha: EAP Hipertensivo, Anafilaxia, Crise Convulsiva, Hipercalemia e CAD.
      * SRI (/sri) e DVA (/dva): garantir botões de retorno contextual `[🔙 Sala Vermelha]` e `[🏠 Início]` em vez de jogada cega para o menu raiz.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas (`Gerar PDF` inútil em emergência, etc.) e menus redundantes ("outras opções" duplicando opções já visíveis).
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva (sem "alterações não relatadas"), eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [ ] **Auditoria e Otimização da Aba Emergências & Sala Vermelha Interna (`ux:sala`, `ux:conduta:*`, `ux:emerg:*`)**:
    - Validar e higienizar fluxos de PCR, Arritmias, EAP, CAD, Anafilaxia, Convulsão, Hipercalemia, Dengue C/D, Cefaleia, SRI e DVA.
    - Eliminar botões fantasmas (`Gerar PDF`, `Ver critérios`), garantir edição in-place e rodapés navegacionais com `[🔙 Sala Vermelha]` e `[🏠 Início]`.
2. [ ] **Auditoria e Otimização da Aba Consultas Rápidas de Bolso (`ux:hub:bolso`)**:
    - Validar submódulos: Antibióticos por Foco (`ux:bolso:atb`), Doses Pediátricas por Peso (`ux:bolso:ped`), Gestação & Lactação (`ux:bolso:gestacao`), Interações Medicamentosas Graves (`ux:bolso:interacao`) e Diluição HSL (`ux:bolso:hsl`).
    - Garantir retorno contextual para `[🔙 Consultas de Bolso]`, entrega de respostas em 0ms sem chamadas redundantes de IA e botão `[📋 Copiar Conduta]`.
3. [ ] **Auditoria e Otimização da Aba Ambulatório & Atenção Primária (`ux:hub:amb`)**:
    - Validar fluxos de CID-10 & CIAP-2 Rápido (`ux:amb:cid`), Prescrição REMUME SUS (`ux:amb:remume`), Atestado Médico CFM (`ux:amb:atestado`) e Receituário de Controle Especial (C1/B1).
    - Assegurar botões de retorno para `[🔙 Ambulatório]` e `[🏠 Início]`, além de botões imediatos de cópia e impressão sem passos intermediários desnecessários.
4. [ ] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc` e Cockpit)**:
    - Validar Gasometria Arterial completa (`ux:iniciar:gaso`), Cockcroft vs CKD-EPI (`calc_Cockcroft`, `calc_CKD`), Hidratação Holliday-Segar (`ux:enf:hidratacao`), Glasgow e Escores de Risco.
    - Validar Calculadora de Queimaduras (Parkland / Brooke) no Cockpit (reposição em 24h, regra dos 9 de Wallace, 4 mL/kg/% SCQ, frações 50% nas primeiras 8h e diurese alvo).
    - Validar Calculadora de Drogas Vasoativas (/dva e Cockpit): taxa de infusão (mcg/kg/min para mL/h) com presets táteis de ampolas e salvaguardas anti-dose excessiva.
    - Garantir retorno consistente para `[🔙 Calculadoras]` ou para o cenário clínico chamador (Enfermaria ou Sala Vermelha), eliminando telas órfãs.
5. [ ] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`)**:
    - Validar os 10 submódulos de G&O: Pré-Natal & DPP (`go_prenatal`), Parto/Partograma (`go_parto`), HPP 4 Ts (`go_hpp`), Pré-Eclâmpsia & MgSO4 (`go_mgso4`), Prematuridade/RPMO (`go_prematuridade`), Toxo (`go_toxo`), Vulvovaginites (`go_corrimento`), Preventivo INCA (`go_preventivo`), Anticoncepção OMS (`go_anticoncepcao`) e DIP (`go_dip`).
    - Substituir retornos genéricos para o menu raiz por `[🔙 Hub G&O]` e `[🏠 Início]`, com condutas prescritivas instantâneas (0ms) e botão de cópia de conduta.
6. [ ] **Auditoria e Otimização da Gestão de Leitos, Passagem SBAR & Prescrição Hospitalar (`ux:hub:enf`)**:
    - Validar Painel de Leitos (`ux:painel:0`), Abertura de Leito Individual (`ux:leito:*`), Evolução Diária (`ux:evoluir:*`), Alta Hospitalar (`ux:alta:*`) e Passagem SBAR (`ux:enf:sbar`).
    - Garantir que nenhum estado de censo ou evolução deixe o médico sem opções de navegação direta para `[🔙 Enfermaria]` ou `[🏠 Início]`.
7. [ ] **Auditoria e Otimização da Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**:
    - Validar Agenda do Dia/Amanhã (`ux:rotina:agenda`, `ux:rotina:agenda_amanha`), Tarefas do Plantão (`ux:rotina:tasks`), Check-in / Briefing (`ux:rotina:checkin`, `rotina_briefing`) e Encerramento de Plantão (`ux:rotina:plantao_fim`).
    - Garantir navegação em 1 toque sem digitação manual, com retorno para `[🔙 Central de Rotina]` e `[🏠 Início]`.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)
*(Seção dedicada para registrar oportunidades e sugestões levantadas durante os testes de funções, sem implementação imediata no código)*

> 💡 Catálogo completo de 60 sugestões anteriores arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 56 (Telegram / Emergência Respiratória)*: Atalhos inline `/asma` e `/dpoc` com botões táteis de 1 toque para classificação rápida de crise asmática/DPOC em 3 níveis (Leve/Moderada, Grave, Ameaça à Vida/Tórax Silencioso) gerando conduta imediata formatada para copiar para PEP.
- *Sugestão 57 (Telegram / Visual)*: Barras de progresso e gravidade com blocos semafóricos em emojis (`🟩🟩🟨⬜⬜`) no Telegram para sumarização visual imediata de escores de risco clínico beira-leito (ex: FRAX, CURB-65, TIMI, Wells, qSOFA) e metas terapêuticas.
- *Sugestão 58 (Telegram / UX)*: Pulsador contínuo de status de digitação (`sendChatAction: typing` periódico com timer/thread) durante processamento de consultas clínicas discursivas complexas via IA (Gemini Pro) para manter feedback de vida ativo e evitar sensação de travamento na rede móvel hospitalar.
- *Sugestão 59 (Telegram / UI)*: Modo "Resumo Telegráfico Ultra-Curto" (toggle `/modo_curto` ou `/conciso`) para médicos veteranos que desejam apenas dosagens em bullets puros sem qualquer contextualização clínica secundária.
- *Sugestão 60 (Telegram / Farmacologia)*: Card de conduta em formato "Checklist Beira-Leito" com checkboxes visuais preenchíveis inline para conferência ágil de passos de ressuscitação em emergências.

---

## 📦 Histórico de Melhorias Concluídas

> 📁 Histórico completo de 83 melhorias anteriores arquivado e documentado em [CHANGELOG.md](CHANGELOG.md).
