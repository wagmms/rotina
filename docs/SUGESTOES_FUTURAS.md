# 💡 Catálogo Oficial de Sugestões de Melhorias Futuras (Ultra Rotina)

> Catálogo estruturado de oportunidades e melhorias levantadas durante auditorias clínicas, testes de funções e uso beira-leito.
> Organizado por áreas de atuação clínica, prioridade médica e impacto prático.
>
> 📌 **Diretriz de Governança & Inserção de Novas Sugestões**:
> 1. **Formato Obrigatório**: Toda nova sugestão deve ser inserida na seção temática pertinente abaixo no formato:
>    `- **Nome da Sugestão / Recurso** (*Área / Contexto*): Descrição clínica ou técnica objetiva.`
> 2. **Proibição de Poluição de Tarefas**: É terminantemente proibido colar blocos de tarefas concluídas, andamento ou backlog neste arquivo (devem residir exclusivamente em `CHANGELOG.md` e `PROGRESS.md`).
> 3. **Filtro de Relevância**: Não adicionar sugestões cosméticas dispensáveis, redundantes com funcionalidades já existentes ou que reduzam salvaguardas clínicas.
> 4. **Buffer do PROGRESS.md**: Ao adicionar sugestões de alto impacto, atualize o buffer leve de 5 sugestões no `PROGRESS.md`.

---

## 🏆 As Melhores Sugestões (Alto Impacto Clínico & Beira-Leito)

As sugestões abaixo representam as intervenções de maior valor prático para salvar vidas, evitar erros farmacológicos graves e acelerar a rotina médica:

1. **Kit Prescritivo Rápido do Tripé da Hipercalemia Grave** (*Emergência / Sala Vermelha*):
   Prescrição estruturada em 1 toque combinando Estabilização de Membrana (Gluconato de Cálcio 10% 10-20 mL EV em 3-5 min), Shift Intracelular (Glicoinsulina 10 UI Regular + 50g Glicose 50% + Fenoterol/Salbutamol inalatório) e Eliminação Corpórea (Furosemida / Resinas trocadoras) com vigilância seriada de ECG e glicemia.
2. **Alerta Sentinela de Colapso Hemodinâmico na Sequência Rápida de Intubação (SRI)** (*Emergência / Sala Vermelha*):
   Trava ativa impedindo o uso inadvertido de drogas vasodilatadoras/depressoras miocárdicas (Propofol ou Midazolam) em pacientes em choque com Noradrenalina, direcionando imediatamente para indutores hemodinamicamente estáveis (Etomidato 0,3 mg/kg ou Quetamina 1,5-2 mg/kg).
3. **Calculadora Integrada de Reposição de Potássio IV (KCl 19,1%) com Limites de Concentração e Velocidade** (*Nefrologia / UTI*):
   Cálculo automático de concentração máxima de segurança para acesso venoso periférico (máx 40 mEq/L) vs acesso venoso central (máx 60 mEq/L) e taxa máxima horária de infusão (10-20 mEq/h sob monitorização cardíaca contínua), eliminando risco de flebite química e parada cardíaca.
4. **Matriz Visual de Alocação de Fármacos por Lúmen de Cateter Venoso Central (CVC Multilúmen)** (*UTI / Farmacologia*):
   Guia visual de compatibilidade física para cateteres de duplo/triplo lúmen: alocação do lúmen distal para vasopressores contínuos críticos (Noradrenalina, Vasopressina), lúmen medial para Nutrição Parenteral Total/hemoderivados e lúmen proximal para sedoanalgesia/bolus, prevenindo precipitação físico-química e perda de acesso.
5. **Checklist de Bandeiras Vermelhas em Cefaleia Aguda (Escore SNOOP4)** (*Emergência / Neurologia*):
   Checklist tátil obrigatório antes de liberar conduta de analgesia primária para triagem rápida de Hemorragia Subaracnóidea (HSA), meningite, trombose venosa cerebral ou hipertensão intracraniana.
6. **Alvos de Ventilação Mecânica Protetora na SDRA Acoplados à Gasometria** (*Emergência / Terapia Intensiva*):
   Sugestão imediata de volume corrente protetor (VT 6 mL/kg de peso predito pela altura, não peso real), FR ajustada para PaCO2 alvo e titulação de PEEP/FiO2 acoplados à relação P/F da classificação de Berlin.
