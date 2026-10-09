/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE GINECOLOGIA ENDÓCRINA E CIRÚRGICA
 * ==============================================================================
 * Manejo Clínico da Endometriose e Dor Pélvica Crônica
 * Diretrizes ESHRE (2022/2024), FEBRASGO (2024-2026), AAGL (2021)
 * 
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 * 1. Diagnóstico Clínico e Mapeamento dos Sintomas (Os "6 Ds" da Endometriose):
 *    - Dismenorreia incapacitante / progressiva
 *    - Dispareunia de profundidade
 *    - Disquezia cíclica (dor evacuatória perimenstrual)
 *    - Disúria cíclica / hematúria
 *    - Dor pélvica acíclica crônica (≥ 6 meses)
 *    - Dificuldade reprodutiva / infertilidade
 * 2. Mapeamento Topográfico por Imagem de Alta Resolução:
 *    - USG Transvaginal com preparo intestinal prévio dedicado
 *    - Ressonância Magnética (RM) de pelve com protocolo para endometriose
 *    - Mapeamento de compartimentos anterior (bexiga, ureteres), médio (miométrio/adenomiose,
 *      ovários/endometriomas) e posterior (ligamentos úterossacros, toro, recesso de Douglas,
 *      septo retovaginal e retossigmoide)
 * 3. Identificação Precoce de Sinais de Alarme Cirúrgico (Red Flags):
 *    - Acometimento ureteral com hidronefrose silenciosa (risco de perda renal ipsilateral)
 *    - Acometimento retossigmoídeo estenosante (≥ 50% de diâmetro luminal ou suboclusão)
 *    - Endometrioma ovariano volumoso (≥ 4-5 cm) ou com suspeita atípica
 * 4. Terapia Farmacológica Escalonada de Supressão Estrogênica:
 *    - 1ª Linha: Progestagênios contínuos (Dienogeste 2 mg/dia como padrão de eficácia e
 *      indução de atrofia dos focos; SIU-Levonorgestrel 52 mg; Desogestrel 75 mcg/dia) e
 *      Anticoncepcionais Hormonais Combinados (AHC) em regime contínuo
 *    - 2ª Linha: Antagonistas orais de GnRH (Relugolix 40 mg/dia com add-back therapy ou Elagolix)
 *      ou Análogos agonistas de GnRH (Goserrelina / Leuprorrelina) com add-back obrigatória
 * 5. Tomada de Decisão Reprodutiva vs Cirúrgica:
 *    - Desejo reprodutivo ativo: Bloqueio estrito de fármacos contraceptivos hormonais
 *    - Avaliação mandatória de reserva ovariana (AMH / CFA)
 *    - Indicação precoce de Fertilização in Vitro (FIV) em idade materna ≥ 35 anos, infertilidade > 2 anos,
 *      AMH baixo ou endometriose profunda/tubária, prevenindo cirurgias ovarianas espoliativas
 *    - Indicações precisas de cirurgia (laparoscopia/robótica) com abordagem multidisciplinar nerve-sparing
 * ==============================================================================
 */

