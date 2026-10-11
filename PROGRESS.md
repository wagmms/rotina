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

- [x] **Auditoria e Otimização da Aba Calculadoras Clínicas & Escores (`ux:hub:calc`, `src/12_experiencia_bot.js`, `src/07f_telegram_calculadoras_parser.js`, `cockpit_movel.html` e `tests/test_calculadoras_ux.cjs`)**:
    - **Diagnóstico e Otimização UX**: A aba de calculadoras e o Cockpit PWA possuíam inconsistências de navegação contextual, ausência de Parkland e Glasgow-P nos seletores táteis do Cockpit e validação Fastify (`server/validators.js`) restrita sem os tipos modernos e limites biológicos de SCQ.
    - **Implementação Determinística (0ms) e Protocolo Beira-Leito**: Integradas em 0ms as 6 calculadoras prioritárias (Gasometria arterial completa com Winter e Ânion Gap, Clearance Cockcroft-Gault vs CKD-EPI 2021, Hidratação Venosa Pediátrica Holliday-Segar, Glasgow-P com alerta de via aérea definitiva se GCS ≤ 8, Parkland em grandes queimados e DVA Noradrenalina na BIC) tanto no Telegram quanto no Cockpit (online e offline local).
    - **Retorno Contextual e Cópia em 1 Toque**: Garantidos botões `[🔙 Calculadoras]` (`ux:hub:calc`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos fluxos e comandos (/calc e texto livre no fast-path). Respostas formatadas com bloco de cópia ````text` via `ux:copiar:<hash>` para colagem instantânea no prontuário eletrônico (PEP).
    - **Validação e Cobertura**: Criada suíte canônica `tests/test_calculadoras_ux.cjs` (7 seções completas de UI/UX, comandos e presets), integrada ao manifesto de testes (`scripts/test_manifest.json`). Recompilado `ultra_rotina_master.js` (56.934 linhas, 100% sintaxe OK). 100% aprovado na bateria completa `npm run test:all` (232/232 suítes verdes em 17.69s).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria e Otimização do Hub Unificado de Ginecologia & Obstetrícia (`ux:rotina:go`, Telegram e Cockpit)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`, `src/07a_telegram_router.js` e `src/02_centro_obstetrico.js`
    - **Função/Componente/Seletor**: Função `enviarMenuUXGinecoObstetricia`, handlers `go_*` e comandos `/go`, `/prenatal`, `/parto`, `/hpp`, `/mgso4`
    - **Comportamento Esperado / Critério de Aceite**: Garantir retorno contextual para `[🔙 Hub G&O]` (`ux:rotina:go`) e `[🏠 Início]` (`ux:hub:inicio`) em 100% dos 10 submódulos (Pré-Natal & DPP, Parto/Partograma, HPP 4 Ts, Pré-Eclâmpsia & MgSO4, Prematuridade/RPMO, Toxoplasmose, Vulvovaginites, Preventivo INCA, Anticoncepção OMS e DIP), respostas determinísticas em 0ms sem IA desnecessária e botão de 1 toque `[📋 Copiar Conduta para Prontuário]` em todas as saídas.

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

> 💡 Catálogo completo de 80 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 76 (Ambulatório / Controle Especial e Notificação)*: Adicionar templates estruturados em 1 toque de Receituário de Controle Especial (Portaria SVS/MS nº 344/98 - Listas C1 e B1) e Notificação de Receita B (Psicotrópicos) com cálculo automático da quantidade necessária para 30 ou 60 dias de tratamento.
- *Sugestão 77 (Ambulatório / Validação de Atestado Digital com QR Code)*: Implementar hash de integridade e metadados criptográficos para validação de atestado médico pelo empregador ou serviço de perícia, minimizando adulterações em declarações emitidas pelo consultório digital.
- *Sugestão 78 (Calculadoras / Gasometria Arterial)*: Adicionar cálculo automático do Gradiente Alvéolo-Arterial de O₂ (P(A-a)O₂ = [FiO₂ × (Patm - PH₂O) - (PaCO₂ / R)] - PaO₂) com valor de referência ajustado por idade (Idade / 4 + 4) e alerta de shunt intrapulmonar ou alteração V/Q nas análises gasométricas arteriais (`ux:calc:gaso` e Cockpit PWA).
- *Sugestão 79 (Calculadoras / Parkland & Queimados)*: Adicionar temporizador regressivo e alerta horário no Cockpit PWA para término da 1ª etapa de ressuscitação volêmica (primeiras 8h a contar do horário exato do trauma), com campos de input para volume já administrado na ambulância (SAMU) e compensação automática no volume restante de Ringer Lactato.
- *Sugestão 80 (Calculadoras / Glasgow-P Pediátrico)*: Implementar toggle de adaptação pediátrica para a Escala de Coma de Glasgow em lactentes e crianças menores de 4 anos (balbucio/choro consolável em vez de orientação verbal e retração à dor em vez de localização), garantindo acurácia neurológica beira-leito em trauma pediátrico.

---
