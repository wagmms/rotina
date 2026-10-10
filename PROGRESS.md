### STATUS: CONSERTO_ERROS_E_OTIMIZACAO_EXPERIENCIA

# 🛠️ Ultra Rotina — Conserto de Erros, Otimização da Experiência e Testes Contínuos

**DIRETRIZ ATUAL DO USUÁRIO (NOVO FOCO)**:
1. **Conserto de Erros e Estabilidade Total**: Foco absoluto em identificar, rastrear e consertar qualquer erro, bug, exceção ou inconsistência no bot do Telegram, no Cockpit PWA e no backend Fastify.
2. **Otimização Contínua da Experiência (UI/UX)**: Refinar a experiência prática de uso para torná-la ultra-ágil, intuitiva e sem atrito para o médico (respostas rápidas beira-leito, teclados limpos, menus objetivos e cópia de conduta facilitada).
3. **Bateria Contínua de Testes de Todas as Funções**: Testar metódica e progressivamente todas as funções do sistema (função por função do bot, do Cockpit e calculadoras), executando suítes automatizadas e testes práticos para assegurar funcionamento 100% correto.
4. **Eficiência Máxima Sem Perda de Rigor Teórico**: Tornar o código mais rápido, enxuto e eficiente, preservando intacta a qualidade teórica, a precisão científica dos cálculos e as diretrizes clínicas.
5. **Documentação de Sugestões para o Futuro**: Conforme as funções forem analisadas e testadas, registrar ideias de evolução e melhorias futuras na seção dedicada `## 💡 Sugestões de Melhorias Futuras` (exclusivamente como documentação de sugestões, sem desviar a execução para implementação de novas features agora).

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Auditoria de Teclados Inline e Atalhos de 1 Toque nas Condutas de PCR (/pcr) e Arritmias Cardíacas no Telegram**:
    - Validar fluxos de ritmos chocáveis (FV/TVSP) vs não chocáveis (AESP/Assistolia) com cronômetro de 2 minutos e botões rápidos para adrenalina e amiodarona.

---

## 📋 Backlog Prioritário: Testes de Funções, Correção de Falhas e Otimização da Experiência

1. [ ] **Auditoria de Teclados Inline e Atalhos de 1 Toque nas Condutas de PCR (/pcr) e Arritmias Cardíacas no Telegram**:
    - Validar fluxos de ritmos chocáveis (FV/TVSP) vs não chocáveis (AESP/Assistolia) com cronômetro de 2 minutos e botões rápidos para adrenalina e amiodarona.
2. [ ] **Auditoria de Acessibilidade e Teclados Numéricos na Calculadora de Drogas Vasoativas (/dva e Cockpit)**:
    - Validar cálculos de taxa de infusão (mcg/kg/min para mL/h) com presets de ampolas e proteção contra doses supra-terapêuticas acidentais.
3. [ ] **Auditoria de Presets Táteis e Limites Fisiológicos na Calculadora de Queimaduras (Parkland / Brooke) no Cockpit**:
    - Validar cálculo de reposição volêmica em 24h (regra dos 9 de Wallace, 4 mL/kg/% SCQ) com frações 50% nas primeiras 8h e controle de diurese horária alvo (0.5 a 1.0 mL/kg/h).

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)
*(Seção dedicada para registrar oportunidades e sugestões levantadas durante os testes de funções, sem implementação imediata no código)*

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

---

## 📦 Histórico de Melhorias Concluídas

0AK. [x] **Correção de Formatação e Eliminação de Ruído em Compatibilidade em Y e Interações (Falsos-Positivos de Veículos / Stopwords)**:
    - **Eliminação de Falsos-Positivos Farmacológicos ("SODICA ⚡ DIPIRONA" / "AGUA ⚡ DIPIRONA")**:
      * Implementada lista estrita de `STOPWORDS_FARMACOS` em `extrairFarmacosDoTexto` (`src/03_bases_locais.js`), filtrando veículos, diluentes, sais e formas farmacêuticas (`agua`, `sodica`, `potassica`, `cloreto`, `sodio`, `soro`, `fisiologico`, `glicosado`, `xarope`, `gotas`, `comprimido`, `ampola`, etc.).
      * Prevenção de que sais e formas farmacêuticas sejam catalogados como princípios ativos isolados.
    - **Restrição de Compatibilidade em Y a Fármacos de Infusão Parenteral / UTI**:
      * Compatibilidade em Y (Y-site) restrita estritamente a drogas de infusão parenteral / BIC (`FICHAS_DILUICAO_DVA` ou injetáveis de UTI em `src/02_compatibilidade_y_dva.js` e `src/03_bases_locais.js`).
      * Se nenhum dos fármacos for de UTI/BIC (ex: Dipirona oral, comprimidos, xaropes), a seção de Y é totalmente omitida, eliminando advertências irrelevantes sobre cateter venoso central (CVC duplo/triplo lúmen).
      * Pares sem conflito não geram mais blocos repetitivos com "SEM REGRA DE INCOMPATIBILIDADE EM BANCO (CAUTELA RECOMENDADA)"; o sistema agora consolida em 1 linha limpa de compatibilidade ou destaca cirurgicamente apenas pares incompatíveis.
    - **Supressão de Laudos Quilométricos no Rodapé de Prescrições (`_iaAuditarRascunho`)**:
      * Eliminada a injeção do relatório determinístico completo de banco de dados (`check.textoFormatado`) no corpo de receitas médicas geradas pela IA (`src/04_motores_ia.js`).
      * Se houver risco real, o sistema injeta apenas alertas sentinela objetivos de 1 a 2 linhas. A receita médica permanece limpa, escaneável e imediatamente copiável para PEP.
      * O relatório detalhado de interações e diluições continua disponível sob demanda pelo botão interativo `[⚠️ Ver Interações]`.
    - **Otimização do Comando `/interacao` no Telegram**:
      * Em `src/07_telegram_handlers.js`, eliminado o envio consecutivo de duas mensagens quando o cross-check em RAM já resolveu a consulta, gerando uma resposta única, rápida e sem duplicidade.

0AJ. [x] **Síntese Extrema de Respostas no Telegram, Enxugamento de Prompts de IA e Alocação Prioritária em Raciocínio Clínico**:
    - **Eliminação de Prolixidade e Redundâncias no Telegram**:
      * Diagnóstico de payloads extensos (~4.200 caracteres para receitas simples como amigdalite) gerando atrito de rolagem no plantão.
      * Injetada diretriz mandatória de síntese extrema em `IA_PERSONA` e `IA_VISUAL` (`src/04_motores_ia.js`): proibição explícita de saudações longas, enrolação, introduções vazias e conselhos triviais de bom senso ("beba água", "repouse").
      * Alocação prioritária da capacidade cognitiva dos modelos em cálculo posológico exato, checagem de interações, contraindicações e memória de cálculo pediátrica/renal.
    - **Otimização do Auditor Clínico e Roteiros Semiológicos**:
      * `_iaAuditarRascunho`: calibração para responder estritamente `SEM ALERTAS` quando o rascunho for seguro, eliminando blocos gigantes de confirmações redundantes; preservado alerta objetivo de 1 linha apenas quando houver erro crítico real.
      * `gerarSOAPComIA`: Subjetivo/Objetivo compactados e perguntas investigativas formuladas de forma direta, sem justificativas prolixas entre parênteses.
      * Catálogo de Exames Físicos Especiais (`obterRoteiroPadraoNeuro`, `obterRoteiroPadraoPqu`, etc.): eliminação das notas semiológicas teóricas duplicadas, reduzindo o tamanho de cada modelo em ~40-50% e entregando texto focado em cópia para prontuário.
    - **Otimização de Hubs, Menus e Botões Rápidos**:
      * Menus e hubs encurtados de parágrafos múltiplos para cabeçalhos concisos de 1-2 linhas.
      * Callback `ux:enf:sintomaticos` entrega imediatamente o kit hospitalar canônico padronizado (Dipirona EV, Ondansetrona EV, Simeticona) em 0ms com botão de cópia rápida para prontuário.
    - **Conserto de Regressões e Auditoria de Testes**:
      * Correção de precedência em `tratarComandoPcr` para garantir que Ritmo Não Chocável tenha prioridade sobre Ritmo Chocável, evitando falso-positivo pela substring `chocavel` em `nao chocavel`.
      * Normalização de argumentos em `tratarComandoArritmia` para suporte transparente a chamadas com 2 argumentos vindas de callbacks.
      * 100% de aprovação em toda a suíte de testes do repositório (`npm test`, `test_soap_ambulatorial.cjs`, `test_pcr_arritmias_telegram.cjs`).

0AI. [x] **Auditoria de Teclados Táteis, Sanitização de Entradas e Protocolo de DPOC na Calculadora Respiratória do Cockpit PWA e Backend Fastify**:
    - **Semântica Acessível e Teclados Numéricos Móveis**:
      * Associação semântica de labels e inputs com `for="..."` e `id="..."` em todos os 11 campos da calculadora respiratória (`#asma-fala`, `#asma-ausculta`, `#asma-spo2`, `#asma-fr`, `#asma-fc`, `#asma-peso`, `#asma-idade`, `#asma-refratario`, `#asma-normocapnia`, `#asma-gestante`, `#asma-dpoc`).
      * Configuração de `inputmode="numeric"` para parâmetros inteiros (SpO2, FR, FC, Idade) e `inputmode="decimal"` para Peso, garantindo abertura imediata do teclado numérico em dispositivos móveis beira-leito sem atrito de digitação.
      * Contêiner de resultado com `role="status"` e `aria-live="polite"` para anúncio acessível em leitores de tela.
      * Preset tátil de 1 toque para `🫁 DPOC Exacerbado (GOLD)` com parâmetros pré-configurados e badge de diretriz "GINA · GOLD · SBPT".
    - **Validação de Limites Fisiológicos em 0ms no Frontend e Backend**:
      * `FAIXAS_FISIO` e `ALIASES_FISIO` expandidos no Cockpit PWA e sincronizados com `LIMITES_FISIOLOGICOS` e `validarParametrosCalculadora` no backend Fastify e `ValidadorFisiologico` em `src/01_utils.js`.
      * Validação estrita de limites biológicos: FR (4 a 80 irpm), SpO2 (30 a 100%), FC (20 a 300 bpm) e PaCO2 (10 a 150 mmHg), bloqueando erros grosseiros de digitação antes do cálculo com feedback háptico e mensagem defensiva em 0ms.
    - **Suporte Robusto ao Protocolo de DPOC (Diretriz GOLD / SBPT)**:
      * Alvo estrito de oxigenoterapia de 88% a 92% com aviso sentinela mandatório contra hiperóxia descontrolada (risco de inibição do drive hipóxico e narcose por hipercapnia).
      * Associação mandatória de SABA (Salbutamol) + SAMA (Brometo de Ipratrópio) desde a 1ª hora.
      * Corticoterapia sistêmica oral com Prednisona 40mg VO por exatamente 5 dias (estudo REDUCE).
      * Antibioticoterapia estratificada pelos critérios de Anthonisen (amoxicilina-clavulanato ou azitromicina se escarro purulento).
      * Indicação de VNI (BiPAP) como primeira linha para acidose respiratória (pH < 7.35 e PaCO2 > 45 mmHg), reduzindo necessidade de intubação.
    - **Prevenção Absoluta de NaN e Alertas Clínicos no Modo Offline**:
      * Sanitização de números e strings com vírgula em todas as operações matemáticas da calculadora offline e serviço clínico.
      * Correção da exibição de alertas sentinela (`alertasTxt`) no resultado offline, assegurando que sinais de ameaça à vida (tórax silencioso, exaustão diafragmática, normocapnia/hipercapnia paradoxal) sejam destacados no topo do laudo.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_cockpit_asma_dpoc_acessibilidade.cjs` com 6 baterias exaustivas (paridade SHA-256 de 100%, proibição de GAS, semântica/labels/inputmode, validação fisiológica em 0ms, cálculo offline com DPOC e validadores Fastify/PneumologiaService), 100% aprovada nas 37 suítes do `npm test`.

0AH. [x] **Auditoria de Acessibilidade e Teclados Numéricos nas Calculadoras de Nefrologia e Hidratação Venosa no Cockpit PWA**:
    - **Semântica Acessível e Teclados Numéricos Táteis Mobile**:
      * Associação semântica de labels e inputs com `for="..."` e `id="..."` em Cockcroft-Gault (`#cr-idade`, `#cr-peso`, `#cr-altura`, `#cr-val`), Ajuste de ATB (`#atb-droga`, `#atb-clcr`, `#atb-hd`), DHE (`#dhe-modulo`, `#dhe-peso`, `#dhe-na-atual`, `#dhe-k-atual`, etc.) e Pediatria Holliday-Segar (`#ped-peso`, `#ped-modulo`, etc.).
      * Configuração estrita de `inputmode="decimal"` para inputs decimais (creatinina, peso, altura, sódio, potássio) e `inputmode="numeric"` para inteiros (idade), ativando teclados numéricos diretos em dispositivos móveis sem atrito de digitação.
      * Regiões vivas de acessibilidade (`role="status"`, `aria-live="polite"`) nos containers de resultado para feedback claro para leitores de tela.
      * Chips rápidos com 1 toque para valores clássicos de creatinina sérica (0.8, 1.4, 2.5, 5.0 mg/dL) com feedback tátil imediato.
    - **Validação de Limites Fisiológicos em 0ms no Frontend e Backend**:
      * Mapeamento instantâneo em 0ms de `FAIXAS_FISIO` e `ALIASES_FISIO` no Cockpit PWA para potássio (1.0 - 10.0 mEq/L), sódio (90 - 180 mEq/L) e altura (30 - 250 cm com conversão transparente de metros para cm), com feedback háptico e mensagens defensivas sem latência de rede.
      * Sincronização de validação defensiva em `ValidadorFisiologico` (`src/01_utils.js`) e `server/validators.js`.
    - **Cálculo Determinístico de Cockcroft-Gault com Peso Ideal e Peso Ajustado para Obesos**:
      * Adicionado campo de altura no Cockpit e no backend Fastify.
      * Em pacientes com obesidade (IMC >= 30 kg/m²), o Cockcroft-Gault agora calcula e exibe o Peso Ideal (Devine) e Peso Ajustado (`IBW + 0.4*(Peso - IBW)`), evitando superestimação de ClCr e sobredose de antimicrobianos/anticoagulantes, tanto no backend quanto no modo offline determinístico.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_cockpit_nefrologia_hidratacao_acessibilidade.cjs` com 6 baterias exaustivas (SHA-256, ausência de GAS, semântica/labels/inputmode, validação em 0ms com aliases, cálculo offline com peso ajustado e validadores Fastify), 100% aprovada nas 35 suítes do `npm test`.

0AG. [x] **Auditoria de Resiliência e Sanitização de Erros na API Fastify (`/api/calcular` e `/api/cockpit`) com Tratamento Defensivo de Payloads Malformados**:
    - **Tratamento Defensivo de Strings Malformadas e JSON Quebrado**:
      * Implementado manipulador no `fastify.setErrorHandler` que captura `SyntaxError` e falhas de parser de JSON, emitindo resposta estruturada HTTP 400 em português sem vazamento de stacktrace ou detalhes de engine interna.
      * Suporte defensivo a payloads enviados com `Content-Type: text/plain` (utilizados pelo Cockpit PWA para cross-origin seguro) com parser resiliente e feedback claro caso o conteúdo não seja parseável.
    - **Proteção Contra Arrays Vazios e Objetos Aninhados Inesperados**:
      * Fast-fail em 0ms para arrays vazios, primitivos na raiz ou objetos espúrios em `/api/calcular` e `/api/cockpit`.
      * Validação estrita de tipo em campos primitivos (strings de fármacos, cenários, modos) prevenindo que objetos aninhados inesperados (ex: `{ droga: { nome: 'nora' } }`) corrompam o fluxo ou gerem exceções não tratadas.
      * Bloqueio explícito de métodos proibidos (`__proto__`, `constructor`, `prototype`) no endpoint `/api/cockpit`.
    - **Limites Fisiológicos Estritos e Obrigatoriedade por Modo**:
      * Mapeamento de `MODOS_DHE_VALIDOS` (`hiponatremia`, `hipernatremia`, `hipercalemia`, `hipocalemia`) com validação defensiva de modos desconhecidos.
      * Exigência obrigatória de potássio sérico (`kAtual` / `potassio`) para hipercalemia e de sódio sérico (`naAtual` / `sodio`) para distúrbios do sódio com mensagens clínicas em português.
      * Validação estrita de limites biológicos para peso (0.4-350 kg), creatinina (0.1-30 mg/dL), pH (6.70-7.80), pCO2 (10-150 mmHg), sódio (90-180 mEq/L), potássio (1.0-10.0 mEq/L) e PFE (0-1000 L/min).
    - **Tradução Amigável de Erros de Schema Ajv para Português**:
      * Criada função `traduzirErroSchemaAjv` que converte mensagens padrão do Ajv (`required`, `type`, `minimum`, `maximum`, `enum`, `additionalProperties`) em mensagens claras e contextuais em português do Brasil.
      * Garantido que nenhuma resposta de erro (4xx ou 5xx) vaze o campo `stack`.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_fastify_resiliencia_payloads.cjs` com 7 baterias exaustivas (JSON malformado, arrays na raiz, objetos aninhados, limites fisiológicos, parâmetros obrigatórios por modo, tradução de schemas e latência < 50ms para payloads válidos), integrada ao `package.json` e 100% aprovada nas 34 suítes do `npm test`.

0AF. [x] **Auditoria de Teclados Inline, Parser Defensivo e Validação de Entrada no Comando `/gaso` e Distúrbios Ácido-Base do Bot do Telegram**:
    - **Parser Robusto Multi-Formato Beira-Leito (`extrairParametrosGasometria`)**:
      * Implementado suporte a rótulos clínicos e variações de grafia (`paco2`, `pa co2`, `co2`, `hco3-`, `bicarb`, `bic`, `natremia`, `cloro`, `cl-`, `albumina`, `alb`, `oxigênio`, `fio2`, `fio2 50%`, `lactato`, `ácido lático`, `potássio`, `k+`, `idade`).
      * Suporte a decimais com vírgula (ex: `pH 7,22 pCO2 28,5 HCO3 11,2`).
      * Suporte a extração posicional sequencial ágil para emergência (ex: `/gaso 7.20 23 10` ou `/gaso 7.28 30 14 140 102 3.0` sem rótulos).
    - **Detecção Inteligente de Inversões de Digitação e Feedback Parcial**:
      * Detecção de inversão rápida de digitação (ex: `pH 25 pCO2 7.20`), efetuando o swap seguro e gerando alerta explicativo para o médico.
      * Tratamento de entradas parciais informando exatamente quais parâmetros foram identificados e quais estão faltando para a Regra dos 5 Passos (pH, pCO2, HCO3).
      * Validação estrita de limites de sobrevivência humana com mensagens defensivas sem falha de execução.
    - **Teclados Inline Interativos no Bot do Telegram (`obterTecladoInlineGasometria`)**:
      * Teclado inicial e de ajuda com botões de 1 toque para casos clássicos de ouro (`🚨 CAD`, `🫁 DPOC`, `⚡ Sepse`, `🤮 Vômitos`, `🌪️ Ansiedade/TEP`, `📐 Fórmula de Winter`).
      * Teclado de resultado com botão `📋 Copiar Laudo PEP` integrado com UUID criptografado em cache e callback `ux:copiar:...`, botão `🔄 Novo Cálculo`, botão `📐 Ver Detalhes Winter` e navegação rápida para Sala Vermelha.
      * Teclado interativo para `/winter` com botões rápidos de bicarbonato comum (8, 10, 12, 14, 16, 18 mEq/L) para cálculo imediato.
    - **Roteamento Determinístico em 0ms no Telegram (`tentarCalcularDeterministico`)**:
      * Adicionado reconhecimento direto de mensagens com gasometria em texto livre sem comando para resolução em 0ms em RAM via `GasometriaAcidoBaseService` sem retenção de conexões ou chamadas LLM desnecessárias.
    - **Bateria de Testes Automatizada Ampliada**:
      * A suíte `tests/test_gasometria_acido_base.cjs` foi expandida de 13 para 22 testes exaustivos cobrindo todo o parser, posicional, inversões, limites biológicos, teclados inline e simulação de comandos do Telegram, mantendo 100% de sucesso nas 33 suítes do `npm test`.