7. **Rastreamento Precoce de Pré-Eclâmpsia no 1º Trimestre (FMF)** (*Ginecologia & Obstetrícia*):
   Algoritmo de estratificação entre 11 e 13+6 semanas baseado na Fetal Medicine Foundation, com prescrição preventiva automática de AAS 150 mg/dia à noite e Carbonato de Cálcio 1,5g/dia se risco elevado antes da 16ª semana gestacional.
8. **Extração Inteligente de Atestado Médico CFM e Resumo para WhatsApp a partir do SOAP** (*Ambulatório / Atenção Primária*):
   Geração em 1 toque de atestado médico CFM preenchido com repouso adequado à patologia, acompanhado de botão para envio das orientações de alta em linguagem leiga para o WhatsApp do paciente.

---

## 🚨 Sala Vermelha, Emergências Médicas & UTI

- **Metrônomo Sonoro e Visual de RCP (100-120 bpm) com Ciclos de 2 Minutos no Cockpit PWA**:
  Implementar metrônomo auditivo e visual sincronizado a 110 bpm com Web Audio API e temporizador regressivo de ciclos de 2 minutos para checagem de pulso/ritmo e troca de compressores durante ressuscitação cardiopulmonar no ACLS.
- **Seletor Rápido de Carga de Desfibrilação e Cardioversão Sincronizada**:
  Adicionar visualizador beira-leito com seleção de tecnologia do equipamento (Bifásico 120-200J vs Monofásico 360J) e carga recomendada por arritmia (50-100J para Flutter e TSV; 100J para TV monomórfica; 200J para FA).
- **Protocolo Diferencial de Amiodarona Venosa (PCR Chocável vs Taquiarritmia Estável)**:
  Exibição clara de dosagens e diluições em SG 5%: 300 mg em bolus na PCR chocável refratária (segunda dose 150 mg) vs ataque de 150 mg em 10 minutos na TV estável, seguido de manutenção em BIC (1 mg/min nas primeiras 6h e 0,5 mg/min nas 18h seguintes) com filtro de linha.
- **Kit Prescritivo Estruturado do Tripé da Hipercalemia Grave**:
  Kit de resgate em 1 toque para K+ > 6.0 mEq/L ou alterações eletrocardiográficas: Estabilização de Membrana (Gluconato de Cálcio 10% 10-20 mL EV em 3-5 min), Shift Intracelular (Glicoinsulina + Fenoterol/Salbutamol) e Eliminação Corpórea (Furosemida / Resinas) com vigilância de ritmo e glicemia.
- **Alerta Sentinela de Colapso Hemodinâmico na Sequência Rápida de Intubação (SRI)**:
  Checagem cruzada automática bloqueando indutores vasodilatadores (Propofol/Midazolam) em pacientes em choque com Noradrenalina, sugerindo Etomidato (0,3 mg/kg) ou Quetamina (1,5-2 mg/kg).
- **Desmame Estruturado (Tapering) de Drogas Vasoativas**:
  Critérios objetivos e ordem canônica de desmame de Noradrenalina, Vasopressina e Dobutamina, com metas de PAM ≥ 65 mmHg e clareamento de lactato.
- **Checklist Tátil de Prontidão Perimortem para PCR em Gestante ≥ 20 Semanas**:
  Checklist de prontidão (kit cesariana, bisturi nº 20, clamp de cordão, equipe neonatal) acoplado a temporizador de 4 minutos para decisão de incisão perimortem se RCE não for obtido.
- **Checklist Beira-Leito Interativo para Emergências no Telegram**:
  Card de conduta em formato de checklist com botões inline dinâmicos para marcação rápida de passos de ressuscitação sem poluir o histórico do chat.

---

## 💊 Farmacologia Clínica, Segurança & Interações

- **Matriz Visual de Alocação de Fármacos por Lúmen de Cateter Venoso Central (CVC Multilúmen)**:
  Visualização esquemática recomendada para cateteres de duplo e triplo lúmen: distal para vasopressores contínuos, medial para hemoderivados/NPT e proximal para sedativos e bolus intermitentes, prevenindo perda de acessos e cristalização.
