/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE ARBOVIROSES (DENGUE, CHIKUNGUNYA E ZIKA)
 * ==============================================================================
 * Referência: Ministério da Saúde (MS), "Dengue: diagnóstico e manejo clínico —
 * Adulto e Criança", 5ª edição, 2024. Protocolos de Triagem e Hidratação.
 * ==============================================================================
 */

var ArbovirosesDengueService = (function () {
  'use strict';

  var SINAIS_ALARME = [
    'Dor abdominal intensa (referida ou à palpação) e contínua',
    'Vômitos persistentes (≥ 3 episódios em 1 hora ou ≥ 4 em 4 horas)',
    'Acúmulo de líquidos (ascite, derrame pleural, derrame pericárdico)',
    'Hipotensão postural ou lipotimia',
    'Hepatomegalia dolorosa > 2 cm abaixo do rebordo costal direito',
    'Sangramento de mucosas (gengivorragia, epistaxe, metrorragia)',
    'Letargia, sonolência excessiva ou irritabilidade inexplicável',
    'Aumento progressivo do hematócrito (hemoconcentração aguda)'
  ];

  var SINAIS_CHOQUE = [
    'Hipotensão arterial (PAS < 90 mmHg ou PAM < 65 mmHg)',
    'Pressão de pulso convergente (PAS - PAD ≤ 20 mmHg)',
    'Pulso periférico filiforme, fino ou imperceptível',
    'Tempo de enchimento capilar (TEC) prolongado (> 2 segundos)',
    'Extremidades frias e sudorese pegajosa',
    'Oligúria severa (< 0.5 mL/kg/h nas últimas horas)',
    'Taquicardia desproporcional e taquipneia'
  ];

  function estadiarDengue(dados) {
    dados = dados || {};
    var pesoKg = Number(dados.pesoKg || dados.peso) || 70;
    var temSinaisAlarme = Boolean(dados.sinaisAlarme || dados.alarme);
    var temSinaisChoque = Boolean(dados.sinaisChoque || dados.choque || dados.gravidadeExtrema);
    var comorbidades = Boolean(dados.comorbidades || dados.gestante || dados.idoso || dados.lactente);
    var sangramentoEspontaneo = Boolean(dados.sangramento || dados.plaquetopeniaGrave);
    var falenciaOrgaos = Boolean(dados.falenciaOrgaos || dados.transaminasesMil || dados.miocardite);

    var grupo = 'A';
    var localAtendimento = 'Ambulatório / UBS';
    var classificacao = 'Dengue Sem Sinais de Alarme (Grupo A)';

    if (temSinaisChoque || sangramentoEspontaneo || falenciaOrgaos) {
      grupo = 'D';
      classificacao = 'Dengue Grave / Choque Hipovolêmico (Grupo D)';
      localAtendimento = 'Sala Vermelha / UTI';
    } else if (temSinaisAlarme) {
      grupo = 'C';
      classificacao = 'Dengue com Sinais de Alarme (Grupo C)';
      localAtendimento = 'Leito de Observação / Internação Hospitalar';
    } else if (comorbidades) {
      grupo = 'B';
      classificacao = 'Dengue com Condições Especiais / Risco Social (Grupo B)';
      localAtendimento = 'Ponto de Hidratação Supervisionada / UPA';
    }

    var planoHidratacao = calcularHidratacao(grupo, pesoKg);

    var condutas = [];
    var exames = [];

    if (grupo === 'A') {
      condutas.push('• Hidratação oral precoce e abundante (ver cálculo por peso).');
      condutas.push('• Sintomáticos: Dipirona 500mg a 1g VO 6/6h ou Paracetamol 500mg a 750mg VO 6/6h.');
      condutas.push('• ⛔ CONTRAINDICAÇÃO ABSOLUTA: AINEs (Ibuprofeno, Diclofenaco, Cetoprofeno) e AAS (risco hemorrágico e síndrome de Reye).');
      condutas.push('• Orientar retorno IMEDIATO se surgirem sinais de alarme (dor abdominal, vômitos, tontura ao levantar).');
      condutas.push('• Reavaliação clínica obrigatória no dia da desfervescência da febre (fase crítica: dias 3 a 7).');
      exames.push('Não são necessários exames laboratoriais na abordagem inicial se evolução favorável.');
    } else if (grupo === 'B') {
      condutas.push('• Iniciar hidratação oral supervisionada imediatamente na unidade.');
      condutas.push('• Manter em observação até o resultado dos exames laboratoriais.');
      condutas.push('• Se hematócrito normal e paciente tolerando líquidos: alta com hidratação oral reforçada e reavaliação em 24h.');
      condutas.push('• Se hemoconcentração (aumento de Ht) ou surgimento de alarme: migrar imediatamente para Grupo C.');
      exames.push('Hemograma completo obrigatório (Hematócrito, Leucograma e Plaquetas).');
      exames.push('Pesquisa de antígeno NS1 (até 5º dia) ou Sorologia IgM (a partir do 6º dia).');
    } else if (grupo === 'C') {
      condutas.push('• Leito de internação obrigatório (mínimo 48 horas).');
      condutas.push('• Iniciar reposição volêmica venosa IMEDIATA com Solução Fisiológica 0,9% ou Ringer Lactato.');
      condutas.push('• Monitorização de sinais vitais, diurese horária e repetição de hematócrito a cada 2 horas.');
      condutas.push('• Se estabilização clínica e queda de Ht: reduzir velocidade de infusão para fase de manutenção.');
      condutas.push('• Se refratariedade ou piora clínica: migrar imediatamente para Grupo D.');
      exames.push('Hemograma com hematócrito seriado (a cada 2h na fase rápida).');
      exames.push('Função renal (Ureia, Creatinina), Eletrólitos (Na, K), Transaminases (TGO, TGP) e Gasometria.');
    } else if (grupo === 'D') {
      condutas.push('• Acesso venoso calibroso imediato (2 acessos periféricos 14G/16G).');
      condutas.push('• Expansão rápida com cristaloides isotônicos (SF 0,9% ou RL): 20 mL/kg em 20 minutos (repetir até 3 vezes se necessário).');
      condutas.push('• Oxigenioterapia sob máscara com reservatório e monitorização contínua de ECG e oximetria.');
      condutas.push('• Se choque refratário após 60 mL/kg: avaliar uso de coloides (Albumina 20% 0,5 a 1 g/kg) e suporte vasopressor com Noradrenalina.');
      condutas.push('• Solicitação imediata de Vaga Zero / Leito de Terapia Intensiva (UTI).');
      exames.push('Hematócrito de urgência a cada 15-30 minutos durante a ressuscitação.');
      exames.push('Coagulograma completo (TAP, TTPA, Fibrinogênio), Tipagem sanguínea e Prova cruzada.');
      exames.push('Gasometria arterial com lactato e raio-x de tórax beira-leito.');
    }

    return {
      grupo: grupo,
      classificacao: classificacao,
      localAtendimento: localAtendimento,
      pesoKg: pesoKg,
      hidratacao: planoHidratacao,
      condutas: condutas,
      exames: exames,
      sinaisAlarmeDisponiveis: SINAIS_ALARME,
      sinaisChoqueDisponiveis: SINAIS_CHOQUE
    };
  }

  function calcularHidratacao(grupo, pesoKg) {
    pesoKg = Math.max(5, Math.min(200, Number(pesoKg) || 70));

    if (grupo === 'A') {
      // 60 mL/kg/dia (1/3 SRO e 2/3 líquidos caseiros)
      var volTotalA = Math.round(pesoKg * 60);
      var volSroA = Math.round(volTotalA / 3);
      var volLiquidosA = volTotalA - volSroA;
      return {
        via: 'Oral',
        volumeTotal24hMl: volTotalA,
        volumeSroMl: volSroA,
        volumeOutrosLiquidosMl: volLiquidosA,
        prescricaoFormatada: '💧 HIDRATAÇÃO ORAL GRUPO A:\n• Volume total em 24h: ' + volTotalA + ' mL (' + (volTotalA / 1000).toFixed(1) + ' L/dia)\n• Soro de Reidratação Oral (SRO): ' + volSroA + ' mL fracionados\n• Outros líquidos (água, sucos de frutas, água de coco): ' + volLiquidosA + ' mL'
      };
    } else if (grupo === 'B') {
      // 80 mL/kg/dia oral na unidade supervisionada
      var volTotalB = Math.round(pesoKg * 80);
      var volPrimQuatroHoras = Math.round(volTotalB / 3);
      return {
        via: 'Oral Supervisionada',
        volumeTotal24hMl: volTotalB,
        volumeFaseRapidaMl: volPrimQuatroHoras,
        prescricaoFormatada: '💧 HIDRATAÇÃO ORAL SUPERVISIONADA GRUPO B:\n• Volume nas primeiras 4 horas na UPA: ' + volPrimQuatroHoras + ' mL de SRO\n• Manter ingestão constante até liberação do hematócrito\n• Volume total estimado em 24h: ' + volTotalB + ' mL'
      };
    } else if (grupo === 'C') {
      // Fase rápida: 10 mL/kg/h em 2h
      // Fase de manutenção: 25 mL/kg em 6h
      var volFaseRapidaC = Math.round(pesoKg * 10 * 2);
      var vazaoHorariaRapidaC = Math.round(pesoKg * 10);
      var volManutencaoC = Math.round(pesoKg * 25);
      var vazaoManutencaoC = Math.round(volManutencaoC / 6);

      return {
        via: 'Intravenosa',
        faseRapidaTotalMl: volFaseRapidaC,
        faseRapidaVazaoMlH: vazaoHorariaRapidaC,
        faseManutencaoTotalMl: volManutencaoC,
        faseManutencaoVazaoMlH: vazaoManutencaoC,
        prescricaoFormatada: '💉 RESSUSCITAÇÃO VOLÊMICA VENOSA GRUPO C:\n• ETAPA 1 (Expansão inicial em 2h): SF 0,9% ou Ringer Lactato a ' + vazaoHorariaRapidaC + ' mL/h (Total em 2h: ' + volFaseRapidaC + ' mL)\n• Reavaliar hematócrito ao término de 2 horas.\n• ETAPA 2 (Manutenção se estável em 6h): Infundir ' + volManutencaoC + ' mL em 6 horas (Vazão: ' + vazaoManutencaoC + ' mL/h)'
      };
    } else {
      // Grupo D: 20 mL/kg em 20 min
      var volBolusD = Math.round(pesoKg * 20);
      return {
        via: 'Intravenosa Rápida (Sala Vermelha)',
        volumeBolusMl: volBolusD,
        tempoMinutos: 20,
        prescricaoFormatada: '🚨 EXPANSÃO RÁPIDA DE CHOQUE GRUPO D:\n• SF 0,9% ou Ringer Lactato: ' + volBolusD + ' mL IV aberto em 20 minutos (20 mL/kg)\n• Repetir até 3 vezes se ausência de resposta hemodinâmica (máx 60 mL/kg)\n• Monitorar sinais de sobrecarga volêmica (crepitações pulmonares, estase jugular)'
      };
    }
  }

  function formatarTextoTelegram(estudo) {
    var linhas = [];
    linhas.push('🦟 *MANEJO CLÍNICO DE DENGUE & ARBOVIROSES (MS 2024)*');
    linhas.push('📅 *Protocolo Oficial do Ministério da Saúde*');
    linhas.push('');
    linhas.push('*Classificação:* ' + estudo.classificacao);
    linhas.push('*Local Recomendado:* ' + estudo.localAtendimento);
    linhas.push('*Peso Referência:* ' + estudo.pesoKg + ' kg');
    linhas.push('');
    linhas.push('*Plano de Hidratação:*');
    linhas.push(estudo.hidratacao.prescricaoFormatada);
    linhas.push('');
    linhas.push('*Condutas Imediatas:*');
    for (var i = 0; i < estudo.condutas.length; i++) {
      linhas.push(estudo.condutas[i]);
    }
    linhas.push('');
    linhas.push('*Exames Complementares:*');
    for (var j = 0; j < estudo.exames.length; j++) {
      linhas.push('• ' + estudo.exames[j]);
    }
    linhas.push('');
    linhas.push('⚠️ *Sinais de Alarme para Vigilância:*');
    linhas.push('Dor abdominal intensa, vômitos frequentes, lipotimia, sangramentos e sonolência.');

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var peso = 70;
    var mPeso = texto.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|quilos?)/);
    if (mPeso) peso = parseFloat(mPeso[1].replace(',', '.'));

    var temChoque = /(choque|hipotens|pulso fino|tec >|extremidade fria|desmaio)/i.test(texto);
    var temAlarme = /(alarme|dor abdominal|vomit|sangrament|lipotimia|tontura|letargia|sangue)/i.test(texto);
    var temComorbidade = /(gestante|gravid|idoso|lactente|dm|has|cardiopata|renal)/i.test(texto);

    return {
      pesoKg: peso,
      sinaisChoque: temChoque,
      sinaisAlarme: temAlarme,
      comorbidades: temComorbidade
    };
  }

  return {
    estadiarDengue: estadiarDengue,
    calcularHidratacao: calcularHidratacao,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto,
    SINAIS_ALARME: SINAIS_ALARME,
    SINAIS_CHOQUE: SINAIS_CHOQUE
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArbovirosesDengueService;
}
