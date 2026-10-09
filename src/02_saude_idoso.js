/**
 * Módulo de Saúde do Idoso e Avaliação Geriátrica Ampla (AGA)
 * Implementa triagem de fragilidade (CFS), avaliação cognitiva (Mini-Cog),
 * risco de quedas (TUG) e prevenção de polifarmácia/iatrogenia (Critérios de Beers AGS 2023).
 */

class SaudeIdosoService {
  /**
   * Avalia a fragilidade clínica pela Clinical Frailty Scale (CFS) - Rockwood
   * @param {number} score 1 a 9
   * @returns {object}
   */
  static avaliarFragilidadeCFS(score) {
    if (typeof score !== 'number' || score < 1 || score > 9) {
      throw new Error("O score da CFS deve estar entre 1 e 9.");
    }

    const classificacoes = {
      1: { titulo: "Muito Robusto", desc: "Pessoas ativas, enérgicas e motivadas. Exercitam-se regularmente e são as mais aptas para a idade." },
      2: { titulo: "Robusto", desc: "Sem doença ativa no momento. Exercitam-se ocasionalmente, muito ativos sazonalmente." },
      3: { titulo: "Bem", desc: "Pessoas com problemas médicos bem controlados. Não são regularmente ativas além da caminhada rotineira." },
      4: { titulo: "Vulnerável", desc: "Embora não dependam de outros para as AVDs, sintomas de doenças limitam as atividades. Queixam-se de estar mais lentos ou cansados." },
      5: { titulo: "Fragilidade Leve", desc: "Lentificação mais evidente. Precisam de ajuda em AIVDs (finanças, transporte, trabalho doméstico pesado, medicações)." },
      6: { titulo: "Fragilidade Moderada", desc: "Precisam de ajuda em todas as atividades externas e para cuidar da casa. Dentro de casa, têm dificuldade com escadas e precisam de ajuda para banho." },
      7: { titulo: "Fragilidade Grave", desc: "Completamente dependentes para cuidados pessoais (AVDs), por causa física ou cognitiva. Estáveis, com risco de morte em até 6 meses ausente." },
      8: { titulo: "Fragilidade Muito Grave", desc: "Completamente dependentes, acamados ou próximos a isso. Fim da vida, não se recuperam nem de doenças menores." },
      9: { titulo: "Doente Terminal", desc: "Expectativa de vida < 6 meses, não são por outro lado manifestamente frágeis." }
    };

    const resultado = classificacoes[score];
    let interpretacao = "";
    if (score <= 3) interpretacao = "Idoso Robusto. Manter medidas preventivas e rastreio adequado para a idade.";
    else if (score === 4) interpretacao = "Idoso Vulnerável. Oportunidade de intervenção precoce (exercício resistido, ajuste nutricional, revisão de medicamentos).";
    else interpretacao = "Idoso Frágil. Necessita de Avaliação Geriátrica Ampla (AGA), desprescrição, adequação de metas de cuidado (prioridade funcional e conforto) e suporte multidisciplinar.";

    return {
      escore: score,
      classificacao: resultado.titulo,
      descricao: resultado.desc,
      interpretacao,
      alerta_fragilidade: score >= 5
    };
  }

  /**
   * Avalia a cognição usando o Mini-Cog (Memória de 3 palavras + Teste do Desenho do Relógio)
   * @param {number} palavrasRecordadas 0 a 3
   * @param {boolean} relogioNormal true (2 pts) ou false (0 pts)
   * @returns {object}
   */
  static avaliarMiniCog(palavrasRecordadas, relogioNormal) {
    if (palavrasRecordadas < 0 || palavrasRecordadas > 3) {
      throw new Error("Palavras recordadas devem ser de 0 a 3.");
    }

    const pontosRelogio = relogioNormal ? 2 : 0;
    const escoreTotal = palavrasRecordadas + pontosRelogio;

    let rastreio_positivo = escoreTotal <= 2;
    let interpretacao = rastreio_positivo 
      ? "Rastreio cognitivo POSITIVO (escore <= 2). Alta probabilidade de comprometimento cognitivo. Indicação de aprofundar com MEEM/MoCA e investigar causas reversíveis (TSH, B12, sífilis, depressão, medicamentos)."
      : "Rastreio cognitivo NEGATIVO (escore >= 3). Baixa probabilidade de demência clinicamente significativa no momento.";

    return {
      palavras_recordadas: palavrasRecordadas,
      relogio_normal: relogioNormal,
      escore_total: escoreTotal,
      rastreio_positivo,
      interpretacao
    };
  }

  /**
   * Avalia risco de quedas pelo Timed Up and Go (TUG)
   * @param {number} tempoSegundos 
   * @returns {object}
   */
  static avaliarRiscoQuedasTUG(tempoSegundos) {
    let classificacao = "";
    let risco_alto = false;
    let conduta = "";

    if (tempoSegundos <= 10) {
      classificacao = "Normal";
      conduta = "Baixo risco de quedas. Manter atividade física.";
    } else if (tempoSegundos <= 20) {
      classificacao = "Risco Moderado / Limítrofe";
      conduta = "Risco moderado. Avaliar equilíbrio e marcha. Orientar exercícios de fortalecimento (ex: fisioterapia) e adaptar ambiente.";
      risco_alto = tempoSegundos > 12; // Alguns cortes usam > 12s como risco aumentado
    } else {
      classificacao = "Alto Risco de Quedas";
      risco_alto = true;
      conduta = "Alto risco de quedas. Necessidade imperativa de intervenção: reabilitação física intensiva, revisão de medicações (psicotrópicos), correção visual e adequação ambiental estrita.";
    }

    return {
      tempo_segundos: tempoSegundos,
      classificacao,
      risco_alto,
      conduta
    };
  }