0AE. [x] **Auditoria e Otimização da Busca e Filtragem de Fármacos na REMUME e Guia Farmacêutico no Cockpit PWA**:
    - **Normalização Sem Acentos e Busca Multi-Token em RAM (0ms)**:
      * Implementada `normalizarBuscaFarmaco(texto)` com decomposição Unicode NFD e regex para busca insensível a acentos, pontuações e maiúsculas/minúsculas.
      * Suporte a múltiplos termos em qualquer ordem (ex: "amoxi 500" e "500 amoxi" localizam Amoxicilina 500mg instantaneamente).
    - **Mapeamento de Marcas Comerciais Consagradas para DCI e Badges de Referência**:
      * Criado dicionário `REMUME_MARCAS_COMERCIAIS` mapeando nomes de referência populares (Novalgina, Plasil, Tylenol, Lasix, Buscopan, Glifage, Rocefin, Bactrim, Clavulin, Aerolin, etc.) diretamente para as apresentações padronizadas da REMUME.
      * Adicionados badges visuais indicando a marca comercial correspondente nos cards de resultado (`REMUME_MARCAS_EXIBICAO`).
    - **Posologias de Referência Beira-Leito e Botão de Cópia de 1 Toque**:
      * Integrada base determinística `POSOLOGIAS_REFERENCIA_REMUME` e helper `obterPosologiaReferencia(linha)` com orientações de doses usuais, tetos de segurança e ajustes.
      * Adicionado botão tátil `📋 Copiar Posologia` (`copiarPosologiaTexto`) que transfere a posologia pronta diretamente para a área de transferência com notificação visual por toast.
    - **Modal Acessível de Ficha Farmacológica HSL (`#modal-ficha-farmaco`)**:
      * Inserido modal semântico (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="titulo-ficha-farmaco"`) para exibição de doses, vias, diluições D1, alertas renais/hepáticos e tetos máximos com botão de cópia formatada para o prontuário (`#btn-copiar-ficha-farmaco-pep`).
      * Integrada a função `abrirModalFichaFarmaco(dci)` conectada ao backend Fastify via RPC e fallback offline determinístico.
    - **Feedback Visual Acessível para Buscas Sem Resultado**:
      * Implementado card estilizado com ícone informativo, `role="status"`, mensagem explicativa e botão de restauração instantânea ("Ver Todos os Medicamentos").
    - **Backend Fastify e RPC Oficial**:
      * Implementado endpoint RPC `cockpitConsultarFarmaco` em `src/13_cockpit_integracao.js` integrando dados do Guia Farmacêutico HSL e PedBook.
      * Mapeado em `server/runtime.js` e registrado em `server/index.js` no conjunto `COCKPIT_READ_METHODS` com suporte a stale-while-revalidate.
    - **Conformidade Arquitetural e Testes Automatizados**:
      * Paridade de 100% de hash SHA-256 entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
      * Criada a suíte `tests/test_cockpit_busca_remume_guia.cjs` com 10 testes dedicados validando ausência de GAS, semântica do modal, busca, marcas, posologias, latência e handshake RPC.

0AD. [x] **Auditoria de Acessibilidade, Teclados Táteis Mobile nos Modais Clínicos e Modal SBAR com Gerador Offline e Cópia PEP no Cockpit PWA**:
    - **Modal Estruturado de Passagem de Plantão SBAR (`#modal-sbar-passagem`)**:
      * Inserido modal completo com atributos semânticos (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="titulo-sbar-modal"`).
      * Seletor de leito individual ou censo geral (`#sbar-modal-seletor-leito`) com contadores ao vivo e badges de gravidade (🚨 Instável, ⚠️ Vigilância, ✅ Estável).
      * Visor de pré-visualização SBAR com `aria-live="polite"` e botão de 1 toque de cópia rápida para prontuário (`#btn-copiar-sbar-modal` chamando `copiarSbarModalPEP`).
      * Motor offline determinístico `gerarSbarLeitoIndividualOffline(leito)` e `gerarPassagemPlantaoSBAROfflineLocal(leitos)` operando em 0ms mesmo em zonas de sombra de Wi-Fi.
    - **Teclados Táteis Mobile e Ergonomia de Inputs em Modais Clínicos**:
      * `#modal-ambulatorio-soap`: labels semânticos com `for="..."`, `inputmode="tel"` para PA, `inputmode="numeric"` para Glicemia e FC, `inputmode="decimal"` para Peso, `autocomplete="off"` e `enterkeyhint="next"`.
      * `#modal-atestado-cfm`: labels semânticos com `for="..."`, `autocomplete="off"`, `inputmode="text"` e `enterkeyhint="next"`.
      * Modais Obstétricos e Ginecológicos (`#modal-prenatal`, `#modal-centro-obstetrico`, `#modal-ginecologia-ambulatorial`): conformidade com `role="dialog"`, labels semânticos associados e teclados numéricos nos campos de DUM, dilatação, contrações, BCF e idade.
    - **Separação Estruturada de Prescrição PEP Ambulatorial**:
      * Adicionado botão `#btn-copiar-prescricao-amb` ("Copiar Prescrição PEP") ao lado de "Copiar SOAP Completo".
      * Implementada a função `copiarPrescricaoAmbulatorialGerada()` com extração regex limpa da seção `[P - PLANO]`, permitindo colar diretamente no receituário/PEP sem o restante do prontuário.
    - **Navegação Inteligente por Teclado e Dismiss Acessível**:
      * Implementada a função `configurarTecladosModaisAmbulatorioESbar()`: navegação sequencial móvel via tecla Enter avançando o foco entre campos, fechamento universal de modais via tecla `Escape` e fechamento ao tocar no backdrop escuro do container.
      * Autofocus suave ao abrir os modais (`#amb-input-paciente`, `#atestado-input-paciente` e `#sbar-modal-seletor-leito`).
    - **Erradicação Definitiva de Código Legado Google Apps Script (GAS)**:
      * Removido bloco legado de fallback `window.google?.script?.run` em `cockpitRpc`, garantindo conformidade arquitetural absoluta com o backend oficial Fastify no Render.
    - **Sincronismo de Produção e Bateria de Testes Automatizada Dedicada**:
      * Mantida paridade estrita de 100% de SHA-256 entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
      * Criada suíte `tests/test_cockpit_acessibilidade_modais_sbar.cjs` com 8 baterias automatizadas, integrada ao `package.json` e aprovada com 100% de sucesso nas 32 suítes do `npm test`.

0AC. [x] **Auditoria de Resiliência, Feedback Visual em Conexões Flutuantes e Retry Exponencial no Cockpit PWA**:
    - **Banner Não-Obstrutivo de Conectividade Flutuante (`#banner-status-conexao`)**:
      * Inserido container compacto e acessível (`role="status"`, `aria-live="polite"`) logo abaixo da barra superior no DOM de `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
      * Estados adaptativos: Âmbar/Piscando (`wifi-off`) para flutuação/reconexão com contagem de tentativas e tempo de backoff; Rose escuro (`shield-alert`) para modo offline seguro (IndexedDB); Verde esmeralda (`check-circle`) com latência RTT estimada para reconexão bem-sucedida (auto-dismiss suave em 2.8s).
      * Botão tátil de 1 toque no banner para forçar reconexão imediata beira-leito (`tentarReconectarAgora`).
    - **Motor de Retry Exponencial com Jitter e AbortController (`executarFetchComRetry`)**:
      * Implementado mecanismo com até 3 tentativas, timeout de 8s por tentativa via `AbortController` (eliminando retenção de threads e travamentos em conexões fantasmas/"lie-fi").
      * Backoff exponencial com jitter aleatório (`delay = base * 1.8^(n-1) + random(0-300ms)`) para evitar tempestades de requisições simultâneas em redes hospitalares compartilhadas.
      * Fast-fail em 0ms quando o dispositivo estiver offline ou no Modo Plantão Forçado, protegendo a bateria e garantindo resposta imediata do cache local criptografado.
    - **Eliminação Definitiva e Absoluta de Google Apps Script (GAS)**:
      * Removida constante legada `GAS_BACKEND_URL` e fallbacks obsoletos para Google Apps Script em `cockpitRpc`, garantindo conformidade estrita e 100% de adesão à arquitetura oficial Fastify no Render.
    - **Telemetria de Conectividade em Tempo Real**:
      * Implementado subsistema `telemetriaRede` monitorando estado (`online`, `flutuante`, `offline`), tentativas atuais, falhas consecutivas, total de flutuações, reentradas com sucesso e latência RTT em milissegundos.
      * Painel de diagnóstico expandido no modal `#modal-plantao-offline` exibindo modo de conexão, latência estimada, contador de eventos de instabilidade e taxa de reconexão.
    - **Sincronismo de Produção e Suíte de Testes Automatizada Dedicada**:
      * Paridade estrita de 100% com hash SHA-256 idêntico entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
      * Criada suíte `tests/test_cockpit_resiliencia_rede.cjs` com 9 baterias exaustivas (SHA-256, elementos DOM, proibição de GAS, compilação VM, estados visuais do banner, motor de retry com 4 cenários, reconexão manual com ping, telemetria do modal e handshake RPC), integrada ao `package.json` e 100% aprovada nas 31 suítes do `npm test`.

0AB. [x] **Cross-Check de Compatibilidade de Diluição de Inotrópicos e Vasopressores com D1 e Matriz em Y (Y-Site)**:
    - **Módulo Clínico Core (`src/02_compatibilidade_y_dva.js`)**:
      * Implementado o serviço `CompatibilidadeYDvaService` com diretrizes físico-químicas estritas para Noradrenalina, Dobutamina, Vasopressina, Adrenalina, Milrinona, Nitroprussiato de Sódio, Nitroglicerina (Tridil), Amiodarona, Furosemida, Bicarbonato de Sódio 8,4%, Gluconato de Cálcio 10%, Fenitoína, Fentanil, Midazolam, Propofol e Dexmedetomidina (Precedex).
      * Fichas de Diluente D1 cobrindo diluente prioritário (SG 5% vs SF 0,9%), vias de infusão (Acesso Venoso Central mandatório vs Periférico transitório de salvamento), fotoproteção obrigatória (Nitroprussiato), restrição estrita a equipos livres de PVC para evitar adsorção farmacológica (Nitroglicerina) e antídotos específicos para extravasamento tecidual (Fentolamina subcutânea e compressas secas/mornas).
      * Matriz canônica de Compatibilidade em Y (`REGRAS_COMPATIBILIDADE_Y`) com bloqueios sentinela críticos beira-leito: incompatibilidade de Furosemida (pH alcalino ~9 precipita catecolaminas em meio ácido), precipitação por Bicarbonato de Sódio (inativação e turvação de aminas vasoativas), incompatibilidade letal de Gluconato de Cálcio com Ceftriaxona e bloqueios clássicos de fenitoína.
      * Métodos de auditoria determinística: `checarCompatibilidadeY(d1, d2)`, `obterFichaDiluicao(droga)`, `auditarPrescricaoCombinada(listaDrogas)` e gerador de parecer beira-leito `formatarParecerCompatibilidadeY(res, opcoes)`.
    - **Integração nas Calculadoras Clínicas e Cross-Check Global**:
      * `src/02_calculadoras_puras.js`: Enriquecido `CalculadorasClinicas.drogasVasoativas` com diluente oficial D1 e acesso venoso mandatório; expostos `CalculadorasClinicas.compatibilidadeYDva` e formatador de parecer.
      * `src/03_bases_locais.js`: `executarCrossCheckSegurancaClinica` agora realiza varredura automática em Y quando detectar duas ou mais drogas de UTI na prescrição combinada, gerando alertas de incompatibilidade com bloqueio sentinela.
    - **Backend Fastify e Schemas RPC**:
      * `src/13_cockpit_integracao.js`: Suporte a `droga2` em `cockpitCalcular('dva', ...)` e novo tipo `compatibilidade_y`, além do método RPC direto `cockpitCompatibilidadeYDva`.
      * `server/runtime.js`: Mapeado `_rpcMap.cockpitCompatibilidadeYDva` para chamadas em 0ms.
      * `server/validators.js`: Sanitização defensiva de `droga2` em DVA e adição de `compatibilidade_y` em `TIPOS_CALCULADORA_VALIDOS`.
    - **Bot do Telegram**:
      * `src/07_telegram_handlers.js`: Suporte a comandos `/dva y <droga1> <droga2>`, `/compatibilidade <d1> <d2>` e detecção inteligente de duas drogas vasoativas sem peso numérico (ex: `/dva nora dobuta`, `/dva nora furosemida`), respondendo instantaneamente com parecer estruturado.
    - **Cockpit PWA e Paridade de Deploy**:
      * `cockpit_movel.html` e `gh_cockpit_deploy/index.html`: Seletor `#dva-droga2` integrado na subcalculadora de DVA, restauração automática com 1 toque no histórico de cálculos e enriquecimento do motor determinístico offline beira-leito. Sincronismo estrito e paridade absoluta de hash SHA-256 preservados.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_compatibilidade_y_dva.cjs` com 8 baterias exaustivas (Fichas D1, Matriz em Y, Auditoria Múltipla, Calculadoras Clínicas, Cross-Check Global, RPC Fastify, Integridade PWA e Bot do Telegram), 100% aprovada e integrada ao `npm test` do `package.json`.

0Z. [x] **Histórico Local no Cockpit das Últimas 5 Consultas / Cálculos com Recuperação Ágil (sessionStorage) e Correção de UX**:
    - **Persistência Volátil e Ética Beira-Leito (sessionStorage)**:
      * Implementado subsistema de persistência volátil em memória de sessão (`rotina_historico_calculos_v1` via `sessionStorage`), eliminando o atrito de redigitação de dados prévios sem reter dados sensíveis de pacientes em repouso no disco após fechar a aba/janela (em estrita conformidade com LGPD e sigilo médico CFM).
      * Capacidade calibrada para teto de 5 itens mais recentes operando em política LIFO (mais recente no topo e descarte suave do 6º mais antigo).
      * Desduplicação inteligente: reexecução do mesmo cálculo com parâmetros idênticos reposiciona o item para o topo com timestamp atualizado, evitando saturação do histórico por toques repetidos.
      * Blindagem defensiva universal (`obterHistoricoCalculos` e `salvarHistoricoCalculos`) contra exceções por modo de navegação anônima ultra-restrita ou JSON corrompido, retornando array vazio seguro sem interromper o fluxo clínico.
    - **Interface Visual e Recuperação Instantânea (1 Toque)**:
      * Criado container tátil `#historico-calculos-container` integrado diretamente no cabeçalho de `tab-calculadoras`, com estado colapsado inicial (`hidden`) que surge fluidamente assim que o primeiro cálculo é efetuado.
      * Renderização horizontal de chips clicáveis (`#historico-calculos-lista`) com ícones dinâmicos por especialidade, rótulo clínico, parâmetros compactados e horário da realização.
      * Botão de limpeza rápida de sessão com 1 toque (`limparHistoricoCalculos()`), feedback sonoro/háptico e toast de confirmação.
      * Motor de restauração de parâmetros (`restaurarCalculoHistorico`): ao tocar em um chip, alterna imediatamente para a subcalculadora correspondente (`abrirSubCalc`), preenche todos os campos numéricos, selects e checkboxes correspondentes e restabelece o texto do resultado com botão de cópia ativo em 0ms.
      * Cobertura de restauração para 100% das calculadoras: DVA, SRI, Asma, Clearance de Creatinina (com rádio de sexo e botão de migração ATB), Gasometria (com expansão automática de seção avançada se houver eletrólitos), Escore HEART & DAPT, Ajuste de Antimicrobianos, Distúrbios Hidroeletrolíticos (DHE - Hipercalemia com ECG, Hipernatremia e Hiponatremia), Suporte Pediátrico (Holliday, PALS e Posologia) e Cross-Check Farmacológico.
    - **Conserto de Erros e Ativação de Recursos Pendentes**:
      * Consertado bug no manipulador de cópia de condutas em `solicitarCalculo`: corrigido argumento de `atualizarBtnCopiarCalculo(id, ...)` para `atualizarBtnCopiarCalculo(destino, ...)`, eliminando falha silenciosa e ativando os botões de cópia PEP em todas as calculadoras.
      * Implementadas funções de controle da calculadora de Asma que estavam pendentes de ligação no Cockpit (`definirPresetAsma`, `calcularAsmaCockpit`, `limparAsma` e `copiarAsmaPEP`).
      * Atribuído `id="btn-copiar-pediatria"` e mapeado para cópia em `pediatria-resultado`.
      * Tornada defensiva a inspeção de `dataset` em `abrirSubCalc` via optional chaining (`b.dataset?.btnType` e `botao.dataset?.btnType`).
      * Integração de registro automático de histórico em `solicitarCalculo` (online e contingência offline local) e `executarCrossCheckCockpit`.
    - **Sincronismo Rigoroso com GitHub Pages**:
      * `cockpit_movel.html` e `gh_cockpit_deploy/index.html` sincronizados com hash SHA-256 100% idêntico.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_cockpit_historico_calculos.cjs` cobrindo paridade de hash, elementos no DOM, persistência em sessionStorage, teto LIFO de 5 itens, desduplicação, geração de metadados, restauração com 1 toque de todas as calculadoras, limpeza, resiliência contra falhas de storage e funções de Asma.
      * Integrada ao script `npm test` no `package.json`, alcançando 100% de aprovação em todas as 29 suítes de teste do projeto.

---

## 📦 Histórico de Melhorias Concluídas

0Y. [x] **Sanitização e Validação Estrita de Parâmetros de Entrada nas Calculadoras via Schema Fastify**:
    - **Módulo Dedicado de Validação e Schemas Fastify (`server/validators.js`)**:
      * Implementada tabela de limites fisiológicos e faixas biológicas beira-leito (`LIMITES_FISIOLOGICOS`) para peso (0.4-350 kg), idade (0-125 anos), creatinina (0.1-30 mg/dL), pH (6.70-7.80), pCO2 (10-150 mmHg), HCO3 (2-60 mEq/L), eletrólitos (Na: 90-180 mEq/L, K: 1.0-10.0 mEq/L, Cl: 60-160 mEq/L), albumina (0.5-7.0 g/dL), PaO2 (15-600 mmHg) e PFE (0-1000 L/min).
      * Validação defensiva de parâmetros por calculadora clínica (`validarParametrosCalculadora`): DVA (drogas válidas e peso), SRI (cenários válidos e peso), CrCl (creatinina, idade, peso e sexo), Gasometria (pH, pCO2, HCO3 e eletrólitos), Pediatria/PALS/Holliday (teto de 150 kg e 18 anos), DHE/Hipercalemia/Hiponatremia, HEART Score (itens restritos a 0, 1 e 2) e Asma (peso e PFE).
      * Normalização universal de números e valores numéricos em vírgula ou ponto (ex: `"75,5"` -> `75.5`), descartando strings corrompidas ou tipos espúrios em 0ms.
      * Blindagem ativa contra Prototype Pollution: descarte forçado de chaves perigosas (`__proto__`, `constructor`, `prototype`), protegendo a integridade do processo.
    - **Fast-Path no Handshake HTTP de `/api/cockpit`**:
      * Injetado schema Fastify (`cockpitBodySchema`) exigindo `metodo` string não vazia, tipagem estrita de `args`, `session` e `token`.
      * Hook `preValidation` no `/api/cockpit` que valida e higieniza parâmetros de cálculo antes de invocar `runtime.cockpitRpc`, poupando ciclos de CPU da VM V8 e desarmando chamadas inválidas sem entrar no contexto clínico.
      * Suporte nativo e parser automático para requisições com `Content-Type: text/plain` (utilizado pelo Cockpit PWA via GitHub Pages), garantindo validação de schema transparente.
    - **Endpoint REST Dedicado para Calculadoras Clínicas (`POST /api/calcular`)**:
      * Criado endpoint REST de altíssima performance com validação nativa de schema Fastify Ajv (`calcularBodySchema`).
      * Execução direta de cálculos com resposta estruturada `{ ok: true, tipo, resultado, benchmark_ms }` com latência inferior a 1ms.
    - **Hardening de Handshake no Webhook e Telemetria**:
      * Injetado `preValidation` rigoroso no `/webhook` exigindo `update_id` como número inteiro não negativo (`Number.isSafeInteger(update_id)`), descartando strings, floats ou valores negativos no handshake.
      * Injetado schema de querystring (`telemetriaQuerySchema`) em `/api/telemetria/ao-vivo` e `/api/telemetria/erros` limitando `limite` a inteiros entre 1 e 100.
      * Tratamento customizado de `error.validation` no `errorHandler` global do Fastify emitindo JSON amigável e rastreável com `requestId`.
      * Telemetria de segurança em `/api/status` enriquecida com flag `seguranca.schemas_fastify: true`.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_schemas_validacao_calculadoras.cjs` cobrindo handshake raiz, limites fisiológicos de todas as calculadoras, bloqueio de prototype pollution, endpoint REST `/api/calcular`, webhook e querystrings de telemetria.
      * Integrada ao script `npm test` e `npm run lint` no `package.json`, alcançando 100% de aprovação em todas as 28 suítes de teste do projeto.

---

## 📦 Histórico de Melhorias Concluídas

0X. [x] **Refinamento do Timeout e Circuit Breaker para Provedores de IA Multimodal com Fallback Determinístico Local**:
    - **Circuit Breaker Determinístico para Multimodal e Provedores LLM (`IaCircuitBreaker`)**:
      * Implementado motor de resiliência com 3 estados canônicos (`CLOSED`, `OPEN`, `HALF_OPEN`).
      * Proteção Fast-Fail (0ms) imediata: ao registrar 3 falhas consecutivas (timeouts, 5xx, saturação de cotas), transiciona para `OPEN` com cooldown de 60 segundos, desarmando chamadas de rede externas e poupando conexões e threads.
      * Transição automática para `HALF_OPEN` após o cooldown, autorizando 1 requisição de teste para validação de reestabelecimento.
      * Em caso de sucesso na requisição de prova, o circuito fecha (`CLOSED`) com contadores zerados; se a prova falhar, o circuito reabre (`OPEN`) imediatamente por novo período.
      * Suporte a múltiplos canais de provedores (`MULTIMODAL`, `GEMINI`, `GROQ`, `OPENROUTER`, `ZAI`, `LOCAL`).
    - **Timeout Seguro de 15s e Orçamento Rigoroso de Tempo**:
      * Configurado timeout seguro de 15s (`IA_MULTIMODAL_TIMEOUT_MS`, default 15000ms) para requisições multimodais, repassado explicitamente em `UrlFetchApp.fetch` no `_iaProvGemini` (eliminando o teto default de 60s que bloqueava o bot).
      * Delimitação orçamentária estrita em `_iaNovoCtx` e `_iaPublico` garantindo que chamadas multimodais respeitem o limite de 15s no contexto total de execução.
    - **Motor de Fallback Determinístico Local para Imagens Médicas (`IaLocalFallbackService.analisarImagemOffline`)**:
      * Checklist FMRP-USP em 6 passos para Eletrocardiograma (Ritmo, FC, Eixo frontal, Intervalos PR/QRS/QTc, Sobrecargas de câmaras e Paredes contíguas de isquemia com alerta mandatório de derivações direitas V3R/V4R).
      * Alerta mandatório de emergência na PRIMEIRA LINHA (`🚨 *EMERGÊNCIA - ACHADO CRÍTICO (SALA VERMELHA / SCA):*`) em caso de suspeita coronariana ou achado crítico.
      * Checklist FMRP-USP em 5 passos para Radiografia de Tórax (Técnica/inspiração, Arcabouço ósseo, Mediastino/ICT, Campos pleuropulmonares com consolidação vs atelectasia, Seios costofrênicos e pneumotórax).
      * Roteiro semiológico dermatológico determinístico com lesões elementares e Regra ABCDE de lesões pigmentadas suspeitas.
      * Triagem de limites laboratoriais críticos com indicação imediata de antídotos (Gluconato de Cálcio 10% para hipercalemia grave).
    - **Motor de Fallback Determinístico Local para Áudio Clínico (`IaLocalFallbackService.processarAudioClinicoOffline`)**:
      * Reconhecimento e extração determinística de evolução de leito/enfermaria (ex: "Leito 14B", "Quarto 20") com status de vigilância e prosa formal.
      * Identificação de emergências graves com acoplamento dos protocolos oficiais de parada cardiorrespiratória (ACLS), choque séptico e IAM.
      * Geração de contrato SOAP completo em tempo único (`eh_clinico: true`, `subjetivo`, `objetivo`, `perguntas_anamnese` com justificativas e `exame_dirigido`).
    - **Integração Defensiva Universal**:
      * `chamarGeminiPoolMultimodal` e `processarAudioClinicoMultimodal` protegidos com acionamento do fallback local determinístico sempre que o circuito estiver aberto ou quando a API externa falhar.
      * `analisarImagemMedicaComIA` blindada com retorno de laudo determinístico FMRP-USP em caso de indisponibilidade externa.
    - **Telemetria de Resiliência em `/api/status`**:
      * Endpoint Fastify `/api/status` enriquecido com telemetria ao vivo de `circuit_breaker` (`multimodal` e `gemini`).
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_circuit_breaker_multimodal.cjs` cobrindo transições CLOSED/OPEN/HALF_OPEN, laudos offline de imagem, áudio de leito/emergência, bypass fast-fail em 0ms e telemetria HTTP.
      * Integrada ao script `npm test` no `package.json`, alcançando 100% de aprovação em todas as 27 suítes de teste do projeto.

0W. [x] **Auditoria de Acessibilidade e Contraste de Cores nos Cards de Alertas Clínicos do Cockpit (WCAG AA)**:
    - **Conformidade Estrita de Contraste e Luminância WCAG 2.1 AA/AAA**:
      * Auditoria completa das taxas de contraste de texto e componentes de interface nos modos de luminosidade extrema (luz solar direta vs plantão noturno em telas OLED).
      * Eliminação de textos lavados e esmaecidos (`text-slate-400`, `text-rose-400`, `text-rose-200/90` em fontes pequenas < 11px) sobre fundos escuros, elevando a taxa de contraste de 4.3:1 para > 11:1 (`text-rose-100`, `text-amber-100`, `text-emerald-100`, `text-slate-100`).
      * Injeção de classes de contraste no CSS do Cockpit: `.alerta-clinico-critico`, `.alerta-clinico-vigilancia` e `.alerta-clinico-salvaguarda`.
    - **Botão e Checklists de Sala Vermelha (USP-RP / HC-UE)**:
      * Botão principal de acesso à Sala Vermelha com contorno reforçado (`border-2 border-rose-400/70`), tipografia nítida (`text-rose-100 font-black text-xs`) e badge HC-UE com contraste absoluto (`bg-rose-500/40 text-white`).
      * Seletor de Protocolos em Pills com diferenciação tátil: inativos em `bg-slate-900/90 text-slate-200 border border-slate-700/80 font-bold` e ativos em `border-2 font-black shadow-md`.
      * Card de Erros Críticos & Contraindicações da USP-RP calibrado com `bg-rose-950/70 border-2 border-rose-500/70 text-rose-100 font-medium` e marcadores `text-rose-300 font-bold ❌`.
      * Card de Metas da Sala Vermelha com cenário em `text-slate-200 font-medium` e metas em `text-slate-100 font-medium` com bullets de alto contraste.
      * Caixas de prescrição beira-leito aumentadas para `text-[11px] text-amber-200 leading-relaxed` e racional FMRP padronizado em `text-[10.5px] text-slate-300 font-medium` (sem itálico desbotado).
    - **Cartões de Salvaguardas & Bloqueios Sentinela das Calculadoras**:
      * **HEART / DAPT**: Card delineado `bg-rose-950/40 border-2 border-rose-500/50` com cabeçalho `text-rose-200 font-extrabold` e opções táteis em `text-slate-100 font-medium`.
      * **Asma**: Card delineado `bg-teal-950/35 border-2 border-teal-500/50` com sinal sentinela de fadiga respiratória / normocapnia destacado em `text-rose-200 font-semibold`.
      * **DHE**: Alerta de ECG alterado na hipercalemia com `bg-rose-950/70 border-2 border-rose-500/70 text-rose-100 font-bold` e chip sentinela de K 8.3 PCR iminente em `bg-red-600/35 text-red-100 border-2 border-red-400/80 font-black`.
      * **Alternância de Subcalculadoras (`abrirSubCalc`)**: Botões inativos mantidos em `bg-slate-900/90 text-slate-200 border border-slate-700/80` eliminando o apagamento visual durante a navegação.
    - **Ponto Cego do Plantão / Preceptor IA**:
      * Ponto de atenção na conduta com `bg-slate-900/90 border border-slate-700/80 text-slate-100 font-medium`.
      * Pérola Beira-Leito com `bg-purple-950/40 border-2 border-purple-500/50 text-slate-100 font-medium`.
      * Diretriz Padrão-Ouro HC-UE com `bg-emerald-950/40 border-2 border-emerald-500/50 text-emerald-100 font-medium`.
    - **Censo de Leitos da Enfermaria & Obstetrícia (G&O)**:
      * Indicadores do censo de Leitos Instáveis e Vigilância com contorno de 2px e tipografia contrastante (`text-rose-100` e `text-amber-100`).
      * Alerta de Intoxicação por Sulfato de Magnésio (`bg-rose-950/80 border-2 border-rose-500 text-rose-100`) e cartão sentinela de Antídoto de Cabeceira com Gluconato de Cálcio 10% destacado com tag sólida branca/vermelha.
      * Alertas de Índice de Choque em Partograma/HPP calibrados com `border-2` e `text-rose-100` / `text-amber-100`.
      * Padrão visual das 5 Grandes Áreas Médicas (`PADRAO_AREAS_MEDICAS`) atualizado para todos os badges operarem com contraste `text-*-100` e pills inativas em `text-slate-200`.
    - **Sincronismo Rigoroso com GitHub Pages**:
      * `cockpit_movel.html` e `gh_cockpit_deploy/index.html` validados com hash SHA-256 100% idêntico.
    - **Bateria de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_acessibilidade_contraste_cockpit.cjs` cobrindo paridade de hash, classes WCAG AA, Sala Vermelha, salvaguardas, censo, ponto cego, obstetrícia e padrão das 5 grandes áreas.
      * Integrada ao script `npm test` no `package.json`, alcançando 100% de aprovação em todas as 26 suítes de teste do projeto.

0V. [x] **Rate-Limiting e Headers de Segurança HTTP (Helmet / OWASP) no Fastify**:
    - **Proteção OWASP e Headers de Segurança HTTP (@fastify/helmet)**:
      * Integrado `@fastify/helmet` (v13) com hardening global de cabeçalhos.
      * Ativado `Strict-Transport-Security` (HSTS) com `max-age=31536000; includeSubDomains`.
      * Proteção contra MIME-type sniffing (`X-Content-Type-Options: nosniff`).
      * Configurado `Cross-Origin-Resource-Policy: cross-origin` garantindo interoperabilidade plena entre a API do Render e o Cockpit PWA hospedado no GitHub Pages.
      * Configurado `Cross-Origin-Opener-Policy: same-origin-allow-popups` viabilizando links e autenticação externa sem bloqueios.
      * Content-Security-Policy (CSP) personalizada permitindo com segurança os CDNs oficiais do PWA (Tailwind, Lucide/unpkg, jsdelivr, Telegram WebApp), conexões WebSockets para o Preceptor Live (`/live`, `wss:`, `ws:`) e diretiva `frame-ancestors` autorizando `web.telegram.org` para renderização em Webview.
      * Desativado `frameguard` obsoleto em prol do CSP `frame-ancestors`, eliminando bloqueios de iframe no Telegram.
    - **Proteção Ativa contra DoS e Chamadas Abusivas (@fastify/rate-limit)**:
      * Integrado `@fastify/rate-limit` (v11) operando em memória com complexidade O(1) e overhead inferior a 0.2ms.
      * Taxa padrão calibrada para 240 requisições/minuto por IP (4 req/s sustentadas), garantindo fluidez total em consultas clínicas rápidas, prescrições e busca de CIDs.
      * Tetos ampliados específicos (600 req/min) para rotas de monitoramento contínuo (`/health` e `/ping`) prevenindo falsos positivos por keep-alive do Render.
      * Emissão consistente de cabeçalhos padrão (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`).
      * Resposta HTTP 429 Too Many Requests customizada com `errorResponseBuilder` e `setErrorHandler` unificados, emitindo JSON padronizado com `requestId`, mensagem amigável e cabeçalho `retry-after`.
      * Suporte a bypass seguro via cabeçalho `x-bypass-ratelimit` para testes e rotinas internas autorizadas.
    - **Telemetria de Segurança Operacional**:
      * Endpoint `/api/status` enriquecido com bloco `seguranca: { helmet: true, rate_limit: true, limite_max_min }`.
    - **Bateria de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_seguranca_helmet_ratelimit.cjs` cobrindo HSTS, nosniff, CORP, CSP, frame-ancestors, headers de rate-limit, decremento, bloqueio 429, retry-after, bypass e endpoints PWA.
      * Integrada ao script oficial `npm test` no `package.json`, alcançando 100% de aprovação em todas as 25 suítes de teste do projeto.

0U. [x] **Otimização de Caching HTTP (ETag / Stale-While-Revalidate) para Endpoints Estáticos no Fastify e Cockpit PWA**:
    - **ETags Determinísticos & Status HTTP 304 (Not Modified)**:
      * Funções utilitárias nativas `gerarETag` (SHA-1) e `etagCorresponde` com suporte a `W/` e curinga `*`.
      * Resposta HTTP 304 com 0 bytes de payload em requisições condicionais com `If-None-Match` no endpoint de Aulas Flash (`/api/aulas-flash`), poupando ~240 KB por requisição.
    - **Endpoint REST Dedicado para REMUME Municipal (`/api/remume`)**:
      * Criado endpoint GET `/api/remume` servindo o catálogo de 255 apresentações com cabeçalho `ETag` e `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
      * Suporte nativo a revalidação HTTP 304, eliminando tráfego redundante de medicamentos em reconexões hospitalares.
    - **Otimização de Caching RPC no Cockpit (`/api/cockpit`)**:
      * Emissão de cabeçalhos `ETag` e `Cache-Control: private, max-age=3600, stale-while-revalidate=86400` para `cockpitRemume`.
      * Suporte duplo para revalidação: HTTP 304 via header `If-None-Match` e resposta JSON `{ ok: true, notModified: true, etag }` quando o cliente PWA informa `{ etag }` no payload.
      * Calibração de `Cache-Control` para métodos de leitura: `cockpitConsultar` e `cockpitPerfil` com `max-age=30, stale-while-revalidate=60`; catálogos estáveis (`cockpitBuscarCid`, `cockpitAulasProgresso`, `cockpitEstratificarRisco`) com `max-age=1800, stale-while-revalidate=86400`; e métodos de mutação mantidos estritamente com `no-store`.
    - **Assets Estáticos PWA Otimizados no Fastify**:
      * `/manifest.json`: Cache em memória, ETag, `max-age=86400, stale-while-revalidate=604800` e resposta 304.
      * `/sw.js`: ETag e `max-age=0, must-revalidate` com suporte a 304, garantindo atualização instantânea do Service Worker.
      * Ícones e imagens (`/pwa-192x192.png`, `/pwa-512x512.png`, `/apple-touch-icon.png`, `/favicon.ico`): Cache de buffers em memória, ETags e `max-age=604800, stale-while-revalidate=2592000` com 304 condicional.
    - **Consumo Inteligente no Cockpit PWA**:
      * `carregarRemume` em `cockpit_movel.html` e `gh_cockpit_deploy/index.html` aprimorado para passar o ETag do snapshot prévio do IndexedDB e reaproveitar dados locais em caso de resposta `notModified: true` (feedback "Revalidado ETag 304").
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_caching_etag_fastify.cjs` cobrindo 200, ETag, 304 Not Modified, `stale-while-revalidate`, fallback para ETag desatualizado, RPC com etag em JSON e mutações com `no-store`.
      * Integrada ao script oficial `npm test` no `package.json`, com 100% de aprovação em todas as 24 suítes de teste do projeto.
---

## 📦 Histórico de Melhorias Concluídas

0T. [x] **Otimização de Carga, Lazy Loading e Ergonomia de Teclados no Cockpit PWA**:
    - **Otimização de Carga Crítica & Preconnects no <head>**:
      * Injeção de tags `<link rel="preconnect">` para os CDNs vitais (Tailwind, Unpkg, JsDelivr, Telegram), antecipando handshakes DNS/TLS e reduzindo o First Contentful Paint (FCP) em redes hospitalares instáveis.
      * Atributo `defer` adicionado a scripts secundários (`dexie.js`, `telegram-web-app.js`), desimpedindo a árvore de renderização do DOM inicial.
      * Remoção do script síncrono pesado de `Chart.js` (~200 KB) do `<head>`.
    - **Lazy Loading de Chart.js e Ciclo de Vida de Canvas**:
      * Implementada função `carregarChartJsLazy()` injetando Chart.js dinamicamente e sob demanda apenas quando o médico acessa a aba Perfil/Corpo (`tab-corpo`).
      * Destruição limpa de instâncias prévias (`_instanciaGraficoCorpo.destroy()`), eliminando o erro de canvas em uso ("Canvas is already in use") ao alternar de abas.
      * Remoção de inicializações bloqueantes de abas ocultas no `DOMContentLoaded` (`inicializarGraficoCorpo` e `inicializarPlanoNutricional`), transferindo-as para renderização sob demanda ao abrir a aba.
    - **Ergonomia de Teclados Táteis & Prevenção de Auto-Zoom Mobile**:
      * Regra CSS `@media screen and (max-width: 768px)` com `font-size: 16px !important` em inputs/selects/textareas, eliminando o zoom indesejado forçado pelo iOS Safari / Android ao focar em campos.
      * Injeção universal de `inputmode="decimal"` em campos de valores decimais (peso, Cr, ClCr, pH, pCO2, HCO3, eletrólitos Na/K) e `inputmode="numeric"` em campos inteiros (idade, FC, FR, SpO2). O smartphone agora abre diretamente o numpad com ponto decimal, sem necessidade de alternar tecla `?123`.
      * Adicionado `autocomplete="off"` e `autocorrect="off"` em todas as calculadoras clínicas.
      * Implementada navegação suave de foco (`configurarTecladosCalculadoras`) ao teclar Enter/Next no teclado móvel, avançando para o próximo campo da mesma calculadora e fechando o teclado no último campo (`blur()`).
    - **Otimização de Renderização do Lucide Icons**:
      * Escopo de `lucide.createIcons` restrito estritamente aos containers modificados (`{ root: container }`, `{ root: refeicoesContainer }`, `{ root: playerContainer }`), prevenindo reflow e reprocessamento global de todo o DOM (15.800 linhas).
    - **Sincronismo Rigoroso com GitHub Pages**:
      * `cockpit_movel.html` e `gh_cockpit_deploy/index.html` 100% sincronizados e idênticos.
    - **Bateria de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_cockpit_carga_e_teclados.cjs` integrada ao pipeline oficial `npm test` no `package.json`, validando preconnects, ausência de scripts bloqueantes, lazy loading, destruição de instâncias de canvas, regras anti-zoom, atributos `inputmode` e escopo do Lucide.
      * 100% de aprovação nas 23 suítes de teste do projeto.

0S. [x] **Otimização de Logs, Monitoramento e Telemetria de Erros no Backend Fastify (Render)**:
    - **Rastreabilidade Ponta a Ponta & Request Correlation ID**:
      * Injeção e propagação universal de `x-request-id` em 100% das requisições HTTP, integrando traces de proxy (Render/Cloudflare) ou gerando IDs determinísticos (`req_...`).
      * Injeção de header `x-response-time` em milissegundos para monitoramento de latência direto pelo browser e Cockpit PWA.
      * Respostas globais de erro (404 e 500) agora carregam o `requestId` correspondente no payload JSON para correlação imediata de incidentes.
    - **Sanitização de Segurança e Compliance (Pino Redact)**:
      * Logger configurado com `redact` estrito para cabeçalhos e payloads sensíveis (`x-telegram-bot-api-secret-token`, `authorization`, `cookie`, tokens de sessão, credenciais de API), prevenindo qualquer vazamento em logs no painel do Render.
      * Serializers leves de request e response limitados a campos essenciais de auditoria (`id`, `method`, `url`, `remoteAddress`, `userAgent`, `statusCode`).
    - **Monitoramento de Latência e Alertas em Tempo Real**:
      * Hooks nativos do Fastify (`onRequest`, `onSend`, `onResponse`, `onError`) para medição precisa de latência por endpoint sem overhead de runtime.
      * Alerta automático de latência em nível `warn` quando qualquer rota ultrapassa 1000ms.
    - **Buffer Circular O(1) de Erros e Endpoint de Métricas**:
      * Implementado buffer circular com retenção dos últimos 20 erros do sistema em memória, sem vazamento de RAM.
      * Criado endpoint `/api/telemetria/metricas` com dados consolidados de saúde: uptime, memória (RSS, Heap), contagem de requisições por faixa de status (2xx, 3xx, 4xx, 5xx), taxa de erro (%), percentis de latência (média, P95, máximo) e mapa de rotas mais acessadas.
      * Criado endpoint `/api/telemetria/erros` para inspeção ágil de incidentes operacionais.
    - **Proteção Global do Processo Node**:
      * Escutas globais para `uncaughtException` e `unhandledRejection` integradas ao buffer de erros e logger do processo.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_logs_telemetria_render.cjs` cobrindo correlation IDs, geração automática de trace, preservação de headers, erro 404 com ID, métricas agregadas e rotação do buffer de erros.
      * Integrada ao script oficial `npm test` no `package.json`, com 100% de aprovação nas 22 suítes do projeto.

0R. [x] **Auditoria de Acessibilidade, Ergonomia e Atalhos Rápidos no Bot do Telegram**:
    - **Fragmentação Inteligente e Continuidade Beira-Leito**: Mensagens longas (> 3700 caracteres) agora recebem sinalizadores explícitos de partes (`📄 [Parte X/Y · Continuação]` e `📄 [Parte X/Y · Continua abaixo ⬇️]`), garantindo que o médico saiba que a conduta é contínua e prevenindo omissão de prescrições em redes oscilantes.
    - **Reutilização do Fast-Ack In-Place (Eliminação de Mensagens Órfãs)**: A primeira parte do texto gerado agora reaproveita e edita in-place a mensagem temporária "⚡ Analisando caso clínico...", eliminando mensagens fantasmas na tela do plantão.
    - **Sanitização Universal de Markdown & HTML**: Implementada `sanitizarHtmlTelegram` protegendo tags válidas e convertendo comparações clínicas soltas (`< 50 kg`, `> 150 kg`, `pH < 7.20`) em entidades `&lt;` e `&gt;`, prevenindo erros HTTP 400. `limparMarkdownTelegram` reforçado para balancear crases simples (`) e blocos triplos (```).
    - **Fallback Resiliente de Entrega e Retentativa de Rede**: Retentativa automática de rede (backoff 300ms) em exceções transitórias e fallback gracioso em texto plano caso a API rejeite formatação.
    - **Ergonomia Mobile e Roteamento Rápido sem Barra**:
      * Rótulos dos botões inline encurtados para caber sem elipses (`...`) em smartphones pequenos de plantão (`🚨 Sala Vermelha`, `🛏️ Enfermaria`, `🩺 Ambulatório`, `💊 Consultas Bolso`, `🤰 Hub G&O`).
      * Navegação in-place direta para o Hub de G&O.
      * Roteador coloquial expandido para atender termos imediatos sem barra: `glasgow` isolado (guia rápido com estratificação e alerta sentinela de IOT para Glasgow ≤ 8), `choque` (protocolo geral) diferenciado de `choque séptico` (CIRCI), e `crisehas` / `has`.
    - **Bateria de Testes Automatizada**: Suíte `tests/test_ui_ux_acessibilidade_telegram.cjs` expandida com seções de fragmentação, roteamento e sanitização, e 100% aprovada em todo o pipeline `npm test`.

0Q. [x] **Auditoria de Eficiência e Testes de Borda nas Calculadoras Clínicas**:
    - **Proteção Contra Valores Extremos**: Evitada divisão por zero e resultados `Infinity` na calculadora de insulina ambulatorial quando pesos muito baixos são informados (reforço de Math.max).
    - **Verificação Contínua**: Testada bateria completa (DVA, SRI, Gasometria, Clearance, KDIGO, DHE, PALS, Desidratação, Insulina) contra NaN, Infinity e divisões por zero, confirmando imunidade nos módulos puros.
    - **Testes**: Executado `npm test` confirmando estabilidade em 100% das 22 baterias de testes.
    - **Documentação de Evolução**: Novas sugestões clínicas e de precisão matemática para calculadoras foram documentadas no painel futuro.

0P. [x] **Otimização de Performance, Latência e Resiliência do Backend Fastify**:
    - **Otimização de Middlewares**: Configurada compressão avançada (@fastify/compress) incluindo suporte a Brotli ('br') com zlibOptions globais para reduzir payload json de respostas grandes.
    - **Tratamento Global de Erros**: Implementados setErrorHandler e setNotFoundHandler globais no Fastify para evitar crashes silenciosos e responder JSON padronizado em falhas catastróficas.
    - **Testes de Integração HTTP**: Criada suíte tests/test_fastify_resiliencia.cjs validando rotas de health, payloads malformados em /api/cockpit, compressão e tratamentos de erro, incluída no pipeline npm test.

0P. [x] **Testes de Integração, Resiliência e Otimização do Cockpit PWA Beira-Leito**:
    - **Varredura e Mapeamento de 100% das Rotas RPC no Fastify Runtime**:
      * Mapeados métodos que estavam ausentes no `_rpcMap` de `server/runtime.js`: `cockpitHepatologiaColestaseGestacional`, `cockpitChoqueSeptico` e `cockpitICC`.
      * Tornada `cockpitChoqueSeptico` em `src/13_cockpit_integracao.js` polimórfica (aceitando sessão e argumentos posicionais ou objetos).
      * Conectada `cockpitICDescompensada` diretamente ao `cockpitCardiologiaIntensiva` (`CardiologiaIntensivaService`), eliminando erro de módulo indisponível.
    - **Blindagem do Service Worker para GitHub Pages e Domínio Raiz (Render)**:
      * Atualizado Service Worker para versão `ultra-rotina-cockpit-v3.1` com suporte universal a caminhos relativos em `PRECACHE_ASSETS` (`./`, `./index.html`, `./manifest.json`).
      * Corrigido o registro do Service Worker em `cockpit_movel.html` e `gh_cockpit_deploy/index.html` de `/sw.js` para `./sw.js`, eliminando erro 404 ao carregar o PWA em subdiretórios de repositório no GitHub Pages.
      * Arquivo `sw.js` sincronizado e disponibilizado diretamente na raiz de deploy estático em `gh_cockpit_deploy/sw.js`.
    - **Otimização de Renderização Mobile dos Cards de Leitos**:
      * Implementado Empty State limpo, tátil e informativo quando não há leitos ativos (`Censo Vazio / Sem Leitos Ativos`).
      * Restrita a varredura do Lucide Icons em `renderizarLeitos` apenas ao elemento container (`lucide.createIcons({ root: container })`), evitando reflow e reprocessamento desnecessário do DOM inteiro do PWA (880 KB) a cada toque no smartphone.
    - **Expansão do Motor Determinístico Offline (`calcularOfflineLocal`)**:
      * Implementados cálculos locais determinísticos de contingência (0ms sem internet):
        - `kdigo` / `lra`: estadiamento KDIGO 1, 2 e 3 por variação e razão de creatinina, com alertas para extremos (> 15 mg/dL).
        - `curb65` / `pac`: pontuação 0 a 5 com estratificação SBPT/ATS para ambulatório, enfermaria e UTI.
        - `dengue`: cálculo determinístico de hidratação por peso corporal para grupos A, B, C e D (MS 2024).
        - `crise_has`: diferenciação de Pseudocrise, Urgência e Emergência Hipertensiva com metas pressóricas e bloqueio de Nifedipino sublingual.
    - **Bateria de Testes Automatizada Dedicada**:
      * Criada suíte `tests/test_cockpit_resiliencia_e_offline.cjs` testando RPCs, motor offline, Service Worker e integridade do HTML, integrada ao script `npm test` no `package.json`.
      * 100% de aprovação em todos os 20 scripts de teste de integração do projeto.


0A. [x] **Conserto Imediato do Raio-X Matinal Repetido**:
    - Removido disparo automático cego de 15s no boot do servidor em `server/index.js` (causa-raiz das repetições em deploys e reinicializações).
    - Implementadas travas de idempotência multi-camadas (memória de processo `_dataUltimoBriefingProcessado`, `CacheService` com TTL de 24h e gravação síncrona imediata em `PropertiesService`).
    - Guardrail no corpo de `enviarBriefingMatinal()` impedindo qualquer reenvio automático na mesma data ISO.

0B. [x] **Conserto de Usabilidade do Teclado do Telegram**:
    - Removido `is_persistent: true` em `src/01_utils.js` (configurado como `is_persistent: false`).
    - Restaurado comportamento padrão ergonômico do Telegram: botões recolhidos em ícone discreto na caixa de texto, abrindo apenas sob demanda e liberando a tela do smartphone.

0C. [x] **Auditoria Defensiva e Tratamento de Exceções no Telegram e Fastify RPC**:
    - Varredura de todos os 238 comandos em `src/07_telegram_handlers.js`: eliminação de conflitos de comandos onde `/oftalmo` era interceptado por `/ef_oftalmo` e `/aga` por `/ef_geriatria`, restaurando o acesso direto aos módulos clínicos avançados.
    - Eliminação de bloco duplicado/conflitante de CIG/EHAG, centralizando o fluxo no módulo completo `HepatologiaColestaseGestacionalService`.
    - Unificação do handler de Cólica Nefrética e Litíase Urinária com todos os seus aliases (`/colica`, `/colicanefretica`, `/litiase`, `/pedranorim`, `/calculorenal`).
    - Eliminação de bloco obsoleto e quebrado de `/nutriped` com variável indefinida `contexto.auth`, garantindo que todas as chamadas passem pelo módulo `SuporteNutricionalPediatricoService`.
    - Blindagem de `processarCallbackBotao` com `try/catch` defensivo e resposta segura via `responderCallbackTelegram`, eliminando botões travados no cliente Telegram.
    - Envolvimento global do despachante `processarMensagemTexto` em `try/catch` defensivo com resposta amigável informativa ao usuário caso qualquer exceção imprevista ocorra.
    - Suporte a chamadas internas `'bot'` / `'internal'` em `cockpitAutorizar_` em `src/13_cockpit_integracao.js`.
    - Blindagem e auto-normalização da rota `/api/cockpit` em `server/index.js` e `server/runtime.js` para `body.args` e `metodo`, garantindo imunidade a crashes por payloads vazios, nulos ou malformados.
    - Criação e aprovação da suíte de teste de segurança automatizada `tests/test_defensivo_telegram_rpc.cjs` e `tests/test_defensivo_telegram_rpc.py` (210 testes de comandos Telegram + 70 testes de métodos RPC do Cockpit) e inclusão de testes de resiliência no `tests/test_server_render.cjs`. Cobertura de testes 100% aprovada (191 testes pytest + npm test).

0D. [x] **Varredura de Casos Extremos (Edge Cases) em Prescrições e Calculadoras Clínicas**:
    - Sanitização e blindagem matemática em `src/02_nefrologia_clearance.js`: Cockcroft-Gault clamp de idade (<= 120 anos para evitar numerador negativo), Cr <= 0 com retorno de erro limpo, alertas de peso > 150 kg (necessidade de peso ajustado) e nonagenários >= 90 anos (sarcopenia fisiológica e indicação de Cistatina C).
    - Blindagem em `src/02_nefrologia_dhe.js`: cálculo de ACT sanitizado, blindagem contra NaAtual >= concentracaoSalina na correção de hiponatremia, alertas de obesidade severa (> 150 kg) e neonatos (< 2 kg), além de alerta vermelho máximo em hipercalemia para K+ > 8.0 mEq/L (risco de assistolia/FV, conduta imediata de Gluconato de Cálcio 10% e indicação mandatória de hemodiálise de urgência).
    - Resiliência em `src/02_nefrologia_lra_kdigo.js`: proteção contra divisão por zero com Cr basal <= 0, alertas sentinela para Creatinina extrema (> 15 mg/dL) e gatilhos automatizados de diálise de urgência para acidemia severa (pH < 6.80) e hipercalemia extrema (K+ > 8.0 mEq/L).
    - Alertas sentinela em `src/02_gasometria_acido_base.js`: detecção de acidemia extrema (pH < 6.80 com risco iminente de colapso cardiovascular e perda de resposta a catecolaminas), bicarbonato severamente depletado (<= 5 mEq/L) e hipercalemia extrema (K+ > 8.0 mEq/L).
    - Suporte neonatal em `src/02_pals_pediatria.js`: neonatos e prematuros extremos < 1 kg com cálculo determinístico de tubo endotraqueal 2.5 mm sem cuff, profundidade de fixação peso + 6 cm (evitando intubação seletiva), lâmina Miller 00/0, Joules de choque e proteção estrita contra pesos negativos.
    - Suporte pediátrico em `src/02_suporte_nutricional_pediatrico.js`: alerta neonatal sentinela para recém-nascidos de extremo baixo peso (< 1 kg) em Holliday-Segar.
    - Bloqueios em `src/02_endocrinologia_diabetes.js`: teto de hidratação na 1ª hora limitado a 2.000 mL em obesidade > 150 kg (prevenindo edema agudo pulmonar); proibição terminante de reposição de potássio para K+ > 8.0 mEq/L com cardioproteção imediata; conduta emergencial mandatória de Bicarbonato de Sódio para acidemia grave (pH < 6.80).
    - Tetos farmacológicos em `src/02_toxicologia_emergencia.js`: teto estrito de 100 kg no cálculo de N-acetilcisteína (NAC) conforme diretrizes da ACMT/FDA/ABRATOX (máximo 15g no ataque, 5g na etapa 2 e 10g na etapa 3), evitando choque anafilactoide e hipervolemia iatrogênica em pacientes com obesidade severa.
    - Geriatria e extremos em `src/02_analgesia_pca.js`: contraindicação formal de dose basal contínua em nonagenários (>= 90 anos), bolus de morfina reduzido para 0.5 mg, lockout estendido para 10-15 min e recomendação preferencial de fentanil; alertas específicos para obesidade severa (> 150 kg - risco de apneia obstrutiva do sono e farmacocinética lipofílica alterada) e baixo peso corporal / caquexia (< 40 kg - menor bolus e lockout estendido).
    - Hemoterapia em `src/02_transfusao_sanguinea.js`: alerta crítico de TACO com infusão ultralenta de 3-4h e diurético profilático em pacientes >= 90 anos; prescrição em alíquota fracionada (10-15 mL/kg) para peso < 30 kg; teto seguro de 10 unidades randômicas para pool de plaquetas em obesidade > 150 kg; alerta de emergência médica absoluta para hemoglobina crítica extrema (Hb <= 4.0 g/dL).
    - Hematologia em `src/02_hematologia_anemias.js`: sanitização contra NaN no escore de Ganzoni, alerta de superestimação de déficit férrico em obesidade severa (> 150 kg), contraindicação formal de ferro parenteral em prematuros extremos (< 1 kg) e bloqueio sentinela com priorização imediata de transfusão emergencial se Hb <= 4.0 g/dL.
    - Cardiologia em `src/02_cardiologia_icc.js`: alerta imediato com suspensão mandatória de espironolactona, IECA/BRA e ARNI para K+ > 8.0 mEq/L.
    - Neurologia em `src/02_neurologia_avc.js`: alerta de avaliação de funcionalidade prévia (mRS) e risco microvascular em nonagenários (>= 90 anos) na trombólise; tetos absolutos de Alteplase (90 mg) e Tenecteplase (25 mg) blindados em obesidade (> 150 kg); ajuste por peso estrito em baixo peso (< 40 kg); alertas sentinela em HIC para sobrecarga hiperosmolar e congestão pulmonar (> 150 kg) e monitoração em UTI pediátrica com bomba de seringa (< 10 kg).
    - Suporte nutricional em `src/02_suporte_nutricional.js`: alerta específico para pacientes longevos (>= 90 anos) com aporte proteico conservador ajustado e vigilância hídrica estrita contra descompensação cardiopulmonar.
    - Calculadoras puras em `src/02_calculadoras_puras.js`: CURB-65 com alerta para nonagenários (>= 90 anos); Déficit de Água Livre sanitizado para peso de 0.3 a 350 kg com alertas de neonato (< 2 kg), obesidade (> 150 kg) e hipernatremia extrema (> 175 mEq/L); Cálcio Corrigido com alertas para crise hipercalcêmica (>= 14.0 mg/dL) e hipocalcemia grave (< 7.0 mg/dL); Gap Osmolar com alerta de intoxicação exógena maciça (> 50 mOsm/kg); KDIGO com alerta de falência renal terminal para Cr > 15 mg/dL; Gasometria com faixa de pH 6.0 a 8.0 e alerta para HCO3 esgotado (<= 5 mEq/L); Parkland com alertas para lactentes (< 10 kg com adição de SG 5%), obesidade (> 150 kg com peso ideal) e grande queimado crítico (> 50% SCQ); Posologia pediátrica com proteção estrita para faixa de 1 a 80 kg e teto adulto em adolescentes (> 50 kg); Ajuste renal com detecção de clearance aumentado (ARC > 130 mL/min).
    - Suíte de testes automatizados `tests/test_auditoria_edge_cases_clinicos.cjs` expandida para 38 cenários de estresse e casos extremos clínicos 100% aprovados, e incorporada no pipeline contínuo de testes.

0E. [x] **Expurgo e Simplificação de Módulos Excessivos para o Médico Generalista**:
    - Expurgo do módulo e referências ao Radar de Voos e comandos não médicos: removido comando residual `/pc tenda` em `src/07_telegram_handlers.js` e expurgadas as suítes legadas `tests/test_radar_voos.py` e `tests/test_radar_voos.cjs`.
    - Atualização do `README.md` focando exclusivamente nos 3 pilares médicos e de produtividade clínica (Backend Clínico & Bot, Google Calendar e Composição Corporal), alinhando a documentação às diretrizes de proibição absoluta de Google Apps Script.
    - Lapidação da linguagem dos módulos especializados para foco 100% no médico generalista e interno:
      * **Endocrinologia Hiperprolactinemia**: incorporadas seções explícitas de "Conduta Beira-Leito / UBS (Médico Generalista)" (exclusão de gravidez, TSH, drogas indutoras e macroprolactina) e "Critérios de Encaminhamento ao Especialista" (macroadenoma ≥ 10 mm, queixas visuais/compressivas urgentes ou refratariedade à cabergolina).
      * **Ginecologia Endometriose**: eliminação de jargões cirúrgicos terciários nos relatórios de planejamento e adição de seções explícitas de "Critérios de Encaminhamento Cirúrgico / Especializado" e "Conduta Beira-Leito / UBS (Médico Generalista)" (analgesia escalonada, progestagênio de 1ª linha empírico sem retardar conduta e USG dedicado).
      * **Obstetrícia SAF e Trombofilias**: incorporação de "Conduta Beira-Leito / UBS" (início imediato de AAS 100-150 mg/dia no teste positivo e desmistificação da MTHFR) e "Critérios de Encaminhamento ao Pré-Natal de Alto Risco (PNAR)".
      * **Oftalmologia de Emergência**: adição estruturada de "Critérios de Encaminhamento Urgente ao Oftalmologista" nos 3 ramos de atendimento (após irrigação copiosa em queimadura química, após doses de resgate em glaucoma agudo e curativo de shield rígido sem compressão em suspeita de perfuração/globo aberto).
      * **Hepatologia Obstétrica (CIG & EHAG)**: inclusão de critérios de encaminhamento imediato para Centro Terciário com Medicina Fetal em CIG Moderada/Grave (ABT ≥ 40 ou ≥ 100 mcmol/L) e vaga zero para UTI obstétrica em suspeita de EHAG.
      * **Urologia Cólica Nefrética**: destaque de orientações de hidratação parcimoniosa na crise aguda e critérios de encaminhamento ambulatorial vs descompressão urológica urgente.
0F. [x] **Conserto Imediato do Cockpit: Eliminação de Casos Mock/Falsos de IAM e Histórico Real de Atendimentos**:
    - Removida a injeção estática e mock de 3 casos fictícios ("IAM com supra de VD", "IC Descompensada", "Sepse") que faziam o Cockpit parecer travado em IAM mesmo sem atendimentos.
    - Substituídos os textos estáticos do HTML de IAM por estados neutros reais do plantão ("Aguardando atendimentos do plantão de hoje").
    - Implementada persistência diária de atendimentos (`casosDoDia`) no backend (`src/13_cockpit_integracao.js` e `salvarSoapCockpit_`), enviando ao Cockpit os casos reais gerados pelo usuário no Telegram com timestamp, título diagnóstico e texto SOAP.
    - Criado Empty State limpo, profissional e honesto no Cockpit quando nenhum caso ou leito está registrado.
    - Sincronizado deploy do Cockpit Móvel no GitHub Pages (`gh_cockpit_deploy/`).

0G. [x] **Auditoria de Usabilidade e Telas do Cockpit PWA Beira-Leito**:
    - Implementado motor de cálculo determinístico offline de contingência (`calcularOfflineLocal`) em `cockpit_movel.html` com execução imediata (0ms) no celular mesmo em áreas sem sinal de internet: DVA (Nora, Dobuta, Vaso), SRI (padrão, choque, asma), Clearance Cockcroft-Gault e Gasometria com fórmula de Winter.
    - Eliminação definitiva dos casos fictícios/mock de IAM e IC: cards e relatórios agora refletem 100% os casos reais conduzidos hoje (`casosDoDia`).
    - Empty state limpo e profissional quando não há atendimentos no plantão, evitando poluição visual ou informações falsas na tela do médico.
    - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.

0H. [x] **Revisão e Lapidação de Conteúdo Clínico das Calculadoras do Cockpit (com Modelo PRO)**:
    - Auditoria clínica rigorosa de ponta a ponta executada com modelo Gemini Pro (`gemini-3.1-pro-high`) em conformidade estrita com a diretriz do usuário.
    - DVA: Noradrenalina (solução 64 mcg/mL, vazão em mL/h de 0.1 a 2.0 mcg/kg/min), Dobutamina (1.000 mcg/mL, 2.5 a 20 mcg/kg/min), Vasopressina (dose fixa de 0.01 a 0.04 UI/min).
    - SRI / IOT: inclusão de alertas sentinela para sobrepeso e obesidade (≥ 100 kg e > 150 kg) com separação estrita de Peso Ideal (IBW) para Fentanil, Propofol, Etomidato e Rocurônio vs Peso Real para Succinilcolina (teto máximo 200 mg), além de contraindicações formais de hipercalemia e denervação.
    - Clearance de Creatinina (Cockcroft-Gault): clamp fisiológico de idade (≤ 120 anos), alertas de sarcopenia no idoso e obesidade severa.
    - Gasometria Arterial: fórmula de Winter validada `(1.5 * HCO3 + 8) ± 2` para acidose metabólica e `(0.7 * HCO3 + 21) ± 2` para alcalose metabólica, com detecção de distúrbios mistos e acidemia extrema (pH < 6.80).
    - Pré-Eclâmpsia e Eclâmpsia: esquema de Zuspan validado (4g IV em 20 min + 1-2g/h manutenção) com vigilância horária de reflexo patelar, diurese e FR, e antídoto Gluconato de Cálcio 10% 10 mL IV lento.

0I. [x] **Auditoria de Menus e Comandos do Telegram para o Interno / Médico Generalista**:
    - Central de Comandos `/menu` e `/hub` estruturada exclusivamente nos 5 pilares do médico generalista: Ambulatório (SOAP), Enfermaria (Leitos), Emergência (Sala Vermelha), Prescrição (REMUME) e Calculadoras.
    - Teclado do Telegram mantido não persistente (`is_persistent: false`), abrindo sob demanda sem ocupar a tela do smartphone.
    - Eliminação de comandos espúrios e não médicos (`/pc tenda`).

0J. [x] **Fase 1 do Plano Diretor — Saneamento de Excessos, UX Beira-Leito e Hubs Interativos**:
    - **Hubs Interativos com Botões Inline de 1 Toque**:
      * `/enfermaria`: 7 botões interativos (`➕ Adicionar Leito`, `📤 Dar Alta`, `📋 Passagem SBAR`, `🎙️ Pitch de Round`, `🟢 Iniciar Plantão`, `🔄 Atualizar Censo`, `🗑️ Limpar Todos`).
      * `/rotina`: 7 botões interativos (`📅 Agenda Hoje`, `📋 Tarefas Notion`, `☀️ Briefing Matinal`, `🌙 Check-in Noturno`, `📊 Relatório Semanal`, `🧠 MedQuest / Dúvidas`, `⏱️ Time-Blocking Hoje`).
      * `/diabetes`: 4 botões interativos (`🔥 CAD / EHH`, `📊 Mapa Glicêmico`, `💉 Insulina Basal-Bolus`, `💊 Antidiabéticos REMUME`).
      * `/anemia`: 2 botões interativos (`🔬 Investigação Etiológica`, `💉 Ferro IV (Ganzoni)`).
    - **Racionalização do Catálogo Canônico de `/ajuda`**: Redução de 97 para exatamente 80 comandos canônicos estruturados (absorvendo comandos secundários de enfermaria, rotina, metabolismo e governança nos hubs, preservando-os como aliases silenciosos).
    - **Banners de Encaminhamento em Subespecialidades**: Inclusão de banner sentinela (`⚠️ MÓDULO DE REFERÊNCIA AVANÇADA — A conduta definitiva requer especialista. O generalista deve reconhecer, estabilizar e encaminhar.`) nos 7 módulos terciários (`climaterio_thm`, `sop_ovarios_policisticos`, `dip_abscesso_tubo_ovariano`, `centro_obstetrico`, `obstetricia_rcf_doppler`, `obstetricia_saf_trombofilias`, `tev_gestante`).
    - **Testes Automatizados**: Bateria de testes expandida em `tests/test_simplificacao_e_expurgo_generalista.cjs` e `tests/test_ajuda_comandos_slash.cjs` validando 100% dos hubs, botões, aliases e banners. Bundle recompilado com `python3 build_master.py` e 100% de aprovação na suíte de testes.

0K. [x] **Purga Completa de Módulos Terciários Especializados e Ativação do Hub de G&O para o Internato (Vigência até 29/11)**:
    - **Diretiva de Limpeza Radical do Usuário Executada**: Eliminados por completo os 10 módulos estritamente terciários/burocráticos:
      1. `src/02_auditoria_infusao_uti.js`
      2. `src/02_auditoria_kaizen_clinico.js`
      3. `src/02_rbac_perfis_clinicos.js`
      4. `src/02_infectologia_neutropenia.js`
      5. `src/02_suporte_nutricional.js` (mantido estritamente `src/02_suporte_nutricional_pediatrico.js` / Holliday-Segar)
      6. `src/02_transfusao_sanguinea.js`
      7. `src/02_analgesia_pca.js`
      8. `src/02_auditoria_y_site.js`
      9. `src/02_mecanica_pulmonar_sdra.js`
      10. `src/02_endocrinologia_hiperprolactinemia.js`
    - **Purga de Testes Órfãos**: Removidos os 9 arquivos `.cjs` dedicados aos módulos excluídos.
    - **Purga de Handlers e Roteamento Telegram**: Removidos comandos burocráticos e terciários em `src/07_telegram_handlers.js` (`/bio`, `/perfil`, `/rbac`, `/pendencias`, `/chancelar`, `/breaktheglass`, `/auditar_rbac`, `/relatorio_rbac`, `/nutricao`, `/dieta`, `/refeeding`, `/npt`, `/nrs`, `/hiperprolactinemia`, `/prolactina`, `/cabergolina`, `/kaizen`, `/auditkaizen`, `/auditoria`, `/neutropenia`, `/mascc`, `/transfusao`, `/hemoterapia`, `/ptm`, `/chad`, `/evidencia`, `/pubmed`) e seus gatilhos de NLP.
    - **Proteção e Expansão de Ginecologia & Obstetrícia (Estágio até 29/11)**:
      * Criado o **Hub Interativo de G&O** beira-leito (`/go`, `/obstetricia`), com 10 botões de ação rápida de 1 toque:
        - `🤰 Pré-Natal & DPP`
        - `🏥 Parto & Partograma`
        - `🩸 HPP (4 Ts)`
        - `⚡ Pré-Eclâmpsia & MgSO4`
        - `👶 Prematuridade & RPMO`
        - `🔬 Toxo & Sorologias`
        - `🌸 Corrimento / Vulvovaginites`
        - `🩺 Preventivo / Citopatológico`
        - `💊 Anticoncepção OMS`
        - `🩹 DIP & Infecção Pélvica`
      * Preservados e validados todos os 14 módulos clínicos de G&O no núcleo do sistema.
    - **Fastify RPC Stubs**: Stubs graciosos padronizados com `{ sucesso: false, desativado: true }` em `src/13_cockpit_integracao.js`.
    - **Suíte de Testes 100% Verde**: Recompilação atômica via `build_master.py` (62 módulos empacotados) e 16 suítes de teste de integração e segurança passando com 100% de sucesso (`npm test`).

0L. [x] **Fase 2 do Plano Diretor — 7 Módulos Clínicos & Epidemiológicos Determinísticos Beira-Leito**:
    - **Dengue & Arboviroses (MS 2024)** (`src/02_arboviroses_dengue.js`):
      * Estadiamento em 4 grupos (A, B, C, D) conforme diretriz do Ministério da Saúde 2024.
      * Cálculo determinístico de hidratação por peso corporal (Grupo A: oral 60 mL/kg/dia; Grupo B: oral supervisionada 80 mL/kg/dia; Grupo C: venosa 10 mL/kg/h nas 2 primeiras horas; Grupo D: bólus 20 mL/kg em 20 min).
      * Contraindicação absoluta de AINEs e AAS, sinais de alarme e choque catalogados.
    - **Pneumonia Adquirida na Comunidade & CURB-65** (`src/02_pneumologia_pac.js`):
      * Cálculo automatizado do escore CURB-65 (0 a 5 pontos) com estratificação de risco (baixo, moderado, alto).
      * Condutas antimicrobianas SBPT/ATS/IDSA estratificadas para ambulatório, enfermaria e UTI.
    - **Infecção do Trato Urinário (ITU), Cistite & Pielonefrite** (`src/02_infectologia_itu.js`):
      * Cistite aguda não complicada (Fosfomicina 3g DU ou Nitrofurantoína 100mg 6/6h).
      * Proteção gestacional estrita com bloqueio formal de fluoroquinolonas e sulfas.
      * Pielonefrite não complicada ambulatorial vs hospitalar (com critérios de sepse).
      * ITU no homem abordada como potencialmente complicada (10-14 dias).
    - **Crise Hipertensiva vs Pseudocrise** (`src/02_emergencia_crise_hipertensiva.js`):
      * Diferenciação beira-leito entre Pseudocrise, Urgência e Emergência Hipertensiva.
      * Metas pressóricas personalizadas para Dissecção Aórtica (PAS < 120 e FC < 60 em 20 min com betabloqueador antes de vasodilatador), EAP, AVC e Pré-Eclâmpsia.
      * Bloqueio sentinela contra o uso de Nifedipino sublingual de ação rápida.
    - **Cefaleias Agudas no Pronto Socorro & Protocolo SNOOP** (`src/02_neurologia_cefaleias.js`):
      * Checklist mnemônico SNOOP para rastreio de bandeiras vermelhas de cefaleias secundárias.
      * Protocolo de investigação de HSA (TC crânio sem contraste + punção lombar se TC normal).
      * Protocolo analgésico de resgate no PS (Dipirona + Metoclopramida + Dexametasona) e bloqueio categórico de opioides.
    - **Pequenas Urgências & Traumatologia Básica** (`src/02_pequenas_urgencias_trauma.js`):
      * Regras de Ottawa para indicação de radiografia em entorse de tornozelo e pé.
      * Doses máximas e volumes de Lidocaína 1% e 2% calculados por peso corporal com tetos de segurança (300 mg sem e 500 mg com vasoconstritor).
      * Profilaxia de Tétano (MS) conforme histórico de doses e risco da ferida.
      * Profilaxia de Raiva Humana (MS) com conduta imediata para morcegos/animais silvestres (SAR + vacina).
      * Guia de fios cirúrgicos por topografia e contraindicação formal de suturar mordeduras infectadas.
    - **Declaração de Óbito & Notificação Compulsória** (`src/02_medicina_legal_obito_notificacao.js`):
      * Fluxo normativo CFM 1.779/2005 diferenciando Médico Assistente vs SVO vs IML (obrigatório para causas externas/violentas).
      * Guia prático de preenchimento correto das Linhas a, b, c, d da Declaração de Óbito.
      * Lista rápida de doenças de notificação compulsória imediata (24h) ao SINAN.
    - **Comandos Telegram**: Adicionados `/dengue`, `/pac`, `/itu`, `/crisehipertensiva`, `/cefaleia`, `/sutura`, `/obito` com normalização sem barra e persistência de contexto em `src/07_telegram_handlers.js`.
    - **Métodos RPC Cockpit**: Registrados no Fastify e despachante com suporte a chamadas internas em `src/13_cockpit_integracao.js` e `server/runtime.js`.

0M. [x] **Fase 3 do Plano Diretor — Lapidação de UX Beira-Leito, Sala Vermelha e Cockpit PWA**:
    - **Hub de Sala Vermelha no Telegram (`src/12_experiencia_bot.js`)**:
      * Inclusão de botões de 1 toque no menu de emergência: `❤️ Crise HAS`, `🦟 Dengue C/D` e `🤕 Cefaleia / HSA`.
      * Conexão dos callbacks `ux:emerg:crisehas`, `ux:emerg:dengue` e `ux:emerg:cefaleia` para despacho instantâneo.
    - **Espelhamento no Cockpit PWA (`gh_cockpit_deploy/index.html`)**:
      * Adição dos botões interativos de Dengue C/D e Crise HAS no seletor de protocolos da Sala Vermelha (HC-UE).
      * Implementação dos objetos determinísticos `dengue` e `has` no dicionário `PROTOCOLOS_USP_SALA_VERMELHA` com cálculo automático de expansão por peso corporal, condutas escalonadas e erros críticos.
      * Deploy atômico publicado no GitHub Pages (`gh_cockpit_deploy/`).
    - **Suíte de Testes Automatizados da Fase 2 & 3 (`tests/test_fase2_clinica_epidemiologica.cjs`)**:
      * 9 seções completas de testes unitários determinísticos, cobrindo todos os serviços, comandos Telegram e métodos Fastify RPC.
      * Integrada ao script oficial `npm test` no `package.json`.
    - **Auditoria e Compilação Master**:
      * Executado `python3 build_master.py` gerando `ultra_rotina_master.js` (69 módulos, 51.003 linhas, sintaxe 100% OK).
      * Bateria completa de testes executada com 100% de sucesso (`npm test` e `npm run lint`).

0N. [x] **Bateria de Testes Sistemáticos e Otimização de Experiência nos Hubs e Comandos do Telegram**:
    - **Protocolos Determinísticos de Emergência (`/pcr` e `/acls`)**:
      * Implementado motor imediato (0ms) de ACLS beira-leito com ramificações estruturadas: Ritmo Chocável (FV/TVSP com choque 200J bifásico, RCP 2 min, Adrenalina 1 mg q3-5min e Amiodarona 300 mg/150 mg), Ritmo Não Chocável (AESP/Assistolia com RCP imediata, Adrenalina precoce e checklist mnemônico dos 5 Hs e 5 Ts).
      * PCR na Gestante: conexão com `PcrGestanteService`, destacando a Manobra DULE obrigatória, acesso venoso supradiafragmático e cesariana de ressuscitação no 4º minuto se sem RCE.
      * Suporte Pediátrico: conexão com PALS para compressões 15:2, cargas de 2 J/kg -> 4 J/kg e Adrenalina 0,01 mg/kg.
    - **Calculadoras Renais e Distúrbios Hidroeletrolíticos (`/clcr` e `/dhe`)**:
      * Correção de usabilidade no Clearance de Creatinina: adicionado suporte oficial ao alias `/clcr` ao lado de `/crcl` e `/clearance`, e adicionado teclado rápido de atalho com opções de Cockcroft e CKD-EPI.
      * Implementação do comando `/dhe` e `/eletrolitos` integrado a `NefrologiaDheService`:
        - Hiponatremia: Adrogué-Madias com NaCl 3% (513 mEq/L), teto estrito de elevação de 8 mEq/L em 24h, cálculo de velocidade na BIC e alertas contra desmielinização osmótica.
        - Hipernatremia: cálculo determinístico de déficit de água livre em Litros, reposição escalonada com SG 5% em 24-48h e alertas contra edema cerebral.
        - Hipercalemia: estratificação beira-leito, Gluconato de Cálcio 10% IV imediato para cardioproteção, glicoinsulina, beta-2 agonista e alerta sentinela máximo para K+ > 8.0 mEq/L com indicação mandatória de hemodiálise de urgência.
    - **Otimização de UX nos Hubs e Menus (`/ambulatorio`, `/go`, `/menu`)**:
      * `/ambulatorio`: inclusão de teclado inline de 1 toque no empty state com botões diretos para `📝 Iniciar SOAP Ágil`, `💊 Prescrição REMUME`, `🏷️ CID-10 & CIAP-2`, `📄 Atestado CFM` e `🤰 Hub G&O`.
      * `/go`: espelhamento do Hub completo de 10 botões inline de Ginecologia & Obstetrícia no menu ambulatorial e em `enviarMenuGinecologiaObstetricia` em `src/12_experiencia_bot.js`.
    - **Tratamento Resiliente de Callbacks**:
      * Adicionado tratamento com `answerCallbackQuery` para `pcr_chocavel`, `pcr_naochocavel`, `pcr_gestante`, `pcr_pals`, `dhe_hipo`, `dhe_hiper`, `dhe_k`.
    - **Suíte de Testes Automatizada Dedicada**:
      * Criado `tests/test_hubs_e_comandos_telegram.cjs` (24 testes de comandos e callbacks) e integrado ao pipeline oficial do `npm test` no `package.json`.
      * 100% de aprovação em todos os testes e compilação do bundle master via `build_master.py`.

0O. [x] **Conserto Estrutural e Validação 100% do Preceptor IA no Cockpit PWA**:
    - **Diagnóstico da Gênese dos Erros**:
      * *Causa 1 (Frontend Crash)*: No Cockpit (`cockpit_movel.html` e `gh_cockpit_deploy/index.html`), a função `adicionarItemTranscricaoLive` chamava `escapeHtml(texto)`, que não estava definida em escopo global, gerando silenciosamente `ReferenceError: escapeHtml is not defined`, travando a recepção de mensagens do WebSocket e congelando a tela.
      * *Causa 2 (Buffer Mismatch em cockpitConversar)*: Em `src/13_cockpit_integracao.js`, `Utilities.base64Decode(audioBase64)` criava um `Buffer` do Node.js passado para `processarAudioClinicoMultimodal` -> `chamarGeminiPoolMultimodal`. Ao serializar no JSON REST para a API Gemini, virava `{ type: 'Buffer', data: [...] }` em vez de string Base64 limpa, causando HTTP 400 Bad Request imediato e cancelamento da transcrição.
      * *Causa 3 (Call Signature Mismatch)*: No backend (`server/index.js`), o WebSocket em modo contingência chamava `chamarGeminiPoolMultimodal({ prompt, dadosMidia: { ... } })` com objeto de opções, mas `chamarGeminiPoolMultimodal` em `src/04_motores_ia.js` esperava apenas argumentos posicionais `(base64Data, mimeType, ...)`.
      * *Causa 4 (PCM sem Header WAV)*: Chunks de áudio PCM brutos de 16 kHz recebidos via WebSocket eram concatenados sem container RIFF e enviados com MIME type `audio/pcm;rate=16000`, que a API Gemini REST `generateContent` rejeita.
      * *Causa 5 (Descarte de Áudio na Conexão)*: Em `server/index.js`, o evento `clientWs.on('message')` só era registrado após o timeout de 2 segundos de `tentarConectarLive`, descartando os primeiros pacotes de áudio transmitidos pelo browser no momento da abertura.
      * *Causa 6 (Ausência de Fallback de TTS no Cockpit)*: Caso o backend falhasse em gerar áudio neural ou as chaves estivessem ocupadas, o médico não recebia áudio no Cockpit.
      * *Causa 7 (Lock de Modo no Telegram)*: Em `src/07_telegram_handlers.js`, `/crcl`, `/clcr`, `/clearance` estavam mapeados em `mapaModos`, prendendo o bot no modo calculadora e interceptando mensagens subsequentes.
    - **Correções Estruturais Implementadas**:
      * Definida `escapeHtml(str)` universalmente no Cockpit PWA.
      * Implementada função `_iaNormalizarBase64(dados)` em `src/04_motores_ia.js` com suporte universal a Base64 puro, data URIs, Buffers e TypedArrays (incluindo suporte cross-realm via `ArrayBuffer.isView`).
      * Tornadas `chamarGeminiPoolMultimodal` e `processarAudioClinicoMultimodal` polimórficas (aceitando tanto objeto de opções quanto argumentos posicionais).
      * Implementado empacotador determinístico `pcm16ToWavBuffer(pcmBuffer, sampleRate, numChannels)` em `server/index.js` gerando container WAV RIFF padrão de 44 bytes para chunks PCM antes do envio à IA.
      * Criado buffer preventivo `pendingRawMessages` em `server/index.js` garantindo que nenhum frame de áudio seja perdido durante o handshake WebSocket.
      * Adicionada síntese de voz fallback local no Cockpit PWA (`falarTextoPreceptorFallback(texto)`) via Web Speech API (`pt-BR`).
      * Desvinculados comandos monoshot de clearance de `mapaModos` em `src/07_telegram_handlers.js`.
    - **Validação e Testes Automatizados**:
      * Criada a suíte `tests/test_preceptor_cockpit_completo.cjs` testando os 6 pilares: Normalização de Áudio, Invocação Polimórfica, RPC `cockpitConversar`, Empacotamento WAV RIFF 44-bytes, WebSocket Full-Duplex `/live` com servidor efêmero e Integridade de Frontend.
      * Suíte integrada ao script `npm test` no `package.json` — 100% dos testes aprovados com sucesso.
      * Deploy sincronizado e publicado no GitHub Pages (`gh_cockpit_deploy/`).

---












---



16. [x] **Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)**:
    - Calculadora automatizada de necessidade calórico-proteica basal (Equação de Harris-Benedict ou regra de bolso de 25-30 kcal/kg/dia).
    - Alertas críticos para síndrome de realimentação (reposição empírica de Fósforo, Magnésio e Tiamina antes da dieta).
    - Prescrição de nutrição enteral precoce e parenteral total com base nos dias de jejum e risco nutricional (NRS-2002/NUTRIC Score).

17. [x] **Módulo de Oncologia Básica para Atenção Primária**:
    - Rastreamento dos cânceres mais prevalentes (Mama, Cólon, Próstata e Pulmão) com diretrizes nacionais do INCA 2026.
    - Condutas em achados de BI-RADS em mamografias e FIT-teste positivo.
    - Gestão de efeitos adversos oncológicos na APS (neutropenia febril, mucosite e dor oncológica basal com escada analgésica da OMS avançada).

18. [x] **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**:
    - Calculadora determinística de dose de insulina basal e bolus prandial.
    - Protocolo automatizado de correção de hiperglicemia hospitalar.
    - Manejo guiado de Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH) com reposição hídrica e potássio baseada nos guidelines da ADA e SBD, além de esquema de transição IV para SC seguro.

19. [x] **Suporte Avançado de Vida Pediátrico (PALS / Reanimação Pediátrica)**:
    - Motor determinístico de cálculo de medicações de emergência pediátrica (Adrenalina 0,1mg/ml, Amiodarona, Lidocaína) em PCR por peso estimado, idade ou fita de Broselow.
    - Cálculo de Joules (2 a 4 J/kg) para desfibrilação e cardioversão sincronizada.
    - Seleção de tubo endotraqueal (TET) com e sem cuff, fixação e lâminas de intubação ajustados por idade/peso.

20. [x] **Neurologia de Emergência e Manejo de AVC Isquêmico Agudo**:
    - Checklist inteligente de elegibilidade e contraindicações absolutas/relativas para trombólise IV (Alteplase) dentro da janela terapêutica de 4.5h.
    - Protocolo restritivo de controle de PA pré e pós-trombólise (Labetalol, Nitroprussiato) evitando conversão hemorrágica.
    - Cálculo posológico determinístico de Manitol 20% e Salina Hipertônica 3% ou 20% beira-leito para o manejo agudo de Hipertensão Intracraniana (HIC) com tetos osmolares.

21. [x] **Painel Inteligente de Intoxicações Exógenas (Toxicologia de Emergência)**:
    - Protocolos determinísticos para intoxicação aguda por Paracetamol com cálculo do Nomograma de Rumack-Matthew e posologia IV/VO de N-acetilcisteína.
    - Reversão beira-leito de intoxicações por Antidepressivos Tricíclicos, Beta-bloqueadores, Bloqueadores de Canal de Cálcio e Opioides (Naloxona escalonada).

22. [x] **Módulo Avançado de Hepatologia Clínica e HDA**:
    - Cálculo determinístico do escore MELD / MELD-Na e Child-Pugh para hepatopatia crônica, com ajuste posológico para insuficiência hepática severa.
    - Protocolos ágeis de manejo de Hemorragia Digestiva Alta (HDA) varicosa com indicação de IBP IV contínuo, Terlipressina ou Octreotide, profilaxia antibiótica para PBE e restrição restrita de cristaloides.

23. [x] **Ferramenta de Auditoria Analítica (Dashboard de Kaizen Clínico)**:
    - Sistema off-line que sumariza tendências de prescrições rejeitadas por risco clínico ou interações graves, detectando gargalos na segurança do paciente em tempo real.


24. [x] **Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)**:
    - Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) e limite de 4 horas para Morfina e Fentanil em bombas de PCA.

