/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE PEDIATRIA DE EMERGÊNCIA
 * ==============================================================================
 * Manejo da Bronquiolite Viral Aguda (BVA)
 * Diretrizes Oficiais: SBP (Sociedade Brasileira de Pediatria) & AAP (American Academy of Pediatrics)
 * 
 * Escopo Clínico:
 * 1. Estratificação determinística de gravidade (Escore de Wood-Downes Modificado / Ferrés)
 * 2. Rastreamento determinístico de fatores de risco de evolução desfavorável
 * 3. Recomendações estritas de "NÃO FAZER" (Choosing Wisely: contraindicações de salbutamol, corticoides e ATB)
 * 4. Oxigenoterapia e Cânula Nasal de Alto Fluxo (CNAF / HFNC) com titulação por peso
 * 5. Manejo hídrico e nutricional: bloqueio de broncoaspiração e prevenção de SIADH (Holliday-Segar 70% isotônico)
 * 6. Critérios objetivos de internação em enfermaria pediátrica vs UTI Pediátrica
 * 7. Elegibilidade para imunoprofilaxia passiva contra VSR (Palivizumabe / Nirsevimabe)
 * ==============================================================================
 */

var PediatriaBronquioliteService = (function () {
  'use strict';

  /**
   * Calcula o Escore de Wood-Downes Modificado por Ferrés (0 a 14 pontos).
   * @param {Object} p - Parâmetros clínicos
   * @returns {Object} Detalhamento dos sub-escores e soma total
   */
  function calcularWoodDownes(p) {
    p = p || {};
    var idadeMeses = typeof p.idadeMeses === 'number' ? p.idadeMeses : 6;
    var fr = typeof p.fr === 'number' ? p.fr : 40;
    var fc = typeof p.fc === 'number' ? p.fc : 130;
    var spo2 = typeof p.spo2 === 'number' ? p.spo2 : 96;

    // 1. SIBILÂNCIA (0 a 3 pontos)
    var sibilosPts = 0;
    if (typeof p.sibilos === 'number') {
      sibilosPts = Math.min(3, Math.max(0, p.sibilos));
    } else {
      var sibTexto = (p.sibilosTexto || '').toLowerCase();
      if (sibTexto.includes('silencioso') || sibTexto.includes('inaudivel') || sibTexto.includes('grave')) {
        sibilosPts = 3;
      } else if (sibTexto.includes('difuso') || sibTexto.includes('ambos tempos') || sibTexto.includes('inspiratorio')) {
        sibilosPts = 3;
      } else if (sibTexto.includes('moderado') || sibTexto.includes('toda expiracao') || sibTexto.includes('expiracao completa')) {
        sibilosPts = 2;
      } else if (sibTexto.includes('leve') || sibTexto.includes('final') || sibTexto.includes('discreto') || sibTexto.includes('sibilo')) {
        sibilosPts = 1;
      }
    }

    // 2. TIRAGEM / USO DE MUSCULATURA ACESSÓRIA (0 a 3 pontos)
    var tiragemPts = 0;
    if (typeof p.tiragem === 'number') {
      tiragemPts = Math.min(3, Math.max(0, p.tiragem));
    } else {
      var tirTexto = (p.tiragemTexto || '').toLowerCase();
      if (tirTexto.includes('universal') || tirTexto.includes('furcula') || tirTexto.includes('supraclavicular') || tirTexto.includes('paradoxal') || tirTexto.includes('balanco')) {
        tiragemPts = 3;
      } else if (tirTexto.includes('moderada') || tirTexto.includes('intercostal') || tirTexto.includes('ban') || tirTexto.includes('asa de nariz')) {
        tiragemPts = 2;
      } else if (tirTexto.includes('leve') || tirTexto.includes('subcostal') || tirTexto.includes('discreta') || tirTexto.includes('esforco')) {
        tiragemPts = 1;
      }
    }

    // 3. FREQUÊNCIA RESPIRATÓRIA (0 a 3 pontos) estratificada por idade
    var frPts = 0;
    if (typeof p.frScore === 'number') {
      frPts = Math.min(3, Math.max(0, p.frScore));
    } else {
      if (idadeMeses < 2) {
        if (fr > 80 || (fr < 30 && !!p.exaustao)) frPts = 3;
        else if (fr >= 71) frPts = 2;
        else if (fr >= 61) frPts = 1;
        else frPts = 0;
      } else if (idadeMeses <= 11) {
        if (fr > 70 || (fr < 30 && !!p.exaustao)) frPts = 3;
        else if (fr >= 61) frPts = 2;
        else if (fr >= 51) frPts = 1;
        else frPts = 0;
      } else {
        // 12 a 24 meses
        if (fr > 60 || (fr < 25 && !!p.exaustao)) frPts = 3;
        else if (fr >= 51) frPts = 2;
        else if (fr >= 41) frPts = 1;
        else frPts = 0;
      }
    }

    // 4. FREQUÊNCIA CARDÍACA (0 a 2 pontos)
    var fcPts = 0;
    if (typeof p.fcScore === 'number') {
      fcPts = Math.min(2, Math.max(0, p.fcScore));
    } else {
      if (fc > 160 || (fc < 80 && !!p.exaustao)) fcPts = 2;
      else if (fc >= 140) fcPts = 1;
      else fcPts = 0;
    }

    // 5. ENTRADA DE AR / MURMÚRIO VESICULAR (0 a 3 pontos)
    var entradaArPts = 0;
    if (typeof p.entradaArScore === 'number') {
      entradaArPts = Math.min(3, Math.max(0, p.entradaArScore));
    } else {
      var arTexto = (p.entradaArTexto || '').toLowerCase();
      if (p.toraxSilencioso || arTexto.includes('silencioso') || arTexto.includes('quase nulo') || arTexto.includes('inaudivel')) {
        entradaArPts = 3;
      } else if (arTexto.includes('acentuadamente') || arTexto.includes('muito diminuido')) {
        entradaArPts = 2;
      } else if (arTexto.includes('levemente') || arTexto.includes('discretamente') || arTexto.includes('diminuido')) {
        entradaArPts = 1;
      }
    }

    // 6. CIANOSE / SATURAÇÃO DE O2 EM AR AMBIENTE (0 a 3 pontos)
    var cianosePts = 0;
    if (typeof p.cianoseScore === 'number') {
      cianosePts = Math.min(3, Math.max(0, p.cianoseScore));
    } else {
      if (p.cianoseCentral || spo2 < 88) cianosePts = 3;
      else if (spo2 <= 91) cianosePts = 2;
      else if (spo2 <= 94) cianosePts = 1;
      else cianosePts = 0;
    }

    var scoreTotal = sibilosPts + tiragemPts + frPts + fcPts + entradaArPts + cianosePts;

    return {
      scoreTotal: scoreTotal,
      subscores: {
        sibilos: sibilosPts,
        tiragem: tiragemPts,
        frequenciaRespiratoria: frPts,
        frequenciaCardiaca: fcPts,
        entradaAr: entradaArPts,
        cianoseESatO2: cianosePts
      }
    };
  }

  /**
   * Estratifica a gravidade clínica com base no Wood-Downes e sinais de alarme.
   */
  function avaliarGravidade(parametros) {
    var wood = calcularWoodDownes(parametros);
    var score = wood.scoreTotal;
    var spo2 = typeof parametros.spo2 === 'number' ? parametros.spo2 : 96;
    var fr = typeof parametros.fr === 'number' ? parametros.fr : 40;
    var idadeMeses = typeof parametros.idadeMeses === 'number' ? parametros.idadeMeses : 6;

    var exaustao = !!parametros.exaustao;
    var apneia = !!parametros.apneia || !!parametros.apneiaRecorrente;
    var toraxSilencioso = !!parametros.toraxSilencioso || wood.subscores.entradaAr === 3;
    var bradicardia = (!isNaN(parametros.fc) && parametros.fc < 80) || !!parametros.bradicardia;
    var letargia = !!parametros.letargia || !!parametros.sonolenciaGrave;

    // Critérios de ameaça à vida / parada iminente
    var ameacaVida = exaustao || apneia || toraxSilencioso || bradicardia || letargia || score >= 12;

    var classificacao = 'Leve';
    if (ameacaVida) {
      classificacao = 'Crítica / Ameaça à Vida';
    } else if (score >= 8 || spo2 < 90) {
      classificacao = 'Grave';
    } else if (score >= 4 || spo2 <= 92) {
      classificacao = 'Moderada';
    } else {
      classificacao = 'Leve';
    }

    var internacaoUTI = (classificacao === 'Crítica / Ameaça à Vida' || classificacao === 'Grave' || apneia || exaustao);
    var internacaoHospitalar = (internacaoUTI || classificacao === 'Moderada' || spo2 < 92 || idadeMeses < 2);

    // Risco de broncoaspiração: taquipneia importante ou esforço grave
    var riscoBroncoaspiracao = (fr > 60 || exaustao || classificacao === 'Grave' || classificacao === 'Crítica / Ameaça à Vida');

    return {
      score: score,
      subscores: wood.subscores,
      classificacao: classificacao,
      ameacaVida: ameacaVida,
      internacaoHospitalar: internacaoHospitalar,
      internacaoUTI: internacaoUTI,
      riscoBroncoaspiracao: riscoBroncoaspiracao,
      indicacaoCNAF: (classificacao === 'Grave' || classificacao === 'Crítica / Ameaça à Vida' || (classificacao === 'Moderada' && spo2 < 92))
    };
  }

  /**
   * Avalia fatores de risco de evolução desfavorável / gravidade.
   */
  function avaliarFatoresDeRisco(p) {
    var fatores = [];
    var idadeMeses = typeof p.idadeMeses === 'number' ? p.idadeMeses : 6;
    var prematuro = !!p.prematuro || (typeof p.idadeGestacionalSemanas === 'number' && p.idadeGestacionalSemanas < 37);

    if (idadeMeses < 1.5) {
      fatores.push("Idade < 6 semanas (risco crítico de apneia central e colapso respiratório súbito)");
    } else if (idadeMeses < 3) {
      fatores.push("Idade < 12 semanas (menor calibre de vias aéreas e imaturidade imunitária)");
    }

    if (prematuro) {
      var semanasStr = p.idadeGestacionalSemanas ? " (nascido com " + p.idadeGestacionalSemanas + " semanas)" : "";
      fatores.push("Prematuridade" + semanasStr + " (redução de calibre bronquiolar e surfactante)");
    }

    if (p.cardiopatiaCongenita) {
      fatores.push("Cardiopatia Congênita com repercussão hemodinâmica (alto risco de edema pulmonar cardiogênico associado)");
    }

    if (p.doencaPulmonarCronica || p.displasiaBroncopulmonar) {
      fatores.push("Doença Pulmonar Crônica da Prematuridade / Displasia Broncopulmonar (reserva funcional pulmonar limítrofe)");
    }

    if (p.imunodeficiencia) {
      fatores.push("Imunodeficiência primária ou adquirida (risco de replicação viral prolongada e sepse)");
    }

    if (p.doencaNeuromuscular) {
      fatores.push("Doença Neuromuscular / hipotonia (fraqueza da musculatura ventilatória e tosse ineficaz)");
    }

    if (p.vulnerabilidadeSocial) {
      fatores.push("Vulnerabilidade socioeconômica / distância geográfica de serviço terciário");
    }

    return {
      presentes: fatores.length > 0,
      lista: fatores
    };
  }

  /**
   * Gera as recomendações rígidas de "NÃO FAZER" da SBP e AAP (Choosing Wisely).
   */
  function avaliarNaoFazer(p) {
    var bloqueios = [];

    bloqueios.push({
      item: "Broncodilatadores Inalatórios (Salbutamol / Fenoterol)",
      status: "NÃO RECOMENDADO DE ROTINA",
      motivo: "Ensaios clínicos randomizados demonstram que NÃO reduzem internação, necessidade de oxigênio ou tempo de doença na BVA típica. A obstrução é por necrose celular e rolhas de muco, não broncoespasmo liso.",
      ressalva: "Apenas se > 6 meses com atopia prévia importante ou história familiar de 1º grau de asma, admite-se no máximo UM teste terapêutico monitorado. Se sem melhora objetiva documentada em 30 min, suspender imediatamente."
    });

    bloqueios.push({
      item: "Corticosteroides Sistêmicos ou Inalatórios (Prednisolona / Dexametasona / Budesonida)",
      status: "CONTRAINDICADO DE ROTINA",
      motivo: "Não alteram o desfecho clínico nem o tempo de internação. Podem aumentar o tempo de excreção viral e causar imunossupressão/efeitos metabólicos desnecessários.",
      ressalva: "Sem indicação mesmo se história de sibilância, salvo confirmação diagnóstica de asma estabelecida em crianças maiores."
    });

    bloqueios.push({
      item: "Antibioticoterapia Empírica (Amoxicilina / Ceftriaxona / Azitromicina)",
      status: "NÃO INDICADO",
      motivo: "Etiologia estritamente viral (VSR em > 70-80% dos casos). Risco de coinfecção bacteriana grave é inferior a 1-2%.",
      ressalva: "Reservar exclusivamente para pacientes com foco bacteriano concomitante comprovado (ex: Otite Média Aguda supurativa evidente ou pneumonia condensativa lobar documentada)."
    });

    bloqueios.push({
      item: "Solução Salina Hipertônica 3% no Pronto Atendimento",
      status: "NÃO INDICADO NA EMERGÊNCIA",
      motivo: "Diretrizes AAP e SBP não recomendam o uso rotineiro na sala de emergência (não reduz taxa de admissão hospitalar).",
      ressalva: "Pode ser avaliada somente em pacientes já hospitalizados por mais de 24 horas para facilitar depuração mucociliar se secreção espessa abundante."
    });

    bloqueios.push({
      item: "Fisioterapia Respiratória na Fase Aguda",
      status: "CONTRAINDICADA NA FASE AGUDA",
      motivo: "Manobras aumentam o desconforto e o estresse respiratório do lactente, podendo induzir broncoespasmo paradoxal e atelectasias por fadiga.",
      ressalva: "Apenas higiene e aspiração suave de vias aéreas superiores se excesso obstrutivo na nasofaringe."
    });

    bloqueios.push({
      item: "Radiografia de Tórax e Gasometria Arterial de Rotina",
      status: "NÃO RECOMENDADOS DE ROTINA",
      motivo: "RX mostra alterações inespecíficas (hiperinsuflação e atelectasias) frequentemente confundidas com pneumonia, induzindo prescrição inadequada de antibióticos.",
      ressalva: "Indicar RX apenas se suspeita de pneumotórax, piora súbita inexplicada ou evolução atípica."
    });

    return bloqueios;
  }

  /**
   * Avalia suporte respiratório e parâmetros da Cânula Nasal de Alto Fluxo (CNAF).
   */
  function avaliarOxigenoterapiaECnaf(p, gravidade) {
    var peso = typeof p.pesoKg === 'number' ? p.pesoKg : 8;
    var spo2 = typeof p.spo2 === 'number' ? p.spo2 : 96;

    var orientacoes = [];
    var cnaf = null;

    if (gravidade.classificacao === 'Crítica / Ameaça à Vida') {
      orientacoes.push("🚨 **EMERGÊNCIA VENTILATÓRIA IMEDIATA:**");
      orientacoes.push("- Iniciar O2 sob alto fluxo imediato ou ventilação com pressão positiva (VPP/CPAP).");
      orientacoes.push("- **Preparar Sequência Rápida de Intubação (SRI):** se apneias repetidas, exaustão diafragmática ou acidose hipercápnica descompensada.");
      orientacoes.push("- Usar Tubo Endotraqueal COM CUFF (pressão de balonete < 20 cmH2O) para vedação adequada contra vazamento na expiração.");
    }

    if (gravidade.indicacaoCNAF) {
      // Parâmetros de CNAF recomendados pela SBP / AAP:
      // Fluxo inicial: 1 a 2 L/kg/min (em geral 2 L/kg/min para os primeiros 10 kg, até 20-30 L/min máximo)
      var fluxoSugerido = Math.min(25, Math.max(4, Math.round(peso * 2)));
      var fluxoMin = Math.round(peso * 1.5);
      var fluxoMax = Math.min(30, Math.round(peso * 2.5));

      cnaf = {
        indicada: true,
        fluxoInicialLmin: fluxoSugerido,
        faixaFluxoLmin: fluxoMin + " a " + fluxoMax + " L/min (1.5 a 2.0 L/kg/min)",
        fio2Inicial: "40% a 50%, titulada rapidamente para manter SpO2 entre 92% e 96%",
        temperaturaUmidificador: "37°C com 100% de umidade relativa (umidificação ativa aquecida obrigatória)",
        mecanismoBeneficio: "Gera PEEP dinâmico (~2 a 4 cmH2O), reduz espaço morto nasofaríngeo, diminui trabalho respiratório em ~50% e evita IOT em até 80% dos casos de falência com O2 convencional."
      };

      orientacoes.push("🫁 **SUPORTE COM CÂNULA NASAL DE ALTO FLUXO (CNAF / HFNC):**");
      orientacoes.push("- **Fluxo Inicial Ponderado:** `" + cnaf.fluxoInicialLmin + " L/min` (" + cnaf.faixaFluxoLmin + ").");
      orientacoes.push("- **FiO2:** " + cnaf.fio2Inicial + ".");
      orientacoes.push("- **Temperatura:** " + cnaf.temperaturaUmidificador + ".");
      orientacoes.push("- **Mecanismo:** " + cnaf.mecanismoBeneficio);
    } else if (gravidade.classificacao === 'Moderada' || spo2 <= 92) {
      orientacoes.push("🫁 **OXIGENOTERAPIA CONVENCIONAL:**");
      orientacoes.push("- **Dispositivo:** Cateter nasal convencional de O2 umidificado a `0.5 a 2 L/min`.");
      orientacoes.push("- **Alvo de SpO2:** Manter saturação entre 90% e 92% em vigília e >= 92% no sono.");
      orientacoes.push("- Se SpO2 persistir < 90% apesar de 2 L/min ou piora do esforço, **escalonar para CNAF**.");
    } else {
      orientacoes.push("🫁 **OXIGENOTERAPIA:**");
      orientacoes.push("- Em ar ambiente. Sem necessidade de O2 suplementar no momento (SpO2 " + spo2 + "%).");
    }

    return {
      cnaf: cnaf,
      orientacoes: orientacoes
    };
  }

  /**
   * Avalia suporte nutricional, risco de broncoaspiração e hidratação com restrição para SIADH.
   */
  function avaliarHidratacaoENutricao(p, gravidade) {
    var peso = typeof p.pesoKg === 'number' ? p.pesoKg : 8;
    var fr = typeof p.fr === 'number' ? p.fr : 40;

    var orientacoes = [];

    // Cálculo de Holliday-Segar basal diário
    var volBasalDia = 0;
    if (peso <= 10) {
      volBasalDia = peso * 100;
    } else if (peso <= 20) {
      volBasalDia = 1000 + ((peso - 10) * 50);
    } else {
      volBasalDia = 1500 + ((peso - 20) * 20);
    }

    // Restrição hídrica para proteção contra SIADH transitória (70% a 80%)
    var volRestrito70 = Math.round(volBasalDia * 0.70);
    var vazaoHoraria70 = (volRestrito70 / 24).toFixed(1);
    var volRestrito80 = Math.round(volBasalDia * 0.80);
    var vazaoHoraria80 = (volRestrito80 / 24).toFixed(1);

    if (gravidade.riscoBroncoaspiracao) {
      orientacoes.push("🍼 **DIETA / NUTRIÇÃO — BLOQUEIO DE VIA ORAL:**");
      orientacoes.push("⚠️ **SUSPENDER DIETA VIA ORAL (NPO):** FR > 60 irpm ou desconforto moderado a grave impõe risco altíssimo de broncoaspiração pulmonar!");
      orientacoes.push("- Se paciente estabilizado sem exaustão: alimentação por gavagem contínua via SNG em volumes mínimos.");
      orientacoes.push("- Se em insuficiência respiratória iminente ou em CNAF com alto fluxo: jejum absoluto com hidratação parenteral.");
      
      orientacoes.push("\n💧 **HIDRATAÇÃO VENOSA COM RESTRIÇÃO HÍDRICA (ALERTA SIADH):**");
      orientacoes.push("- **Alerta Fisiopatológico:** O estresse da BVA causa secreção não-osmótica aumentada de ADH (SIADH transitória), predispondo à hiponatremia grave e convulsões se administrada hidratação excessiva ou hipotônica.");
      orientacoes.push("- **Solução Isotônica Obrigatória:** Usar SG 5% + SF 0.9% (proporção 1:1, concentração de Na+ ~77 mEq/L) OU solução isotônica balanceada (SF 0.9% com Glicose a 5%). **PROIBIDO usar soluções hipotônicas puras.**");
      orientacoes.push("- **Volume com Restrição a 70% (Holliday-Segar):** `" + volRestrito70 + " mL/dia` (Vazão: `" + vazaoHoraria70 + " mL/h` em bomba de infusão contínua).");
      orientacoes.push("- **Volume com Restrição a 80%:** `" + volRestrito80 + " mL/dia` (Vazão: `" + vazaoHoraria80 + " mL/h`).");
    } else if (gravidade.classificacao === 'Moderada') {
      orientacoes.push("🍼 **DIETA / NUTRIÇÃO:**");
      orientacoes.push("- Manter dieta oral fracionada (pequenos volumes frequentes para evitar sobrecarga gástrica e fadiga).");
      orientacoes.push("- Se aceitação < 50% das necessidades diárias, passar SNG para gavagem suave fracionada.");
    } else {
      orientacoes.push("🍼 **DIETA / NUTRIÇÃO:**");
      orientacoes.push("- Aleitamento materno ou fórmula infantil em livre demanda fracionada.");
      orientacoes.push("- Lavagem nasal com SF 0.9% estrita 10 a 15 minutos ANTES de cada mamada para facilitar sucção.");
    }

    return {
      hollidayBasalDia: volBasalDia,
      holliday70Dia: volRestrito70,
      vazao70MlHora: parseFloat(vazaoHoraria70),
      holliday80Dia: volRestrito80,
      vazao80MlHora: parseFloat(vazaoHoraria80),
      orientacoes: orientacoes
    };
  }

  /**
   * Avalia e resume critérios de admissão hospitalar e UTI Pediátrica.
   */
  function avaliarCriteriosInternacao(p, gravidade, fatoresRisco) {
    var criteriosEnfermaria = [];
    var criteriosUTI = [];

    if (gravidade.classificacao === 'Moderada' || gravidade.classificacao === 'Grave' || gravidade.classificacao === 'Crítica / Ameaça à Vida') {
      criteriosEnfermaria.push("Escore de Wood-Downes >= 4 (" + gravidade.classificacao + ")");
    }
    if (p.spo2 && p.spo2 < 92) {
      criteriosEnfermaria.push("Necessidade de oxigenoterapia suplementar (SpO2 < 92% em ar ambiente)");
    }
    if (p.idadeMeses && p.idadeMeses < 2) {
      criteriosEnfermaria.push("Idade < 2 meses (alto risco de deterioração rápida)");
    }
    if (p.recusaAlimentar || gravidade.riscoBroncoaspiracao) {
      criteriosEnfermaria.push("Incapacidade de manter hidratação oral adequada (< 50% da necessidade)");
    }
    if (fatoresRisco.presentes) {
      criteriosEnfermaria.push("Comorbidades de alto risco identificadas");
    }

    if (gravidade.classificacao === 'Crítica / Ameaça à Vida' || gravidade.score >= 12) {
      criteriosUTI.push("Escore de Wood-Downes crítico (>= 12 pontos ou colapso respiratório iminente)");
    } else if (gravidade.score >= 8) {
      criteriosUTI.push("Escore de Wood-Downes grave (>= 8 pontos)");
    }
    if (p.apneia || p.apneiaRecorrente) {
      criteriosUTI.push("Episódios de apneia documentada ou pausas respiratórias com bradicardia");
    }
    if (p.exaustao) {
      criteriosUTI.push("Exaustão muscular respiratória / respiração paradoxal");
    }
    if (gravidade.indicacaoCNAF && (gravidade.classificacao === 'Grave' || p.falhaCNAF)) {
      criteriosUTI.push("Necessidade de suporte respiratório não-invasivo de alto fluxo (CNAF com FiO2 elevada ou CPAP) ou ventilação mecânica");
    }
    if (p.letargia) {
      criteriosUTI.push("Rebaixamento do nível de consciência / letargia profunda por hipercapnia grave");
    }

    return {
      indicadoEnfermaria: criteriosEnfermaria.length > 0 || gravidade.internacaoHospitalar,
      criteriosEnfermaria: criteriosEnfermaria,
      indicadoUTI: criteriosUTI.length > 0 || gravidade.internacaoUTI,
      criteriosUTI: criteriosUTI
    };
  }

  /**
   * Avalia elegibilidade para Palivizumabe / Nirsevimabe.
   */
  function avaliarImunoprofilaxiaVsr(p) {
    var elegivel = false;
    var motivo = "";

    var ig = typeof p.idadeGestacionalSemanas === 'number' ? p.idadeGestacionalSemanas : null;
    var idadeMeses = typeof p.idadeMeses === 'number' ? p.idadeMeses : null;

    if (ig && ig < 29 && idadeMeses !== null && idadeMeses <= 12) {
      elegivel = true;
      motivo = "Prematuro extremo com IG < 29 semanas e idade < 1 ano no início do período sazonal do VSR (Protocolo MS/SBP).";
    } else if (p.cardiopatiaCongenita && idadeMeses !== null && idadeMeses <= 24) {
      elegivel = true;
      motivo = "Cardiopatia congênita com repercussão hemodinâmica em menores de 2 anos de idade.";
    } else if ((p.doencaPulmonarCronica || p.displasiaBroncopulmonar) && idadeMeses !== null && idadeMeses <= 24) {
      elegivel = true;
      motivo = "Doença pulmonar crônica da prematuridade com necessidade de suporte de O2 ou medicação nos últimos 6 meses.";
    }

    return {
      elegivel: elegivel,
      motivo: motivo,
      esquema: "Palivizumabe: 15 mg/kg IM, mensalmente (até 5 doses durante o período sazonal local de circulação do VSR)."
    };
  }

  /**
   * Função executiva principal que avalia o paciente por completo.
   */
  function avaliar(parametros) {
    parametros = parametros || {};

    var gravidade = avaliarGravidade(parametros);
    var fatoresRisco = avaliarFatoresDeRisco(parametros);
    var naoFazer = avaliarNaoFazer(parametros);
    var oxigenio = avaliarOxigenoterapiaECnaf(parametros, gravidade);
    var hidratacao = avaliarHidratacaoENutricao(parametros, gravidade);
    var internacao = avaliarCriteriosInternacao(parametros, gravidade, fatoresRisco);
    var profilaxiaVsr = avaliarImunoprofilaxiaVsr(parametros);

    return {
      parametros: parametros,
      gravidade: gravidade,
      fatoresRisco: fatoresRisco,
      naoFazer: naoFazer,
      oxigenoterapia: oxigenio,
      hidratacao: hidratacao,
      internacao: internacao,
      profilaxiaVsr: profilaxiaVsr
    };
  }

  /**
   * Formata relatório completo para o Telegram ou Cockpit.
   */
  function formatarTextoTelegram(res) {
    var g = res.gravidade;
    var p = res.parametros;
    var txt = "👶 *PEDIATRIA — MANEJO DA BRONQUIOLITE VIRAL AGUDA (SBP / AAP)*\n\n";

    // Gravidade
    var iconeGravidade = "🟢";
    if (g.classificacao.includes('Crítica') || g.classificacao.includes('Vida')) iconeGravidade = "🚨";
    else if (g.classificacao === 'Grave') iconeGravidade = "🔴";
    else if (g.classificacao === 'Moderada') iconeGravidade = "🟡";

    txt += iconeGravidade + " *Estratificação:* *" + g.classificacao.toUpperCase() + "*\n";
    txt += "📊 *Escore de Wood-Downes Modificado:* `" + g.score + " / 14 pontos`\n";
    txt += "• Sibilos: " + g.subscores.sibilos + "/3 | Tiragem: " + g.subscores.tiragem + "/3\n";
    txt += "• FR: " + g.subscores.frequenciaRespiratoria + "/3 | FC: " + g.subscores.frequenciaCardiaca + "/2\n";
    txt += "• Entrada de Ar: " + g.subscores.entradaAr + "/3 | Cianose/SpO2: " + g.subscores.cianoseESatO2 + "/3\n\n";

    // Destino / Internação
    txt += "🏥 *DESTINO E VIGILÂNCIA:*\n";
    if (res.internacao.indicadoUTI) {
      txt += "🚨 **INDICAÇÃO DE INTERNAÇÃO EM UTI PEDIÁTRICA:**\n";
      for (var i = 0; i < res.internacao.criteriosUTI.length; i++) {
        txt += "  - " + res.internacao.criteriosUTI[i] + "\n";
      }
    } else if (res.internacao.indicadoEnfermaria) {
      txt += "🟡 **INDICAÇÃO DE INTERNAÇÃO EM ENFERMARIA PEDIÁTRICA:**\n";
      for (var j = 0; j < res.internacao.criteriosEnfermaria.length; j++) {
        txt += "  - " + res.internacao.criteriosEnfermaria[j] + "\n";
      }
    } else {
      txt += "✅ **CONDUTA AMBULATORIAL SEGURA:** Manejo domiciliar com lavagem nasal frequente, oferta de líquidos e retorno imediato se sinais de esforço respiratório ou recusa alimentar.\n";
    }
    txt += "\n";

    // Fatores de risco
    if (res.fatoresRisco.presentes) {
      txt += "⚠️ *Fatores de Risco de Gravidade Identificados:*\n";
      for (var k = 0; k < res.fatoresRisco.lista.length; k++) {
        txt += "• " + res.fatoresRisco.lista[k] + "\n";
      }
      txt += "\n";
    }

    // Suporte Respiratório
    for (var l = 0; l < res.oxigenoterapia.orientacoes.length; l++) {
      txt += res.oxigenoterapia.orientacoes[l] + "\n";
    }
    txt += "\n";

    // Nutrição e Hidratação Venosa
    for (var m = 0; m < res.hidratacao.orientacoes.length; m++) {
      txt += res.hidratacao.orientacoes[m] + "\n";
    }
    txt += "\n";

    // O QUE NÃO FAZER (Choosing Wisely)
    txt += "🚫 *RECOMENDAÇÕES ESTRITAS DE NÃO FAZER (SBP / AAP):*\n";
    txt += "• *NÃO prescrever Salbutamol/Broncodilatadores:* Ausência de benefício clínico em BVA típica.\n";
    txt += "• *NÃO prescrever Corticosteroides (VO/IV/Inalatório):* Ineficazes contra lesão viral e atrasam clareamento.\n";
    txt += "• *NÃO prescrever Antibióticos empiricamente:* Etiologia é estritamente viral (VSR > 80%).\n";
    txt += "• *NÃO realizar Salina 3% na emergência nem Fisioterapia Respiratória motora na fase aguda.*\n";

    if (res.profilaxiaVsr.elegivel) {
      txt += "\n💉 *PROFILAXIA VSR (PALIVIZUMABE):*\n";
      txt += "• Paciente elegível: " + res.profilaxiaVsr.motivo + "\n";
      txt += "• Esquema: " + res.profilaxiaVsr.esquema + "\n";
    }

    return txt;
  }

  /**
   * Extrai parâmetros clínicos de texto livre no Telegram ou Cockpit.
   */
  function extrairParametrosTexto(texto) {
    var limpo = (texto || '').toLowerCase();
    var p = {};

    // Idade
    var mesesMatch = limpo.match(/(\d+)\s*(mes|meses|m)/);
    var diasMatch = limpo.match(/(\d+)\s*(dia|dias|d)/);
    var anosMatch = limpo.match(/(\d+)\s*(ano|anos|a)/);
    if (mesesMatch) p.idadeMeses = parseInt(mesesMatch[1], 10);
    else if (diasMatch) p.idadeMeses = parseFloat((parseInt(diasMatch[1], 10) / 30).toFixed(1));
    else if (anosMatch) p.idadeMeses = parseInt(anosMatch[1], 10) * 12;
    else p.idadeMeses = 6;

    // Idade Gestacional (se informada)
    var igMatch = limpo.match(/(\d+)\s*(sem|semanas|sem\b)/);
    if (igMatch) {
      var valSem = parseInt(igMatch[1], 10);
      if (valSem >= 24 && valSem <= 42) p.idadeGestacionalSemanas = valSem;
    }

    // Peso
    var pesoMatch = limpo.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos|quilos)/);
    if (pesoMatch) p.pesoKg = parseFloat(pesoMatch[1].replace(',', '.'));
    else p.pesoKg = 8;

    // FR
    var frMatch = limpo.match(/fr\s*[:=]?\s*(\d+)/) || limpo.match(/(\d+)\s*(irpm|rpm|ipm)/);
    if (frMatch) p.fr = parseInt(frMatch[1], 10);
    else p.fr = 40;

    // FC
    var fcMatch = limpo.match(/fc\s*[:=]?\s*(\d+)/) || limpo.match(/(\d+)\s*(bpm|batimentos)/);
    if (fcMatch) p.fc = parseInt(fcMatch[1], 10);
    else p.fc = 130;

    // SpO2
    var spo2Match = limpo.match(/spo2\s*[:=]?\s*(\d+)/) || limpo.match(/sat[^\d]*(\d+)/) || limpo.match(/(\d+)%/);
    if (spo2Match) p.spo2 = parseInt(spo2Match[1], 10);
    else p.spo2 = 96;

    // Sinais e sintomas
    p.exaustao = /(exaustao|exaustão|fadiga|balanço|balanco|paradoxal)/.test(limpo);
    p.apneia = /(apneia|apnéia|pausa respiratoria|pausa respiratória)/.test(limpo);
    p.letargia = /(letargia|letárgico|letargico|rebaixado|sonolento|hipoativo|dificuldade para acordar)/.test(limpo);
    p.toraxSilencioso = /(torax silencioso|tórax silencioso|sem murmúrio|sem murmurio|mv inaudivel|inaudível)/.test(limpo);
    p.cianoseCentral = /(cianose central|cianose generalizada|labios roxos|lábios roxos)/.test(limpo);

    // Tiragem
    if (/(tiragem universal|furcula|fúrcula|supraclavicular|paradoxal)/.test(limpo)) p.tiragem = 3;
    else if (/(tiragem moderada|intercostal|ban\b|batimento asa de nariz)/.test(limpo)) p.tiragem = 2;
    else if (/(tiragem leve|subcostal|esforço leve|esforco leve|tiragem)/.test(limpo)) p.tiragem = 1;
    else p.tiragem = 0;

    // Sibilos
    if (/(silencioso|grave|audivel a distancia|audível a distância)/.test(limpo)) p.sibilos = 3;
    else if (/(sibilo difuso|ambos tempos|inspiratorio e expiratorio|inspiratório e expiratório)/.test(limpo)) p.sibilos = 3;
    else if (/(toda a expiracao|toda a expiração|expiracao completa|sibilos moderados)/.test(limpo)) p.sibilos = 2;
    else if (/(sibilo|sibilancia|sibilância|subcrep|estertor)/.test(limpo)) p.sibilos = 1;
    else p.sibilos = 0;

    // Fatores de risco
    p.prematuro = /(prematuro|prematuridade|pre termo|pré-termo)/.test(limpo) || (p.idadeGestacionalSemanas && p.idadeGestacionalSemanas < 37);
    p.cardiopatiaCongenita = /(cardiopatia|cardiopata|sopro cardiaco|sopro cardíaco)/.test(limpo);
    p.doencaPulmonarCronica = /(displasia|broncodisplasia|pulmonar cronica|pulmonar crônica)/.test(limpo);
    p.imunodeficiencia = /(imunodeficiencia|imunodeficiência|imunodeprimido)/.test(limpo);
    p.doencaNeuromuscular = /(neuromuscular|hipotonia|paralisia cerebral)/.test(limpo);

    return p;
  }

  return {
    calcularWoodDownes: calcularWoodDownes,
    avaliarGravidade: avaliarGravidade,
    avaliarFatoresDeRisco: avaliarFatoresDeRisco,
    avaliarNaoFazer: avaliarNaoFazer,
    avaliarOxigenoterapiaECnaf: avaliarOxigenoterapiaECnaf,
    avaliarHidratacaoENutricao: avaliarHidratacaoENutricao,
    avaliarCriteriosInternacao: avaliarCriteriosInternacao,
    avaliarImunoprofilaxiaVsr: avaliarImunoprofilaxiaVsr,
    avaliar: avaliar,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = PediatriaBronquioliteService;
}
