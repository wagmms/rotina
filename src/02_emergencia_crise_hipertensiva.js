/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE CRISE HIPERTENSIVA (PSEUDOCRISE, URGÊNCIA & EMERGÊNCIA)
 * ==============================================================================
 * Referência: Diretrizes Brasileiras de Hipertensão Arterial (SBC 2020 / 2024),
 * AHA/ACC 2023. Abordagem beira-leito com metas pressóricas e segurança farmacológica.
 * ==============================================================================
 */

var EmergenciaCriseHipertensivaService = (function () {
  'use strict';

  function classificarCrise(dados) {
    dados = dados || {};
    var pas = Number(dados.pas || dados.pressaoSistolica) || 180;
    var pad = Number(dados.pad || dados.pressaoDiastolica) || 110;
    var loa = dados.lesaoOrgaoAlvo || {};

    var temEap = Boolean(loa.eap || dados.eap || dados.edemaPulmao || dados.dispneiaGrave);
    var temEncefalopatia = Boolean(loa.encefalopatia || dados.encefalopatia || dados.confusao || dados.papiledema);
    var temDisseccao = Boolean(loa.disseccao || dados.disseccao || dados.dorRasgando);
    var temIam = Boolean(loa.iam || dados.iam || dados.dorPrecordial || dados.sca);
    var temAvc = Boolean(loa.avc || dados.avc || dados.deficitFocal);
    var temPreEclampsia = Boolean(loa.preeclampsia || dados.preeclampsia || dados.gestante);

    var temLoaAguda = temEap || temEncefalopatia || temDisseccao || temIam || temAvc || temPreEclampsia;

    var tipo = 'URGENCIA_HIPERTENSIVA';
    var titulo = 'Urgência Hipertensiva (PA Elevada sem Lesão de Órgão-Alvo)';
    var local = 'Sala de Observação / UPA';
    var metaPressorica = 'Redução gradual em 24 a 48 horas (meta de PAS 140-160 mmHg e PAD 90-100 mmHg). Queda inicial não deve ultrapassar 20-25% da PAM.';
    var medicacoes = [];
    var condutas = [];
    var alertas = [];

    // Checagem de Pseudocrise
    var dorAnsiedade = Boolean(dados.dor || dados.ansiedade || dados.estresse || dados.cefaleiaTensional);
    if (!temLoaAguda && (dorAnsiedade || (pas < 180 && pad < 120))) {
      tipo = 'PSEUDOCRISE_HIPERTENSIVA';
      titulo = 'Pseudocrise Hipertensiva (Elevação Reativa da PA)';
      local = 'Acolhimento / Sala de Medicação / UBS';
      metaPressorica = 'Não há indicação de redução agressiva imediata da PA. O foco é tratar o gatilho desencadeante.';
      
      condutas.push('• Repouso em ambiente calmo e silencioso por 30 a 60 minutos.');
      condutas.push('• Analgesia simples para dor (Dipirona 1g VO/IV) ou suporte para ansiedade/pânico.');
      condutas.push('• Reavaliar a pressão arterial após o repouso e analgesia.');
      condutas.push('• Se PA persistir muito elevada após repouso: administrar Captopril 25mg VO.');
      condutas.push('• Encaminhar para acompanhamento ambulatorial na UBS para ajuste da medicação de uso crônico.');
      
      alertas.push('⛔ NUNCA prescrever Nifedipino de ação rápida / sublingual: causa hipotensão súbita, taquicardia reflexa e risco de isquemia coronariana e cerebral.');
    } else if (temLoaAguda) {
      tipo = 'EMERGENCIA_HIPERTENSIVA';
      titulo = 'EMERGÊNCIA HIPERTENSIVA (Risco Iminente de Morte / Lesão de Órgão-Alvo)';
      local = '🚨 SALA VERMELHA / MONITORIZAÇÃO CONTÍNUA / UTI';

      if (temDisseccao) {
        metaPressorica = 'META AGUDA DISSECÇÃO DE AORTA: PAS < 120 mmHg e FC < 60 bpm em 20 minutos!';
        medicacoes.push('💉 1º PASSO: Betabloqueador IV (Esmolol em BIC ou Metoprolol 5mg IV a cada 5 min até FC < 60 bpm). NUNCA usar vasodilatador puro antes do betabloqueador (risco de cisalhamento aórtico).');
        medicacoes.push('💉 2º PASSO: Nitroprussiato de Sódio IV em BIC titulado (iniciar a 0.3 a 0.5 mcg/kg/min) até PAS < 120 mmHg.');
        condutas.push('• Acionar Cirurgia Cardíaca/Vascular imediatamente e solicitar Angio-TC de Aorta urgente.');
      } else if (temEap) {
        metaPressorica = 'META EAP HIPERTENSIVO: Redução de 20 a 30% da PAM em 30-60 min com melhora do desconforto respiratório.';
        medicacoes.push('💉 Nitroglicerina IV em BIC (5 mcg/min, titulando a cada 5 min) OU Nitroprussiato de Sódio IV se PAS muito elevada.');
        medicacoes.push('💉 Furosemida 40 a 80 mg IV em bolus.');
        condutas.push('• Oxigenioterapia com VNI (CPAP 8 a 10 cmH2O) — reduz pré-carga e necessidade de intubação.');
      } else if (temIam) {
        metaPressorica = 'META SCA/IAM: Controle da dor e redução gradual da PA com Nitroglicerina IV.';
        medicacoes.push('💉 Nitroglicerina IV contínua (alivia isquemia e pré-carga) + Betabloqueador oral precoce.');
        condutas.push('• Protocolo de SCA: AAS 300mg mastigado, Ticagrelor/Clopidogrel, anticoagulação e CAT de urgência.');
      } else if (temAvc) {
        metaPressorica = 'META AVC ISQUÊMICO: NÃO reduzir PA se PAS < 220 ou PAD < 120, EXCETO se candidato a trombólise (onde meta é PA < 185/110 mmHg).';
        medicacoes.push('💉 Se elegível para trombólise e PA > 185/110: Nitroprussiato de Sódio IV ou Labetalol IV.');
        condutas.push('• Tomografia de crânio sem contraste imediata e acionamento da equipe de AVC.');
      } else if (temPreEclampsia) {
        metaPressorica = 'META GESTANTE: PAS 140-150 mmHg e PAD 90-100 mmHg (evitar hipotensão para manter perfusão placentária).';
        medicacoes.push('💉 Hidralazina 5mg IV lento a cada 20 min (máx 20mg) OU Nifedipino Retard 20mg VO.');
        medicacoes.push('💉 Sulfato de Magnésio 50% (Esquema de Zuspan: 4g IV ataque + 1-2g/h manutenção) para profilaxia de convulsão.');
        condutas.push('• ⛔ Contraindicação Absoluta: IECAs, BRAs e Nitroprussiato (teratogênicos / toxicidade fetal).');
      } else {
        // Encefalopatia hipertensiva padrão
        metaPressorica = 'META GERAL: Reduzir PAM em 20 a 25% na primeira hora; depois atingir 160/100 mmHg em 2 a 6 horas.';
        medicacoes.push('💉 Nitroprussiato de Sódio IV em BIC contínua: 0.25 a 0.5 mcg/kg/min (proteger frasco da luz).');
      }

      alertas.push('🚨 Linha arterial (PA invasiva) recomendada se infusão prolongada de Nitroprussiato > 24-48h (risco de intoxicação por tiocianato/cianeto em insuficiência renal).');
    } else {
      // Urgência Hipertensiva
      condutas.push('• Permanência em leito de observação por 2 a 4 horas.');
      condutas.push('• Redução gradual da PA com anti-hipertensivo oral.');
      condutas.push('• Avaliação de fundo de olho e rastreio sumário (Eletrocardiograma, Creatinina, Urina 1).');
      condutas.push('• Orientar reavaliação ambulatorial em 48 a 72 horas para ajuste de drogas de ação prolongada.');

      medicacoes.push('💊 1ª Opção: Captopril 25mg a 50mg VO (início de ação em 15-30 min). Pode repetir 25mg após 1 hora se necessário.');
      medicacoes.push('💊 2ª Opção: Clonidina 0.100mg a 0.200mg VO (início de ação em 30-60 min).');
      medicacoes.push('💊 3ª Opção: Anlodipino 5mg a 10mg VO (se histórico prévio de bloqueador de canal de cálcio).');

      alertas.push('⚠️ Evitar normalizar a PA na urgência: reduções drásticas reduzem fluxo cerebral e renal em hipertensos crônicos.');
    }

    return {
      tipo: tipo,
      titulo: titulo,
      pas: pas,
      pad: pad,
      localRecomendado: local,
      metaPressorica: metaPressorica,
      condutas: condutas,
      medicacoes: medicacoes,
      alertas: alertas
    };
  }

  function formatarTextoTelegram(res) {
    var linhas = [];
    linhas.push('❤️ *MANEJO DE CRISE HIPERTENSIVA & PSEUDOCRISE*');
    linhas.push('📅 *Diretrizes SBC / AHA / ACC*');
    linhas.push('');
    linhas.push('*Classificação:* ' + res.titulo);
    linhas.push('*Pressão Aferida:* ' + res.pas + ' × ' + res.pad + ' mmHg');
    linhas.push('*Local Recomendado:* ' + res.localRecomendado);
    linhas.push('');
    linhas.push('🎯 *Meta Pressórica:*');
    linhas.push(res.metaPressorica);
    linhas.push('');
    if (res.medicacoes.length > 0) {
      linhas.push('💊 *Conduta Farmacológica:*');
      for (var i = 0; i < res.medicacoes.length; i++) {
        linhas.push(res.medicacoes[i]);
      }
      linhas.push('');
    }
    if (res.condutas.length > 0) {
      linhas.push('*Condutas Gerais:*');
      for (var j = 0; j < res.condutas.length; j++) {
        linhas.push(res.condutas[j]);
      }
      linhas.push('');
    }
    for (var k = 0; k < res.alertas.length; k++) {
      linhas.push(res.alertas[k]);
    }

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var pas = 180, pad = 110;
    var mPa = texto.match(/(\d{2,3})\s*[xX/]\s*(\d{2,3})/);
    if (mPa) {
      pas = parseInt(mPa[1], 10);
      pad = parseInt(mPa[2], 10);
    }

    var loa = {
      eap: /(eap|edema agudo|congestao pulmonar|crepit)/i.test(texto),
      encefalopatia: /(encefalopatia|confus|papiledema|turvacao|coma)/i.test(texto),
      disseccao: /(dissecc|dor rasgando|dor transfix|assimetria de pulso)/i.test(texto),
      iam: /(iam|dor precordial|infarto|sca|supra)/i.test(texto),
      avc: /(avc|deficit|hemiplegia|afasia)/i.test(texto),
      preeclampsia: /(gestant|gravid|preeclamp|eclamp)/i.test(texto)
    };

    var dorAnsiedade = /(dor|ansiedad|panico|estresse|nervos|tensional)/i.test(texto);

    return {
      pas: pas,
      pad: pad,
      lesaoOrgaoAlvo: loa,
      dor: dorAnsiedade
    };
  }

  return {
    classificarCrise: classificarCrise,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmergenciaCriseHipertensivaService;
}