- **Botão Inline de Compatibilidade em Y e Diluição HSL no Comando `/dva`**:
  Ao calcular qualquer droga vasoativa (ex: `/dva nora 70`), exibir teclado inline com atalhos para verificar compatibilidade em Y com outras drogas em infusão contínua e monografia oficial do Guia Farmacêutico HSL.
- **Conciliação Medicamentosa Multi-Droga de Admissão Hospitalar**:
  Ferramenta de checagem simultânea permitindo colar a lista completa de medicamentos de uso crônico do paciente na admissão hospitalar, gerando matriz visual de alertas graduada em cores (Verde, Amarelo, Vermelho).
- **Seletor de Sensibilidade Local e Perfil Microbiológico no Submenu de Antibióticos**:
  Ajuste de esquema de antibióticos por foco conforme taxas locais de resistência bacteriana (ESBL, MRSA, Pseudomonas) e orientações de infusão estendida de betalactâmicos.
- **Transição Automática para Apresentação em Comprimidos em Pediatria com Peso de Adulto**:
  Exibir sugestão automática de comprimidos para pacientes pediátricos com peso ≥ 40-50 kg (ex: Amoxicilina 500 mg cp VO em vez de suspensão oral volumosa), evitando sobrecarga de volume líquido e desperdício de frascos.
- **Conversão Automática de Apresentações Pediátricas Líquidas para Medidas Práticas**:
  Nos cards de conduta pediátrica, adicionar correspondência prática de doses em gotas, seringa dosadora e colheres-medida (5 mL = chá; 15 mL = sopa) para minimizar erros de administração domiciliar pelos cuidadores.

---

## 📐 Calculadoras Clínicas, Nefrologia & Distúrbios Hidroeletrolíticos

- **Calculadora Integrada de Reposição de Potássio IV (KCl 19,1%)**:
  Cálculo automático de concentração máxima de segurança para acesso periférico (40 mEq/L) vs central (60 mEq/L) e velocidade horária máxima (10-20 mEq/h sob monitorização cardíaca) acoplada diretamente aos alertas de hipocalemia.
- **Validação Cruzada entre Clearance Estimado (Cockcroft) e eTFG (CKD-EPI 2021)**:
  Exibição comparativa com alertas de discrepâncias em idosos sarcopênicos e pacientes com obesidade mórbida no momento de sugerir ajustes de dose de antimicrobianos.
- **Validação Cruzada entre Distúrbios Eletrolíticos Graves e ECG Obrigatório**:
  Bloqueio/alerta automático exigindo checagem de ECG antes de calcular taxas de infusão agressivas quando K+ > 6.0 mEq/L ou Na+ < 120 mEq/L.
- **Calculadora de Reposição de Magnésio e Fósforo IV na Síndrome de Realimentação**:
  Cálculo de reposição profilática e terapêutica em pacientes com desnutrição severa, etilismo crônico ou jejum prolongado na enfermaria e UTI.
- **Calculadora de Parkland com Compensação Horária Real do Trauma e Volume Pré-Hospitalar (SAMU)**:
  Temporizador e cálculo da primeira etapa de reposição volêmica considerando o horário exato da queimadura (primeiras 8h a contar do acidente) e compensando o volume de Ringer Lactato já infundido pelo SAMU.
- **Glasgow Pediátrico Adaptado para Lactentes e Menores de 4 Anos**:
  Alternância de parâmetros para escala de Glasgow adaptada à faixa pediátrica (choro consolável e resposta motora à dor), evitando subestimação de gravidade neurológica.
- **Checklist de Bandeiras Vermelhas em Cefaleia Aguda (Escore SNOOP4)**:
  Estratificação de sinais de alerta (início súbito/trovoada, febre, déficit neurológico, idade > 50 anos, mudança de padrão) antes de liberar conduta analgésica primária.
- **Calculadora Dinâmica de Hemoconcentração e Hematócrito na Dengue**:
  Cálculo da variação de 20% do hematócrito basal para reclassificação dinâmica entre Grupo B e Grupo C no Telegram e Cockpit.
