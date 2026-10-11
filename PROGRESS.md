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

- [x] **Auditoria e Otimização da Interface e Responsividade do Cockpit PWA (`cockpit_movel.html`, `server/runtime.js` e `src/13_cockpit_integracao.js`)**:
    - **Diagnóstico e Correção**:
      * Em `src/13_cockpit_integracao.js`: Sincronizada a `revision` de `modoBot(chat)` com `soapview_` em `salvarSoapCockpit_`; corrigida `cockpitConsultar` para exibir prontuários SOAP recentes mesmo quando sem edição pendente (`!estado && resultado.texto`); e integrado salvamento imediato do SOAP no Cockpit ao processar casos no Telegram em `src/02_soap_ambulatorial.js`.
      * Em `cockpit_movel.html`: Implementada `cockpitRenderizarSoap` com suporte polimórfico (objeto `dados` ou string `soapTexto`); criadas `abrirModalCalc` e `fecharTodosModais` com chamada defensiva em `navegarAba` para eliminação de modais travados; adicionados todos os 12 modais existentes com listeners de toque no backdrop e tecla Escape em `configurarTecladosModaisAmbulatorioESbar`; implementada persistência dupla de cálculos recentes em memória offline (`sessionStorage` e `localStorage`); refatorada a fila offline com descarte de itens com >= 5 falhas consecutivas; e adicionado `flex-wrap` defensivo nos botões de cópia (Asma, Gaso, Heart e Ambulatorial) prevenindo estouro de layout em telas de 320px a 420px.
      * Paridade estrita SHA-256 mantida com `gh_cockpit_deploy/index.html`.
    - **Validação e Cobertura**: 100% aprovado na suíte dedicada `tests/test_cockpit_soap_modais_responsividade.cjs` (4/4 blocos), além de 100% de sucesso nas suítes `test_cockpit_historico_calculos.cjs`, `test_cockpit_offline_indexeddb.cjs`, `test_cockpit_acessibilidade_modais_sbar.cjs`, `test_cockpit_integracao.cjs`, `test_cockpit_carga_e_teclados.cjs`, `test_cockpit_resiliencia_e_offline.cjs`, `test_cockpit_resiliencia_rede.cjs` e `test_soap_modo_e_receita_ux.cjs`.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria de Resiliência de Payload e Sanitização das Rotas Fastify do Servidor (`server/index.js`, `server/validators.js` e `server/runtime.js`)**:
    - **Arquivo/Módulo Alvo**: `server/index.js`, `server/validators.js` e `server/runtime.js`
    - **Função/Componente/Seletor**: Middleware de validação de schemas Fastify, endpoints `/api/cockpit`, `/api/chat` e tratamento de erros malformados (400 Bad Request)
    - **Comportamento Esperado / Critério de Aceite**: Garantir que payloads JSON truncados, campos numéricos fora dos limites fisiológicos ou sessões expiradas retornem respostas defensivas padronizadas sem derrubar a instância Fastify nem vazar stack traces ao cliente.

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
10. [ ] **Motores de IA e Fallback Local (`src/04_motores_ia.js`, `src/04_ia_local_fallback.js` e `server/index.js`)**: Validar timeout resiliente, Fast-Ack e respostas determinísticas locais em caso de indisponibilidade da API do Gemini.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo de 104 sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 100 (Cockpit PWA / Sincronização Automática em Background via Web Worker / BroadcastChannel)*: Utilizar Web Workers dedicados e `BroadcastChannel` para desacoplar a fila de sincronização de rede da thread principal do DOM, garantindo renderização fluida a 60 fps em smartphones de entrada e tablets médicos sem bloqueio de microtarefas durante o envio em lote de ações offline.
- *Sugestão 101 (Cockpit PWA / Gestos de Swipe para Ações Rápidas nos Leitos e Calculadoras)*: Implementar suporte a gestos touch nativos (`touchstart`/`touchend` com feedback haptic) para que o médico possa deslizar o card de um leito para a direita para marcar como 'Estável' ou para a esquerda para abrir o modal SBAR em 1 gesto rápido durante o round.
- *Sugestão 102 (Cockpit PWA / Exportação do Histórico de Cálculos do Plantão em CSV/JSON Criptografado)*: Adicionar botão de exportação segura do histórico de cálculos do plantão para auditoria médica local ou registro em prontuário eletrônico hospitalar, permitindo download direto com sanitização de identificadores conforme a LGPD.
- *Sugestão 103 (Cockpit PWA / Atalhos de Teclado Físico para Uso em Tablet e Desktop Hospitalar)*: Implementar atalhos globais de teclado (ex: `Alt+1` para Leitos, `Alt+2` para Cálculos, `Alt+3` para Farmacologia, `Ctrl+K` para busca universal e `Esc` para fechar modais) para médicos que utilizam o Cockpit em estações de trabalho de enfermagem ou tablets acoplados com teclado.
- *Sugestão 104 (Cockpit PWA / Modo Alto Contraste Solar para Atendimento Pré-Hospitalar & SAMU)*: Criar modo visual com fundo branco puro, tipografia em preto sólido e bordas reforçadas para uso sob luz solar intensa em viaturas de resgate ou atendimento de rua, mantendo alternância em 1 toque com o tema dark hospitalar padrão.

---
