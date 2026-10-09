/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE PEQUENAS URGÊNCIAS & TRAUMATOLOGIA BÁSICA
 * ==============================================================================
 * Referência: Regras de Ottawa (Ottawa Ankle/Knee Rules), Ministério da Saúde
 * (Guia de Profilaxia do Tétano e Raiva Humana), Manual de Suturas e Anestesia Local.
 * ==============================================================================
 */

var PequenasUrgenciasTraumaService = (function () {
  'use strict';

  function regraOttawaTornozelo(dados) {
    dados = dados || {};
    var dorMaleoloLateral = Boolean(dados.dorMaleoloLateral || dados.bordaMaleoloLateral);
    var dorMaleoloMedial = Boolean(dados.dorMaleoloMedial || dados.bordaMaleoloMedial);
    var dorBaseQuintoMeta = Boolean(dados.dorBaseQuintoMeta || dados.quintoMetatarso);
    var dorNavicular = Boolean(dados.dorNavicular);
    var incapacidadePassos = Boolean(dados.incapacidadePassos || dados.naoAnda);

    var indicaRxTornozelo = dorMaleoloLateral || dorMaleoloMedial || incapacidadePassos;
    var indicaRxPe = dorBaseQuintoMeta || dorNavicular || incapacidadePassos;

    var justificativas = [];
    if (dorMaleoloLateral) justificativas.push('Dor à palpação dos 6 cm distais ou ponta do maléolo lateral.');
    if (dorMaleoloMedial) justificativas.push('Dor à palpação dos 6 cm distais ou ponta do maléolo medial.');
    if (dorBaseQuintoMeta) justificativas.push('Dor à palpação na base do 5º metatarso (risco de fratura de Jones).');
    if (dorNavicular) justificativas.push('Dor à palpação do osso navicular.');
    if (incapacidadePassos) justificativas.push('Incapacidade de suportar o peso e dar 4 passos no trauma e no exame.');

    return {
      indicaRxTornozelo: indicaRxTornozelo,
      indicaRxPe: indicaRxPe,
      necessitaImagem: indicaRxTornozelo || indicaRxPe,
      justificativas: justificativas,
      conduta: (indicaRxTornozelo || indicaRxPe)
        ? '🚨 INDICAÇÃO DE RAIO-X (Critérios de Ottawa Positivos): Solicitar radiografia de tornozelo (AP e Perfil) e/ou pé conforme a topografia da dor.'
        : '✅ DISPENSADA RADIOGRAFIA: Baixa probabilidade de fratura (< 1%). Tratar com PRICE (Proteção, Repouso, Gelo local por 20 min 3x/dia, Compressão com faixa elástica e Elevação do membro) + Analgesia simples.'
    };
  }

  function calcularLidocainaDoseMaxima(pesoKg, comVasoconstritor) {
    pesoKg = Math.max(5, Math.min(150, Number(pesoKg) || 70));
    var comAdrenalina = Boolean(comVasoconstritor);

    // 4.5 mg/kg sem vasoconstritor (teto 300 mg)
    // 7.0 mg/kg com vasoconstritor (teto 500 mg)
    var doseMgKg = comAdrenalina ? 7.0 : 4.5;
    var tetoMg = comAdrenalina ? 500 : 300;

    var doseCalculadaMg = Math.min(tetoMg, Math.round(pesoKg * doseMgKg));
    var volumeLido2PctMl = Math.round((doseCalculadaMg / 20) * 10) / 10; // 20 mg/mL
    var volumeLido1PctMl = Math.round((doseCalculadaMg / 10) * 10) / 10; // 10 mg/mL

    return {
      pesoKg: pesoKg,
      comVasoconstritor: comAdrenalina,
      doseMaximaMg: doseCalculadaMg,
      volumeMaximoLidocaina2PctMl: volumeLido2PctMl,
      volumeMaximoLidocaina1PctMl: volumeLido1PctMl,
      advertencia: comAdrenalina
        ? '⚠️ Adrenalina contraindicada em extremidades distais com circulação terminal (dedos, pênis, orelha, ponta do nariz).'
        : 'Seguro para infiltração local em qualquer topografia.'
    };
  }

  function avaliarProfilaxiaTetano(dados) {
    dados = dados || {};
    var dosesPrevias = Number(dados.dosesPrevias || dados.doses) || 0;
    var tempoUltimaDoseAnos = Number(dados.anosDesdeUltimaDose || dados.tempoAnos) || 5;
    var ferimentoGrave = Boolean(dados.ferimentoGrave || dados.contaminado || dados.terra || dados.mordedura || dados.queimadura);

    var vacina = false;
    var imunoglobulina = false;
    var motivo = '';

    if (dosesPrevias < 3 || isNaN(dosesPrevias)) {
      vacina = true;
      if (ferimentoGrave) {
        imunoglobulina = true;
        motivo = 'Esquema vacinal incerto ou incompleto (< 3 doses) com ferimento contaminado/alto risco: aplicar Vacina dT + Soro Antitetânico (SAT 5.000 UI) ou Imunoglobulina Antitetânica (IGHAT 250 UI).';
      } else {
        motivo = 'Esquema vacinal incompleto em ferimento limpo: aplicar 1 dose da Vacina dT e orientar completar o esquema na UBS.';
      }
    } else {
      // ≥ 3 doses
      if (ferimentoGrave) {
        if (tempoUltimaDoseAnos >= 5) {
          vacina = true;
          motivo = 'Ferimento de alto risco e última dose há ≥ 5 anos: aplicar 1 dose de reforço da Vacina dT. Imunoglobulina NÃO é necessária.';
        } else {
          motivo = 'Paciente imunizado (última dose há < 5 anos): Nenhuma dose adicional necessária.';
        }
      } else {
        // Ferimento limpo
        if (tempoUltimaDoseAnos >= 10) {
          vacina = true;
          motivo = 'Ferimento limpo e última dose há ≥ 10 anos: aplicar 1 dose de reforço da Vacina dT.';
        } else {
          motivo = 'Paciente imunizado (última dose há < 10 anos): Nenhuma intervenção antitetânica necessária.';
        }
      }
    }

    return {
      indicaVacinaDt: vacina,
      indicaSoroOuIghat: imunoglobulina,
      condutaDescricao: motivo
    };
  }

  function avaliarProfilaxiaRaiva(dados) {
    dados = dados || {};
    var animal = String(dados.animal || 'cao_gato').toLowerCase();
    var tipoLesao = String(dados.tipoLesao || 'arranhadura_superficial').toLowerCase();
    var animalObservavel = Boolean(dados.animalObservavel !== false);

    var ehMorcegoOuSilvestre = /(morcego|macaco|sagui|raposa|silvestre)/i.test(animal);
    var ehGrave = /(profund|multipl|face|cabeca|mao|polpa|mucosa)/i.test(tipoLesao) || ehMorcegoOuSilvestre;

    var conduta = [];
    if (ehMorcegoOuSilvestre) {
      conduta.push('🚨 ACIDENTE COM MORCEGO / ANIMAL SILVESTRE: RISCO MÁXIMO.');
      conduta.push('• Lavar exaustivamente com água corrente e sabão por 15 minutos.');
      conduta.push('• Soro Antirrábico (SAR 40 UI/kg) infiltrado na lesão e restante IM.');
      conduta.push('• Vacina antirrábica: Esquema de 4 doses nos dias 0, 3, 7 e 14.');
    } else if (animalObservavel) {
      if (ehGrave) {
        conduta.push('• Lavar com água e sabão por 15 minutos.');
        conduta.push('• Iniciar Vacina antirrábica (D0 e D3) e observar o cão/gato por 10 dias.');
        conduta.push('• Se animal permanecer saudável no 10º dia: encerrar o esquema e dispensar o soro.');
        conduta.push('• Se animal adoecer, morrer ou desaparecer: aplicar Soro Antirrábico (SAR) imediatamente e completar as 4 doses de vacina (D7 e D14).');
      } else {
        conduta.push('• Lavar com água e sabão.');
        conduta.push('• Observar o animal por 10 dias. Não iniciar vacina ou soro de imediato se acidente leve e animal sadio observável.');
        conduta.push('• Se o animal adoecer ou sumir no período: iniciar vacina imediatamente.');
      }
    } else {
      // Animal não observável / desconhecido
      conduta.push('• Animal desaparecido ou raivoso:');
      conduta.push('• Lavar exaustivamente com água e sabão.');
      conduta.push('• Esquema vacinal completo com 4 doses (dias 0, 3, 7 e 14).');
      if (ehGrave) {
        conduta.push('• Associar Soro Antirrábico (SAR 40 UI/kg) no D0.');
      }
    }

    return {
      ehGrave: ehGrave,
      animalObservavel: animalObservavel,
      condutas: conduta
    };
  }

  function guiaFiosECirurgia() {
    return [
      { regiao: 'Face', fio: 'Nylon 5-0 ou 6-0', tempoRetirada: '4 a 5 dias' },
      { regiao: 'Couro Cabeludo', fio: 'Nylon 3-0 ou 4-0', tempoRetirada: '7 a 10 dias' },
      { regiao: 'Tronco e Membros', fio: 'Nylon 3-0 ou 4-0', tempoRetirada: '10 a 14 dias' },
      { regiao: 'Mãos, Pés e Articulações', fio: 'Nylon 4-0 ou 5-0', tempoRetirada: '12 a 14 dias' }
    ];
  }

  function formatarTextoTelegram(dados) {
    var linhas = [];
    linhas.push('🩹 *PEQUENAS URGÊNCIAS & TRAUMATOLOGIA BÁSICA*');
    linhas.push('📅 *Ottawa Rules / Profilaxia Tétano & Raiva / Suturas*');
    linhas.push('');

    var ottawa = regraOttawaTornozelo(dados);
    linhas.push('*Critérios de Ottawa (Tornozelo/Pé):*');
    linhas.push(ottawa.conduta);
    linhas.push('');

    var peso = dados.pesoKg || 70;
    var lido = calcularLidocainaDoseMaxima(peso, dados.comVasoconstritor);
    linhas.push('*Anestesia Local (Lidocaína 2% para ' + peso + ' kg):*');
    linhas.push('• Dose máxima: ' + lido.doseMaximaMg + ' mg (' + lido.volumeMaximoLidocaina2PctMl + ' mL de Lidocaína 2%)');
    linhas.push('• ' + lido.advertencia);
    linhas.push('');

    linhas.push('*Tabela Rápida de Fios Cirúrgicos:*');
    var fios = guiaFiosECirurgia();
    for (var i = 0; i < fios.length; i++) {
      linhas.push('• ' + fios[i].regiao + ': ' + fios[i].fio + ' (retirar em ' + fios[i].tempoRetirada + ')');
    }
    linhas.push('');
    linhas.push('⚠️ *Mordeduras Humanas/Animais:* NÃO suturar (risco de infecção grave). Prescrever Amoxicilina + Clavulanato 875/125mg VO 12/12h por 3-5 dias.');

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var p = {
      pesoKg: 70,
      comVasoconstritor: /(vasoconstrit|adrenalina)/i.test(texto),
      dorMaleoloLateral: /(maleolo lateral|tornozelo lateral)/i.test(texto),
      dorMaleoloMedial: /(maleolo medial|tornozelo medial)/i.test(texto),
      dorBaseQuintoMeta: /(5|quinto|metatarso)/i.test(texto),
      dorNavicular: /(navicular)/i.test(texto),
      incapacidadePassos: /(nao anda|nao apoia|passos|mancar)/i.test(texto),
      animal: 'cao_gato',
      ferimentoGrave: /(profund|terra|sujo|contaminad|morded)/i.test(texto)
    };

    var mPeso = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilos?)/);
    if (mPeso) p.pesoKg = parseFloat(mPeso[1].replace(',', '.'));

    if (/(morcego|macaco|silvestre)/i.test(texto)) p.animal = 'morcego';

    return p;
  }

  return {
    regraOttawaTornozelo: regraOttawaTornozelo,
    calcularLidocainaDoseMaxima: calcularLidocainaDoseMaxima,
    avaliarProfilaxiaTetano: avaliarProfilaxiaTetano,
    avaliarProfilaxiaRaiva: avaliarProfilaxiaRaiva,
    guiaFiosECirurgia: guiaFiosECirurgia,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PequenasUrgenciasTraumaService;
}