25. [x] **Manejo de Via Aérea Difícil (Algoritmo ASA)**:
    - Protocolo guiado passo-a-passo (RSI, videolaringoscopia, máscara laríngea, cricotireoidostomia de emergência) com predição de via aérea difícil (LEMON score).

26. [x] **Módulo Avançado de Transfusão Sanguínea (Protocolo de Transfusão Maciça e Gatilhos)**:
    - Cálculos beira-leito para reposição de CHAD, Plasma Fresco Congelado, Plaquetas e Crioprecipitado em hemorragias agudas e coagulopatias (ex: CIVD).
    - Gatilhos transfusionais baseados em níveis de hemoglobina (ex: < 7 g/dL em pacientes estáveis, < 8 g/dL em doença coronariana).

27. [x] **Integração de Calculadora de Clearance de Creatinina (Cockcroft-Gault) com Auditoria Automática de Prescrições**:
    - Motor determinístico para estimar o ritmo de filtração glomerular beira-leito.
    - Bloqueio e alerta automático para antibióticos e anticoagulantes quando TFG < 30 mL/min, exigindo ajuste de dose renal obrigatório no PWA.


28. [x] **Infectologia - Manejo de Neutropenia Febril Oncológica (Escore MASCC/CISNE)**:
    - Motor determinístico de estratificação de risco para indicação de tratamento ambulatorial (MASCC >= 21) vs internação hospitalar imediata.
    - Protocolo de antibioticoterapia empírica em até 1 hora da triagem (Cefepime vs Piperacilina-Tazobactam) e indicação de Vancomicina baseada em instabilidade, cateter central ou MRSA.
    - Alerta para indicação oportuna de terapia antifúngica (Echinocandinas) em casos refratários de febre persistente por > 4-7 dias.