- **Atalhos Táteis para Exame Físico Neurológico (Escala MRC e Sinais Meníngeos)**:
  Botoeiras inline para registro rápido de força motora (Graus 0 a 5 por membro) e pesquisa de Brudzinski/Kernig no Telegram.

---

## 🫁 Pneumologia & Emergência Respiratória

- **Alvos de Ventilação Mecânica Protetora na SDRA Acoplados à Gasometria**:
  Cálculo imediato de volume corrente protetor (6 mL/kg de peso predito pela altura), FR para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin.
- **Alternância entre Gasometria Arterial vs Venosa Central**:
  Avaliação de parâmetros hemodinâmicos de ressuscitação: saturação venosa central (ScvO2) e delta-pCO2 venoarterial (corte de 6 mmHg) para suporte no choque séptico.
- **Atalhos Táteis no Telegram para Crise Asmática e DPOC Descompensada**:
  Submenu com botões de 1 toque no comando `/asma` e `/dpoc` para estratificação em 3 níveis (Leve/Moderada, Grave, Ameaça à Vida/Tórax Silencioso) entregando conduta imediata formatada para PEP.
- **Indicador Visual de SpO2 Alvo com Alerta de Hiperóxia em DPOC**:
  No Cockpit PWA, barra com faixas dinâmicas de oxigenação (93-95% em asma; 88-92% em DPOC com alerta visual > 92% para risco de narcose por CO2 e perda do drive hipóxico).
- **OCR Multimodal para Fita Impressa de Gasometria**:
  Suporte ao envio de foto do papel impresso da máquina de gasometria com extração dos parâmetros laboratoriais (pH, pCO2, HCO3, Na, K, Cl, Lactato) e acionamento do motor determinístico.

---

## 🤰 Ginecologia, Obstetrícia & Pediatria

- **Algoritmo de Rastreamento Precoce de Pré-Eclâmpsia no 1º Trimestre (FMF)**:
  Rastreamento entre 11 e 13+6 semanas associando fatores maternos, PAM média e IP das artérias uterinas, com prescrição automática de AAS 150 mg à noite e Cálcio 1,5g/dia se alto risco.
- **Matriz de Decisão para Inserção de DIU Pós-Parto Imediato e Pós-Aborto (FIGO/OMS)**:
  Conduta beira-leito para DIU de Cobre e Levonorgestrel pós-dequitação imediata (até 10 min) e transcesariana, com critérios de segurança e manejo de expulsão.
- **Partograma Dinâmico com Linha de Alerta e Ação da OMS**:
  Visualização esquemática no Telegram e Cockpit PWA da linha de alerta e ação da OMS (intervalo de 4h) para identificação precoce de distócias funcionais e desproporção céfalo-pélvica.

---

## 🩺 SOAP Ambulatorial, Prontuário & Comunicação com o Paciente

- **Extração Inteligente de Atestado Médico CFM a partir da Avaliação SOAP**:
  Botão `[📄 Gerar Atestado CFM]` na Fase 2 do SOAP quando o quadro clínico indicar repouso laboral, preenchendo automaticamente paciente, período sugerido e autorização para CID-10.
- **Identificação de Medicamentos Gratuitos do Programa Farmácia Popular no SOAP**:
  Badge visual destacando medicamentos fornecidos 100% gratuitamente (anti-hipertensivos, antidiabéticos orais, insulinas e broncodilatadores) para orientar o paciente no consultório.
- **Exportação de Resumo de Orientações para WhatsApp do Paciente em Linguagem Leiga**:
  Botão `[📱 Enviar Orientações ao Paciente]` para extrair exclusivamente orientações comportamentais, cuidados em domicílio, sinais de alarme e retorno em linguagem clara e acessível.
- **Meta de HbA1c Individualizada por Fragilidade e Expectativa de Vida no DM2**:
  Definição dinâmica da meta de hemoglobina glicada conforme diretrizes SBD/ADA no plano terapêutico (jovem sem comorbidades: < 6,5-7,0%; idoso funcional: < 7,5-8,0%; idoso frágil: < 8,5%).
