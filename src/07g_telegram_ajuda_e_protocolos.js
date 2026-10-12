/**
 * ==============================================================================
 * MÓDULO 07G: TELEGRAM AJUDA, COMANDOS SLASH & PROTOCOLOS DEDICADOS
 * ==============================================================================
 * Catálogo completo de comandos slash, central de ajuda interativa, busca e
 * protocolos dedicados beira-leito (PCR, Arritmias, DHE e Rotina Médica).
 * ==============================================================================
 */

/**
 * Retorna o catálogo estruturado com 1 comando slash canônico por função clínica (sem redundâncias)
 */
function obterCatalogoComandosSlash(chatId) {
  var ehConvidado = (typeof ehUsuarioTitular === "function" && chatId) ? !ehUsuarioTitular(chatId) : false;
  return [
    {
      id: "nucleo",
      titulo: "🧭 NÚCLEO, SESSÃO, NAVEGAÇÃO & COCKPIT",
      comandos: [
        { cmd: "/menu", aliases: ["/menu"], sintaxe: "/menu", desc: "Central de Comandos e teclado rápido beira-leito." },
        { cmd: "/ajuda", aliases: ["/ajuda"], sintaxe: "/ajuda [filtro]", desc: "Manual resumido de comandos com busca por especialidade." },
        { cmd: "/novo", aliases: ["/novo"], sintaxe: "/novo", desc: "Limpa a memória do caso e reseta o contexto clínico." },
        { cmd: "/status", aliases: ["/status"], sintaxe: "/status", desc: "Status operacional dos servidores, REMUME e APIs." },
        { cmd: "/pc", aliases: ["/pc"], sintaxe: "/pc [sync|audit|status]", desc: "Envia ordens para o runner local do computador." }
      ]
    },
    {
      id: "ambulatorio",
      titulo: "🩺 AMBULATÓRIO, PRONTUÁRIO & PRESCRIÇÃO",
      comandos: [
        { cmd: "/soap", aliases: ["/soap"], sintaxe: "/soap <caso>", desc: "Raciocínio clínico completo e nota estruturada SOAP." },
        { cmd: "/ambulatorio", aliases: ["/ambulatorio"], sintaxe: "/ambulatorio <caso>", desc: "Atendimento ambulatorial focado na APS e MFC." },
        { cmd: "/atestado", aliases: ["/atestado"], sintaxe: "/atestado <dias> [CID]", desc: "Emite atestado médico estruturado com dias e CID." },
        { cmd: "/rx", aliases: ["/rx"], sintaxe: "/rx <caso/droga>", desc: "Receita ambulatorial inteligente checada na REMUME RP." },
        { cmd: "/rxh", aliases: ["/rxh"], sintaxe: "/rxh <caso>", desc: "Prescrição hospitalar de internação em 10 itens padronizados." }
      ]
    },
    {
      id: "emergencia",
      titulo: "🚨 SALA VERMELHA & CTI (EMERGÊNCIAS)",
      comandos: [
        { cmd: "/choqueseptico", aliases: ["/choqueseptico"], sintaxe: "/choqueseptico <peso> <nora>", desc: "Manejo de choque séptico refratário e CIRCI (Hidrocortisona + Vaso)." },
        { cmd: "/dva", aliases: ["/dva"], sintaxe: "/dva <droga> <peso>", desc: "Calculadora de Noradrenalina, Dobutamina e Vasopressina (mL/h)." },
        { cmd: "/sri", aliases: ["/sri"], sintaxe: "/sri <peso> [perfil]", desc: "Sequência Rápida de Intubação: doses exatas em mg e mL." },
        { cmd: "/conduta", aliases: ["/conduta"], sintaxe: "/conduta <patologia>", desc: "Condutas imediatas e doses de ataque beira-leito (PCR, EAP, etc)." },
        { cmd: "/gaso", aliases: ["/gaso"], sintaxe: "/gaso <pH> <pCO2> <HCO3>", desc: "Gasometria arterial em 5 passos, compensação e anion gap." },
        { cmd: "/winter", aliases: ["/winter"], sintaxe: "/winter <HCO3>", desc: "Fórmula de Winter para pCO₂ esperada na acidose metabólica." },
        { cmd: "/choque", aliases: ["/choque"], sintaxe: "/choque <PAS> <PAD> <FC>", desc: "Classificação hemodinâmica e perfis de Forrester/Stevenson." },
        { cmd: "/sca", aliases: ["/sca"], sintaxe: "/sca <caso/ECG>", desc: "Síndrome Coronariana Aguda: escore HEART, DAPT e anticoagulação." },
        { cmd: "/avc", aliases: ["/avc"], sintaxe: "/avc <tempo/PA>", desc: "Protocolo de AVC isquêmico, critérios de trombólise e rtPA/TNK." },
        { cmd: "/hic", aliases: ["/hic"], sintaxe: "/hic <peso>", desc: "Manejo de HIC aguda: Salina Hipertônica 3% e Manitol 20%." },
        { cmd: "/intox", aliases: ["/intox"], sintaxe: "/intox <agente>", desc: "Toxicologia de emergência, toxíndromes e antídotos específicos." },
        { cmd: "/pancreatite", aliases: ["/pancreatite"], sintaxe: "/pancreatite <dados>", desc: "Escore BISAP para pancreatite aguda e metas de hidratação." },
        { cmd: "/colica", aliases: ["/colica"], sintaxe: "/colica <dor/tamanho>", desc: "Manejo de cólica nefrética: analgesia multimodal e tansulosina." }
      ]
    },
    {
      id: "farmaco",
      titulo: "💊 FARMACOLOGIA, DOSES & ANTIMICROBIANOS",
      comandos: [
        { cmd: "/dose", aliases: ["/dose"], sintaxe: "/dose <droga>", desc: "Consulta posológica no Guia Sírio-Libanês e PedBook." },
        { cmd: "/atb", aliases: ["/atb"], sintaxe: "/atb <droga> <ClCr>", desc: "Ajuste renal de antimicrobianos por ClCr e hemodiálise." },
        { cmd: "/crcl", aliases: ["/crcl"], sintaxe: "/crcl <idade> <peso> <Cr>", desc: "Clearance de Creatinina (Cockcroft-Gault) e estadiamento KDIGO." },
        { cmd: "/interacao", aliases: ["/interacao"], sintaxe: "/interacao <droga1> + <droga2>", desc: "Checagem de interações graves, toxicidade e risco de QT longo." }
      ]
    },
    {
      id: "pediatria",
      titulo: "👶 PEDIATRIA & SUPORTE VITAL",
      comandos: [
        { cmd: "/ped", aliases: ["/ped"], sintaxe: "/ped <droga> <peso>", desc: "Posologia pediátrica por peso (mg/kg/dia) via PedBook." },
        { cmd: "/conduta_ped", aliases: ["/conduta_ped"], sintaxe: "/conduta_ped <patologia>", desc: "Protocolos clínicos pediátricos completos do PedBook." },
        { cmd: "/pals", aliases: ["/pals"], sintaxe: "/pals <peso>", desc: "Suporte Avançado Pediátrico: drogas de PCR, tubo e Joules." },
        { cmd: "/bronquiolite", aliases: ["/bronquiolite"], sintaxe: "/bronquiolite <idade> <SatO2>", desc: "Manejo de bronquiolite viral aguda, gravidade e suporte CNAF." },
        { cmd: "/nutriped", aliases: ["/nutriped"], sintaxe: "/nutriped <peso>", desc: "Hidratação de manutenção venosa pela regra de Holliday-Segar." },
        { cmd: "/diluicao", aliases: ["/diluicao"], sintaxe: "/diluicao <fórmula/idade>", desc: "Diluição e reconstituição de fórmulas lácteas infantis." }
      ]
    },
    {
      id: "obstetricia",
      titulo: "🤰 OBSTETRÍCIA & MEDICINA FETAL",
      comandos: [
        { cmd: "/prenatal", aliases: ["/prenatal"], sintaxe: "/prenatal <DUM/USG>", desc: "Cálculo de IG, DPP (Naegele) e rotina de exames do pré-natal." },
        { cmd: "/parto", aliases: ["/parto"], sintaxe: "/parto <dilatação> <altura>", desc: "Condução do trabalho de parto, partograma e distócias no CO." },
        { cmd: "/hpp", aliases: ["/hpp"], sintaxe: "/hpp <perda/clínica>", desc: "Hemorragia pós-parto (4 Ts), índice de choque e uterotônicos." },
        { cmd: "/mgso4", aliases: ["/mgso4"], sintaxe: "/mgso4 [esquema]", desc: "Sulfato de Magnésio (Zuspan/Pritchard) na pré-eclâmpsia/eclâmpsia." },
        { cmd: "/gbs", aliases: ["/gbs"], sintaxe: "/gbs <swab/fatores>", desc: "Profilaxia intraparto para Estreptococo do Grupo B." },
        { cmd: "/prematuridade", aliases: ["/prematuridade"], sintaxe: "/prematuridade <IG>", desc: "Manejo de parto prematuro, tocolíticos e maturação pulmonar." },
        { cmd: "/toxo", aliases: ["/toxo"], sintaxe: "/toxo <IgG> <IgM> [avidez]", desc: "Toxoplasmose gestacional: avidez de IgG e esquema terapêutico." }
      ]
    },
    {
      id: "ginecologia",
      titulo: "🌸 GINECOLOGIA & SAÚDE DA MULHER",
      comandos: [
        { cmd: "/go", aliases: ["/go"], sintaxe: "/go", desc: "Hub beira-leito de Ginecologia & Obstetrícia (estágio ativo até 29/11)." },
        { cmd: "/ginecologia", aliases: ["/ginecologia"], sintaxe: "/ginecologia <caso>", desc: "Central de condutas e raciocínio para queixas ginecológicas." },
        { cmd: "/preventivo", aliases: ["/preventivo"], sintaxe: "/preventivo <laudo>", desc: "Conduta citopatológica de colo de útero (diretrizes INCA/MS)." },
        { cmd: "/sua", aliases: ["/sua"], sintaxe: "/sua <idade/sangramento>", desc: "Sangramento uterino anormal (PALM-COEIN) e conduta hormonal." },
        { cmd: "/anticoncepcao", aliases: ["/anticoncepcao"], sintaxe: "/anticoncepcao <perfil>", desc: "Critérios de elegibilidade da OMS para contracepção." },
        { cmd: "/corrimento", aliases: ["/corrimento"], sintaxe: "/corrimento <aspecto/odor>", desc: "Vaginoses e cervicites (candidíase, VB e tricomoníase)." },
        { cmd: "/endometriose", aliases: ["/endometriose"], sintaxe: "/endometriose <sintomas>", desc: "Manejo da dor pélvica crônica, endometriose e dienogeste." }
      ]
    },
    {
      id: "geriatria",
      titulo: "👴 GERIATRIA & SAÚDE DO IDOSO (AGA)",
      comandos: [
        { cmd: "/idoso", aliases: ["/idoso"], sintaxe: "/idoso <caso>", desc: "Avaliação Geriátrica Ampla (AGA): função, humor e cognição." },
        { cmd: "/cfs", aliases: ["/cfs"], sintaxe: "/cfs <escore 1-9>", desc: "Escala clínica de fragilidade de Rockwood (CFS)." },
        { cmd: "/beers", aliases: ["/beers"], sintaxe: "/beers <drogas>", desc: "Critérios de Beers e STOPP/START para desprescrição no idoso." },
        { cmd: "/frax", aliases: ["/frax"], sintaxe: "/frax <idade> <sexo>", desc: "Calculadora FRAX Brasil para risco de fratura osteoporótica." },
        { cmd: "/osteoporose", aliases: ["/osteoporose"], sintaxe: "/osteoporose <T-score>", desc: "Manejo de osteoporose: bisfosfonatos, cálcio e vitamina D." },
        { cmd: "/quedas", aliases: ["/quedas"], sintaxe: "/quedas <histórico>", desc: "Avaliação multifatorial de risco de quedas no paciente idoso." },
        { cmd: "/polifarmacia", aliases: ["/polifarmacia"], sintaxe: "/polifarmacia <receitas>", desc: "Revisão de polifarmácia e identificação de FRIDs no idoso." }
      ]
    },
    {
      id: "cardiopneumo",
      titulo: "🫀 CARDIOLOGIA & PNEUMOLOGIA CLÍNICA",
      comandos: [
        { cmd: "/fa", aliases: ["/fa"], sintaxe: "/fa <dados>", desc: "Fibrilação atrial: anticoagulação (CHA₂DS₂-VASc) e frequência." },
        { cmd: "/icc", aliases: ["/icc"], sintaxe: "/icc <FEVE %>", desc: "IC com FE reduzida: titulação dos 4 pilares farmacológicos." },
        { cmd: "/asma", aliases: ["/asma"], sintaxe: "/asma <gravidade>", desc: "Crise asmática aguda: broncodilatadores, corticoide e MgSO4." },
        { cmd: "/dpoc", aliases: ["/dpoc"], sintaxe: "/dpoc <gaso/sintomas>", desc: "DPOC exacerbada: critérios de Anthonisen, corticoide e VNI." }
      ]
    },
    {
      id: "metabolismo",
      titulo: "🩸 HEMATOLOGIA, METABOLOGIA & NUTRIÇÃO",
      comandos: [
        { cmd: "/anemia", aliases: ["/anemia"], sintaxe: "/anemia <Hb/VCM/ferro>", desc: "Diagnóstico etiológico de anemias e cinética de ferro." },
        { cmd: "/ganzoni", aliases: ["/ganzoni"], sintaxe: "/ganzoni <peso> <Hb>", desc: "Fórmula de Ganzoni para reposição de ferro elementar IV." },
        { cmd: "/diabetes", aliases: ["/diabetes"], sintaxe: "/diabetes <glicemia/HbA1c>", desc: "Manejo do DM e titulação de esquema basal-bolus de insulina." }
      ]
    },
    {
      id: "especialidades",
      titulo: "🦴 REUMATO, ORTO, URO, OFTALMO & OTORRINO",
      comandos: [
        { cmd: "/monoartrite", aliases: ["/monoartrite"], sintaxe: "/monoartrite <líquido>", desc: "Artrite séptica vs microcristalina e artrocentese." },
        { cmd: "/febrereumatica", aliases: ["/febrereumatica"], sintaxe: "/febrereumatica <dados>", desc: "Critérios de Jones para febre reumática e profilaxia secundária." },
        { cmd: "/oftalmo", aliases: ["/oftalmo"], sintaxe: "/oftalmo <queixa>", desc: "Emergências oftalmológicas: trauma, queimadura e glaucoma agudo." },
        { cmd: "/vertigem", aliases: ["/vertigem"], sintaxe: "/vertigem <achados>", desc: "Protocolo HINTS para síndrome vestibular aguda vs VPPB." },
        { cmd: "/epistaxe", aliases: ["/epistaxe"], sintaxe: "/epistaxe <tipo>", desc: "Manejo escalonado de sangramento nasal e tamponamento." }
      ]
    },
    {
      id: "dermato",
      titulo: "🧴 DERMATOLOGIA & ISTs CUTÂNEAS",
      comandos: [
        { cmd: "/dermato", aliases: ["/dermato"], sintaxe: "/dermato <lesão>", desc: "Diferenciação de lesões elementares da pele e sinais de alerta." },
        { cmd: "/ulceragenital", aliases: ["/ulceragenital"], sintaxe: "/ulceragenital <lesão>", desc: "Abordagem sindrômica de úlceras genitais (PCDT MS)." },
        { cmd: "/mpox", aliases: ["/mpox"], sintaxe: "/mpox <sintomas>", desc: "Diagnóstico, isolamento e conduta clínica para Mpox." }
      ]
    },
    {
      id: "psiquiatria",
      titulo: "🧠 PSIQUIATRIA DE URGÊNCIA & SAÚDE MENTAL",
      comandos: [
        { cmd: "/psiq", aliases: ["/psiq"], sintaxe: "/psiq <caso>", desc: "Condutas imediatas nas principais emergências psiquiátricas." },
        { cmd: "/agitacao", aliases: ["/agitacao"], sintaxe: "/agitacao [gravidade]", desc: "Manejo farmacológico rápido da agitação psicomotora." },
        { cmd: "/suicidio", aliases: ["/suicidio"], sintaxe: "/suicidio <caso>", desc: "Estratificação do risco de suicídio e intervenção em crise." },
        { cmd: "/phq9", aliases: ["/phq9"], sintaxe: "/phq9 <respostas/pontos>", desc: "Rastreio e gravidade de depressão pelo escore PHQ-9." }
      ]
    },
    {
      id: "exame_fisico",
      titulo: "🩺 EXAME FÍSICO & SEMIOLOGIA ESPECIALIZADA",
      comandos: [
        { cmd: "/ef", aliases: ["/ef"], sintaxe: "/ef", desc: "Menu interativo com botões para todos os roteiros de exame físico especializado." }
      ]
    },
    {
      id: "enfermaria",
      titulo: "🏥 ENFERMARIA, LEITOS & PLANTÃO",
      comandos: [
        { cmd: "/enfermaria", aliases: ["/enfermaria"], sintaxe: "/enfermaria", desc: "Censo dos leitos internados, gravidade e pendências." },
        { cmd: "/passagem", aliases: ["/passagem"], sintaxe: "/passagem", desc: "Relatório consolidado de passagem de plantão da enfermaria." }
      ]
    },
    ehConvidado ? {
      id: "ensino_rotina",
      titulo: "🎧 PRECEPTOR CLÍNICO & DISCUSSÃO DE CASOS",
      comandos: [
        { cmd: "/voz", aliases: ["/voz"], sintaxe: "/voz [caso/tema]", desc: "Sabatina preceptorial socrática por áudio ou texto beira-leito." }
      ]
    } : {
      id: "ensino_rotina",
      titulo: "🎧 PRECEPTOR, ROTINA & PRODUTIVIDADE",
      comandos: [
        { cmd: "/voz", aliases: ["/voz"], sintaxe: "/voz [caso/tema]", desc: "Sabatina preceptorial socrática por áudio ou texto." },
        { cmd: "/rotina", aliases: ["/rotina"], sintaxe: "/rotina [hoje/reset]", desc: "Grade de blocos de tempo adaptativos do dia." }
      ]
    },
    {
      id: "governanca",
      titulo: "🛡️ EVIDÊNCIAS, PROTOCOLOS & DIRETRIZES",
      comandos: [
        { cmd: "/protocolo", aliases: ["/protocolo"], sintaxe: "/protocolo <tema>", desc: "Comparativo de diretrizes clínicas nacionais vs internacionais." },
        { cmd: "/calc", aliases: ["/calc"], sintaxe: "/calc", desc: "Catálogo central de calculadoras médicas integradas." }
      ]
    }
  ];
}