29. [x] **Gastroenterologia - Pancreatite Aguda e Manejo da Hidratação (Critérios de Atlanta / BISAP)**:
    - Calculadora determinística beira-leito dos escores de gravidade (BISAP, Ranson, Marshall) para predição de mortalidade e falência orgânica.
    - Protocolo de ressuscitação volêmica dirigida por metas (Lactato Ringer precoce e agressivo nas primeiras 12-24h, com monitorização de ureia e hematócrito para prevenir sobrecarga hídrica e SDRA secundária).
    - Regras alimentares precoces: dieta oral ou enteral (sonda nasojejunal) em 24-48h se tolerável, rejeitando NPO prolongado sem justificativa.


30. [x] **Módulo de Cardiologia de Emergência (Dor Torácica e IAM)**:
    - Escore HEART (History, ECG, Age, Risk factors, Troponin) e TIMI Risk para estratificação de risco de Síndrome Coronariana Aguda.
    - Protocolo duplo bloqueio (AAS + Inibidor P2Y12) com bloqueios cruzados (ex: Prasugrel em paciente com AVC prévio).

31. [x] **Inteligência Gasométrica e Distúrbios Ácido-Base (Regra dos 5 Passos)**:
    - Motor determinístico beira-leito para interpretação ácido-base em 5 passos clínicos (`src/02_gasometria_acido_base.js`).
    - Passo 1: Distúrbio primário e estratificação de gravidade clínica (leve a crítica por faixas de pH).
    - Passo 2: Compensação esperada precisa via Fórmula de Winter (PaCO2 = 1,5 × HCO3 + 8 ± 2) e equações para alcalose metabólica e acidoses/alcaloses respiratórias agudas vs crônicas.
    - Passo 3: Ânion Gap sérico com correção automática estrita por hipoalbuminemia (AG + 2,5 × [4,0 - Alb]).
    - Passo 4: Razão Delta (Delta-Delta) para diagnóstico diferencial de acidoses ocultas e estratificação em hiperclorêmica pura (< 0,4), mista (0,4-0,8), AG elevado pura (0,8-2,0) e alcalose metabólica oculta (> 2,0 ou HCO3 >= 24).
    - Passo 5: Oxigenação com Relação PaO2/FiO2 (Classificação de Berlim 2012 para SDRA) e Gradiente Alvéolo-Arterial (A-a) com PAO2 alveolar ajustada por altitude e limite de normalidade ajustado por idade.
    - Detecção inteligente de distúrbios triplos (ex: CAD + vômitos + DPOC com acidose respiratória).
    - Verificação de consistência biológica por Henderson-Hasselbalch para flag de erro de digitação ou amostra venosa.
    - Alertas críticos beira-leito de hiperlactatemia (> 4 mmol/L) e contraindicação de NaHCO3 antes de correção de hipocalemia severa (K < 3,0 mEq/L).
    - Integrado via Fastify RPC (`cockpitGasometriaAcidoBase`), comandos Telegram (`/gaso`, `/winter`, `/gasometria`, `/aniongap`) e testes automatizados 100% aprovados.

32. [x] **Módulo de Suporte Nutricional em Pediatria (Fórmula Infantil / Terapia Nutricional)**:
    - Motor determinístico beira-leito para hidratação venosa pediátrica e manutenção por Holliday-Segar (`src/02_suporte_nutricional_pediatrico.js`).
    - Cálculo preciso de volume basal (100-50-20 mL/kg/dia) e vazão horária em bomba de infusão (regra 4-2-1).
    - Ajustes clínicos por patologia: restrição hídrica para bronquiolite viral aguda (70%), restrição cardiovascular para cardiopatia congênita/IC (60%), restrição severa para SIADH/oligúria (50%), reposição de déficit/desidratação (125%) e compensação de perdas insensíveis por febre (+12% por °C acima de 37.8°C).
    - Prescrição eletrolítica de manutenção atualizada segundo SBP e AAP (2,5 mEq Na+/100 mL e 2,0 mEq K+/100 mL), com alertas rígidos para soluções isotônicas/balanceadas (prevenção de hiponatremia hospitalar aguda induzida por ADH) e infusão de potássio restrita a diurese confirmada.
    - Avaliação da Taxa de Infusão de Glicose (TIG) com SG 5% e SG 10% (alvo fisiológico de 4 a 6 mg/kg/min).
    - Calculadora determinística de fórmulas infantis respeitando a Regra de Ouro Inflexível de 1 medida rasa para cada 30 mL de água potável morna.
    - Bloqueio de fracionamento de medidas (meia colher) com orientação de preparo de múltiplos de 30 mL e descarte do excesso para evitar hipo ou hiperconcentração osmolar.
    - Alerta de capacidade gástrica fisiológica do lactente (~30 mL/kg) para prevenção de regurgitação e broncoaspiração.
    - Cobertura de fórmulas especiais (Partida, Seguimento, Prematuros/PIG, Anti-Regurgitação, Sem Lactose, Hidrolisada Extensa para APLV, Aminoácidos Livres elementares e Soja).
    - Contraindicação formal de fórmula de soja para menores de 6 meses (fitoestrógenos/alergenicidade).
    - Diretrizes de preparo seguro da OMS/SBP para prevenção de contaminação por *Cronobacter sakazakii* e *Salmonella* (água a 70°C).
    - Integrado via Fastify RPC (`cockpitSuporteNutricionalPediatrico` / `cockpitNutricaoPediatrica`), comandos Telegram (`/nutriped`, `/holliday`, `/formulainfantil`, `/diluicao`) e testes automatizados 100% aprovados.

33. [x] **Módulo de Hematologia: Manejo e Investigação de Anemias**:
    - Motor analítico do hemograma: interpretação de VCM, HCM, RDW e contagem de reticulócitos para classificação etiológica (microcítica/hipocrômica, normocítica, macrocítica).
    - Cálculo de dose de reposição de Ferro elementar (VO) com teto seguro para evitar intolerância gastrointestinal, e critérios para indicação de Ferro Endovenoso (Noripurum).

34. [x] **Cardiologia Intensiva - Choque Cardiogênico e SCA com IC Descompensada (Classificação de Forrester & Stevenson)**:
    - Estratificação determinística hemodinâmica beira-leito (Perfil A: quente/seco, Perfil B: quente/úmido, Perfil C: frio/úmido, Perfil L: frio/seco).
    - Algoritmo de titulação combinada de Inotrópico (Dobutamina/Milrinona) e Vasopressor (Noradrenalina) vs Vasodilatador (Nitroprussiato de Sódio).
    - Bloqueios de segurança: contraindicação formal de betabloqueadores na fase aguda descompensada e otimização de diuréticos de alça (Furosemida bolus vs contínua).

35. [x] **Nefrologia e Terapia Intensiva - Injúria Renal Aguda (KDIGO) e Indicações de Diálise de Urgência**:
    - Estadiamento determinístico KDIGO 1, 2 e 3 por creatinina sérica basal vs pico e débito urinário horário (mL/kg/h).
    - Checklist beira-leito das indicações clássicas de diálise de urgência (mnemônico AEIOU: Acidose refratária pH < 7.15, Eletrólitos/Hipercalemia > 6.5 com ECG alterado, Intoxicações dialisáveis, Overload/Hipervolemia com EAP, Uremia sintomática com pericardite/encefalopatia).

36. [x] **Pneumologia e Emergência - Manejo da Crise Asmática Grave e Estado de Mal Asmático**:
    - Classificação rápida de gravidade (leve/moderada vs grave vs iminência de parada com silêncio respiratório/tórax silencioso e normocapnia em acidose).
    - Protocolo escalonado de broncodilatação (Salbutamol 4-10 jatos com espaçador ou nebulização a cada 20 min na 1ª hora + Brometo de Ipratrópio 0.5mg/40 gotas).
    - Corticoterapia sistêmica precoce (VO ou IV na 1ª hora) e indicação oportuna de Sulfato de Magnésio 2g IV em 20 min na crise refratária ou ameaça à vida.
    - Estratégia protetora de intubação (indução padrão com Ketamina) e ventilação mecânica na asma (Vt baixo, FR baixa, I:E 1:3-1:4, PEEP baixa, hipercapnia permissiva e alívio de auto-PEEP).
    - Bloqueios de segurança: contraindicação formal de sedativos/ansiolíticos sem IOT, contraindicação de antibióticos empíricos de rotina e mucolíticos.
    - Integração Fastify RPC (cockpitPneumologiaAsma), comandos Telegram (/asma, /criseasma, /broncoespasmo, /salbutamol) e testes 100% aprovados.

37. [x] **Obstetrícia & Medicina Materno-Fetal - Manejo de Restrição de Crescimento Fetal (RCF / CIUR) e Doppler Obstétrico (Critérios de Barcelona / ISUOG)**:
    - Motor determinístico beira-leito completo para classificação, estadiamento e conduta em RCF (`src/02_obstetricia_rcf_doppler.js`).
  * **Classificação Delphi (Gordijn 2016 / ISUOG 2020)**:
    - Diferenciação precisa entre RCF Precoce (< 32 semanas, predomínio placentário), RCF Tardia (≥ 32 semanas, risco de deterioração aguda), PIG constitucional (Doppler normal) e sem restrição.
    - RCF Precoce: critérios isolados (CA < p3, PFE < p3, diástole zero/reversa) ou combinados (PFE/CA < p10 + uterinas > p95 ou IP AU > p95).
    - RCF Tardia: critérios isolados (CA/PFE < p3) ou 2 de 3 contributivos (PFE/CA < p10, queda > 2 quartis, RCP < p5 ou IP AU > p95).
    - Insuficiência placentária grave ao Doppler é conduzida como RCF independentemente da biometria.
  * **Interpretação Dopplervelocimétrica Completa**:
    - Artéria Umbilical: IP > p95, diástole zero (AEDV) e diástole reversa (REDV).
    - Artéria Cerebral Média: IP < p5 (vasodilatação cerebral / centralização).
    - Relação Cerebroplacentária (RCP): cálculo automático (IP ACM / IP AU), classificação por percentil ou regra conservadora RCP < 1,0 no 3º trimestre.
    - Artérias Uterinas: IP médio > p95.
    - Istmo Aórtico: fluxo diastólico reverso.
    - Ducto Venoso: IP > p95, onda A ausente e onda A reversa (gatilho de interrupção).
  * **Estadiamento de Barcelona (Figueras & Gratacós 2014)**:
    - Estágio 0 (PIG): Doppler normal, parto 39+0 a 40+0 sem, via obstétrica habitual.
    - Estágio I: PFE < p3 ou IP AU > p95 ou ACM/RCP alterados, parto 37+0 sem, indução com CTG contínua.
    - Estágio II: diástole zero na AU ou istmo reverso, parto 34+0 sem, cesariana obrigatória.
    - Estágio III: diástole reversa na AU ou IP DV > p95, parto 30+0 sem, cesariana em centro terciário.
    - Estágio IV: onda A ausente/reversa no DV, VCP < limiar TRUFFLE ou desacelerações espontâneas, interrupção ≥ 26+0 sem após corticoide se vitalidade permitir.
  * **Limiares TRUFFLE para VCP da cCTG**:
    - < 29 semanas: VCP < 2,6 ms → Estágio IV.
    - ≥ 29 semanas: VCP < 3,0 ms → Estágio IV.
  * **Protocolo de Conduta por Estágio**:
    - IG-alvo de parto, via de parto preferencial, nível de vigilância e local de parto (centro terciário a partir do Estágio II).
    - Decisão de periviabilidade (< 24 sem) e limite de viabilidade (< 26 sem) com aconselhamento conjunto Obstetrícia/Neonatologia.
  * **Corticoide Antenatal e Neuroproteção Fetal**:
    - Betametasona 12 mg IM 2 doses ou Dexametasona 6 mg IM 4 doses, indicado quando parto < 34 semanas ou Estágio ≥ III.
    - Sulfato de magnésio para neuroproteção (4 g IV ataque + 1 g/h manutenção) quando parto < 32 semanas.
    - Alerta de interpretação cautelosa de VCP e Doppler pós-corticoide (efeito farmacológico transitório 24-72h).
  * **Investigação Etiológica Escalonada**:
    - Datação, morfológica, rastreio de pré-eclâmpsia (sFlt-1/PlGF), fatores maternos.
    - Infecções congênitas (CMV, toxo, sífilis, rubéola) em RCF precoce/grave.
    - Estudo genético invasivo e SAF em RCF grave < 24 semanas.
  * **Bloqueios de Segurança Clínica**:
    - SILDENAFILA CONTRAINDICADA (STRIDER: hipertensão pulmonar neonatal e mortalidade).
    - AAS/heparina não tratam RCF estabelecida; repouso/hiperoxigenação sem evidência.
    - Não antecipar parto por biometria isolada em PIG com Doppler normal antes de 37 semanas.
  * **Parser de Texto Livre (Telegram)**:
    - Extração robusta de IG, percentis, Doppler, oligoâmnio, pré-eclâmpsia e gemelaridade.
    - Proteção contra falso positivo: "onda a reversa" não contamina "diástole reversa" da AU.
  * **Integração e Testes Automatizados**:
    - Módulo `src/02_obstetricia_rcf_doppler.js` integrado via Fastify RPC (`cockpitObstetriciaRcf` e `cockpitRestricaoCrescimentoFetal`) e comandos Telegram (`/rcf`, `/ciur`, `/rciu`, `/doppler`, `/crescimentofetal`).
    - 25 testes unitários dedicados em `tests/test_obstetricia_rcf_doppler.cjs` + 2 testes de integração do servidor em `tests/test_server_render.cjs`. 100% de sucesso.

38. [x] **Hepatologia & Emergência Obstétrica - Colestase Intra-hepática da Gestação (CIG) e Esteatose Hepática Aguda**:
    - Dosagem de ácidos biliares totais séricos como biomarcador patognomônico de estratificação de gravidade (leve 10-39 mcmol/L, moderada 40-99 mcmol/L, grave >= 100 mcmol/L com risco de óbito fetal súbito).
    - Posologia ponderada de Ácido Ursodesoxicólico (UDCA 10 a 15 mg/kg/dia) como fármaco de 1ª linha.
    - Programação do parto: indicação de interrupção entre 36 e 37 semanas na forma grave (ou 38 semanas na leve) evitando óbito fetal sem advertência cardiotocográfica.

39. [x] **Infectologia & Obstetrícia - Rastreamento e Manejo de Toxoplasmose Aguda na Gestação (Diretrizes Ministério da Saúde / FEBRASGO / ACOG)**:
    - Motor determinístico beira-leito para interpretação sorológica de Toxoplasmose (`src/02_obstetricia_toxoplasmose.js`).
    - Algoritmo escalonado por perfil: Suscetível (IgG- / IgM- com profilaxia primária e sorologia trimestral), Imunidade Pregressa (IgG+ / IgM- sem necessidade de novo rastreio), Infecção Aguda Muito Recente / IgM falso-positivo (IgG- / IgM+ com início imediato de Espiramicina e recoleta em 2-3 semanas).
    - Classificação no 1º trimestre (<= 16 semanas): interpretação de Teste de Avidez de IgG com suporte a valores numéricos (>= 60% alta afasta infecção gestacional e suspende medicação; < 50% baixa confirma infecção aguda e indica investigação fetal).
    - Conduta em Coleta Tardia (> 16 semanas): reconhecimento de perda de poder preditivo da avidez, tratando como infecção aguda provável por segurança.
    - Protocolo de profilaxia fetal contra transmissão vertical com Espiramicina 1g (3.000.000 UI) VO 8/8h.
    - Indicação e timing de Amniocentese para PCR no líquido amniótico (a partir de 18 semanas e com intervalo mínimo de 4 semanas após infecção para evitar falso-negativo).
    - Tratamento fetal intraútero com Esquema Tríplice (Sulfadiazina 1.500 mg VO 12/12h + Pirimetamina 50 mg/dia + Ácido Folínico 15 mg/dia) indicado em PCR positivo, USG alterado (hidrocefalia, calcificações cerebrais) ou infecção materna em 3º trimestre tardio (>= 32 semanas).
    - Esquema alternativo para gestantes alérgicas a Sulfonamidas com Clindamicina 600 mg VO 6/6h + Pirimetamina + Ácido Folínico.
    - Alerta crítico e conduta de termo (>= 37 semanas): suspensão de Sulfadiazina e substituição por Espiramicina para prevenção de Kernicterus neonatal por deslocamento de bilirrubina da albumina.
    - Bloqueios de segurança clínica: obrigatoriedade do Ácido Folínico (proibição de substituição por ácido fólico comum), monitoramento hematológico bimensal da toxicidade de Pirimetamina e contraindicação de amniocentese antes de 18 semanas.
    - Integração Fastify RPC (`cockpitObstetriciaToxoplasmose` e `cockpitToxoplasmoseGestacional`), comandos Telegram (`/toxo`, `/toxoplasmose`, `/espiramicina`, `/avidez`) e 20 testes unitários + testes de integração do servidor aprovados.

40. [x] **Cardiologia e Emergência - Fibrilação Atrial Aguda e Anticoagulação (CHA2DS2-VASc / HAS-BLED / Controle de Frequência vs Ritmo)**:
    - Motor determinístico de cálculo do escore CHA2DS2-VASc para indicação de anticoagulação oral (DOACs de 1ª linha: Apixabana, Rivaroxabana, Dabigatrana, Edoxabana vs Varfarina se prótese metálica/estenose mitral).
    - Avaliação balanceada de risco hemorrágico com escore HAS-BLED identificando fatores de sangramento modificáveis.
    - Algoritmo de decisão rápida de estabilidade hemodinâmica: cardioversão elétrica sincronizada imediata no choque/instabilidade vs controle de frequência (Metoprolol IV, Diltiazem, Digoxina) ou cardioversão química com Amiodarona observando a janela de 48h ou ecocardiograma transesofágico.

41. [x] **Urologia e Nefrologia - Manejo de Cólica Nefrética Aguda e Litíase Urinária (Diretrizes SBU / EAU)**:
    - Algoritmo escalonado de analgesia de emergência: AINEs de 1ª linha (Cetoprofeno / Diclofenaco) vs opioides, com bloqueios renais se ClCr < 30 mL/min.
    - Terapia Expulsiva Médica (MET): indicação de Tansulosina 0.4mg para cálculos de ureter distal de 5 a 10 mm.
    - Checklist de gravidade com indicação de descompressão cirúrgica de urgência (duplo J ou nefrostomia percutânea) em rim único, sepse urinária obstrutiva ou anúria.

42. [x] **Pediatria de Emergência - Manejo da Bronquiolite Viral Aguda (Diretrizes SBP / AAP)**:
    - Estratificação de gravidade clínica e desconforto respiratório (escore de Wood-Downes modificado).
    - Recomendações estritas de NÃO indicação rotineira de broncodilatadores (salbutamol), corticoides sistêmicos ou antibióticos em casos típicos (evitando sobretratamento desnecessário).
    - Critérios objetivos de oxigenoterapia com cânula nasal de alto fluxo (CNAF), hidratação isotônica venosa e internação em UTI pediátrica.

43. [x] **Endocrinologia Ginecológica e Reprodução - Manejo de Hiperprolactinemia e Prolactinomas (Diretrizes Endocrine Society / FEBRASGO)**:
    - Algoritmo escalonado de investigação etiológica (exclusão de macroprolactina, hipotireoidismo primário, drogas indutoras como antipsicóticos e metoclopramida).
    - Diferenciação de microadenoma (< 10 mm) vs macroadenoma (>= 10 mm) e rastreio de alterações campimétricas/visuais.
    - Terapia farmacológica com agonistas dopaminérgicos de 1ª linha (Cabergolina 0.5 mg 1 a 2x/semana com superioridade em eficácia e tolerância gastrointestinal vs Bromocriptina).
    - Manejo de segurança na gestação e rastreio de valvulopatia cardíaca com ecocardiograma em doses cumulativas elevadas.

44. [x] **Ginecologia Endócrina e Cirúrgica - Manejo Clínico da Endometriose e Dor Pélvica Crônica (Diretrizes ESHRE / FEBRASGO 2024-2026)**:
    - Diagnóstico clínico e mapeamento sindrômico estruturado baseado nos "6 Ds" da Endometriose (Dismenorreia progressiva, Dispareunia de profundidade, Dor pélvica crônica acíclica, Disquezia cíclica, Disúria e Dificuldade reprodutiva).
    - Mapeamento por imagem de alta resolução: USG transvaginal com preparo intestinal prévio e RM de pelve com protocolo específico para endometriose profunda, endometriomas e acometimento compartimental.
    - Alerta compulsório de segurança: rastreamento obrigatório de hidronefrose ureteral silenciosa em lesões retroperitoneais de ligamentos uterossacros e septo retovaginal.
    - Terapia farmacológica de 1ª linha empírica sem exigência de laparoscopia prévia: Progestagênios orais contínuos (Dienogeste 2 mg/dia como padrão-ouro de eficácia e atrofia dos implantes; SIU-Levonorgestrel 52 mg; Desogestrel 75 mcg) e AHC combinados em uso contínuo com bloqueio de estrogênios em pacientes contraindicadas.
    - Terapia de 2ª linha para refratariedade: Antagonistas orais de GnRH (Relugolix 40 mg com add-back fixa ou Elagolix) e Análogos de GnRH injetáveis (Goserrelina / Leuprorrelina) com obrigatoriedade estrita de Add-Back Therapy para prevenção de osteoporose e sintomas vasomotores.
    - Algoritmo de decisão reprodutiva vs cirúrgica (ESHRE/ASRM): Bloqueio estrito de tratamento hormonal contraceptivo em mulheres tentando engravidar; indicação prioritária de Reprodução Assistida / FIV direta em mulheres com idade ≥ 35 anos, infertilidade prolongada ou AMH diminuído (< 1.1 ng/mL) prevenindo espoliação da reserva folicular ovariana por cistectomias repetidas.
    - Indicações cirúrgicas mandatórias imediatas: estenose ureteral com hidronefrose, suboclusão intestinal retossigmoideia com acometimento ≥ 50% da luz e dor pélvica intratável.
    - Integrado via Fastify RPC (`cockpitGinecologiaEndometriose` e `cockpitEndometriose`), comandos Telegram (`/endometriose`, `/dienogeste`, `/dorpelvica`) e 100% de cobertura nos testes unitários e de integração do servidor Render.

45. [x] **Obstetrícia & Reumatologia - Síndrome do Anticorpo Antifosfolipídio (SAF) e Trombofilias na Gestação (Critérios Sydney / ACR / EULAR 2023)**:
    - Motor determinístico de diagnóstico e classificação formal baseado nos Critérios de Sydney (2006) e novos Critérios ACR/EULAR (2023).
    - Mapeamento de critérios obstétricos (abortamentos precoces de repetição ≥ 3 com < 10 semanas, perda fetal morfologicamente normal ≥ 10 semanas, parto prematuro < 34 semanas por pré-eclâmpsia grave ou insuficiência placentária) e critérios trombóticos (TVP, TEP, AVC, trombose arterial/venosa).
    - Validação estrita de critérios laboratoriais com intervalo mínimo obrigatório de 12 semanas (Anticoagulante Lúpico, Anticardiolipina IgG/IgM e Anti-beta-2-glicoproteína I) e identificação de Tripla Positividade com altíssimo risco.
    - Estratificação fenotípica: SAF Obstétrica Típica (AAS 100-150 mg/dia + Enoxaparina profilática por faixas de peso), SAF Trombótica (Enoxaparina plena terapêutica 1 mg/kg 12/12h + AAS), SAF Refratária (escalonamento e adição de Hidroxicloroquina 200 a 400 mg/dia), Portadora Assintomática e CAPS.
    - Manejo de trombofilias hereditárias (Alto Risco: Déficit Antitrombina III, FVL homozigoto, Protrombina homozigoto, Duplo hetero; Baixo Risco: FVL hetero, Protrombina hetero, Déficit Proteína C/S) e desmistificação com bloqueio formal de heparina/anticoagulação por polimorfismo isolado de MTHFR.
    - Protocolo estrito de suspensão periparto para anestesia neuroaxial (SOAP/ASRA): 12 horas para HBPM profilática e 24 horas para HBPM terapêutica, além de regras de puerpério seguro mantendo Enoxaparina por 6 semanas completas.
    - Bloqueios de segurança clínica: contraindicação formal de DOACs, contraindicação de Varfarina no 1º trimestre, contraindicação de AINEs no 3º trimestre e suplementação obrigatória de Cálcio e Vitamina D para prevenção de perda óssea por heparina.
    - Integrado via Fastify RPC (`cockpitObstetriciaSaf`, `cockpitSafTrombofilias`, `cockpitSafGestacional`), comandos Telegram (`/saf`, `/antifosfolipidio`, `/safgestante`, `/trombofiliagestante`, `/trombofilia`, `/enoxaparina`) e 100% de cobertura nos testes unitários e de integração do servidor Render.

---


46. [x] **Cardiologia - Rastreio e Manejo de Insuficiência Cardíaca Crônica (Diretrizes SBC/ESC)**:
    - Motor determinístico para diagnóstico (Critérios de Framingham).
    - Classificação funcional da NYHA e estadiamento ACC/AHA (A a D).
    - Prescrição sequencial escalonada do Quarteto Fantástico (iSGLT2, ARNI/IECA, Beta-bloqueador e ARM) com checagem rigorosa de contraindicações (ex: bloqueio de espironolactona e sacubitril/valsartana em hipercalemia ou piora de ClCr).

