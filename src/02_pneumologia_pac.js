/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC & CURB-65)
 * ==============================================================================
 * Referência: Diretrizes Brasileiras para Manejo da PAC em Adultos (SBPT 2018 /
 * ATS/IDSA 2019 / Ministério da Saúde).
 * ==============================================================================
 */

var PneumologiaPacService = (function () {
  'use strict';

  function calcularCurb65(dados) {
    dados = dados || {};
    var confusao = Boolean(dados.confusao || dados.confusaoMental);
    var ureia = Number(dados.ureia);
    var fr = Number(dados.frequenciaRespiratoria || dados.fr);
    var pas = Number(dados.pas || dados.pressaoSistolica);
    var pad = Number(dados.pad || dados.pressaoDiastolica);
    var idade = Number(dados.idade);

    var c = confusao ? 1 : 0;
    var u = (!isNaN(ureia) && ureia > 50) ? 1 : 0;
    var r = (!isNaN(fr) && fr >= 30) ? 1 : 0;
    var b = ((!isNaN(pas) && pas > 0 && pas < 90) || (!isNaN(pad) && pad > 0 && pad <= 60)) ? 1 : 0;
    var sessentaECinco = (!isNaN(idade) && idade >= 65) ? 1 : 0;

    var escore = c + u + r + b + sessentaECinco;

    var risco = 'BAIXO';
    var mortalidade = '< 1.5%';
    var localRecomendado = 'Tratamento Ambulatorial';
    var esquemaSugerido = [];

    if (escore >= 3) {
      risco = 'ALTO';
      mortalidade = escore === 3 ? '17%' : '27% a 40%';
      localRecomendado = 'Internação Hospitalar Mandatória (Avaliar UTI se escore 4 ou 5)';
      esquemaSugerido = [
        '• Ceftriaxona 2g IV 1x/dia + Azitromicina 500mg IV 1x/dia por 7 dias',
        '• Alternativa (alergia grave a beta-lactâmicos): Levofloxacino 750mg IV 1x/dia ou Moxifloxacino 400mg IV 1x/dia',
        '• Solicitar: Hemoculturas (2 pares), Raio-X de tórax, Gasometria arterial, PCR, Função renal e Eletrólitos.'
      ];
    } else if (escore === 2) {
      risco = 'MODERADO';
      mortalidade = '9.2%';
      localRecomendado = 'Enfermaria Clínica Geral ou Observação Supervisionada em UPA';
      esquemaSugerido = [
        '• Ceftriaxona 1g a 2g IV 1x/dia + Azitromicina 500mg VO 1x/dia por 5 a 7 dias',
        '• Alternativa: Amoxicilina + Clavulanato 1g/200mg IV 8/8h associado a Macrolídeo',
        '• Se paciente jovem e estável sem vômitos: avaliar Amoxicilina + Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO'
      ];
    } else {
      risco = 'BAIXO';
      mortalidade = '< 1.5%';
      localRecomendado = 'Tratamento Ambulatorial em Domicílio';
      esquemaSugerido = [
        '• 1ª Linha (sem comorbidades): Amoxicilina 500mg VO 8/8h por 5 a 7 dias',
        '• Com comorbidades ou idoso: Amoxicilina + Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO 1x/dia por 5 dias',
        '• Alérgicos a Penicilina: Azitromicina 500mg VO 1x/dia por 5 dias ou Claritromicina 500mg VO 12/12h por 7 dias',
        '• Reavaliação clínica obrigatória em 48 a 72 horas ou imediatamente se piora da dispneia.'
      ];
    }

    var criteriosUti = [
      'Critérios Maiores ATS/IDSA (1 critério = Indicação de UTI): Ventilação Mecânica Invasiva ou Choque Séptico refratário.',
      'Critérios Menores (≥ 3 critérios = Indicação de UTI): PaO2/FiO2 ≤ 250, Infiltrado multilobar, Confusão mental, Leucopenia (< 4.000), Plaquetopenia (< 100.000), Hipotermia (< 36°C) ou Hipotensão com necessidade de volume agressivo.'
    ];

    return {
      escore: escore,
      detalhesEscore: {
        confusao: Boolean(c),
        ureiaElevada: Boolean(u),
        taquipneia: Boolean(r),
        hipotensao: Boolean(b),
        idadeIdoso: Boolean(sessentaECinco)
      },
      risco: risco,
      mortalidadeEstimada: mortalidade,
      localRecomendado: localRecomendado,
      esquemaSugerido: esquemaSugerido,
      criteriosUti: criteriosUti
    };
  }

  function formatarTextoTelegram(res) {
    var linhas = [];
    linhas.push('🫁 *PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC & CURB-65)*');
    linhas.push('📅 *Diretrizes SBPT / ATS / IDSA*');
    linhas.push('');
    linhas.push('*Escore CURB-65:* ' + res.escore + ' pontos');
    linhas.push('*Estratificação de Risco:* ' + res.risco + ' (Mortalidade estimada: ' + res.mortalidadeEstimada + ')');
    linhas.push('*Local Recomendado:* ' + res.localRecomendado);
    linhas.push('');
    linhas.push('💊 *Esquema Antimicrobiano Sugerido:*');
    for (var i = 0; i < res.esquemaSugerido.length; i++) {
      linhas.push(res.esquemaSugerido[i]);
    }
    linhas.push('');
    linhas.push('⚠️ *Critérios de Gravidade / UTI (ATS/IDSA):*');
    linhas.push('• ' + res.criteriosUti[0]);
    linhas.push('• ' + res.criteriosUti[1]);

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var p = {
      confusao: /(confus|desorient|torpor|sonol)/i.test(texto),
      ureia: null,
      frequenciaRespiratoria: null,
      pas: null,
      pad: null,
      idade: null
    };

    var mU = texto.match(/ureia\s*[:=]?\s*(\d+)/i);
    if (mU) p.ureia = parseInt(mU[1], 10);

    var mFr = texto.match(/fr\s*[:=]?\s*(\d+)/i);
    if (mFr) p.frequenciaRespiratoria = parseInt(mFr[1], 10);

    var mPa = texto.match(/pa\s*[:=]?\s*(\d+)[xX/](\d+)/i);
    if (mPa) {
      p.pas = parseInt(mPa[1], 10);
      p.pad = parseInt(mPa[2], 10);
    }

    var mIdade = texto.match(/(\d+)\s*(?:anos|a\b)/i);
    if (mIdade) p.idade = parseInt(mIdade[1], 10);

    return p;
  }

  return {
    calcularCurb65: calcularCurb65,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PneumologiaPacService;
}
