/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE DECLARAÇÃO DE ÓBITO & NOTIFICAÇÃO COMPULSÓRIA
 * ==============================================================================
 * Referência: Conselho Federal de Medicina (Resolução CFM 1.779/2005), Ministério da
 * Saúde (Manual de Instruções para Preenchimento da Declaração de Óbito 2022),
 * Portaria GM/MS nº 217/2023 (Lista Nacional de Notificação Compulsória / SINAN).
 * ==============================================================================
 */

var MedicinaLegalObitoService = (function () {
  'use strict';

  function fluxoDeclaracaoObito(tipoMorte) {
    tipoMorte = String(tipoMorte || 'natural_assistida').toLowerCase();

    var ehViolenta = /(violent|acident|homicid|suicid|queda|trauma|afogament|intoxicacao|externa|suspeita)/i.test(tipoMorte);
    var ehSemAssistencia = /(sem[\s_]+assistencia|indefinid|desconhecid|svo|domiciliar)/i.test(tipoMorte);

    var destino = 'MÉDICO ASSISTENTE / PLANTONISTA DO HOSPITAL';
    var orientacoes = [];
    var modeloCausaMorte = {};

    if (ehViolenta) {
      destino = 'INSTITUTO MÉDICO LEGAL (IML) — MANDATÓRIO';
      orientacoes.push('🚨 MORTE VIOLENTA OU SUSPEITA DE CAUSA EXTERNA.');
      orientacoes.push('• É TERMINANTEMENTE PROIBIDO ao médico assistente ou hospitalar emitir a Declaração de Óbito.');
      orientacoes.push('• Encaminhar o corpo imediatamente ao IML acompanhado de Boletim de Ocorrência (BO).');
      orientacoes.push('• Atenção: Morte decorrente de queda em idoso com fratura de fêmur e complicação tardia É CAUSA EXTERNA e deve ir ao IML!');
    } else if (ehSemAssistencia) {
      destino = 'SERVIÇO DE VERIFICAÇÃO DE ÓBITO (SVO)';
      orientacoes.push('• Morte natural sem assistência médica ou com causa clínica não esclarecida.');
      orientacoes.push('• Encaminhar ao SVO se disponível no município.');
      orientacoes.push('• Se inexistir SVO na localidade: a Declaração de Óbito deve ser emitida por médico do serviço público de saúde local mais próximo.');
    } else {
      destino = 'MÉDICO ASSISTENTE OU PLANTONISTA DA UNIDADE';
      orientacoes.push('• Morte natural com diagnóstico firmado ou assistência durante a internação.');
      orientacoes.push('• O médico que vinha prestando assistência ou o plantonista que constatou o óbito deve emitir a DO.');
      orientacoes.push('• Nunca colocar "Parada Cardiorrespiratória" ou "Falência de Múltiplos Órgãos" como causa básica.');
    }

    modeloCausaMorte = {
      parte1_linha_a_causa_imediata: 'Choque Séptico / Insuficiência Respiratória Aguda',
      parte1_linha_b_intermediaria: 'Broncopneumonia bacteriana',
      parte1_linha_c_antecedente: 'Acidente Vascular Cerebral Isquêmico prévio / Sequelar',
      parte1_linha_d_causa_basica: 'Hipertensão Arterial Sistêmica severa',
      parte2_outras_condicoes: 'Diabetes Mellitus tipo 2, Tabagismo pregresso'
    };

    return {
      tipoMorte: tipoMorte,
      destinoObrigatorio: destino,
      orientacoes: orientacoes,
      exemploPreenchimento: modeloCausaMorte
    };
  }

  function listarNotificacoesImediatas() {
    return [
      '🚨 Dengue com sinais de alarme ou Dengue Grave (Choque)',
      '🚨 Febre Amarela e Chikungunya com óbito / em área nova',
      '🚨 Raiva Humana / Acidente com animal potencialmente transmissor',
      '🚨 Meningites (Meningocócica, Pneumocócica, Haemophilus)',
      '🚨 Síndrome Respiratória Aguda Grave (SRAG) por Influenza / SARS-CoV-2',
      '🚨 Cólera, Botulismo e Difteria',
      '🚨 Sarampo e Rubéola',
      '🚨 Peste e Febre Maculosa',
      '🚨 Mpox (Varíola dos Macacos)',
      '🚨 Eventos Adversos Graves Pós-Vacinação (EAPV)'
    ];
  }

  function formatarTextoTelegram(dados) {
    dados = dados || {};
    var fluxo = fluxoDeclaracaoObito(dados.tipo);
    var linhas = [];

    linhas.push('📄 *DECLARAÇÃO DE ÓBITO & NOTIFICAÇÃO COMPULSÓRIA*');
    linhas.push('📅 *Resoluções CFM 1.779/2005 & Ministério da Saúde*');
    linhas.push('');
    linhas.push('*Destino Legal Obrigatório do Corpo:*');
    linhas.push('🏛️ *' + fluxo.destinoObrigatorio + '*');
    linhas.push('');

    linhas.push('*Orientações Normativas:*');
    for (var i = 0; i < fluxo.orientacoes.length; i++) {
      linhas.push(fluxo.orientacoes[i]);
    }
    linhas.push('');

    linhas.push('✍️ *Exemplo Correto de Preenchimento das Linhas (Parte I):*');
    linhas.push('• Linha a (Causa Imediata/Terminal): ' + fluxo.exemploPreenchimento.parte1_linha_a_causa_imediata);
    linhas.push('• Linha b (Intermediária): ' + fluxo.exemploPreenchimento.parte1_linha_b_intermediaria);
    linhas.push('• Linha c (Antecedente): ' + fluxo.exemploPreenchimento.parte1_linha_c_antecedente);
    linhas.push('• Linha d (Causa Básica Primária): ' + fluxo.exemploPreenchimento.parte1_linha_d_causa_basica);
    linhas.push('• Parte II (Contribuíram sem relação direta): ' + fluxo.exemploPreenchimento.parte2_outras_condicoes);
    linhas.push('');

    linhas.push('🔔 *Doenças de Notificação Compulsória IMEDIATA (24h ao SINAN):*');
    var notifs = listarNotificacoesImediatas();
    for (var j = 0; j < Math.min(6, notifs.length); j++) {
      linhas.push('• ' + notifs[j]);
    }

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var tipo = 'natural_assistida';
    if (/(violent|acident|queda|tiro|homicid|suicid|iml|estranha)/i.test(texto)) {
      tipo = 'violenta_suspeita';
    } else if (/(sem assistencia|desconhecid|svo|domicilio|achado)/i.test(texto)) {
      tipo = 'sem_assistencia';
    }
    return { tipo: tipo };
  }

  return {
    fluxoDeclaracaoObito: fluxoDeclaracaoObito,
    listarNotificacoesImediatas: listarNotificacoesImediatas,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MedicinaLegalObitoService;
}