/**
 * Constrói o teclado inline com todas as categorias do manual de ajuda
 */
function construirTecladoCategoriasAjuda(chatId) {
  var labelPreceptor = (typeof ehUsuarioTitular === "function" && chatId && !ehUsuarioTitular(chatId))
    ? "🎧 Preceptor Clínico"
    : "🎧 Preceptor & Rotina";
  return {
    inline_keyboard: [
      [
        { text: "🧭 Início / Cockpit", callback_data: "ajuda_cat_nucleo" },
        { text: "🩺 Ambulatório / SOAP", callback_data: "ajuda_cat_ambulatorio" }
      ],
      [
        { text: "🚨 Sala Vermelha / CTI", callback_data: "ajuda_cat_emergencia" },
        { text: "💊 Farmaco / ATB / CrCl", callback_data: "ajuda_cat_farmaco" }
      ],
      [
        { text: "👶 Pediatria / PALS", callback_data: "ajuda_cat_pediatria" },
        { text: "🤰 Obstetrícia / Parto", callback_data: "ajuda_cat_obstetricia" }
      ],
      [
        { text: "🌸 Ginecologia", callback_data: "ajuda_cat_ginecologia" },
        { text: "👴 Geriatria (AGA)", callback_data: "ajuda_cat_geriatria" }
      ],
      [
        { text: "🫀 Cardio & Pneumo", callback_data: "ajuda_cat_cardiopneumo" },
        { text: "🩸 Metabologia & Sangue", callback_data: "ajuda_cat_metabolismo" }
      ],
      [
        { text: "🦴 Reumato & Especialidades", callback_data: "ajuda_cat_especialidades" },
        { text: "🧴 Dermato & ISTs", callback_data: "ajuda_cat_dermato" }
      ],
      [
        { text: "🧠 Psiquiatria", callback_data: "ajuda_cat_psiquiatria" },
        { text: "🩺 Exame Físico", callback_data: "ajuda_cat_exame_fisico" }
      ],
      [
        { text: "🏥 Enfermaria & Plantão", callback_data: "ajuda_cat_enfermaria" },
        { text: labelPreceptor, callback_data: "ajuda_cat_ensino_rotina" }
      ],
      [
        { text: "🛡️ Governança & Diretrizes", callback_data: "ajuda_cat_governanca" }
      ],
      [
        { text: "📖 Ver Todos os Comandos (Manual Completo)", callback_data: "ajuda_todas" }
      ]
    ]
  };
}

/**
 * Normaliza termos de busca para o manual de ajuda
 */
