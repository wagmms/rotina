# 💡 Catálogo Completo de Sugestões de Melhorias Futuras (Ultra Rotina)

> Documentação de oportunidades e melhorias levantadas durante os testes e auditorias de funções.

## 💡 Sugestões de Melhorias Futuras` (exclusivamente como documentação de sugestões, sem desviar a execução para implementação de novas features agora).

---

## 🔄 Tarefa Concluída

- [x] **Expansão e Refinamento do Modelo de Exame Físico Normal Completo no Telegram e Cockpit**:
    - Substituída a string simplificada "EF normal" pelo modelo semiológico canônico completo (Ectoscopia, Sinais Vitais com preservação dos dados prévios informados, ACV, AR, Abdome, Extremidades com TEC < 3s).
    - Removido o cabeçalho redundante `[Exame Físico]: Exame físico geral e segmentar completo sem alterações / totalmente normal.`, iniciando diretamente em `Sinais Vitais:` seguido de `Bom estado geral...`.
    - Eliminado o termo `(rítmico)` da FC e garantido o preenchimento com `[   ]` para sinais vitais não aferidos/informados.
    - Eliminada a mensagem intermediária de texto ("🩺 Exame físico registrado como totalmente normal. Atualizando rascunho..."), entregando diretamente a mensagem do SOAP atualizado com feedback sutil via toast.
    - Garantida a expansão determinística no campo Objetivo (O) do SOAP tanto na Fase 1 quanto na Fase 2, proibindo a redução da IA a resumos simplistas.
    - Omitida a cobrança ativa redundante de manobras de EF básico na Fase 1 quando o EF completo já estiver registrado.
    - Corrigido o balanceamento de caracteres de Markdown em `_iaFinalizarTexto` para evitar perda de formatação (negritos e itálicos) no Telegram.
    - Suíte de testes `test_ef_normal_completo.cjs` e suíte geral `npm test` aprovadas com 100% de sucesso.

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


- *Sugestão 28 (SOAP / Exame Físico)*: Menu seletor rápido de modelos normais dirigidos por especialidade médica (ex: Pediátrico normal com fontanelas e reflexos arcaicos, Geriátrico/AGA com marcha e funcionalidade, Neuro normal com pares cranianos detalhados) expansíveis em 1 toque diretamente no botão [🔬 Exames].