- **Templates de Receituário de Controle Especial (Portaria 344/98 - Listas C1 e B1)**:
  Modelos de receituário controlado em 1 toque com cálculo exato de caixas para 30 ou 60 dias de tratamento.
- **Mapeamento Bidirecional entre CIAP-2 e CID-10 na Atenção Básica**:
  Facilitador de codificação para atendimento no e-SUS APS com filtro por linhas de cuidado.
- **Botão `[💡 Racional Didático]` no Rascunho SOAP Fase 1**:
  Exibição sob demanda do mapa semiológico de perguntas e hipóteses a descartar (didática FMRP-USP), preservando a transcrição limpa do prontuário oficial.
- **Seleção Tátil de Modelos Dirigidos de Exame Físico por Aparelho**:
  Ao clicar em `[🩺 EF Normal]`, permitir selecionar rapidamente entre o modelo completo padrão ou modelos focados (Cardiovascular/HAS, Respiratório/IVAS, Metabólico/Pés DM, Ortopédico/Coluna, Gastrointestinal).

---

## 🏥 Enfermaria, Gestão de Leitos & Passagem SBAR

- **Contagem Regressiva e Alertas de D-Tempo de Antibióticos nos Leitos**:
  Alertas automáticos ao atingir D3 (revisão de culturas), D7 ou D14 para reavaliação de foco infeccioso, descalonamento de espectro ou transição para terapia oral precoce (Stewardship).
- **Filtro Instantâneo por Gravidade no Painel de Leitos (`ux:painel:0`)**:
  Filtro em 1 toque para isolar no painel apenas leitos instáveis (🔴) ou em observação rigorosa (🟡), otimizando o round matinal e a passagem de plantão.
- **Exportação da Passagem SBAR Adaptada para Canal Multidisciplinar**:
  Formatação do relatório SBAR destacando leitos com ventilação mecânica, drenos, sondas e drogas vasoativas para comunicação ágil com enfermagem e fisioterapia.
- **Exportação da Passagem SBAR em Formato PDF Estruturado**:
  Geração de documento PDF oficial de passagem de plantão para arquivamento ou anexação ao livro hospitalar.

---

## 📱 Cockpit PWA Mobile, Usabilidade & Offline

- **Modo Alto Contraste Solar para Atendimento Pré-Hospitalar (SAMU / Resgate)**:
  Tema visual de altíssimo contraste (fundo branco puro, tipografia em preto sólido e bordas reforçadas) para leitura sob sol pleno em ambulâncias, viaturas e helipontos.
- **Gestos de Swipe para Ações Rápidas nos Leitos e Calculadoras**:
  Suporte a gestos touch nativos (`touchstart`/`touchend` com feedback haptic) para deslizar o card do leito e marcá-lo como estável ou abrir evolução/SBAR em 1 gesto.
- **Histórico e Fixação (Pin) dos Últimos Cálculos da Sessão do Plantão**:
  Recurso para fixar cálculos de pacientes críticos no topo do painel durante o turno e histórico dos últimos 5 cálculos da sessão para consulta rápida sem redigitação.
- **Navegação Global por Atalhos de Teclado Físico no Cockpit**:
  Atalhos de produtividade para uso em computadores e tablets com teclado (`Ctrl+K` para busca de fármacos, `Alt+1` para leitos, `Alt+2` para calculadoras, `Alt+S` para SBAR).
- **Feedback Auditivo Discreto na Checagem de Protocolos de Emergência**:
  Bips sutis com Web Audio API diferenciando sucesso vs alerta crítico ao marcar etapas na Sala Vermelha, permitindo confirmação sensorial sem tirar os olhos do paciente.
- **Web Share API para Compartilhamento Nativo no Celular**:
  Botão de compartilhamento nativo para envio direto de receitas, orientações e sumários clínicos para o WhatsApp ou outros aplicativos instalados no aparelho.
- **Ditado de Voz com Web Speech API Nativa no Cockpit PWA**:
  Transcrição prévia local no próprio navegador móvel antes do envio à rede, permitindo conferência e edição rápida do texto ditado pelo médico.
- **Sincronização em Segundo Plano com Fila Outbox Local**:
  Armazenamento resiliente no IndexedDB de ações tomadas offline durante passagens por áreas de sombra ou subsolos hospitalares, sincronizando automaticamente ao recuperar sinal.

