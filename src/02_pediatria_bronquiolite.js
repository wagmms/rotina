/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE PEDIATRIA DE EMERGÊNCIA
 * ==============================================================================
 * Manejo da Bronquiolite Viral Aguda
 * Diretrizes SBP / AAP
 * 
 * Escopo:
 * - Estratificação de gravidade clínica (Wood-Downes modificado)
 * - Restrição de broncodilatadores, corticoides e antibióticos
 * - Critérios de CNAF e Hidratação IV
 * ==============================================================================
 */

var PediatriaBronquioliteService = (function () {
  'use strict';

  function avaliarGravidade(parametros) {
    // Escore de Wood-Downes modificado simplificado
    var idadeMeses = parametros.idadeMeses || 6;
    var peso = parametros.pesoKg || 8;
    
    var sibilos = parametros.sibilos || 0; // 0=Ausente, 1=Final expiração, 2=Expiração completa, 3=Insp e exp
    var tiragem = parametros.tiragem || 0; // 0=Ausente, 1=Leve/subcostal, 2=Moderada/intercostal, 3=Severa/fúrcula
    var fr = parametros.fr || 40;
    var spo2 = parametros.spo2 || 96;

    var frScore = 0;
    if (idadeMeses < 2) {
        if (fr > 60) frScore = 3;
        else if (fr >= 50) frScore = 2;
        else if (fr > 40) frScore = 1;
    } else {
        if (fr > 50) frScore = 3;
        else if (fr >= 40) frScore = 2;
        else if (fr > 30) frScore = 1;
    }

    var cianoseScore = 0;
    if (spo2 < 90) cianoseScore = 3;
    else if (spo2 <= 92) cianoseScore = 2;
    else if (spo2 <= 94) cianoseScore = 1;

    var woodDownes = sibilos + tiragem + frScore + cianoseScore;
    
    var gravidadeStr = 'Leve';
    if (woodDownes >= 8 || spo2 < 90 || parametros.exaustao) {
        gravidadeStr = 'Grave';
    } else if (woodDownes >= 4 || spo2 <= 92) {
        gravidadeStr = 'Moderada';
    }

    return {
        score: woodDownes,
        classificacao: gravidadeStr,
        internacaoUTI: (gravidadeStr === 'Grave' || !!parametros.exaustao),
        riscoBroncoaspiracao: (fr > 60 || !!parametros.exaustao)
    };
  }

  function gerarConduta(parametros, gravidade) {
    var peso = parametros.pesoKg || 8;
    var fr = parametros.fr || 40;
    var spo2 = parametros.spo2 || 96;
    
    var relatorio = [];
    relatorio.push("🩺 **AVALIAÇÃO E CONDUTA - BRONQUIOLITE VIRAL AGUDA:**");
    relatorio.push("- **Gravidade:** " + gravidade.classificacao + " (Escore modificado de Wood-Downes estimado: " + gravidade.score + "/12)");

    relatorio.push("\n❌ **O QUE NÃO FAZER (Diretrizes SBP / AAP):**");
    relatorio.push("- **NÃO prescrever Salbutamol/Broncodilatadores:** Ausência de benefício clínico rotineiro em bronquiolite típica.");
    relatorio.push("- **NÃO prescrever Corticoides (VO/IV/Inalatório):** Não alteram desfecho ou tempo de internação.");
    relatorio.push("- **NÃO prescrever Antibióticos:** Trata-se de infecção viral (VSR é o mais comum). Reservar apenas se coinfecção bacteriana provada (OMA, pneumonia consolidativa).");
    relatorio.push("- **Fisioterapia Respiratória de rotina:** Não recomendada, pode piorar o estresse do lactente.");

    relatorio.push("\n✅ **PRESCRIÇÃO E MANEJO:**");
    relatorio.push("- **Lavagem Nasal:** Instilação frequente com SF 0.9%, especialmente antes das mamadas e do sono.");
    relatorio.push("- **Antitérmicos:** Dipirona ou Paracetamol se temperatura > 37.8°C.");

    // Suporte Respiratório
    if (gravidade.classificacao === 'Grave') {
        relatorio.push("- **Oxigenoterapia:** **Cânula Nasal de Alto Fluxo (CNAF)** é a escolha inicial se disponível, ou CPAP. Alvo de SpO2 > 92%.");
        relatorio.push("- **ALERTA UTI:** Indicação de internação em UTI Pediátrica devido gravidade/exaustão.");
        if (parametros.exaustao || spo2 < 88) {
            relatorio.push("- **Atenção:** Preparar material para IOT (Intubação Orotraqueal) caso falha na VNI/CNAF ou apneia.");
        }
    } else if (gravidade.classificacao === 'Moderada' || spo2 <= 92) {
        relatorio.push("- **Oxigenoterapia:** Cateter nasal de O2 (0.5 a 2 L/min) para manter SpO2 > 92%. Monitorização contínua.");
        relatorio.push("- **Internação:** Enfermaria pediátrica com isolamento de contato.");
    } else {
        relatorio.push("- **Oxigênio:** Ar ambiente. Sem indicação de suporte suplementar no momento.");
        relatorio.push("- **Conduta:** Alta hospitalar com orientações de sinais de alarme (esforço para respirar, recusa alimentar, letargia) e retorno se piora.");
    }

    // Suporte Nutricional e Hidratação
    if (gravidade.riscoBroncoaspiracao) {
        relatorio.push("- **Dieta:** **NPO (Jejum) ou Gavagem SNG/SNJ** devido alto risco de broncoaspiração com FR > 60 irpm.");
        
        var volHolliday = peso <= 10 ? peso * 100 : 1000 + ((peso - 10) * 50);
        var volRestrito = volHolliday * 0.7;
        
        relatorio.push("- **Hidratação Venosa:** Regra de Holliday-Segar com **restrição hídrica a 70%** (Risco de SIADH na bronquiolite).");
        relatorio.push("  - Volume diário calculado: ~" + volRestrito.toFixed(0) + " mL/dia.");
        relatorio.push("  - Usar solução isotônica balanceada (ex: SF 0.9% ou SG5% + NaCl 20% com Na+ próximo a 140 mEq/L) para evitar hiponatremia hospitalar.");
    } else if (gravidade.classificacao === 'Moderada') {
        relatorio.push("- **Dieta:** Fracionada via oral ou sonda nasogástrica (SNG) se leve dificuldade na aceitação.");
    } else {
        relatorio.push("- **Dieta:** Aleitamento materno ou fórmula infantil em livre demanda, fracionando menor volume mais vezes se necessário.");
    }

    return relatorio.join('\n');
  }

  function avaliar(parametros) {
    var gravidade = avaliarGravidade(parametros);
    var conduta = gerarConduta(parametros, gravidade);

    return {
        parametros: parametros,
        gravidade: gravidade,
        conduta: conduta
    };
  }

  function formatarTextoTelegram(resultado) {
    var txt = "👶 *PEDIATRIA — BRONQUIOLITE VIRAL AGUDA*\n\n";
    txt += resultado.conduta + "\n";
    return txt;
  }

  function extrairParametrosTexto(texto) {
    var limpo = texto.toLowerCase();
    var p = {};
    
    // Idade
    var mesesMatch = limpo.match(/(\d+)\s*(mes|meses|m)/);
    if (mesesMatch) p.idadeMeses = parseInt(mesesMatch[1], 10);
    else p.idadeMeses = 6;

    // Peso
    var pesoMatch = limpo.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos)/);
    if (pesoMatch) p.pesoKg = parseFloat(pesoMatch[1].replace(',', '.'));
    else p.pesoKg = 8;

    // FR
    var frMatch = limpo.match(/fr\s*(\d+)/) || limpo.match(/(\d+)\s*irpm/);
    if (frMatch) p.fr = parseInt(frMatch[1], 10);
    else p.fr = 40;

    // SpO2
    var spo2Match = limpo.match(/spo2\s*(\d+)/) || limpo.match(/sat[^\d]*(\d+)/);
    if (spo2Match) p.spo2 = parseInt(spo2Match[1], 10);
    else p.spo2 = 96;

    // Sinais
    if (/(exaustao|exaustão|gemencia|cianose grave|apneia)/.test(limpo)) p.exaustao = true;
    if (/(tiragem severa|batimento|ban)/.test(limpo)) p.tiragem = 3;
    else if (/(tiragem moderada|intercostal)/.test(limpo)) p.tiragem = 2;
    else if (/(tiragem leve|subcostal|esforço)/.test(limpo)) p.tiragem = 1;

    if (/(silencioso|mv inaudivel|sem mv)/.test(limpo)) p.sibilos = 3;
    else if (/(sibilo difuso|muito sibilo|sibilando muito)/.test(limpo)) p.sibilos = 2;
    else if (/(sibilo|sibilancia)/.test(limpo)) p.sibilos = 1;

    return p;
  }

  return {
    avaliarGravidade: avaliarGravidade,
    gerarConduta: gerarConduta,
    avaliar: avaliar,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = PediatriaBronquioliteService;
}
