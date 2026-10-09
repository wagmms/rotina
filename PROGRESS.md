# 🚀 Ultra Rotina — Motor de Evolução Perpétua (Kaizen)

### STATUS: EM_EVOLUCAO_CONTINUA

Este projeto opera sob ciclo de melhoria contínua perpétua. O backlog nunca se encerra: ao concluir uma tarefa, o sistema audita o código e adiciona novas oportunidades de alto impacto.

---

## 📋 Backlog de Melhorias Prioritárias (Foco Clínico: Obstetrícia, Ginecologia, UTI & APS)

1. [ ] **Calculadora e Painel de Pré-Natal (Obstetrícia Ambulatorial)**:
   - Cálculo automático instantâneo de Idade Gestacional (IG) e Data Provável do Parto (DPP):
     * Por DUM (Regra de Naegele: dia + 7, mês - 3 ou + 9).
     * Por 1º Ultrassom (CCN precoce ou DBP/CC/fêmur), com regra de concordância da FEBRASGO para fixar a data definitiva.
     * Cálculo de ganho de peso ideal baseado no IMC pré-gestacional (critérios IOM/Ministério da Saúde).
   - Rastreio de Pré-Natal por Cronologia e IG:
     * 1º Trimestre: Bateria de sorologias (HIV, VDRL, Toxoplasmose, HBsAg), tipagem e Rh com Coombs indireto, urina 1 e urocultura, glicemia de jejum.
     * 2º Trimestre: TOTG 75g (24-28s com pontos de corte 92/180/153), rastreio de pré-eclâmpsia com indicação de AAS 100-150mg + Cálcio se alto risco, vacinação dTpa a partir de 20s.
     * 3º Trimestre: Repetição de sorologias, swab de Streptococcus agalactiae (GBS) na 35-37 semanas.
   - Validador Farmacológico na Gestação & Lactação: Classificação de risco em gravidez com alertas imediatos para drogas proibidas (IECA, BRA, Estatinas, Tetraciclinas, AINEs no 3º tri) e alternativas seguras (Metildopa, Nifedipino, Hidralazina, Paracetamol, Cefalexina).

2. [ ] **Protocolos de Emergência e Centro Obstétrico (Pré-Parto & Sala de Parto)**:
   - Diagnóstico e Monitoramento de Trabalho de Parto: critérios de fase ativa (>=4 cm e 2-3 contrações regulares em 10 min), plano de De Lee e evolução dinâmica.
   - Manejo de Pré-Eclâmpsia com Sinais de Gravidade e Eclâmpsia:
     * Esquema de Sulfato de Magnésio (Zuspan: Ataque 4g IV lento em 20 min + Manutenção 1g/h IV contínua em bomba; ou Pritchard: 4g IV + 10g IM profundo).
     * Vigilância estrita de intoxicação: reflexo patelar presente, FR > 12 rpm e diurese > 25 ml/h. Antídoto pronto: Gluconato de Cálcio 10% 10 ml IV lento.
     * Controle pressórico de resgate para crise hipertensiva (PAS >= 160 ou PAD >= 110): Hidralazina 5mg IV a cada 20 min ou Nifedipino 10-20mg VO.
   - Protocolo de Hemorragia Pós-Parto (HPP - Regra dos 4 Ts):
     * Sequenciamento rápido de uterotônicos: Ocitocina (20-40 UI em 500ml SF a 250ml/h) -> Metilergometrina 0,2mg IM (contraindicado se HAS!) -> Misoprostol 800mcg retal/sublingual -> Ácido Tranexâmico 1g IV precoce em até 3h do parto.
   - Profilaxia para Sepse Neonatal por GBS Intraparto: indicações formais e esquemas (Penicilina Cristalina 5M UI ataque + 2,5M UI a cada 4h até o parto, ou Ampicilina 2g ataque + 1g a cada 4h).
   - Prematuridade e RPMO: Corticoterapia para maturação pulmonar (Betametasona 12mg IM 2 doses a cada 24h) e neuroproteção fetal com Sulfato de Magnésio se <32 semanas.