---

## 📅 Central de Rotina, Hábitos & Integrações Pessoais

- **Conector Moderno do Google Calendar em Node.js Fastify (Eliminação Definitiva de GAS)**:
  Substituição completa das chamadas legadas/órfãs de `CalendarApp` por biblioteca/cliente HTTP oficial em Node.js (via Google Calendar API v3 / Service Account / iCal URL segura), permitindo listar eventos do dia, calcular tempo até o próximo compromisso e disparar notificações reais de agenda no Telegram e Cockpit.
- **Redesenho Completo da Interface da Aba Rotina no Cockpit PWA (#tab-rotina)**:
  Reestruturação visual da aba rotina eliminando cartões mockados e estáticos ("Turma J", "Semana Ativa", blocos de estudo congelados), introduzindo timeline tátil de time-blocking com indicadores visuais de progresso (concluído, pendente, pulado, descanso) e sincronização ao vivo com a agenda do médico.
- **Check-in de Hábitos por Voz em Fluxo Contínuo (Notion & MedQuest)**:
  Processamento de áudio único relatando atividades do dia (treino, questões do MedQuest, estudo, hábitos) com atualização atômica das propriedades correspondentes no Notion.
- **Parser Inteligente de Escala de Plantão em PDF para Google Calendar**:
  Extração automática de datas, turnos e hospitais a partir de escala em PDF com criação dos eventos no Google Calendar e notificações pré-plantão.
- **Fechamento de Plantão em PDF com Assinatura e Hash de Integridade**:
  Geração de relatório formal de encerramento de plantão com checklist de pendências e hash de segurança para livro de ocorrências hospitalar.

---

## ⚙️ Telegram Bot, Backend Fastify & Resiliência

- **Pulsador Contínuo de Status de Digitação (`typing`) no Telegram**:
  Disparo periódico de `sendChatAction: typing` com timer durante raciocínios clínicos mais longos via IA para manter sinal de vida ativo na rede móvel hospitalar.
- **Botão "Ver Resumo no Cockpit PWA" em Condutas Fragmentadas**:
  Inclusão de botão inline quando uma conduta for dividida em múltiplas mensagens no Telegram, permitindo leitura contínua e integrada no Cockpit.
- **Navegação Tátil nos Resultados de `/fila`**:
  Botões inline nos retornos do comando `/fila` permitindo inspecionar pedidos e pendências arquivadas sem digitação manual.
- **Comando `/reprocessar_fila` para Retry Manual Imediato**:
  Opção de reprocessamento em 1 toque de pedidos retidos com status 'failed' na fila persistente após restabelecimento de serviços externos.
- **Rate-Limiting Adaptativo por Token/Sessão Médica para Redes Hospitalares**:
  Rate-limiting baseado no token ou sessão do médico para evitar falsos-positivos de limite excedido (HTTP 429) em redes Wi-Fi hospitalares onde dezenas de profissionais compartilham o mesmo IP/NAT corporativo.
- **Comando `/cockpit_revogar_convidado` para Revogação Imediata**:
  Comando no Telegram para invalidação ágil de tokens HMAC temporários concedidos a médicos convidados ao final do turno.
- **Cabeçalho Administrativo `Clear-Site-Data` para Redefinição Limpa**:
  Endpoint de redefinição de sessão capaz de expurgar caches e Service Workers corrompidos no dispositivo móvel do médico.
- **Cabeçalho de Segurança `Permissions-Policy` no Cockpit**:
  Restrição ativa de recursos dispensáveis (câmera, geolocalização) preservando apenas microfone para ditado e reforçando privacidade de dados beira-leito.
- **Gatilho Automático de Compactação de Métricas por Tamanho (`auto_rollup_threshold_mb`)**:
  Implementar disparo automático de `prune_and_rollup_metrics` quando `autoloop_metrics.jsonl` ultrapassar 500 KB durante a gravação de métricas em tempo real (`record_metric`), garantindo que o log nunca cresça além do teto configurado mesmo em execuções ininterruptas de 24h a 48h sem intervenção manual.