function normalizarTextoBuscaAjuda(t) {
  if (!t) return "";
  return String(t)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Menu principal interativo e didático de Ajuda (onboarding e central de comandos)
 */
function enviarMenuAjudaInterativo(chatId, messageId) {
  var nomeUsuario = (typeof obterNomeTratamentoUsuario === "function") ? obterNomeTratamentoUsuario(chatId) : "Doutor(a)";
  var texto = "⚡ *CENTRAL DE AJUDA & GUIA PRÁTICO*\n\n" +
    "Olá, " + nomeUsuario + "! O Ultra Rotina foi desenhado para agilidade máxima beira-leito. Você pode utilizá-lo de 3 formas simples:\n\n" +
    "1️⃣ *Navegação por Menus e Botões:*\n" +
    "Toque nas opções para abrir fluxogramas imediatos de Sala Vermelha, Enfermaria, Ambulatório e Consultas de Bolso.\n\n" +
    "2️⃣ *Linguagem Natural (Texto ou Áudio):*\n" +
    "Envie suas dúvidas clínicas ou casos reais do jeito que preferir — por mensagem escrita ou áudio gravado no hospital (ex: _\"paciente com dor torácica típica\"_, _\"ajuste de vancomicina clearance 30\"_).\n\n" +
    "3️⃣ *Calculadoras & Protocolos Diretos:*\n" +
    "Comandos rápidos com barra para obter doses exatas e escores na hora (ex: `/dva`, `/gaso`, `/sri`, `/curb65`).\n\n" +
    "💡 Toque abaixo para explorar o guia passo a passo ou ver exemplos práticos:";

  var botoes = (typeof botoesBot === "function") ? botoesBot([
    [['🚀 Guia Rápido (3 Passos)', 'ux:ajuda:passos'], ['💡 Exemplos Práticos', 'ux:ajuda:exemplos']],
    [['🩺 Por Especialidade', 'ux:ajuda:categorias'], ['📖 Todos os Comandos', 'ajuda_todas']],
    [['🏠 Início / Menu', 'ux:hub:inicio']]
  ]) : {
    inline_keyboard: [
      [
        { text: "🚀 Guia Rápido (3 Passos)", callback_data: "ux:ajuda:passos" },
        { text: "💡 Exemplos Práticos", callback_data: "ux:ajuda:exemplos" }
      ],
      [
        { text: "🩺 Por Especialidade", callback_data: "ux:ajuda:categorias" },
        { text: "📖 Todos os Comandos", callback_data: "ajuda_todas" }
      ],
      [
        { text: "🏠 Início / Menu", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  if (typeof enviarTelaBot === "function") {
    return enviarTelaBot(chatId, texto, botoes, messageId);
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, texto, botoes);
  }
  return enviarMensagemParaChat(chatId, texto);
}

/**
 * Guia didático passo a passo de como usar o bot beira-leito
 */
function enviarGuiaRapidoPassos(chatId, messageId) {
  var texto = "🚀 *COMO USAR O ULTRA ROTINA EM 3 PASSOS*\n\n" +
    "*1️⃣ Passo 1: Envie Dúvidas ou Casos Clínicos (Texto ou Áudio)*\n" +
    "• Fale ou escreva naturalmente como falaria com um colega médico.\n" +
    "• O bot reconhece sinais vitais, exames e sintomas e estrutura a conduta com doses, diluições e diagnósticos diferenciais.\n" +
    "• 💡 _Exemplo:_ \"Homem 72 anos, tosse produtiva e febre há 3 dias, FR 28, PAS 85, ureia 65.\"\n\n" +
    "*2️⃣ Passo 2: Navegue pelos Cenários nos Botões*\n" +
    "• 🚨 *Sala Vermelha:* PCR, Choque Séptico, DVA, SRI, Arritmias, AVC e SCA.\n" +
    "• 🛏️ *Enfermaria:* Antibióticos, SBAR, hidratação e prescrição hospitalar.\n" +
    "• 🩺 *Ambulatório:* SOAP, REMUME, CID-10, atestados e rastreios da APS.\n" +
    "• 💊 *Consultas de Bolso:* Posologias rápidas e doses pediátricas/adulto.\n\n" +
    "*3️⃣ Passo 3: Atalhos Rápidos e Troca de Paciente*\n" +
    "• Digite comandos como `/gaso`, `/dva`, `/curb65` para obter cálculos em 1 segundo.\n" +
    "• Para iniciar um novo atendimento com memória limpa, use o comando `/novo` ou toque em `🧹 Novo Paciente`.\n\n" +
    "Toque abaixo para ver exemplos prontos ou voltar à Central de Ajuda:";

  var botoes = (typeof botoesBot === "function") ? botoesBot([
    [['💡 Ver Exemplos Práticos', 'ux:ajuda:exemplos']],
    [['🔙 Central de Ajuda', 'ux:ajuda:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]) : {
    inline_keyboard: [
      [{ text: "💡 Ver Exemplos Práticos", callback_data: "ux:ajuda:exemplos" }],
      [{ text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
    ]
  };

  if (typeof enviarTelaBot === "function") {
    return enviarTelaBot(chatId, texto, botoes, messageId);
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, texto, botoes);
  }
  return enviarMensagemParaChat(chatId, texto);
}

/**
 * Exemplos práticos beira-leito abrangendo os principais cenários
 */
function enviarExemplosPraticosBeiraLeito(chatId, messageId) {
  var texto = "💡 *EXEMPLOS PRÁTICOS BEIRA-LEITO*\n\n" +
    "Você pode copiar ou enviar mensagens parecidas com estes exemplos a qualquer momento:\n\n" +
    "🚨 *Emergência & Sala Vermelha:*\n" +
    "• `/dva nora 70kg` — Vazão de noradrenalina em mL/h e solução padrão\n" +
    "• `/dva y nora dobuta` — Compatibilidade físico-química em Y na mesma via\n" +
    "• `/sri etomidato 80kg` — Doses exatas em mg e mL para intubação\n" +
    "• `/choqueseptico 75kg nora 0.5` — Protocolo de CIRCI e vasopressina\n" +
    "• `/pcr gestante 30 semanas` — Protocolo ACLS com cesariana perimortem\n\n" +
    "🩸 *Gasometria & Ácido-Base:*\n" +
    "• `/gaso ph 7.22 pco2 28 hco3 11 na 138 cl 102`\n" +
    "• `/winter 14` — pCO₂ esperada na acidose metabólica\n\n" +
    "💊 *Prescrição, Doses & Antimicrobianos:*\n" +
    "• `/dose amoxicilina crianca 16kg` — Dose e volume em mL da suspensão\n" +
    "• `/atb meropenem clearance 25` — Ajuste para função renal\n" +
    "• `/rxh pneumonia comunitaria 70kg` — Prescrição hospitalar completa\n\n" +
    "🩺 *Ambulatório & Prontuário:*\n" +
    "• `/soap mulher 55 anos fogachos intensos sem útero`\n" +
    "• `/prenatal dum 15/04/2026` — Idade gestacional e DPP\n" +
    "• `/colica dor lombar unilateral sem febre`";

  var botoes = (typeof botoesBot === "function") ? botoesBot([
    [['🚀 Guia Rápido (3 Passos)', 'ux:ajuda:passos']],
    [['🔙 Central de Ajuda', 'ux:ajuda:menu'], ['🏠 Início', 'ux:hub:inicio']]
  ]) : {
    inline_keyboard: [
      [{ text: "🚀 Guia Rápido (3 Passos)", callback_data: "ux:ajuda:passos" }],
      [{ text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
    ]
  };

  if (typeof enviarTelaBot === "function") {
    return enviarTelaBot(chatId, texto, botoes, messageId);
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, texto, botoes);
  }
  return enviarMensagemParaChat(chatId, texto);
}

/**
 * Exibe as categorias do catálogo de comandos com navegação
 */
function enviarMenuCategoriasAjuda(chatId, messageId) {
  var texto = "🩺 *COMANDOS POR ESPECIALIDADE CLÍNICA*\n\n" +
    "Selecione uma especialidade abaixo para visualizar os comandos canônicos e atalhos rápidos:";
  var kb = construirTecladoCategoriasAjuda(chatId);
  var inlineKb = (kb && kb.inline_keyboard) ? kb.inline_keyboard.slice() : [];
  inlineKb.push([
    { text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" },
    { text: "🏠 Início", callback_data: "ux:hub:inicio" }
  ]);
  var tecladoFinal = { inline_keyboard: inlineKb };

  if (typeof enviarTelaBot === "function") {
    return enviarTelaBot(chatId, texto, tecladoFinal, messageId);
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, texto, tecladoFinal);
  }
  return enviarMensagemParaChat(chatId, texto);
}

/**
 * Envia o manual completo ou filtrado por categoria/comando
 */
function enviarManualCompletoComandos(chatId, filtro, messageId) {
  var catalogo = obterCatalogoComandosSlash(chatId);
  var filtroNorm = normalizarTextoBuscaAjuda(filtro);
  var kb = construirTecladoCategoriasAjuda(chatId);

  if (!filtroNorm) {
    return enviarMenuAjudaInterativo(chatId, messageId);
  }

  // Bloqueio explícito de ajuda sobre rotina e agenda pessoal para convidados
  if (typeof ehUsuarioTitular === "function" && chatId && !ehUsuarioTitular(chatId)) {
    if (filtroNorm === "rotina" || filtroNorm === "agenda" || filtroNorm === "habitos" || filtroNorm === "task" || filtroNorm === "tarefa" || filtroNorm === "tasks" || filtroNorm === "briefing" || filtroNorm === "checkin") {
      var msgRestrita = "🔒 *Recurso Restrito ao Titular*\n\nEste recurso (Notion, Agenda e Rotina pessoal) é exclusivo do administrador da conta.\n\n💡 Use a Central de Ajuda para explorar calculadoras, condutas e protocolos clínicos.";
      var kbRestrito = {
        inline_keyboard: [
          [{ text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, msgRestrita, kbRestrito, messageId);
      if (typeof enviarMensagemComTecladoParaChat === "function") return enviarMensagemComTecladoParaChat(chatId, msgRestrita, kbRestrito);
      return enviarMensagemParaChat(chatId, msgRestrita);
    }
  }

  if (filtroNorm && filtroNorm !== "todas" && filtroNorm !== "tudo" && filtroNorm !== "full" && filtroNorm !== "manual" && filtroNorm !== "catalogo" && filtroNorm !== "todos") {
    var mapaCategorias = {
      "nucleo": "nucleo", "inicio": "nucleo", "cockpit": "nucleo", "app": "nucleo", "sessao": "nucleo",
      "ambulatorio": "ambulatorio", "aps": "ambulatorio", "mfc": "ambulatorio",
      "emergencia": "emergencia", "sala": "emergencia", "vermelha": "emergencia", "urgencia": "emergencia", "cti": "emergencia", "uti": "emergencia",
      "farmaco": "farmaco", "remedio": "farmaco", "medicamento": "farmaco", "remedios": "farmaco", "medicamentos": "farmaco", "drogas": "farmaco",
      "pediatria": "pediatria", "ped": "pediatria", "crianca": "pediatria", "lactente": "pediatria",
      "obstetricia": "obstetricia", "parto": "obstetricia", "gestante": "obstetricia", "gestacao": "obstetricia",
      "ginecologia": "ginecologia", "gineco": "ginecologia", "mulher": "ginecologia",
      "geriatria": "geriatria", "idoso": "geriatria", "aga": "geriatria", "geronto": "geriatria",
      "cardiopneumo": "cardiopneumo", "cardio": "cardiopneumo", "pneumo": "cardiopneumo", "coracao": "cardiopneumo", "pulmao": "cardiopneumo",
      "metabolismo": "metabolismo", "endocrino": "metabolismo", "nutricao": "metabolismo", "sangue": "metabolismo", "hematologia": "metabolismo",
      "especialidades": "especialidades", "reumato": "especialidades", "orto": "especialidades", "oftalmo": "especialidades", "olho": "especialidades", "otorrino": "especialidades", "orl": "especialidades", "vertigem": "especialidades", "hints": "especialidades", "epistaxe": "especialidades",
      "dermato": "dermato", "pele": "dermato", "lesao": "dermato", "lesoes": "dermato", "ists": "dermato", "ist": "dermato",
      "psiquiatria": "psiquiatria", "psiq": "psiquiatria", "mental": "psiquiatria",
      "exame_fisico": "exame_fisico", "exame": "exame_fisico", "semiologia": "exame_fisico",
      "enfermaria": "enfermaria", "plantao": "enfermaria", "leitos": "enfermaria",
      "ensino_rotina": "ensino_rotina", "preceptor": "ensino_rotina", "ensino": "ensino_rotina", "rotina": "ensino_rotina", "agenda": "ensino_rotina", "habitos": "ensino_rotina",
      "governanca": "governanca", "diretrizes": "governanca", "diretriz": "governanca", "protocolos": "governanca", "auditoria": "governanca", "seguranca": "governanca"
    };

    var catAlvoId = mapaCategorias[filtroNorm];

    if (catAlvoId) {
      for (var i = 0; i < catalogo.length; i++) {
        if (catalogo[i].id === catAlvoId) {
          var cat = catalogo[i];
          var msgCat = "📖 *" + cat.titulo + "*\n\n" +
            "Confira os comandos disponíveis nesta especialidade (1 comando por função clínica):\n\n";
          for (var j = 0; j < cat.comandos.length; j++) {
            var c = cat.comandos[j];
            msgCat += "• `" + c.sintaxe + "` — " + c.desc + "\n";
          }
          msgCat += "\n💡 *Dica:* Você também pode enviar qualquer caso ou dúvida em *linguagem natural* sem usar barra (/).";
          var kbCat = {
            inline_keyboard: [
              [
                { text: "🩺 Mais Especialidades", callback_data: "ux:ajuda:categorias" },
                { text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" }
              ],
              [
                { text: "🏠 Início", callback_data: "ux:hub:inicio" }
              ]
            ]
          };
          if (typeof enviarTelaBot === "function") {
            return enviarTelaBot(chatId, msgCat, kbCat, messageId);
          }
          if (typeof enviarMensagemComTecladoParaChat === "function") {
            return enviarMensagemComTecladoParaChat(chatId, msgCat, kbCat);
          }
          return enviarMensagemParaChat(chatId, msgCat);
        }
      }
    }

    var cmdBusca = filtroNorm.replace(/^\//, "");
    var sinonimosBusca = {
      "help": "ajuda", "manual": "ajuda", "teclado": "menu", "app": "cockpit", "cancelar": "novo",
      "receita": "rx", "prescricao_hospitalar": "rxh", "soap_ambulatorial": "ambulatorio", "soap_aps": "ambulatorio",
      "septico": "choqueseptico", "circi": "choqueseptico", "vasopressina": "choqueseptico",
      "iot": "sri", "sos": "conduta", "gasometria": "gaso", "aniongap": "gaso", "forrester": "choque",
      "iam": "sca", "heart": "sca", "dapt": "sca", "trombolise": "avc",
      "toxicologia": "intox", "bisap": "pancreatite",
      "colicanefretica": "colica", "litiase": "colica", "posologia": "dose",
      "hsl": "dose", "ajuste": "atb", "ajuste_renal": "atb", "clearance": "crcl", "seguranca": "interacao",
      "dose_ped": "ped", "pediatria": "ped", "pediatria_pcr": "pals", "bva": "bronquiolite",
      "cnaf": "bronquiolite", "holliday": "nutriped", "formulainfantil": "diluicao", "dpp": "prenatal",
      "co": "parto", "preeclampsia": "mgso4", "cig": "colestase", "icp": "colestase",
      "ehag": "swansea", "aflp": "swansea", "toxoplasmose": "toxo", "avidez": "toxo", "ciur": "rcf",
      "rciu": "rcf", "doppler": "rcf", "antifosfolipidio": "saf", "safgestante": "saf", "trombofilia": "saf",
      "leucorreia": "corrimento", "dienogeste": "endometriose",
      "aga": "idoso", "frids": "polifarmacia",
      "fibrilacaoatrial": "fa", "chascore": "fa", "hasbled": "fa", "insuficienciacardiaca": "icc",
      "quarteto": "icc", "criseasma": "asma", "broncoespasmo": "asma", "vni": "dpoc", "bipap": "dpoc",
      "hemograma": "anemia", "noripurum": "ganzoni", "ferro": "ganzoni", "insulina": "diabetes",
      "artriteseptica": "monoartrite", "gota": "monoartrite", "artrocentese": "monoartrite",
      "jones": "febrereumatica", "aslo": "febrereumatica", "glaucoma": "oftalmo", "queimaduraocular": "oftalmo",
      "vertigem": "vertigem", "hints": "vertigem", "vppb": "vertigem", "tontura": "vertigem",
      "epistaxe": "epistaxe", "sangramentonasal": "epistaxe", "tamponamento": "epistaxe",
      "lesao": "dermato", "lesoes": "dermato", "pele": "dermato", "zoster": "herpes", "aciclovir": "herpes",
      "cancro": "ulceragenital", "donovanose": "ulceragenital", "lgv": "ulceragenital",
      "monkeypox": "mpox", "neuro": "ef", "pqu": "ef", "ortopo": "ef",
      "reumato": "ef", "orl": "ef", "exame": "ef", "exames": "ef", "semiologia": "ef",
      "sbar": "plantao", "pitch": "round", "sabatina": "voz",
      "tarefa": "task", "relatorio": "semana",
      "obstetricia": "go", "gineco": "go"
    };
    if (sinonimosBusca[cmdBusca]) {
      cmdBusca = sinonimosBusca[cmdBusca];
    }

    for (var k = 0; k < catalogo.length; k++) {
      var catItem = catalogo[k];
      for (var m = 0; m < catItem.comandos.length; m++) {
        var cmdObj = catItem.comandos[m];
        var matchesCmd = cmdObj.cmd.replace(/^\//, "") === cmdBusca;
        if (!matchesCmd && cmdObj.aliases) {
          for (var a = 0; a < cmdObj.aliases.length; a++) {
            if (cmdObj.aliases[a].replace(/^\//, "") === cmdBusca) {
              matchesCmd = true;
              break;
            }
          }
        }
        if (matchesCmd) {
          var msgCmd = "🔎 *DETALHES DO COMANDO " + cmdObj.cmd + "*\n\n" +
            "• *Comando Único:* `" + cmdObj.sintaxe + "`\n" +
            "• *Função beira-leito:* " + cmdObj.desc + "\n" +
            "• *Especialidade:* " + catItem.titulo + "\n\n" +
            "💡 *Dica:* Você também pode acionar esta função enviando dúvidas ou casos em *linguagem natural*, sem precisar da barra (/).";
          var kbCmd = {
            inline_keyboard: [
              [
                { text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" },
                { text: "🏠 Início", callback_data: "ux:hub:inicio" }
              ]
            ]
          };
          if (typeof enviarTelaBot === "function") {
            return enviarTelaBot(chatId, msgCmd, kbCmd, messageId);
          }
          if (typeof enviarMensagemComTecladoParaChat === "function") {
            return enviarMensagemComTecladoParaChat(chatId, msgCmd, kbCmd);
          }
          return enviarMensagemParaChat(chatId, msgCmd);
        }
      }
    }
  }

  var totalCmds = 0;
  for (var cTot = 0; cTot < catalogo.length; cTot++) {
    totalCmds += catalogo[cTot].comandos.length;
  }

  var manualCompleto = "📖 *MANUAL DE COMANDOS CANÔNICOS (COPILOTO CLÍNICO 4.0)*\n\n" +
    "Abaixo estão os *" + totalCmds + " comandos padronizados* disponíveis no Ultra Rotina (estritamente 1 comando com barra por função clínica para facilitar a memorização):\n\n";

  for (var cIdx = 0; cIdx < catalogo.length; cIdx++) {
    var categoria = catalogo[cIdx];
    manualCompleto += "━━━━━━━━━━━━━━━━━━━━\n" +
      "*" + categoria.titulo + "*\n" +
      "━━━━━━━━━━━━━━━━━━━━\n";

    for (var cmdIdx = 0; cmdIdx < categoria.comandos.length; cmdIdx++) {
      var item = categoria.comandos[cmdIdx];
      manualCompleto += "• `" + item.sintaxe + "` — " + item.desc + "\n";
    }
    manualCompleto += "\n";
  }

  manualCompleto += "💡 *Dica de Ouro:* Você não precisa memorizar barras! Qualquer função pode ser chamada diretamente em *linguagem natural* (ex: _'parto dilatação 7'_, _'drogas vasoativas 70kg'_, _'prenatal dum 10/05'_).\n\n" +
    "Para filtrar por especialidade, digite `/ajuda <especialidade>` ou toque nos botões:";

  var kbCompleto = {
    inline_keyboard: (kb && kb.inline_keyboard ? kb.inline_keyboard.slice() : []).concat([
      [
        { text: "🔙 Central de Ajuda", callback_data: "ux:ajuda:menu" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ])
  };

  if (typeof enviarTelaBot === "function") {
    return enviarTelaBot(chatId, manualCompleto, kbCompleto, messageId);
  }
  if (typeof enviarMensagemComTecladoParaChat === "function") {
    return enviarMensagemComTecladoParaChat(chatId, manualCompleto, kbCompleto);
  }
  return enviarMensagemParaChat(chatId, manualCompleto);
}

function enviarManual(chatId) {
  return enviarManualCompletoComandos(chatId, "");
}

/**
 * Trata o protocolo de Parada Cardiorrespiratória (PCR / ACLS) beira-leito
 */
function tratarComandoPcr(chatId, dadosPcr, messageId) {
  dadosPcr = (dadosPcr || "").trim();
  var dLow = dadosPcr.toLowerCase();
  var cache = CacheService.getScriptCache();

  // Caso 1: PCR na Gestante
  if (dLow.indexOf("gestant") !== -1 || dLow.indexOf("gravid") !== -1 || dLow.indexOf("materna") !== -1) {
    if (typeof PcrGestanteService !== "undefined" && typeof PcrGestanteService.avaliarPcrGestante === "function") {
      var mIg = dLow.match(/(\d{1,2})\s*s(?:em(?:anas?)?)?/i);
      var igVal = mIg ? parseInt(mIg[1], 10) : 28;
      var aval = PcrGestanteService.avaliarPcrGestante({
        idadeGestacionalSemanas: igVal,
        tempoPcrMinutos: 4,
        ritmoPcr: (dLow.indexOf("fv") !== -1 || dLow.indexOf("tv") !== -1) ? "FV" : "AESP",
        emUsoSulfatoMagnesio: dLow.indexOf("sulfato") !== -1 || dLow.indexOf("mgso4") !== -1,
        suspeitaToxicidadeAnestesicoLocal: dLow.indexOf("last") !== -1 || dLow.indexOf("anestes") !== -1 || dLow.indexOf("bupiv") !== -1,
        suspeitaHemorragia: dLow.indexOf("hemorr") !== -1 || dLow.indexOf("sangr") !== -1,
        suspeitaEmboliaAmniotica: dLow.indexOf("ela") !== -1 || dLow.indexOf("embolia") !== -1
      });
      var viaAereaGest = (aval.viaAerea && aval.viaAerea.recomendacao)
        ? aval.viaAerea.recomendacao
        : ((aval.viaAerea && aval.viaAerea.recomendacoes && aval.viaAerea.recomendacoes.length > 1)
          ? aval.viaAerea.recomendacoes[1]
          : "Intubação Orotraqueal (IOT) precoce");
      var txtGest = "🤰 *PCR NA GESTANTE: RESSUSCITAÇÃO CARDIOPULMONAR (ACLS MATERNO)*\n\n" +
        "🚨 *MANOBRA DULE MANDATÓRIA:*\n" +
        "• " + aval.dule.manobra + "\n" +
        "• _" + aval.dule.justificativaFisiologica + "_\n\n" +
        "⚡ *VIA AÉREA & ACESSO VENOSO:*\n" +
        "• " + viaAereaGest + " (Tubo 6.0 a 7.0 c/ cuff pelo edema de via aérea)\n" +
        "• Acesso venoso OBRIGATORIAMENTE ACIMA DO DIAFRAGMA (jugular, subclávia ou MS).\n\n" +
        "✂️ *CESARIANA DE RESSUSCITAÇÃO (PERIMORTEM):*\n" +
        "• Indicação se sem RCE até o *4º MINUTO* de RCP para parto no *5º MINUTO*.\n" +
        "• Objetivo primário: descompressão aortocaval em 100% para salvar a gestante.\n" +
        "• Realizar no próprio leito da PCR, sem transporte para centro cirúrgico!";
      if (aval.antidotos && aval.antidotos.length > 0) {
        txtGest += "\n\n💊 *ANTÍDOTO DE EMERGÊNCIA:*\n";
        for (var ia = 0; ia < aval.antidotos.length; ia++) {
          txtGest += "• *" + aval.antidotos[ia].condicao + ":* " + aval.antidotos[ia].antidoto + " — " + aval.antidotos[ia].posologia + "\n";
        }
      }
      var ckGest = Utilities.getUuid().replace(/-/g, "");
      safePutCache(cache, ckGest, txtGest, 21600);
      var kbGest = {
        inline_keyboard: [
          [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckGest }],
          [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
          [{ text: "💊 MgSO4 / Gluconato", callback_data: "pcr_gest_sulfato" }, { text: "✂️ Cesariana 4 min", callback_data: "pcr_gest_cesarea" }],
          [{ text: "👶 PALS Pediátrico", callback_data: "pcr_pals" }],
          [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
        ]
      };
      if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtGest, kbGest, messageId);
      return enviarMensagemComTecladoParaChat(chatId, txtGest, kbGest);
    }
  }

  // Caso 2: Pediátrico
  if (dLow.indexOf("ped") !== -1 || dLow.indexOf("pals") !== -1 || dLow.indexOf("crianca") !== -1) {
    var mPesoPals = dLow.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)?/i);
    var pesoPalsVal = mPesoPals ? parseFloat(mPesoPals[1].replace(",", ".")) : null;
    var txtPals = "";
    if (pesoPalsVal !== null && pesoPalsVal > 0 && pesoPalsVal <= 80) {
      var choque1 = Math.round(pesoPalsVal * 2);
      var choque2 = Math.min(Math.round(pesoPalsVal * 4), 200);
      var adrenaMg = (pesoPalsVal * 0.01).toFixed(2);
      var adrenaMl = (pesoPalsVal * 0.1).toFixed(1);
      var amioMg = Math.min(Math.round(pesoPalsVal * 5), 300);
      txtPals = "👶 *SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (PALS — PCR " + pesoPalsVal + " KG)*\n\n" +
        "⚡ *DESFIBRILAÇÃO (RITMOS CHOCÁVEIS):*\n" +
        "• *1º Choque (2 J/kg):* *" + choque1 + " Joules*\n" +
        "• *2º Choque e seguintes (4 J/kg):* *" + choque2 + " Joules* (máx 10 J/kg ou 200 J)\n\n" +
        "💉 *FARMACOTERAPIA POR PESO (" + pesoPalsVal + " kg):*\n" +
        "• *Adrenalina 0,01 mg/kg (1:10.000):* *" + adrenaMg + " mg* (*" + adrenaMl + " mL*) IV/IO a cada 3 a 5 min.\n" +
        "• *Amiodarona 5 mg/kg:* *" + amioMg + " mg* IV/IO em bólus rápido (até 3 doses).\n" +
        "• *Lidocaína (alternativa):* " + (pesoPalsVal * 1).toFixed(1) + " mg IV/IO (1 mg/kg).\n\n" +
        "🖐️ *COMPRESSÕES & VENTILAÇÃO:*\n" +
        "• Frequência 100-120 cpm, profundidade 1/3 do diâmetro AP (~" + (pesoPalsVal < 10 ? "4 cm" : "5 cm") + ").\n" +
        "• Relação 15:2 com 2 socorristas ou contínua 1 vent a cada 2-3s após via aérea.";
    } else {
      txtPals = "👶 *SUPORTE AVANÇADO DE VIDA PEDIÁTRICO (PALS — PCR)*\n\n" +
        "• *Compressões:* 100-120 cpm, 1/3 do diâmetro AP (4 cm lactente, 5 cm criança).\n" +
        "• *Relação Compressão-Ventilação:* 15:2 (com 2 socorristas) ou contínua 1 vent a cada 2-3s após via aérea.\n" +
        "• *Desfibrilação:* 2 J/kg (1º choque) ➔ 4 J/kg (2º choque e subsequentes, máx 10 J/kg).\n" +
        "• *Adrenalina:* 0,01 mg/kg (0,1 mL/kg da solução 1:10.000) IV/IO q3-5 min.\n" +
        "• *Amiodarona:* 5 mg/kg em bólus IV/IO (até 3 doses) para FV/TV sem pulso refratária.\n\n" +
        "💡 *Para doses por peso exato:* envie `/pals <pesoKg>` (ex: `/pals 14`) ou toque nos botões abaixo:";
    }
    var ckPals = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckPals, txtPals, 21600);
    var kbPals = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckPals }],
        [{ text: "👶 PALS 10 kg", callback_data: "pals_10kg" }, { text: "👶 PALS 20 kg", callback_data: "pals_20kg" }],
        [{ text: "⚡ Ritmo Chocável", callback_data: "pcr_chocavel" }, { text: "🫀 Não Chocável", callback_data: "pcr_naochocavel" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtPals, kbPals, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtPals, kbPals);
  }

  // Caso 3: Ritmo Não Chocável (AESP / Assistolia)
  if (dLow.indexOf("aesp") !== -1 || dLow.indexOf("assistolia") !== -1 || dLow.indexOf("nao chocavel") !== -1 || dLow.indexOf("não chocável") !== -1) {
    var txtNaoChoc = "🫀 *PCR: RITMO NÃO CHOCÁVEL (AESP / ASSISTOLIA) — PROTOCOLO ACLS*\n\n" +
      "1️⃣ *RCP DE ALTA QUALIDADE IMEDIATA:*\n" +
      "• Compressões 100-120 cpm, profundidade 5-6 cm, retorno total do tórax.\n" +
      "• Se Assistolia: confirmar pelo *Protocolo da Linha Reta* (cabos conectados, ganho no máximo e trocar derivação).\n\n" +
      "2️⃣ *FARMACOTERAPIA IMEDIATA:*\n" +
      "• *Adrenalina 1 mg IV/IO* o mais rápido possível! Repetir a cada 3 a 5 min.\n" +
      "• NÃO aplicar choque! O choque na assistolia/AESP lesiona o miocárdio sem benefício.\n\n" +
      "3️⃣ *INVESTIGAÇÃO MANDATÓRIA DOS 5 Hs E 5 Ts:*\n" +
      "• *Hipovolemia:* Prova de carga volêmica rápida com SF 0.9% ou RL.\n" +
      "• *Hipóxia:* Checar fixação e expansibilidade do tubo endotraqueal.\n" +
      "• *Hidrogênio (Acidose):* Ventilação adequada e Bicarbonato 1 mEq/kg se acidose prévia.\n" +
      "• *Hipo/Hipercalemia:* Gluconato de Cálcio 10% 20 mL IV se suspeita de hipercalemia.\n" +
      "• *Hipotermia:* Aquecimento ativo.\n" +
      "• *Tensão no Tórax (Pneumotórax):* Descompressão torácica por agulha / toracostomia.\n" +
      "• *Tamponamento Cardíaco:* Pericardiocentese de alívio.\n" +
      "• *Toxinas:* Naloxona (opioides), Flumazenil, etc.\n" +
      "• *Trombose Pulmonar (TEP maciço):* Considerar trombolítico (Alteplase) se forte suspeita.\n" +
      "• *Trombose Coronariana (IAM):* Ponte para ICP após retorno da circulação espontânea (RCE).";
    var ckNaoChoc = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckNaoChoc, txtNaoChoc, 21600);
    var kbNaoChoc = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckNaoChoc }],
        [
          { text: "⚡ Mudar p/ Ritmo Chocável", callback_data: "pcr_chocavel" },
          { text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" }
        ],
        [
          { text: "⏱️ Ciclo RCP 2 min", callback_data: "pcr_ciclo_2min" },
          { text: "🔍 Checklist 5Hs & 5Ts", callback_data: "pcr_5hs_5ts" }
        ],
        [
          { text: "🎯 Cuidados Pós-RCE", callback_data: "pcr_pos_rce" },
          { text: "🤰 PCR Gestante", callback_data: "pcr_gestante" }
        ],
        [
          { text: "👶 PALS Pediátrico", callback_data: "pcr_pals" }
        ],
        [
          { text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtNaoChoc, kbNaoChoc, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtNaoChoc, kbNaoChoc);
  }

  // Caso 4: Ritmo Chocável (FV / TVSP)
  if ((dLow.indexOf("fv") !== -1 || dLow.indexOf("tv") !== -1 || dLow.indexOf("chocavel") !== -1 || dLow.indexOf("chocável") !== -1) &&
      dLow.indexOf("nao chocavel") === -1 && dLow.indexOf("não chocável") === -1) {
    var txtChoc = "⚡ *PCR: RITMO CHOCÁVEL (FV / TV SEM PULSO) — PROTOCOLO ACLS*\n\n" +
      "1️⃣ *DESFIBRILAÇÃO IMEDIATA:*\n" +
      "• Choque Bifásico: *200 J* (ou carga máxima do aparelho) / Monofásico: *360 J*.\n" +
      "• Retomar RCP imediatamente por 2 minutos (NÃO checar pulso pós-choque imediato).\n\n" +
      "2️⃣ *CICLO 2 (Pós-2º Choque):*\n" +
      "• *Adrenalina 1 mg IV/IO* em bólus + flush 20 mL SF 0.9% (repetir a cada 3 a 5 min).\n" +
      "• Obter acesso IV/IO e considerar via aérea avançada (EtCO₂).\n\n" +
      "3️⃣ *CICLO 3 (Pós-3º Choque — FV/TV Refratária):*\n" +
      "• *Amiodarona 300 mg IV/IO* em bólus rápido (2ª dose: 150 mg após 2 ciclos).\n" +
      "• _Alternativa à Amiodarona:_ Lidocaína 1 a 1,5 mg/kg IV/IO (2ª dose: 0,5 a 0,75 mg/kg).\n" +
      "• Sulfato de Magnésio 50% 2g IV em 1-2 min se suspeita de *Torsades de Pointes*.\n\n" +
      "4️⃣ *INVESTIGAR CAUSAS REVERSÍVEIS (5 Hs & 5 Ts)*";
    var ckChoc = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckChoc, txtChoc, 21600);
    var kbChoc = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckChoc }],
        [
          { text: "💉 Adrenalina 1mg", callback_data: "pcr_droga_adrena" },
          { text: "💉 Amiodarona", callback_data: "pcr_droga_amiodarona" }
        ],
        [
          { text: "⏱️ Ciclo RCP 2 min", callback_data: "pcr_ciclo_2min" },
          { text: "🔍 5Hs & 5Ts", callback_data: "pcr_5hs_5ts" }
        ],
        [
          { text: "🎯 Cuidados Pós-RCE", callback_data: "pcr_pos_rce" },
          { text: "🫀 Mudar p/ Não Chocável", callback_data: "pcr_naochocavel" }
        ],
        [
          { text: "🤰 PCR Gestante", callback_data: "pcr_gestante" },
          { text: "👶 PALS Pediátrico", callback_data: "pcr_pals" }
        ],
        [
          { text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtChoc, kbChoc, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtChoc, kbChoc);
  }

  // Padrão (Sem argumentos ou geral): Visão Geral de ACLS + Seletor de Ritmo
  var txtPadrao = "🚨 *PARADA CARDIORRESPIRATÓRIA (PCR ADULTO — ALGORITMO ACLS)*\n\n" +
    "1. *Checar responsividade e respiração/pulso carotídeo* (máx 10 segundos).\n" +
    "2. *Iniciar RCP de alta qualidade:* 30:2 ou contínua com tubo (100-120 cpm, 5-6 cm).\n" +
    "3. *Conectar monitor/desfibrilador e identificar o ritmo:*";
  var ckPadrao = Utilities.getUuid().replace(/-/g, "");
  safePutCache(cache, ckPadrao, txtPadrao, 21600);
  var kbPadrao = {
    inline_keyboard: [
      [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckPadrao }],
      [
        { text: "⚡ Ritmo Chocável (FV / TVSP)", callback_data: "pcr_chocavel" },
        { text: "🫀 Não Chocável (AESP / Assistolia)", callback_data: "pcr_naochocavel" }
      ],
      [
        { text: "💉 Drogas ACLS", callback_data: "pcr_droga_adrena" },
        { text: "🔍 5Hs & 5Ts", callback_data: "pcr_5hs_5ts" }
      ],
      [
        { text: "🤰 PCR na Gestante", callback_data: "pcr_gestante" },
        { text: "👶 PALS Pediátrico", callback_data: "pcr_pals" }
      ],
      [
        { text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };
  if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtPadrao, kbPadrao, messageId);
  return enviarMensagemComTecladoParaChat(chatId, txtPadrao, kbPadrao);
}

/**
 * Trata o protocolo de Arritmias Cardíacas (ACLS) beira-leito
 */
function tratarComandoArritmia(chatId, comando, dadosArr, messageId) {
  if (typeof dadosArr === "undefined" && comando && comando.charAt(0) !== "/") {
    dadosArr = comando;
    comando = "/arritmia";
  }
  comando = (comando || "/arritmia").toLowerCase();
  dadosArr = (dadosArr || "").trim();
  var dLow = dadosArr.toLowerCase();
  var cache = CacheService.getScriptCache();

  // 1. Identificação de Bradicardias
  var ehBradi = comando === "/bradiarritmia" || comando === "/bradicardia" ||
                dLow.indexOf("bradi") !== -1 || dLow.indexOf("bav") !== -1 ||
                dLow.indexOf("bloqueio") !== -1 || dLow.indexOf("atropina") !== -1 ||
                dLow.indexOf("marcapasso") !== -1;

  if (ehBradi) {
    var txtBradi = "🐢 *BRADIARRITMIAS & BLOQUEIOS ATRIOVENTRICULARES (ACLS)*\n\n" +
      "1️⃣ *ESTRATIFICAÇÃO DE INSTABILIDADE (SINAIS DE GRAVIDADE / 4D):*\n" +
      "• Hipotensão arterial (PAS < 90 / PAM < 65 mmHg) ou choque.\n" +
      "• Alteração aguda do estado mental / confusão mental / síncope.\n" +
      "• Sinais de choque ou má perfusão tecidual periférica.\n" +
      "• Desconforto torácico isquêmico (angina / IAM).\n" +
      "• Insuficiência cardíaca aguda / edema agudo de pulmão (EAP).\n\n" +
      "2️⃣ *CONDUTA FARMACOLÓGICA (1ª LINHA):*\n" +
      "• *Atropina 1 mg IV/IO* em bólus direto rápido (repetir a cada 3 a 5 min até dose máxima cumulativa de *3 mg*).\n" +
      "• ⚠️ *ALERTA CRÍTICO DE SEGURANÇA:* A Atropina é *ineficaz em BAV avançado* (BAV de 2º grau Mobitz II e BAV de 3º grau / BAVT com QRS largo infra-hissiano) e em pacientes com transplante cardíaco (coração desnervado). NÃO atrasar o suporte elétrico nesses cenários!\n\n" +
      "3️⃣ *SE MÁ RESPOSTA / INSTÁVEL (2ª LINHA):*\n" +
      "• *Marcapasso Transcutâneo (MPTC)* imediato: posicionar pás, analgesia/sedação se consciente, ligar modo demanda, titular corrente (mA) até captura elétrica e conferir pulso mecânico.\n" +
      "• *Dopamina IV:* infusão contínua de 5 a 20 mcg/kg/min.\n" +
      "• *Adrenalina IV:* infusão contínua de 2 a 10 mcg/min (titular para FC > 50 bpm e PAM ≥ 65).\n" +
      "• Preparar passagem de Marcapasso Transvenoso (MPTV) e acionar Cardiologia.";

    var ckBradi = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckBradi, txtBradi, 21600);
    var kbBradi = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckBradi }],
        [{ text: "🚨 Instável (CVE Sincronizada)", callback_data: "arritmia_instavel" }],
        [{ text: "⚡ TSV (Taqui Supra)", callback_data: "arritmia_tsv" }, { text: "🫀 TV Monomórfica", callback_data: "arritmia_tv" }],
        [{ text: "🫀 FA / Flutter", callback_data: "arritmia_fa" }, { text: "⚡ Protocolo PCR", callback_data: "pcr_chocavel" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtBradi, kbBradi, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtBradi, kbBradi);
  }

  // 2. Identificação de Instabilidade Hemodinâmica (Critérios 4D / Choque / Dor)
  var ehInstavel = dLow.indexOf("instavel") !== -1 || dLow.indexOf("instável") !== -1 ||
                   dLow.indexOf("choque") !== -1 || dLow.indexOf("dor") !== -1 ||
                   dLow.indexOf("hipotens") !== -1 || dLow.indexOf("eap") !== -1 ||
                   dLow.indexOf("desmaio") !== -1 || dLow.indexOf("sincope") !== -1 ||
                   dLow.indexOf("síncope") !== -1;

  if (ehInstavel) {
    var txtInstavel = "🚨 *ARRITMIA INSTÁVEL — CONDUTA: CARDIOVERSÃO ELÉTRICA (CVE) SINCRONIZADA IMEDIATA*\n\n" +
      "⚠️ *CRITÉRIOS DE INSTABILIDADE (OS 4D / 5D DO ACLS):*\n" +
      "1. *Dor Torácica Isquêmica* (angina, IAM em curso).\n" +
      "2. *Dispneia Aguda / EAP* (congestão pulmonar aguda grave).\n" +
      "3. *Diminuição do Nível de Consciência* (rebaixamento, sonolência, síncope).\n" +
      "4. *Diminuição da PA / Choque* (hipotensão PAS < 90 / PAM < 65, TEC > 3s).\n\n" +
      "⚡ *PROTOCOLO DE CARDIOVERSÃO ELÉTRICA SINCRONIZADA:*\n" +
      "• *1. Sincronização Obrigatória:* Apertar o botão *SYNC* no cardioversor e confirmar que a marcação/marcador coincida com a onda R.\n" +
      "• *2. Sedação e Analgesia Rápida (se tempo hábil e consciente):* Fentanil 1 mcg/kg (ou 50-100 mcg) + Etomidato 0,2-0,3 mg/kg IV ou Midazolam 3-5 mg IV.\n" +
      "• *3. Cargas Recomendadas (Bifásico):*\n" +
      "  - *QRS Estreito e Regular (TSV / Flutter Atrial):* 50 a 100 J.\n" +
      "  - *QRS Estreito e Irregular (Fibrilação Atrial RVR):* 120 a 200 J.\n" +
      "  - *QRS Largo e Regular (TV Monomórfica com Pulso):* 100 J.\n" +
      "  - *QRS Largo e Irregular (TV Polimórfica / Torsades):* Choque de *Desfibrilação Assincrônica 200 J* (NÃO sincronizar!).\n\n" +
      "🚨 *Se o paciente evoluir para inconsciência sem pulso:* Desfibrilação 200 J imediata e iniciar RCP (/pcr tv)!";

    var ckInstavel = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckInstavel, txtInstavel, 21600);
    var kbInstavel = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckInstavel }],
        [{ text: "⚡ TSV (Supra)", callback_data: "arritmia_tsv" }, { text: "🫀 TV Monomórfica", callback_data: "arritmia_tv" }],
        [{ text: "🫀 FA / Flutter", callback_data: "arritmia_fa" }, { text: "🐢 Bradicardia", callback_data: "arritmia_bradi" }],
        [{ text: "⚡ TV sem pulso (PCR)", callback_data: "pcr_chocavel" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtInstavel, kbInstavel, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtInstavel, kbInstavel);
  }

  // 3. Taquicardia Ventricular (TV Monomórfica com Pulso)
  var ehTv = dLow.indexOf("tv") !== -1 || dLow.indexOf("ventricular") !== -1 ||
             dLow.indexOf("monomorf") !== -1 || dLow.indexOf("largo") !== -1;

  if (ehTv) {
    var txtTv = "🫀 *TAQUICARDIA VENTRICULAR MONOMÓRFICA COM PULSO (ESTÁVEL)*\n\n" +
      "1️⃣ *ESTABILIDADE HEMODINÂMICA:*\n" +
      "• Paciente vigil, lúcido, sem dor no peito, sem EAP e sem choque.\n" +
      "• ⚠️ *Se instabilizar a qualquer momento:* realizar imediatamente *Cardioversão Elétrica Sincronizada (CVE) com 100 J* (bifásico)!\n\n" +
      "2️⃣ *CONDUTA FARMACOLÓGICA (PACIENTE ESTÁVEL):*\n" +
      "• *Amiodarona 150 mg IV:* diluída em 100 mL de Solução Glicosada 5% (SG 5%) infundida em *10 minutos*.\n" +
      "• Se a arritmia persistir, pode-se repetir 1 bólus adicional de 150 mg em 10 min.\n" +
      "• *Manutenção contínua na BIC:* 1 mg/min nas primeiras 6 horas (360 mg) ➔ 0,5 mg/min nas 18 horas seguintes (540 mg) — dose total máxima de 2,2 g em 24h.\n" +
      "• *Alternativa (Lidocaína):* 1 a 1,5 mg/kg IV em bólus lento (pode repetir 0,5 a 0,75 mg/kg a cada 5-10 min, máx 3 mg/kg).\n" +
      "• Se ritmo polimórfico / suspeita de Torsades de Pointes: *Sulfato de Magnésio 50% 2 g IV* em 1 a 2 min.\n\n" +
      "🚨 *Se ausência de pulso carotídeo:* Tratar imediatamente como PCR chocável (/pcr tv — Desfibrilação 200 J)!";

    var ckTv = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckTv, txtTv, 21600);
    var kbTv = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckTv }],
        [{ text: "🚨 Se Instável: CVE 100 J", callback_data: "arritmia_instavel" }],
        [{ text: "⚡ TSV (Supra)", callback_data: "arritmia_tsv" }, { text: "🫀 FA / Flutter", callback_data: "arritmia_fa" }],
        [{ text: "⚡ TV sem pulso (PCR)", callback_data: "pcr_chocavel" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtTv, kbTv, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtTv, kbTv);
  }

  // 4. Taquicardia Supraventricular (TSV / QRS Estreito Regular)
  var ehTsv = dLow.indexOf("tsv") !== -1 || dLow.indexOf("supra") !== -1 ||
              dLow.indexOf("estreito") !== -1 || dLow.indexOf("reentrada") !== -1 ||
              comando === "/taquiarritmia" || comando === "/taquicardia";

  if (ehTsv && dLow.indexOf("fa") === -1 && dLow.indexOf("flutter") === -1) {
    var txtTsv = "⚡ *TAQUICARDIA SUPRAVENTRICULAR PAROXÍSTICA (TSV / TRN — ACLS)*\n\n" +
      "1️⃣ *ESTABILIDADE CLÍNICA:*\n" +
      "• Se apresentar dor torácica, EAP, hipotensão ou confusão mental: *Cardioversão Elétrica Sincronizada (CVE) imediata com 50 a 100 J*.\n\n" +
      "2️⃣ *1ª LINHA NÃO FARMACOLÓGICA (PACIENTE ESTÁVEL):*\n" +
      "• *Manobra de Valsalva Modificada (Protocolo REVERT):*\n" +
      "  - Paciente semi-sentado (45º) sopra com força no bocal de uma seringa de 20 mL por *15 segundos* (pressão ~40 mmHg).\n" +
      "  - Imediatamente deitar o paciente em decúbito dorsal e elevar passivamente os membros inferiores a 45º por *45 segundos*.\n" +
      "  - Taxa de reversão comprovada superior a 40%!\n\n" +
      "3️⃣ *2ª LINHA FARMACOLÓGICA (SE FALHA DA MANOBRA):*\n" +
      "• *Adenosina 6 mg IV em bólus super rápido (push):* aplicar em veia calibrosa antecubital, seguido IMEDIATAMENTE de *flush de 20 mL de SF 0.9%* e elevação rápida do braço.\n" +
      "• Monitorização contínua com ECG rodando (alerta para breve assistolia transitória fisiológica).\n" +
      "• Se não reverter em 1 a 2 minutos: aplicar *2ª dose de Adenosina 12 mg IV push* + flush de 20 mL SF 0.9%.\n" +
      "• *Alternativas se refratária:* Diltiazem 0,25 mg/kg IV em 2 min ou Verapamil 2,5 a 5 mg IV ou Metoprolol 5 mg IV lento.";

    var ckTsv = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckTsv, txtTsv, 21600);
    var kbTsv = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckTsv }],
        [{ text: "🚨 Se Instável: CVE 50-100J", callback_data: "arritmia_instavel" }],
        [{ text: "🫀 TV Monomórfica", callback_data: "arritmia_tv" }, { text: "🫀 FA / Flutter", callback_data: "arritmia_fa" }],
        [{ text: "🐢 Bradicardias", callback_data: "arritmia_bradi" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtTsv, kbTsv, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtTsv, kbTsv);
  }

  // 5. Fibrilação Atrial e Flutter
  if (dLow.indexOf("fa") !== -1 || dLow.indexOf("flutter") !== -1 || dLow.indexOf("fibrilacao") !== -1 || dLow.indexOf("fibrilação") !== -1) {
    var txtFa = "🫀 *FIBRILAÇÃO ATRIAL (FA) & FLUTTER COM ALTA RESPOSTA VENTRICULAR (RVR)*\n\n" +
      "1️⃣ *ESTABILIDADE:*\n" +
      "• Se instável (dor, choque, síncope, EAP): *CVE sincronizada imediata* (FA: 120-200 J bifásico; Flutter: 50-100 J bifásico).\n\n" +
      "2️⃣ *CONTROLE DE FREQUÊNCIA CARDÍACA (ALVO FC < 110 bpm):*\n" +
      "• *Beta-bloqueador:* Metoprolol 5 mg IV lento (a cada 5 min, máx 15 mg) se FE normal e sem broncoespasmo.\n" +
      "• *Bloqueador dos Canais de Cálcio:* Diltiazem 0,25 mg/kg IV em 2 min (máx 20 mg).\n" +
      "• *IC com FE Reduzida / Descompensada:* Amiodarona 150 mg a 300 mg IV ou Digoxina 0,25 a 0,5 mg IV lento. (Contraindicado Diltiazem/Verapamil em IC descompensada!).\n\n" +
      "3️⃣ *ESTRATIFICAÇÃO TROMBOEMBÓLICA & ANTICOAGULAÇÃO:*\n" +
      "• Avaliar tempo de início: < 48 horas vs > 48 horas (ou tempo indeterminado).\n" +
      "• Se > 48h: cardioversão química/elétrica eletiva requer 3 semanas prévias de anticoagulação plena ou ECO transesofágico livre de trombos atriais.\n" +
      "• Calcular *CHA2DS2-VASc* para indicação de anticoagulação oral crônica (DOACs preferenciais).";

    var ckFa = Utilities.getUuid().replace(/-/g, "");
    safePutCache(cache, ckFa, txtFa, 21600);
    var kbFa = {
      inline_keyboard: [
        [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckFa }],
        [{ text: "🚨 Se Instável: CVE", callback_data: "arritmia_instavel" }],
        [{ text: "⚡ TSV (Supra)", callback_data: "arritmia_tsv" }, { text: "🫀 TV Monomórfica", callback_data: "arritmia_tv" }],
        [{ text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtFa, kbFa, messageId);
    return enviarMensagemComTecladoParaChat(chatId, txtFa, kbFa);
  }

  // 6. Guia Geral de Arritmias Cardíacas (ACLS)
  var txtGuiaArr = "⚡ *ARRITMIAS CARDÍACAS NA EMERGÊNCIA (ALGORITMO ACLS)*\n\n" +
    "1. *AVALIAÇÃO DE INSTABILIDADE (CRITÉRIOS 4D):*\n" +
    "• Dor torácica isquêmica / Dispneia aguda (EAP) / Diminuição da consciência / Diminuição da PA (choque).\n" +
    "• 🚨 *Se Instável:* Cardioversão Elétrica (CVE) Sincronizada Imediata!\n\n" +
    "2. *SE PACIENTE ESTÁVEL — CLASSIFICAR O RITMO AO ECG:*\n" +
    "• *Taquicardia Supraventricular (TSV):* QRS estreito regular ➔ Valsalva Modificada ➔ Adenosina 6mg / 12mg.\n" +
    "• *Taquicardia Ventricular (TV Monomórfica):* QRS largo regular ➔ Amiodarona 150mg em 10 min ➔ CVE se instabilizar.\n" +
    "• *Fibrilação Atrial / Flutter:* QRS estreito irregular ➔ Controle de frequência (Beta-bloqueador / Diltiazem) e anticoagulação.\n" +
    "• *Bradicardia / BAV:* FC < 50 bpm ➔ Atropina 1mg (máx 3mg) ➔ Marcapasso transcutâneo / Dopamina / Adrenalina se BAV avançado ou má resposta.\n\n" +
    "Toque no botão correspondente para abrir o protocolo beira-leito:";

  var ckGuiaArr = Utilities.getUuid().replace(/-/g, "");
  safePutCache(cache, ckGuiaArr, txtGuiaArr, 21600);
  var kbGuiaArr = {
    inline_keyboard: [
      [{ text: "📋 Copiar para Prontuário", callback_data: "ux:copiar:" + ckGuiaArr }],
      [
        { text: "🚨 Paciente Instável (4D / CVE)", callback_data: "arritmia_instavel" }
      ],
      [
        { text: "⚡ Taquicardia Supra (TSV)", callback_data: "arritmia_tsv" },
        { text: "🫀 TV Monomórfica", callback_data: "arritmia_tv" }
      ],
      [
        { text: "🫀 FA / Flutter (RVR)", callback_data: "arritmia_fa" },
        { text: "🐢 Bradicardias & BAV", callback_data: "arritmia_bradi" }
      ],
      [
        { text: "🔙 Sala Vermelha", callback_data: "ux:hub:sala" },
        { text: "🏠 Início", callback_data: "ux:hub:inicio" }
      ]
    ]
  };

  if (typeof enviarTelaBot === "function") return enviarTelaBot(chatId, txtGuiaArr, kbGuiaArr, messageId);
  return enviarMensagemComTecladoParaChat(chatId, txtGuiaArr, kbGuiaArr);
}

/**
 * Trata o módulo de Distúrbios Hidroeletrolíticos (DHE - Sódio & Potássio)
 */
function tratarComandoDhe(chatId, dadosDhe) {
  dadosDhe = (dadosDhe || "").trim();
  if (!dadosDhe) {
    var txtGuiaDhe = "🧪 *DISTÚRBIOS HIDROELETROLÍTICOS (DHE) — GUIA BEIRA-LEITO*\n\n" +
      "Selecione uma calculadora rápida nos botões ou envie os dados clínicos:\n\n" +
      "• 💧 *Hiponatremia (Adrogué-Madias):* `/dhe na 118 peso 60 f 72`\n" +
      "• 🌵 *Hipernatremia (Água Livre):* `/dhe na 164 peso 70 m`\n" +
      "• ⚡ *Hipercalemia (ECG & Cardioproteção):* `/dhe k 7.4 ecg` ou `/dhe k 8.2`";
    var kbDhe = {
      inline_keyboard: [
        [
          { text: "💧 Hiponatremia (Adrogué-Madias)", callback_data: "dhe_hipo" },
          { text: "🌵 Hipernatremia (Água Livre)", callback_data: "dhe_hiper" }
        ],
        [
          { text: "⚡ Hipercalemia & ECG", callback_data: "dhe_k" },
          { text: "🩸 Gasometria Arterial", callback_data: "ux:iniciar:gaso" }
        ],
        [
          { text: "🔙 Voltar ao Menu", callback_data: "ux:menu" },
          { text: "🏠 Início", callback_data: "ux:hub:inicio" }
        ]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, txtGuiaDhe, kbDhe);
  }

  if (typeof NefrologiaDheService === "undefined") {
    return enviarMensagemParaChat(chatId, "⚠️ Módulo NefrologiaDheService temporariamente indisponível.");
  }

  var dLow = dadosDhe.toLowerCase();

  // 1. Hipercalemia / Potássio
  var mK = dLow.match(/(?:k|potassio|potássio)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  if (mK || dLow.indexOf("hipercalemia") !== -1) {
    var kVal = mK ? parseFloat(mK[1].replace(",", ".")) : parseFloat((dLow.match(/\d+(?:[.,]\d+)?/) || [6.5])[0].replace(",", "."));
    var ecgAlt = dLow.indexOf("ecg") !== -1 || dLow.indexOf("onda t") !== -1 || dLow.indexOf("apiculad") !== -1;
    var resK = NefrologiaDheService.avaliarHipercalemia(kVal, ecgAlt);
    if (resK.erro) return enviarMensagemParaChat(chatId, "⚠️ " + resK.erro);

    var txtK = "⚡ *MANEJO EMERGENCIAL DE HIPERCALEMIA (SBC / KDIGO)*\n\n" +
      "🔴 *ESTRATIFICAÇÃO & GRAVIDADE:*\n" +
      "• *Potássio Sérico:* " + resK.potassio + " mEq/L\n" +
      "• *Classificação:* *" + resK.gravidade + "*\n\n";
    if (resK.alerta) {
      txtK += "⚠️ *" + resK.alerta + "*\n\n";
    }
    txtK += "📋 *CONDUTAS IMEDIATAS:*\n";
    for (var ik = 0; ik < resK.condutas.length; ik++) {
      txtK += "• " + resK.condutas[ik] + "\n";
    }
    txtK += "\nℹ️ *MONITORIZAÇÃO:* ECG contínuo na Sala Vermelha e repetir dosagem de K+ em 2h.";
    if (resK.prescricaoPEP) {
      txtK += "\n\n📋 *PRESCRIÇÃO SUGERIDA (PEP):*\n```\n" + resK.prescricaoPEP + "\n```";
    }
    return enviarMensagemParaChat(chatId, txtK);
  }

  // 2. Extração de Sódio, Peso, Sexo, Idade
  var mNa = dLow.match(/(?:na|sodio|sódio)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  var mPeso = dLow.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilos?)/i) || dLow.match(/peso\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  var mIdade = dLow.match(/(\d{1,3})\s*(?:a|anos?)/i) || dLow.match(/idade\s*[:=]?\s*(\d{1,3})/i);
  var mSexo = dLow.match(/\b(fem|feminino|mulher|f|masc|masculino|homem|m)\b/i);

  var naNum = mNa ? parseFloat(mNa[1].replace(",", ".")) : null;
  var pesoNum = mPeso ? parseFloat(mPeso[1].replace(",", ".")) : 70;
  var idadeNum = mIdade ? parseInt(mIdade[1], 10) : 45;
  var sexoStr = (mSexo && (mSexo[1].startsWith("f") || mSexo[1] === "mulher")) ? "f" : "m";

  // Se Na não foi explicitado com 'na', pega o primeiro número isolado
  if (naNum === null) {
    var nums = dLow.match(/\d+(?:[.,]\d+)?/g);
    if (nums && nums.length > 0) {
      naNum = parseFloat(nums[0].replace(",", "."));
      if (nums.length > 1 && !mPeso) pesoNum = parseFloat(nums[1].replace(",", "."));
    }
  }

  if (naNum === null) {
    return enviarMensagemParaChat(chatId, "⚠️ Sódio não identificado. Informe o sódio sérico. Ex: `/dhe na 118 peso 60 f`");
  }

  // Hipernatremia (Na > 145)
  if (naNum > 145 || dLow.indexOf("hipernatremia") !== -1 || dLow.indexOf("agua livre") !== -1) {
    var resHiper = NefrologiaDheService.calcularDeficitAguaLivre(naNum, pesoNum, sexoStr, idadeNum);
    if (resHiper.erro) return enviarMensagemParaChat(chatId, "⚠️ " + resHiper.erro);

    var txtHiper = "🌵 *HIPERNATREMIA — DÉFICIT DE ÁGUA LIVRE (ADROGUÉ-MADIAS)*\n\n" +
      "🔴 *DADOS DO PACIENTE:*\n" +
      "• Sódio Atual: *" + naNum + " mEq/L* | Peso: " + pesoNum + " kg (" + (sexoStr === "f" ? "Fem" : "Masc") + ", " + idadeNum + "a)\n" +
      "• Água Corporal Total (ACT): *" + resHiper.act + " L*\n\n" +
      "💧 *DÉFICIT DE ÁGUA LIVRE CALCULADO:*\n" +
      "• Déficit Total: *" + resHiper.deficitAguaLivreLitros + " Litros* de água livre\n\n" +
      "📋 *PRESCRIÇÃO & PLANO DE REPOSIÇÃO:*\n" +
      "• *Meta de Queda:* Redução lenta de no máximo *8 a 10 mEq/L em 24 horas*.\n" +
      "• *Reposição 24h:* Administrar *" + (Math.round(resHiper.deficitAguaLivreLitros * 500)) + " mL* de SG 5% (ou água filtrada por SNE) nas primeiras 24h + perdas insensíveis.\n" +
      "• *Velocidade:* ~" + (Math.round((resHiper.deficitAguaLivreLitros * 500) / 24)) + " mL/h em BIC contínua.\n\n";
    if (resHiper.alertas && resHiper.alertas.length > 0) {
      txtHiper += "⚠️ *ALERTAS SENTINELA:*\n";
      for (var ah = 0; ah < resHiper.alertas.length; ah++) {
        txtHiper += "• " + resHiper.alertas[ah] + "\n";
      }
    }
    return enviarMensagemParaChat(chatId, txtHiper);
  }

  // Hiponatremia (Na <= 145, tipicamente < 135)
  var salinaUsada = (dLow.indexOf("0.9") !== -1 || dLow.indexOf("fisiologico") !== -1) ? 0.9 : 3;
  var resHipo = NefrologiaDheService.planejarCorrecaoHiponatremia(naNum, pesoNum, sexoStr, idadeNum, salinaUsada);
  if (resHipo.erro) return enviarMensagemParaChat(chatId, "⚠️ " + resHipo.erro);

  var solNome = salinaUsada === 3 ? "NaCl 3% (513 mEq/L)" : "NaCl 0,9% (154 mEq/L)";
  var vol24h = Math.round((8 / resHipo.variacaoNaPorLitro) * 1000);
  var txtHipo = "💧 *CORREÇÃO DE HIPONATREMIA (FÓRMULA DE ADROGUÉ-MADIAS)*\n\n" +
    "🔴 *DADOS CLÍNICOS:*\n" +
    "• Sódio Inicial: *" + naNum + " mEq/L* | Peso: " + pesoNum + " kg (" + (sexoStr === "f" ? "Fem" : "Masc") + ", " + idadeNum + "a)\n" +
    "• Solução Escolhida: *" + solNome + "*\n\n" +
    "📊 *VARIAÇÃO PREVISTA:*\n" +
    "• Elevação por cada 1.000 mL de " + solNome + ": *+" + resHipo.variacaoNaPorLitro + " mEq/L*\n\n" +
    "📋 *PRESCRIÇÃO BEIRA-LEITO (TETO MÁXIMO 8 mEq/L em 24h):*\n" +
    "• Volume Seguro 24h: *" + vol24h + " mL* de " + solNome + "\n" +
    "• Taxa de Infusão em BIC: *" + resHipo.taxaInfusaoMaxima24h_ml_h + " mL/h*\n\n" +
    "⚠️ *BLOQUEIO DE SEGURANÇA MANDATÓRIO:*\n" +
    "• " + resHipo.alerta + "\n" +
    "• Dosar sódio sérico a cada *2 a 4 horas* em fase aguda.";
  return enviarMensagemParaChat(chatId, txtHipo);
}

/**
 * Trata o comando /rotina e suas variações
 */
function tratarComandoRotina(chatId, argRotina) {
  var hoje = new Date();
  var tz = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TIMEZONE", "America/Sao_Paulo") : "America/Sao_Paulo";
  var arg = (argRotina || "").trim().toLowerCase();

  if (!arg) {
    var txtHubRotina = "🧭 *HUB DE ROTINA & PRODUTIVIDADE*\n\n" +
      "Selecione uma das opções abaixo para gerenciar seu dia, agenda e estudos, ou use comandos diretos:";
    return enviarMensagemComTecladoParaChat(chatId, txtHubRotina, construirTecladoHubRotina());
  }

  if (arg === "hoje") {
    var blocosHoje = RotinaService.obterBlocosDoDia(hoje);
    var txtHoje = "☀️ *ROTINA DO DIA (TIME-BLOCKING ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosHoje, hoje) +
      "\n\n💡 *Para ajustar:* Toque abaixo ou envie: _'Hoje treino às 19h'_ ou áudio gravado!";
    var kbHoje = RotinaService.construirTecladoTimeline(hoje, blocosHoje);
    return enviarMensagemComTecladoParaChat(chatId, txtHoje, kbHoje);
  }

  if (arg === "amanha" || arg === "amanhã") {
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n💡 *Para ajustar amanhã:* Envie: _'/rotina alterar amanhã <instrução>'_.";
    var kbAmanha = RotinaService.construirTecladoTimeline(amanha, blocosAmanha);
    return enviarMensagemComTecladoParaChat(chatId, txtAmanha, kbAmanha);
  }

  if (arg === "semana" || arg === "grade") {
    var resumoSemanal = RotinaService.obterResumoSemanal();
    var kbSemana = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    return enviarMensagemComTecladoParaChat(chatId, resumoSemanal, kbSemana);
  }

  if (arg === "reset" || arg === "restaurar" || arg === "padrao" || arg === "padrão") {
    var resReset = RotinaService.aplicarInstrucao(hoje, "reset");
    var txtReset = resReset.mensagem + "\n\n" +
      RotinaService.formatarTimelineMarkdown(resReset.blocos, hoje);
    var kbReset = RotinaService.construirTecladoTimeline(hoje, resReset.blocos);
    return enviarMensagemComTecladoParaChat(chatId, txtReset, kbReset);
  }

  if (arg === "descanso") {
    var resDesc = RotinaService.aplicarInstrucao(hoje, "modo descanso");
    var txtDesc = resDesc.mensagem + "\n\n" +
      RotinaService.formatarTimelineMarkdown(resDesc.blocos, hoje);
    var kbDesc = RotinaService.construirTecladoTimeline(hoje, resDesc.blocos);
    return enviarMensagemComTecladoParaChat(chatId, txtDesc, kbDesc);
  }

  var instrucao = argRotina.replace(/^alterar\s+/i, "").trim();
  var dataAlvo = hoje;
  if (/^amanh[aã]\s+/i.test(instrucao)) {
    dataAlvo = new Date(hoje.getTime() + 86400000);
    instrucao = instrucao.replace(/^amanh[aã]\s+/i, "").trim();
  }

  var resAjuste = RotinaService.aplicarInstrucao(dataAlvo, instrucao);
  var txtAjuste = resAjuste.mensagem + "\n\n" +
    RotinaService.formatarTimelineMarkdown(resAjuste.blocos, dataAlvo);
  var kbAjuste = RotinaService.construirTecladoTimeline(dataAlvo, resAjuste.blocos);
  return enviarMensagemComTecladoParaChat(chatId, txtAjuste, kbAjuste);
}

/**
 * Trata callbacks da rotina inline
 */
function tratarCallbackRotina(cb) {
  var data = cb.data || "";
  var chatId = (cb.message && cb.message.chat && cb.message.chat.id) ? cb.message.chat.id : cb.from.id;
  var msgId = cb.message ? cb.message.message_id : null;
  var token = (typeof ConfigService !== "undefined" && ConfigService.get) ? ConfigService.get("TELEGRAM_BOT_TOKEN") : "";
  var hoje = new Date();

  var partes = data.split(":");
  var subAcao = partes[1]; // check, skip, reset, descanso, cal_sync, ajustar, ver_amanha, ver_hoje
  var param = partes[2];

  if (subAcao === "check") {
    RotinaService.marcarStatusBloco(hoje, param, "concluido", "Concluído via Telegram");
    responderCallbackTelegram(cb.id, "✅ Bloco marcado como concluído!");
  } else if (subAcao === "skip") {
    RotinaService.marcarStatusBloco(hoje, param, "pulado", "Pular bloco");
    responderCallbackTelegram(cb.id, "⏭️ Bloco pulado hoje.");
  } else if (subAcao === "reset") {
    RotinaService.resetarBlocosDoDia(hoje);
    responderCallbackTelegram(cb.id, "🔄 Rotina restaurada para o padrão!");
  } else if (subAcao === "descanso") {
    RotinaService.aplicarInstrucao(hoje, "modo descanso");
    responderCallbackTelegram(cb.id, "💤 Modo descanso ativado hoje!");
  } else if (subAcao === "cal_sync") {
    if (typeof GoogleCalendarService !== "undefined" && GoogleCalendarService.limparCache) {
      GoogleCalendarService.limparCache();
    }
    var blocosFrescos = RotinaService.importarEventosGoogleCalendar(hoje);
    if (blocosFrescos && blocosFrescos.length > 0) {
      var salvosAtuais = RotinaService.obterBlocosSalvos(hoje);
      if (Array.isArray(salvosAtuais) && salvosAtuais.length > 0) {
        for (var idxB = 0; idxB < blocosFrescos.length; idxB++) {
          var bF = blocosFrescos[idxB];
          for (var idxS = 0; idxS < salvosAtuais.length; idxS++) {
            if (salvosAtuais[idxS].id === bF.id || salvosAtuais[idxS].titulo === bF.titulo) {
              if (salvosAtuais[idxS].status && salvosAtuais[idxS].status !== "pendente") {
                bF.status = salvosAtuais[idxS].status;
                if (salvosAtuais[idxS].nota) bF.nota = salvosAtuais[idxS].nota;
              }
              break;
            }
          }
        }
      }
      RotinaService.salvarBlocosDoDia(hoje, blocosFrescos);
      responderCallbackTelegram(cb.id, "📆 " + blocosFrescos.length + " blocos sincronizados do Google Calendar!");
    } else {
      responderCallbackTelegram(cb.id, "📆 Agenda Google verificada!");
    }
  } else if (subAcao === "ajustar") {
    responderCallbackTelegram(cb.id, "✏️ Envie sua instrução de ajuste!");
    var msgDica = "✏️ *COMO AJUSTAR SUA ROTINA HOJE:*\n\n" +
      "Basta digitar ou mandar um áudio gravado no chat. Exemplos:\n" +
      "• _'Hoje não vou treinar'_\n" +
      "• _'Mudei o treino para as 19h'_\n" +
      "• _'Hoje vou estudar das 15h às 17h'_\n" +
      "• _'Sem cochilo hoje'_\n" +
      "• _'Troquei musculação por corrida de 40 min'_\n" +
      "• _'Modo descanso'_\n" +
      "• _'Reset' (volta para a grade padrão)_";
    var kbDica = {
      inline_keyboard: [
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (msgId && token) {
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
        chat_id: chatId,
        message_id: msgId,
        text: msgDica,
        parse_mode: "Markdown",
        reply_markup: kbDica
      });
      return;
    }
    return enviarMensagemComTecladoParaChat(chatId, msgDica, kbDica);
  } else if (subAcao === "ver_amanha") {
    responderCallbackTelegram(cb.id, "📆 Carregando amanhã...");
    var amanha = new Date(hoje.getTime() + 86400000);
    var blocosAmanha = RotinaService.obterBlocosDoDia(amanha);
    var txtAmanha = "📆 *ROTINA DE AMANHÃ (PLANEJAMENTO ADAPTATIVO)*\n\n" +
      RotinaService.formatarTimelineMarkdown(blocosAmanha, amanha) +
      "\n\n💡 *Para ajustar amanhã:* Envie: _'/rotina alterar amanhã <instrução>'_.";
    var kbAmanha = {
      inline_keyboard: [
        [{ text: "📅 Voltar para Hoje", callback_data: "rotina:ver_hoje" }],
        [{ text: "🔙 Central de Rotina", callback_data: "ux:hub:rotina" }, { text: "🏠 Início", callback_data: "ux:hub:inicio" }]
      ]
    };
    if (msgId && token) {
      executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
        chat_id: chatId,
        message_id: msgId,
        text: txtAmanha,
        parse_mode: "Markdown",
        reply_markup: kbAmanha
      });
    } else {
      enviarMensagemComTecladoParaChat(chatId, txtAmanha, kbAmanha);
    }
    return;
  } else if (subAcao === "ver_hoje") {
    responderCallbackTelegram(cb.id, "📅 Carregando hoje...");
  }

  var blocosAtualizados = RotinaService.obterBlocosDoDia(hoje);
  var textoAtualizado = "☀️ *ROTINA DO DIA (TIME-BLOCKING ADAPTATIVO)*\n\n" +
    RotinaService.formatarTimelineMarkdown(blocosAtualizados, hoje) +
    "\n\n💡 *Para ajustar:* Toque abaixo ou envie áudio/texto:";
  var tecladoAtualizado = RotinaService.construirTecladoTimeline(hoje, blocosAtualizados);

  if (msgId && token) {
    executarPostTelegram("https://api.telegram.org/bot" + token + "/editMessageText", {
      chat_id: chatId,
      message_id: msgId,
      text: textoAtualizado,
      parse_mode: "Markdown",
      reply_markup: tecladoAtualizado
    });
  } else {
    enviarMensagemComTecladoParaChat(chatId, textoAtualizado, tecladoAtualizado);
  }
}