3. [ ] **Integração Ágil e Fluida com o Telegram (UX Móvel de 1 Toque, Ditado Clínico e Teclado Fixo)**:
   - **Teclado Fixo Persistente (`ReplyKeyboardMarkup`) Otimizado**:
     * Botões de 1 toque no rodapé desenhados para o médico em atendimento rápido:
       `[🩺 SOAP Ambulatorial]` `[🤰 Pré-Natal & DPP]`
       `[🚨 Pré-Parto & HPP]` `[💊 REMUME Rápida]`
       `[📱 Cockpit Mini App]` `[🧹 Limpar Paciente]`
   - **Roteamento Inteligente em Linguagem Natural sem Comandos (`/`)**:
     * Detecção automática de termos obstétricos (ex: "DUM 14/05/2024", "G3P2A0 28 semanas") acionando Naegele, DPP, IG e conduta de trimestre sem precisar de `/calc` ou `/dpp`.
     * Reconhecimento direto de trabalho de parto (contrações regulares, dilatação, dinâmica) e queixas clínicas agudas.
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

4. [ ] **Ginecologia Ambulatorial de Consultório**:
   - Rastreio de Câncer de Colo Uterino: Condutas baseadas nas Diretrizes Brasileiras para rastreamento (INCA/MS) por laudo citopatológico (ASC-US, LSIL, ASC-H, HSIL, AGC) e faixa etária.
   - Sangramento Uterino Anormal (SUA): Algoritmo de investigação e mnemônico PALM-COEIN com condutas hormonais de urgência (anticoncepcionais orais combinados, progestagênios, ácido tranexâmico).
   - Critérios de Elegibilidade de Anticoncepção da OMS (Categorias 1 a 4): Filtro rápido por comorbidades (enxaqueca com aura, trombose prévia, HAS não controlada, tabagismo >35a, amamentação pós-parto).

5. [ ] **Painel de Puericultura e Desenvolvimento Infantil (Atenção Primária & SBP)**:
   - Avaliação antropométrica com curvas de crescimento da OMS (Z-scores de Peso/Idade, Estatura/Idade, IMC/Idade e Perímetro Cefálico).
   - Vigilância de marcos do desenvolvimento neuropsicomotor (DNPM) por faixa etária (motor grosseiro, motor fino/adaptativo, linguagem, social/cognitivo).
   - Calendário vacinal atualizado do PNI (2026) com alertas de doses em atraso e esquemas de resgate.
   - Suplementação profilática padronizada: Ferro elementar (a partir de 3m ou 6m conforme aleitamento/peso ao nascer) e Vitamina D (400 UI/dia no 1º ano, 600 UI/dia no 2º ano).

6. [ ] **Módulo de Saúde do Idoso e Avaliação Geriátrica Ampla (AGA)**:
   - Triagem rápida de fragilidade clínica ambulatorial (Clinical Frailty Scale - CFS e Escala Edmonton).
   - Avaliação cognitiva de rastreio em 10 minutos (Mini-Exame do Estado Mental / Mini-Cog e Teste do Relógio).
   - Prevenção de iatrogenia e polifarmácia: Verificador automatizado de Critérios de Beers (AGS 2023) e critérios STOPP/START para desprescrição segura.
   - Avaliação de risco de quedas (Timed Up and Go - TUG) e metas individualizadas de controle metabólico/pressórico no idoso frágil.

7. [ ] **Auditoria de Toxicidade em Infusões Contínuas de UTI**:
   - Validação e testes determinísticos de limites de taxa de infusão (mcg/kg/min) para aminas vasoativas (Noradrenalina, Vasopressina, Adrenalina, Dobutamina) prevenindo erros por ordem de grandeza e dose letal beira-leito.

8. [ ] **Calculadora de Desmame de Sedação e Rotação de Opioides**:
   - Módulo determinístico de equivalência analgésica para rotação de opioides (Morfina IV/VO, Fentanil, Metadona, Oxicodona) e escala de desmame de sedação contínua (RASS/CAM-ICU).

---

## 🔄 Próxima Tarefa em Andamento
- [ ] **Calculadora e Painel de Pré-Natal (Obstetrícia Ambulatorial)**: Implementar cálculo de IG/DPP (Naegele e USG precoce FEBRASGO), painel de rastreio de exames por trimestre e validador farmacológico gestacional.

---

## ✅ Histórico de Melhorias Concluídas
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