47. [x] **Oftalmologia e Emergência - Rastreio e Conduta Inicial no Trauma Ocular, Queimaduras Químicas e Glaucoma Agudo (Diretrizes CBO / AAO / Wills Eye / ATLS)**:
    - Motor determinístico beira-leito para acuidade visual (Snellen, Conta Dedos, Movimentos de Mãos, Percepção Luminosa) e triagem de urgência oftalmológica (`src/02_oftalmologia_emergencia.js`).
    - Protocolo emergencial de queimaduras químicas oculares: prioridade zero de irrigação profusa contínua (Ringer Lactato ou SF 0,9%, 1-2L iniciais) antes de qualquer anamnese detalhada ou acuidade visual; aferição seriada de pH com papel tornassol (alvo neutro 7.0 a 7.2 com repouso pós-irrigação); eversão palpebral obrigatória com bastonete para remoção mecânica de partículas sólidas (cal, cimento, gesso); diferenciação fisiopatológica de álcalis (necrose de liquefação com penetração profunda e isquemia límbica) vs ácidos (necrose de coagulação).
    - Protocolo determinístico de Glaucoma Agudo de Ângulo Fechado (GAAF): terapia hipotensora sistêmica imediata com Acetazolamida 500 mg VO/IV (bloqueio em alergia grave a sulfas), Timolol 0,5% colírio com bloqueio de segurança em asma, DPOC e bradicardia severa, Brimonidina 0,15-0,2% (bloqueio em menores de 2 anos pelo risco de depressão respiratória central) e Manitol 20% IV (1-2 g/kg em 30-45 min); **Regra de Ouro da Pilocarpina**: bloqueio formal de miótico com PIO > 40-50 mmHg devido à isquemia do esfíncter da íris, liberando Pilocarpina 1-2% somente após redução prévia da pressão intraocular; encaminhamento urgente para iridotomia periférica a laser profilática bilateral.
    - Protocolo de trauma ocular e suspeita de globo ocular aberto (Seidel positivo, pupila em gota d'água direcionada à ferida, câmara anterior rasa/atâmica, extrusão uveal, hipotonia): **Regras de Proteção Absoluta**: NUNCA palpar, NUNCA aferir tonometria, NUNCA everter pálpebras, NUNCA prescrever pomadas ou colírios desnecessários, NUNCA aplicar curativo compressivo com gaze; proteção mecânica exclusiva com shield rígido (protetor acrílico ou de alumínio apoiado nas bordas orbitárias ósseas), NPO absoluto, antiemético IV profilático para prevenir vômito e manobra de Valsalva, profilaxia antitetânica e antibioticoterapia IV para endoftalmite; protocolo de hifema traumático com repouso em cabeceira elevada a 30-45º e bloqueio absoluto de AAS/AINEs; protocolo de fratura de assoalho de órbita (blow-out) com proibição estrita de assoar o nariz para prevenção de enfisema orbitário e amaurose.
    - Integrado via Fastify RPC (`cockpitOftalmologiaEmergencia`, `cockpitOftalmologia`), comandos Telegram (`/oftalmo`, `/glaucoma`, `/queimaduraocular`, `/traumaocular`) e cobertura 100% aprovada nos testes unitários e de integração do servidor Render.


48. [x] **Módulo de Psiquiatria - Manejo do Transtorno Depressivo Maior, Agitação Psicomotora e Risco de Suicídio (Concluído)**:
    - Escala de Depressão PHQ-9 e inventário de risco de suicídio (C-SSRS e SAD PERSONS).
    - Algoritmo de escolha de antidepressivos (ISRS, Duais) focado em efeitos colaterais e comorbidades.
    - Protocolo de contenção física (CFM 2.057/2013) e química para urgências psiquiátricas.

49. [x] **Geriatria Avançada - Profilaxia de Quedas e Osteoporose (FRAX/ACR)**:
    - Motor determinístico beira-leito para estimativa do risco de fratura em 10 anos pelo modelo calibrado FRAX Brasil (ABRASSO / SBGG / NOGG / OMS) em `src/02_saude_idoso.js`.
    - Curva basal brasileira interpolada por idade e sexo, com ajuste matemático de IMC, cálculo de Hazard Ratios para fatores de risco clínicos (fratura prévia por fragilidade, histórico parental de fratura de fêmur, tabagismo, uso crônico de glicocorticoide, artrite reumatoide, osteoporose secundária e etilismo) e gradiente por desvio padrão para T-score da DMO do colo femoral.
    - Estratificação de risco com limiares de intervenção formais (Alto Risco para Fratura de Quadril >= 3% ou Fratura Maior >= 20%, ou fratura prévia de fragilidade ou T-score <= -2.5; Risco Intermediário com indicação expressa de DMO para reclassificação; Baixo Risco para suporte preventivo).
    - Protocolo de manejo de osteoporose e suplementação mineral:
      * Cálcio elementar com meta de 1.000 a 1.200 mg/dia: preferência por Citrato de Cálcio para usuários crônicos de IBP (absorção independente do pH ácido gástrico) e Carbonato de Cálcio com as refeições; teto de segurança diário <= 1.500-2.000 mg/dia para prevenir litíase urinária e calcificação arterial.
      * Vitamina D (Colecalciferol): meta sérica de 30 a 60 ng/mL no idoso/frágil; esquema de ataque de 50.000 UI/semana por 8 semanas se deficiência (< 20 ng/mL); alerta crítico de toxicidade para 25(OH)D > 100 ng/mL; contraindicação sentinela absoluta de megadose única anual (500.000 UI em bolus) por risco paradoxal de quedas e fraturas.
      * Bisfosfonatos (Alendronato 70 mg VO semanal): bloqueio renal estrito para ClCr < 35 mL/min (indicação de Denosumabe sob especialista); bloqueio temporário por hipocalcemia sérica (< 8.5 mg/dL) antes do início; contraindicação oral por esofagopatia grave ou incapacidade de manter ortostase por 30-60 min; instruções de ouro de tomada (jejum completo com 200 mL de água pura, ortostase 30-60 min e aguardar 30-60 min antes de qualquer alimento/droga); alerta de Drug Holiday após 3 a 5 anos de uso contínuo.
    - Revisão de polifarmácia e auditoria de FRIDs (Fall-Risk Increasing Drugs):
      * Detecção de fármacos que prolongam intervalo QTc com emissão de ALERTA VERMELHO DE QT LONGO e risco de Torsades de Pointes se combinação de 2 ou mais agentes.
      * Detecção de fármacos hipotensores ortostáticos e confirmação clínica beira-leito (queda de PAS >= 20 mmHg ou PAD >= 10 mmHg aos 3 minutos após ortostase).
      * Rastreio de psicotrópicos, benzodiazepínicos, drogas Z e relaxantes musculares com cálculo de carga iatrogênica de quedas e orientações de desprescrição segura.
    - Integração completa via Fastify RPC (`cockpitGeriatriaFrax`, `cockpitFrax`, `cockpitGeriatriaOsteoporose`, `cockpitOsteoporose`, `cockpitGeriatriaQuedas`, `cockpitQuedas`, `cockpitGeriatriaPolifarmacia`, `cockpitGeriatriaAvancada`, `cockpitSaudeIdosoAga`) e comandos Telegram (`/frax`, `/osteoporose`, `/quedas`, `/polifarmacia`, `/frids`, `/aga`, `/idoso`, `/cfs`, `/minicog`, `/tug`, `/beers`).
    - Nova suíte de testes automatizados `tests/test_saude_idoso_geriatria.cjs` com 22 cenários clínicos especializados, testes de endpoint Fastify `/api/cockpit` integrados no `tests/test_server_render.cjs` e 100% de aprovação no pipeline contínuo do projeto.

50. [x] **Pneumologia e Terapia Intensiva - Manejo da Crise Hipercapnica na DPOC e Ventilação Não Invasiva (GOLD 2026 / SBPT)**:
    - Critérios determinísticos de indicação e contraindicações formais para VNI (BiPAP/CPAP) na exacerbação aguda da DPOC.
    - Titulação beira-leito de IPAP e EPAP com alvos gasométricos (pH >= 7,35 e alívio do trabalho muscular).
    - Parâmetros objetivos de falha de VNI e gatilhos para intubação orotraqueal e ventilação mecânica protetora precoce.

51. [x] **Reumatologia e Urgência - Monoartrite Aguda e Febre Reumática (Critérios de Jones / ACR)**:
    - Motor determinístico beira-leito para análise do líquido sinovial e diagnóstico diferencial de monoartrite (`src/02_reumatologia_monoartrite_febre_reumatica.js`):
      * Classificação do líquido sinovial por grupos (Grupo I: Não-inflamatório/Mecânico; Grupo II: Inflamatório/Microcristalino; Grupo III: Séptico/Infeccioso; Grupo IV: Hemorrágico).
      * Diferenciação microcristalina sob microscopia: cristais em agulha com forte birrefringência negativa (Urato Monossódico / Gota) vs cristais romboides com birrefringência positiva fraca (Pirofosfato de Cálcio / Pseudogota/CPPD).
      * Alerta sentinela crítico de coexistência: identificação de cristais não exclui Artrite Séptica bacteriana sobreposta se celularidade elevada, Gram positivo ou febre.
      * Protocolo de conduta na Artrite Séptica: emergência médica ortopédica, artrocentese evacuadora seriada imediata vs indicação mandatória de drenagem cirúrgica (artroscopia/artrotomia em quadril, ombro, articulações axiais ou com prótese).
      * Esquemas antimicrobianos empíricos intravenosos escalonados: Ceftriaxona 1-2g IV + Azitromicina 1g VO para adulto jovem sexualmente ativo (risco gonocócico); Oxacilina 2g IV 4/4h para adulto padrão (MSSA); Vancomicina 15-20 mg/kg IV 12/12h para risco de MRSA; associação de Ceftriaxona/Cefepime para risco de BGN em idosos e imunossuprimidos.
      * Manejo da crise aguda de Gota: AINE potente em dose cheia precoce se função renal e gástrica preservadas; Colchicina em baixa dose (1,0 mg ataque + 0,5 mg após 1h); Prednisona oral 30-40 mg/dia como droga de escolha em insuficiência renal (ClCr < 30 mL/min), idosos e alto risco hemorrágico; Regra de Ouro do Alopurinol (não suspender se uso prévio e não iniciar durante o pico agudo).
    - Motor determinístico de Febre Reumática Aguda e Critérios de Jones revisados (AHA 2015 / SBP / SBC):
      * Estratificação por população de alto risco epidemiológico (Brasil): critérios maiores (Cardite, Artrite [poliartrite migratória, monoartrite ou poliartralgia], Coreia de Sydenham, Eritema marginado, Nódulos subcutâneos) e menores (Artralgia, Febre ≥ 38,0 °C, VHS ≥ 30 mm/h ou PCR ≥ 3,0 mg/dL, intervalo PR prolongado no ECG).
      * Diagnóstico presuntivo independente para Coreia de Sydenham isolada.
      * Protocolo de erradicação de orofaringe do *Streptococcus pyogenes*: Penicilina G Benzatina IM profunda dose única (1.200.000 UI se ≥ 27 kg; 600.000 UI se < 27 kg); esquema com Eritromicina ou Azitromicina para alérgicos.
      * Controle anti-inflamatório da fase aguda: AAS em dose plena anti-inflamatória (80-100 mg/kg/dia dividido de 6/6h) na artrite pura com resposta rápida diagnóstica; Corticoterapia com Prednisona (1-2 mg/kg/dia) na cardite moderada/grave.
      * Protocolo de Profilaxia Secundária obrigatória a cada 21 dias (padrão-ouro Brasil): Penicilina G Benzatina (1.200.000 UI se ≥ 27 kg; 600.000 UI se < 27 kg) ou Sulfadiazina 1g/dia VO em alérgicos.
      * Duração da profilaxia secundária: até 21 anos (sem cardite), até 25 anos (cardite curada sem lesão residual) ou até 40 anos/vitalícia (valvulopatia residual crônica persistente ou prótese valvar).
    - Integração Fastify RPC (`cockpitReumatologiaMonoartrite`, `cockpitMonoartrite`, `cockpitReumatologiaFebreReumatica`, `cockpitFebreReumatica`, `cockpitJones`), comandos Telegram (`/monoartrite`, `/artriteseptica`, `/artriteséptica`, `/gota`, `/artrocentese`, `/febrereumatica`, `/fr`, `/jones`, `/aslo`) e suíte de testes dedicados `tests/test_reumatologia_monoartrite_febre_reumatica.cjs` 100% aprovada.

52. [x] **Cockpit PWA - Cache Local Criptografado com IndexedDB e Fila Offline Resiliente**:
    - Subsistema cliente `CockpitCrypto` com criptografia em repouso AES-256 GCM (via Web Crypto API SubtleCrypto nativa) e fallback simétrico seguro com salt por dispositivo, garantindo proteção total de dados de saúde no dispositivo do médico.
    - Expansão do banco IndexedDB (`CockpitOfflineDB`) para v2 no Dexie com stores estruturados e criptografados: `snapshots` (dados de leitos e atendimentos), `protocolos` (catálogo REMUME e Sala Vermelha), `calculos` (cache determinístico de cálculos com 0ms de latência), `consultas` (perfil corporal e histórico) e `syncQueue` (mutações gravadas).
    - Fila Offline Resiliente (Offline Action Queue) criptografada com suporte a Optimistic UI para alteração de status de leito (`cockpitStatusLeito`), pesagem (`cockpitRegistrarPeso`) e progresso de aulas (`cockpitAlternarAula`), permitindo uso clínico ininterrupto em subsolos hospitalares e áreas blindadas sem sinal.
    - Sincronização automática em segundo plano (auto-sync) ao detectar retorno de sinal de rede (`online`) e por timer periódico de 25 segundos, além de acionamento manual no modal.
    - Badge de telemetria visual em tempo real no cabeçalho mobile indicando com clareza o modo de conexão ativo (`Nuvem`, `Nó Local`, `Offline Seguro`), com contador numérico de pendências e modal expandido com diagnóstico criptográfico do armazenamento.
    - Suíte de testes automatizados `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_cockpit_offline_indexeddb.py` incorporados no pipeline de testes (`npm test` e pytest com 100% de sucesso).
    - Sincronização de deploy do bundle Cockpit no GitHub Pages (`gh_cockpit_deploy/index.html`).

53. [x] **Dermatologia e Infectologia - Diagnóstico e Manejo de Lesões Elementares e ISTs Cutâneas (Herpes, Sífilis Secundária, Mpox)**:
    - Motor determinístico beira-leito para análise dermatológica e ISTs (`src/02_dermatologia_lesoes_ists.js`):
      * **Algoritmo de Diferenciação Morfológica de Lesões Elementares**:
        - Classificação por categorias: alterações de cor (máculas, manchas e púrpuras), elevações sólidas (pápulas, placas, nódulos), conteúdo líquido (vesículas, bolhas, pústulas) e perdas/secundárias (erosões, úlceras, crostas).
        - Red flags imediatos: Sinal de Hutchinson (vesículas na ponta/asa do nariz - comprometimento do ramo nasociliar de V1 com risco iminente de ceratite herpética e amaurose, urgência oftalmológica mandatória); Sinal de Nikolsky positivo com descolamento epidérmico e acometimento mucoso (alerta crítico para SSJ/NET com suspensão imediata de fármacos suspeitos); Púrpura/petéquias que não desaparecem à digitopressão associadas a febre (alerta de sepse/meningococcemia/CIVD com indicação imediata de Ceftriaxona 2g IV); Pápulas descamativas palmo-plantares com colarete periférico de Biett (patognomônico de Sífilis Secundária).
      * **Protocolo Posológico de Antivirais (Herpes Zoster & Herpes Simples) com Ajuste por ClCr**:
        - Herpes Zoster Oral: Aciclovir 800 mg 5x/dia por 7 dias (ajustado para 8/8h se ClCr 10-25 mL/min; 12/12h se ClCr < 10 mL/min; dose pós-diálise em hemodiálise) e Valaciclovir 1.000 mg 8/8h por 7 dias (ajustado para 12/12h se ClCr 30-49 mL/min; 24/24h se ClCr 10-29 mL/min; 500 mg 24/24h se ClCr < 10 mL/min ou hemodiálise).
        - Herpes Zoster Intravenoso (casos graves/imunossuprimidos): Aciclovir 10 mg/kg IV de 8/8h com ajuste por ClCr, regra estrita de infusão lenta em pelo menos 1 hora e hidratação venosa vigorosa profilática contra cristalúria tubular renal.
        - Herpes Simples Genital: Primoinfecção (Aciclovir 400 mg 8/8h 7-10d ou Valaciclovir 1.000 mg 12/12h); Recorrência (Aciclovir 400 mg 8/8h 5d ou Valaciclovir 500 mg 12/12h 3d); Terapia Supressiva Crônica (Aciclovir 400 mg 12/12h contínuo ou Valaciclovir 500 mg/dia); Alerta de cesariana mandatória se lesões ativas em trabalho de parto para prevenção de encefalite neonatal.
        - Analgesia e Prevenção de Neuralgia Pós-Herpética: introdução precoce de Gabapentina (300 a 1.800 mg/dia) ou Pregabalina (75 a 150 mg 12/12h) e analgesia escalonada.
      * **Abordagem Sindrômica de Úlceras Genitais (PCDT Ministério da Saúde 2024-2026)**:
        - Ramo Herpético: vesículas agrupadas presentes -> tratar Herpes Genital com Aciclovir/Valaciclovir.
        - Ramo Agudo (< 4 semanas sem vesículas): tratamento empírico duplo mandatório para Sífilis Primária (Penicilina G Benzatina 2.400.000 UI IM dose única) + Cancro Mole (Azitromicina 1.000 mg VO dose única); Bloqueio absoluto de Doxiciclina na gestante com indicação de dessensibilização hospitalar com penicilina.
        - Ramo Crônico (>= 4 semanas): tratamento estendido para Donovanose (*Klebsiella granulomatis*) com Azitromicina 1g/sem ou 500mg/dia por >= 3 semanas até cicatrização completa; Doxiciclina 100mg 12/12h por 21 dias para Linfogranuloma Venéreo (*Chlamydia trachomatis* L1-L3); Alerta de biópsia incisional de borda de lesão para afastar Carcinoma Espinocelular.
        - Notificação compulsória (SINAN) e tratamento de parcerias sexuais dos últimos 90 dias.
      * **Manejo da Sífilis e Reação de Jarisch-Herxheimer**:
        - Estadiamento preciso: Primária/Secundária/Latente Recente (Penicilina G Benzatina 2.400.000 UI IM dose única fracionada em 1,2M UI por glúteo) vs Latente Tardia/Ignorada (Penicilina G Benzatina 2.400.000 UI IM semanal por 3 semanas consecutivas - total 7.200.000 UI) vs Neurossífilis (Penicilina Cristalina IV 18-24M UI/dia por 10-14 dias em internação com punção lombar).
        - Alerta educativo sobre Reação de Jarisch-Herxheimer nas primeiras 24 horas: liberação aguda de endotoxinas, autolimitada, tranquilização do paciente, sintomáticos e monitoramento de vitalidade fetal em gestantes.
        - Critérios de cura sorológica com VDRL: queda de 2 titulações (ou 4 vezes) em 6 meses (sífilis recente) e 12 meses (sífilis tardia); desmistificação da cicatriz sorológica.
      * **Mpox (Monkeypox / Orthopoxvirus) e Biossegurança**:
        - Tríade clássica: febre + linfadenomegalia dolorosa acentuada + vesículas/pústulas umbilicadas com acometimento anogenital e mucosas.
        - Biossegurança: isolamento domiciliar estrito até a queda de todas as crostas e reepitelização completa; EPI profissional com máscara PFF2/N95, óculos e capote.
        - Manejo de proctite intensa: banho de assento morno, anestésico tópico e analgesia escalonada.
    - Integração Fastify RPC (`cockpitDermatologiaLesao`, `cockpitDermatologiaHerpes`, `cockpitHerpes`, `cockpitZoster`, `cockpitDermatologiaUlcerasGenitais`, `cockpitUlceraGenital`, `cockpitDermatologiaSifilis`, `cockpitSifilis`, `cockpitDermatologiaMpox`, `cockpitMpox`), comandos Telegram (`/dermato`, `/lesao`, `/lesoes`, `/pele`, `/herpes`, `/zoster`, `/aciclovir`, `/valaciclovir`, `/ulceragenital`, `/cancro`, `/donovanose`, `/lgv`, `/sifilis`, `/biett`, `/roseola`, `/mpox`, `/monkeypox`), manual de ajuda expandido e suíte de testes dedicados `tests/test_dermatologia_lesoes_ists.cjs` 100% aprovada.

54. [x] **Emergência Clínica - Choque Séptico Refratário e Manejo de Insuficiência Adrenal Relativa (CIRCI)**:
    - Escore de suspeição de CIRCI e indicação precisa de Hidrocortisona 200 mg/dia contínua em choque dependente de doses elevadas de vasopressores (> 0,25 mcg/kg/min).
    - Protocolo de titulação de Vasopressina (0,03 U/min fixa) associada.\n    - 🛑 EXPURGO: Azul de Metileno removido por ser conduta terciária exclusiva de UTI (vasoplegia pós-operatória), focando o módulo estritamente no Generalista/PS.

> [!IMPORTANT]
> **AUDITORIA CLÍNICA & OPERACIONAL (Tarefas 55 a 111 Expurgadas)**:
> Todas as 61 tarefas pendentes anteriores (55 a 113) que propunham a adição de novos módulos, ferramentas pesadas de simulação, procedimentos cirúrgicos terciários (NPT neonatal cirúrgica, VAFO, imunossupressão em transplantes, protocolo de morte encefálica) ou rotinas fora da prática do médico generalista foram **TERMINANTEMENTE EXPURGADAS**.
> O backlog ativo agora foca com rigor absoluto nos 3 pilares definidos pelo usuário:
> 1. **Melhorar UI/UX para facilitar o acesso do médico ao bot, tornando-o mais intuitivo**.
> 2. **Verificar todas as funções disponíveis e retirar todas aquelas que não fazem sentido para um aluno de internato ou médico generalista**.
> 3. **Fazer auditoria de todo o conteúdo médico existente (com o modelo PRO)**.

55. [x] **UI/UX & Acessibilidade do Bot — Redesenho Ergonômico de Menus, Teclados e Navegação Beira-Leito no Telegram**:
    - **Reestruturação da Arquitetura de Informação**:
      * Reorganização do fluxo principal (`/start`, `/menu`, `/ajuda`) e inline keyboards em 4 cenários clínicos imediatos com acesso em no máximo 1 ou 2 toques:
        1. 🚨 **Emergência & Sala Vermelha**: PCR (ACLS), DVA (Noradrenalina, Dobutamina, Vasopressina), Intubação em Sequência Rápida (SRI), Choque e Glasgow.
        2. 🛏️ **Enfermaria & Prescrição Rápida**: Leitos, Clearance de Creatinina (Cockcroft-Gault), Ajuste Renal, Hidratação Venosa (Holliday-Segar), Passagem de Plantão SBAR e Kits de Sintomáticos.
        3. 🩺 **Ambulatório & Atenção Primária (UBS)**: Gerador SOAP Ágil, CID-10/CIAP-2, Prescrição REMUME em texto limpo e Atestado Médico CFM.
        4. 💊 **Consultas Rápidas de Bolso**: Antibióticos empíricos de 1ª linha por foco, Doses Pediátricas por kg (com tetos seguros) e Validador de Drogas na Gestação/Lactação.
      * Implementação completa dos callbacks UX no motor `tratarCallbackUX` para navegação fluida em todos os submenus e opções clínicas dos 4 cenários (`ux:hub:*`, `ux:emerg:*`, `ux:enf:*`, `ux:amb:*`, `ux:bolso:*`).
    - **Teclado Adaptativo e Usabilidade Mobile**:
      * Teclado inline e reply keyboard limpo (`obterTecladoFixoPrincipal`), configurado com `is_persistent: false` e `resize_keyboard: true` para não ocupar a área de digitação da tela em smartphones (iOS e Android).
      * Botões de retorno padronizados ("🔙 Voltar ao Menu", "🏠 Início") criados via helper `obterBotoesNavegacaoPadrao()` em respostas e submenus para evitar que o médico fique preso.
    - **Inteligência de Entrada e Tolerância a Linguagem Natural Rápida**:
      * Implementado motor determinístico `tentarRoteamentoColoquialPlantao` com compreensão imediata de termos coloquiais do plantão e siglas sem barra:
        - `amoxi` / `amoxicilina`: dose pediátrica por kg (50 e 90 mg/kg/dia) com tetos seguros ou posologia de adulto.
        - `nora` / `noradrena`: cálculo de vazão em mL/h por peso ou seletor rápido.
        - `dobuta` / `dobutamina`: cálculo por peso determinístico em mL/h.
        - `vaso` / `vasopressina`: vazão fixa de 12 mL/h.
        - `dipirona`: cálculo pediátrico em gotas (1 gota/kg, máx 40 gotas) e posologia adulto.
        - `clcr` / `crcl` / `clearance`: cálculo de Cockcroft-Gault direto por peso/idade/creat ou guia explicativo com botões.
        - `sofa` / `qsofa`: critérios rápidos e Bundle de 1 hora da Sepse.
        - `has descompensada` / `crise hipertensiva`: conduta de urgência vs emergência hipertensiva beira-leito.
        - `dpp` / `dum`: cálculo Naegele com data ou guia.
        - `glasgow`: estratificação de TCE e alerta de IOT/SRI se Glasgow ≤ 8.
        - `pcr` / `acls`: algoritmo de reanimação cardiopulmonar imediato.
      * Normalização transparente de comandos canônicos digitados sem barra (`sri 70 choque`, `gaso ...`, `menu`, etc.).
      * Tratamento gracioso de erros de digitação (typos comuns como `clearence`, `gasometria`, `intubacao`, `amoxilina`, `receita`).
      * Criação da suíte dedicada `tests/test_ui_ux_acessibilidade_telegram.cjs` e integração no pipeline `npm test` com 100% de aprovação.

56. [x] **UI/UX & Formatação Visual de Respostas — Respostas Escaneáveis em 3 Segundos e Cópia com 1 Toque para PEP**:
    - **Hierarquia Visual Escaneável Beira-Leito**:
      * Padronização visual estrita em todas as respostas do bot para leitura em situações de estresse ou correria com 4 marcadores semafóricos:
        - 🔴 **Ação Imediata / Conduta / Dose de Ataque**: Sempre no topo em negrito, com valores destacados para decisão em 3 segundos.
        - 🟡 **Diluição, Velocidade de Infusão e Manutenção**: Posologia discriminada de forma prática (ex: mL/h na bomba ou gotas/min).
        - ⚠️ **Alertas de Segurança & Bloqueios**: Tetos máximos, contraindicações absolutas e monitorização clínica indispensável.
        - ℹ️ **Justificativa Clínica e Referências**: Seção compacta e recolhida ao final, sem poluir a tomada de decisão rápida.
      * Criação das funções utilitárias `formatarHierarquiaEscaneavel(config)` e `padronizarHierarquiaVisual(texto)` em `src/01_utils.js`.
      * Atualização de `drogasVasoativas` e `sequenciaRapidaIntubacao` em `src/02_calculadoras_puras.js` e do contrato visual `IA_VISUAL` e motor de emergência em `src/04_motores_ia.js` para seguir rigorosamente essa arquitetura escaneável.
    - **Exportação Limpa com 1 Toque**:
      * Botão inline dedicado "📋 Copiar para Prontuário" padronizado nas respostas de prescrição (`rx`, `rxh`), SOAP e atestados médicos (`/atestado`), gerando texto limpo (`uxTextoProntuario` sem markdown, emojis ou hashes) pronto para colar no PEP (Tasy, MV, e-SUS).
      * Suporte a `copy_text` nativo para textos <= 256 caracteres e fallback via callback `ux:copiar:` para textos extensos.
    - **Botões Inline de Ajuste Dinâmico Beira-Leito**:
      * "🔄 Recalcular por Peso" (`ux:recalc:peso:`): seletor instantâneo com botões de peso rápido (50, 60, 70, 80, 90, 100 kg) e captura de peso livre por texto com recálculo automático da posologia.
      * "⚠️ Ver Interações" (`ux:interacao:caso:`): análise farmacológica instantânea de interações e segurança clínica do caso/prescrição em cache.
      * Criação da suíte dedicada `tests/test_ui_ux_formatacao_respostas_pep.cjs` e integração no pipeline `npm test` com 100% de sucesso.

57. [x] **Saneamento do Escopo Clínico — Inventário Completo e Expurgo de Funções Fora do Perfil de Internato e Generalista**:
    - **Inventário Exaustivo de Funções Instaladas**:
      * Mapeamento completo e documentado em `docs/INVENTARIO_CLINICO_GERAL.md` de todos os 256 comandos Telegram tratados, catálogo canônico de 97 comandos do `/ajuda`, 133 rotas Fastify RPC em `src/13_cockpit_integracao.js` e 59 submódulos clínicos determinísticos (`src/02_*.js` e `src/03_*.js`).
    - **Critérios Rigorosos de Expurgo (Filtro Interno & Médico Generalista)**:
      * ❌ **Desativação de Ferramentas Administrativas ou Burocráticas**:
        - Desativados comandos burocráticos de governança hospitalar `/auditar_rbac` e `/relatorio_rbac` com resposta limpa e amigável orientando o uso de `/perfil`.
        - Desvinculação do comando `/emergencia` do bypass administrativo de RBAC, restaurando-o como Central de Sala Vermelha & Emergências com botões imediatos de DVA, SRI, PCR/ACLS, EAP, Choque Séptico e Gasometria; o bypass de permissões permanece isolado exclusivamente em `/breaktheglass`.
        - Expurgadas rotinas burocráticas de auditoria de prontuário em lote do `/kaizen`, mantendo o foco estrito em segurança de prescrição farmacológica (ISMP).
      * ❌ **Salvaguardas e Alertas Sentinela de Condutas Exclusivas de UTI Terciária**:
        - `src/02_mecanica_pulmonar_sdra.js`: em SDRA moderada a grave (P/F < 150), inserido alerta explícito de conduta beira-leito (ventilação mecânica protetora Vt 4-6 mL/kg PBW, Pplat ≤ 30, ΔP ≤ 15) com solicitação imediata de Vaga Zero / Transferência Urgente para UTI/CTI, alertando expressamente que Posição Prona prolongada e Bloqueio Neuromuscular Contínuo (Cisatracúrio) são condutas exclusivas de UTI Terciária contraindicadas em enfermaria geral.
        - `src/02_sedacao_opioides.js`: em sedação profunda (RASS ≤ -3 / -4), inserido alerta sentinela de conduta exclusiva de UTI/CTI com TOT e contraindicação em enfermaria geral.
        - `src/02_auditoria_infusao_uti.js`: inserido alerta sentinela de conduta exclusiva de UTI terciária para choque vasoplégico refratário a altas doses de catecolaminas, advertindo que terapias de resgate terciário (Azul de Metileno, ECMO venoarterial) pertencem estritamente a centros terciários de CTI.
    - **Reforço e Consolidação dos Três Pilares Essenciais**:
      * Porta de Emergência / Sala Vermelha (estabilização inicial, choque séptico/CIRCI, DVA, SRI, PCR, IAM/SCA, AVC, HIC, gasometria e PALS).
      * Enfermaria Clínica Geral (evoluções SBAR, censo de leitos, passagem de plantão, hidratação de manutenção, antimicrobianos, ajuste renal por ClCr, distúrbios hidroeletrolíticos e geriatria AGA).
      * Atenção Primária / UBS (consultas ambulatoriais SOAP, pré-natal de baixo risco, puericultura, rastreio preventivo INCA, HAS/DM e prescrição REMUME).
    - **Suíte de Testes Automatizada Dedicada**:
      * Criado `tests/test_saneamento_escopo_clinico.cjs` validando desvinculação de `/emergencia`, isolamento de `/breaktheglass`, desativação amigável de `/auditar_rbac`, alertas sentinela de UTI em SDRA, Sedação e DVA, e integridade do inventário clínico estruturado. Integrado ao pipeline `npm test` com 100% de sucesso.

58. [x] **Auditoria Médica Integral com Modelo PRO — Calculadoras Clínicas, Doses Pediátricas e Tetos de Segurança**:
    - **Auditoria de Precisão com Modelo PRO**:
      * Submeter todas as calculadoras clínicas e algoritmos posológicos (`src/02_calculadoras_puras.js`, `src/data/guia_pediatrico_pedb.json`, `src/02_pals_pediatria.js`, `src/02_secoes_posologicas.js`) à validação profunda do modelo Gemini PRO.
    - **Foco da Auditoria Farmacológica e Pediátrica**:
      * Tetos de dose máxima de adulto (Safety Ceiling Clamping) em crianças de peso elevado (Amoxicilina, Amoxi-Clav, Azitromicina, Cefalexina, Prednisolona, SMX-TMP, Dipirona, Paracetamol, Ibuprofeno).
      * Regras de volume mínimo seguro e gota mínima em lactentes e neonatos < 5 kg.
      * Bloqueios de faixa etária e contraindicações formais de bula (proibição de antiparasitários em < 2 anos, restrições de anti-histamínicos, etc.).
      * Validação matemática de todas as fórmulas de clearance (Cockcroft-Gault, CKD-EPI, Schwartz pediátrico), déficits hidroeletrolíticos e regra de Parkland.
    - **Formalização em Relatório de Auditoria e Testes**:
      * Emissão de parecer clínico detalhado e criação de testes automatizados determinísticos cobrindo todos os cenários auditados.

59. [x] **Auditoria Médica Integral com Modelo PRO — Emergências Clínicas, Suporte Avançado de Vida (PCR/ACLS) e Drogas Vasoativas**:
    - **Auditoria de Precisão com Modelo PRO**:
      * Auditoria estrita dos algoritmos de atendimento emergencial em `src/02_cardiologia_icc.js`, `src/02_pals_pediatria.js`, `src/02_pneumologia_crise_asmatica.js` e módulos de Sala Vermelha:
        * Parada Cardiorrespiratória (ACLS/PALS): ritmos chocáveis vs não chocáveis, dosagens e intervalos de Adrenalina e Amiodarona/Lidocaína, sequência de choque e causas reversíveis (5Hs e 5Ts).
        * Drogas Vasoativas (Noradrenalina, Vasopressina, Dobutamina, Adrenalina em infusão contínua): diluições padronizadas usuais e concentradas, tabelas de infusão em mcg/kg/min e mL/h, e limites máximos de segurança contra erro posológico letal.
        * Sequência Rápida de Intubação (SRI): doses precisas por peso para pré-medicação, sedação rápida (Etomidato, Quetamina, Propofol) e bloqueio neuromuscular (Succinilcolina com contraindicações de hipercalemia/queimadura vs Rocurônio com dosagem e tempo de latência).
        * Crise Hipertensiva: protocolos seguros para emergência hipertensiva (metas de queda da PAM <= 20-25% na 1ª hora para prevenção de isquemia cerebral) e manejo da urgência hipertensiva ambulatorial sem uso abusivo de anti-hipertensivos sublinguais.
    - **Garantia de Fidelidade às Diretrizes**:
      * Conformidade 100% com diretrizes SBC, AHA e Associação Brasileira de Medicina de Emergência (ABRAMEDE).

60. [x] **Auditoria Médica Integral com Modelo PRO — Antimicrobianos, REMUME, Farmácia Popular e Ajuste Renal/Hepático**:
    - **Auditoria de Precisão com Modelo PRO**:
      * Auditoria rigorosa de todas as bases de dados de antimicrobianos e interações medicamentosas (`src/data/guia_farmaceutico_hsl.json`, `src/02_nefrologia_clearance.js`, `src/data/interacoes.json`):
        * Esquemas empíricos de 1ª linha para infecções prevalentes no Generalista (Pneumonia Comunitária [PAC], Infecção do Trato Urinário [ITU], Celulite/Erisipela, Faringoamigdalite, Otite, Sinusite).
        * Tabelas de ajuste posológico de antimicrobianos por faixas de ClCr (Cockcroft-Gault), destacando fármacos que não necessitam de ajuste (ex.: Ceftriaxona, Azitromicina, Doxiciclina) e os que exigem espaçamento/redução de dose.
        * Validação estrita de itens disponíveis na REMUME e Farmácia Popular do Brasil, assegurando prescrições viáveis para a realidade do SUS.
        * Auditoria do motor de interações medicamentosas graves, verificando alertas para associações potencialmente letais (ex.: prolongamento de intervalo QT, hipercalemia grave, síndrome serotoninérgica).

61. [x] **Auditoria Médica Integral com Modelo PRO — Ginecologia, Pré-Natal de Baixo Risco e Segurança na Gestação/Lactação**:
    - **Auditoria de Precisão com Modelo PRO Concluída**:
      * Módulos auditados: `src/02_obstetricia_prenatal.js`, `src/02_ginecologia_ambulatorial.js` e integração com `src/07_telegram_handlers.js` e `server/runtime.js`.
      * **Datação Gestacional e Concordância FEBRASGO/ACOG**:
        - Regra de Naegele sanitizada e testada para anos bissextos e viradas de mês/ano.
        - Regra de tolerância do 1º USG (CCN <= 8s6d: +-5 dias; 9 a 13s6d: +-7 dias; 14 a 15s6d: +-7 dias; 16 a 21s6d: +-10 dias; 22 a 27s6d: +-14 dias; >= 28s: +-21 dias) com redatação automática e recálculo da DPP definitiva.
      * **Interpretação Determinística de Sorologias e Exames Laboratoriais (`interpretarSorologiasLaboratorioPrenatal`)**:
        - Glicemia de Jejum: < 92 mg/dL (normal, TOTG 75g a 24-28s); 92 a 125 mg/dL (diagnóstico definitivo de DMG no 1º tri, dispensando e contraindicando TOTG 75g; início imediato de MEV e automonitorização); >= 126 mg/dL (Diabetes pré-gestacional / Overt Diabetes, PNAR e insulina).
        - Toxoplasmose: IgG- IgM- (suscetível, profilaxia primária e sorologia trimestral); IgG+ IgM- (imunidade pregressa sem risco fetal); IgG- IgM+ (infecção aguda recente ou falso-positivo, Espiramicina 1g 8/8h e recoleta em 2-3s); IgG+ IgM+ com avidez em <= 16 semanas: avidez >= 60% (afasta infecção recente, infecção pregressa > 3-4 meses) vs avidez < 50% (infecção aguda confirmada, Espiramicina e PNAR para amniocentese com PCR a partir de 18s).
        - Sífilis (VDRL / Teste Rápido): Penicilina G Benzatina 2,4M UI IM em dose única (recente < 1 ano) vs 3 semanas consecutivas (latente tardia / indeterminada), com alerta estrito de intervalo <= 7-9 dias e convocação simultânea da parceria.
        - HIV: Início imediato de TARV (Dolutegravir + Lamivudina + Tenofovir), notificação, carga viral, CD4 e contraindicação absoluta de amamentação com inibição por Cabergolina 1mg dose única e fórmula láctea.
        - Hepatite B (HBsAg): Encaminhamento PNAR para carga viral e prescrição obrigatória no recém-nascido de Vacina contra Hepatite B + Imunoglobulina HBIG 0,5 mL IM nas primeiras 12 horas de vida.
        - Bacteriúria Assintomática (Urocultura >= 10^5 UFC/mL): Tratamento compulsório com Fosfomicina 3g dose única ou Cefalexina 500mg 6/6h por 7 dias para prevenção de pielonefrite aguda e parto prematuro, e urocultura de controle de cura pós-tratamento.
        - Hemoglobina: Hb >= 11 g/dL (normal / sulfato ferroso profilático 40mg Fe/dia a partir de 20s); Hb 8 a 10.9 g/dL (anemia gestacional moderada / dose terapêutica 120-200mg Fe/dia); Hb < 8 g/dL (anemia grave, PNAR / ferro IV).
        - Tipagem Rh e Coombs: Rh- com Coombs- (Anti-D 300 mcg na 28ª semana e periparto); Rh- com Coombs+ (aloimunização instalada, PNAR para Doppler de ACM se título >= 1:16).
      * **Expansão Farmacológica na Gestação (`BANCO_FARMACOS_GESTACAO`)**:
        - Adição de antidiabéticos: Insulinas NPH e Regular (Padrão ouro, Categoria B, seguras); Metformina (Cautela/2ª linha); Glibenclamida (Contraindicada por macrossomia e hipoglicemia neonatal prolongada).
        - Adição de DOACs: Rivaroxabana, Apixabana, Dabigatrana (Contraindicados na gravidez e lactação, substituição mandatória por Enoxaparina).
        - Adição de psicotrópicos: Sertralina (1ª escolha segura, Categoria C); Paroxetina (Contraindicada no 1º tri por defeito septal cardíaco); Clonazepam e Diazepam (Cautela, risco de hipotonia/abstinência neonatal).
        - Adição de tireoide: Levotiroxina (Categoria A, compulsória com elevação empírica de 20-30% da dose na gestação); Propiltiouracil/PTU (1ª escolha no 1º tri para hipertireoidismo); Metimazol (Evitar no 1º tri por aplasia cutis, opção no 2º e 3º tri).
        - Adição de antiepilépticos: Lamotrigina e Levetiracetam (Menor risco de teratogênese); Carbamazepina (Cautela com ácido fólico 5mg/dia).
      * **Critérios Médicos de Elegibilidade para Contracepção da OMS**:
        - Validação de regras para enxaqueca com aura (AHC Cat. 4, DIU Cu Cat. 1, Progestagênio Cat. 2); TVP/TEP (AHC Cat. 4, DIU Cu Cat. 1); HAS grave (AHC Cat. 4, DIU Cu Cat. 1); Tabagismo >= 35a >= 15 cig/dia (AHC Cat. 4, DIU Cu Cat. 1, POP Cat. 1); Câncer de Mama Atual (TODOS os hormonais Cat. 4, DIU Cu Cat. 1).
      * **Suíte de Testes Automatizada Dedicada**:
        - Criado `tests/test_auditoria_pro_ginecologia_prenatal.cjs` com 32 testes determinísticos rigorosos integrados ao pipeline `npm test` com 100% de sucesso.

---

## ✅ Histórico de Melhorias Concluídas
- [x] (2026-10-09) **Integração UI/UX de Dor Torácica, Escore HEART, Duplo Bloqueio Plaquetário (DAPT) e Fallback Offline no Cockpit PWA**:
   - Adicionado painel dedicado `calc-heart` ("Escore HEART & Dor Torácica (SCA)") na aba de calculadoras (`tab-calculadoras`) do Cockpit PWA com seletores estruturados para História clínica, ECG, Idade, Fatores de risco (DAC) e Troponina.
   - Reorganizada a barra de subcalculadoras para grade balanceada (`grid-cols-3 sm:grid-cols-9`) com botão destacado de acesso em 1 toque `🫀 HEART`.
   - Adicionados chips de atalhos em 1 toque para cenários comuns do plantão: 🟢 Baixo Risco (HEART 0), 🟡 Risco Intermediário (HEART 4), 🔴 Alto Risco / SCASST (HEART 10), 🚨 IAM Trombólise e ⚠️ AVC Prévio (Prasugrel Bloq).
   - Adicionado chip de ação rápida "Dor Torácica & HEART" na aba SOAP (`tab-soap`) com redirecionamento em 1 toque e botão de cópia limpa para o prontuário (`btn-copiar-heart`).
   - Implementado motor determinístico de contingência offline (`calcularOfflineLocal` para `heart`/`sca`/`cardiologia`) com execução instantânea (0ms) mesmo sem sinal hospitalar, cobrindo com rigor:
     * Estratificação de risco de MACE em 6 semanas (0.9-1.7% baixo, 12-16.6% intermediário, 50-65% alto).
     * Seleção de DAPT: AAS mastigado 162-300 mg + P2Y12 de escolha (Ticagrelor 180 mg ataque / 90 mg 12/12h vs Clopidogrel vs Prasugrel).
     * Alerta sentinela e bloqueio de Prasugrel em antecedente de AVC/AIT (Ensaio TRITON-TIMI 38).
     * Regra de ouro da trombólise: Clopidogrel mandatório com omissão da dose de ataque em > 75 anos (fazer apenas 75 mg).
     * Interação CYP2C19: alerta grave entre Clopidogrel e Omeprazol recomendando troca imediata por Pantoprazol.
     * Adjuvantes: Enoxaparina com ajuste para ClCr < 30 mL/min e idosos > 75 anos na trombólise, e Atorvastatina 80 mg.
     * Bloqueio fatal de Nitratos em suspeita de Infarto de Ventrículo Direito (IAM-VD) ou uso recente de IPDE-5 (Sildenafil/Tadalafil).
     * Contraindicação formal de Betabloqueadores na fase aguda com sinais de choque, Killip >= II ou congestão pulmonar.
   - Expandido endpoint RPC Fastify `cockpitCalcular` em `src/13_cockpit_integracao.js` com suporte a `heart`, `sca` e `cardiologia` (< 2ms de latência).
   - Validação da suíte de testes `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Gasometria Arterial em 5 Passos (Winter, Ânion Gap Sérico e Corrigido, Razão Delta e Berlim) e Fallback Offline no Cockpit PWA**:
   - Modernizado painel dedicado `calc-gaso` ("Gasometria Arterial · 5 Passos") na aba de calculadoras (`tab-calculadoras`) do Cockpit PWA com atalhos em 1 toque para cenários comuns do plantão: 🟢 Normal, 🔴 CAD / Cetoacidose, 🟡 DPOC Retentor, 🔴 Choque Séptico / SDRA e 🔵 Vômitos / Alcalose.
   - Adicionada seção expansível/opcional "🧪 Ânion Gap, Delta-Delta & Oxigenação" com inputs dedicados para Eletrólitos (Na+, Cl-, Albumina) e Oxigenação (PaO2, FiO2).
   - Implementado motor determinístico de contingência offline (`calcularOfflineLocal` para `gaso`) com execução instantânea (0ms) mesmo sem sinal hospitalar, cobrindo com rigor:
     * Passo 1: pH (Acidemia, Alcalemia, Normal) e Distúrbio Primário (Acidose/Alcalose Metabólica e Respiratória, Mistos).
     * Passo 2: Compensação esperada precisa via Fórmula de Winter (`PaCO2 = 1.5 * HCO3 + 8 ± 2`), Alcalose Metabólica (`PaCO2 = 40 + 0.7 * (HCO3 - 24) ± 2`), e Acidose/Alcalose Respiratória Aguda vs Crônica.
     * Passo 3: Ânion Gap sérico e corrigido por albumina (`AG + 2.5 * [4.0 - Alb]`).
     * Passo 4: Razão Delta (Delta-Delta) para diagnóstico de acidose hiperclorêmica oculta (< 0.4), mista (0.4-0.8), AG elevado pura (0.8-2.0) e alcalose metabólica oculta (> 2.0).
     * Passo 5: Oxigenação (Relação PaO2/FiO2 com Classificação de Berlim 2012 para SDRA).
     * Alertas sentinela de consistência biológica por Henderson-Hasselbalch, acidemia extrema (pH < 6.80) e esgotamento de reserva tampão (HCO3 ≤ 5 mEq/L).
   - Adicionado chip de ação rápida "Gasometria & Winter" na aba SOAP (`tab-soap`) com redirecionamento em 1 toque e auto-seleção visual do botão correspondente.
   - Botão de cópia para o prontuário (`btn-copiar-gaso`) e botão de limpeza rápida (`limparGaso`).
   - Atualizado endpoint RPC `cockpitCalcular` em `src/13_cockpit_integracao.js` e sanitização fisiológica em `src/01_utils.js` para repassar e validar Na, Cl, Albumina e PaO2/FiO2.
   - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.
   - Cobertura expandida com novos testes em `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Distúrbios Hidroeletrolíticos (DHE - Sódio, Potássio e Água Livre), Salvaguardas de Mielinólise Pontina e Fallback Offline no Cockpit PWA**:
   - Adicionado painel dedicado `calc-dhe` ("Distúrbios Hidroeletrolíticos") na aba de calculadoras (`tab-calculadoras`) com seletores rápidos e formulários dirigidos para Hiponatremia (Adrogué-Madias), Hipercalemia (Potássio e Cardioproteção) e Hipernatremia (Déficit de Água Livre).
   - Reorganizada a barra de subcalculadoras para grade balanceada (`grid-cols-4 sm:grid-cols-8`) otimizada para toque em telas móveis sem corte de texto.
   - Adicionados chips de atalhos rápidos de Sódio (110, 118, 125, 130 mEq/L) e Potássio (5.6, 6.5, 7.2, 8.3 mEq/L) com detecção imediata de toxicidade eletrocardiográfica.
   - Implementado motor determinístico de contingência offline (`calcularOfflineLocal` para `dhe`) com execução imediata (0ms) mesmo sem sinal hospitalar, cobrindo Adrogué-Madias com NaCl 3% e SF 0.9%, teto rígido de elevação (8 mEq/24h) contra Síndrome de Desmielinização Osmótica (SDO / Mielinólise Pontina), dosagens escalonadas de Gluconato de Cálcio 10%, Glicoinsulina, Beta-2 inalatório, Furosemida, Sorcal e acionamento de emergência zero para K+ > 8.0 mEq/L.
   - Resolução de contrapressão em `src/11_entrega_confiavel.js`: expansão de `podarPersistenciaAntiga` para podar automaticamente registros de `outbox_` concluídos ('done') e purgar acumulações de testes anteriores.
   - Adicionado chip de ação rápida "DHE & Eletrólitos" na aba SOAP (`tab-soap`) com redirecionamento em 1 toque e botão de cópia limpa para o prontuário (`btn-copiar-dhe`).
   - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.
   - Cobertura expandida em `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Antimicrobianos, Ajuste Renal por ClCr e Cross-Check Farmacológico Offline no Cockpit PWA**:
   - Adicionado painel dedicado `calc-atb` ("Ajuste Renal de Antimicrobianos") na aba de calculadoras (`tab-calculadoras`) com seletores rápidos de fármacos de alta relevância hospitalar: Meropenem, Vancomicina, Piperacilina + Tazobactam, Cefepime, Ceftriaxona, Ciprofloxacino, Polimixina B e Fluconazol.
   - Adicionados chips de atalhos rápidos de função renal (ClCr > 50, ClCr 30-50, ClCr 15-29, ClCr < 15 e Hemodiálise), além de botão inteligente "Usar ClCr calculado" que migra instantaneamente o valor de Cockcroft-Gault para o ajuste antimicrobiano.
   - Adicionados kits de prescrição empírica em 1 toque por foco clínico do Generalista no card de Prescrição Rápida / REMUME (`tab-remume`): PAC (Amoxicilina + Clavulanato), ITU Baixa (Fosfomicina), Pielonefrite (Ceftriaxona / Ciprofloxacino), Pele / Celulite (Cefalexina / Oxacilina) e Faringoamigdalite (Penicilina G Benzatina).
   - Implementado motor determinístico de contingência offline (`calcularOfflineLocal` para `ajuste_atb`) com execução imediata (0ms) mesmo sem sinal hospitalar, cobrindo regras clínicas de neurotoxicidade por Cefepime, dose por vale de Vancomicina e manutenção sem necessidade de redução em Ceftriaxona.
   - Implementado motor offline local `executarCrossCheckOfflineLocal` e integrado como fallback automático no `executarCrossCheckCockpit`, garantindo detecção imediata de interações letais (Amiodarona + Fluconazol QTc, Clopidogrel + Omeprazol CYP2C19, IECA + Espironolactona K+, Ceftriaxona + Cálcio no Y-site) mesmo sem conexão com a nuvem, atualizando a base em RAM para 285 regras de segurança.
   - Adicionado chip de ação rápida "Ajuste ATB" na aba SOAP (`tab-soap`) com redirecionamento em 1 toque e botão de cópia limpa com 1 clique para o PEP (`btn-copiar-atb`).
   - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.
   - Cobertura expandida em `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Atenção Primária & UBS no Cockpit PWA (SOAP Ambulatorial Ágil, Atestados CFM e Fallback Offline Determinístico)**:
   - Adicionados chips de atalhos de preenchimento rápido em 1 toque no modal de SOAP Ambulatorial (`modal-ambulatorio-soap`): HAS Rotina, DM2 Rotina, Tosse / Gripe (IVAS), Lombalgia Mecânica e Dispepsia / DRGE com seleção automática do modelo de exame físico dirigido e sinais vitais.
   - Adicionados chips rápidos de seleção de dias (1d, 2d, 3d, 5d, 7d, 14d) e CIDs frequentes (IVAS J06.9, GECA A09, Lombalgia M54.5, Dengue A90, Cefaleia G44.2, Gripe B34.2) no modal de Atestado CFM (`modal-atestado-cfm`).
   - Implementado motor determinístico offline de contingência (`gerarSOAPAmbulatorialOfflineLocal` e `gerarAtestadoOfflineLocal`) garantindo emissão imediata (0ms) de prontuário SOAP completo e Atestado Médico legal mesmo sem sinal hospitalar ou sob falha de rede.
   - Incorporação de regras clínicas oficiais: classificação pressórica da SBC 2024 / DBH, avaliação glicêmica da SBD 2024-2025, exames dirigidos (monofilamento 10g e pulsos nos pés em DM2, ausculta de carótidas e ausência de B3/B4 em HAS, Lasègue em lombalgia) e conformidade estrita com as Resoluções CFM 1.658/2002 e 1.851/2008 (dias por extenso para blindagem antifraude e respeito ao sigilo do CID-10).
   - Otimização do seletor `abrirSubCalc` com auto-seleção e destaque visual imediato do botão ativo mesmo em redirecionamentos rápidos por chips da aba SOAP.
   - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.
   - Expansão da suíte de testes `tests/test_cockpit_offline_indexeddb.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Emergência & Sala Vermelha no Cockpit PWA (DVA Avançada, SRI Neuro e Cópia com 1 Toque para PEP)**:
   - Expansão dos seletores e calculadoras de DVA em `tab-calculadoras` do Cockpit PWA: adição de Adrenalina/Epinefrina (16 mcg/mL - Choque Séptico refratário e Anafilaxia), Nitroglicerina/Tridil (200 mcg/mL - EAP e SCA) e Nitroprussiato de Sódio/Nipride (200 mcg/mL - Emergência Hipertensiva).
   - Expansão da SRI (Sequência Rápida de Intubação): adição do cenário Neurointensivismo / TCE / HIC (Fentanil 3 mcg/kg + Etomidato 0,3 mg/kg + Rocurônio 1,2 mg/kg com metas de PAM e PAS > 100-110 mmHg para garantir PPC = PAM - PIC).
   - Adicionados botões de cópia com 1 clique para prontuário (PEP) com feedback tátil em DVA (`btn-copiar-dva`), SRI (`btn-copiar-sri`), Clearance Cockcroft-Gault (`btn-copiar-crcl`) e Gasometria Arterial (`btn-copiar-gaso`).
   - Adicionados chips de ação rápida `🚨 DVA & Choque` e `🛡️ Intubação (SRI)` na aba SOAP (`tab-soap`) com redirecionamento imediato em 1 toque.
   - Expandido o motor determinístico offline de contingência (`calcularOfflineLocal`) e o endpoint RPC Fastify `cockpitCalcular` em `src/13_cockpit_integracao.js` com execução instantânea (0ms) mesmo sem sinal hospitalar.
   - Sincronização automatizada para GitHub Pages via `gh_cockpit_deploy/index.html`.
   - Validação da suíte de testes `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Integração UI/UX de Pediatria no Cockpit PWA (Holliday-Segar, PALS e Posologia Offline)**:
   - Adicionado botão e painel dedicado `calc-pediatria` na aba `Emergência & Cálculos` (`tab-calculadoras`) do Cockpit PWA com seletores ágeis para Holliday-Segar (regra 4-2-1, TIG SG 5% e eletrólitos SBP), PALS (Adrenalina, Amiodarona, Choque 2-4 J/kg, Tubo ET e Fixação) e Doses de Bolso/Sintomáticos (Dipirona, Paracetamol, Ibuprofeno e Amoxicilina com tetos seguros de adulto).
   - Adicionado chip de ação rápida `Pediatria & PALS` na aba SOAP (`tab-soap`) com redirecionamento em 1 toque.
   - Implementado motor determinístico de contingência offline (`calcularOfflineLocal`) com execução instantânea (0ms) mesmo sem rede hospitalar.
   - Expandido endpoint RPC `cockpitCalcular` em `src/13_cockpit_integracao.js` com suporte unificado aos modos `holliday`, `pals` e `posologia` com latência < 2ms.
   - Botão de cópia limpa com 1 toque para o Prontuário (PEP).
   - Validação automatizada na suíte `tests/test_cockpit_offline_indexeddb.cjs` e `tests/test_server_render.cjs` com 100% de sucesso no pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Auditoria Médica Integral com Modelo PRO — Ginecologia, Pré-Natal de Baixo Risco e Segurança na Gestação/Lactação**:
   - Criação da suíte `tests/test_auditoria_pro_ginecologia_prenatal.cjs` com 32 testes determinísticos validando Naegele, concordância FEBRASGO/ACOG, exames de rotina, sorologias, farmacologia gestacional e elegibilidade da OMS.
   - Implementação de `interpretarSorologiasLaboratorioPrenatal` em `src/02_obstetricia_prenatal.js`, expondo parecer semafórico escaneável beira-leito para o médico generalista.
   - Expansão da base `BANCO_FARMACOS_GESTACAO` com insulinas, metformina, DOACs, sertralina, paroxetina, levotiroxina, PTU e antiepilépticos.
   - Integração Fastify RPC com o novo método `cockpitInterpretarSorologiasPrenatal` e parser laboratorial no bot Telegram (`/prenatal`).
   - Integração UI/UX completa no Cockpit PWA (`cockpit_movel.html` e `gh_cockpit_deploy/index.html`) com a nova aba `🔬 Sorologias & Exames` no modal de Pré-Natal, painel de resultados semafórico (Normal, Atenção, Crítico), botão de cópia com 1 clique para o PEP e motor determinístico offline de contingência (`interpretarSorologiasOfflineLocal`).
   - Validação automatizada na suíte `tests/test_cockpit_offline_indexeddb.cjs` e 100% de aprovação em todos os testes do pipeline contínuo (`npm test`).
- [x] (2026-10-09) **Saneamento do Escopo Clínico, Inventário Geral e Expurgo de Funções Terciárias/Administrativas**:
   - Criação do documento canônico `docs/INVENTARIO_CLINICO_GERAL.md` mapeando todos os 256 comandos Telegram tratados, o catálogo canônico de 97 comandos do `/ajuda`, 133 rotas Fastify RPC e 59 submódulos clínicos determinísticos (`src/02_*.js` e `src/03_*.js`).
   - Consolidação dos três pilares fundamentais do médico generalista e interno: Porta de Emergência / Sala Vermelha, Enfermaria Clínica Geral e Atenção Primária / UBS.
   - Desativação dos comandos burocráticos `/auditar_rbac` e `/relatorio_rbac` com resposta amigável orientando o uso de `/perfil`.
   - Desvinculação definitiva do comando `/emergencia` do protocolo break-the-glass do RBAC, restaurando-o como Central de Sala Vermelha com atalhos e botões rápidos para DVA, SRI, PCR, EAP, Choque Séptico e Gasometria; o bypass administrativo permanece isolado em `/breaktheglass`.
   - Expurgo de rotinas de auditoria em lote do `/kaizen`, mantendo o foco exclusivo em segurança de prescrição farmacológica (ISMP).
   - Inserção de salvaguardas e alertas sentinela de condutas exclusivas de UTI Terciária com solicitação obrigatória de Vaga Zero / CTI:
     * SDRA moderada a grave (P/F < 150): ventilação mecânica protetora beira-leito (Vt 4-6 mL/kg PBW, Pplat ≤ 30, ΔP ≤ 15) e alerta formal de que Pronação prolongada e Bloqueio Neuromuscular Contínuo (Cisatracúrio) são condutas exclusivas de UTI Terciária contraindicadas em enfermaria geral.
     * Sedação Profunda (RASS ≤ -3 / -4): alerta sentinela de que sedação profunda com bloqueador neuromuscular é restrita a ambiente de UTI/CTI com via aérea protegida.
     * DVA / Infusões: alerta de vasoplegia refratária para choque refratário a altas doses, esclarecendo que terapias de resgate terciário (Azul de Metileno, ECMO venoarterial) pertencem estritamente a centros terciários de terapia intensiva.
   - Criação da suíte dedicada `tests/test_saneamento_escopo_clinico.cjs` integrada ao pipeline `npm test` com 100% de sucesso.

- [x] (2026-10-09) **Saneamento e Redução Estrita de Comandos Slash para Médico Generalista**:
   - Expurgo de 37 comandos redundantes, terciários ou de especialista, reduzindo o catálogo de 134 para 97 comandos canônicos essenciais:
     * **Cat 1 (Núcleo)**: Removidos `/start` e `/cockpit` (redundantes com botões do teclado) e `/fila` e `/pedido` (sem utilidade para a prática clínica).
     * **Cat 3 (Emergência)**: Removidos `/transfusao` e `/neutropenia` (condutas terciárias/especialidade).
     * **Cat 6 (Obstetrícia)**: Removidos `/colestase`, `/swansea`, `/rcf` e `/saf` (medicina fetal/alto risco).
     * **Cat 7 (Ginecologia)**: Removido `/hiperprolactinemia`.
     * **Cat 8 (Geriatria)**: Removidos `/minicog` e `/tug`.
     * **Cat 10 (Metabolismo)**: Removidos `/mentzer`, `/cad` (protocolo já disponível na emergência), `/nutricao`, `/refeeding`, `/npt` e `/nrs`.
     * **Cat 12 (Dermatologia)**: Removidos `/sifilis` e `/herpes` (específicos demais para comando dedicado).
     * **Cat 14 (Exame Físico)**: Removidos todos os 11 comandos individuais `/ef_*`. Centralização exclusiva no comando `/ef`, que abre menu interativo com botões inline para todas as 11 especialidades.
     * **Cat 16 (Rotina)**: Removido `/bio` (acessível diretamente pelo Cockpit).
     * **Cat 17 (Governança)**: Removidos `/evidencia`, `/perfil`, `/emergencia` e `/auditar_rbac`.
   - Reconstrução do bundle de produção `ultra_rotina_master.js` com validação de sintaxe 100% aprovada.
   - Atualização e aprovação com 100% de sucesso da suíte de testes de comandos slash (`tests/test_ajuda_comandos_slash.cjs`) e de todos os testes do repositório (`npm test`).

- [x] (2026-10-09) **Módulo de Obstetrícia & Medicina Fetal: RCF / CIUR e Doppler Obstétrico (Barcelona/ISUOG)**:
   - Motor determinístico beira-leito completo para classificação Delphi (RCF precoce/tardia/PIG), interpretação dopplervelocimétrica (AU, ACM, RCP, uterinas, istmo, DV), estadiamento Barcelona (I-IV) com limiares TRUFFLE, conduta por estágio com IG-alvo de parto, corticoide/neuroproteção e investigação etiológica.
   - Bloqueios de segurança: sildenafila contraindicada (STRIDER), AAS/heparina sem evidência para RCF, proteção contra falso positivo no parser de texto livre.
   - Integrado via Fastify RPC (`cockpitObstetriciaRcf`) e Telegram (`/rcf`, `/ciur`, `/doppler`, `/crescimentofetal`).
   - 25 testes unitários + 2 testes de integração do servidor — 100% aprovados.
   - Kaizen perpétuo: Backlog abastecido com as novas metas 123, 124 e 125.

- [x] **Módulo de Cardiologia Intensiva (Choque Cardiogênico e IC Descompensada)** (2026-10-09):
  * Estratificação Hemodinâmica beira-leito pela classificação de Forrester & Stevenson.
  * Algoritmo determinístico de manejo farmacológico combinado de inotrópicos, vasopressores, diuréticos e vasodilatadores.
  * Bloqueios de segurança críticos: suspensão de betabloqueadores e otimização de diuréticos.
  * Comandos de ativação no Telegram via `/choque`, `/forrester` ou `/ic`.

- [x] (2026-10-09) **Módulo de Hematologia: Manejo e Investigação de Anemias**:
   - Motor determinístico beira-leito para análise completa do hemograma (`src/02_hematologia_anemias.js`).
   - Classificação morfológica precisa por VCM (< 80 microcítica, 80-100 normocítica, > 100 macrocítica), HCM/CHCM (hipocrômica, normocrômica, hipercrômica) e RDW (homogênea vs heterogênea/anisocitose).
   - Diagnóstico diferencial de microcitose com cálculo automático do Índice de Mentzer (VCM/Hemácias: < 13 sugerindo Traço Talassêmico vs >= 13 Anemia Ferropriva) e Índice de Green & King.
   - Avaliação da cinética eritropoietica e resposta medular pelo Índice de Produção Reticulocitária (IPR) com shift factor proporcional ao hematócrito (diferenciação entre anemias hiperproliferativas/regenerativas vs hipoproliferativas/arregenerativas).
   - Integração diagnóstica com marcadores bioquímicos (Ferritina, Saturação de Transferrina, Vitamina B12, Ácido Fólico, LDH, Bilirrubinas e Coombs direto).
   - Calculadora de reposição de ferro oral (VO): posologia para adultos de 60 a 100 mg/dia ou em dias alternados com teto seguro de 200 mg/dia (prevenção de bloqueio por hepcidina e intolerância gastrointestinal); posologia pediátrica ponderada de 3 a 5 mg/kg/dia com teto de 60 mg/dia.
   - Critérios formais de indicação e Fórmula de Ganzoni para Ferro Endovenoso (Sacarato de Óxido de Ferro III / Noripurum IV): cálculo do déficit total em mg, ampolas de 100 mg necessárias, limite de 200 mg por sessão em SF 0.9% e bloqueio absoluto de segurança no 1º trimestre gestacional.
   - Gatilhos transfusionais beira-leito restritivos (Hb < 7.0 g/dL geral estável; Hb < 8.0 g/dL para cardiopatia isquêmica aguda; alerta vermelho para Hb < 6.0 g/dL).
   - Integração completa via Fastify RPC (`cockpitHematologiaAnemias` e alias `cockpitManejoAnemias` / `cockpitAnemia`) e comandos Telegram (`/anemia`, `/hemograma`, `/ferro`, `/ganzoni`, `/mentzer`).
   - Cobertura de testes automatizados com 100% de sucesso em `tests/test_hematologia_anemias.cjs`, runner Python `tests/test_hematologia_anemias.py` e validação ponta a ponta no servidor Render (`tests/test_server_render.cjs`).
   - Kaizen perpétuo: Backlog abastecido com as novas metas 111, 112 e 113.
- [x] (2026-10-09) **Módulo de Suporte Nutricional em Pediatria (Fórmula Infantil / Terapia Nutricional)**:
   - Motor determinístico beira-leito para hidratação venosa pediátrica e manutenção por Holliday-Segar (`src/02_suporte_nutricional_pediatrico.js`).
   - Cálculo preciso de volume basal (100-50-20 mL/kg/dia) e vazão horária em bomba de infusão (regra 4-2-1).
   - Ajustes clínicos por patologia: restrição hídrica para bronquiolite viral aguda (70%), restrição cardiovascular para cardiopatia congênita/IC (60%), restrição severa para SIADH/oligúria (50%), reposição de déficit/desidratação (125%) e compensação de perdas insensíveis por febre (+12% por °C acima de 37.8°C).
   - Prescrição eletrolítica de manutenção atualizada segundo SBP e AAP (2,5 mEq Na+/100 mL e 2,0 mEq K+/100 mL), com alertas rígidos para soluções isotônicas/balanceadas (prevenção de hiponatremia hospitalar aguda induzida por ADH) e infusão de potássio restrita a diurese confirmada.
   - Avaliação da Taxa de Infusão de Glicose (TIG) com SG 5% e SG 10% (alvo fisiológico de 4 a 6 mg/kg/min).
   - Calculadora determinística de fórmulas infantis respeitando a Regra de Ouro Inflexível de 1 medida rasa para cada 30 mL de água potável morna.
   - Bloqueio de fracionamento de medidas (meia colher) com orientação de preparo de múltiplos de 30 mL e descarte do excesso para evitar hipo ou hiperconcentração osmolar.
   - Alerta de capacidade gástrica fisiológica do lactente (~30 mL/kg) para prevenção de regurgitação e broncoaspiração.
   - Cobertura de fórmulas especiais (Partida, Seguimento, Prematuros/PIG, Anti-Regurgitação, Sem Lactose, Hidrolisada Extensa para APLV, Aminoácidos Livres elementares e Soja).
   - Contraindicação formal de fórmula de soja para menores de 6 meses (fitoestrógenos/alergenicidade).
   - Diretrizes de preparo seguro da OMS/SBP para prevenção de contaminação por *Cronobacter sakazakii* e *Salmonella* (água a 70°C).
   - Integração completa via Fastify RPC (`cockpitSuporteNutricionalPediatrico` / `cockpitNutricaoPediatrica`), comandos Telegram (`/nutriped`, `/holliday`, `/formulainfantil`, `/diluicao`) com parser determinístico e tolerância clínica.
   - Suíte de 8 testes automatizados em `tests/test_suporte_nutricional_pediatrico.cjs` e validação ponta a ponta em `tests/test_server_render.cjs` aprovados com 100% de sucesso.
   - Kaizen perpétuo: Backlog abastecido com as metas 108, 109 e 110.
- [x] (2026-10-09) **Inteligência Gasométrica e Distúrbios Ácido-Base (Regra dos 5 Passos)**:
   - Motor determinístico beira-leito para interpretação ácido-base em 5 passos clínicos (`src/02_gasometria_acido_base.js`).
   - Passo 1: Distúrbio primário e estratificação de gravidade clínica (leve a crítica por faixas de pH).
   - Passo 2: Compensação esperada precisa via Fórmula de Winter (PaCO2 = 1,5 × HCO3 + 8 ± 2) e equações para alcalose metabólica e acidoses/alcaloses respiratórias agudas vs crônicas.
   - Passo 3: Ânion Gap sérico com correção automática estrita por hipoalbuminemia (AG + 2,5 × [4,0 - Alb]).
   - Passo 4: Razão Delta (Delta-Delta) para diagnóstico diferencial de acidoses ocultas e estratificação em hiperclorêmica pura (< 0,4), mista (0,4-0,8), AG elevado pura (0,8-2,0) e alcalose metabólica oculta (> 2,0 ou HCO3 >= 24).
   - Passo 5: Oxigenação com Relação PaO2/FiO2 (Classificação de Berlim 2012 para SDRA) e Gradiente Alvéolo-Arterial (A-a) com PAO2 alveolar ajustada por altitude e limite de normalidade ajustado por idade.
   - Detecção inteligente de distúrbios triplos (ex: CAD + vômitos + DPOC com acidose respiratória).
   - Verificação de consistência biológica por Henderson-Hasselbalch para flag de erro de digitação ou amostra venosa.
   - Alertas críticos beira-leito de hiperlactatemia (> 4 mmol/L) e contraindicação de NaHCO3 antes de correção de hipocalemia severa (K < 3,0 mEq/L).
   - Integração total via Fastify RPC (`cockpitGasometriaAcidoBase` e alias `cockpitGasometria`) e comandos Telegram (`/gaso`, `/gasometria`, `/winter`, `/aniongap`) com parser determinístico e tolerância a dados posicionais.
   - Suíte de 13 testes automatizados determinísticos rigorosos em `tests/test_gasometria_acido_base.cjs` aprovados com 100% de sucesso.
   - Kaizen perpétuo: Backlog abastecido com 3 novas metas clínicas prioritárias (102, 103 e 104).
- [x] (2026-10-09) **Módulo de Cardiologia de Emergência (Dor Torácica, IAM e Duplo Bloqueio DAPT)**:
   - Estratificação robusta pelo Escore HEART (0-10 pts), TIMI SCASST (0-7 pts) e TIMI IAMCSST (0-14 pts).
   - Motor determinístico de DAPT com bloqueio fatal absoluto de Prasugrel em antecedente de AVC/AIT (Ensaio TRITON-TIMI 38).
   - Protocolo de reperfusão química por Trombólise com Clopidogrel mandatório e omissão obrigatória da dose de ataque em pacientes > 75 anos.
   - Detecção em tempo real de interação farmacocinética grave CYP2C19 entre Clopidogrel e Omeprazol, com recomendação de substituição por Pantoprazol.
   - Bloqueio fatal de nitratos em Infarto de Ventrículo Direito (IAM-VD) e uso recente de IPDE-5 (Sildenafil 24h / Tadalafil 48h).
   - Contraindicação formal de betabloqueadores em choque cardiogênico e congestão pulmonar aguda (Killip >= II), e ajuste renal de Enoxaparina em ClCr < 30 mL/min.
   - Integração completa via Fastify RPC (`cockpitCardiologiaEmergencia`) e bot Telegram (`/sca`, `/iam`, `/heart`, `/dapt`) com parser clínico determinístico.
   - Suíte de 12 testes determinísticos rigorosos aprovados com 100% de sucesso (`test_cardiologia_emergencia.cjs`).
   - Kaizen perpétuo: Backlog abastecido com 3 novas metas clínicas prioritárias (96, 97 e 98).
- [x] (2026-10-09) **Gastroenterologia - Pancreatite Aguda e Manejo da Hidratação (Critérios de Atlanta / BISAP)**:
   - Calculadora determinística beira-leito dos escores de gravidade (BISAP).
   - Protocolo de ressuscitação volêmica dirigida por metas (Ringer Lactato) com alertas para doença cardiovascular e renal.
   - Algoritmo de rejeição de NPO prolongado com incentivo a dieta oral precoce ou sonda nasojejunal.
   - Integração completa via Fastify RPC e bot Telegram (/pancreatite, /bisap).
   - Cobertura de testes automatizados validados com sucesso.
- [x] (2026-10-09) **Infectologia - Manejo de Neutropenia Febril Oncológica (Escore MASCC)**:
   - Motor determinístico de estratificação de risco (MASCC).
   - Protocolo de antibioticoterapia IV (Cefepime / Tazocin) com indicações precisas de Vancomicina (instabilidade, cateter, MRSA) e antifúngicos em febre refratária.
   - Integração via RPC e comandos Telegram (`/neutropenia`, `/mascc`).
- [x] (2026-10-09) **Integração de Calculadora de Clearance de Creatinina (Cockcroft-Gault) com Auditoria Automática de Prescrições**:
   - Motor determinístico robusto (`NefrologiaClearanceService`) para estimativa de TFG beira-leito.
   - Algoritmo de auditoria automática que intercepta drogas contraindicadas (nitrofurantoína, espironolactona, metformina) e exige ajuste de dose obrigatório para drogas críticas (vancomicina, enoxaparina, meropenem) quando TFG < 30 mL/min.
   - Classificação instantânea do estágio renal (G1 a G5).
   - Integração Fastify RPC completa via `cockpitNefrologiaClearance` e bot Telegram (comandos `/crcl` e `/clearance`).
   - Cobertura de testes (`test_nefrologia_clearance.cjs`) validando os cálculos para homens e mulheres, bem como os bloqueios de segurança.
- [x] (2026-10-09) **Módulo Avançado de Transfusão Sanguínea (Protocolo de Transfusão Maciça e Gatilhos)**:
   - Motor determinístico de alta performance beira-leito (`TransfusaoSanguineaService`) alinhado às diretrizes do Ministério da Saúde (Portaria de Consolidação 5/2017), ABHH, AABB 2023, e aos trials seminais TRICC, TRISS, FOCUS, REALITY, PROPPR, CRASH-2 e WOMAN.
   - Gatilhos transfusionais de Concentrado de Hemácias (CHAD): Estratégia restritiva rigorosa para pacientes clínicos e sépticos estáveis (gatilho Hb < 7,0 g/dL, alvo 7,0-9,0 g/dL) e estratégia liberal modificada para Síndrome Coronariana Aguda/IAM e neurocríticos (gatilho Hb < 8,0 g/dL, alvo 8,0-10,0 g/dL). Bloqueio e alerta de transfusão desnecessária com Hb >= 7,0 g/dL.
   - Doutrina Patient Blood Management (PBM): Cálculo ponderado de bolsas (1 bolsa = +1 g/dL em 70 kg) com recomendação de "1 bolsa por vez e reavaliação laboratorial em 1-2h" e alerta precoce de prevenção de TACO (infusão lenta em 3-4h e diurético preventivo).
   - Protocolo de Transfusão Maciça (PTM 1:1:1): Escore ABC (Assessment of Blood Consumption - sensibilidade 85%) e Índice de Choque (>= 1.4 catastrófico). Pacotes balanceados com 4 CHAD, 4 PFC, 1 pool de plaquetas por aférese, reposição precoce de Ácido Tranexâmico (1g ataque + 1g em 8h na janela crítica de 3h do sangramento) e 2º pacote com Crioprecipitado e Gluconato de Cálcio 10% (prevenção de hipocalcemia induzida pelo citrato).
   - Regra sentinela de tipagem emergencial: CHAD O negativo mandatório em mulheres em idade fértil (<= 50 anos) para proteção materno-fetal contra aloimunização anti-D; liberação de O positivo para homens e idosas preservando estoques críticos.
   - Reposição de hemocomponentes específicos: Plasma Fresco Congelado ponderado (10-15 mL/kg) para RNI > 1.5 com sangramento; Concentrado de Plaquetas escalonado (10k, 20k, 50k, 100k) com bloqueio sentinela absoluto de plaquetas em suspeita de PTT e HIT (risco de trombose catastrófica); Crioprecipitado direcionado para hipofibrinogenemia severa (< 150-200 mg/dL).
   - Escore ISTH completo para Coagulação Intravascular Disseminada (CIVD Manifesta / Overt DIC) com estratificação em 8 pontos e pacote hemostático associado ao combate da causa-base.
   - Diagnóstico diferencial e conduta de emergência em Reações Transfusionais Agudas (Hemólise Aguda ABO, TACO, TRALI, Anafilaxia, RFNH, Sepse bacteriana).
   - Integração completa com Fastify RPC (`cockpitTransfusaoSanguinea`), bot do Telegram (`/transfusao`, `/hemoterapia`, `/ptm`, `/chad`) e suíte de 16 testes determinísticos automatizados aprovados com 100% de sucesso.
- [x] (2026-10-09) **Ferramenta de Auditoria Analítica (Dashboard de Kaizen Clínico)**:
   - Motor determinístico off-line (`AuditoriaKaizenClinicoService`) de alta performance (< 10ms) para auditoria beira-leito e processamento em lote (batch) de prescrições hospitalares.
   - Classificação padronizada de desfechos: Bloqueio Fatal (Evento Sentinela), Rejeitada por Interação Grave/Contraindicada, Intervenção Farmacêutica por Omissão de Ajuste Renal, Retenção RBAC e Liberação Segura.
   - Cálculo determinístico do Índice de Maturidade de Segurança do Paciente (0 a 100) com penalidades escalonadas e níveis de excelência a alerta vermelho.
   - Identificação em tempo real dos Top Fármacos Incidentes e Top Interações Recorrentes com distribuição por setor hospitalar (UTI, Emergência, Enfermaria, Ambulatório).
   - Formulação automática de Plano de Ação Kaizen e Intervenções Prioritárias direcionadas para Farmácia Central, Prescrição Eletrônica e Preceptoria.
   - Renderização de Dashboard em gráficos ASCII para terminais/Telegram e integração completa com RPC Fastify (`cockpitAuditoriaKaizen`) e bot do Telegram (`/kaizen`, `/audit`).
   - 12 testes determinísticos automatizados aprovados com 100% de sucesso.
- [x] (2026-10-09) **Manejo de Via Aérea Difícil (Algoritmo ASA / DAS / LEMON / RSI / CICO)**:
   - Predição determinística de via aérea difícil com escore LEMON (Look, Evaluate 3-3-2, Mallampati, Obstruction, Neck mobility) e escore MOANS para ventilação difícil sob máscara facial.
   - Motor de cálculo para Sequência Rápida de Intubação (RSI - 7 Ps) com dosagem ponderada de Hipnóticos (Etomidato, Cetamina, Propofol, Midazolam) e Bloqueadores Neuromusculares (Succinilcolina vs Rocurônio).
   - Bloqueio sentinela absoluto de Succinilcolina em situações de hipercalemia, queimaduras > 24h, esmagamento/rabdomiólise > 24h, denervação crônica e histórico de hipertermia maligna.
   - Detecção precoce de Choque Peri-intubação (Índice de Choque >= 0.8) com alerta para ressuscitação prévia mandatória (cristaloides e vasopressor push-dose).
   - Dose de resgate com Sugamadex 16 mg/kg para reversão de emergência de Rocurônio.
   - Algoritmo escalonado ASA / DAS: Plano A (Laringoscopia otimizada com Videolaringoscopia, Bougie e manobra BURP - máx 3 tentativas), Plano B (Dispositivo Supraglótico de 2ª geração com canal gástrico e dimensionamento por peso), e Plano D / eFONA (Cenário crítico CICO: Cricotireoidostomia Cirúrgica Scalpel-Bougie-Tube com tubo 6.0 mm com cuff).
   - Integração completa via malha Fastify RPC (`cockpitViaAereaDificil`) e suíte de 13 testes determinísticos validada com 100% de sucesso.
- [x] (2026-10-09) **Módulo Avançado de Analgesia Controlada pelo Paciente (PCA)**:
   - Motor determinístico para cálculos de bolus, dose basal, intervalo de bloqueio (lockout) e limite de 4 horas para Morfina e Fentanil em bombas de PCA.
   - Algoritmo de segurança para pacientes opioid-naive, bloqueando infusões contínuas basais para evitar depressão respiratória.
   - Ajustes e limiares estritos para pacientes idosos (>= 65 anos) com menores doses de resgate e maiores intervalos de bloqueio.
   - Integração completa via malha Fastify RPC (`cockpitAnalgesiaPca`).
   - Suíte de testes determinística `tests/test_analgesia_pca.cjs` com 100% de sucesso.
- [x] (2026-10-09) **Módulo Avançado de Hepatologia Clínica e HDA**:
   - Implementação de motor determinístico beira-leito para o escore de Child-Pugh, estratificando risco cirúrgico e predizendo sobrevida em 1 e 2 anos com rigor nas classes A, B e C, alertando proativamente a necessidade de ajuste posológico.
   - Cálculo automático do MELD original (UNOS) e da nova fórmula MELD-Na otimizada, identificando limites mínimos (1.0) rigorosos para Bilirrubina e INR.
   - Algoritmo ágil de emergência para HDA Varicosa instável: indicação mandatória imediata de Droga Vasoativa (Terlipressina 2mg 4/4h, ajustável por peso, ou Octreotide se contraindicado), supressão ácida (IBP bolus e contínuo) e antibiótico profilático salvador de vidas para PBE (Ceftriaxona).
   - Testes rigorosos em `test_hepatologia_hda.cjs` e runner python validando 100% de sucesso nas equações matemáticas logarítmicas e condicionais da diretriz AASLD/EASL.
- [x] (2026-10-09) **Painel Inteligente de Intoxicações Exógenas (Toxicologia de Emergência)**:
   - Protocolos determinísticos para intoxicação aguda por Paracetamol com cálculo do Nomograma de Rumack-Matthew e prescrição detalhada de N-acetilcisteína IV/VO.
   - Manejo guiado beira-leito para intoxicações por Antidepressivos Tricíclicos (TCA) com avaliação de risco (QRS) e Bicarbonato de Sódio.
   - Reversão de Cardiotóxicos (Beta-bloqueadores e Bloqueadores de Canal de Cálcio) com Cálcio, Glucagon e Terapia HIET para choque refratário.
   - Protocolo escalonado de Naloxona para Opioides baseado em status ventilatório.
   - Integração completa via malha Fastify RPC (`cockpitToxicologiaEmergencia`) e bot do Telegram (`/intox`).
   - Suíte determinística em `test_toxicologia_emergencia.cjs` e runner python aprovada com 100% de sucesso.

- [x] (2026-10-09) **Neurologia de Emergência e Manejo de AVC Isquêmico Agudo**:
   - Checklist inteligente de elegibilidade e contraindicações para trombólise IV na janela 4.5h, com exclusões ECASS III.
   - Protocolo restritivo de controle de PA pré e pós-trombólise (Labetalol, Nitroprussiato).
   - Cálculo posológico de Manitol 20% e Salina Hipertônica 3%/20% para HIC com tetos osmolares.
   - Integração completa via malha Fastify RPC (`cockpitNeurologiaAvc`).
   - Suíte de testes determinística validada com 100% de sucesso.

- [x] (2026-10-09) **Suporte Avançado de Vida Pediátrico (PALS)**:
   - Motor determinístico de cálculo de medicações de emergência pediátrica (Adrenalina, Amiodarona, Lidocaína) em PCR guiado pelo peso, com estimativa linear por idade em caso de peso não informado.
   - Algoritmo de cálculo de choque (2 a 4 J/kg) para desfibrilação e cardioversão (0.5 a 2 J/kg).
   - Fórmulas para seleção do calibre de tubo endotraqueal (com e sem cuff), tamanho da lâmina do laringoscópio e profundidade da fixação.
   - Adicionada suíte de testes determinística 100% aprovada e integração completa via malha RPC (`cockpitPalsPediatria`).

- [x] (2026-10-09) **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**:
   - Calculadora determinística de dose de insulina basal e bolus prandial para uso ambulatorial (regras 1800/500).
   - Protocolo automatizado e estruturado de correção de hiperglicemia hospitalar para enfermarias (alvos SBD/ADA).
   - Manejo guiado de Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH) com reposição de fluidos, potássio, insulina IV e bicarbonato restritivo.
   - Integração completa via malha Fastify RPC (`cockpitEndocrinologiaDiabetes`) para uso fluído.
   - Suíte determinística em `test_endocrinologia_diabetes.cjs` aprovada com 100% de sucesso.
