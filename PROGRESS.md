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

- [x] **Organização do Exame Físico por Sistemas em Linhas Separadas, Higienização de Modelos SOAP e Início Direto sem Atrito (`src/02_soap_ambulatorial.js`, `src/04_motores_ia.js`, `src/07a_telegram_router.js`, `src/12_experiencia_bot.js` e `tests/test_soap_ef_organizacao_ux.cjs`)**:
    - **Diagnóstico e Correção**:
      * Ajustada a exibição do Exame Físico (EF) em rascunhos e respostas de IA para segmentar cada sistema semiológico em linha individual (`Sinais Vitais:`, `Geral:`, `ACV:`, `AR:`, `Abdome:`, `Extremidades:`), facilitando leitura e cópia para prontuário (PEP).
      * Removidos botões de casos clínicos pré-fabricados (HAS, DM2, IVAS, Lombalgia) dos menus e telas do SOAP (`ux:amb:soap`, `/soap`, `novoCasoBot`).
      * Eliminado o bloqueio "Dados do caso atual mantidos. Envie a próxima informação." ao chamar `ux:usar:soap`, acionando diretamente a estruturação SOAP com os dados já existentes.
      * Removido o botão de modelo de EF avulso do menu Ambulatório (`ux:hub:amb`), mantendo o modelo de EF normal exclusivamente contextualizado dentro do caso clínico no SOAP (`[🩺 EF Normal]`).
    - **Validação e Resultados**: 100% de aprovação em `tests/test_soap_ef_organizacao_ux.cjs`, `tests/test_ambulatorio_ux.cjs`, `tests/test_soap_modo_e_receita_ux.cjs` e `tests/test_ef_normal_completo.cjs`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `processarAudioMensagemTelegram`, `processarAudioClinicoMultimodal` e rota `/api/chat` com `audioBase64`
    - **Comportamento Esperado / Critério de Aceite**: Garantir que áudios clínicos (ditado de corredor, passagem de leito) com ruído, falha de rede ou codecs webm/ogg/mp3 recebam processamento resiliente com fallback transparente para transcrição e estruturação SOAP sem perda de termos médicos nem falha de processo.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência (Todas as Abas do Bot e Cockpit)

> **Protocolo Mandatório de UX Beira-Leito para o Autoloop (Inspirado nos 4 Vídeos de Feedback Real)**:
> 1. **Navegação Contextual & Anti-Preso**: Botão `[🔙 Nome da Aba]` (voltando para o submenu exato de origem, sem cair na raiz genérica) + `[🏠 Início]` em 1 toque.
> 2. **Edição In-Place (`editMessageText`)**: Navegação fluida entre telas sem flood de novas mensagens, mantendo o histórico do chat limpo.
> 3. **Determinismo Instantâneo (0 ms) vs IA Desnecessária**: Respostas imediatas para fichas, condutas protocoladas, tabelas e calculadoras; IA reservada exclusivamente para raciocínio clínico aberto e casos complexos.
> 4. **Higienização de Botões & Anti-Ruído**: Eliminação de botões prematuros, botões fantasmas e menus redundantes.
> 5. **Redação Médica Canônica de Prontuário**: Textos de conduta objetivos, semiologia real descritiva, eliminação de saudações e enrolação.
> 6. **Ação Rápida de 1 Toque (`[📋 Copiar para Prontuário]` / `[📋 Copiar SOAP para PEP]`)**: Sempre fornecer botão de cópia de conduta/prescrição formatada para colar direto no prontuário/PEP.

1. [x] **Hub Consultas Rápidas de Bolso (`ux:hub:bolso`)**: Concluído (100% testado).
2. [x] **Hub Ambulatório & Atenção Primária (`ux:hub:amb`)**: Concluído (100% testado).
3. [x] **Calculadoras Clínicas & Escores (`ux:hub:calc`)**: Concluído (100% testado).
4. [x] **Hub Ginecologia & Obstetrícia (`ux:rotina:go`)**: Concluído (100% testado).
5. [x] **Gestão de Leitos, Passagem SBAR & Prescrição (`ux:hub:enf`)**: Concluído (100% testado).
6. [x] **Central de Rotina & Plantão do Médico (`ux:hub:rotina`)**: Concluído (100% testado).
7. [x] **Sala Vermelha & Emergências Médicas (`ux:hub:sala`)**: Concluído (100% testado).
8. [x] **Modo SOAP & Prescrição Ambulatorial Ágil (`ux:soap`, `/soap`)**: Concluído (100% testado).
9. [x] **Cockpit PWA Mobile & Sincronização em Tempo Real (`cockpit_movel.html`)**: Concluído (100% testado).
10. [x] **Auditoria de Resiliência de Payload e Sanitização das Rotas Fastify do Servidor (`server/index.js`, `server/validators.js` e `server/runtime.js`)**: Concluído (100% testado).
11. [x] **Motores de IA e Fallback Local (`src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`)**: Concluído (100% testado).
12. [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**: Validar processamento de áudio, ditado de corredor, tolerância a falhas na transcrição multimodal e fallback estruturado para SOAP.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Sala Vermelha / Hipercalemia Grave)*: Kit prescritivo em 1 toque do tripé da hipercalemia (K+ > 6.0 ou alteração de ECG) combinando Estabilização de Membrana (Gluconato 10%), Shift Intracelular (Glicoinsulina + Beta-2 inalatório) e Eliminação Corpórea (Furosemida / Resinas) com vigilância seriada de ritmo e glicemia.
- *Sugestão 02 (Sala Vermelha / Intubação SRI)*: Alerta sentinela de colapso hemodinâmico bloqueando o uso inadvertido de drogas vasodilatadoras (Propofol ou Midazolam) em pacientes em choque com Noradrenalina, direcionando para Etomidato (0,3 mg/kg) ou Quetamina (1,5-2 mg/kg).
- *Sugestão 03 (Nefrologia & UTI / Hidratação)*: Calculadora integrada de reposição de potássio IV (KCl 19,1%) calculando concentração máxima permitida para acesso periférico (40 mEq/L) vs central (60 mEq/L) e velocidade horária máxima (10-20 mEq/h sob monitorização cardíaca).
- *Sugestão 04 (Farmacologia de UTI / Acessos)*: Matriz esquemática de alocação de fármacos por lúmen de Cateter Venoso Central (CVC de duplo/triplo lúmen) para evitar incompatibilidade físico-química: distal (vasopressores/DVA), medial (NPT/sangue) e proximal (sedoanalgesia/bolus).
- *Sugestão 05 (Emergência Respiratória / Gasometria)*: Alvos de ventilação mecânica protetora na SDRA acoplados à gasometria (VT 6 mL/kg de peso predito pela altura, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin).

---
