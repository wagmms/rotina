/**
 * ==============================================================================
 * ULTRA ROTINA - MÓDULO DE UROLOGIA & NEFROLOGIA
 * ==============================================================================
 * Manejo de Cólica Nefrética Aguda e Litíase Urinária
 * Diretrizes SBU / EAU
 * 
 * Escopo:
 * - Algoritmo escalonado de analgesia de emergência
 * - Terapia Expulsiva Médica (MET)
 * - Checklist de gravidade e indicação cirúrgica urgente
 * ==============================================================================
 */

var UrologiaColicaNefreticaService = (function () {
  'use strict';

  function avaliarGravidade(dados) {
    var gravidade = false;
    var motivos = [];
    
    if (dados.rimUnico) { gravidade = true; motivos.push("Rim Único"); }
    if (dados.sepseOuInfeccao) { gravidade = true; motivos.push("Sepse / Infecção urinária associada à obstrução"); }
    if (dados.anuriaOuOliguria) { gravidade = true; motivos.push("Anúria ou oligúria severa (IRA pós-renal bilateral ou em rim único)"); }
    if (dados.dorRefrataria) { gravidade = true; motivos.push("Dor refratária persistente a analgesia opioide e AINE otimizada"); }
    if (dados.gestanteComComplicacao) { gravidade = true; motivos.push("Gestante com cólica refratária ou ameaça de trabalho de parto prematuro"); }

    var conduta_cirurgica = "";
    if (gravidade) {
        conduta_cirurgica = "🚨 **EMERGÊNCIA UROLÓGICA (DESCOMPRESSÃO IMEDIATA):** Indicação absoluta de descompressão urgente da via excretora com Cateter Duplo J ou Nefrostomia Percutânea. Acionar Urologia IMEDIATAMENTE.";
    } else {
        conduta_cirurgica = "✅ **SEM CRITÉRIOS DE URGÊNCIA CIRÚRGICA:** Manejo clínico inicial. Alta após analgesia com seguimento ambulatorial pela Urologia.";
    }

    return { 
        urgencia: gravidade, 
        motivos: motivos, 
        conduta: conduta_cirurgica 
    };
  }

  function avaliarAnalgesia(dados) {
    var relatorio = [];
    relatorio.push("💊 **ANALGESIA DE EMERGÊNCIA (Escalonada):**");
    
    if (dados.clcr < 30) {
        relatorio.push("⚠️ **ALERTA DE SEGURANÇA:** ClCr < 30 mL/min ou DRC dialítica. **AINEs SÃO CONTRAINDICADOS.**");
        relatorio.push("- **1ª Linha:** Dipirona 1g IV + Opioides de resgate imediato.");
        relatorio.push("- **Opioides:** Tramadol 50-100mg IV (infusão lenta em 100mL SF em 20 min) OU Morfina 2 a 5mg IV lento.");
        relatorio.push("- Evitar hidratação intravenosa vigorosa se anúria/oligúria ou risco de EAP.");
    } else if (dados.gestante) {
        relatorio.push("⚠️ **ALERTA GESTANTE:**");
        relatorio.push("- **AINEs são contraindicados** no 3º trimestre (fechamento precoce do ducto arterioso e oligoâmnio). Seu uso no 1º e 2º trimestre é discutível (evitar se possível).");
        relatorio.push("- **Escolha Segura:** Dipirona 1g IV e Tramadol/Morfina IV em doses baixas para controle da dor aguda.");
    } else {
        relatorio.push("- **1ª Linha (AINEs):** Padrão-ouro (SBU/EAU). Promovem analgesia ao reduzir a síntese de prostaglandinas, diminuindo o fluxo plasmático renal, a pressão intratubular e o edema ureteral local.");
        relatorio.push("  - **Cetoprofeno:** 100mg IV (diluído em 100mL SF 0.9%, correr em 20 min).");
        relatorio.push("  - **Ou Diclofenaco:** 75mg IM profundo (NÃO fazer IV pelo risco de flebite e choque).");
        relatorio.push("  - **Ou Tenoxicam:** 40mg IV lento.");
        relatorio.push("- **Adjuvante Base:** Dipirona 1g IV lento.");
        relatorio.push("- **2ª Linha (Resgate para Dor Refratária):** Tramadol 50-100mg IV ou Morfina 2 a 5mg IV.");
    }
    
    relatorio.push("- **Antiespasmódicos (ex: Escopolamina/Buscopan):** Uso isolado não tem superioridade aos AINEs na cólica nefrética verdadeira, e pode piorar taquicardia ou boca seca, porém pode ser associado para conforto visceral se espasmo intenso.");
    relatorio.push("- **Hidratação:** **NÃO faça hidratação vigorosa beira-leito.** Hiper-hidratação agrava a distensão da cápsula renal e piora a dor, não " + "''empurra''" + " a pedra.");

    return relatorio.join('\n');
  }

  function avaliarTerapiaExpulsiva(dados) {
    var relatorio = [];
    relatorio.push("🩺 **TERAPIA EXPULSIVA MÉDICA (MET):**");
    
    var t = dados.tamanhoCalculo;
    var loc = (dados.localizacao || '').toLowerCase();
    var distais_valida = loc.includes('distal') || loc.includes('juv') || loc === ''; // se vazio, assume chance

    if (t === 0 || isNaN(t)) {
        relatorio.push("- Indicação padronizada para cálculos de **ureter distal entre 5 e 10 mm**.");
        relatorio.push("- **Droga de Escolha:** Tansulosina 0.4mg VO, 1x/dia, por até 4 semanas.");
        relatorio.push("- *Atenção:* Risco de hipotensão postural. Pode ser associado a corticoide oral por 5-7 dias (ex: Deflazacorte 30mg) para potencializar o efeito anti-inflamatório local.");
    } else if (t >= 5 && t <= 10 && distais_valida) {
        relatorio.push("- **Indicação Confirmada:** Cálculo ureteral de " + t + " mm.");
        relatorio.push("- **Prescrição:** Tansulosina 0.4mg VO, 1x ao dia (preferencialmente após uma refeição). Duração de até 4 semanas.");
        relatorio.push("- Corticoterapia adjuvante curta (ex: Deflazacorte 30mg VO/dia por 5 a 7 dias) pode reduzir o edema pericalculoso e facilitar a expulsão.");
    } else if (t > 10) {
        relatorio.push("- **CONTRAINDICADA:** Cálculo > 10 mm (" + t + " mm). A probabilidade de eliminação espontânea é ínfima.");
        relatorio.push("- Indicado tratamento urológico ativo (Ureterolitotripsia Endoscópica a Laser ou LECO).");
    } else if (t < 5) {
        relatorio.push("- **USO OPCIONAL/DISCUTÍVEL:** Cálculos < 5 mm (" + t + " mm) têm alta taxa de eliminação espontânea (> 80-90%).");
        relatorio.push("- A Tansulosina tem benefício marginal neste grupo, mas pode ser prescrita para alívio de sintomas miccionais irritativos.");
    } else {
        relatorio.push("- A Tansulosina 0.4mg é mais eficaz em cálculos de ureter distal (5 a 10 mm). Localizações altas (ureter proximal/pelve) têm menor taxa de sucesso com MET.");
    }
    
    return relatorio.join('\n');
  }

  function avaliar(parametros) {
    var clcr = typeof parametros.clcr === 'number' ? parametros.clcr : 100;
    var tamanho = typeof parametros.tamanhoCalculo === 'number' ? parametros.tamanhoCalculo : 0;
    var loc = parametros.localizacao || '';
    
    var gravidade = avaliarGravidade({
        rimUnico: !!parametros.rimUnico,
        sepseOuInfeccao: !!parametros.sepseOuInfeccao,
        anuriaOuOliguria: !!parametros.anuriaOuOliguria,
        dorRefrataria: !!parametros.dorRefrataria,
        gestanteComComplicacao: !!parametros.gestante && !!parametros.dorRefrataria
    });

    var analgesia = avaliarAnalgesia({
        clcr: clcr,
        gestante: !!parametros.gestante
    });

    var met = avaliarTerapiaExpulsiva({
        tamanhoCalculo: tamanho,
        localizacao: loc
    });

    return {
        parametros: parametros,
        gravidade: gravidade,
        analgesia: analgesia,
        met: met
    };
  }

  function formatarTextoTelegram(resultado) {
    var txt = "🪨 *UROLOGIA & NEFROLOGIA — CÓLICA NEFRÉTICA E LITÍASE*\n\n";
    
    txt += resultado.gravidade.conduta + "\n";
    if (resultado.gravidade.motivos.length > 0) {
        txt += "📌 *Critérios de Gravidade Identificados:*\n";
        for (var i = 0; i < resultado.gravidade.motivos.length; i++) {
            txt += "- " + resultado.gravidade.motivos[i] + "\n";
        }
    }
    txt += "\n";
    
    txt += resultado.analgesia + "\n\n";
    txt += resultado.met + "\n";

    return txt;
  }

  function extrairParametrosTexto(texto) {
    var limpo = texto.toLowerCase();
    var p = {};
    
    // Extrair tamanho do calculo em mm
    var mmMatch = limpo.match(/(\d+(?:[.,]\d+)?)\s*(mm|milimetros|milímetros)/);
    if (mmMatch) {
        p.tamanhoCalculo = parseFloat(mmMatch[1].replace(',', '.'));
    }

    // Extrair clearance
    var clcrMatch = limpo.match(/clcr[\s:=]*(\d+)/) || limpo.match(/clearance[\s:=]*(\d+)/);
    if (clcrMatch) {
        p.clcr = parseInt(clcrMatch[1], 10);
    } else if (/(dialise|diálise|drc v|drc 5|falencia renal)/.test(limpo)) {
        p.clcr = 10;
    } else {
        p.clcr = 100;
    }

    // Localizacao
    if (/(distal|juv|juncao ureterovesical|junção)/.test(limpo)) {
        p.localizacao = 'distal';
    } else if (/(proximal|pelve|medio|médio)/.test(limpo)) {
        p.localizacao = 'proximal';
    } else {
        p.localizacao = '';
    }

    // Gravidade
    p.rimUnico = /(rim unico|rim único|monoreno|nefrectomizado)/.test(limpo);
    p.sepseOuInfeccao = /(sepse|infeccao|infecção|itu|febre|piuria|calafrio)/.test(limpo);
    p.anuriaOuOliguria = /(anuria|anúria|oliguria|oligúria|sem urinar|urina escassa)/.test(limpo);
    p.dorRefrataria = /(dor refrataria|refratário|refratario|nao melhora com morfina|opioide)/.test(limpo);
    p.gestante = /(gestante|gravida|grávida|prenhez)/.test(limpo);

    return p;
  }

  return {
    avaliarGravidade: avaliarGravidade,
    avaliarAnalgesia: avaliarAnalgesia,
    avaliarTerapiaExpulsiva: avaliarTerapiaExpulsiva,
    avaliar: avaliar,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = UrologiaColicaNefreticaService;
}