- [x] (2026-10-09) **Módulo de Oncologia Básica para Atenção Primária**:
   - Rastreamento determinístico INCA 2026 para os cânceres mais prevalentes (Mama, Cólon, Próstata e Pulmão) guiado pelo perfil e risco do paciente.
   - Algoritmo de condutas beira-leito baseadas na classificação BI-RADS mamográfica/ultrassonográfica.
   - Motor para manejo de toxicidade e efeitos adversos oncológicos na APS (Neutropenia Febril, Mucosite Oral e Escada Analgésica da OMS para dor oncológica).
   - Módulo `src/02_oncologia_basica.js` com integração nativa na malha RPC do Cockpit (`cockpitOncologiaBasica`).
   - Suíte determinística `tests/test_oncologia_basica.cjs` validada com 100% de sucesso.

- [x] (2026-10-09) **Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)**:
   - Calculadora automatizada de necessidade calórico-proteica basal com fórmulas de Harris-Benedict e regra de bolso (25-30 kcal/kg).
   - Motor determinístico de alerta para Síndrome de Realimentação baseado em critérios maiores (IMC < 16, perda de peso extrema, jejum prolongado, distúrbios de K/Mg/P) e menores, com prescrição empírica imediata de Tiamina e avanço lento da dieta.
   - Algoritmo de decisão de via de Terapia Nutricional (NRS-2002/NUTRIC), indicando Nutrição Enteral precoce vs Parenteral com base na viabilidade do trato gastrointestinal e dias de jejum.
   - Módulo independente e blindado `src/02_suporte_nutricional.js` integrado via RPC `cockpitSuporteNutricional`.
   - Suíte de testes automatizados `test_suporte_nutricional.cjs` validada com 100% de sucesso.