var GinecologiaEndometrioseService = (function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CATÁLOGO FARMACOLÓGICO E DIRETRIZES (ESHRE / FEBRASGO)
  // ───────────────────────────────────────────────────────────────────────────

  var CATALOGO_FARMACOLOGICO = {
    PRIMEIRA_LINHA: {
      DIENOGESTE: {
        farmaco: "Dienogeste 2 mg",
        posologia: "2 mg VO 1x/dia, uso oral contínuo diário no mesmo horário (sem pausas)",
        classe: "Progestagênio de 4ª geração com potente atividade seletiva antiandrogênica e progestagênica",
        mecanismo: "Induz decidualização seguida de atrofia progressiva dos implantes ectópicos de endométrio. Reduz a síntese de citocinas pró-inflamatórias (IL-6, IL-8, TNF-alfa), angiogênese e níveis de prostaglandinas locais.",
        evidencia: "Padrão de excelência de 1ª linha (ESHRE 2022/2024 / FEBRASGO). Eficácia comparável aos agonistas de GnRH no alívio da dor, sem causar hipoestrogenismo severo ou perda óssea acelerada.",
        efeitosAdversos: "Sangramento de escape ('spotting') nos primeiros 3-6 meses, cefaleia, alterações discretas de humor ou mastalgia."
      },
      SIU_LEVONORGESTREL: {
        farmaco: "Sistema Intrauterino Liberador de Levonorgestrel (SIU-LNG 52 mg - Mirena)",
        posologia: "Inserção intrauterina estéril em consultório (duração de até 8 anos para contracepção / 5 anos para controle da dor)",
        classe: "Progestagênio intrauterino de liberação local contínua (20 mcg/dia)",
        mecanismo: "Promove pronunciada atrofia endometrial local, redução da vascularização e decréscimo drástico do fluxo menstrual e da dismenorreia.",
        evidencia: "Excelente opção de 1ª linha, particularmente indicada na endometriose associada à ADENOMIOSE e hipermenorreia.",
        vantagens: "Ação predominantemente local com níveis séricos mínimos, alta adesão terapêutica."
      },
      DESOGESTREL: {
        farmaco: "Desogestrel 75 mcg",
        posologia: "1 comprimido VO 1x/dia continuamente sem intervalo entre as cartelas",
        classe: "Progestagênio oral contínuo (pílula isolada)",
        mecanismo: "Inibe a ovulação em 97% dos ciclos e promove supressão estrogênica moderada e atrofia endometrial.",
        evidencia: "Opção de baixo custo e ampla disponibilidade no SUS para pacientes com contraindicações a estrogênios."
      },
      AHC_CONTINUO: {
        farmaco: "Anticoncepcionais Hormonais Combinados em Regime Contínuo",
        posologia: "1 comprimido VO ao dia sem pausa de intervalo (ex: Etinilestradiol 20-30 mcg + Levonorgestrel/Gestodeno/Drospirenona)",
        classe: "Estroprogestativo oral contínuo",
        mecanismo: "Bloqueia a menstruação retrógrada pela indução de amenorreia sustentada e inibe a maturação folicular cíclica.",
        precaucoes: "Avaliar critérios de elegibilidade da OMS (MEC 1/2). Evitar em tabagistas > 35 anos, histórico de TEV, enxaqueca com aura ou hipertensão."
      }
    },
    SEGUNDA_LINHA: {
      ANTAGONISTAS_GNRH: {
        RELUGOLIX_COMBINADO: {
          farmaco: "Relugolix 40 mg + Estradiol 1 mg + Acetato de Noretisterona 0,5 mg (Ryeqo)",
          posologia: "1 comprimido VO 1x/dia contínuo, iniciado preferencialmente nos primeiros 5 dias da menstruação",
          classe: "Antagonista oral não peptídico do receptor de GnRH com Terapia Add-Back integrada",
          mecanismo: "Bloqueio imediato e competitivo dos receptores hipofisários de GnRH, promovendo rápida supressão de FSH e LH sem o fenômeno de 'flare-up'. A terapia add-back incorporada previne perda óssea e sintomas vasomotores.",
          evidencia: "2ª Linha de alta eficácia aprovada em consensos internacionais recentes para dor pélvica moderada a grave refratária a progestagênios."
        },
        ELAGOLIX: {
          farmaco: "Elagolix",
          posologia: "150 mg VO 1x/dia por até 24 meses OU 200 mg VO 2x/dia por até 6 meses (adicionar add-back se > 6 meses)",
          classe: "Antagonista oral de GnRH de dosagem ajustável"
        }
      },
      ANALOGOS_GNRH: {
        GOSSERRELINA: {
          farmaco: "Acetato de Gosserrelina (Zoladex 3,6 mg)",
          posologia: "3,6 mg SC em depósito na parede abdominal a cada 28 dias",
          classe: "Agonista do receptor de GnRH (GnRHa de depósito)",
          mecanismo: "Promove estimulação inicial transitória ('flare-up' nos primeiros 10-14 dias) seguida por profunda dessensibilização dos receptores hipofisários de GnRH, induzindo estado de hipoestrogenismo profundo ('menopausa farmacológica').",
          alertaAddBack: "MANDATÓRIO associar Terapia Add-Back (ex: Noretisterona 2,5 mg/dia ou Estradiol 1 mg + Noretisterona 0,5 mg) se tratamento previsto > 3 a 6 meses, visando prevenir osteopenia severa e sintomas climatéricos incapacitantes.",
          duracaoMaxima: "Máximo de 6 meses sem add-back; até 12 a 24 meses com add-back e monitoramento de densitometria óssea (DMO)."
        },
        LEUPRORRELINA: {
          farmaco: "Acetato de Leuprorrelina 3,75 mg",
          posologia: "3,75 mg IM em depósito a cada 28 dias (com add-back se > 3 meses)"
        }
      }
    },
    ANALGESIA_ADJUVANTE: {
      AINES: "AINEs (ex: Cetoprofeno 100-150 mg/dia ou Ibuprofeno 600 mg 8/8h) para manejo de exacerbações álgicas pontuais em cursos curtos (3 a 5 dias). Não reduzem os focos de endometriose.",
      NEUROMODULADORES: "Em dor pélvica crônica com sensibilização central e dor nociplástica/neuropática: Gabapentina 300 a 900 mg/dia, Pregabalina 75 a 150 mg/dia ou Duloxetina 30 a 60 mg/dia."
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AVALIAÇÃO DETERMINÍSTICA DO CASO CLÍNICO
  // ───────────────────────────────────────────────────────────────────────────

  function avaliarEndometriose(dados) {
    dados = dados || {};

    var idade = parseInt(dados.idade, 10) || 0;
    var evaDor = parseFloat(dados.evaDor) || 0;
    var tempoInfertilidadeAnos = parseFloat(dados.tempoInfertilidadeAnos) || 0;
    var amh = parseFloat(dados.amh) || 0;
    var cfa = parseInt(dados.cfa, 10) || 0;

    // Sintomas clínicos dos 6 Ds
    var dismenorreia = Boolean(dados.dismenorreia);
    var dispareunia = Boolean(dados.dispareunia);
    var disquezia = Boolean(dados.disquezia);
    var disuria = Boolean(dados.disuria);
    var dorPelvicaCronica = Boolean(dados.dorPelvicaCronica);
    var infertilidade = Boolean(dados.infertilidade) || tempoInfertilidadeAnos > 0;
    var desejoGestacional = Boolean(dados.desejoGestacional) || Boolean(dados.tentandoEngravidar);

    // Achados de Imagem e Topografia
    var tipoExame = (dados.tipoExame || '').trim();
    var imagemRealizada = Boolean(dados.usgComPreparo || dados.rmPelve || /usg|ultrassom|rm|resson/i.test(tipoExame));
    var superficial = Boolean(dados.superficial);
    var endometrioma = Boolean(dados.endometrioma) || parseFloat(dados.endometriomaTamanhoCm) > 0 || parseFloat(dados.endometriomaTamanhoMm) > 0;
    
    var endometriomaCm = parseFloat(dados.endometriomaTamanhoCm) || 0;
    if (!endometriomaCm && parseFloat(dados.endometriomaTamanhoMm) > 0) {
      endometriomaCm = parseFloat(dados.endometriomaTamanhoMm) / 10.0;
    }
    var endometriomaBilateral = Boolean(dados.endometriomaBilateral);

    // Endometriose Profunda e Compartimentos
    var profunda = Boolean(dados.profunda);
    var acometimentoUreteral = Boolean(dados.acometimentoUreteral || dados.ureter || dados.hidronefrose);
    var hidronefrose = Boolean(dados.hidronefrose);
    var acometimentoIntestinal = Boolean(dados.acometimentoIntestinal || dados.reto || dados.sigmoide || dados.retossigmoide);
    var estenoseIntestinal = parseFloat(dados.estenoseIntestinalPercentual) || 0;
    var sintomasSuboclusivos = Boolean(dados.sintomasSuboclusivos || dados.suboclusao);
    var ligamentosUterossacros = Boolean(dados.ligamentosUterossacros || dados.uterossacro);
    var toroUterino = Boolean(dados.toroUterino);
    var obliteracaoDouglas = Boolean(dados.obliteracaoDouglas);
    var septoRetovaginal = Boolean(dados.septoRetovaginal);
    var bexiga = Boolean(dados.bexiga);
    var adenomiose = Boolean(dados.adenomiose);

    if (acometimentoUreteral || acometimentoIntestinal || ligamentosUterossacros || septoRetovaginal || bexiga || obliteracaoDouglas) {
      profunda = true;
    }

    // Histórico de Tratamentos Prévios
    var falhaDienogeste = Boolean(dados.falhaDienogeste);
    var falhaAhc = Boolean(dados.falhaAhc);
    var falhaSiuLng = Boolean(dados.falhaSiuLng);
    var usoDienogeste = Boolean(dados.usoDienogeste);
    var usoAhc = Boolean(dados.usoAhc);
    var cirurgiaPrevia = Boolean(dados.cirurgiaPrevia);
    var numCirurgiasPrevias = parseInt(dados.numCirurgiasPrevias, 10) || (cirurgiaPrevia ? 1 : 0);

    // ─────────────────────────────────────────────────────────────────────────
    // A. Contabilização e Estratificação dos Sintomas (Os "6 Ds")
    // ─────────────────────────────────────────────────────────────────────────
    var contagem6Ds = 0;
    var listaSintomasPresentes = [];

    if (dismenorreia) { contagem6Ds++; listaSintomasPresentes.push("Dismenorreia progressiva/incapacitante"); }
    if (dispareunia) { contagem6Ds++; listaSintomasPresentes.push("Dispareunia de profundidade"); }
    if (disquezia) { contagem6Ds++; listaSintomasPresentes.push("Disquezia cíclica (perimenstrual)"); }
    if (disuria) { contagem6Ds++; listaSintomasPresentes.push("Disúria cíclica / desconforto vesical menstrual"); }
    if (dorPelvicaCronica) { contagem6Ds++; listaSintomasPresentes.push("Dor pélvica crônica acíclica (≥ 6 meses)"); }
    if (infertilidade) { contagem6Ds++; listaSintomasPresentes.push("Dificuldade para engravidar / Infertilidade conjugal"); }

    var intensidadeDorTexto = "Não informada";
    if (evaDor >= 7) {
      intensidadeDorTexto = "DOR GRAVE / INCAPACITANTE (EVA " + evaDor + "/10)";
    } else if (evaDor >= 4) {
      intensidadeDorTexto = "DOR MODERADA (EVA " + evaDor + "/10)";
    } else if (evaDor > 0) {
      intensidadeDorTexto = "DOR LEVE (EVA " + evaDor + "/10)";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // B. Auditoria de Red Flags (Critérios de Alarme Cirúrgico / Emergencial)
    // ─────────────────────────────────────────────────────────────────────────
    var redFlags = [];
    var indicacaoCirurgicaUrgente = false;

    if (acometimentoUreteral || hidronefrose) {
      redFlags.push({
        orgao: "Trato Urinário (Ureter / Rim)",
        achado: hidronefrose ? "Hidronefrose / Pielocaliectasia diagnosticada" : "Envolvimento de ureter por endometriose profunda retroperitoneal",
        risco: "Risco iminente de perda silenciosa e irreversível da função renal ipsilateral.",
        conduta: "Indicação cirúrgica obrigatória de desobstrução (ureterólise vs reimplante ureterovesical com duplo J) em conjunto com Urologia."
      });
      indicacaoCirurgicaUrgente = true;
    }

    if (acometimentoIntestinal && (estenoseIntestinal >= 50 || sintomasSuboclusivos)) {
      redFlags.push({
        orgao: "Trato Gastrointestinal (Retossigmoide)",
        achado: "Estenose luminal retossigmoídea significativa (≥ 50%) ou sintomas suboclusivos mecânicos",
        risco: "Risco de obstrução intestinal mecânica completa.",
        conduta: "Avaliação cirúrgica compartilhada com Coloproctologia (shaving, ressecção discoide ou ressecção segmentar de reto/sigmoide com margens seguras)."
      });
      indicacaoCirurgicaUrgente = true;
    }

    if (endometrioma && endometriomaCm >= 4.0) {
      redFlags.push({
        orgao: "Anexo Ovariano",
        achado: "Endometrioma volumoso (≥ " + endometriomaCm.toFixed(1) + " cm)",
        risco: "Risco aumentado de torção anexial, rotura espontânea e dano tecidual ovariano.",
        conduta: "Avaliação cuidadosa. Se cirurgia for indicada, atentar estritamente para o risco de falência ovariana prematura pós-cistectomia."
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C. Tomada de Decisão: Desejo Reprodutivo vs Cirurgia vs Fármacos
    // ─────────────────────────────────────────────────────────────────────────
    var condutaInvestigativa = [];
    var condutaFarmacologica = [];
    var planoCirurgico = [];
    var planoReprodutivo = [];
    var alertasSeguranca = [];

    // 1. Investigação por Imagem
    if (!imagemRealizada) {
      alertasSeguranca.push("Mapeamento incompleto: Exames ginecológicos convencionais sem preparo falham em detectar até 80% das lesões profundas.");
      condutaInvestigativa.push("Solicitar IMEDIATAMENTE Mapeamento de Alta Resolução por profissionais experientes: USG Transvaginal com preparo intestinal prévio e/ou Ressonância Magnética (RM) de pelve com protocolo específico para endometriose profunda.");
    }

    // 2. PACIENTE COM DESEJO DE ENGRAVIDAR ATUALMENTE
    if (desejoGestacional) {
      alertasSeguranca.push("🚨 BLOQUEIO MANDATÓRIO DE TRATAMENTO HORMONAL: Não prescrever Dienogeste, AHC, SIU-LNG ou análogos de GnRH para pacientes tentando engravidar ativamente. A supressão hormonal impede a gestação e NÃO melhora taxas de gravidez espontânea após a descontinuação (Diretriz ESHRE).");

      var orientarFivPrecoce = false;
      var motivosFiv = [];

      if (idade >= 35) {
        orientarFivPrecoce = true;
        motivosFiv.push("Idade materna avançada (≥ 35 anos) associada a declínio fisiológico da qualidade oocitária");
      }
      if (tempoInfertilidadeAnos >= 2) {
        orientarFivPrecoce = true;
        motivosFiv.push("Infertilidade prolongada (≥ 2 anos)");
      }
      if (amh > 0 && amh < 1.1) {
        orientarFivPrecoce = true;
        motivosFiv.push("Reserva ovariana diminuída comprovada por AMH baixo (" + amh.toFixed(2) + " ng/mL < 1.1 ng/mL)");
      }
      if (profunda && (obliteracaoDouglas || acometimentoIntestinal || acometimentoUreteral)) {
        orientarFivPrecoce = true;
        motivosFiv.push("Endometriose profunda extensa com provável distorção da anatomia pélvica e fator tuboperitoneal severo");
      }
      if (numCirurgiasPrevias >= 1 && endometrioma) {
        orientarFivPrecoce = true;
        motivosFiv.push("Histórico de cirurgia ovariana prévia: nova cistectomia ovariana impõe altíssimo risco de insuficiência ovariana prematura");
      }

      planoReprodutivo.push("1. Avaliação Obrigatória da Reserva Ovariana: Solicitar dosagem de AMH (Hormônio Antimülleriano) e Contagem de Folículos Antrais (CFA) por USG transvaginal.");
      planoReprodutivo.push("2. Avaliação do Fator Masculino: Espermograma completo do parceiro antes de qualquer decisão intervencionista.");

      if (orientarFivPrecoce) {
        planoReprodutivo.push("3. 🎯 CONDUTA REPRODUTIVA DE 1ª LINHA: Indicação DIRETA de Reprodução Assistida de Alta Complexidade (Fertilização in Vitro - FIV).");
        planoReprodutivo.push("   Motivos para FIV imediata: " + motivosFiv.join("; ") + ".");
        planoReprodutivo.push("4. Prevenção de Dano Iatrogênico: Evitar cirurgias ovarianas repetidas, que reduzem dramaticamente o número de oócitos recuperáveis.");
        if (endometrioma && !indicacaoCirurgicaUrgente) {
          planoReprodutivo.push("5. Conduta em Endometrioma assintomático ou oligosintomático: Não operar apenas para 'melhorar taxas de FIV'. Proceder à punção folicular com profilaxia antibiótica.");
        }
      } else {
        planoReprodutivo.push("3. Paciente jovem (< 35 anos) com reserva ovariana preservada (AMH > 1.5 ng/mL), espermograma normal e doença leve/moderada:");
        planoReprodutivo.push("   - Se laparoscopia for realizada para dor: lise de aderências e ressecção completa dos implantes restaura a anatomia e aumenta as taxas de gestação natural nos primeiros 6-12 meses pós-operatórios.");
        planoReprodutivo.push("   - Tentar concepção espontânea ou indução de ovulação/inseminação intrauterina por no máximo 6 a 12 meses. Se não engravidar, migrar para FIV.");
      }

      // Se cirurgia ovariana for inevitável em paciente com desejo gestacional
      if (endometrioma && (indicacaoCirurgicaUrgente || evaDor >= 8)) {
        planoReprodutivo.push("⚠️ PRESERVAÇÃO DE FERTILIDADE: Recomenda-se fortemente Criopreservação de Oócitos pré-operatória antes de cistectomia ovariana (especialmente em casos bilaterais).");
      }

    } else {
      // 3. PACIENTE SEM DESEJO REPRODUTIVO ATUAL (FOCO: ALÍVIO DA DOR E CONTROLE DA DOENÇA)
      
      // Avaliação de 1ª vs 2ª Linha Farmacológica
      var refratariaPrimeiraLinha = falhaDienogeste || (falhaAhc && evaDor >= 7);

      if (indicacaoCirurgicaUrgente) {
        condutaFarmacologica.push("🚨 CONDUTA CIRÚRGICA PRIORITÁRIA DEVIDO A RED FLAGS: Paciente apresenta complicações anatômicas graves (ureteral/intestinal). O tratamento exclusivamente clínico é insuficiente.");
      } else if (refratariaPrimeiraLinha) {
        condutaFarmacologica.push("💊 ESCALONAMENTO PARA 2ª LINHA FARMACOLÓGICA (Falha / Intolerância à 1ª Linha):");
        condutaFarmacologica.push("Opção A (Antagonista oral de GnRH de última geração): " + CATALOGO_FARMACOLOGICO.SEGUNDA_LINHA.ANTAGONISTAS_GNRH.RELUGOLIX_COMBINADO.farmaco + " - " + CATALOGO_FARMACOLOGICO.SEGUNDA_LINHA.ANTAGONISTAS_GNRH.RELUGOLIX_COMBINADO.posologia + ". Vantagem: Rápido bloqueio hormonal sem efeito flare-up, com Add-Back incorporada.");
        condutaFarmacologica.push("Opção B (Análogo agonista de GnRH de depósito): " + CATALOGO_FARMACOLOGICO.SEGUNDA_LINHA.ANALOGOS_GNRH.GOSSERRELINA.farmaco + " - " + CATALOGO_FARMACOLOGICO.SEGUNDA_LINHA.ANALOGOS_GNRH.GOSSERRELINA.posologia + ".");
        condutaFarmacologica.push("⚠️ REGRA DE SEGURANÇA MANDATÓRIA: Add-Back Therapy OBRIGATÓRIA se uso de agonista de GnRH > 3 a 6 meses para prevenir perda de densidade mineral óssea e fogachos severos.");
        condutaFarmacologica.push("Opção Cirúrgica Eletiva: Laparoscopia / Robótica se dor persistente com prejuízo de qualidade de vida a despeito da 2ª linha.");
      } else {
        condutaFarmacologica.push("💊 1ª LINHA FARMACOLÓGICA (Padrão ESHRE / FEBRASGO):");
        
        if (adenomiose) {
          condutaFarmacologica.push("1ª Escolha Preferencial (Endometriose + Adenomiose): " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.SIU_LEVONORGESTREL.farmaco + " (" + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.SIU_LEVONORGESTREL.posologia + ") OU Dienogeste 2 mg/dia.");
        } else {
          condutaFarmacologica.push("1ª Escolha Padrão-Ouro: " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.DIENOGESTE.farmaco + " — Posologia: " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.DIENOGESTE.posologia + ".");
          condutaFarmacologica.push("Mecanismo e Justificativa: " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.DIENOGESTE.mecanismo);
          condutaFarmacologica.push("Alternativa: " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.SIU_LEVONORGESTREL.farmaco + " ou " + CATALOGO_FARMACOLOGICO.PRIMEIRA_LINHA.AHC_CONTINUO.farmaco + ".");
        }

        condutaFarmacologica.push("Seguimento: Reavaliar sintomatologia clínica em 3 a 6 meses. O tratamento deve ser mantido a longo prazo até a menopausa ou até a paciente desejar engravidar.");
      }

      // Analgesia de Suporte
      condutaFarmacologica.push("Analgesia Aguda de Resgate: " + CATALOGO_FARMACOLOGICO.ANALGESIA_ADJUVANTE.AINES);
      if (dorPelvicaCronica || evaDor >= 7) {
        condutaFarmacologica.push("Manejo da Sensibilização Central da Dor: " + CATALOGO_FARMACOLOGICO.ANALGESIA_ADJUVANTE.NEUROMODULADORES);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // D. Planejamento Cirúrgico e Critérios Multidisciplinares
    // ─────────────────────────────────────────────────────────────────────────
    if (indicacaoCirurgicaUrgente || evaDor >= 8 || falhaDienogeste || (endometrioma && endometriomaCm >= 4.0)) {
      planoCirurgico.push("Critérios de Encaminhamento ao Especialista: Indicada avaliação ginecológica cirúrgica especializada devido a " + (indicacaoCirurgicaUrgente ? "SINAIS DE ALARME (Red Flag orgânico/obstrutivo)." : (falhaDienogeste ? "refratariedade à terapia hormonal de 1ª linha." : (evaDor >= 8 ? "dor incapacitante severa (EVA >= 8)." : "endometrioma volumoso >= 4 cm."))));
      planoCirurgico.push("Abordagem Especializada: Equipe multidisciplinar com foco na preservação funcional/nervosa (nerve-sparing) e prevenção de lesão iatrogênica.");
      if (endometrioma) {
        planoCirurgico.push("Conduta em Endometrioma: Cistectomia conservadora com preservação máxima do parênquima ovariano são e da reserva folicular (evitar eletrocoagulação agressiva do leito).");
      }
      if (acometimentoIntestinal) {
        planoCirurgico.push("Acometimento Intestinal: Avaliação conjunta com Coloproctologia para definir ressecção conservadora (shaving/discoide) ou segmentar.");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // E. Cuidados Não Farmacológicos e Multidisciplinares
    // ─────────────────────────────────────────────────────────────────────────
    var suporteMultidisciplinar = [
      "Fisioterapia Pélvica especializada: Essencial para reabilitação do assoalho pélvico hiperativo, alívio de dor miofascial e melhora da dispareunia.",
      "Acompanhamento Nutricional: Dieta anti-inflamatória com redução de ultraprocessados, suporte à microbiota intestinal.",
      "Acompanhamento Psicológico: Suporte cognitivo-comportamental para manejo do impacto crônico da dor e qualidade de vida."
    ];

    // Resumo Diagnóstico
    var diagnostico = {
      suspeitaClinica: contagem6Ds >= 2 || evaDor >= 5,
      classificacaoSintomas: {
        total6Ds: contagem6Ds,
        lista: listaSintomasPresentes,
        intensidadeDor: intensidadeDorTexto,
        eva: evaDor
      },
      topografia: {
        imagemRealizada: imagemRealizada,
        superficial: superficial,
        endometrioma: endometrioma,
        endometriomaTamanhoCm: endometriomaCm,
        endometriomaBilateral: endometriomaBilateral,
        profunda: profunda,
        adenomiose: adenomiose,
        compartimentoAnterior: { bexiga: bexiga, ureter: acometimentoUreteral, hidronefrose: hidronefrose },
        compartimentoPosterior: { ligamentosUterossacros: ligamentosUterossacros, toroUterino: toroUterino, septoRetovaginal: septoRetovaginal, obliteracaoDouglas: obliteracaoDouglas, retossigmoide: acometimentoIntestinal, estenosePercentual: estenoseIntestinal }
      },
      redFlags: redFlags,
      indicacaoCirurgicaUrgente: indicacaoCirurgicaUrgente
    };

    return {
      sucesso: true,
      diagnostico: diagnostico,
      alertas: alertasSeguranca,
      condutaInvestigativa: condutaInvestigativa,
      condutaFarmacologica: condutaFarmacologica,
      planoReprodutivo: planoReprodutivo,
      planoCirurgico: planoCirurgico,
      suporteMultidisciplinar: suporteMultidisciplinar,
      diretrizes: "Diretrizes ESHRE (2022/2024), FEBRASGO (2024-2026), Consenso AAGL (2021)"
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. PARSER DE LINGUAGEM NATURAL E COMANDO TELEGRAM
  // ───────────────────────────────────────────────────────────────────────────

  function extrairParametrosTexto(texto) {
    texto = (texto || '').toString().toLowerCase();

    // Idade
    var matchIdade = texto.match(/(?:idade\s*[:=]?\s*|(\d{1,2})\s*anos)/i);
    var idade = matchIdade ? parseInt(matchIdade[1] || matchIdade[0].replace(/\D/g, ''), 10) : 0;

    // Dor / EVA
    var matchEva = texto.match(/(?:eva\s*[:=]?\s*|dor\s*[:=]?\s*)(\d{1,2})/i);
    var evaDor = matchEva ? parseFloat(matchEva[1]) : 0;
    if (evaDor === 0) {
      if (/dor (grave|severa|insuportavel|incapacitante)/i.test(texto)) evaDor = 8;
      else if (/dor (moderada|intensa)/i.test(texto)) evaDor = 6;
      else if (/dor leve/i.test(texto)) evaDor = 3;
    }

    // Sintomas dos 6 Ds
    var dismenorreia = /dismenor|colica/i.test(texto);
    var dispareunia = /dispareun|dor na relacao|profundidade/i.test(texto);
    var disquezia = /disquez|dor ao evacuar|dor evacuat/i.test(texto);
    var disuria = /disur|dor ao urinar/i.test(texto);
    var dorPelvicaCronica = /cronica|dor pelvica|dpc|aciclica/i.test(texto);
    var infertilidade = /infertil|esteril|nao engravida|dificuldade para engravidar/i.test(texto);
    
    // Desejo reprodutivo
    var desejoGestacional = /desejo (gestacional|reprodutivo)|tentando engravidar|quer engravidar|engravidar/i.test(texto);

    // Tempo de infertilidade
    var matchTempoInf = texto.match(/(\d+)\s*anos?\s*(?:de\s*)?infertil/i);
    var tempoInfertilidadeAnos = matchTempoInf ? parseFloat(matchTempoInf[1]) : (infertilidade ? 1 : 0);

    // AMH e CFA
    var matchAmh = texto.match(/amh\s*[:=]?\s*(\d+[\.,]?\d*)/i);
    var amh = matchAmh ? parseFloat(matchAmh[1].replace(',', '.')) : 0;

    var matchCfa = texto.match(/cfa\s*[:=]?\s*(\d+)/i);
    var cfa = matchCfa ? parseInt(matchCfa[1], 10) : 0;

    // Imagem / Topografia
    var usgComPreparo = /usg com preparo|ultrassom com preparo|preparo intestinal/i.test(texto);
    var rmPelve = /rm|ressonancia|rnm/i.test(texto);
    var tipoExame = usgComPreparo ? "USG Transvaginal com preparo intestinal" : (rmPelve ? "RM de Pelve com protocolo para endometriose" : "");

    var endometrioma = /endometrioma|cisto endometr/i.test(texto);
    var matchTamanhoEndo = texto.match(/endometrioma[^\d]*(\d+[\.,]?\d*)\s*(cm|mm)?/i) || texto.match(/(\d+[\.,]?\d*)\s*(?:cm|mm)\s*(?:no\s*)?ovario/i);
    var endometriomaTamanhoCm = 0;
    if (matchTamanhoEndo) {
      var val = parseFloat(matchTamanhoEndo[1].replace(',', '.'));
      var unidade = (matchTamanhoEndo[2] || '').toLowerCase();
      if (unidade === 'mm' || val > 15) {
        endometriomaTamanhoCm = val / 10.0;
      } else {
        endometriomaTamanhoCm = val;
      }
      endometrioma = true;
    }
    var endometriomaBilateral = /bilateral|ambos os ovarios/i.test(texto);

    // Compartimentos profundos
    var acometimentoUreteral = /ureter|ureteral|hidronefrose/i.test(texto);
    var hidronefrose = /hidronefrose|pielocaliectasia/i.test(texto);
    var acometimentoIntestinal = /retossigmoide|reto|sigmoide|intestinal/i.test(texto);
    var matchEstenose = texto.match(/estenose\s*[:=]?\s*(\d+)%?/i);
    var estenoseIntestinalPercentual = matchEstenose ? parseFloat(matchEstenose[1]) : (/estenose (significativa|severa|grave)/i.test(texto) ? 50 : 0);
    var sintomasSuboclusivos = /suboclus|oclusao/i.test(texto);
    var ligamentosUterossacros = /uterossacr|ligamento/i.test(texto);
    var toroUterino = /toro/i.test(texto);
    var obliteracaoDouglas = /douglas|obliteracao/i.test(texto);
    var septoRetovaginal = /septo/i.test(texto);
    var bexiga = /bexiga|vesical/i.test(texto);
    var adenomiose = /adenomiose/i.test(texto);

    // Fármacos prévios
    var falhaDienogeste = /falha (do|de)?\s*dienogeste|refrataria ao dienogeste/i.test(texto);
    var usoDienogeste = /uso de dienogeste|dienogeste/i.test(texto) && !falhaDienogeste;
    var falhaAhc = /falha (do|de)?\s*aco|falha (do|de)?\s*ahc/i.test(texto);
    var cirurgiaPrevia = /cirurgia previa|cistectomia previa|laparoscopia previa/i.test(texto);

    return {
      idade: idade,
      evaDor: evaDor,
      dismenorreia: dismenorreia,
      dispareunia: dispareunia,
      disquezia: disquezia,
      disuria: disuria,
      dorPelvicaCronica: dorPelvicaCronica,
      infertilidade: infertilidade,
      tempoInfertilidadeAnos: tempoInfertilidadeAnos,
      desejoGestacional: desejoGestacional,
      amh: amh,
      cfa: cfa,
      tipoExame: tipoExame,
      usgComPreparo: usgComPreparo,
      rmPelve: rmPelve,
      endometrioma: endometrioma,
      endometriomaTamanhoCm: endometriomaTamanhoCm,
      endometriomaBilateral: endometriomaBilateral,
      acometimentoUreteral: acometimentoUreteral,
      hidronefrose: hidronefrose,
      acometimentoIntestinal: acometimentoIntestinal,
      estenoseIntestinalPercentual: estenoseIntestinalPercentual,
      sintomasSuboclusivos: sintomasSuboclusivos,
      ligamentosUterossacros: ligamentosUterossacros,
      toroUterino: toroUterino,
      obliteracaoDouglas: obliteracaoDouglas,
      septoRetovaginal: septoRetovaginal,
      bexiga: bexiga,
      adenomiose: adenomiose,
      falhaDienogeste: falhaDienogeste,
      usoDienogeste: usoDienogeste,
      falhaAhc: falhaAhc,
      cirurgiaPrevia: cirurgiaPrevia
    };
  }

  function formatarTextoTelegram(resultado) {
    if (!resultado || !resultado.diagnostico) {
      return "⚠️ Erro ao processar dados de endometriose.";
    }

    var diag = resultado.diagnostico;
    var texto = "🌸 *MÓDULO DE ENDOMETRIOSE E DOR PÉLVICA CRÔNICA*\n";
    texto += "*(Diretrizes ESHRE 2022-2024 / FEBRASGO 2024-2026)*\n\n";

    texto += "📋 *ESTRATIFICAÇÃO CLÍNICA & SINTOMATOLOGIA (6 Ds):*\n";
    texto += "• *Dor / Intensidade:* " + diag.classificacaoSintomas.intensidadeDor + "\n";
    texto += "• *Sintomas Cardinais Presentes:* " + diag.classificacaoSintomas.total6Ds + " de 6\n";
    for (var i = 0; i < diag.classificacaoSintomas.lista.length; i++) {
      texto += "  - " + diag.classificacaoSintomas.lista[i] + "\n";
    }

    texto += "\n🗺️ *MAPEAMENTO TOPOGRÁFICO DE IMAGEM:*\n";
    if (diag.topografia.endometrioma) {
      texto += "• *Endometrioma:* Sim (" + (diag.topografia.endometriomaTamanhoCm > 0 ? diag.topografia.endometriomaTamanhoCm.toFixed(1) + " cm" : "diâmetro não especificado") + (diag.topografia.endometriomaBilateral ? ", bilateral" : "") + ")\n";
    }
    if (diag.topografia.profunda) {
      texto += "• *Endometriose Profunda:* Presente\n";
      if (diag.topografia.compartimentoAnterior.ureter || diag.topografia.compartimentoAnterior.hidronefrose) {
        texto += "  - Ureter/Rim: Envolvimento ureteral (" + (diag.topografia.compartimentoAnterior.hidronefrose ? "COM hidronefrose" : "sem hidronefrose relatada") + ")\n";
      }
      if (diag.topografia.compartimentoPosterior.retossigmoide) {
        texto += "  - Retossigmoide: Acometimento intestinal (" + (diag.topografia.compartimentoPosterior.estenosePercentual > 0 ? diag.topografia.compartimentoPosterior.estenosePercentual + "% estenose" : "infiltração parietal") + ")\n";
      }
      if (diag.topografia.compartimentoPosterior.ligamentosUterossacros) {
        texto += "  - Ligamentos úterossacros envolvidos\n";
      }
      if (diag.topografia.compartimentoPosterior.obliteracaoDouglas) {
        texto += "  - Obliteração de fundo de saco de Douglas\n";
      }
    }
    if (diag.topografia.adenomiose) {
      texto += "• *Adenomiose Concomitante:* Presente\n";
    }

    if (resultado.alertas && resultado.alertas.length > 0) {
      texto += "\n⚠️ *ALERTAS CRÍTICOS & SEGURANÇA:*\n";
      for (var a = 0; a < resultado.alertas.length; a++) {
        texto += "• " + resultado.alertas[a] + "\n";
      }
    }

    if (diag.redFlags && diag.redFlags.length > 0) {
      texto += "\n🚨 *RED FLAGS / ALARME CIRÚRGICO:*\n";
      for (var r = 0; r < diag.redFlags.length; r++) {
        var rf = diag.redFlags[r];
        texto += "• *" + rf.orgao + ":* " + rf.achado + "\n";
        texto += "  ↳ *Risco:* " + rf.risco + "\n";
        texto += "  ↳ *Conduta:* " + rf.conduta + "\n";
      }
    }

    if (resultado.planoReprodutivo && resultado.planoReprodutivo.length > 0) {
      texto += "\n👶 *CONDUTA REPRODUTIVA & FERTILIDADE:*\n";
      for (var p = 0; p < resultado.planoReprodutivo.length; p++) {
        texto += resultado.planoReprodutivo[p] + "\n";
      }
    }

    if (resultado.condutaFarmacologica && resultado.condutaFarmacologica.length > 0) {
      texto += "\n💊 *CONDUTA FARMACOLÓGICA ESCALONADA:*\n";
      for (var c = 0; c < resultado.condutaFarmacologica.length; c++) {
        texto += "• " + resultado.condutaFarmacologica[c] + "\n";
      }
    }

    if (resultado.planoCirurgico && resultado.planoCirurgico.length > 0) {
      texto += "\n🚨 *CRITÉRIOS DE ENCAMINHAMENTO CIRÚRGICO / ESPECIALIZADO:*\n";
      for (var s = 0; s < resultado.planoCirurgico.length; s++) {
        texto += "• " + resultado.planoCirurgico[s] + "\n";
      }
    }

    texto += "\n🩺 *CONDUTA BEIRA-LEITO / UBS (MÉDICO GENERALISTA):*\n";
    texto += "• *Alívio Imediato da Dor:* Analgesia escalonada (Dipirona 1g VO/IV + AINEs em cursos curtos de 3-5 dias nas crises) sem retardar supressão hormonal.\n";
    texto += "• *Terapia Empírica de 1ª Linha:* Iniciar precocemente Progestagênio contínuo (Dienogeste 2 mg/dia contínuo ou Desogestrel 75 mcg/dia no SUS). Não aguardar confirmação cirúrgica/laparoscópica para tratar a dor.\n";
    texto += "• *Orientação à Paciente:* Informar que USG pélvico/transvaginal comum normal NÃO exclui endometriose peritoneal. Solicitar USG com preparo intestinal prévio ou RM de pelve com protocolo dedicado.\n";

    texto += "\n🌱 *SUPORTE MULTIDISCIPLINAR:*\n";
    for (var m = 0; m < resultado.suporteMultidisciplinar.length; m++) {
      texto += "• " + resultado.suporteMultidisciplinar[m] + "\n";
    }

    return texto;
  }

  function processarComandoTelegram(texto) {
    var params = extrairParametrosTexto(texto);
    var resultado = avaliarEndometriose(params);
    return formatarTextoTelegram(resultado);
  }

  return {
    avaliar: avaliarEndometriose,
    avaliarEndometriose: avaliarEndometriose,
    extrairParametrosTexto: extrairParametrosTexto,
    formatarTextoTelegram: formatarTextoTelegram,
    processarComandoTelegram: processarComandoTelegram,
    CATALOGO_FARMACOLOGICO: CATALOGO_FARMACOLOGICO
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GinecologiaEndometrioseService;
}
