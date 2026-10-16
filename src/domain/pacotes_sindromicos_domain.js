/**
 * @file src/domain/pacotes_sindromicos_domain.js
 * @description Módulo de Domínio Puro (Clean Architecture / DDD) para Pacotes Sindrômicos de Emergência (Order Sets).
 * Contém protocolos canônicos determinísticos, cálculo posológico dinâmico por peso/idade,
 * estratificação por escores clínicos (Centor/McIsaac) e geradores de prontuário (PEP) e mensageria.
 * @version 2.1.0
 * @author Lead Clinical Architect & Senior Software Engineer
 * @license Proprietary - Hospital Information System Core
 */

'use strict';

class PacotesSindromicosDomain {
  constructor() {
    this._kitsMap = new Map();
    this._aliasesMap = new Map();
    this._inicializarBaseCanonica();
  }

  /**
   * Normaliza strings para indexação determinística (remove acentos, espaços extras e converte para lowercase).
   * @private
   * @param {string} texto
   * @returns {string}
   */
  _normalizarChave(texto) {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * Valida e sanitiza parâmetros clínicos do paciente para cálculos determinísticos.
   * @private
   * @param {Object} opcoes
   * @returns {Object} Parâmetros sanitizados
   */
  _sanitizarOpcoesPaciente(opcoes = {}) {
    const pesoBruto = Number(opcoes.pesoKg);
    const idadeBruta = Number(opcoes.idade);

    const pesoKg = !Number.isNaN(pesoBruto) && pesoBruto >= 3 && pesoBruto <= 300 ? pesoBruto : 70;
    const idade = !Number.isNaN(idadeBruta) && idadeBruta >= 0 && idadeBruta <= 125 ? idadeBruta : 30;

    return {
      pesoKg,
      idade,
      alergiaPenicilina: Boolean(opcoes.alergiaPenicilina),
      alergiaAINE: Boolean(opcoes.alergiaAINE),
      alergiaDipirona: Boolean(opcoes.alergiaDipirona),
      gestante: Boolean(opcoes.gestante),
      clearanceCreatininaReduzido: Boolean(opcoes.clearanceCreatininaReduzido),
      escoreParams: opcoes.escoreParams || null
    };
  }

  /**
   * Inicializa a base de conhecimento clínico em memória RAM (Hash Maps).
   * @private
   */
  _inicializarBaseCanonica() {
    const kits = [
      this._construirKitColicaNefretica(),
      this._construirKitAmigdaliteBacteriana(),
      this._construirKitAsmaCrise(),
      this._construirKitDengueGrupoC(),
      this._construirKitGecaDesidratacaoModerada()
    ];

    for (const kit of kits) {
      this._kitsMap.set(kit.id, kit);
      this._aliasesMap.set(this._normalizarChave(kit.id), kit.id);

      if (Array.isArray(kit.aliases)) {
        for (const alias of kit.aliases) {
          this._aliasesMap.set(this._normalizarChave(alias), kit.id);
        }
      }
    }
  }

  // ============================================================================
  // DEFINIÇÃO DOS KITS SINDRÔMICOS CANÔNICOS (EVIDÊNCIAS CLÍNICAS)
  // ============================================================================

  /**
   * Kit 1: Cólica Nefrética / Litíase Ureteral Aguda
   * Referências: European Association of Urology (EAU) Urolithiasis Guidelines / Sociedade Brasileira de Urologia (SBU).
   * @private
   */
  _construirKitColicaNefretica() {
    return {
      id: 'colica_nefretica',
      aliases: [
        'litiase_urinaria',
        'calculo_renal',
        'ureterolitiase',
        'colica_renal',
        'nefrolitiase'
      ],
      titulo: 'Cólica Nefrética / Litíase Ureteral Aguda',
      sindrome: 'Dor Lombar Aguda Visceral / Urolitíase Obstrutiva Não Complicada',
      cid10: ['N20.1', 'N20.0', 'N23'],
      icone: '🪨',
      prioridade: 'Alta (Manchester Laranja / Amarelo - Alívio álgico em < 30 min)',
      diretrizesBase: [
        'European Association of Urology (EAU) Guidelines on Urolithiasis (2023/2024)',
        'Sociedade Brasileira de Urologia (SBU) - Diretrizes de Litíase Urinária'
      ],
      criteriosDiagnosticos: [
        'Dor lombar aguda unilateral em cólica, paroxística, de forte intensidade, com irradiação para flanco, fossa ilíaca e região inguinal/genital ipsilateral.',
        'Sinal de Giordano frequentemente positivo à percussão lombar.',
        'Sintomas autonômicos reflexos associados (náuseas, vômitos, sudorese fria, inquietação psicomotora).',
        'Sintomas do trato urinário inferior (disúria, polaciúria, urgência miccional) quando o cálculo atinge a junção ureterovesical (JUV).',
        'Exame de imagem padrão-ouro no PS: Tomografia Computadorizada Helicoidal de Abdome e Pelve sem contraste (baixa dose) ou USG de Rins e Vias Urinárias (1ª linha em gestantes).'
      ],
      examesComplementaresPS: [
        'Sumário de Urina (EAS / Urina Tipo 1) - avaliar hematúria micro/macroscópica, leucocitúria e nitrito.',
        'Creatinina e Ureia séricas (avaliar lesão renal aguda pós-renal).',
        'Hemograma completo e Proteína C Reativa (PCR) se suspeita de infecção associada.',
        'Beta-HCG qualitativo obrigatório em mulheres em idade fértil antes de TC ou AINEs.',
        'TC de Abdome Total sem contraste (protocolo para litíase) ou Ultrassonografia de Aparelho Urinário.'
      ],
      gerarPrescricaoHospitalar: (p) => {
        const itens = [
          {
            ordem: 1,
            classe: 'Dieta e Cuidados Gerais',
            farmaco: 'Dieta zero / Pausa alimentar até controle álgico e definição de conduta cirúrgica',
            dose: 'N/A',
            via: 'Oral suspensa temporariamente',
            diluicao: 'Manter acesso venoso periférico salinizado (Cateter 20G ou 18G)',
            tempoInfusao: 'Contínuo',
            frequencia: 'Durante permanência na observação',
            duracao: 'Reavaliar após analgesia e exames',
            contraindicacoes: 'Evitar hiper-hidratação venosa forçada na vigência de dor aguda (aumenta pressão piélica e piora a dor).',
            alertasFarmacovigilancia: 'Monitorar sinais vitais (PA, FC, Tax, FR) a cada 2h.'
          }
        ];

        if (!p.alergiaAINE && !p.gestante && !p.clearanceCreatininaReduzido) {
          itens.push({
            ordem: 2,
            classe: 'Analgesia de 1ª Linha (Anti-inflamatório Não Esteroidal Parenteral)',
            farmaco: 'Cetoprofeno 100 mg (Pó liofilizado ou solução injetável EV)',
            dose: '100 mg',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir 100 mg em 100 mL de Soro Fisiológico 0,9% ou Soro Glicosado 5%',
            tempoInfusao: 'Infusão lenta em 20 a 30 minutos (proteger da luz se exposição prolongada)',
            frequencia: '12/12 horas (Dose máxima diária: 200 mg/dia)',
            duracao: 'Dose de ataque no PS (máximo 48h por via parenteral)',
            contraindicacoes: 'Alergia a AINEs/AAS, úlcera péptica ativa, sangramento gastrointestinal, Insuficiência Renal (TFG < 30-50 mL/min), Gestação (especialmente 1º e 3º trimestres), IC descompensada.',
            alertasFarmacovigilancia: 'Reduz diretamente o tônus da musculatura lisa ureteral e o edema local pela inibição da síntese de prostaglandinas.'
          });
        } else {
          itens.push({
            ordem: 2,
            classe: 'Alerta de Contraindicação de AINE',
            farmaco: 'AINE (Cetoprofeno/Tenoxicam) OMITIDO devido ao perfil do paciente (Alergia, Gestação ou Disfunção Renal)',
            dose: 'Omitido',
            via: 'N/A',
            diluicao: 'N/A',
            tempoInfusao: 'N/A',
            frequencia: 'N/A',
            duracao: 'N/A',
            contraindicacoes: 'Risco de nefrotoxicidade aguda ou fechamento precoce do canal arterial fetal.',
            alertasFarmacovigilancia: 'Priorizar Dipirona EV associada a Opioide titulado.'
          });
        }

        if (!p.alergiaDipirona) {
          itens.push({
            ordem: 3,
            classe: 'Analgesia Multimodal / Espasmolítico Analgésico',
            farmaco: 'Dipirona Sódica 500 mg/mL (Ampola 2 mL = 1 g)',
            dose: '1 g a 2 g (2 a 4 mL)',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir em 20 mL de Água Destilada ou SF 0,9%',
            tempoInfusao: 'Infusão lenta em 5 minutos (velocidade máxima: 500 mg/min)',
            frequencia: '6/6 horas',
            duracao: 'Enquanto em observação hospitalar',
            contraindicacoes: 'Hipersensibilidade a pirazolonas, histórico de agranulocitose, porfiria hepática aguda intermitente, deficiência congênita de G6PD.',
            alertasFarmacovigilancia: 'Infusão rápida pode causar queda abrupta da pressão arterial (hipotensão arterial transitória).'
          });
        }

        itens.push(
          {
            ordem: 4,
            classe: 'Antiemético / Procinético',
            farmaco: 'Ondansetrona (Cloridrato) 2 mg/mL (Ampola 4 mL = 8 mg)',
            dose: '4 mg a 8 mg',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir em 20 mL de SF 0,9% ou administrar EV lento direto',
            tempoInfusao: 'Infusão lenta em 3 a 5 minutos',
            frequencia: '8/8 horas se náuseas ou vômitos',
            duracao: 'Durante estadia no PS',
            contraindicacoes: 'Síndrome do QT longo congênito, uso concomitante de apomorfina.',
            alertasFarmacovigilancia: 'Monitorar risco de prolongamento do intervalo QT em pacientes com distúrbios hidroeletrolíticos (hipocalemia/hipomagnesemia).'
          },
          {
            ordem: 5,
            classe: 'Analgesia de Resgate (Opioide Fraco / Atípico)',
            farmaco: 'Tramadol (Cloridrato) 50 mg/mL (Ampola 2 mL = 100 mg)',
            dose: '50 mg a 100 mg',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir obrigatoriamente em 100 mL de SF 0,9%',
            tempoInfusao: 'Infusão lenta em 20 a 30 minutos',
            frequencia: '6/6h ou 8/8h (Se dor refratária após 30 min do AINE + Dipirona)',
            duracao: 'Dose única de resgate; reavaliar se persistência da dor',
            contraindicacoes: 'Intoxicação aguda por álcool/hipnóticos, uso de IMAO nos últimos 14 dias, epilepsia não controlada.',
            alertasFarmacovigilancia: 'Alto potencial emetogênico se infundido rápido. Administrar sempre após a Ondansetrona.'
          },
          {
            ordem: 6,
            classe: 'Analgesia de Resgate de Alta Potência (Opioide Forte Titulado)',
            farmaco: 'Morfina (Sulfato) 10 mg/mL (Ampola 1 mL = 10 mg)',
            dose: `Titulação: 0,05 a 0,1 mg/kg (Sugestão inicial para ${p.pesoKg}kg: 3 mg a 5 mg EV)`,
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir 1 ampola (10 mg/1 mL) em 9 mL de Água Destilada ou SF 0,9% (Concentração final: 1 mg/mL)',
            tempoInfusao: 'Injetar 3 a 5 mL (3 a 5 mg) EV lento em 2 a 3 minutos; reavaliar a cada 15 min',
            frequencia: 'Titulado conforme resposta álgica e padrão respiratório',
            duracao: 'Resgate imediato para dor excruciante (EVA 9-10) ou contraindicação a AINEs',
            contraindicacoes: 'Depressão respiratória aguda, íleo paralítico, hipertensão intracraniana.',
            alertasFarmacovigilancia: 'Antídoto específico: Naloxona 0,4 mg/mL. Vigiar frequência respiratória (manter FR >= 12 irpm) e nível de sedação.'
          }
        );

        return itens;
      },
      gerarPrescricaoAlta: (p) => {
        const itensAlta = [
          {
            ordem: 1,
            classe: 'Terapia Medicamentosa Expulsiva (TME) - Alfa-1 Bloqueador Uro-seletivo',
            farmaco: 'Tansulosina (Cloridrato) 0,4 mg (Comprimido de liberação prolongada)',
            dose: '0,4 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido por dia, após o café da manhã ou após o jantar, no mesmo horário.',
            duracao: 'Até a expulsão documentada do cálculo ou por até 28 a 30 dias (indicado para cálculos ureterais distais de 5 a 10 mm).',
            orientacoesEspecificas: 'Não partir nem mastigar o comprimido. Pode causar tontura postural (hipotensão ortostática) nos primeiros dias e ejaculação retrógrada benigna/reversível.'
          }
        ];

        if (!p.alergiaDipirona) {
          itensAlta.push({
            ordem: 2,
            classe: 'Analgésico de Manutenção',
            farmaco: 'Dipirona Monoidratada 1 g (Comprimido)',
            dose: '1 g (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas se dor.',
            duracao: 'Por 5 dias.',
            orientacoesEspecificas: 'Pode ser intercalado com o anti-inflamatório nos primeiros 3 dias.'
          });
        } else {
          itensAlta.push({
            ordem: 2,
            classe: 'Analgésico de Manutenção (Alternativa para Alérgicos a Dipirona)',
            farmaco: 'Paracetamol 750 mg (Comprimido)',
            dose: '750 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas se dor (Dose máxima: 3 g a 4 g/dia).',
            duracao: 'Por 5 dias.',
            orientacoesEspecificas: 'Evitar bebidas alcoólicas e não exceder 5 comprimidos em 24 horas.'
          });
        }

        if (!p.alergiaAINE && !p.gestante && !p.clearanceCreatininaReduzido) {
          itensAlta.push({
            ordem: 3,
            classe: 'Anti-inflamatório Não Esteroidal Oral (Curto Prazo)',
            farmaco: 'Cetoprofeno 100 mg (Comprimido revestido / liberação entérica)',
            dose: '100 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 12/12 horas, preferencialmente durante ou logo após as refeições.',
            duracao: 'Uso estrito por 3 a 5 dias (não prolongar uso pelo risco de nefrotoxicidade e gastrite).',
            orientacoesEspecificas: 'Suspender imediatamente se apresentar dor epigástrica intensa, fezes escurecidas ou redução do volume urinário.'
          });
        }

        itensAlta.push({
          ordem: 4,
          classe: 'Antiemético de Resgate Domiciliar',
          farmaco: 'Ondansetrona 8 mg (Comprimido orodispersível)',
          dose: '8 mg (1 comprimido)',
          via: 'Via Oral / Sublingual',
          posologia: 'Colocar 1 comprimido sobre a língua e deixar dissolver, de 8/8 horas, se náuseas ou vômitos.',
          duracao: 'Enquanto houver náuseas (máximo 3 a 5 dias).',
          orientacoesEspecificas: 'Auxilia na tolerância da medicação oral caso ocorra recorrência leve da dor.'
        });

        return itensAlta;
      },
      criteriosInternacao: [
        'Risco iminente de Pionefrose / Sepse Urinária Obstrutiva: Febre (Tax >= 37,8°C), calafrios, leucocitose com desvio à esquerda, piúria maciça ou instabilidade hemodinâmica associada a cálculo obstrutivo -> EMERGÊNCIA UROLÓGICA (Desobstrução imediata via Cateter Duplo J ou Nefrostomia Percutânea + Antibioticoterapia EV empírica imediata).',
        'Rim único anatômico ou funcional com obstrução ureteral aguda.',
        'Cálculos ureterais bilaterais obstrutivos.',
        'Injúria Renal Aguda (IRA) pós-renal significativa ou anúria/oligúria.',
        'Dor refratária (Cólica intratável) após analgesia parenteral otimizada e escalonada.',
        'Vômitos incoercíveis impossibilitando terapia oral e hidratação domiciliar.',
        'Cálculo > 10 mm com baixa probabilidade de expulsão espontânea associado a hidronefrose moderada/grave.'
      ],
      sinaisAlarmeRetorno: [
        'Febre (temperatura >= 37,8°C), tremores ou calafrios (sinal crítico de infecção urinária obstruída).',
        'Dor lombar intensa que não melhora após 1 hora do uso das medicações orais prescritas.',
        'Vômitos persistentes que impeçam a ingestão de líquidos e remédios.',
        'Diminuição importante da quantidade de urina ou incapacidade de urinar.',
        'Urina com sangue vivo em grande quantidade ou coágulos.',
        'Orientação prática: Urinar através de uma peneira fina ou gaze para identificar a eliminação do cálculo e levá-lo à consulta urológica.'
      ]
    };
  }

  /**
   * Kit 2: Faringoamigdalite Bacteriana (Estreptocócica)
   * Referências: IDSA Guidelines for Group A Streptococcal Pharyngitis / Ministério da Saúde / CDC.
   * @private
   */
  _construirKitAmigdaliteBacteriana() {
    return {
      id: 'amigdalite_bacteriana',
      aliases: [
        'faringoamigdalite',
        'amigdalite_estreptococica',
        'faringite_bacteriana',
        'faringite_estreptococica',
        'dor_de_garganta_bacteriana'
      ],
      titulo: 'Faringoamigdalite Aguda Estreptocócica (S. pyogenes)',
      sindrome: 'Infecção Aguda de Vias Aéreas Superiores / Faringoamigdalite pelo Estreptococo Beta-Hemolítico do Grupo A (EBHGA)',
      cid10: ['J03.0', 'J03.9', 'J02.0'],
      icone: '🦠',
      prioridade: 'Baixa / Moderada (Manchester Verde / Amarelo - Avaliar perviedade de via aérea e complicações supurativas)',
      diretrizesBase: [
        'Infectious Diseases Society of America (IDSA) Clinical Practice Guideline for Group A Streptococcal Pharyngitis',
        'Ministério da Saúde (Brasil) - Cadernos de Atenção Básica / Prevenção de Febre Reumática',
        'CDC Acute Pharyngitis Clinical Guidance'
      ],
      criteriosDiagnosticos: [
        'Odinofagia de início súbito, febre, hiperemia e hipertrofia tonsilar com ou sem exsudato purulento, petéquias em palato mole e linfonodomegalia cervical anterior dolorosa.',
        'Ausência de sintomas clássicos de infecção viral (tosse, coriza hialina, rouquidão/disfonia, conjuntivite, úlceras orais difusas ou diarreia).',
        'Estratificação obrigatória pelo Escore de Centor modificado por McIsaac (Pontuação >= 3 autoriza teste rápido antigênico - TRDA - ou tratamento empírico em cenários sem teste rápido disponível e alta prevalência de Febre Reumática).',
        'Objetivo primário da antibioticoterapia: Prevenção da Febre Reumática Aguda (eficaz se iniciada em até 9 dias do início dos sintomas), prevenção de complicações supurativas (abscesso periamigdaliano) e redução do contágio em 24h.'
      ],
      examesComplementaresPS: [
        'Diagnóstico eminentemente clínico associado ao Escore de Centor/McIsaac.',
        'Teste Rápido de Detecção de Antígeno (TRDA / Strep Test) para EBHGA em swab de orofaringe (se disponível para Centor >= 2 ou 3).',
        'Hemograma, PCR e Tomografia de Pescoço com contraste APENAS se suspeita de complicação supurativa profunda (Abscesso Periamigdaliano, Retrofaríngeo ou Angina de Ludwig).'
      ],
      gerarPrescricaoHospitalar: (p) => {
        const itens = [];

        if (!p.alergiaPenicilina) {
          const doseBenzatina = p.pesoKg >= 27 ? '1.200.000 UI' : '600.000 UI';
          itens.push({
            ordem: 1,
            classe: 'Antibioticoterapia Erradicadora de Dose Única (Padrão-Ouro para Adesão e Prevenção de Febre Reumática)',
            farmaco: `Benzilpenicilina Benzatina ${doseBenzatina} (Suspensão injetável)`,
            dose: doseBenzatina,
            via: 'Intramuscular Profunda Exclusiva (IM) - Quadrante superior externo da região glútea ou face anterolateral da coxa',
            diluicao: 'Reconstituir em 4 mL de Água Destilada estéril (Diluir opcionalmente com 0,5 mL de Lidocaína 2% SEM vasoconstritor para reduzir dor local, mantendo dose exata de penicilina)',
            tempoInfusao: 'Injeção IM lenta e constante (Técnica em Z recomendada)',
            frequencia: 'DOSE ÚNICA',
            duracao: 'Dose única (garante níveis séricos bactericidas por 10 a 14 dias)',
            contraindicacoes: 'Alergia comprovada a Penicilinas/Betalactâmicos; PROIBIDA administração endovenosa (risco de parada cardiorrespiratória e embolia pulmonar/Síndrome de Hoigne) ou em pacientes anticoagulados/plaquetopênicos graves.',
            alertasFarmacovigilancia: 'Aspirar antes de injetar para certificar ausência de refluxo sanguíneo. Observar paciente por 20-30 min após aplicação.'
          });
        } else {
          itens.push({
            ordem: 1,
            classe: 'Alerta de Alergia a Penicilina (Via Parenteral)',
            farmaco: 'Benzilpenicilina Benzatina OMITIDA (Paciente com alergia a Penicilina)',
            dose: 'Omitido',
            via: 'N/A',
            diluicao: 'N/A',
            tempoInfusao: 'N/A',
            frequencia: 'N/A',
            duracao: 'N/A',
            contraindicacoes: 'Hipersensibilidade mediada por IgE a betalactâmicos.',
            alertasFarmacovigilancia: 'Realizar tratamento erradicador por via oral com Macrolídeo (Azitromicina ou Claritromicina) ou Clindamicina.'
          });
        }

        itens.push({
          ordem: 2,
          classe: 'Corticoterapia Sistêmica Adjuvante para Odinofagia Intensa / Disfagia',
          farmaco: 'Dexametasona (Fosfato Dissódico) 4 mg/mL (Ampola 2,5 mL = 10 mg)',
          dose: '10 mg (ou 0,6 mg/kg em pediatria, máx 10 mg)',
          via: 'Endovenosa (EV) ou Intramuscular (IM)',
          diluicao: 'Se EV: diluir em 20 mL de SF 0,9%',
          tempoInfusao: 'Infusão lenta em 3 a 5 minutos (evita prurido perineal transitório)',
          frequencia: 'Dose única no Pronto-Socorro',
          duracao: 'Dose única',
          contraindicacoes: 'Infecção fúngica sistêmica não tratada, cautela em diabetes descompensado.',
          alertasFarmacovigilancia: 'Infundir rápido demais causa parestesia/queimação perineal intensa (inofensiva, porém desconfortável).'
        });

        if (!p.alergiaDipirona) {
          itens.push({
            ordem: 3,
            classe: 'Analgésico e Antitérmico Parenteral Imediato',
            farmaco: 'Dipirona Sódica 500 mg/mL (Ampola 2 mL = 1 g)',
            dose: '1 g (2 mL)',
            via: 'Endovenosa (EV) ou Intramuscular (IM)',
            diluicao: 'Se EV: diluir em 20 mL de SF 0,9%',
            tempoInfusao: '5 minutos',
            frequencia: 'Dose única no PS se febre ou odinofagia importante',
            duracao: 'Dose imediata',
            contraindicacoes: 'Alergia a pirazolonas, agranulocitose prévia.',
            alertasFarmacovigilancia: 'Permite que o paciente recupere a deglutição para hidratação oral.'
          });
        }

        return itens;
      },
      gerarPrescricaoAlta: (p) => {
        const itensAlta = [];

        if (!p.alergiaPenicilina) {
          itensAlta.push({
            ordem: 1,
            classe: 'Antibioticoterapia Oral de 1ª Linha (Caso NÃO tenha recebido Penicilina Benzatina IM no PS)',
            farmaco: 'Amoxicilina 500 mg (Cápsula) [Ou Amoxicilina + Clavulanato 875/125 mg se faringoamigdalite de repetição]',
            dose: '500 mg (1 cápsula de 8/8h) ou 1 g (2 cápsulas de 12/12h)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 cápsula de 8 em 8 horas (ou 2 cápsulas de 12 em 12 horas).',
            duracao: '10 DIAS COMPLETOS (Obrigatório manter por 10 dias para erradicação completa do estreptococo da orofaringe, mesmo que a dor desapareça no 3º dia).',
            orientacoesEspecificas: 'ATENÇÃO: Se já recebeu a injeção de Benzetacil (Penicilina Benzatina) no Pronto-Socorro, NÃO é necessário tomar este antibiótico oral.'
          });
        } else {
          itensAlta.push(
            {
              ordem: 1,
              classe: 'Antibioticoterapia Oral para Alérgicos a Penicilina (1ª Opção - Macrolídeo)',
              farmaco: 'Azitromicina Di-hidratada 500 mg (Comprimido revestido)',
              dose: '500 mg (1 comprimido) ao dia (Dose recomendada para faringite estreptocócica: 12 mg/kg/dia, máx 500 mg/dia por 5 dias)',
              via: 'Via Oral (VO)',
              posologia: 'Tomar 1 comprimido (500 mg) a cada 24 horas.',
              duracao: '5 DIAS COMPLETOS.',
              orientacoesEspecificas: 'Tomar 1 hora antes ou 2 horas após as refeições. Alternativa de alta eficácia se intolerância a azitromicina: Claritromicina 250 mg VO 12/12h por 10 dias ou Clindamicina 300 mg VO 8/8h por 10 dias.'
            }
          );
        }

        if (!p.alergiaDipirona) {
          itensAlta.push({
            ordem: 2,
            classe: 'Analgésico e Antitérmico',
            farmaco: 'Dipirona Monoidratada 1 g (Comprimido)',
            dose: '1 g (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas se dor ou febre.',
            duracao: 'Por 3 a 5 dias.',
            orientacoesEspecificas: 'Manter hidratação oral abundante com líquidos frios ou em temperatura ambiente.'
          });
        } else {
          itensAlta.push({
            ordem: 2,
            classe: 'Analgésico e Antitérmico',
            farmaco: 'Paracetamol 750 mg (Comprimido)',
            dose: '750 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas se dor ou febre.',
            duracao: 'Por 3 a 5 dias.',
            orientacoesEspecificas: 'Não exceder 4 comprimidos em 24 horas.'
          });
        }

        if (!p.alergiaAINE && !p.gestante && !p.clearanceCreatininaReduzido) {
          itensAlta.push({
            ordem: 3,
            classe: 'Anti-inflamatório Adjuvante',
            farmaco: 'Ibuprofeno 600 mg (Comprimido)',
            dose: '600 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 8/8 horas após as refeições.',
            duracao: 'Por 3 a 4 dias.',
            orientacoesEspecificas: 'Evitar o uso prolongado de corticoides orais em domicílio sem prescrição específica.'
          });
        }

        return itensAlta;
      },
      criteriosInternacao: [
        'Sinais de Abscesso Periamigdaliano, Parafaríngeo ou Retrofaríngeo: Trismo (dificuldade de abrir a boca), abaulamento assimétrico do pilar amigdaliano com desvio contralateral da úvula, voz abafada ("batata quente" / hot potato voice), sialorreia intensa (incapacidade de deglutir a própria saliva).',
        'Sinais de obstrução de via aérea superior (estridor laríngeo, taquipneia, postura em tripé).',
        'Celulite cervical profunda / Angina de Ludwig (edema endurecido submandibular/sublingual com elevação do assoalho da boca).',
        'Incapacidade absoluta de ingestão hídrica com desidratação moderada/grave.',
        'Sinais de Síndrome do Choque Tóxico Estreptocócico ou Sepse.'
      ],
      sinaisAlarmeRetorno: [
        'Dificuldade para abrir a boca (trismo) ou dor extrema unilateral que impede engolir até a própria saliva (baba constante).',
        'Alteração na voz (voz abafada ou fanhosa) ou inchaço visível no pescoço/abaixo do queixo.',
        'Falta de ar, chiado no pescoço ao puxar o ar (estridor) ou dificuldade para deitar reto.',
        'Persistência de febre alta após 48 a 72 horas do início correto do antibiótico.',
        'Surgimento de manchas vermelhas ásperas na pele (escarlatiniformes) ou urina escura (cor de chá/coca-cola) semanas após o quadro.'
      ]
    };
  }

  /**
   * Kit 3: Crise de Asma Leve a Moderada / Broncoespasmo Agudo no PS
   * Referências: GINA (Global Initiative for Asthma) 2023/2024 / Diretrizes da Sociedade Brasileira de Pneumologia e Tisiologia (SBPT).
   * @private
   */
  _construirKitAsmaCrise() {
    return {
      id: 'asma_crise_leve_moderada',
      aliases: [
        'crise_asmatica',
        'broncoespasmo',
        'exacerbacao_asma',
        'asma_aguda',
        'crise_de_asma'
      ],
      titulo: 'Exacerbação Aguda de Asma (Crise Leve a Moderada / Moderada-Grave)',
      sindrome: 'Broncoespasmo Agudo / Obstrução Reversível das Vias Aéreas Inferiores',
      cid10: ['J45.9', 'J45.0', 'J46'],
      icone: '🫁',
      prioridade: 'Alta (Manchester Amarelo / Laranja - Iniciar broncodilatador na 1ª hora)',
      diretrizesBase: [
        'Global Initiative for Asthma (GINA) Strategy Report (2023/2024)',
        'Sociedade Brasileira de Pneumologia e Tisiologia (SBPT) - Recomendações para o Manejo da Asma'
      ],
      criteriosDiagnosticos: [
        'Dispneia aguda ou progressiva, sibilância difusa (expiratória ou inspiratória/expiratória), tosse seca ou produtiva e sensação de opressão torácica.',
        'Classificação Crise Leve a Moderada (GINA): Paciente fala frases completas, prefere ficar sentado a deitado, não está agitado, FR aumentada (porém <= 30 irpm), sem uso importante de musculatura acessória, FC 100-120 bpm, SpO2 90-95% em ar ambiente, PFE > 50% do predito.',
        'Classificação Crise Grave (GINA): Fala apenas palavras isoladas, senta-se curvado para frente (tripé), agitado, FR > 30 irpm, uso evidente de musculatura acessória (tiragem), FC > 120 bpm, SpO2 < 90% em ar ambiente, PFE <= 50% do predito.',
        'Tórax Silencioso (ausência de murmúrio vesicular e de sibilos em paciente exausto) = Iminência de Parada Respiratória.'
      ],
      examesComplementaresPS: [
        'Oximetria de pulso contínua e medida de Pico de Fluxo Expiratório (Peak Flow / PFE) antes e após broncodilatação.',
        'Radiografia de Tórax NÃO é rotineira; solicitar apenas se suspeita de pneumotórax, pneumomediastino, pneumonia consolidada associada ou crise refratária grave.',
        'Gasometria arterial indicada se SpO2 < 90% apesar de O2 suplementar, PFE < 30-50% ou sinais de fadiga muscular respiratória (PaCO2 normal ou elevado >= 40-45 mmHg em asmático taquipneico indica falência ventilatória iminente).'
      ],
      gerarPrescricaoHospitalar: (p) => {
        const dosePrednisolonaMg = Math.min(Math.round(p.pesoKg * 1), 60);
        const dosePrednisonaPadrao = dosePrednisolonaMg >= 40 ? '40 mg a 60 mg' : `${dosePrednisolonaMg} mg`;

        return [
          {
            ordem: 1,
            classe: 'Oxigenoterapia Titulada (Apenas se Hipoxemia)',
            farmaco: 'Oxigênio Suplementar sob Cateter Nasal ou Máscara de Venturi',
            dose: 'Titular fluxo (1 a 4 L/min no CN) para manter Saturação Alvo (SpO2) entre 93% e 95% (94%-98% em gestantes e crianças)',
            via: 'Inalatória',
            diluicao: 'N/A',
            tempoInfusao: 'Contínuo se SpO2 < 93%',
            frequencia: 'Monitorização contínua por oximetria de pulso',
            duracao: 'Durante a crise',
            contraindicacoes: 'Evitar hiperóxia (SpO2 100% com altos fluxos de O2 está associada a retenção de CO2 e piora da relação V/Q em crises graves).',
            alertasFarmacovigilancia: 'Prefira pressurizado (pMDI com espaçador) em vez de nebulização contínua com O2 puro quando possível.'
          },
          {
            ordem: 2,
            classe: 'Broncodilatador Beta-2 Agonista de Curta Ação (SABA) - 1ª Linha de Ataque',
            farmaco: 'Salbutamol (Sulfato) 100 mcg/jato (Spray / pMDI) COM ESPAÇADOR valvulado [Ou Fenoterol 5 mg/mL gotas para nebulização caso não haja espaçador]',
            dose: '4 a 10 jatos (400 a 1000 mcg) no espaçador [Alternativa Nebulização: Fenoterol 10 a 20 gotas (2,5 a 5 mg) ou Salbutamol solução]',
            via: 'Inalatória Oral',
            diluicao: 'Se pMDI: acoplar ao espaçador (1 jato por vez, inspirar profundamente e segurar por 5-10s). Se Nebulização: diluir em 4 a 5 mL de Soro Fisiológico 0,9% (NUNCA usar água destilada na nebulização - causa broncoespasmo por hipotonicidade).',
            tempoInfusao: 'A cada 20 minutos na 1ª hora (3 ciclos seguidos: T0, T20min, T40min)',
            frequencia: '20/20 minutos na 1ª hora; após, reavaliar e espaçar para 1/1h a 4/4h conforme resposta clínica',
            duracao: 'Ciclo de ataque na 1ª hora no Pronto-Socorro',
            contraindicacoes: 'Cautela em taquiarritmias graves não controladas e tireotoxicose.',
            alertasFarmacovigilancia: 'Causa tremor fino de extremidades, taquicardia sinusal reflexa e hipocalemia transitória (por influxo intracelular de potássio).'
          },
          {
            ordem: 3,
            classe: 'Anticolinérgico Inalatório de Curta Ação (SAMA) - Sinergismo Broncodilatador (Obrigatório em Crise Moderada-Grave)',
            farmaco: 'Ipratrópio (Brometo) 20 mcg/jato (Spray pMDI) ou Solução para Nebulização 0,25 mg/mL',
            dose: '4 a 8 jatos (80 a 160 mcg) no espaçador [Ou 20 a 40 gotas (0,25 a 0,5 mg) na nebulização conjunta com o Beta-2]',
            via: 'Inalatória Oral',
            diluicao: 'Se nebulização: diluir no mesmo copo nebulizador junto com o Beta-2 agonista em 4-5 mL de SF 0,9%.',
            tempoInfusao: 'A cada 20 minutos na 1ª hora (3 ciclos)',
            frequencia: '20/20 minutos na 1ª hora; após, manter de 4/4h ou 6/6h se necessário internação',
            duracao: 'Focado na 1ª hora de atendimento no PS (reduz significativamente a taxa de hospitalização)',
            contraindicacoes: 'Hipersensibilidade à atropina ou seus derivados; proteger os olhos da névoa em pacientes com glaucoma de ângulo fechado.',
            alertasFarmacovigilancia: 'Reduz hipersecreção mucosa e bloqueia o tônus vagal broncoconstritor.'
          },
          {
            ordem: 4,
            classe: 'Corticoterapia Sistêmica Precoce (Administrar na 1ª Hora)',
            farmaco: 'Prednisona 20 mg (Comprimido) ou Prednisolona [Alternativa EV se incapaz de deglutir/dispneia intensa: Metilprednisolona 40-60 mg EV ou Hidrocortisona 200 mg EV]',
            dose: `${dosePrednisonaPadrao} (Equivalente a 1 mg/kg de Prednisona, máximo 50-60 mg/dia em adultos)`,
            via: 'Via Oral (VO) é tão eficaz quanto a via Endovenosa (EV) e preferencial se o paciente deglute com segurança',
            diluicao: 'Se Hidrocortisona 200 mg EV ou Metilprednisolona 40 mg EV: diluir em 20 a 50 mL de SF 0,9%',
            tempoInfusao: 'Imediato (na 1ª hora do atendimento)',
            frequencia: 'Dose única diária',
            duracao: 'Dose de ataque no PS',
            contraindicacoes: 'Infecção fúngica sistêmica ativa.',
            alertasFarmacovigilancia: 'O efeito anti-inflamatório genômico inicia após 4 horas; portanto, a administração precoce na 1ª hora é determinante para evitar recaída e internação.'
          },
          {
            ordem: 5,
            classe: 'Broncodilatador Endovenoso de Resgate para Crise Grave / Refratária (PFE < 50% ou falha da 1ª hora)',
            farmaco: 'Sulfato de Magnésio 50% (Ampola 10 mL = 5 g; cada 1 mL = 500 mg) ou 10% (Ampola 10 mL = 1 g)',
            dose: '2 g (2000 mg) [Corresponde a 4 mL da ampola a 50% OU 20 mL da ampola a 10%]',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir 2 g em 100 mL de Soro Fisiológico 0,9% ou SG 5%',
            tempoInfusao: 'Infusão lenta em 20 a 30 minutos em bomba de infusão ou equipo microgotas',
            frequencia: 'Dose única de resgate (Reservar para crises graves ou refratárias ao SABA + SAMA + Corticoide inicial)',
            duracao: 'Dose única',
            contraindicacoes: 'Bloqueio atrioventricular, insuficiência renal grave/anúria, miastenia gravis.',
            alertasFarmacovigilancia: 'NUNCA fazer em bolus rápido (risco de hipotensão severa, rubor facial, bradicardia e parada respiratória por bloqueio neuromuscular). PROIBIDO uso rotineiro de Aminofilina EV devido à estreita faixa terapêutica e alta toxicidade arritmogênica.'
          }
        ];
      },
      gerarPrescricaoAlta: () => {
        return [
          {
            ordem: 1,
            classe: 'Corticoterapia Oral de Curto Curso (Obrigatória após crise no PS para evitar recidiva)',
            farmaco: 'Prednisona 20 mg (Comprimido)',
            dose: '40 mg a 60 mg (2 a 3 comprimidos de 20 mg)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 2 comprimidos (40 mg) juntos pela manhã, após o café da manhã, em tomada única diária.',
            duracao: '5 a 7 DIAS (Não há necessidade de desmame escalonado para cursos <= 7-10 dias).',
            orientacoesEspecificas: 'Fundamental para desinflamar os brônquios e impedir que a crise volte nas próximas 48 horas.'
          },
          {
            ordem: 2,
            classe: 'Terapia Inalatória Controladora e Aliviadora (Diretriz GINA Track 1 / Prevenção de novas exacerbações)',
            farmaco: 'Formoterol 6 mcg + Budesonida 200 mcg (Cápsula inalatória ou Spray/Turbuhaler) [Ou manutenção de Corticoide Inalatório Beclometasona 250 mcg 12/12h + Salbutamol 100 mcg de alívio]',
            dose: '1 a 2 inalações',
            via: 'Inalatória Oral',
            posologia: 'Usar 1 inalação de 12 em 12 horas continuamente (manutenção) e 1 inalação extra se falta de ar ou chiado (máximo 8 a 12 inalações/dia).',
            duracao: 'Uso contínuo até reavaliação médica ambulatorial.',
            orientacoesEspecificas: 'SEMPRE enxaguar a boca com água e cuspir após o uso do corticoide inalatório para evitar candidíase oral (sapinho) e rouquidão. Diretriz GINA contraindica alta apenas com SABA isolado sem corticoide inalatório.'
          },
          {
            ordem: 3,
            classe: 'Broncodilatador de Alívio Rápido (Caso paciente utilize esquema de Corticoide Inalatório separado)',
            farmaco: 'Salbutamol 100 mcg/jato (Spray)',
            dose: '2 a 4 jatos com espaçador',
            via: 'Inalatória Oral',
            posologia: 'Inalar 2 a 4 jatos de 4/4h ou 6/6h nos primeiros 2 a 3 dias se chiado ou falta de ar, reduzindo conforme melhora.',
            duracao: 'Se necessário (resgate).',
            orientacoesEspecificas: 'Se precisar usar o Salbutamol com intervalo menor que 4 horas, retornar imediatamente ao Pronto-Socorro.'
          }
        ];
      },
      criteriosInternacao: [
        'Persistência de sintomas graves (dispneia em repouso, uso de musculatura acessória, fala entrecortada) após 1 a 3 horas de tratamento intensivo no PS.',
        'Saturação de O2 (SpO2) < 92% em ar ambiente após o ciclo completo de broncodilatação.',
        'Pico de Fluxo Expiratório (PFE) pós-tratamento < 50% (ou entre 50-60% com fatores de alto risco de morte por asma).',
        'Sinais de Asma Quase-Fatal: Sonolência, confusão mental, exaustão muscular, bradicardia ou Tórax Silencioso -> Internação em UTI e preparação para Intubação Orotraqueal (Sequência Rápida com Quetamina).',
        'Histórico de intubação prévia ou internação em UTI por asma associado a resposta incompleta no PS.'
      ],
      sinaisAlarmeRetorno: [
        'Falta de ar que impede de falar frases completas ou dificuldade para caminhar dentro de casa.',
        'Necessidade de usar a bombinha de resgate a cada 2 ou 3 horas sem obter alívio duradouro.',
        'Lábios ou pontas dos dedos arroxeados (cianose) ou afundamento das costelas e pescoço ao respirar.',
        'Sonolência excessiva, confusão ou sensação de esgotamento físico para respirar.',
        'Febre alta associada a catarro amarelado/esverdeado espesso ou dor forte no peito.'
      ]
    };
  }

  /**
   * Kit 4: Dengue Grupo C (Com Sinais de Alarme)
   * Referências: Ministério da Saúde (Brasil) - Dengue: Diagnóstico e Manejo Clínico: Adulto e Criança (6ª Edição - 2024).
   * @private
   */
  _construirKitDengueGrupoC() {
    return {
      id: 'dengue_grupo_c',
      aliases: [
        'dengue_sinais_alarme',
        'dengue_alarme',
        'dengue_c',
        'hidratacao_dengue_c',
        'febre_hemorragica_dengue'
      ],
      titulo: 'Dengue Grupo C (Dengue com Sinais de Alarme)',
      sindrome: 'Arbovirose Aguda em Fase Crítica / Extravasamento Plasmático Endotelial com Sinais de Alarme',
      cid10: ['A97.1', 'A90', 'A91'],
      icone: '🦟',
      prioridade: 'Muito Alta (Manchester Laranja - Início IMEDIATO de expansão volêmica em leito de observação/internação)',
      diretrizesBase: [
        'Ministério da Saúde (Brasil) - Dengue: Diagnóstico e Manejo Clínico: Adulto e Criança (6ª Edição, 2024)',
        'Organização Pan-Americana da Saúde (OPAS/OMS) - Diretrizes para Diagnóstico e Tratamento da Dengue'
      ],
      criteriosDiagnosticos: [
        'Caso suspeito de Dengue (febre com duração de 2 a 7 dias + >= 2 sintomas: mialgia, artralgia, cefaleia, dor retro-orbitária, exantema, náuseas, petéquias ou leucopenia), frequentemente na defervescência da febre (entre o 3º e 7º dia), que apresenta UM OU MAIS SINAIS DE ALARME:',
        '1. Dor abdominal intensa (referida ou à palpação) e contínua.',
        '2. Vômitos persistentes.',
        '3. Acúmulo de líquidos (ascite, derrame pleural ou derrame pericárdico).',
        '4. Hipotensão postural e/ou lipotimia (queda >= 20 mmHg na PAS ou >= 10 mmHg na PAD em ortostase).',
        '5. Hepatomegalia dolorosa > 2 cm abaixo do rebordo costal.',
        '6. Sangramento de mucosa (gengivorragia, epistaxe, metrorragia, hematêmese, melena).',
        '7. Letargia e/ou irritabilidade.',
        '8. Aumento progressivo do hematócrito (hemoconcentração por extravasamento plasmático).'
      ],
      examesComplementaresPS: [
        'OBRIGATÓRIOS (Não atrasar o início da hidratação venosa enquanto aguarda resultados):',
        'Hemograma completo com avaliação seriada do Hematócrito (Ht basal e reavaliação após 2h de expansão) e contagem de Plaquetas.',
        'Dosagem de Albumina sérica e Transaminases (TGO/AST e TGP/ALT).',
        'Radiografia de Tórax (PA, perfil e incidência de Laurell) e/ou Ultrassonografia de Abdome Total (pesquisa de derrame cavitário / espessamento parietal da vesícula biliar).',
        'Exames específicos de confirmação (não alteram conduta imediata): Antígeno NS1 ou RT-PCR (até o 5º dia de sintomas) ou Sorologia IgM (a partir do 6º dia).',
        'Tipagem sanguínea se sangramento significativo; Coagulograma, Gasometria, Lactato, Ureia, Creatinina e Eletrólitos.'
      ],
      gerarPrescricaoHospitalar: (p) => {
        const volExpansaoHoraMl = Math.round(p.pesoKg * 10);
        const volExpansao2HorasMl = volExpansaoHoraMl * 2;
        const volManutencaoFase1HoraMl = Math.round((p.pesoKg * 25) / 6);
        const volManutencaoFase1TotalMl = Math.round(p.pesoKg * 25);
        const volManutencaoFase2TotalMl = Math.round(p.pesoKg * 25);

        return [
          {
            ordem: 1,
            classe: ' CUIDADOS INTENSIVOS E MONITORIZAÇÃO (LEITO DE INTERNAÇÃO / OBSERVAÇÃO MÍNIMA 48H)',
            farmaco: 'Acesso Venoso Periférico Calibroso (2 acessos se possível) + Balanço Hídrico Rigoroso',
            dose: `Meta de Diurese: >= 1 mL/kg/h (Para ${p.pesoKg}kg: urinar no mínimo ${Math.round(p.pesoKg)} mL/hora)`,
            via: 'Monitorização Clínica',
            diluicao: 'N/A',
            tempoInfusao: 'Contínuo',
            frequencia: 'Sinais vitais (PA, PAM, FC, FR, Tax, Pressão de Pulso) e diurese a cada 1 hora durante a fase de expansão.',
            duracao: 'Mínimo 48 horas de internação hospitalar',
            contraindicacoes: 'PROIBIDO administrar medicações por via Intramuscular (IM) pelo risco de hematoma muscular grave.',
            alertasFarmacovigilancia: 'Atenção: Se o paciente apresentar sinais de Choque (Pressão arterial convergente < 20 mmHg, hipotensão arterial, extremidades frias, pulso rápido e fino, enchimento capilar > 2s), reclassificar IMEDIATAMENTE para GRUPO D (Expansão rápida 20 mL/kg em 20 minutos).'
          },
          {
            ordem: 2,
            classe: '1ª ETAPA: REPOSIÇÃO VOLÊMICA IMEDIATA (Fase de Expansão - Protocolo MS Grupo C)',
            farmaco: 'Soro Fisiológico 0,9% (Cloreto de Sódio 0,9%) ou Ringer Lactato',
            dose: `10 mL/kg/hora nas primeiras 2 horas -> Para ${p.pesoKg} kg: ${volExpansaoHoraMl} mL na 1ª hora + ${volExpansaoHoraMl} mL na 2ª hora (Volume total em 2 horas: ${volExpansao2HorasMl} mL)`,
            via: 'Endovenosa (EV)',
            diluicao: 'Solução cristaloide isotônica pura',
            tempoInfusao: `Infundir ${volExpansaoHoraMl} mL/hora durante 2 horas (Total: ${volExpansao2HorasMl} mL em 120 minutos)`,
            frequencia: 'Reavaliação clínica após 1h e reavaliação do Hematócrito + Diurese ao final da 2ª hora',
            duracao: 'Pode ser repetida por até 3 vezes (máximo 6 horas de expansão a 10 mL/kg/h) caso não haja melhora do hematócrito ou dos sinais hemodinâmicos.',
            contraindicacoes: 'Auscultar bases pulmonares antes de cada etapa para evitar congestão pulmonar iatrogênica, especialmente em idosos e cardiopatas.',
            alertasFarmacovigilancia: 'Se após a 3ª fase de expansão não houver resposta clínica e laboratorial (queda do Ht e diurese >= 1 mL/kg/h), conduzir como GRUPO D (Choque).'
          },
          {
            ordem: 3,
            classe: '2ª ETAPA: FASE DE MANUTENÇÃO (Iniciar APÓS melhora clínica, queda do Hematócrito e Diurese >= 1 mL/kg/h)',
            farmaco: 'Soro Fisiológico 0,9%',
            dose: `1ª Fase da Manutenção: 25 mL/kg em 6 horas -> Para ${p.pesoKg} kg: ${volManutencaoFase1TotalMl} mL em 6 horas (Velocidade: ~${volManutencaoFase1HoraMl} mL/h). Se houver melhora contínua, passar para 2ª Fase da Manutenção: 25 mL/kg em 8 horas (${volManutencaoFase2TotalMl} mL em 8h, sendo 1/3 com SF 0,9% e 2/3 com Soro Glicosado 5%)`,
            via: 'Endovenosa (EV)',
            diluicao: 'Cristaloide isotônico',
            tempoInfusao: '6 horas (1ª fase manutenção) seguida de 8 horas (2ª fase manutenção)',
            frequencia: 'Sequencial após estabilização da etapa de expansão',
            duracao: 'Durante as primeiras 24 a 48 horas de internação',
            contraindicacoes: 'Monitorar eletrólitos e glicemia capilar na fase de manutenção.',
            alertasFarmacovigilancia: 'O extravasamento plasmático na dengue dura em média 24 a 48 horas; após esse período, inicia-se a reabsorção espontânea do líquido do terceiro espaço (reduzir infusão venosa para evitar hipervolemia e edema agudo de pulmão).'
          },
          {
            ordem: 4,
            classe: 'Antitérmico e Analgésico Seguro',
            farmaco: !p.alergiaDipirona ? 'Dipirona Sódica 500 mg/mL (Ampola 2 mL = 1 g)' : 'Paracetamol 750 mg VO (ou solução oral)',
            dose: !p.alergiaDipirona ? '1 g (2 mL)' : '750 mg',
            via: !p.alergiaDipirona ? 'Endovenosa (EV)' : 'Via Oral (VO)',
            diluicao: !p.alergiaDipirona ? 'Diluir em 20 mL de SF 0,9%' : 'N/A',
            tempoInfusao: '5 minutos',
            frequencia: '6/6 horas se dor ou febre (Tax >= 37,8°C)',
            duracao: 'Durante internação',
            contraindicacoes: 'CONTRAINDICAÇÃO ABSOLUTA na Dengue: Ácido Acetilsalicílico (AAS), Anti-inflamatórios Não Esteroidais (Cetoprofeno, Ibuprofeno, Diclofenaco, Nimesulida, Naproxeno) e Corticosteroides.',
            alertasFarmacovigilancia: 'AINEs e AAS agravam a disfunção plaquetária e precipitam hemorragia digestiva maciça e choque hemorrágico.'
          },
          {
            ordem: 5,
            classe: 'Antiemético Parenteral (Para controle de Vômitos Persistentes)',
            farmaco: 'Ondansetrona 2 mg/mL (Ampola 4 mL = 8 mg) ou Metoclopramida 10 mg (Ampola 2 mL)',
            dose: 'Ondansetrona 4 mg a 8 mg EV',
            via: 'Endovenosa (EV)',
            diluicao: 'Diluir em 20 mL de SF 0,9%',
            tempoInfusao: 'Infusão lenta em 3 a 5 minutos',
            frequencia: '8/8 horas',
            duracao: 'Enquanto houver náuseas ou vômitos',
            contraindicacoes: 'Evitar via intramuscular.',
            alertasFarmacovigilancia: 'O controle dos vômitos é essencial para transição futura para hidratação oral.'
          }
        ];
      },
      gerarPrescricaoAlta: (p) => {
        const volHidratacaoOralTotalMl = Math.round(p.pesoKg * 60);
        const volSroMl = Math.round(volHidratacaoOralTotalMl / 3);
        const volDemaisLiquidosMl = volHidratacaoOralTotalMl - volSroMl;

        return [
          {
            ordem: 1,
            classe: 'Hidratação Oral de Transição Pós-Alta Hospitalar (Protocolo Grupo A/B após cumprimento dos critérios de alta)',
            farmaco: 'Sais para Reidratação Oral (SRO - Envelope padrão OMS/MS) + Líquidos Caseiros',
            dose: `60 mL/kg/dia -> Para ${p.pesoKg} kg: Ingerir ${volHidratacaoOralTotalMl} mL (aprox. ${(volHidratacaoOralTotalMl / 1000).toFixed(1)} Litros) por dia`,
            via: 'Via Oral (VO)',
            posologia: `Dividir o volume diário em: 1/3 com Soro de Reidratação Oral (${volSroMl} mL/dia) e 2/3 com água, sucos naturais de frutas, água de coco, chás ou soro caseiro (${volDemaisLiquidosMl} mL/dia).`,
            duracao: 'Manter até 48 horas após a remissão completa da febre e recuperação clínica.',
            orientacoesEspecificas: 'Diluir 1 envelope de SRO em 1 Litro de água filtrada ou fervida fria. Validade da solução pronta: 24 horas.'
          },
          {
            ordem: 2,
            classe: 'Analgésico / Antitérmico Domiciliar',
            farmaco: !p.alergiaDipirona ? 'Dipirona Monoidratada 1 g (Comprimido)' : 'Paracetamol 750 mg (Comprimido)',
            dose: !p.alergiaDipirona ? '1 g (1 comprimido)' : '750 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas apenas se dor ou febre.',
            duracao: 'Se necessário, por até 5 dias.',
            orientacoesEspecificas: 'PROIBIDO tomar AAS (Aspirina), Ibuprofeno, Diclofenaco, Nimesulida, Cetoprofeno, Naproxeno ou qualquer anti-inflamatório.'
          },
          {
            ordem: 3,
            classe: 'Cartão de Acompanhamento da Dengue e Retorno Programado',
            farmaco: 'Entrega obrigatória do Cartão da Dengue preenchido com exames e sinais vitais',
            dose: 'N/A',
            via: 'Documental / Ambulatorial',
            posologia: 'Reavaliação clínica e laboratorial ambulatorial em 24 a 48 horas após a alta.',
            duracao: 'Acompanhamento até recuperação completa.',
            orientacoesEspecificas: 'Manter repouso relativo e proteção contra picadas de mosquitos durante o período febril.'
          }
        ];
      },
      criteriosInternacao: [
        'TODO paciente classificado como Dengue Grupo C tem indicação ABSOLUTA de internação hospitalar por período mínimo de 48 horas.',
        'CRITÉRIOS DE ALTA HOSPITALAR (O paciente precisa preencher TODOS os 6 critérios abaixo simultaneamente):',
        '1. Estabilização hemodinâmica mantida durante 48 horas (sem suporte vasoativo).',
        '2. Ausência de febre por 24 a 48 horas (sem uso de antitérmicos).',
        '3. Melhora visível do quadro clínico e do estado geral, com retorno do apetite.',
        '4. Hematócrito normal e estável por 24 horas.',
        '5. Plaquetas em elevação e acima de 50.000/mm³.',
        '6. Reabsorção dos derrames cavitários ou ausência de desconforto respiratório.'
      ],
      sinaisAlarmeRetorno: [
        'Dor na barriga forte e contínua.',
        'Vômitos frequentes ou com sangue.',
        'Tontura, sensação de desmaio ao levantar ou suor frio.',
        'Sangramento no nariz, gengiva, urina com sangue ou fezes pretas.',
        'Falta de ar, cansaço extremo, sonolência excessiva ou agitação.',
        'Diminuição importante da quantidade de urina.'
      ]
    };
  }

  /**
   * Kit 5: Gastroenterite Aguda (GECA) com Desidratação Moderada (Plano B do MS)
   * Referências: Ministério da Saúde (Brasil) - Manejo do Paciente com Diarreia (Planos A, B e C) / OMS / IDSA.
   * @private
   */
  _construirKitGecaDesidratacaoModerada() {
    return {
      id: 'geca_desidratacao_moderada',
      aliases: [
        'geca',
        'gastroenterite_aguda',
        'diarreia_aguda',
        'desidratacao_plano_b',
        'plano_b_desidratacao',
        'virose_gastrointestinal'
      ],
      titulo: 'Gastroenterite Aguda (GECA) com Desidratação Moderada (Plano B - MS)',
      sindrome: 'Doença Diarreica Aguda / Desidratação Leve a Moderada Sem Choque Hipovolêmico',
      cid10: ['A09', 'E86', 'A08.4'],
      icone: '💧',
      prioridade: 'Moderada (Manchester Amarelo - Iniciar Terapia de Reidratação Oral supervisionada na unidade)',
      diretrizesBase: [
        'Ministério da Saúde (Brasil) - Manejo do Paciente com Diarreia: Avaliação do Estado de Hidratação (Planos A, B e C)',
        'Organização Mundial da Saúde (OMS) - Tratamento da Diarreia',
        'IDSA Clinical Practice Guidelines for the Diagnosis and Management of Infectious Diarrhea'
      ],
      criteriosDiagnosticos: [
        'Diarreia aguda (>= 3 evacuações líquidas ou amolecidas em 24h, com duração <= 14 dias), associada ou não a náuseas, vômitos, febre e dor abdominal em cólica.',
        'Classificação Desidratação Moderada (PLANO B do Ministério da Saúde - Presença de 2 ou mais sinais abaixo):',
        '- Estado geral: Irritado, intranquilo.',
        '- Olhos: Fundos (enoftalmia).',
        '- Lágrimas: Ausentes.',
        '- Sede: Sedento, bebe rápido e avidamente.',
        '- Sinal da prega: Desaparece lentamente (porém em menos de 2 segundos).',
        '- Pulso: Rápido e fraco (Enchimento capilar entre 3 e 5 segundos).',
        '(Se letárgico/inconsciente, incapaz de beber, prega > 2s e pulso muito fino/ausente -> Desidratação Grave = PLANO C Endovenoso imediato).'
      ],
      examesComplementaresPS: [
        'Na maioria dos casos de GECA não complicada sem sinais de sepse, exames laboratoriais NÃO são necessários para iniciar o Plano B.',
        'Solicitar Eletrólitos (Sódio, Potássio), Ureia, Creatinina, Gasometria Venosa e Hemograma SE: desidratação moderada-grave refratária à TRO, idosos frágeis, uso de diuréticos, suspeita de disenteria invasiva (febre alta persistente + sangue/muco nas fezes / tenesmo) ou duração > 7 dias.'
      ],
      gerarPrescricaoHospitalar: (p) => {
        const volTroMinMl = Math.round(p.pesoKg * 50);
        const volTroMaxMl = Math.round(p.pesoKg * 100);
        const volTroMedioMl = Math.round(p.pesoKg * 75);

        return [
          {
            ordem: 1,
            classe: 'TERAPIA DE REIDRATAÇÃO ORAL SUPERVISIONADA NO PS (PLANO B DO MINISTÉRIO DA SAÚDE)',
            farmaco: 'Solução de Sais para Reidratação Oral (SRO - Osmolaridade reduzida OMS: 75 mEq/L de Sódio e 75 mmol/L de Glicose)',
            dose: `50 a 100 mL/kg (Média: 75 mL/kg) administrados no período de 4 a 6 horas -> Para ${p.pesoKg} kg: oferecer entre ${volTroMinMl} mL e ${volTroMaxMl} mL (Média sugerida: ${volTroMedioMl} mL) em 4 horas`,
            via: 'Via Oral (VO) fracionada em pequenos goles frequentes (copo, colher ou seringa)',
            diluicao: '1 envelope de SRO diluído em 1.000 mL de água potável',
            tempoInfusao: 'Administrar continuamente em pequenos volumes durante 4 a 6 horas sob observação na unidade de saúde',
            frequencia: 'Oferecer continuamente na quantidade que o paciente aceitar; reavaliar sinais de hidratação a cada 1 hora',
            duracao: '4 a 6 horas (Se o paciente hidratar, recebe alta com o Plano A; se mantiver sinais de desidratação após 4h, repetir Plano B por mais 2-4h ou passar para Sonda Nasogástrica / Hidratação Venosa se vômitos incoercíveis)',
            contraindicacoes: 'Íleo paralítico, abdome agudo obstrutivo/cirúrgico, alteração do nível de consciência (letargia/coma) ou choque hipovolêmico (nestes casos, iniciar Plano C EV imediato).',
            alertasFarmacovigilancia: 'O transporte acoplado Sódio-Glicose (SGLT-1) no enterócito permanece intacto mesmo nas diarreias secretórias intensas, tornando a TRO extremamente eficaz.'
          },
          {
            ordem: 2,
            classe: 'Antiemético Facilitador da Terapia de Reidratação Oral (Apenas se Vômitos Persistentes)',
            farmaco: 'Ondansetrona 4 mg ou 8 mg (Comprimido Orodispersível) [Alternativa EV se vômitos impedirem VO: Ondansetrona 4 a 8 mg EV lento]',
            dose: p.idade >= 12 ? '8 mg (1 comprimido orodispersível)' : '4 mg (ou 0,15 mg/kg)',
            via: 'Via Oral Orodispersível (Sublingual) ou Endovenosa (EV)',
            diluicao: 'Se EV: diluir em 20 mL de SF 0,9%',
            tempoInfusao: 'Aguardar 15 a 20 minutos após a Ondansetrona para reiniciar a oferta fracionada do SRO',
            frequencia: 'Dose única no PS para viabilizar a TRO',
            duracao: 'Dose única',
            contraindicacoes: 'Síndrome do QT longo congênito; evitar Metoclopramida e Bromoprida em crianças e adultos jovens pelo alto risco de reação extrapiramidal aguda (distonia cervical/crise oculógira) exacerbada pela desidratação.',
            alertasFarmacovigilancia: 'A Ondansetrona reduz a necessidade de acesso venoso e a taxa de hospitalização no Plano B.'
          },
          {
            ordem: 3,
            classe: 'Alternativa de Hidratação Endovenosa (Apenas se Falha da TRO após Ondansetrona ou Evolução para Plano C)',
            farmaco: 'Soro Fisiológico 0,9% ou Ringer Lactato',
            dose: `Se falha da TRO por vômitos incoercíveis: 20 a 30 mL/kg EV em 1 a 2 horas (Para ${p.pesoKg}kg: ${Math.round(p.pesoKg * 20)} a ${Math.round(p.pesoKg * 30)} mL) e reiniciar SRO assim que tolerar VO. [Se Desidratação Grave / Plano C: 100 mL/kg sendo 30 mL/kg em 30 min e 70 mL/kg em 2h30min]`,
            via: 'Endovenosa (EV)',
            diluicao: 'Cristaloide isotônico puro',
            tempoInfusao: 'Conforme estadiamento clínico',
            frequencia: 'Reavaliar a cada 30-60 minutos',
            duracao: 'Até restabelecimento da tolerância oral e normovolemia',
            contraindicacoes: 'NUNCA utilizar Soro Glicosado 5% puro para expansão volêmica (causa hiponatremia dilucional grave e não expande o intravascular).',
            alertasFarmacovigilancia: 'A hidratação venosa não substitui a reposição das perdas fecais com SRO assim que o paciente conseguir beber.'
          },
          {
            ordem: 4,
            classe: 'Analgésico / Antitérmico para Cólicas Abdominais e Febre (Sem uso de Antiespasmódicos Anticolinérgicos ou Loperamida)',
            farmaco: !p.alergiaDipirona ? 'Dipirona Sódica 500 mg/mL (Ampola 2 mL = 1 g)' : 'Paracetamol 750 mg VO',
            dose: !p.alergiaDipirona ? '1 g (2 mL)' : '750 mg',
            via: !p.alergiaDipirona ? 'Endovenosa (EV)' : 'Via Oral (VO)',
            diluicao: !p.alergiaDipirona ? 'Diluir em 20 mL de SF 0,9%' : 'N/A',
            tempoInfusao: '5 minutos',
            frequencia: '6/6 horas se dor abdominal ou febre',
            duracao: 'Se necessário no PS',
            contraindicacoes: 'PROIBIDO uso de Loperamida (Imosec) ou anticolinérgicos redutores de motilidade na sala de emergência, especialmente se houver febre, suspeita de enteroinvasão ou disenteria (risco de megacólon tóxico, íleo paralítico e translocação bacteriana).',
            alertasFarmacovigilancia: 'Evitar também AINEs (Cetoprofeno/Diclofenaco) em pacientes desidratados pelo alto risco de Necrose Tubular Aguda / IRA pré-renal.'
          }
        ];
      },
      gerarPrescricaoAlta: (p) => {
        const itensAlta = [
          {
            ordem: 1,
            classe: 'Manutenção da Hidratação Domiciliar (Transição para PLANO A do Ministério da Saúde após reidratação no PS)',
            farmaco: 'Sais para Reidratação Oral (SRO - Envelopes)',
            dose: p.idade >= 10 ? '200 mL a 400 mL (1 a 2 copos) após CADA evacuação líquida ou episódio de vômito' : (p.idade >= 1 ? '100 a 200 mL após cada evacuação líquida' : '50 a 100 mL após cada evacuação líquida'),
            via: 'Via Oral (VO)',
            posologia: 'Diluir 1 envelope inteiro de SRO em 1 Litro de água filtrada ou fervida (fria). Oferecer após cada evacuação diarreica, além de aumentar a ingestão habitual de líquidos (água, água de coco, sopas leves, chás claros).',
            duracao: 'Enquanto durar a diarreia.',
            orientacoesEspecificas: 'Não ferver a solução depois de pronta e não adicionar açúcar nem sal ao SRO. Evitar refrigerantes, sucos industrializados muito açucarados e bebidas isotônicas esportivas (possuem alta osmolaridade de carboidratos e pouco sódio, piorando a diarreia osmótica).'
          },
          {
            ordem: 2,
            classe: 'Antissecretor IntestinalFisiológico (Inibidor da Encefalinaase - Reduz secreção de água e eletrólitos sem paralisar o trânsito intestinal)',
            farmaco: 'Racecadotrila 100 mg (Cápsula) [Alternativa ou Adjuvante: Probiótico Saccharomyces boulardii CNCM I-745 200 mg]',
            dose: 'Racecadotrila 100 mg (1 cápsula) [Ou Saccharomyces boulardii 200 mg 1 cápsula de 12/12h]',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 cápsula (100 mg) de 8 em 8 horas, preferencialmente antes das principais refeições.',
            duracao: 'Até que ocorram 2 evacuações com fezes moldadas (Duração máxima de 7 dias).',
            orientacoesEspecificas: 'Diferente da Loperamida, a Racecadotrila não causa constipação rebote nem retenção de toxinas bacterianas.'
          },
          {
            ordem: 3,
            classe: 'Analgésico e Antitérmico para Cólicas / Febre',
            farmaco: !p.alergiaDipirona ? 'Dipirona Monoidratada 1 g (Comprimido)' : 'Paracetamol 750 mg (Comprimido)',
            dose: !p.alergiaDipirona ? '1 g (1 comprimido)' : '750 mg (1 comprimido)',
            via: 'Via Oral (VO)',
            posologia: 'Tomar 1 comprimido de 6/6 horas se cólicas abdominais ou febre.',
            duracao: 'Por 3 a 5 dias se necessário.',
            orientacoesEspecificas: 'Não tomar anti-inflamatórios (como Ibuprofeno ou Diclofenaco) devido ao risco de lesão nos rins durante a desidratação.'
          },
          {
            ordem: 4,
            classe: 'Antiemético de Resgate',
            farmaco: 'Ondansetrona 8 mg (Comprimido orodispersível)',
            dose: '8 mg (1 comprimido)',
            via: 'Via Oral / Sublingual',
            posologia: 'Dissolver 1 comprimido na língua de 8/8 horas caso apresente náuseas ou vômitos.',
            duracao: 'Por até 3 dias se necessário.',
            orientacoesEspecificas: 'Aguardar 20 minutos após tomar o comprimido para ingerir o Soro de Reidratação Oral em pequenos goles.'
          }
        ];

        if (p.idade < 5) {
          itensAlta.push({
            ordem: 5,
            classe: 'Suplementação Micronutricional Obrigatória em Pediatria (< 5 anos - Protocolo MS/OMS)',
            farmaco: 'Sulfato de Zinco (Xarope 4 mg/mL ou Comprimido dispersível)',
            dose: p.idade < 0.5 ? '10 mg de Zinco elementar ao dia' : '20 mg de Zinco elementar ao dia',
            via: 'Via Oral (VO)',
            posologia: 'Administrar 1 vez ao dia.',
            duracao: 'Durante 10 a 14 dias completos (mesmo após cessar a diarreia).',
            orientacoesEspecificas: 'Reduz a duração do episódio atual e previne novas diarreias nos 2 a 3 meses seguintes.'
          });
        }

        return itensAlta;
      },
      criteriosInternacao: [
        'Evolução para Desidratação Grave / Choque Hipovolêmico (Plano C): Letargia, inconsciência, pulso radial muito fraco ou ausente, enchimento capilar > 5s, sinal da prega > 2s.',
        'Falha da Terapia de Reidratação Oral (persistência da desidratação moderada ou vômitos incoercíveis mesmo após Ondansetrona e tentativa de gastróclise/EV inicial).',
        'Sinais de Sepse de foco abdominal, Disenteria grave toxêmica ou suspeita de Abdome Agudo Cirúrgico (apendicite aguda em fase inicial mimetizando GECA, isquemia mesentérica em idosos).',
        'Distúrbios hidroeletrolíticos graves (hiponatremia/hipernatremia sintomática, hipocalemia severa) ou Injúria Renal Aguda estabelecida.',
        'Idosos frágeis, imunossuprimidos graves ou vulnerabilidade social que impeça a manutenção do Plano A em domicílio.'
      ],
      sinaisAlarmeRetorno: [
        'Piora da diarreia ou vômitos repetidos que impeçam de beber líquidos.',
        'Presença de sangue vivo, pus ou muco abundante nas fezes (disenteria).',
        'Febre alta persistente (acima de 38,5°C) ou dor abdominal contínua e localizada que piora ao caminhar ou tossir.',
        'Sinais de desidratação: muita sede, boca muito seca, olhos fundos, tontura ao levantar ou parar de urinar por mais de 6 a 8 horas.',
        'Sonolência excessiva, confusão mental ou fraqueza extrema (especialmente em crianças e idosos).'
      ]
    };
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS DA INTERFACE DE DOMÍNIO
  // ============================================================================

  /**
   * Lista os metadados resumidos de todos os kits sindrômicos disponíveis em RAM.
   * @returns {Array<{id: string, titulo: string, sindrome: string, icone: string, prioridade: string}>}
   */
  listarKits() {
    const lista = [];
    for (const kit of this._kitsMap.values()) {
      lista.push({
        id: kit.id,
        titulo: kit.titulo,
        sindrome: kit.sindrome,
        icone: kit.icone,
        prioridade: kit.prioridade
      });
    }
    return lista;
  }

  /**
   * Executa escores clínicos determinísticos integrados aos pacotes sindrômicos.
   * Suporta: 'centor_mcisaac' (e aliases como 'centor', 'mcisaac').
   * @param {string} escoreId
   * @param {Object} params
   * @returns {Object} Resultado estruturado do escore com pontuação, probabilidade e conduta.
   */
  avaliarEscore(escoreId, params = {}) {
    const chave = this._normalizarChave(escoreId);

    if (chave === 'centor_mcisaac' || chave === 'centor' || chave === 'mcisaac') {
      return this._calcularCentorMcIsaac(params);
    }

    throw new Error(`Escore clínico não reconhecido no domínio: "${escoreId}". Escores suportados: 'centor_mcisaac'.`);
  }

  /**
   * Cálculo determinístico do Escore de Centor modificado por McIsaac para Faringoamigdalite Estreptocócica.
   * @private
   * @param {Object} params
   * @returns {Object}
   */
  _calcularCentorMcIsaac(params = {}) {
    const febre = Boolean(params.febre); // Temperatura > 38°C (+1)
    const ausenciaTosse = Boolean(params.ausenciaTosse); // Ausência de tosse (+1)
    const adenomegalia = Boolean(params.adenomegalia); // Adenopatia cervical anterior dolorosa (+1)
    const exsudato = Boolean(params.exsudato); // Exsudato ou hipertrofia amigdaliana (+1)
    const idadeNum = params.idade !== undefined && !Number.isNaN(Number(params.idade)) ? Number(params.idade) : 30;

    let pontos = 0;
    const criteriosPontuados = [];

    if (febre) {
      pontos += 1;
      criteriosPontuados.push('História de febre > 38,0°C (+1 ponto)');
    }
    if (ausenciaTosse) {
      pontos += 1;
      criteriosPontuados.push('Ausência de tosse (+1 ponto)');
    }
    if (adenomegalia) {
      pontos += 1;
      criteriosPontuados.push('Linfonodomegalia cervical anterior dolorosa (+1 ponto)');
    }
    if (exsudato) {
      pontos += 1;
      criteriosPontuados.push('Hipertrofia ou exsudato tonsilar (+1 ponto)');
    }

    // Modificador etário de McIsaac:
    // 3 a 14 anos: +1 ponto
    // 15 a 44 anos: 0 ponto
    // >= 45 anos: -1 ponto
    if (idadeNum >= 3 && idadeNum <= 14) {
      pontos += 1;
      criteriosPontuados.push(`Idade entre 3 e 14 anos (${idadeNum} anos) (+1 ponto)`);
    } else if (idadeNum >= 15 && idadeNum <= 44) {
      criteriosPontuados.push(`Idade entre 15 e 44 anos (${idadeNum} anos) (0 ponto)`);
    } else if (idadeNum >= 45) {
      pontos -= 1;
      criteriosPontuados.push(`Idade >= 45 anos (${idadeNum} anos) (-1 ponto)`);
    }

    let probabilidadeEstreptococica = '';
    let estratificacaoRisco = '';
    let condutaRecomendada = '';
    let indicaAntibioticoEmpiricoSemTeste = false;

    if (pontos <= 0) {
      probabilidadeEstreptococica = '1% a 2,5%';
      estratificacaoRisco = 'Risco Muito Baixo (Provável Etiologia Viral)';
      condutaRecomendada = 'NÃO realizar teste rápido nem cultura. NÃO prescrever antibiótico. Tratamento exclusivamente sintomático (analgésicos/anti-inflamatórios).';
      indicaAntibioticoEmpiricoSemTeste = false;
    } else if (pontos === 1) {
      probabilidadeEstreptococica = '5% a 10%';
      estratificacaoRisco = 'Risco Baixo (Provável Etiologia Viral)';
      condutaRecomendada = 'NÃO realizar teste rápido de rotina. NÃO prescrever antibiótico. Tratamento sintomático e reavaliação se piora.';
      indicaAntibioticoEmpiricoSemTeste = false;
    } else if (pontos === 2) {
      probabilidadeEstreptococica = '11% a 17%';
      estratificacaoRisco = 'Risco Intermediário';
      condutaRecomendada = 'Solicitar Teste Rápido de Detecção de Antígeno (TRDA / Strep Test) ou cultura de orofaringe. Prescrever antibiótico APENAS se o teste for positivo.';
      indicaAntibioticoEmpiricoSemTeste = false;
    } else if (pontos === 3) {
      probabilidadeEstreptococica = '28% a 35%';
      estratificacaoRisco = 'Risco Moderado-Alto';
      condutaRecomendada = 'Solicitar Teste Rápido (TRDA) se disponível; caso TRDA indisponível (realidade frequente no SUS/PS) ou paciente com alto risco para Febre Reumática, iniciar antibioticoterapia erradicadora (Penicilina Benzatina IM ou Amoxicilina VO por 10 dias).';
      indicaAntibioticoEmpiricoSemTeste = true;
    } else {
      probabilidadeEstreptococica = '51% a 53%';
      estratificacaoRisco = 'Risco Alto para Faringoamigdalite Estreptocócica (EBHGA)';
      condutaRecomendada = 'Iniciar antibioticoterapia erradicadora empírica imediata (Penicilina Benzatina IM dose única ou Amoxicilina VO por 10 dias) ou confirmar com Teste Rápido.';
      indicaAntibioticoEmpiricoSemTeste = true;
    }

    return {
      escoreId: 'centor_mcisaac',
      nome: 'Escore de Centor Modificado por McIsaac',
      pontuacao: pontos,
      probabilidadeEstreptococica,
      estratificacaoRisco,
      condutaRecomendada,
      indicaAntibioticoEmpiricoSemTeste,
      criteriosPontuados
    };
  }

  /**
   * Obtém o pacote sindrômico completo e personalizado para os parâmetros do paciente,
   * incluindo o texto estruturado pronto para copiar e colar no Prontuário Eletrônico do Paciente (PEP).
   * @param {string} kitId Identificador ou alias do kit
   * @param {Object} opcoes { pesoKg: 70, idade: 30, alergiaPenicilina: false, ... }
   * @returns {Object} Objeto completo do kit sindrômico
   */
  obterKit(kitId, opcoes = {}) {
    const chaveNormalizada = this._normalizarChave(kitId);
    const idReal = this._aliasesMap.get(chaveNormalizada);

    if (!idReal || !this._kitsMap.has(idReal)) {
      throw new Error(
        `Kit sindrômico não encontrado para o identificador "${kitId}". Kits disponíveis: ${Array.from(this._kitsMap.keys()).join(', ')}.`
      );
    }

    const kitBase = this._kitsMap.get(idReal);
    const paramsPaciente = this._sanitizarOpcoesPaciente(opcoes);

    const prescricaoHospitalar = kitBase.gerarPrescricaoHospitalar(paramsPaciente);
    const prescricaoAlta = kitBase.gerarPrescricaoAlta(paramsPaciente);

    let avaliacaoEscoreIntegrado = null;
    if (kitBase.id === 'amigdalite_bacteriana') {
      const paramsCentor = paramsPaciente.escoreParams || {
        febre: true,
        ausenciaTosse: true,
        adenomegalia: true,
        exsudato: true,
        idade: paramsPaciente.idade
      };
      if (paramsCentor.idade === undefined) {
        paramsCentor.idade = paramsPaciente.idade;
      }
      avaliacaoEscoreIntegrado = this.avaliarEscore('centor_mcisaac', paramsCentor);
    }

    const objetoKitPersonalizado = {
      id: kitBase.id,
      titulo: kitBase.titulo,
      sindrome: kitBase.sindrome,
      cid10: [...kitBase.cid10],
      icone: kitBase.icone,
      prioridade: kitBase.prioridade,
      diretrizesBase: [...kitBase.diretrizesBase],
      parametrosAplicados: paramsPaciente,
      avaliacaoEscoreIntegrado,
      criteriosDiagnosticos: [...kitBase.criteriosDiagnosticos],
      examesComplementaresPS: [...kitBase.examesComplementaresPS],
      prescricaoHospitalar,
      prescricaoAlta,
      criteriosInternacao: [...kitBase.criteriosInternacao],
      sinaisAlarmeRetorno: [...kitBase.sinaisAlarmeRetorno],
      textoCopiaPEP: ''
    };

    objetoKitPersonalizado.textoCopiaPEP = this._gerarTextoCopiaPEP(objetoKitPersonalizado);

    return objetoKitPersonalizado;
  }

  /**
   * Gera texto limpo, técnico, sem markdown quebrado ou emojis excessivos,
   * pronto para copiar e colar diretamente no Prontuário Eletrônico do Paciente (PEP / MV / Tasy / Philips).
   * @private
   * @param {Object} kit
   * @returns {string}
   */
  _gerarTextoCopiaPEP(kit) {
    const p = kit.parametrosAplicados;
    const linhas = [];

    linhas.push('========================================================================');
    linhas.push(`PROTOCOLO CLINICO E PRESCRICAO PADRONIZADA - ${kit.titulo.toUpperCase()}`);
    linhas.push(`Sindrome Clinica: ${kit.sindrome}`);
    linhas.push(`CID-10 Sugerido: ${kit.cid10.join(' / ')}`);
    linhas.push(
      `Parametros de Calculo: Peso ${p.pesoKg} kg | Idade ${p.idade} anos | Alergia Penicilina: ${p.alergiaPenicilina ? 'SIM' : 'NAO'}`
    );
    linhas.push('========================================================================');
    linhas.push('');

    if (kit.avaliacaoEscoreIntegrado) {
      const esc = kit.avaliacaoEscoreIntegrado;
      linhas.push(`ESTRATIFICACAO CLINICA (${esc.nome.toUpperCase()}):`);
      linhas.push(`- Pontuacao: ${esc.pontuacao} ponto(s) | Probabilidade de S. pyogenes: ${esc.probabilidadeEstreptococica}`);
      linhas.push(`- Classificacao: ${esc.estratificacaoRisco}`);
      linhas.push(`- Conduta Baseada em Evidencia: ${esc.condutaRecomendada}`);
      linhas.push('');
    }

    linhas.push('1. EXAMES E PROPEDEUTICA NO PRONTO-SOCORRO:');
    kit.examesComplementaresPS.forEach((exame) => {
      linhas.push(`   - ${exame}`);
    });
    linhas.push('');

    linhas.push('2. PRESCRICAO HOSPITALAR IMEDIATA (SALA DE OBSERVACAO / EMERGENCIA):');
    kit.prescricaoHospitalar.forEach((item) => {
      linhas.push(`   ${item.ordem}) [${item.classe}]`);
      linhas.push(`      Farmaco: ${item.farmaco}`);
      linhas.push(`      Dose: ${item.dose} | Via: ${item.via}`);
      linhas.push(`      Diluicao/Preparo: ${item.diluicao}`);
      linhas.push(`      Velocidade/Infusao: ${item.tempoInfusao} | Frequencia: ${item.frequencia}`);
      linhas.push(`      Seguranca/Alertas: ${item.alertasFarmacovigilancia}`);
    });
    linhas.push('');

    linhas.push('3. PRESCRICAO DOMICILIAR / ALTA MEDICA ORIENTADA:');
    kit.prescricaoAlta.forEach((item) => {
      linhas.push(`   ${item.ordem}) ${item.farmaco} (${item.via})`);
      linhas.push(`      Posologia: ${item.posologia}`);
      linhas.push(`      Duracao: ${item.duracao}`);
      linhas.push(`      Orientacao: ${item.orientacoesEspecificas}`);
    });
    linhas.push('');

    linhas.push('4. CRITERIOS DE INTERNACAO E RED FLAGS:');
    kit.criteriosInternacao.forEach((crit) => {
      linhas.push(`   - ${crit}`);
    });
    linhas.push('');

    linhas.push('5. ORIENTACOES DE SINAIS DE ALARME PARA RETORNO IMEDIATO ENTREGUES AO PACIENTE:');
    kit.sinaisAlarmeRetorno.forEach((sinal) => {
      linhas.push(`   - ${sinal}`);
    });
    linhas.push('========================================================================');

    return linhas.join('\n');
  }

  /**
   * Gera a representação visual elegante e estruturada com emojis médicos para exibição no Telegram.
   * @param {string} kitId Identificador ou alias do kit
   * @param {Object} opcoes Parâmetros do paciente
   * @returns {string} Texto formatado para mensageria
   */
  gerarTextoFormatadoTelegram(kitId, opcoes = {}) {
    const kit = this.obterKit(kitId, opcoes);
    const p = kit.parametrosAplicados;
    const blocos = [];

    blocos.push(`${kit.icone} *${kit.titulo.toUpperCase()}*`);
    blocos.push(`📋 *Síndrome:* ${kit.sindrome}`);
    blocos.push(`🏷️ *CID-10:* \`${kit.cid10.join(' | ')}\``);
    blocos.push(`🚨 *Prioridade:* ${kit.prioridade}`);
    blocos.push(
      `⚖️ *Parâmetros Aplicados:* \`${p.pesoKg} kg\` | \`${p.idade} anos\` | Alergia Penicilina: \`${p.alergiaPenicilina ? 'SIM ⚠️' : 'NÃO'}\``
    );
    blocos.push('━━━━━━━━━━━━━━━━━━━━━━');

    if (kit.avaliacaoEscoreIntegrado) {
      const esc = kit.avaliacaoEscoreIntegrado;
      blocos.push(`🧮 *${esc.nome}*`);
      blocos.push(`• *Pontuação:* \`${esc.pontuacao} ponto(s)\` (_Probabilidade EBHGA: ${esc.probabilidadeEstreptococica}_)`);
      blocos.push(`• *Risco:* ${esc.estratificacaoRisco}`);
      blocos.push(`• *Conduta:* ${esc.condutaRecomendada}`);
      blocos.push('━━━━━━━━━━━━━━━━━━━━━━');
    }

    blocos.push('🔬 *CRITÉRIOS CLÍNICOS E PROPEDÊUTICA*');
    kit.criteriosDiagnosticos.forEach((c) => {
      blocos.push(`• ${c}`);
    });
    blocos.push('');
    blocos.push('🧪 *Exames no PS:*');
    kit.examesComplementaresPS.forEach((ex) => {
      blocos.push(`▫️ ${ex}`);
    });
    blocos.push('━━━━━━━━━━━━━━━━━━━━━━');

    blocos.push('💉 *PRESCRIÇÃO NO PRONTO-SOCORRO (OBSERVAÇÃO)*');
    kit.prescricaoHospitalar.forEach((item) => {
      blocos.push(`\n*${item.ordem}. ${item.farmaco}*`);
      blocos.push(`   ├ *Classe:* _${item.classe}_`);
      blocos.push(`   ├ *Dose / Via:* \`${item.dose}\` — ${item.via}`);
      blocos.push(`   ├ *Diluição:* ${item.diluicao}`);
      blocos.push(`   ├ *Infusão / Freq:* ${item.tempoInfusao} | ${item.frequencia}`);
      blocos.push(`   ├ *Contraindicações:* ${item.contraindicacoes}`);
      blocos.push(`   └ ⚠️ *Farmacovigilância:* ${item.alertasFarmacovigilancia}`);
    });
    blocos.push('━━━━━━━━━━━━━━━━━━━━━━');

    blocos.push('🏠 *PRESCRIÇÃO DE ALTA / MANEJO DOMICILIAR*');
    kit.prescricaoAlta.forEach((item) => {
      blocos.push(`\n*${item.ordem}. ${item.farmaco}* (${item.via})`);
      blocos.push(`   ├ *Posologia:* ${item.posologia}`);
      blocos.push(`   ├ *Duração:* \`${item.duracao}\``);
      blocos.push(`   └ 💡 *Orientação:* ${item.orientacoesEspecificas}`);
    });
    blocos.push('━━━━━━━━━━━━━━━━━━━━━━');

    blocos.push('🏥 *CRITÉRIOS DE INTERNAÇÃO / GRAVIDADE*');
    kit.criteriosInternacao.forEach((ci) => {
      blocos.push(`🔸 ${ci}`);
    });
    blocos.push('');

    blocos.push('🚩 *SINAIS DE ALARME PARA RETORNO IMEDIATO*');
    kit.sinaisAlarmeRetorno.forEach((sa) => {
      blocos.push(`⚠️ ${sa}`);
    });
    blocos.push('━━━━━━━━━━━━━━━━━━━━━━');
    blocos.push(`📚 *Referências:* _${kit.diretrizesBase.join(' | ')}_`);

    return blocos.join('\n');
  }
}

module.exports = PacotesSindromicosDomain;