- [x] (2026-10-09) **Refatoração do Motor de Permissões e Perfis Clínicos (RBAC & Supervisão Médica)**:
   - Implementação do motor determinístico `RbacPerfisClinicosService` com segmentação hierárquica granular (Acadêmico de Medicina, Residente R1, Residente R2, Residente R3/R4, Preceptor e Farmacêutico Clínico) conforme diretrizes CFM, MEC/CNRM e Segurança do Paciente.
   - Salvaguardas ativas para acadêmicos e residentes juniores: bloqueio de liberação de prescrições ativas e mudança de status de leito sem co-validação preceptorial.
   - Detecção automatizada e auditoria de Fármacos de Alta Vigilância (Trombolíticos, Bloqueadores Neuromusculares, Aminas Vasoativas, KCl concentrado e Antídotos) exigindo dupla checagem ou chancela de R3+/Preceptor.
   - Bloqueio fatal e sentinela imediato para Cloreto de Potássio 19,1% infundido puro ou em bolus direto.
   - Sistema de gestão de pendências e co-assinatura preceptorial com tokens criptográficos rastreáveis e pareceres clínicos registrados em memória.
   - Protocolo Break-The-Glass (Bypass de Emergência Médica) que permite relaxamento temporário e auditado das travas em situações de PCR/choque extremo, garantindo que o cuidado à vida jamais seja bloqueado por entraves burocráticos.
   - Integração completa com Fastify RPC (`cockpitRbac`) e suíte de testes determinística validada com 100% de sucesso.

- [x] (2026-10-09) **Módulo de Psiquiatria de Urgência, Agitação Psicomotora e Risco de Suicídio (ABP / CFM / C-SSRS / PHQ-9)**:
   - Motor determinístico de alta fidelidade clínica e farmacológica para o manejo da agitação psicomotora via escalas RASS (-5 a +4) e BARS (1 a 7).
   - Diretrizes estritas de desescalonamento verbal com medidas de segurança ambiental (rota de fuga desobstruída e baixa estimulação sensorial).
   - Protocolo oficial de contenção mecânica/física protegida conforme a Resolução CFM nº 2.057/2013 (4 a 5 pontos, decúbito dorsal com cabeceira elevada a 30°, PROIBIÇÃO ABSOLUTA de decúbito ventral para prevenir asfixia postural e PCR súbita, reavaliação médica a cada 60 min e checagem circulatória a cada 15-30 min).
   - Contenção química personalizada por etiologia suspeita:
     * Psiquiátrica pura: Haloperidol 5 mg + Prometazina 25-50 mg IM (sinergismo sedativo e prevenção primária mandatória de distonia aguda) ou Haloperidol + Midazolam IM; ou Risperidona/Olanzapina VO se colaborativo.
     * Alerta crítico: Bloqueio estrito da associação Olanzapina IM + Benzodiazepínico parenteral na mesma janela de tempo pelo risco de PCR/colapso cardiorrespiratório.
     * Estimulantes (cocaína/crack): Benzodiazepínicos de 1ª linha (Midazolam IM ou Diazepam EV lento); contraindicação formal de antipsicóticos típicos isolados (risco de arritmia QTc, hipertermia e convulsão).
     * Delirium no idoso: dose baixa geriátrica fracionada de Haloperidol (0.5 a 1.25 mg) ou Quetiapina VO; contraindicação formal de benzodiazepínicos pelo risco de agitação paradoxal e maior mortalidade.
     * Abstinência alcoólica: Benzodiazepínicos titulados + Regra de Ouro da reposição de Tiamina 100-300 mg antes de qualquer infusão glicosada (prevenção mandatória de Encefalopatia de Wernicke).
   - Estratificação de risco de suicídio estruturada unindo o protocolo C-SSRS (Columbia) e o escore SAD PERSONS (0 a 10 pontos):
     * Identificação de bandeiras vermelhas de letalidade extrema (acesso a armas de fogo, estocagem de remédios, preparativos finais/cartas, desespero e método violento prévio).
     * Salvaguardas clínicas imediatas: vigilância 1:1 ininterrupta (inclusive no banheiro), sala segura desprovida de materiais perfurocortantes/fios, e internação psiquiátrica imediata (voluntária ou involuntária com notificação formal ao Ministério Público em até 72h conforme Art. 8º da Lei Federal nº 10.216/2001).
   - Rastreio de Depressão Maior via PHQ-9 (0 a 27 pontos) com alerta sentinela automático e bloqueio de liberação quando o Item 9 (pensamentos de morte ou autoflagelação) pontua > 0.
   - Algoritmo de seleção racional de antidepressivos baseado em comorbidades: Sertralina (escolha de excelência em cardiopatas pós-IAM respaldada pelo estudo SADHART), Mirtazapina (insônia e baixo peso/anorexia por ação antagonista H1 e alfa-2), Duloxetina/Venlafaxina (dor crônica e fibromialgia), Bupropiona (fadiga e queixa sexual com bloqueio absoluto se histórico convulsivo ou bulimia), e contraindicação formal de antidepressivos tricíclicos no idoso (Critérios de Beers).
   - Manejo determinístico de complicações: reversão de distonia aguda com Biperideno 5 mg IM/EV, protocolo de emergência em UTI para Síndrome Neuroléptica Maligna (Dantrolene/Bromocriptina), e diagnóstico de Síndrome Serotoninérgica pelos Critérios de Hunter com suporte de Ciproheptadina.
   - Módulo `src/02_psiquiatria_urgencia.js` integrado à malha RPC do `server/runtime.js` (`cockpitPsiquiatriaUrgencia`) e `src/13_cockpit_integracao.js`.
   - Suíte de 15 testes automatizados (`tests/test_psiquiatria_urgencia.cjs` e runner `tests/test_psiquiatria_urgencia.py`) validada com 100% de sucesso.

- [x] (2026-10-09) **Integração de IA Generativa Local (Llama 3 / Mistral) para Alta Disponibilidade Offline**:
   - Integração completa de nó local de IA generativa (Ollama / LocalAI / vLLM / llama.cpp) com suporte tanto à API OpenAI-compatible (`/v1/chat/completions`) quanto à rota nativa do Ollama (`/api/chat`).
   - Normalização automática de URLs e tolerância a timeouts com fallback sem bloqueio ou crash.
   - Suporte homologado aos modelos Llama 3 (`llama3.1:latest`, `llama3:8b`, `llama3.2`) e Mistral (`mistral:latest`, `mistral:7b`, `mistral-nemo`).
   - Orquestração transparente em cascata: quando provedores na nuvem (Gemini, Groq, OpenRouter, ZAI) sofrem saturação (429), indisponibilidade de rede ou ausência de chaves, o motor local assume automaticamente a inferência clínica com zero atrito.
   - Sistema de contingência em dupla camada: caso tanto a nuvem quanto o daemon local de LLM estejam inacessíveis (blackout total), o motor aciona o `IaLocalFallbackService` determinístico baseado nas diretrizes oficiais brasileiras e internacionais (PCR ACLS, DULE/perimortem na gestante, Choque Séptico, Choque Anafilático, SCA/IAM, AVC isquêmico, CAD, Crise Asmática, Pré-eclâmpsia Zuspan, DIP/ATO Hager/Monif).
   - Diagnóstico beira-leito com método `verificarSaudeLocalLlm` e rota RPC `cockpitLocalLlm` integrada ao Fastify para auditoria de status, inferência de teste e parametrização.
   - Bateria de testes automatizados (`tests/test_ia_local_offline.cjs`, `tests/test_ia_local_offline.py`, `tests/test_ia_local_fallback.cjs`, `tests/test_ia_local_fallback.py`) validada com 100% de sucesso.

- [x] (2026-10-09) **Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT MS / CDC)**:
   - Implementação de motor determinístico com estadiamento clínico de Monif (Estágios I a IV) e critérios diagnósticos de Hager/PCDT (3 maiores + 1 menor).
   - Auditoria de critérios absolutos de internação (gestação, falha ambulatorial em 72h, abscesso >= 8cm, peritonite difusa).
   - Manejo seguro do DIU: manutenção inicial em casos não complicados e remoção obrigatória após cobertura antibiótica em falha de tratamento (72h) ou abscesso tubo-ovariano.
   - Posologia ambulatorial e hospitalar ponderada por peso e ajustada para função renal (ClCr < 50 mL/min).
   - Protocolo estrito de convocação, rastreamento e tratamento empírico obrigatório de todos os parceiros sexuais dos últimos 60 dias.
   - Integração Fastify RPC completa e suíte de testes (15 cenários) cobrindo todas as variantes de DIP e ATO.

- [x] (2026-10-09) **Síndrome dos Ovários Policísticos (SOP - Critérios Internacionais de Roterdã & ASRM/ESHRE 2023 / FEBRASGO)**:
   - Motor determinístico de alta acurácia para avaliação diagnóstica pelos Critérios de Roterdã (mínimo 2 de 3: Hiperandrogenismo clínico/laboratorial, Disfunção Ovulatória com oligo/anovulação, e Morfologia Policística ao USG transvaginal com contagem >= 20 folículos de 2-9 mm ou volume ovariano >= 10 cm³; ou AMH em adultas).
   - Fenotipagem completa de Roterdã: Fenótipo A (Completo: HA + DO + PCOM), Fenótipo B (Clássico não-policístico: HA + DO), Fenótipo C (Ovulatório: HA + PCOM) e Fenótipo D (Não-hiperandrogênico: DO + PCOM).
   - Alerta específico para adolescentes (< 3 anos pós-menarca) contra uso isolado de USG e exigindo tanto hiperandrogenismo quanto anovulação persistente por imaturidade fisiológica do eixo neuroendócrino.
   - Auditoria mandatória de exclusões e diagnósticos diferenciais: TSH para tireoidopatias, Prolactina para hiperprolactinemia, 17-OH-Progesterona matinal (< 2 ng/mL normal, 2-10 ng/mL zona cinzenta com teste de ACTH obrigatório, > 10 ng/mL confirmatória de HAC-NC), Cortisol com supressão de 1mg de dexametasona para Síndrome de Cushing, e alerta vermelho oncológico de tumor produtor de androgênios em virilização rápida / níveis extremos hormonais.
   - Estratificação de risco cardiometabólico e endometrial: TTGO 75g de 2 horas (padrão-ouro em SOP), HOMA-IR, critérios de Síndrome Metabólica (ATP III / IDF com >= 3 critérios), rastreio de esteatose hepática (MASLD) e alerta de risco de hiperplasia/câncer de endométrio por anovulação com tempo de amenorreia >= 3-6 meses ou espessura endometrial >= 7-12 mm.
   - Conduta terapêutica dirigida por objetivos:
     * Com desejo reprodutivo: Letrozol oral de 1ª linha (superior ao Clomifeno), Metformina adjuvante se IMC >= 25, Ácido Fólico pré-concepcional e BLOQUEIO ABSOLUTO de antiandrogênicos teratogênicos.
     * Sem desejo reprodutivo: Anticoncepcionais combinados antiandrogênicos (Drospirenona, Ciproterona, Dienogeste); bloqueio de estrogênios em contraindicações OMS MEC 4 (enxaqueca com aura, HAS grave, tabagismo >= 35a, TEV) com uso de Progestagênio isolado cíclico protetor (Didrogesterona) ou SIU-LNG; Espironolactona para hirsutismo com contracepção obrigatória; e Metformina para resistência insulínica e prevenção de DM2.
   - Novo módulo `src/02_sop_ovarios_policisticos.js` (`SopOvariosPolicisticosService`) integrado à malha RPC do `server/runtime.js` e `src/13_cockpit_integracao.js` (`cockpitSopOvariosPolicisticos`).
   - Suíte de testes determinística `tests/test_sop_ovarios_policisticos.cjs` e runner `tests/test_sop_ovarios_policisticos.py` validada com 100% de sucesso.

- [x] (2026-10-09) **Climatério e Terapia Hormonal da Menopausa (THM - Consenso FEBRASGO/NAMS)**:
   - Motor determinístico de avaliação da Janela de Oportunidade (< 60 anos e < 10 anos pós-menopausa) com relação risco-benefício favorável e bloqueio do início tardio para prevenção de DAC e AVC.
   - Conduta específica mandatória para Insuficiência Ovariana Prematura (IOP / < 40 anos) com recomendação de reposição hormonal até pelo menos 50-52 anos.
   - Aplicação estrita da Regra de Ouro da Proteção Endometrial: bloqueio absoluto de estrogênio isolado em mulheres com útero intacto (obrigatória associação com Progesterona micronizada ou Didrogesterona para prevenção de hiperplasia e adenocarcinoma endometrial) e liberação de estrogênio isolado em histerectomizadas (salvo exceção de endometriose prévia).
   - Seleção ponderada da via de administração: via transdérmica mandatória/preferencial em HAS, obesidade (IMC >= 30), hipertrigliceridemia (> 150 mg/dL), diabetes, esteatose hepática, colelitíase e tabagismo, evitando a primeira passagem hepática.
   - Auditoria de segurança contraindicações absolutas: bloqueio total em câncer de mama, câncer de endométrio, sangramento vaginal não investigado, TEV prévio/agudo, trombofilias, DAC/IAM, AVC/AIT, hepatopatia aguda ativa e porfiria.
   - Módulo de Síndrome Geniturinária da Menopausa (SGM) isolada com terapia tópica vaginal de baixa dose sem necessidade de progestagênio, e catálogo de alternativas não hormonais (Desvenlafaxina, Venlafaxina, Gabapentina) com alerta contraindicação de Paroxetina em uso concomitante de Tamoxifeno.
   - Novo módulo `src/02_climaterio_thm.js` (`ClimaterioThmService`) integrado à malha RPC do `server/runtime.js` (`cockpitClimaterioThm`).
   - Suíte de testes determinística `tests/test_climaterio_thm.cjs` e runner `tests/test_climaterio_thm.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Tromboembolismo Venoso (TEV) na Gestação e Puerpério (Escore de Risco RCOG/FEBRASGO & Profilaxia com HBPM)**:
   - Motor determinístico de estratificação de risco trombótico antenatal e pós-parto com pontuação cumulativa RCOG/FEBRASGO (cesariana de urgência, IMC > 30, pré-eclâmpsia, tabagismo, imobilidade, idade > 35a).
   - Tabela ponderada de doses profiláticas de Enoxaparina por faixas de peso (20 mg a 80 mg SC/dia) e ajuste estrito para insuficiência renal (ClCr < 30 mL/min).
   - Bloqueios críticos para Varfarina (1º trimestre por embriopatia varfarínica e 3º trimestre por hemorragia fetal) e DOACs (gravidez/lactação), além de validação segura de Varfarina na lactação.
   - Verificador determinístico de intervalos de segurança neuroaxial (mínimo de 12h para dose profilática e 24h para dose terapêutica prevenindo hematoma epidural compressivo e paraplegia).
   - Novo módulo `src/02_tev_gestante.js` (`TevGestanteService`) integrado à malha RPC do `server/runtime.js` (`cockpitTevGestante`).
   - Suíte determinística `tests/test_tev_gestante.cjs` e `test_tev_gestante.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Algoritmo de Ressuscitação Cardiopulmonar na Gestante (PCR Materna / ACLS Materno e Cesariana Perimortem)**:
   - Motor determinístico de ACLS materno com protocolo de compressão aortocaval e manobra DULE contínua mandatória em gestante >= 20 semanas com alerta estrito contra inclinação de 30 graus.
   - Acesso vascular com prioridade absoluta acima do diafragma para circulação central desobstruída.
   - Aplicação da Regra dos 4 Minutos (decisão e incisão cirúrgica com extração fetal aos 5 minutos) no próprio leito da PCR sem transporte para centro cirúrgico.
   - Protocolos imediatos de antídotos (Gluconato de Cálcio 10% para intoxicação por MgSO4 e Emulsão Lipídica 20% para LAST) e checklist mnemônico A to H das causas reversíveis.
   - Novo módulo `src/02_pcr_gestante.js` (`PcrGestanteService`) integrado à malha RPC do `server/runtime.js` (`cockpitPcrGestante`).
   - Suíte determinística `tests/test_pcr_gestante.cjs` e `test_pcr_gestante.py` aprovada com 100% de sucesso.

- [x] (2026-10-09) **Manejo Avançado de Sepse e Choque Séptico Puerperal / Materno (Critérios SOS Score / Bundle de 1 Hora)**:
   - Motor determinístico de cálculo do Obstetric Sepsis Score (SOS) com adaptação fisiológica e qSOFA obstétrico.
   - Integração da conduta de ressuscitação (Bundle de 1 hora) baseada em parâmetros como lactato e choque séptico.
   - Novo módulo `src/02_sepse_puerperal.js` integrado à malha RPC do `server/runtime.js` (`cockpitSepsePuerperal`).
   - Suíte determinística `tests/test_sepse_puerperal.cjs` e `test_sepse_puerperal.py` validada com sucesso.

- [x] (2026-10-09) **Auditoria Farmacêutica Hospitalar: Compatibilidade Físico-Química em Y-Site (Linha Venosa)**:
   - Motor determinístico de verificação cruzada (matriz combinatória) de incompatibilidades intravenosas no Y-Site.
   - Bloqueios críticos rigorosos implementados para cristalização (Ceftriaxona + Cálcio/Ringer), precipitação (Fenitoína com Glicose, Furosemida + Midazolam) e inativação de aminas (Bicarbonato + Catecolaminas).
   - Módulo independente `src/02_auditoria_y_site.js` integrado à malha RPC do `server/runtime.js` (`cockpitAuditarYSite`).
   - Suíte determinística `tests/test_auditoria_y_site.cjs` validada no pytest com 100% de sucesso.

- [x] (2026-10-09) **Mecânica Pulmonar e Ventilação Protetora na SDRA (ARDSNet)**:
   - Calculador beira-leito de peso predito (fórmula ARDSNet baseada na altura e sexo biológico) com ajuste estrito de volume corrente em 4 a 6 mL/kg.
   - Titulação e monitoramento de pressão de platô (Pplat <= 30 cmH2O) e cálculo automático da Driving Pressure (Delta P = Pplat - PEEP, meta <= 14-15 cmH2O).
   - Gasometria arterial integrada com cálculo da relação PaO2/FiO2 (critérios de Berlim para SDRA leve, moderada, grave) e indicação oportuna de posição prona precoce.
   - Integração de `src/02_mecanica_pulmonar_sdra.js` e métodos RPC `cockpitSdraMecanica`.
   - Suíte de testes determinística validada com 100% de aprovação.

- [x] (2026-10-09) **Nefrologia Intensiva e Distúrbios Hidroeletrolíticos (DHE)**:
   - Módulo determinístico para correção segura de hiponatremia aguda vs crônica com cálculo de déficit de sódio e teto rígido de elevação (8 mEq/L 24h e 18 mEq/L 48h).
   - Manejo escalonado de hipercalemia com critérios de urgência dialítica, estabilização de membrana, e glicoinsulina.
   - Cálculo de déficit de água livre na hipernatremia.
   - Implementação de `src/02_nefrologia_dhe.js` e métodos RPC `cockpitNefrologiaDhe`.
   - Suíte de testes `tests/test_nefrologia_dhe.cjs` validada com 100% de sucesso.
   - Módulo determinístico de equivalência analgésica e rotação (Morfina, Fentanil, Metadona, Oxicodona) via conversão rigorosa em MME.
   - Escala de desmame de sedação contínua (RASS) e rastreio de Delirium (CAM-ICU).
   - Implementação de `src/02_sedacao_opioides.js` e métodos RPC `cockpitSedacaoOpioides`.
   - Suíte `tests/test_sedacao_opioides.cjs` com validações exatas de MME e tolerância cruzada aprovados 100%.

- [x] (2026-10-09) **Auditoria de Toxicidade em Infusões Contínuas de UTI**:
   - Validação e testes determinísticos de limites de taxa de infusão (mcg/kg/min) para aminas vasoativas (Noradrenalina, Vasopressina, Adrenalina, Dobutamina) prevenindo erros por ordem de grandeza e dose letal beira-leito.
   - Implementada a suíte `tests/test_auditoria_infusao_uti.cjs` e validação com runner `pytest`.
- [x] (2026-10-09) **Módulo de Saúde do Idoso e Avaliação Geriátrica Ampla (AGA)**:
   - **Triagem rápida de fragilidade clínica ambulatorial (Clinical Frailty Scale - CFS)**: Escore preditivo determinístico classificando de Idoso Muito Robusto (1) a Doente Terminal (9).
   - **Avaliação cognitiva de rastreio em 10 minutos (Mini-Cog e Teste do Relógio)**: Classificação binária sensível para detecção de demência através da retenção de palavras e desenho do relógio.
   - **Prevenção de iatrogenia e polifarmácia**: Verificador automatizado cruzando Critérios de Beers (AGS 2023) contra o paciente. Alertas críticos implementados para Benzodiazepínicos, AINEs, IBPs crônicos, Anti-histamínicos de 1ª Geração e Sulfonilureias.
   - **Avaliação de risco de quedas (Timed Up and Go - TUG)**: Classificação temporal com metas de reabilitação.
   - **Integração completa no Telegram e Cockpit**: Comandos rápidos (`/idoso`, `/aga`, `/cfs`, `/minicog`, `/tug`, `/beers`) exportando sumários rápidos de alto valor preditivo beira-leito. Novo método RPC `cockpitSaudeIdosoAga`.
   - **Testes Clínicos Automatizados**: Suite rigorosa de `tests/test_saude_idoso.cjs` validando scores (100% aprovados com runner pytest).
- [x] (2026-10-09) **Painel de Puericultura e Desenvolvimento Infantil (Atenção Primária & SBP)**:
   - **Módulo Clínico Determinístico**: Criação de `src/02_puericultura_pediatria.js` (`PuericulturaPediatriaService`) com diretrizes pediátricas estritas da SBP, MS e OMS.
   - **Suplementação Profilática**: Algoritmo rigoroso de recomendação de Vitamina D (400 UI ou 600 UI) e Ferro Elementar profilático (1 a 4 mg/kg/dia) com base na idade, peso de nascimento e aleitamento materno exclusivo.
   - **Vigilância do DNPM**: Avaliação progressiva e escalonada de marcos do Desenvolvimento Neuropsicomotor, sinalizando atrasos (M-CHAT-R).
   - **Avaliação Antropométrica**: Classificação simplificada de curvas da OMS baseada no Escore Z para cálculo de IMC (risco de sobrepeso, magreza e eutrofia), estatura, peso e perímetro cefálico.
   - **Calendário Vacinal (PNI 2026)**: Motor cronológico de vacinação do MS cruzando a idade do lactente com as doses aplicadas e futuras (BCG, VIP, VOP, Pneumocócica, Meningocócica, etc.).
   - **Integração Cockpit PWA e Telegram**: Novo método RPC `cockpitPainelPuericultura` via `src/13_cockpit_integracao.js` exportado em `server/runtime.js`.
   - **Suíte de Testes Automatizados**: Inclusão de `tests/test_puericultura_pediatria.cjs` validando clinicamente todos os vetores da puericultura (10/10 aprovados com Pytest).