  /**
   * Avalia polifarmácia e Critérios de Beers (AGS 2023) / STOPP
   * @param {Array<string>} listaMedicamentos
   * @returns {object}
   */
  static avaliarFarmacosBeers(listaMedicamentos) {
    const qtde = listaMedicamentos.length;
    const polifarmacia = qtde >= 5;
    
    // Lista de Beers simplificada (medicamentos frequentemente problemáticos em idosos)
    const beersRegex = {
      'Benzodiazepínicos (Diazepam, Clonazepam, Alprazolam)': /(diazepam|clonazepam|alprazolam|bromazepam|lorazepam|midazolam)/i,
      'Antidepressivos Tricíclicos (Amitriptilina, Nortriptilina)': /(amitriptilina|nortriptilina|clomipramina|imipramina)/i,
      'Hipnóticos / Drogas Z (Zolpidem)': /(zolpidem|zopiclona)/i,
      'Anti-histamínicos de 1ª Geração (Dexclorfeniramina, Prometazina)': /(dexclorfeniramina|prometazina|hidroxizina|difenidramina)/i,
      'Antipsicóticos Típicos (Haloperidol, Clorpromazina)': /(haloperidol|clorpromazina|levomepromazina)/i, // Exceto delírio grave
      'AINEs (Diclofenaco, Cetoprofeno, Ibuprofeno, Naproxeno)': /(diclofenaco|cetoprofeno|ibuprofeno|naproxeno|nimesulida|meloxicam|piroxicam)/i, // Risco de HDA, IRA, exacerbação de IC
      'Bloqueadores Alfa-1 (Doxazosina, Tansulosina)': /(doxazosina|terazosina|prazosina)/i, // Risco de hipotensão ortostática (Tansulosina tem menor risco, mas deve-se monitorar)
      'Sulfonilureias de longa ação (Glibenclamida)': /(glibenclamida|clorpropamida)/i, // Risco de hipoglicemia severa
      'Anti-espasmódicos (Escopolamina/Buscopan)': /(escopolamina|butilbrometo)/i, // Efeitos anticolinérgicos
      'Metoclopramida': /(metoclopramida|plasil)/i, // Parkinsonismo e discinesia tardia
      'Relaxantes musculares (Ciclobenzaprina, Carisoprodol)': /(ciclobenzaprina|carisoprodol|orfenadrina)/i,
      'Amiodarona': /(amiodarona|ancoron)/i, // Toxidades múltiplas, evitar como 1ª linha em FA
      'Inibidores da Bomba de Prótons > 8 semanas': /(omeprazol|pantoprazol|esomeprazol|lansoprazol)/i // Risco de deficiência de B12, osteoporose, C. diff (uso crônico sem indicação forte)
    };

    let medicamentosInadequados = [];
    
    listaMedicamentos.forEach(med => {
      let flagged = false;
      for (const [classe, regex] of Object.entries(beersRegex)) {
        if (regex.test(med) && !flagged) {
          medicamentosInadequados.push({
            medicamento: med,
            alerta: `Evitar (Critérios de Beers): Pertence ao grupo ${classe}.`
          });
          flagged = true; // Para evitar duplicatas pro mesmo med
        }
      }
    });

    let conduta = "";
    if (medicamentosInadequados.length > 0) {
      conduta = "Detectados medicamentos potencialmente inadequados (PIMs). Sugere-se desprescrição ou troca por alternativas mais seguras.";
    } else if (polifarmacia) {
      conduta = "Polifarmácia detectada. Realizar conciliação medicamentosa e avaliar necessidade contínua de cada fármaco.";
    } else {
      conduta = "Baixo risco farmacológico aparente. Manter revisão periódica.";
    }

    return {
      quantidade_medicamentos: qtde,
      polifarmacia,
      medicamentos_inadequados: medicamentosInadequados,
      alertas_beers: medicamentosInadequados.length > 0,
      conduta
    };
  }

  /**
   * Resumo completo da AGA Rápida
   * @param {object} dados 
   */
  static gerarResumoAga(dados) {
    const { cfs, miniCog, tug, farmacos } = dados;
    let resultado = {};

    if (cfs) resultado.fragilidade = this.avaliarFragilidadeCFS(cfs.score);
    if (miniCog) resultado.cognicao = this.avaliarMiniCog(miniCog.palavras, miniCog.relogioNormal);
    if (tug) resultado.risco_quedas = this.avaliarRiscoQuedasTUG(tug.tempo);
    if (farmacos) resultado.farmacologia = this.avaliarFarmacosBeers(farmacos.lista);

    return resultado;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SaudeIdosoService;
}
