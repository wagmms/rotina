class OncologiaBasicaService {
  /**
   * Avalia as indicações de rastreamento oncológico (INCA 2026) baseadas no perfil do paciente.
   * @param {Object} perfil 
   * @param {number} perfil.idade
   * @param {string} perfil.sexo - 'F' ou 'M'
   * @param {number} [perfil.carga_tabagica=0] - anos-maço
   * @param {number} [perfil.anos_abstinecia_fumo=0]
   * @param {boolean} [perfil.alto_risco_mama=false]
   * @param {boolean} [perfil.alto_risco_colon=false]
   * @param {boolean} [perfil.raca_negra=false]
   * @param {boolean} [perfil.alto_risco_prostata=false]
   * @returns {Object} Recomendações de rastreio
   */
  static avaliarRastreamento(perfil) {
    const recomendacoes = {};

    // 1. Câncer de Mama (Apenas para sexo feminino)
    if (perfil.sexo === 'F') {
      if (perfil.alto_risco_mama) {
        recomendacoes.mama = {
          indicado: true,
          conduta: "Mamografia anual recomendada a partir dos 35-40 anos devido ao alto risco (ex: parente de 1º grau com CA de mama < 50 anos).",
          aviso: "Considerar avaliação genética (BRCA1/2) e RM de mamas."
        };
      } else if (perfil.idade >= 50 && perfil.idade <= 69) {
        recomendacoes.mama = {
          indicado: true,
          conduta: "Mamografia de rastreamento a cada 2 anos (INCA).",
          aviso: "Exame Clínico das Mamas (ECM) anual é recomendado."
        };
      } else {
        recomendacoes.mama = {
          indicado: false,
          conduta: "Rastreamento mamográfico sistemático não indicado nesta faixa etária para risco habitual.",
          aviso: "Orientar autoconhecimento das mamas e buscar UBS se notar alterações."
        };
      }
    }

    // 2. Câncer de Cólon e Reto
    if (perfil.alto_risco_colon) {
      const inicio = Math.max(40, perfil.idade); // simplificacao, o ideal seria 10a antes do familiar
      recomendacoes.colon = {
        indicado: true,
        conduta: "Colonoscopia recomendada a partir dos 40 anos ou 10 anos antes do familiar mais jovem com CA colorretal.",
        aviso: "Repetir conforme achados (a cada 3-5 anos se pólipos, ou 5-10 anos se normal)."
      };
    } else if (perfil.idade >= 50 && perfil.idade <= 75) {
      recomendacoes.colon = {
        indicado: true,
        conduta: "Pesquisa de Sangue Oculto nas Fezes (FIT) anual OU Colonoscopia a cada 10 anos.",
        aviso: "Se FIT positivo, a colonoscopia é obrigatória para investigação."
      };
    } else {
      recomendacoes.colon = {
        indicado: false,
        conduta: "Rastreamento não indicado de rotina para esta faixa etária em risco habitual.",
        aviso: ""
      };
    }

    // 3. Câncer de Próstata (Apenas para sexo masculino)
    if (perfil.sexo === 'M') {
      if (perfil.idade >= 50 || (perfil.idade >= 45 && (perfil.raca_negra || perfil.alto_risco_prostata))) {
        recomendacoes.prostata = {
          indicado: true,
          conduta: "Decisão compartilhada: O INCA não recomenda rastreio populacional, mas a SBU recomenda discutir os riscos/benefícios do toque retal + PSA a partir dos 50 anos (45a se negro ou HF positiva).",
          aviso: "Alertar paciente sobre riscos de sobrediagnóstico e falsos-positivos."
        };
      } else {
        recomendacoes.prostata = {
          indicado: false,
          conduta: "Não há indicação de rastreio para esta idade.",
          aviso: ""
        };
      }
    }

    // 4. Câncer de Pulmão
    const tabagista_ativo = perfil.carga_tabagica > 0 && perfil.anos_abstinecia_fumo === 0;
    const ex_tabagista_recente = perfil.carga_tabagica > 0 && perfil.anos_abstinecia_fumo > 0 && perfil.anos_abstinecia_fumo <= 15;
    
    if (perfil.idade >= 50 && perfil.idade <= 80 && perfil.carga_tabagica >= 20 && (tabagista_ativo || ex_tabagista_recente)) {
      recomendacoes.pulmao = {
        indicado: true,
        conduta: "Tomografia Computadorizada de Tórax de Baixa Dose (LDCT) anual.",
        aviso: "Estimular fortemente a cessação do tabagismo como medida principal de prevenção."
      };
    } else {
      recomendacoes.pulmao = {
        indicado: false,
        conduta: "Critérios para rastreamento com LDCT não preenchidos.",
        aviso: "Prevenção primária: não fumar."
      };
    }

    return recomendacoes;
  }

  /**
   * Fornece conduta baseada na classificação BI-RADS mamográfica ou ultrassonográfica.
   * @param {string|number} birads - Classe BI-RADS (0 a 6)
   * @returns {Object} Conduta recomendada
   */
  static condutaBiRads(birads) {
    const classificacoes = {
      "0": {
        categoria: "Incompleta",
        risco_malignidade: "N/A",
        conduta: "Exames de imagem adicionais necessários (ex: incidências extras, compressão focal, magnificação, ou ultrassonografia) e/ou comparação com exames anteriores."
      },
      "1": {
        categoria: "Negativa",
        risco_malignidade: "0%",
        conduta: "Rotina de rastreamento conforme faixa etária e risco."
      },
      "2": {
        categoria: "Achados benignos",
        risco_malignidade: "0%",
        conduta: "Rotina de rastreamento conforme faixa etária e risco. (Ex: cistos simples, linfonodos intramamários, calcificações vasculares/grosseiras)."
      },
      "3": {
        categoria: "Provavelmente benigna",
        risco_malignidade: "< 2%",
        conduta: "Controle em intervalo curto (geralmente em 6 meses, depois a cada ano por 2 a 3 anos). Se estabilidade, reclassificar para BI-RADS 2."
      },
      "4": {
        categoria: "Suspeita de malignidade (A/B/C)",
        risco_malignidade: "2% a 95%",
        conduta: "Biópsia tecidual recomendada (Core biopsy ou Mamotomia). Avaliação com Mastologista indicada."
      },
      "5": {
        categoria: "Altamente suspeita de malignidade",
        risco_malignidade: ">= 95%",
        conduta: "Biópsia tecidual imediata mandatória e encaminhamento urgente para Mastologia/Oncologia."
      },
      "6": {
        categoria: "Malignidade comprovada (Biópsia prévia)",
        risco_malignidade: "100%",
        conduta: "Tratamento cirúrgico e/ou oncológico apropriado (Quimioterapia neoadjuvante, cirurgia, radioterapia)."
      }
    };

    // Extrair o número principal caso seja 4A, 4B, etc.
    const grau = String(birads).toUpperCase().replace(/[^0-6]/g, '')[0];
    
    if (!grau || !classificacoes[grau]) {
      throw new Error("Classificação BI-RADS inválida. Informe um valor de 0 a 6.");
    }

    return classificacoes[grau];
  }

  /**
   * Fornece recomendações para manejo de efeitos adversos oncológicos na Atenção Primária.
   * @param {string} efeito - 'neutropenia_febril', 'mucosite', 'dor_oncologica'
   * @param {Object} [parametros]
   * @returns {Object}
   */
  static manejoEfeitoAdverso(efeito, parametros = {}) {
    if (efeito === 'neutropenia_febril') {
      const mascc = parametros.mascc !== undefined ? parametros.mascc : null;
      return {
        condicao: "Neutropenia Febril",
        definicao: "Temperatura >= 38.3°C ou >= 38.0°C por 1h COM neutrófilos < 500/mm³ (ou expectativa de queda).",
        conduta_aps: "Emergência oncológica. Na APS, a prioridade é o reconhecimento e referenciamento rápido.",
        detalhes: mascc >= 21 
          ? "Risco BAIXO (MASCC >= 21): Considerar ATB oral ambulatorial (Amoxicilina-Clavulanato + Ciprofloxacino) e observação estrita 24h SE paciente estável, sem foco aparente e com acesso rápido a hospital. Na dúvida, transferir ao PS."
          : "Risco ALTO (MASCC < 21 ou desconhecido): Transferência IMEDIATA para Pronto-Socorro para início precoce de Cefepime/Tazocin IV e estabilização.",
        alerta: "Não postergar a primeira dose de antibiótico. Se transporte demorado, aplicar Ceftriaxona IV/IM na UBS (conforme protocolo local) antes da transferência."
      };
    }
    
    if (efeito === 'mucosite') {
      return {
        condicao: "Mucosite Oral",
        conduta_aps: "Suporte sintomático e prevenção de infecção secundária.",
        degraus: [
          "Grau 1-2 (Eritema/Úlceras com capacidade de comer): Higiene oral rigorosa, escova macia, bochechos com Clorexidina 0.12% s/ álcool ou solução salina/bicarbonato.",
          "Analgesia local: Bochecho com Lidocaína viscosa 2% antes das refeições (cuidado com risco de aspiração).",
          "Laserterapia (LLLT) preventiva ou curativa, se disponível.",
          "Candidíase secundária frequente: Se placas esbranquiçadas, Nistatina bochecho 100.000 UI 4x/dia ou Fluconazol VO.",
          "Grau 3-4 (Incapacidade de comer/beber líquidos): Internação para suporte nutricional e analgesia sistêmica (opioides endovenosos)."
        ]
      };
    }

    if (efeito === 'dor_oncologica') {
      const eva = parametros.eva !== undefined ? parametros.eva : 0;
      let conduta = "";
      
      if (eva >= 1 && eva <= 3) {
        conduta = "Degrau 1 (Dor Leve - EVA 1-3): Analgésicos não opioides (Dipirona 1g 6/6h ou Paracetamol 750mg 6/6h) ± AINEs (curto prazo, evitar se plaquetopenia ou alteração renal) ± Adjuvantes.";
      } else if (eva >= 4 && eva <= 6) {
        conduta = "Degrau 2 (Dor Moderada - EVA 4-6): Opioides fracos (Tramadol 50-100mg 6/6h ou Codeína 30-60mg 6/6h) + Analgésicos não opioides do Degrau 1 ± Adjuvantes.";
      } else if (eva >= 7) {
        conduta = "Degrau 3 (Dor Intensa - EVA 7-10): Opioides fortes (Morfina rápida 5-10mg VO 4/4h para resgate, Metadona, Oxicodona, Fentanil TD) + Analgésicos não opioides ± Adjuvantes. Evitar opioides fracos neste degrau.";
      } else {
        conduta = "Avaliar dor (EVA 0-10) e aplicar Escada Analgésica da OMS.";
      }

      return {
        condicao: "Dor Oncológica (Escada da OMS)",
        conduta_aps: conduta,
        adjuvantes: "Considerar adjuvantes em qualquer degrau: Dexametasona (compressão nervosa/óssea), Gabapentina/Pregabalina ou Amitriptilina (dor neuropática), Bisfosfonatos (dor óssea)."
      };
    }

    throw new Error("Efeito adverso não reconhecido. Use 'neutropenia_febril', 'mucosite' ou 'dor_oncologica'.");
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OncologiaBasicaService };
}