- [x] (2026-10-09) **Integração Ágil e Fluida com o Telegram (Hub Unificado de GO, SOAP e UX Móvel de 1 Toque)**:
   - **Teclado Fixo Persistente (`ReplyKeyboardMarkup`) Otimizado**:
     * Botões de 1 toque no rodapé desenhados para o médico em atendimento rápido:
       `[🩺 SOAP Ambulatorial]` `[🤰 Ginecologia & Obstetrícia]`
       `[🚨 Emergência]` `[💊 REMUME Rápida]`
       `[📱 Cockpit Mini App]` `[🧹 Limpar Paciente]`
   - **Hub Unificado de Ginecologia & Obstetrícia (GO)**:
     * Ao tocar em `[🤰 Ginecologia & Obstetrícia]`, exibe submenus rápidos de 1 toque:
       - `🤰 Pré-Natal (DUM, DPP, IG, Rastreios)`
       - `🚨 Pré-Parto & Sala de Parto (Trabalho de Parto, Zuspan, HPP/4Ts)`
       - `🌸 Ginecologia (Preventivo/INCA, SUA, Anticoncepção/OMS, Leucorreias)`
   - **Roteamento Inteligente em Linguagem Natural sem Comandos (`/`)**:
     * Detecção automática de termos obstétricos (ex: "DUM 14/05/2024", "G3P2A0 28 semanas") e ginecológicos (ex: "citologia ASC-US", "SUA aguda", "quer trocar anticoncepcional") acionando condutas instantaneamente sem exigir barras (`/`).
     * Prescrição em texto livre validada contra REMUME, interações e alergias sem exigir `/rx`.
   - **Botões Inline de Ação Rápida Pós-Áudio & Ditado Clínico**:
     * Ao enviar áudio corrido nos corredores ou consultório, o bot transcreve e anexa botões de 1 clique:
       - `📋 Copiar PEP`: Copia texto clínico limpo para a área de transferência do celular (sem asteriscos ou formatações que quebrem no PEP).
       - `💊 Extrair Receita`: Destaca apenas a prescrição com posologia para colar ou imprimir.
       - `🤰 Cartão Gestante` / `📁 Salvar Caso`: Arquiva diretamente no prontuário/Notion.
       - `🔄 Refinar Conduta`: Interação rápida para ajustes.
   - **Fast-Ack & Feedback Visual Instantâneo (< 500ms)**:
     * Feedback imediato com `sendChatAction('typing')` e mensagem temporária de processamento ("⚡ Analisando caso clínico..."), editada *in-place* via `editMessageText` assim que a IA concluir, eliminando a percepção de lentidão ou congelamento no celular.
   - **Integração Nativa Telegram Mini App (WebApp)**:
     * Acesso em tela cheia ao Cockpit PWA via botão WebApp nativo dentro do Telegram (`web_app: { url: ... }`), permitindo alternar fluidamente entre ditado por voz e interface visual com cards táteis.

- [x] **Ginecologia Ambulatorial de Consultório (Completando o Módulo Unificado de GO)** (2026-10-09):
  * **Motor Determinístico de Alta Fidelidade**: Criação de `src/02_ginecologia_ambulatorial.js` (`GinecologiaAmbulatorialService`) com regras clínicas e farmacológicas alinhadas ao INCA/MS, FIGO, OMS, FEBRASGO e PCDT ISTs.
  * **Rastreamento do Câncer de Colo Uterino (Diretrizes INCA/MS 2016+)**:
    - Idade e Periodicidade: População-alvo de 25 a 64 anos; após dois exames anuais negativos consecutivos, periodicidade trienal.
    - Menores de 25 anos: Rastreamento de rotina NÃO recomendado (alta prevalência de infecção transitória por HPV e lesões regressivas sem impacto em câncer); conduta estritamente expectante para achados de ASC-US ou LSIL.
    - Condutas Citopatológicas por Faixa Etária:
      * ASC-US: Entre 25 e 29 anos, repetir citologia em 12 meses na Atenção Básica; aos 30 anos ou mais, repetir em 6 meses na Atenção Básica.
      * LSIL: A partir dos 25 anos, repetir citologia em 6 meses na Atenção Básica.
      * ASC-US ou LSIL persistente (dois exames anormais consecutivos): Encaminhamento imediato para colposcopia especializada.
      * ASC-H e HSIL: Encaminhamento imediato para colposcopia especializada. Pacientes >= 25 anos com HSIL e achado colposcópico compatível (JEC tipo 1 ou 2 totalmente visível) são elegíveis à estratégia "Ver e Tratar" (excisão da zona de transformação - EZT/CAF em ambulatório).
      * AGC (Células Glandulares Atípicas): Colposcopia imediata com avaliação do canal endocervical (escovado/curetagem) e investigação endometrial (USG/biópsia) se idade >= 35 anos ou presença de sangramento anormal.
    - Encerramento do Rastreamento: Aos 65 anos de idade, caso a mulher apresente pelo menos dois exames normais consecutivos nos últimos 5 anos.
    - Situações Especiais: Mulheres com histerectomia total por lesão benigna dispensadas de rastreio de cúpula; imunossuprimidas (HIV+, transplantadas) iniciam rastreio na sexarca, com seguimento semestral no primeiro ano e anual a seguir, e qualquer atipia (mesmo ASC-US) encaminhada imediatamente à colposcopia.
  * **Sangramento Uterino Anormal (SUA - Classificação FIGO / PALM-COEIN)**:
    - Investigação Sistemática dos 9 Componentes: Estruturais PALM (Pólipo, Adenomiose, Leiomioma, Malignidade/Hiperplasia) e Não-Estruturais COEIN (Coagulopatia, Disfunção Ovulatória, Endometrial, Iatrogênica, Não classificada).
    - Exclusão Mandatória de Gestação: Alerta em vermelho e bloqueio para solicitação prioritária de Beta-hCG em qualquer paciente em idade fértil; detecção de gravidez redireciona imediatamente para protocolo obstétrico.
    - Avaliação Hemodinâmica e Choque Hipovolêmico: Cálculo automático do Índice de Choque (FC/PAS); se instabilidade (Índice >= 0.9 ou >= 1.4), acionamento de ressuscitação com cristaloide, dois acessos calibrosos e tamponamento mecânico intrauterino com Sonda de Foley (30-50 mL de SF) se sangramento cataclísmico.
    - Hemostasia Medicamentosa Rápida:
      * 1ª Linha: Ácido Tranexâmico 1g IV lento ou 1g VO a cada 6-8h por até 4-5 dias.
      * Terapia Hormonal Aguda: Anticoncepcional Oral Combinado em esquema de redução (1 cp a cada 6-8h até controle em 24-48h, seguido de desmame 1 cp 12/12h por 3 dias e 1 cp/dia completando ciclo). Se contraindicação a estrogênio, Acetato de Medroxiprogesterona 10-20 mg/dia ou Noretisterona 5mg 8/8h.
    - Alerta de Endométrio Espessado na Pós-Menopausa: Alerta crítico com indicação mandatória de biópsia endometrial (Pipelle / histeroscopia com biópsia) se eco endometrial > 4 mm sem TH ou > 8 mm com TH para exclusão de adenocarcinoma.
  * **Critérios Médicos de Elegibilidade para Anticoncepção da OMS (Categorias 1 a 4)**:
    - Categorias Oficiais: Cat 1 (Uso irrestrito), Cat 2 (Vantagens superam riscos), Cat 3 (Riscos superam vantagens, evitar), Cat 4 (Risco de saúde inaceitável, contraindicação absoluta).
    - Mapeamento Determinístico de Condições Críticas:
      * Enxaqueca com aura: Anticoncepcionais hormonais combinados (orais, injetáveis, anel, adesivo) são Categoria 4 pelo risco de AVC isquêmico. DIU de Cobre é Categoria 1 (padrão ouro). Progestagênios isolados são Categoria 2.
      * Trombose Venosa Profunda / Tromboembolismo Pulmonar prévio ou ativo: Hormonais combinados são Categoria 4. DIU de Cobre é Categoria 1.
      * Hipertensão Arterial Severa / Descontrolada (PAS >= 160 ou PAD >= 100): Hormonais combinados são Categoria 4. AMPD é Categoria 3. DIU de Cobre é Categoria 1.
      * Tabagismo em mulheres >= 35 anos (>= 15 cigarros/dia): Hormonais combinados são Categoria 4. Métodos com progestagênio isolado e DIUs são Categoria 1.
      * Pós-parto com amamentação (< 6 semanas): Hormonais combinados são Categoria 4. DIU de Cobre é Categoria 1.
      * Câncer de Mama Atual: TODOS os métodos hormonais são Categoria 4. DIU de Cobre é Categoria 1 absoluto.
  * **Síndromes Infecciosas Vulvovaginais (Leucorreias - PCDT/MS)**:
    - Candidíase Vulvovaginal:
      * Clínica: Prurido vulvovaginal intenso, corrimento esbranquiçado grumoso ("leite coalhado"), pH < 4.5 e hifas/esporos na microscopia.
      * Tratamento 1ª linha: Fluconazol 150mg VO dose única OU Nitrato de Miconazol creme vaginal 2% à noite por 7 dias.
      * Alerta Crítico Obstétrico: CONTRAINDICAÇÃO ABSOLUTA de Fluconazol oral em gestantes (risco teratogênico); prescrição mandatória de Miconazol creme vaginal 2% por 7 a 14 dias.
      * Candidíase Recorrente (>= 4 episódios/ano): Esquema de indução com Fluconazol 150mg VO nos dias D1, D4 e D7, seguido de manutenção semanal de 150mg por 6 meses.
    - Vaginose Bacteriana:
      * Critérios de Amsel: Diagnóstico firmado com >= 3 de 4 critérios (corrimento branco-acinzentado fino/homogêneo; pH vaginal > 4.5; Whiff test / teste das aminas positivo com odor fétido característico de "peixe podre"; visualização de *clue cells* / células-guia na microscopia a fresco).
      * Tratamento 1ª linha: Metronidazol 500mg VO 12/12h por 7 dias OU Metronidazol gel vaginal 0,75% por 5 noites. Alternativa: Clindamicina creme 2% por 7 dias.
      * Alerta Crítico Farmacológico: Efeito Antabuse / Dissulfiram com álcool (abstinência mandatória de bebidas alcoólicas durante o uso e por 24-48h pós-término). Parceiro sexual NÃO necessita de tratamento de rotina.
    - Tricomoníase:
      * Clínica: Corrimento profuso amarelo-esverdeado bolhoso com odor desagradável, pH > 4.5, colo uterino com colpite focal ("aspecto em framboesa/morango") e protozoários móveis flagelados (*Trichomonas vaginalis*).
      * Tratamento 1ª linha: Metronidazol 2g VO em dose única (4 comprimidos de 500mg) OU Metronidazol 500mg VO 12/12h por 7 dias.
      * Conduta Mandatória de IST: TRATAMENTO OBRIGATÓRIO E SIMULTÂNEO DO(S) PARCEIRO(S) SEXUAL(IS) mesmo assintomáticos, abstinência sexual até o fim do tratamento e solicitação de painel de sorologias para ISTs (HIV, Sífilis/VDRL, Hepatite B e C).
  * **Integração no Cockpit PWA**:
    - Novo botão de 1 toque "Ginecologia & APS" na aba SOAP (`tab-soap`).
    - Modal tátil completo `modal-ginecologia-ambulatorial` com 4 abas segmentadas (Colo Uterino, SUA, Anticoncepção, Leucorreias), visualização de condutas com alertas destacados e botão de cópia rápida para o PEP.
    - Sincronização 100% idêntica entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
  * **Integração Fastify RPC e Bot Telegram**:
    - 5 novos métodos RPC: `cockpitRastreioColoUterino`, `cockpitSangramentoUterinoAnormal`, `cockpitElegibilidadeAnticoncepcao`, `cockpitInfeccaoVulvovaginal`, `cockpitResumoGinecologia`.
    - Comandos Telegram dedicados com parsing inteligente de dados clínicos: `/ginecologia`, `/preventivo`, `/sua`, `/anticoncepcao`, `/leucorreia`, `/corrimento`.
  * **Suíte de Testes Automatizados**:
    - 31 casos clínicos rigorosos em `tests/test_ginecologia_ambulatorial.cjs`.
    - Runner pytest em `tests/test_ginecologia_ambulatorial.py`.
    - Ampliação de `tests/test_cockpit_mini_app.py` com o teste `test_cockpit_ginecologia_ambulatorial`.
    - Total da suíte global: 160 testes no pytest 100% aprovados.

- [x] **Protocolos de Emergência e Centro Obstétrico (Pré-Parto & Sala de Parto)** (2026-10-09):
  * **Motor Determinístico de Alta Fidelidade**: Criação de `src/02_centro_obstetrico.js` (`CentroObstetricoService`) com regras clínicas e farmacológicas alinhadas à FEBRASGO, ACOG, Ministério da Saúde e OMS.
  * **Diagnóstico e Monitoramento de Trabalho de Parto**:
    - Fases Clínicas: Fase Latente (colo em esvaecimento / dilatação < 4cm), Fase Ativa (dilatação >= 4cm com >= 2 contrações regulares de >= 30s em 10 min) e Período Expulsivo (dilatação 10cm, puxos espontâneos, clampeamento oportuno de cordão e contato pele a pele).
    - Planos de De Lee: Altura de apresentação fetal de -5 a +5 com detecção exata de insinuação (plano 0 De Lee, espinhas isquiáticas) e descida ao assoalho pélvico.
    - Ausculta de BCF: Interpretação de frequência cardíaca fetal com alertas automáticos para Bradicardia Fetal Severa (< 110 bpm, ressuscitação intrauterina imediata) e Taquicardia Fetal (> 160 bpm, investigação de febre/corioamnionite).
    - Índice de Bishop Completo: Avaliação dos 5 parâmetros (dilatação, esvaecimento, altura de De Lee, consistência e posição), categorizando em Colo Favorável (>= 9 pts, indução com Ocitocina IV em bomba) vs Desfavorável/Imaturo (<= 5 pts, preparo cervical com Misoprostol 25 mcg vaginal ou Cateter de Foley intracervical se cicatriz uterina).
  * **Manejo de Pré-Eclâmpsia com Sinais de Gravidade e Eclâmpsia**:
    - Protocolo de Sulfato de Magnésio (MgSO4): Prescrição detalhada do Esquema Zuspan (ataque 4g IV lento em 20 min + manutenção contínua de 1g/h em bomba) e Esquema Pritchard (ataque 4g IV + 10g IM profundo em nádegas com lidocaína + manutenção 5g IM 4/4h).
    - Vigilância Estrita de Intoxicação: Checagem contínua de reflexo patelar (presente), frequência respiratória (>= 12 rpm) e diurese horária (>= 25 mL/h). Detecção imediata de toxicidade com ordem de suspensão e prescrição beira-leito do antídoto **Gluconato de Cálcio 10% (10 mL = 1g IV lento)**.
    - Emergência Hipertensiva Obstétrica (PAS >= 160 ou PAD >= 110 mmHg): Protocolo rápido de resgate com Hidralazina 5mg IV a cada 20 min (dose máxima 20-30mg) e Nifedipino 10-20mg VO. Bloqueio absoluto com alertas críticos para IECAs/BRAs (fetopatia e óbito fetal) e Nifedipino sublingual (queda abrupta e sofrimento fetal).
  * **Protocolo de Hemorragia Pós-Parto (HPP - Regra dos 4 Ts)**:
    - Diagnóstico de sangramento excessivo (> 500 mL em parto vaginal ou > 1000 mL em cesariana).
    - Índice de Choque (Shock Index = FC / PAS): Identificação automática de choque compensado / moderado (>= 0.9) e choque grave (>= 1.4, ativação imediata de protocolo de transfusão maciça 1:1:1 e suporte cirúrgico).
    - Etiologia dos 4 Ts: Tônus (Atonia Uterina 70%), Trauma (Lacerações 20%), Tecido (Restos Placentários 10%) e Trombina (Coagulopatia/CIVD 1%).
    - Sequenciamento Uterotônico Escalonado: 1ª Linha Ocitocina IV contínua (20-40 UI em 500 mL SF a 250 mL/h) -> 2ª Linha Metilergometrina 0,2mg IM (com BLOQUEIO ABSOLUTO E ALERTA VERMELHO se hipertensa/PE) -> 3ª Linha Misoprostol 800mcg retal/sublingual -> 4ª Linha Ácido Tranexâmico 1g IV precoce em até 3h do parto (conforme evidência do estudo WOMAN / Lancet). Medidas de tamponamento (Hamilton, Balão de Bakri, TANP e B-Lynch).
  * **Profilaxia Intraparto para Sepse Neonatal por GBS (Streptococcus agalactiae)**:
    - Critérios formais de indicação (swab positivo a 35-37s, bacteriúria por GBS, filho anterior com sepse por GBS, prematuridade < 37s, bolsa rota >= 18h ou febre materna >= 38ºC) e dispensa em cesariana eletiva fora de trabalho de parto com bolsa íntegra.
    - Esquemas antibióticos: Penicilina G Cristalina (5M UI ataque + 2,5M UI 4/4h), Ampicilina (2g ataque + 1g 4/4h), Cefazolina (2g + 1g 8/8h para alergia leve) e Vancomicina (20 mg/kg 8/8h para anafilaxia com resistência ou perfil desconhecido).
  * **Prematuridade e RPMO**:
    - Corticoterapia Antenatal para Maturação Pulmonar: Betametasona 12mg IM a cada 24h (2 doses) entre 24s0d e 34-37s.
    - Neuroproteção Fetal com MgSO4: Indicada para fetos < 32 semanas com parto prematuro iminente nas próximas 24h.
    - Tocólise Aguda por até 48h: Nifedipino 20mg VO de ataque para permitir transferência e término do ciclo de corticoide; contraindicação absoluta e interrupção imediata do parto se Corioamnionite.
    - Regime de Latência na RPMO < 34 semanas: Ampicilina 2g IV 6/6h + Azitromicina 1g VO dose única nas primeiras 48h, seguido de Amoxicilina 500mg VO 8/8h por 5 dias. Bloqueio de Amoxicilina + Clavulanato pelo risco de enterocolite necrosante.
  * **Integração no Cockpit PWA**:
    - Novo botão de 1 toque "Sala de Parto & HPP" na aba SOAP (`tab-soap`).
    - Modal interativo completo `modal-centro-obstetrico` com 4 abas segmentadas (Parto & Bishop, PE & MgSO4, HPP/4Ts, GBS & Prematuro) e botão de exportação rápida para o PEP com 1 toque.
    - Sincronização 100% idêntica entre `cockpit_movel.html` e `gh_cockpit_deploy/index.html`.
  * **Integração Fastify RPC e Bot Telegram**:
    - 7 novos métodos RPC: `cockpitTrabalhoParto`, `cockpitSulfatoMagnesio`, `cockpitCriseHipertensivaObstetrica`, `cockpitHemorragiaPosParto`, `cockpitProfilaxiaGbs`, `cockpitPrematuridadeRpmo`, `cockpitResumoCentroObstetrico`.
    - Comandos Telegram dedicados com parsing inteligente: `/parto`, `/co`, `/hpp`, `/mgso4`, `/preeclampsia`, `/gbs`, `/prematuridade`.
  * **Suíte de Testes Automatizados**:
    - 24 casos clínicos rigorosos em `tests/test_centro_obstetrico.cjs`.
    - Runner pytest em `tests/test_centro_obstetrico.py`.
    - Ampliação de `tests/test_cockpit_mini_app.py` com validação de interface e RPC.
    - Total da suíte: 158/158 testes aprovados com 100% de sucesso.
- [x] **Calculadora e Painel de Pré-Natal (Obstetrícia Ambulatorial)** (2026-10-09):
  * **Cálculo Determinístico de IG e DPP**: Implementação de `src/02_obstetricia_prenatal.js` (`ObstetriciaPrenatalService`) com Regra de Naegele rigorosa com tratamento de anos bissextos e viradas de mês/ano, cálculo de dias decorridos e dias restantes até a DPP.
  * **Regra de Concordância FEBRASGO / ACOG**: Comparação precisa entre DUM e biometria ultrassonográfica de 1º trimestre (CCN precoce até 13s6d ou CCN em mm), fixando se a DUM é mantida por concordância ou se a gestação é formalmente redatada pelo ultrassom precoce.
  * **Ganho de Peso Gestacional (IOM 2009 / Ministério da Saúde)**: Cálculo do IMC pré-gestacional com classificação (Baixo Peso, Eutrofia, Sobrepeso, Obesidade), cálculo do ganho ponderal total recomendado e ganho semanal no 2º e 3º trimestres, e auditoria do ganho atual com status (GANHO_ADEQUADO, GANHO_INSUFICIENTE, GANHO_EXCESSIVO).
  * **Painel Cronológico de Rastreio por Trimestre**:
    - 1º Trimestre: Tipagem/Rh, Coombs indireto, Glicemia de jejum (pontos de corte: <92 normal, 92-125 DMG, >=126 DM prévio), VDRL, HIV, HBsAg, Toxoplasmose IgM/IgG com interpretação e teste de avidez, EAS e urocultura com antibiograma, TSH e USG morfológico de 1º tri com translucência nucal. Suplementação de Ácido Fólico (0,4mg ou 4-5mg se alto risco).
    - 2º Trimestre: USG morfológico de 2º tri (20-24s), TOTG 75g (24-28s com cortes 92/180/153 mg/dL), Coombs mensal e Imunoglobulina anti-D na 28ª semana se Rh-, rastreio de Pré-Eclâmpsia com profilaxia de AAS 100-150mg + Cálcio se alto risco, e vacinação materna (dTpa após 20s, Hepatite B, Influenza).
    - 3º Trimestre: Repetição sorológica completa, swab anovaginal para Streptococcus agalactiae (GBS) na 35-37 semanas com indicação e esquema de profilaxia intraparto com Penicilina Cristalina ou Ampicilina, e monitoramento de vitalidade fetal (AU, BCF 110-160 bpm, mobilograma fetal).
  * **Validador Farmacológico na Gestação & Lactação**: Base de dados de segurança com classificação FDA, bloqueio imediato com alertas severos de fetopatia/teratogênese para classes perigosas (IECA/BRA, Estatinas, Tetraciclinas, AINEs no 3º trimestre, Varfarina, Metotrexato, Isotretinoína, Ácido Valproico) e indicação de alternativas seguras de 1ª linha (Metildopa, Nifedipino retard, Hidralazina, Paracetamol, Amoxicilina, Cefalexina, Fosfomicina).
  * **Integração no Cockpit PWA**: Adição do botão "Pré-Natal & DPP" na aba SOAP (`tab-soap`), modal interativo `modal-prenatal` com 4 abas funcionais (IG/DPP, Ganho de Peso, Rastreio e Farmacologia) e sincronização com GitHub Pages (`gh_cockpit_deploy/index.html`).
  * **Integração RPC e Bot Telegram**: Novos métodos no Fastify RPC (`cockpitCalcularPrenatal`, `cockpitRastreioTrimestre`, `cockpitValidarFarmacoGestacao`, `cockpitAuditarPrescricaoGestante`) e comandos Telegram `/prenatal` e `/dpp`.
  * **Suíte de Testes Automatizados**: Implementação de `tests/test_obstetricia_prenatal.cjs` (22 casos clínicos rigorosos) e runner pytest `tests/test_obstetricia_prenatal.py`. Total da suíte global subiu para 155 testes, 100% aprovados.
- [x] **Módulo SOAP Ambulatorial Ágil (Clínica e Atenção Primária)** (2026-10-09):
  * **Estruturação Semiologicamente Rigorosa do SOAP Ambulatorial**: Criação do módulo dedicado `src/02_soap_ambulatorial.js` (`SoapAmbulatorialService`), separando cirurgicamente S (Queixa Principal, HDA cronológica, medicações de uso contínuo, alergias e antecedentes), O (sinais vitais com parâmetros de referência e exames segmentares direcionados), A (hipóteses com CID-10, CIAP-2 e estratificação de risco) e P (prescrição farmacológica REMUME com horários práticos, MEV, sinais claros de alarme para procura de PS e prazo de retorno).
  * **Modelos Dirigidos de Exame Físico com Atalhos Rápidos**: 8 modelos padronizados para consultas rápidas: Check-up Geral, Hipertensão Arterial Sistêmica (com ausculta carotídea e busca de B3/B4), Diabetes Mellitus (com exame completo dos pés, monofilamento 10g e pulsos pedioso e tibial posterior), Queixa Respiratória/IVAS (com oroscopia e otoscopia), Gastrointestinal/Dispepsia (com sinais de Murphy e Blumberg), Musculoesquelético/Lombalgia (com manobra de Lasègue e reflexos osteotendíneos), Neurológico/Cefaleia (com pares cranianos e sinais meníngeos) e Saúde Mental/Exame Psíquico.
  * **Dicionário Diagnóstico com CID-10 e CIAP-2**: Autocompleção e busca instantânea de diagnósticos prevalentes da atenção básica (HAS I10/K86, DM2 E11.9/T90, Dislipidemia E78.0/T93, Lombalgia M54.5/L03, DRGE K21.9/D84, Cistite N30.0/U71, TAG F41.1/P74, Depressão F32.1/P76, etc.).
  * **Estratificação de Risco Cardiovascular Determinística (SBC / SBD)**: Categorização automática em Muito Alto, Alto, Intermediário e Baixo Risco Cardiovascular com indicação de metas pressóricas (< 130/80 mmHg), metas de LDL (< 50, < 70, < 100, < 130 mg/dL), metas de HbA1c e potência de estatina recomendada.
  * **Exportação Limpa de Receituário Ambulatorial (Texto Puro para PEP)**: Formatação universal e padronizada com agrupamento por via (`[USO ORAL]`, `[USO TÓPICO]`), linhas de preenchimento de quantidade a dispensar, cronofarmacologia/horários de tomada e carimbo médico, pronta para copiar e colar com 1 clique no prontuário eletrônico.
  * **Exportação de Atestado Médico Legal (Resoluções CFM 1.658/2002 e 1.851/2008)**: Geração determinística de atestados médicos com conversão de dias por extenso (ex: 3 -> "três", 7 -> "sete"), resguardo estrito do sigilo médico por padrão e inclusão do CID-10 exclusivamente mediante autorização expressa do paciente.
  * **Guia de Encaminhamento / Referência (SISREG / CROSS)**: Formato SBAR regulado para especialidades contendo motivo, resumo clínico, exames relevantes e tratamentos prévios.
  * **Integração no Cockpit PWA**: Adição dos botões "SOAP Ambulatorial", "Atestado CFM" e "Receita PEP" na aba SOAP (`tab-soap`), com modais dedicados interativos (`modal-ambulatorio-soap` e `modal-atestado-cfm`) e sincronização 100% no GitHub Pages (`gh_cockpit_deploy/index.html`).
  * **Integração RPC e Bot Telegram**: Novos métodos RPC no Fastify (`cockpitSoapAmbulatorial`, `cockpitGerarReceitaTexto`, `cockpitGerarAtestadoTexto`, `cockpitEstratificarRisco`, `cockpitBuscarCid`) e comandos Telegram `/ambulatorio` e `/atestado`.
  * **Suíte de Testes Automatizados**: Implementação de `tests/test_soap_ambulatorial.cjs`, runner `tests/test_soap_ambulatorial.py` e ampliação de `tests/test_cockpit_mini_app.py`. Total de testes subiu para 154 testes, 100% aprovados.
- [x] **Auditoria e Testes Clínicos: Cenários Extremos de Dose e Conversão Pediátrica** (2026-10-08):
  * **Tetos de Dose Máxima de Adulto (Safety Ceiling Clamping)**: Testes automatizados rigorosos garantindo que crianças de peso elevado (>30-60 kg) nunca recebam doses supraterapêuticas ou tóxicas. Amoxicilina limitada a 1500 mg/dia, Amoxicilina+Clavulanato limitada a 1500 mg/dia, Azitromicina limitada a 500 mg/dia, Cefalexina limitada a 2000 mg/dia, Prednisolona limitada a 40 mg/dia, SMX-TMP limitado a 320 mg TMP/dia, Dipirona limitada a 500 mg/dose, Paracetamol limitado a 500 mg/dose e Ibuprofeno limitado a 400 mg/dose.
  * **Limites Inferiores e Proteção Neonatal/Lactente**: Gota mínima de segurança, volume mínimo seguro (0,5 mL em suspensões) e rejeição estrita para pesos fora da faixa pediátrica (< 1 kg ou > 80 kg).
  * **Restrições Etárias de Bula e Contraindicações Clínicas**: Bloqueio obrigatório de Albendazol e Mebendazol em < 2 anos; bloqueio de Nitazoxanida em < 1 ano; faixas etárias para Loratadina e Dexclorfeniramina.
  * **Cálculo de Frascos para Tratamentos Prolongados**: Cursos de 14 dias para otite complicada, frascos de 75 mL para Amoxi+Clav, Azitromicina 3 dias vs 5 dias e Cefalexina para 10 dias.
  * **Integração de Testes Automatizados**: Criação de `tests/test_auditoria_pediatrica_extremos.cjs` (27 casos clínicos) e runners pytest. Total de testes subiu para 152 testes no pytest, com 100% de sucesso.
- [x] **Aprimoramento da Interface Cockpit PWA: Cards de Leito & Prescrição Rápida** (2026-10-08):
  * Painel e cards de leitos da enfermaria com triagem visual, segmented control e censo hospitalar em tempo real.
  * Bandeja de prescrição rápida beira-leito com kits hospitalares e categorias farmacológicas no REMUME.
  * 149/149 testes aprovados.
- [x] **Enriquecimento do Guia de Interações Medicamentosas de UTI/Enfermaria** (2026-10-08): 66 novas interações críticas adicionadas (total de 285 regras farmacológicas em RAM). 146/146 testes aprovados.
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip, cache singleton do dispatch map, Cache-Control headers inteligentes. 145/145 testes passando.
- [x] **Correção da Suíte de Testes do Servidor Render** (2026-10-08): Correção e estabilização de `tests/test_server_render.cjs`.

- [x] **Pneumologia e Emergência - Manejo da Crise Asmática Grave e Estado de Mal Asmático** (2026-10-09):
  * **Estratificação Rápida de Gravidade (Diretrizes GINA / SBPT)**:
    - Motor determinístico beira-leito para classificação imediata em Leve/Moderada, Grave e Ameaça à Vida / Parada Iminente (Estado de Mal Asmático / Asma Quase Fatal).
    - Rastreio de sinais de exaustão respiratória: fala truncada/incapaz, posição de tripé, uso acentuado de musculatura acessória, respiração paradoxal toracoabdominal e tórax silencioso.
    - Alerta sentinela de falência muscular aguda em gasometria arterial: PaCO2 normal ou elevada (>= 42-45 mmHg) associada a acidose em paciente asmático (em crise aguda, a hiperventilação esperada deveria induzir hipocapnia < 35 mmHg; a normocapnia é um sinal cardinal pré-parada!).
  * **Protocolo Escalonado de Broncodilatação e Oxigenoterapia**:
    - Oxigenoterapia controlada com metas guiadas: SpO2 93-95% em adultos e 94-98% em gestantes e pediatria (evitando hiperóxia não controlada com efeito Haldane e retenção de CO2).
    - SABA (Salbutamol): Spray MDI com espaçador valvulado (4 a 10 jatos) a cada 20 min na 1ª hora (ciclos aos 0, 20 e 40 minutos) ou nebulização intermitente 2.5-5.0 mg; suporte para nebulização contínua (10-15 mg/h) na crise refratária extrema.
    - SAMA (Brometo de Ipratrópio): Indicação mandatória na crise grave associado ao SABA nas primeiras 3 doses da 1ª hora (40 gotas = 0.5 mg ou spray 4-8 jatos).
    - Ajustes posológicos ponderados precisos para pediatria por peso corporal e idade.
  * **Corticoterapia Sistêmica Precoce**:
    - Administração mandatória na 1ª hora da admissão (efeito genômico inicia em 4-6h).
    - Via oral preferencial: Prednisona/Prednisolona 40 a 50 mg/dia dose única por 5 a 7 dias em adultos (sem necessidade de desmame se <= 7-10 dias) e 1-2 mg/kg/dia por 3 a 5 dias em crianças.
    - Via intravenosa: Hidrocortisona 200 mg ataque + 100 mg 6/6h ou Metilprednisolona 40-60 mg 6-12h se vômitos ou risco de vida.
  * **Indicação Oportuna de Sulfato de Magnésio 2g IV**:
    - Indicação estrita para crise que persiste refratária com PFE < 50% ou SpO2 < 92% após a 1ª hora, ou com apresentação inicial de parada iminente.
    - Posologia precisa: 2,0 g IV (solução 50%: 4 mL; ou 10%: 20 mL) diluídos em 100 mL de SF 0.9% infundidos em 20 minutos (40-50 mg/kg em pediatria), com monitoramento de PA e reflexo patelar.
  * **Manejo Ventilatório Protetor & Bloqueios Críticos**:
    - Alerta para evitar IOT prematura (risco elevado de hiperinsuflação dinâmica, auto-PEEP extrema, pneumotórax e choque por perda de retorno venoso).
    - Se IOT mandatória: sequência rápida com Ketamina 1.5-2.0 mg/kg (broncodilatador simpaticomimético de escolha) e ventilação protetora (Vt 5-6 mL/kg predito, FR 10-12 rpm, relação I:E 1:3-1:4, PEEP baixa 0-5 cmH2O e hipercapnia permissiva). Conduta emergencial de desconexão e desinsuflação manual torácica se choque pós-IOT.
    - Bloqueios de segurança: contraindicação absoluta de benzodiazepínicos e opioides sem via aérea avançada, rejeição de antibióticos de rotina e contraindicação de mucolíticos.
  * **Critérios de Destino e Prescrição de Alta Estruturada**:
    - Critérios claros de alta de emergência (PFE > 70%, SpO2 > 94% mantida por 1-2h pós-SABA) com prescrição de 5 itens (corticoide oral, corticoide inalatório de manutenção, SABA de resgate com espaçador, revisão de técnica inalatória e retorno em 2-7 dias).
  * **Integração e Testes Automatizados**:
    - Módulo `src/02_pneumologia_crise_asmatica.js` integrado via Fastify RPC (`cockpitPneumologiaAsma` e `cockpitCriseAsmatica`) e comandos Telegram (`/asma`, `/criseasma`, `/broncoespasmo`, `/salbutamol`).
    - 9 testes unitários dedicados em `tests/test_pneumologia_crise_asmatica.cjs`, runner pytest em `tests/test_pneumologia_crise_asmatica.py` e integração no `tests/test_server_render.cjs`. 100% de sucesso.

---

## 🎯 Registro de Auditoria & Unificação do Backlog (Tarefas 55 a 173 Consolidadas)

> [!NOTE]
> **DIRETIVA DE ESTABILIZAÇÃO PERPÉTUA (2026-10-09)**:
> Todas as tarefas antigas que propunham adição de novas funcionalidades (bloco 55 a 113 e bloco 114 a 173) foram auditadas, canceladas e expurgadas do sistema.
> O backlog prioritário ativo do projeto está agora integralmente unificado e centralizado na seção principal imediatamente após a tarefa 54 (Tarefas 55 a 61), focado com 100% de prioridade nos 3 eixos absolutos:
> 1. **UI/UX & Usabilidade Intuitiva Beira-Leito (Telegram & Cockpit)**.
> 2. **Saneamento e Expurgo de Funções Excessivas (Filtro Internato/Generalista)**.
> 3. **Auditoria Médica Integral de Conteúdo com Modelo PRO**.
