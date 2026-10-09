/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE CEFALEIAS AGUDAS NO PS & CRITÉRIOS SNOOP
 * ==============================================================================
 * Referência: International Headache Society (ICHD-3), Academia Brasileira de
 * Neurologia (ABN), Protocolos de Triagem de Cefaleias em Emergência.
 * ==============================================================================
 */

var NeurologiaCefaleiasService = (function () {
  'use strict';

  function avaliarBandeirasVermelhas(dados) {
    dados = dados || {};
    var snoop = [];
    var redFlags = [];

    // S - Sistêmicos
    var sistemico = Boolean(dados.febre || dados.rigidezNuca || dados.neoplasia || dados.hiv || dados.imunossupressao || dados.perdaPeso);
    if (sistemico) {
      snoop.push('S (Sistêmicos): Febre, rigidez de nuca, perda de peso ou histórico de neoplasia/imunossupressão.');
      redFlags.push('Sintomas sistêmicos / suspeita de infecção de SNC ou metástase');
    }

    // N - Neurológicos
    var neurologico = Boolean(dados.deficitFocal || dados.afasia || dados.papiledema || dados.convulsao || dados.rebaixamentoConsciencia);
    if (neurologico) {
      snoop.push('N (Neurológicos): Déficit focal, papiledema, crise convulsiva ou alteração cognitiva/consciência.');
      redFlags.push('Sinais neurológicos focais / hipertensão intracraniana');
    }

    // O - Onset súbito (Thunderclap)
    var onsetSubito = Boolean(dados.thunderclap || dados.inicioSubito || dados.trovoada || dados.picoMenor1Minuto);
    if (onsetSubito) {
      snoop.push('O (Onset Súbito): Cefaleia em trovoada (pico de dor instantâneo em < 1 minuto).');
      redFlags.push('Cefaleia em trovoada / suspeita crítica de Hemorragia Subaracnóidea (HSA)');
    }

    // O - Older (Idade > 50 anos)
    var idade = Number(dados.idade) || 0;
    var older = (!isNaN(idade) && idade >= 50 && Boolean(dados.inicioRecente || dados.primeiraCefaleia));
    if (older || dados.idadeMais50) {
      snoop.push('O (Older): Início recente de cefaleia ou nova dor em paciente ≥ 50 anos.');
      redFlags.push('Início tardio / suspeita de Arterite de Células Gigantes ou lesão expansiva');
    }

    // P - Pattern change / Postural
    var patternChange = Boolean(dados.mudancaPadrao || dados.pioraPostural || dados.pioraValsalva || dados.despertaSono);
    if (patternChange) {
      snoop.push('P (Pattern/Posicional): Mudança abrupta de padrão, piora com manobra de Valsalva/tosse ou ao deitar.');
      redFlags.push('Cefaleia com sinal posicional / suspeita de variação de pressão liquórica ou massa');
    }

    var temBandeiraVermelha = snoop.length > 0;
    var classificacao = temBandeiraVermelha
      ? 'CEFALEIA SECUNDÁRIA POTENCIALMENTE GRAVE (Bandeira Vermelha Presente)'
      : 'Cefaleia Primária Provável (Sem Bandeiras Vermelhas)';

    var condutas = [];
    var esquemaTratamentoPS = [];

    if (temBandeiraVermelha) {
      condutas.push('🚨 SOLICITAR TOMOGRAFIA COMPUTADORIZADA (TC) DE CRÂNIO SEM CONTRASTE IMEDIATA.');
      if (onsetSubito) {
        condutas.push('• Se TC de crânio for normal e o início foi súbito/thunderclap há menos de 2 semanas: PUNÇÃO LOMBAR diagnóstica mandatória para afastar HSA (pesquisa de xantocromia).');
      }
      if (dados.febre || dados.rigidezNuca) {
        condutas.push('• Suspeita de Meningite bacteriana: colher Hemoculturas e Líquor imediatamente; iniciar Ceftriaxona 2g IV 12/12h + Dexametasona 10mg IV antes ou com o primeiro ATB (adicionar Ampicilina 2g IV 4/4h se idade ≥ 50 anos).');
      }
      if (dados.idadeMais50 || older) {
        condutas.push('• Se dor temporal, claudicação de mandíbula ou alteração visual em > 50 anos: dosar VHS e PCR urgente (suspeita de Arterite Temporal — iniciar Prednisona 1 mg/kg/dia para prevenir cegueira irreversível).');
      }
    } else {
      condutas.push('• Paciente elegível para protocolo analgésico de resgate no Pronto Socorro.');
      condutas.push('• Manter em repouso em sala com pouca luz e baixo ruído.');
      condutas.push('• Hidratação com SF 0,9% 500 mL a 1.000 mL IV.');

      esquemaTratamentoPS = [
        '💊 Dipirona 1g a 2g IV em 100 mL de SF 0,9% correr em 15 minutos',
        '💊 Metoclopramida 10mg IV lento (alivia náusea e potencializa a absorção gástrica)',
        '💊 Dexametasona 4mg a 10mg IV (reduz significativamente a taxa de recorrência da migrânea em até 72 horas)',
        '💊 AINE IV (se sem contraindicações renais/gástricas): Cetoprofeno 100mg IV ou Tenoxicam 20mg IV'
      ];
    }

    var bloqueiosSeguranca = [
      '⛔ NÃO USAR OPIOIDES (Morfina, Tramadol, Codeína) na cefaleia primária/enxaqueca: causam hiperalgesia de rebote, tolerância, náusea e cronificação da dor.'
    ];

    return {
      temBandeiraVermelha: temBandeiraVermelha,
      classificacao: classificacao,
      criteriosSnoopPositivos: snoop,
      redFlags: redFlags,
      condutas: condutas,
      esquemaTratamentoPS: esquemaTratamentoPS,
      bloqueiosSeguranca: bloqueiosSeguranca
    };
  }

  function formatarTextoTelegram(res) {
    var linhas = [];
    linhas.push('🤕 *ABORDAGEM DE CEFALEIA AGUDA & PROTOCOLO SNOOP*');
    linhas.push('📅 *Diretrizes ABN / International Headache Society (ICHD-3)*');
    linhas.push('');
    linhas.push('*Classificação:* ' + res.classificacao);
    linhas.push('');

    if (res.temBandeiraVermelha) {
      linhas.push('🚩 *Bandeiras Vermelhas Identificadas (SNOOP):*');
      for (var i = 0; i < res.criteriosSnoopPositivos.length; i++) {
        linhas.push('• ' + res.criteriosSnoopPositivos[i]);
      }
      linhas.push('');
      linhas.push('*Conduta de Investigação Urgente:*');
      for (var j = 0; j < res.condutas.length; j++) {
        linhas.push(res.condutas[j]);
      }
    } else {
      linhas.push('✅ *Nenhuma bandeira vermelha detectada.* Dor compatível com crise de cefaleia primária.');
      linhas.push('');
      linhas.push('💊 *Protocolo de Resgate no Pronto Socorro:*');
      for (var k = 0; k < res.esquemaTratamentoPS.length; k++) {
        linhas.push(res.esquemaTratamentoPS[k]);
      }
      linhas.push('');
      linhas.push('*Orientações Beira-Leito:*');
      for (var l = 0; l < res.condutas.length; l++) {
        linhas.push(res.condutas[l]);
      }
    }

    linhas.push('');
    linhas.push(res.bloqueiosSeguranca[0]);

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var p = {
      febre: /(febre|febril|calafrio)/i.test(texto),
      rigidezNuca: /(rigidez|mening|nuca|brudzinski|kernig)/i.test(texto),
      deficitFocal: /(deficit|motor|hemipleg|visao|afasia|diplopia)/i.test(texto),
      thunderclap: /(thunderclap|trovoada|subit|pico instantaneo|explosiva)/i.test(texto),
      mudancaPadrao: /(mudanca|diferente|pior da vida|nunca sentiu)/i.test(texto),
      pioraPostural: /(deitar|tosse|valsalva|esforco)/i.test(texto),
      idade: null,
      idadeMais50: /(> 50|mais de 50|idoso)/i.test(texto)
    };

    var mIdade = texto.match(/(\d+)\s*(?:anos|a\b)/i);
    if (mIdade) {
      p.idade = parseInt(mIdade[1], 10);
      if (p.idade >= 50) p.idadeMais50 = true;
    }

    return p;
  }

  return {
    avaliarBandeirasVermelhas: avaliarBandeirasVermelhas,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NeurologiaCefaleiasService;
}