- *Sugestão 1 (Cockpit)*: Busca rápida instantânea por texto com filtro de medicamentos padronizados na REMUME.
- *Sugestão 2 (Cockpit)*: Modo noturno (Dark Mode) de alto contraste para economia de bateria e conforto visual no plantão.
- *Sugestão 3 (Telegram / Cockpit)*: Botão de 1 toque para cópia direta estruturada em formato SOAP / PEP compatível com prontuários eletrônicos ambulatoriais.
- *Sugestão 4 (Telegram - Atalhos de 1 Toque)*: Teclado inline expansível no comando `/gaso` com botões de pré-seleção rápida para distúrbios comuns (ex: Cetoacidose / Acidose Metabólica, Alcalose Respiratória, Retenção Crônica de DPOC) para agilizar o preenchimento sem digitação manual de parâmetros em emergências.
- *Sugestão 5 (Telegram / Sala Vermelha)*: Cronômetro interativo com alerta sonoro/notificação no Telegram para ciclos de 2 minutos de RCP no ACLS (`/pcr`), alertando a troca de socorrista, checagem de ritmo e tempo da próxima dose de adrenalina (a cada 3-5 min).
- *Sugestão 6 (Calculadoras / Cockpit)*: Calculadora integrada de Reposição de Potássio IV (KCl 19,1%) calculando concentração máxima em acesso periférico (40-60 mEq/L) vs acesso venoso central e velocidade de infusão máxima (máx 10-20 mEq/h com monitoração cardíaca) acoplada diretamente ao alerta de hipocalemia.
- *Sugestão 7 (Telegram - Farmacologia)*: Botão inline de checagem imediata de diluição e compatibilidade em Y no Guia Farmacêutico HSL quando uma droga vasoativa (ex: Noradrenalina ou Dobutamina) for calculada via `/dva`.
- *Sugestão 8 (Cockpit / PWA)*: Sincronização em segundo plano (Background Sync API) com fila outbox no IndexedDB para envio automático de prescrições e atualizações de leitos assim que o dispositivo recuperar conexão de rede após áreas de sombra no hospital.
- *Sugestão 9 (Cockpit PWA)*: Tema "Plantão Noturno / Sala Escura" com fundo OLED puro (#000000) e tipografia em tons de âmbar/vermelho escuro para conforto visual e conservação de bateria no plantão da madrugada.
- *Sugestão 10 (Calculadoras / Cockpit)*: Calculadora integrada de reposição de Magnésio e Fósforo IV para prevenção e manejo precoce da根 Síndrome de Realimentação em pacientes desnutridos ou em jejum prolongado na enfermaria/UTI.
- *Sugestão 11 (Calculadoras)*: Implementar validação cruzada entre clearance estimado (Cockcroft) e eTFG (CKD-EPI) ao gerar alertas de ajuste renal para evidenciar discrepâncias em obesos e sarcopênicos.
- *Sugestão 12 (Gasometria)*: Adicionar cálculo visual do triângulo de Siggaard-Andersen para auxiliar o médico na compreensão do desvio de base.
- *Sugestão 14 (Telegram - Mensagens Longas)*: Adicionar botão inline automático "📄 Ver Resumo Completo no Cockpit PWA" quando uma conduta for fragmentada em 3 ou mais partes, oferecendo opção de leitura contínua sem rolagem infinita.
- *Sugestão 15 (Telegram / Sala Vermelha)*: Teclado inline com botões para pontuação direta da Escala de Glasgow por componentes (Abertura Ocular: 1 a 4, Resposta Verbal: 1 a 5, Resposta Motora: 1 a 6) com soma automática e cálculo de reatividade pupilar (GCS-P) para traumatismo cranioencefálico.
- *Sugestão 16 (Telegram - Conexões Instáveis)*: Mecanismo de handshake leve com heartbeat de 10s via chatAction para avaliar latência da rede hospitalar antes de disparar payloads pesados com fallbacks adaptativos.
- *Sugestão 17 (Backend / Telemetria)*: Implementar exportação Prometheus / OpenTelemetry (`/metrics`) com gauges e histogramas padronizados de latência de IA multimodal e tempo de resposta do Fastify para dashboards externos (Grafana/Datadog).
- *Sugestão 18 (Backend / Resiliência)*: Circuit Breaker determinístico com estados Closed/Open/Half-Open para chamadas de provedores LLM externos (Gemini/Groq/OpenRouter), evitando retenção de conexões e travamento de threads em casos de timeout prolongado da API externa.
- *Sugestão 19 (Cockpit PWA / Telemetria)*: Envio assíncrono em lote (Beacon API / navigator.sendBeacon) de métricas de telemetria de performance do frontend (Web Vitals: LCP, FID, CLS e latência de toque nos cards) diretamente para `/api/telemetria/ao-vivo` no encerramento ou pausa de sessão do plantão.
- *Sugestão 20 (Cockpit PWA)*: Implementar Web Share API para compartilhamento seguro de prescrições e orientações de alta via WhatsApp ou PDF diretamente pelo dispositivo móvel.
- *Sugestão 21 (Cockpit / Calculadoras)*: Implementar histórico local dos últimos 5 cálculos realizados na sessão do plantão (IndexedDB/sessionStorage) para recuperação rápida com 1 toque sem redigitação de valores prévios.
- *Sugestão 22 (Backend / Caching)*: Adicionar ETag HTTP determinístico no endpoint de REMUME e Guia Farmacêutico para permitir respostas HTTP 304 Not Modified, eliminando transferências redundantes de dados em reconexões.
- *Sugestão 23 (Cockpit / Offline)*: Implementar busca fuzzy determinística na REMUME local para tolerar pequenas variações e erros de digitação rápidos beira-leito sem necessidade de internet.
- *Sugestão 24 (Backend / Fastify)*: Implementar suporte a cabeçalho `Clear-Site-Data` em endpoint administrativo de redefinição de sessão para expurgo limpo de caches e Service Workers corrompidos no plantão.
- *Sugestão 25 (Telegram / UI)*: Mini-gráfico Sparkline em caracteres Unicode ( ▂▃▅▆▇) no sumário de glicemia (`/diabetes`) para visualização instantânea de tendência sem payload de imagem.
- *Sugestão 26 (Segurança / Fastify)*: Suporte a chave de Rate-Limit por Token/Sessão médica (em vez de apenas IP) para ambientes hospitalares onde dezenas de médicos compartilham o mesmo IP de gateway/NAT da rede Wi-Fi corporativa da instituição, evitando que o tráfego agregado de múltiplos médicos atinja o limite por IP.
- *Sugestão 27 (Segurança / Cockpit)*: Adicionar cabeçalho `Permissions-Policy` (geolocalização, câmera, acelerômetro restritos, mantendo apenas microfone para ditado do preceptor) para reforçar privacidade beira-leito.
- *Sugestão 28 (Cockpit / Acessibilidade)*: Adicionar chave de alternância "Modo Alto Contraste Solar / Ao Ar Livre" (Monocromático / Preto e Branco invertido com taxa de contraste > 15:1) acionável por 1 toque no cabeçalho para leitura perfeita sob sol pleno em transferências de ambulância e heliponto.
- *Sugestão 29 (Cockpit / Acessibilidade)*: Implementar feedback auditivo discreto (Web Audio API / bips com frequências distintas para erro crítico vs sucesso) na marcação de itens da Sala Vermelha, permitindo que o médico valide os passos da conduta mesmo sem olhar fixamente para a tela durante a ressuscitação.
- *Sugestão 30 (Cockpit / Sala Vermelha)*: Metrônomo sonoro e visual integrado de RCP com 100-120 bpm na aba de TV Instável / PCR da Sala Vermelha para manter a cadência ótima de compressões torácicas no ACLS beira-leito.
- *Sugestão 31 (Backend / Resiliência)*: Dashboard visual ou endpoint SSE `/api/circuit-breaker/stream` com telemetria em tempo real das transições de estado (CLOSED -> OPEN -> HALF_OPEN) e taxas de timeout dos provedores de IA para observabilidade no Cockpit.
- *Sugestão 32 (Multimodal / Áudio)*: Implementar transcrição preliminar com Web Speech API nativa do dispositivo diretamente no Cockpit PWA antes do envio do áudio, permitindo conferência e edição prévia do texto ditado pelo médico antes do handshake de rede.
- *Sugestão 33 (Segurança / Fastify)*: Documentação interativa de API via OpenAPI / Swagger UI (`/docs`) gerada diretamente a partir dos schemas JSON Fastify já declarados para auditoria rápida de contratos e parâmetros beira-leito.
- *Sugestão 34 (Calculadoras / Resiliência)*: Validação cruzada estrita entre calculadoras de DHE e ECG prévio no handshake, disparando alerta automático de ECG mandatório quando K+ > 6.0 mEq/L ou Na+ < 120 mEq/L antes de calcular a taxa de infusão.
- *Sugestão 35 (Cockpit / Passagem de Plantão)*: Exportação rápida do histórico de cálculos da sessão em formato de sumário de passagem de plantão / transferência estruturado (incluindo horário, peso e parâmetros de DVA/SRI/Gaso).
- *Sugestão 36 (Cockpit / Calculadoras)*: Recurso de "Fixar Cálculo" (Pin) no histórico da sessão para manter cálculos críticos de pacientes instáveis permanentemente no topo do painel durante todo o turno.
- *Sugestão 37 (Calculadoras / Sala Vermelha)*: Calculadora de Osmolaridade e Osmolalidade Plasmática Efetiva com cálculo de Osmolar Gap acoplada à gasometria e sódio sérico para investigação de intoxicações exógenas por álcoois tóxicos (metanol, etilenoglicol) e cetoacidose diabética.
- *Sugestão 38 (Cockpit / Farmacologia de UTI)*: Visualização em árvore/matriz gráfica de múltiplos lúmens de CVC com alocação recomendada de fármacos (lúmen distal para vasopressores/medicação contínua crítica, medial para nutrição parenteral/sangue, proximal para sedoanalgesia/bolus) para prevenir incompatibilidades físico-químicas em acessos venosos centrais de múltiplos lúmens.
- *Sugestão 39 (Cockpit / Resiliência de Rede)*: Detecção proativa de degradação de sinal via Network Information API (`navigator.connection.effectiveType` e `navigator.connection.rtt`) para calibrar dinamicamente os timeouts e antecipar modo de baixo consumo em redes Wi-Fi hospitalares com alta perda de pacotes.
- *Sugestão 40 (Cockpit / UX)*: Indicador visual de pulso / batimento de dados (Heartbeat Ping) discreto no cabeçalho durante atendimentos críticos na Sala Vermelha, confirmando em tempo real a sincronia do censo e gasometrias seriadas.
- *Sugestão 41 (Cockpit / Telemetria)*: Compressão com gzip/deflate de snapshots volumosos no IndexedDB para economizar quota de armazenamento local em smartphones hospitalares com pouca memória livre.
- *Sugestão 42 (Cockpit / SBAR)*: Adicionar botão de exportação da Passagem SBAR em formato PDF para arquivamento ou anexação ao prontuário hospitalar.
- *Sugestão 43 (Cockpit / Acessibilidade)*: Navegação completa por atalhos de teclado físico (para uso em tablets e notebooks com teclado externo na enfermaria: ex: `Ctrl+K` para busca de fármacos, `Alt+S` para abrir SBAR, `Alt+P` para prescrição).
- *Sugestão 44 (Telegram / Prescrição)*: Comando `/sbar` direto no bot do Telegram aceitando parâmetros rápidos (`/sbar leito 12 ...`) para formatação automática e envio de passagem de plantão segura via chat.
- *Sugestão 45 (Cockpit / Farmacologia)*: Cache offline persistente de monografias e fichas completas do Guia HSL no IndexedDB com indicador visual de sincronização diferencial.
- *Sugestão 46 (Telegram / Farmacologia)*: Comando `/posologia <fármaco>` com resposta instantânea em card compacto contendo dose usual, dose máxima diária, diluição padrão e alerta de ajuste renal beira-leito.
- *Sugestão 47 (Gasometria / Telegram)*: Suporte a envio de foto de fita impressa de aparelho de gasometria com extração OCR multimodal direta (pH, pCO2, HCO3, eletrólitos e lactato) com preenchimento automático em 0ms.
- *Sugestão 48 (Gasometria / Sala Vermelha)*: Sugestão de alvos de ventilação mecânica invasiva (VT 6 mL/kg de peso predito, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo) acoplada diretamente ao resultado do passo 5 (oxigenação e relação P/F) na SDRA.
- *Sugestão 49 (Telegram / UX)*: Botão de alternância rápida entre Gasometria Arterial vs Venosa Central (ScvO2 e delta-pCO2 / pCO2 venosa - arterial com corte de 6 mmHg para ressuscitação hemodinâmica).
- *Sugestão 50 (Backend / Fastify)*: Middleware de sanitização recursiva contra XSS / injeção de HTML nos payloads de texto livre (anamnese, evolução, SOAP e leitos) antes de persistir no banco ou propagar para o PWA.
- *Sugestão 51 (Backend / Resiliência)*: Compressão brotli/gzip adaptativa por nível de bateria do dispositivo móvel reportado pelo header `Save-Data` / `Sec-CH-UA-Reduced-Data` para conexões de baixa largura de banda no hospital.
- *Sugestão 52 (Backend / Telemetria)*: Painel de telemetria com contadores de payloads rejeitados agrupados por código de erro (JSON malformado, limites fisiológicos, protótipo inválido) exposto em `/api/telemetria/sanitizacao` para detecção proativa de anomalias de clientes.
- *Sugestão 53 (Calculadoras / Nefrologia)*: Calculadora integrada de Taxa de Filtração Glomerular pela equação CKD-EPI 2021 (sem coeficiente racial) no Cockpit PWA em paralelo ao Cockcroft-Gault para comparação direta beira-leito entre estadiamento de DRC e ajuste farmacológico.
- *Sugestão 54 (Calculadoras / Hidratação)*: Protocolo interativo de reposição de potássio com cálculo automático de limite de concentração para acesso venoso periférico (máximo 40 mEq/L) versus acesso venoso central (máximo 60 mEq/L) com alerta sonoro/visual de monitorização cardíaca contínua.
- *Sugestão 55 (Cockpit / Pneumologia)*: Feedback visual com indicador gráfico de saturação SpO2 e barra de cores dinâmica (verde 93-95% para asma, verde 88-92% com aviso amarelo/vermelho >92% para DPOC alertando hiperóxia e perda do drive hipóxico em tempo real).
- *Sugestão 56 (Telegram / Emergência Respiratória)*: Atalhos inline `/asma` e `/dpoc` com botões táteis de 1 toque para classificação rápida de crise asmática/DPOC em 3 níveis (Leve/Moderada, Grave, Ameaça à Vida/Tórax Silencioso) gerando conduta imediata formatada para copiar para PEP.
-*Sugestão 57 (Telegram / Visual)*: Barras de progresso e gravidade com blocos semafóricos em emojis (`🟩🟩🟨⬜⬜`) no Telegram para sumarização visual imediata de escores de risco clínico beira-leito (ex: FRAX, CURB-65, TIMI, Wells, qSOFA) e metas terapêuticas.
- *Sugestão 58 (Telegram / UX)*: Pulsador contínuo de status de digitação (`sendChatAction: typing` periódico com timer/thread) durante processamento de consultas clínicas discursivas complexas via IA (Gemini Pro) para manter feedback de vida ativo e evitar sensação de travamento na rede móvel hospitalar.
- *Sugestão 59 (Telegram / UI)*: Modo "Resumo Telegráfico Ultra-Curto" (toggle `/modo_curto` ou `/conciso`) para médicos veteranos que desejam apenas dosagens em bullets puros sem qualquer contextualização clínica secundária.
- *Sugestão 60 (Telegram / Farmacologia)*: Card de conduta em formato "Checklist Beira-Leito" com checkboxes visuais preenchíveis inline para conferência ágil de passos de ressuscitação em emergências.
- *Sugestão 61 (Telegram / Sala Vermelha)*: Botão de alternância rápida entre apresentação clínica inicial e critérios de desmame/tapering de DVA (Noradrenalina / Dobutamina / Vasopressina) com metas de PAM ≥ 65 mmHg e lactato em clareamento.
- *Sugestão 62 (Telegram / Emergência)*: Protocolo ágil de dose de ataque vs manutenção de Amiodarona venosa com pré-cálculo automático em SF 5% (300 mg em bolus na PCR chocável refratária vs 150 mg em 10 min na TV estável, seguido de 1 mg/min por 6h e 0,5 mg/min por 18h).
- *Sugestão 63 (Telegram / Dengue)*: Alerta visual com calculadora rápida de hematócrito e critério de hemoconcentração (aumento de 20% do Ht basal) para reclassificação dinâmica entre Grupo B e Grupo C no Telegram.
- *Sugestão 64 (Telegram / Cefaleia)*: Escore SNOOP4 com checklist interativo para estratificação imediata de bandeiras vermelhas em cefaleia aguda antes de liberar protocolo de analgesia primária.
- *Sugestão 65 (Pediatria / Farmacologia)*: Transição visual automática para formulação em comprimidos de adulto quando o paciente pediátrico tiver peso > 40-50 kg ou atingir o teto de adulto (exibir sugestão alternativa "Amoxicilina 500 mg: 1 cp VO de 8/8h" ao lado da suspensão de 250 mg/5 mL para evitar sobrecarga de volume líquido).
- *Sugestão 66 (Telegram / Fila de Entrega Confiável)*: Adicionar comando `/reprocessar_fila` ou botão de 1 toque no alerta de falha de integração externa (Notion/APIs) permitindo retry manual imediato de pedidos que permaneceram com status 'failed' na fila persistente sem exigir nova digitação do médico.
- *Sugestão 67 (Telegram / Neurologia)*: Adicionar atalhos de botões táteis inline de 1 toque no roteiro de exame físico neurológico (`/neuro` / `/ef_neuro`) para graduar força motora segundo a escala MRC (Grau 0 a 5) e sinais meníngeos (Brudzinski / Kernig), permitindo montagem automática do resumo neurológico sem digitação livre no plantão.
- *Sugestão 68 (Telegram / Fila & Resiliência)*: Exibir teclado com botões inline nos resultados de `/fila` (ex: `[📦 Ver Pedido 9]`, `[📋 Ver Entrega 9_1]`) para permitir navegação tátil direta entre pendências e histórico arquivado no chat sem necessidade de digitação manual de comandos textuais.
- *Sugestão 69 (SOAP / Didática & Ensino Médico)*: Implementar botão inline de 1 toque no rascunho SOAP Fase 1 `[💡 Racional Didático]` para exibir em popup/mensagem complementar o mapa semiológico completo (pergunta investigativa ➔ hipótese FMRP-USP a descartar) para residentes e acadêmicos, sem sobrecarregar a transcrição limpa de prontuário para o médico assistente.
- *Sugestão 70 (IA / Otimização de Inferência)*: Cache semântico de embeddings ou KV-cache para prompts extrativos de baixa latência em modelos Gemini 2.5/Flash-Lite quando `semThinking: true`, permitindo reaproveitamento de respostas estruturadas para consultas idênticas de CID-10, posologia e interações em 0ms sem consumo de cota de API.
- *Sugestão 71 (Segurança / RBAC Cockpit)*: Adicionar comando no Telegram `/cockpit_revogar_convidado` para invalidação imediata em cache de tokens HMAC emitidos (`ck_<hmac>`) quando um médico convidado concluir o plantão, oferecendo ciclo de vida de credenciais mais granular sem afetar o titular.
- *Sugestão 72 (Consultas de Bolso / Antimicrobianos)*: Adicionar seletor tátil de sensibilidade local / perfil microbiológico hospitalar (ex: taxa local de ESBL, MRSA ou Pseudomonas) no submenu de Antibióticos por Foco (`ux:bolso:atb`) para escalonamento automático de dose e tempo de infusão estendida de betalactâmicos conforme epidemiologia da UTI local.
- *Sugestão 73 (Consultas de Bolso / Pediatria)*: Implementar conversão automática de apresentações pediátricas líquidas para gotas em seringa dosadora ou colheres-medida (ex: 5 mL = 1 colher de chá, 15 mL = 1 colher de sopa) nos cards de cópia de conduta pediátrica (`ux:bolso:ped`), minimizando erros de administração domiciliar pelos cuidadores.
- *Sugestão 74 (Consultas de Bolso / Farmacovigilância)*: Adicionar busca multi-droga combinada em 1 toque no crosscheck de interações (`ux:bolso:interacao`) permitindo colar a lista completa de medicamentos de uso crônico da admissão hospitalar (conciliação medicamentosa) com matriz visual de alertas graduada em cores (Verde: Seguro, Amarelo: Monitorar, Vermelho: Contraindicação Absoluta).
- *Sugestão 75 (Ambulatório / CIAP-2 Multicêntrico)*: Adicionar mapeamento cruzado bidirecional entre CIAP-2 (Capítulo / Razão de Encontro) e CID-10 no seletor de diagnósticos da atenção básica (`ux:amb:cid`) com filtro por linha de cuidado (saúde da criança, da mulher, do adulto e do idoso).
- *Sugestão 76 (Ambulatório / Controle Especial e Notificação)*: Adicionar templates estruturados em 1 toque de Receituário de Controle Especial (Portaria SVS/MS nº 344/98 - Listas C1 e B1) e Notificação de Receita B (Psicotrópicos) com cálculo automático da quantidade necessária para 30 ou 60 dias de tratamento.
- *Sugestão 77 (Ambulatório / Validação de Atestado Digital com QR Code)*: Implementar hash de integridade e metadados criptográficos para validação de atestado médico pelo empregador ou serviço de perícia, minimizando adulterações em declarações emitidas pelo consultório digital.
- *Sugestão 78 (Calculadoras / Gasometria Arterial)*: Adicionar cálculo automático do Gradiente Alvéolo-Arterial de O₂ (P(A-a)O₂ = [FiO₂ × (Patm - PH₂O) - (PaCO₂ / R)] - PaO₂) com valor de referência ajustado por idade (Idade / 4 + 4) e alerta de shunt intrapulmonar ou alteração V/Q nas análises gasométricas arteriais (`ux:calc:gaso` e Cockpit PWA).
- *Sugestão 79 (Calculadoras / Parkland & Queimados)*: Adicionar temporizador regressivo e alerta horário no Cockpit PWA para término da 1ª etapa de ressuscitação volêmica (primeiras 8h a contar do horário exato do trauma), com campos de input para volume já administrado na ambulância (SAMU) e compensação automática no volume restante de Ringer Lactato.
- *Sugestão 80 (Calculadoras / Glasgow-P Pediátrico)*: Implementar toggle de adaptação pediátrica para a Escala de Coma de Glasgow em lactentes e crianças menores de 4 anos (balbucio/choro consolável em vez de orientação verbal e retração à dor em vez de localização), garantindo acurácia neurológica beira-leito em trauma pediátrico.

---