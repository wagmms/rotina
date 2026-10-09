/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE INFECÇÃO DO TRATO URINÁRIO (ITU, CISTITE & PIELONEFRITE)
 * ==============================================================================
 * Referência: Diretrizes de Infecções Urinárias da Sociedade Brasileira de Urologia
 * (SBU 2023) / IDSA 2022 / Protocolos Clínicos do Ministério da Saúde.
 * ==============================================================================
 */

var InfectologiaItuService = (function () {
  'use strict';

  function conduzirItu(dados) {
    dados = dados || {};
    var tipo = String(dados.tipo || 'cistite_nao_complicada').toLowerCase();
    var gestante = Boolean(dados.gestante);
    var sexo = String(dados.sexo || (gestante ? 'F' : 'F')).toUpperCase();
    var clcr = Number(dados.clcr || dados.clearance);
    var febre = Boolean(dados.febre || dados.giordanoPositivo || dados.dorLombar);
    var sepse = Boolean(dados.sepse || dados.vomitosIncoerciveis || dados.hipotensao);

    // Ajuste automático por sintomas
    if (sepse || (febre && gestante)) {
      tipo = 'pielonefrite_hospitalar';
    } else if (febre) {
      tipo = 'pielonefrite_ambulatorial';
    } else if (gestante) {
      tipo = 'cistite_gestante';
    } else if (sexo === 'M' || sexo === 'MASCULINO') {
      tipo = 'itu_masculina';
    }

    var diagnostico = 'Cistite Aguda Não Complicada (Mulher)';
    var recomendacoes = [];
    var prescricoes = [];
    var alertas = [];

    if (tipo === 'cistite_gestante') {
      diagnostico = 'Cistite Aguda / Bacteriúria na Gestação';
      recomendacoes.push('• Tratamento obrigatório em qualquer fase da gestação (previne pielonefrite em até 30% e parto prematuro).');
      recomendacoes.push('• Urocultura com antibiograma mandatória no início e teste de cura 7 a 14 dias após o fim do tratamento.');
      
      prescricoes.push('💊 1ª Opção: Fosfomicina Trometamol 3g sachê dose única VO (dissolver em meio copo de água à noite ao deitar com bexiga vazia).');
      prescricoes.push('💊 2ª Opção: Cefalexina 500mg VO a cada 6 horas por 7 dias.');
      prescricoes.push('💊 3ª Opção: Amoxicilina + Clavulanato 500/125mg VO a cada 8 horas por 7 dias.');

      alertas.push('⛔ CONTRAINDICAÇÕES GESTACIONAIS: Fluoroquinolonas (Cipro/Levo — risco de lesão cartilaginosa fetal) são terminantemente proibidas. Sulfametoxazol+Trimetoprima contraindicado no 1º trimestre (teratogênico) e no final do 3º trimestre (risco de kernicterus neonatal).');
    } else if (tipo === 'pielonefrite_ambulatorial') {
      diagnostico = 'Pielonefrite Aguda Não Complicada (Manejo Ambulatorial)';
      recomendacoes.push('• Paciente tolerando líquidos por via oral, sem sinais de sepse, náuseas controladas e suporte domiciliar seguro.');
      recomendacoes.push('• Coleta obrigatória de Urocultura com TSA e Hemograma antes do início do antimicrobiano.');
      recomendacoes.push('• Reavaliação clínica obrigatória em 48 a 72 horas.');

      prescricoes.push('💊 Dose de ataque na unidade: Ceftriaxona 1g IM ou IV na UPA antes da liberação.');
      prescricoes.push('💊 Seguimento oral: Ciprofloxacino 500mg VO 12/12h por 7 dias OU Levofloxacino 750mg VO 1x/dia por 5 dias.');
      prescricoes.push('💊 Analgesia: Dipirona 1g VO 6/6h se dor/febre.');

      alertas.push('⚠️ Se ausência de melhora clínica em 48-72h, vômitos ou piora do estado geral: internar imediatamente e solicitar USG ou TC de rins/vias urinárias (descartar abscesso renal ou litíase obstrutiva).');
    } else if (tipo === 'pielonefrite_hospitalar') {
      diagnostico = 'Pielonefrite Aguda Grave / Hospitalar';
      recomendacoes.push('• Internação hospitalar mandatória em leito clínico/enfermaria (ou UTI se instabilidade hemodinâmica).');
      recomendacoes.push('• Coleta imediata de Hemoculturas (2 pares) e Urocultura com TSA.');
      recomendacoes.push('• Hidratação venosa vigorosa com cristaloides isotônicos e controle de diurese.');

      prescricoes.push('💊 1ª Linha: Ceftriaxona 1g a 2g IV a cada 24 horas (ou 1g IV 12/12h).');
      prescricoes.push('💊 Se choque séptico ou suspeita de Pseudomonas/germes multirresistentes: Meropenem 1g IV 8/8h OU Cefepime 2g IV 8/8h associado ou não a Amicacina.');
      prescricoes.push('💊 Transição para via oral após 48h afebril e conforme o padrão do antibiograma.');

      alertas.push('🚨 ALERTA: Em caso de persistência da febre após 72h de antibioticoterapia adequada, realizar Tomografia Computadorizada de Abdome com contraste (rastreio de fleimão, abscesso perirrenal ou necrose papilar).');
    } else if (tipo === 'itu_masculina') {
      diagnostico = 'ITU no Sexo Masculino (Considerada Complicada)';
      recomendacoes.push('• Toda ITU em homem deve ser investigada para obstrução urinária baixa (HPB), estenose de uretra ou prostatite.');
      recomendacoes.push('• Duração estendida do tratamento devido à penetração tecidual na próstata.');

      prescricoes.push('💊 1ª Opção: Ciprofloxacino 500mg VO 12/12h por 10 a 14 dias.');
      prescricoes.push('💊 2ª Opção: Sulfametoxazol + Trimetoprima 800/160mg VO 12/12h por 14 dias (se suscetível em antibiograma).');
      prescricoes.push('💊 Se febre alta e retenção: Ceftriaxona 1g a 2g IV/dia e avaliação urológica urgente.');

      alertas.push('⚠️ Evitar Nitrofurantoína e Fosfomicina para homens, pois não atingem concentração terapêutica adequada no parênquima prostático.');
    } else {
      // Cistite não complicada feminina
      diagnostico = 'Cistite Aguda Não Complicada (Mulher não gestante)';
      recomendacoes.push('• Quadro típico de disúria, polaciúria e urgência miccional sem febre ou dor lombar.');
      recomendacoes.push('• Urocultura geralmente dispensável no primeiro episódio não complicado.');
      recomendacoes.push('• Aumento da ingesta hídrica e micção pós-coito.');

      prescricoes.push('💊 1ª Opção (Padrão Ouro): Fosfomicina Trometamol 3g dose única VO (dissolver em meio copo de água e tomar ao deitar).');
      if (!isNaN(clcr) && clcr < 30) {
        prescricoes.push('💊 2ª Opção: Cefalexina 500mg VO 6/6h por 5 a 7 dias (Nitrofurantoína contraindicada devido a ClCr < 30 mL/min).');
      } else {
        prescricoes.push('💊 2ª Opção: Nitrofurantoína 100mg VO a cada 6 horas por 5 dias (tomar junto com as refeições).');
      }
      prescricoes.push('💊 Sintomático urinário se disúria intensa: Fenazopiridina 200mg VO 8/8h por no máximo 48h (alertar paciente sobre urina avermelhada/alaranjada).');

      alertas.push('⚠️ Evitar Fluoroquinolonas (Ciprofloxacino/Levofloxacino) na cistite não complicada para poupar resistência bacteriana e prevenir tendinopatias e neuropatias.');
    }

    return {
      diagnostico: diagnostico,
      tipo: tipo,
      sexo: sexo,
      gestante: gestante,
      recomendacoes: recomendacoes,
      prescricoes: prescricoes,
      alertas: alertas
    };
  }

  function formatarTextoTelegram(res) {
    var linhas = [];
    linhas.push('🦠 *INFECÇÃO DO TRATO URINÁRIO (ITU, CISTITE & PIELONEFRITE)*');
    linhas.push('📅 *Diretrizes SBU / IDSA / Ministério da Saúde*');
    linhas.push('');
    linhas.push('*Diagnóstico:* ' + res.diagnostico);
    linhas.push('');
    linhas.push('💊 *Esquema Antimicrobiano e Posologia:*');
    for (var i = 0; i < res.prescricoes.length; i++) {
      linhas.push(res.prescricoes[i]);
    }
    linhas.push('');
    linhas.push('*Condutas e Orientações:*');
    for (var j = 0; j < res.recomendacoes.length; j++) {
      linhas.push(res.recomendacoes[j]);
    }
    if (res.alertas.length > 0) {
      linhas.push('');
      for (var k = 0; k < res.alertas.length; k++) {
        linhas.push(res.alertas[k]);
      }
    }

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var gestante = /(gestant|gravid|prenatal|dpp|semanas)/i.test(texto);
    var pielo = /(pielonefrit|febre|giordano|dor lombar|calafrio)/i.test(texto);
    var sepse = /(sepse|choque|hipotens|vomit)/i.test(texto);
    var homem = /(homem|masculin|macho|senhor|rapaz)/i.test(texto);

    var tipo = 'cistite_nao_complicada';
    if (sepse || (pielo && gestante)) tipo = 'pielonefrite_hospitalar';
    else if (pielo) tipo = 'pielonefrite_ambulatorial';
    else if (gestante) tipo = 'cistite_gestante';
    else if (homem) tipo = 'itu_masculina';

    return {
      tipo: tipo,
      gestante: gestante,
      sexo: homem ? 'M' : 'F',
      febre: pielo,
      sepse: sepse
    };
  }

  return {
    conduzirItu: conduzirItu,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InfectologiaItuService;
}
