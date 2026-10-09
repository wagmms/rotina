/**
 * ==============================================================================
 * MÓDULO 02: MANEJO DE VIA AÉREA DIFÍCIL E SEQUÊNCIA RÁPIDA DE INTUBAÇÃO (RSI)
 * ==============================================================================
 * Diretrizes Clínicas Oficiais:
 *  - ASA Difficult Airway Management Guidelines (American Society of Anesthesiologists 2022)
 *  - DAS Guidelines for Management of Unanticipated Difficult Intubation in Adults (2015)
 *  - Vortex Approach for Airway Emergencies
 *  - Recomendações da Sociedade Brasileira de Anestesiologia (SBA) e AMIB
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Predição de Via Aérea Difícil (LEMON Score e MOANS/ROMA):
 *     - Escore LEMON (Look, Evaluate 3-3-2, Mallampati, Obstruction, Neck mobility)
 *     - Escore MOANS para Ventilação sob Máscara Facial difícil
 *  2. Sequência Rápida de Intubação (RSI - 7 Ps):
 *     - Cálculo posológico determinístico de Hipnóticos (Etomidato, Cetamina, Propofol, Midazolam)
 *       e Bloqueadores Neuromusculares (Succinilcolina vs Rocurônio)
 *     - Bloqueio sentinela absoluto de Succinilcolina em contraindicações de hipercalemia e denervação
 *     - Alerta de Choque Peri-intubação (Índice de Choque >= 0.8) exigindo ressuscitação prévia
 *     - Dose de resgate com Sugamadex (16 mg/kg) para reversão imediata de Rocurônio
 *  3. Algoritmo Passo-a-Passo de Resgate e Cenário CICO (Cannot Intubate, Cannot Oxygenate):
 *     - Plano A (Laringoscopia/Videolaringoscopia/Bougie - máx 3 tentativas)
 *     - Plano B (Dispositivo Supraglótico de 2ª geração com canal gástrico - máx 2 tentativas)
 *     - Plano C (Máscara Facial a 2 operadores)
 *     - Cenário CICO: Acesso Frontal de Pescoço de Emergência (eFONA) com Cricotireoidostomia
 *       cirúrgica Scalpel-Bougie-Tube imediata (bisturi nº 10, bougie e tubo 6.0 com cuff)
 * ==============================================================================
 */

var ViaAereaDificilService = (function() {
  'use strict';

  /**
   * Avalia a dificuldade de intubação pela regra mnemônica LEMON.
   * @param {Object} params
   * @returns {Object}
   */
  function avaliarLemon(params) {
    params = params || {};
    var pontos = 0;
    var achados = [];

    // L - Look externally (Trauma facial, barba densa, retrognatismo, obesidade, pescoço curto/largo)
    var look = params.lookExterno || params.look || false;
    if (look) {
      pontos += 1;
      var descLook = typeof look === 'string' ? look : 'Características anatômicas externas desfavoráveis (ex: barba, retrognatismo, trauma, pescoço curto)';
      achados.push({ criterio: 'L (Look)', detalhe: descLook, pontos: 1 });
    }

    // E - Evaluate 3-3-2 rule
    // 3 dedos abertura bucal, 3 dedos distância tireomentoniana, 2 dedos distância hioide-tireóide
    var aberturaBocaMenor3 = params.aberturaBocaMenor3Dedos || params.aberturaBoca < 4;
    var tireomentonianaMenor3 = params.distanciaTireomentonianaMenor3Dedos || params.distanciaTireomentoniana < 6;
    var hioideTireoideMenor2 = params.distanciaHioideCartilagemMenor2Dedos || params.distanciaHioideCartilagem < 2;

    var falha332Count = 0;
    if (aberturaBocaMenor3) falha332Count++;
    if (tireomentonianaMenor3) falha332Count++;
    if (hioideTireoideMenor2) falha332Count++;

    if (falha332Count > 0) {
      pontos += falha332Count;
      achados.push({
        criterio: 'E (Evaluate 3-3-2)',
        detalhe: 'Comprometimento da regra 3-3-2 (' + falha332Count + ' item/itens alterados: ' +
          (aberturaBocaMenor3 ? '[Abertura de boca < 3 dedos / < 4 cm] ' : '') +
          (tireomentonianaMenor3 ? '[Distância tireomentoniana < 3 dedos / < 6 cm] ' : '') +
          (hioideTireoideMenor2 ? '[Distância hioide-tireóide < 2 dedos]' : '') + ')',
        pontos: falha332Count
      });
    }

    // M - Mallampati (Classe III e IV são preditores de intubação difícil)
    var mallampati = params.mallampati ? Number(params.mallampati) : null;
    if (mallampati === 3 || mallampati === 4) {
      pontos += 1;
      achados.push({ criterio: 'M (Mallampati)', detalhe: 'Mallampati Classe ' + mallampati + ' (palato mole pouco ou não visível)', pontos: 1 });
    }

    // O - Obstruction / Obesidade (Estridor, hematoma, abscesso periamigdaliano, IMC >= 30)
    var obstrucao = params.obstrucao || params.estridor || params.corpoEstranho || (params.imc && params.imc >= 30);
    if (obstrucao) {
      pontos += 1;
      achados.push({ criterio: 'O (Obstruction/Obesity)', detalhe: 'Presença de obstrução de via aérea alta, estridor ou obesidade (IMC >= 30)', pontos: 1 });
    }

    // N - Neck mobility (Restrição de extensão cervical, colar cervical de trauma, espondilite)
    var pescoco = params.mobilidadeCervicalReduzida || params.colarCervical || params.espondilite;
    if (pescoco) {
      pontos += 1;
      achados.push({ criterio: 'N (Neck mobility)', detalhe: 'Restrição da mobilidade cervical ou colar cervical rígido', pontos: 1 });
    }

    var classificacao = '';
    var risco = '';
    var recomendacoes = [];

    if (pontos <= 1) {
      classificacao = 'Baixo risco de via aérea difícil';
      risco = 'BAIXO';
      recomendacoes = [
        'Equipamento padrão de intubação checado (laringoscópio testado, lâmina adequada, tubo com guia e cuff testado).',
        'Aspiração rígida Yankauer ligada e funcionando beira-leito.',
        'Manter sempre disponível plano B caso ocorra falha imprevista.'
      ];
    } else if (pontos <= 3) {
      classificacao = 'Risco moderado de via aérea difícil';
      risco = 'MODERADO';
      recomendacoes = [
        'Videolaringoscópio testado e disponível imediatamente na sala.',
        'Utilizar Bougie (introdutor de Eschmann) de 1ª linha na laringoscopia.',
        'Separar dispositivo supraglótico de 2ª geração (máscara laríngea com canal gástrico) pronto para inserção.',
        'Garantir profissional com experiência em intubação presente ou acionado na sala.'
      ];
    } else {
      classificacao = 'Alto risco de via aérea difícil';
      risco = 'ALTO';
      recomendacoes = [
        'ALERTA CRÍTICO: Alta probabilidade de falha na laringoscopia direta.',
        'Videolaringoscópio mandatório como primeira escolha.',
        'Presença física obrigatória de médico sênior experiente / anestesiologista antes de qualquer indução.',
        'Se paciente cooperativo e sem hipoxemia extrema: avaliar indicação de Intubação Acordado com Fibrobroncoscópio.',
        'Separar e deixar aberto na sala kit de Cricotireoidostomia Cirúrgica (bisturi nº 10, bougie e tubo 6.0).',
        'Evitar múltiplas tentativas de laringoscopia direta (máximo 2 a 3 tentativas) para evitar edema/sangramento catastrófico.'
      ];
    }

    return {
      pontos: pontos,
      risco: risco,
      classificacao: classificacao,
      achados: achados,
      recomendacoes: recomendacoes
    };
  }

  /**
   * Avalia a dificuldade de ventilação sob máscara facial (Mnemônico MOANS).
   * @param {Object} params
   * @returns {Object}
   */
  function avaliarVentilacaoMascara(params) {
    params = params || {};
    var pontos = 0;
    var fatores = [];

    if (params.barbaDensa || params.traumaFacial || params.deformidadeFacial) {
      pontos += 1;
      fatores.push('M (Mask seal): Barba volumosa, sangue ou deformidade anatômica impedindo acoplamento da máscara');
    }
    if ((params.imc && params.imc >= 30) || params.obesidade || params.gestanteTerceiroTri || params.apneiaSono) {
      pontos += 1;
      fatores.push('O (Obesity/Obstruction): Obesidade (IMC >= 30), SAOS ou gestação avançada aumentando resistência');
    }
    if (params.idade && Number(params.idade) >= 55) {
      pontos += 1;
      fatores.push('A (Age >= 55): Idade avançada associada à perda de elasticidade e tônus tecidual');
    }
    if (params.edentulo) {
      pontos += 1;
      fatores.push('N (No teeth): Paciente edêntulo com colapso das bochechas dificultando a vedação');
    }
    if (params.asmaGrave || params.sdra || params.rigidezPulmonar || params.estridor) {
      pontos += 1;
      fatores.push('S (Stiffness): Complacência pulmonar reduzida ou resistência aumentada exigindo altas pressões');
    }

    var risco = 'BAIXO';
    var conduta = [];
    if (pontos >= 3) {
      risco = 'ALTO';
      conduta = [
        'Ventilação a duas mãos e dois operadores obrigatória (técnica two-hand C-E com 1 operador vedando e outro ventilando).',
        'Inserção precoce de Cânula Orofaríngea (Guedel) do tamanho correto (comissura labial ao ângulo da mandíbula).',
        'Utilizar válvula PEEP na bolsa-válvula-máscara.',
        'Se falha persistente na ventilação: transição imediata para Dispositivo Supraglótico de 2ª geração.'
      ];
    } else if (pontos === 2) {
      risco = 'MODERADO';
      conduta = [
        'Ter cânula de Guedel à mão imediatamente.',
        'Estar pronto para ventilação a 4 mãos se a SpO2 cair abaixo de 92%.',
        'Ajustar posicionamento cervical (posição olfativa ou elevação do coxim occipital).'
      ];
    } else {
      conduta = [
        'Ventilação habitual com bolsa-válvula-máscara monofacial.',
        'Manter boa vedação com técnica C-E.'
      ];
    }

    return {
      pontos: pontos,
      risco: risco,
      fatores: fatores,
      conduta: conduta
    };
  }

  /**
   * Calcula posologia e plano determinístico para Sequência Rápida de Intubação (RSI - 7 Ps).
   * @param {Object} params
   * @returns {Object}
   */
  function calcularRsi(params) {
    params = params || {};
    var pesoKg = Number(params.pesoKg) || 70;
    var condicaoClinica = (params.condicaoClinica || 'estavel').toLowerCase();
    var pas = params.pas !== undefined ? Number(params.pas) : null;
    var fc = params.fc !== undefined ? Number(params.fc) : null;
    var indiceChoque = (pas && fc && pas > 0) ? (fc / pas) : null;

    var alertasCriticos = [];

    // Alerta de Choque Peri-intubação
    var riscoColapsoHemodinamico = false;
    if ((pas !== null && pas < 90) || (indiceChoque !== null && indiceChoque >= 0.8)) {
      riscoColapsoHemodinamico = true;
      alertasCriticos.push(
        "ALERTA VERMELHO DE CHOQUE PERI-INTUBAÇÃO: Índice de Choque elevado (" +
        (indiceChoque ? indiceChoque.toFixed(2) : "PAS < 90") +
        "). Alto risco de PCR e colapso circulatório imediato após sedação/bloqueio! Ressuscitação hemodinâmica OBRIGATÓRIA ANTES DA INDUÇÃO: infundir cristaloide ou vasopressor push-dose (Noradrenalina 10-20 mcg IV ou Fenilefrina 50-100 mcg IV)."
      );
    }

    // Seleção e cálculo do Hipnótico
    var hipnotico = params.hipnoticoEscolhido ? params.hipnoticoEscolhido.toLowerCase() : null;
    if (!hipnotico) {
      if (riscoColapsoHemodinamico || condicaoClinica.indexOf('choque') >= 0 || condicaoClinica.indexOf('sepse') >= 0) {
        hipnotico = 'etomidato';
      } else if (condicaoClinica.indexOf('asma') >= 0 || condicaoClinica.indexOf('broncoespasmo') >= 0) {
        hipnotico = 'cetamina';
      } else if (condicaoClinica.indexOf('status') >= 0 || condicaoClinica.indexOf('convuls') >= 0) {
        hipnotico = 'propofol';
      } else {
        hipnotico = 'etomidato';
      }
    }

    var doseHipnotico = {};
    if (hipnotico === 'etomidato') {
      var mgEtom = +(pesoKg * 0.3).toFixed(1);
      var mlEtom = +(mgEtom / 2.0).toFixed(1); // 2 mg/mL
      doseHipnotico = {
        farmaco: 'Etomidato',
        doseMg: mgEtom,
        apresentacao: 'Ampola 20 mg/10 mL (2 mg/mL)',
        volumeMl: mlEtom,
        posologia: mgEtom + ' mg (' + mlEtom + ' mL) IV em bolus rápido',
        justificativa: 'Fármaco de excelência hemodinâmica, mantendo estabilidade de pressão arterial e perfusão coronariana.'
      };
    } else if (hipnotico === 'cetamina') {
      var mgCet = +(pesoKg * 2.0).toFixed(1);
      var mlCet = +(mgCet / 50.0).toFixed(1); // 50 mg/mL
      doseHipnotico = {
        farmaco: 'Cetamina',
        doseMg: mgCet,
        apresentacao: 'Frasco-ampola 500 mg/10 mL (50 mg/mL)',
        volumeMl: mlCet,
        posologia: mgCet + ' mg (' + mlCet + ' mL) IV em bolus rápido',
        justificativa: 'Potente broncodilatador e simpatomimético indireto, preservando drive e pressão arterial.'
      };
    } else if (hipnotico === 'propofol') {
      var doseKgProp = riscoColapsoHemodinamico ? 1.0 : 2.0;
      var mgProp = +(pesoKg * doseKgProp).toFixed(1);
      var mlProp = +(mgProp / 10.0).toFixed(1); // 10 mg/mL (1%)
      doseHipnotico = {
        farmaco: 'Propofol',
        doseMg: mgProp,
        apresentacao: 'Ampola 200 mg/20 mL (10 mg/mL a 1%)',
        volumeMl: mlProp,
        posologia: mgProp + ' mg (' + mlProp + ' mL) IV em bolus lento (cuidado com vasodilatação)',
        justificativa: 'Excelente sedativo e anticonvulsivante; requer vigilância rigorosa de hipotensão profunda.'
      };
      if (riscoColapsoHemodinamico) {
        alertasCriticos.push("AVISO: Propofol causa vasodilatação e inotropismo negativo marcados. Se paciente instável, preferir Etomidato ou Cetamina.");
      }
    } else if (hipnotico === 'midazolam') {
      var mgMid = +(pesoKg * 0.25).toFixed(1);
      var mlMid = +(mgMid / 5.0).toFixed(1); // 5 mg/mL
      doseHipnotico = {
        farmaco: 'Midazolam',
        doseMg: mgMid,
        apresentacao: 'Ampola 15 mg/3 mL (5 mg/mL)',
        volumeMl: mlMid,
        posologia: mgMid + ' mg (' + mlMid + ' mL) IV em bolus',
        justificativa: 'Alternativa quando Etomidato ou Cetamina indisponíveis; início de ação mais demorado (2 a 3 min).'
      };
    }

    // Seleção e cálculo do Bloqueador Neuromuscular (BNM)
    var contraindicacoesSuccinilcolina = params.contraindicacoesSuccinilcolina || {};
    var succinilcolinaContraindicada = false;
    var motivoBloqueioSuccinilcolina = [];

    if (contraindicacoesSuccinilcolina.hipercalemia || params.kSérico && params.kSérico > 5.5) {
      succinilcolinaContraindicada = true;
      motivoBloqueioSuccinilcolina.push("Hipercalemia confirmada ou fortemente suspeita (risco de fibrilação ventricular/assistolia fatal)");
    }
    if (contraindicacoesSuccinilcolina.queimaduraGrave || params.queimaduraMais24h) {
      succinilcolinaContraindicada = true;
      motivoBloqueioSuccinilcolina.push("Grande queimado após 24-48h de evolução (proliferação maciça de receptores nicotínicos extrajuncionais)");
    }
    if (contraindicacoesSuccinilcolina.esmagamento || params.rabdomioliseMais24h) {
      succinilcolinaContraindicada = true;
      motivoBloqueioSuccinilcolina.push("Lesão por esmagamento / Rabdomiólise com mais de 24h");
    }
    if (contraindicacoesSuccinilcolina.denervacao || params.avcMais72h || params.traumaMedularMais72h) {
      succinilcolinaContraindicada = true;
      motivoBloqueioSuccinilcolina.push("Denervação motora crônica, paraplegia ou AVC > 72 horas");
    }
    if (contraindicacoesSuccinilcolina.hipertermiaMaligna) {
      succinilcolinaContraindicada = true;
      motivoBloqueioSuccinilcolina.push("Histórico pessoal ou familiar confirmado de Hipertermia Maligna (gatilho farmacogenético fatal)");
    }

    var bnmEscolhido = params.bloqueadorEscolhido ? params.bloqueadorEscolhido.toLowerCase() : null;
    if (succinilcolinaContraindicada) {
      bnmEscolhido = 'rocuronio';
      alertasCriticos.push(
        "CONTRAINDICAÇÃO ABSOLUTA DA SUCCINILCOLINA DETECTADA: " + motivoBloqueioSuccinilcolina.join('; ') +
        ". Succinilcolina BLOQUEADA pelo sistema. Utilizar mandatoriamente Rocurônio na dose de RSI."
      );
    } else if (!bnmEscolhido) {
      bnmEscolhido = 'succinilcolina';
    }

    var doseBnm = {};
    if (bnmEscolhido === 'rocuronio') {
      var mgRoc = +(pesoKg * 1.2).toFixed(1); // Dose de RSI = 1.2 mg/kg
      var mlRoc = +(mgRoc / 10.0).toFixed(1); // 10 mg/mL
      var doseSugamadexResgate = +(pesoKg * 16.0).toFixed(1);
      doseBnm = {
        farmaco: 'Rocurônio',
        doseMg: mgRoc,
        apresentacao: 'Frasco-ampola 50 mg/5 mL (10 mg/mL)',
        volumeMl: mlRoc,
        posologia: mgRoc + ' mg (' + mlRoc + ' mL) IV em bolus imediato após o hipnótico',
        tempoInicio: '60 segundos',
        duracaoAcao: '40 a 60 minutos',
        antidotoResgate: 'Sugamadex 16 mg/kg (' + doseSugamadexResgate + ' mg IV em bolus) para reversão imediata de emergência se via aérea não for obtida.'
      };
    } else {
      var mgSucc = +(pesoKg * 1.5).toFixed(1); // 1.0 a 1.5 mg/kg
      var mlSucc = +(mgSucc / 10.0).toFixed(1); // 100 mg reconstituído em 10 mL (10 mg/mL)
      doseBnm = {
        farmaco: 'Succinilcolina',
        doseMg: mgSucc,
        apresentacao: 'Frasco-ampola 100 mg pó liofilizado (reconstituir com 10 mL de AD = 10 mg/mL)',
        volumeMl: mlSucc,
        posologia: mgSucc + ' mg (' + mlSucc + ' mL) IV em bolus imediato após o hipnótico',
        tempoInicio: '45 a 60 segundos',
        duracaoAcao: '6 a 10 minutos (bloqueador despolarizante de curta duração)',
        antidotoResgate: 'Não há antídoto específico direto. Aguardar metabolismo pela colinesterase plasmática sob ventilação de resgate.'
      };
    }

    // Estruturação dos 7 Ps da RSI
    var passosRsi = [
      {
        passo: '1. Preparação (P-10 min)',
        acoes: [
          'Checar laringoscópio testado com luz brilhante e videolaringoscópio na sala.',
          'Separar tubos orotraqueais (7.5 e 8.0 para homens; 7.0 e 7.5 para mulheres) com cuff testado e fio guia/Bougie lubrificado.',
          'Garantir aspiração rígida tipo Yankauer funcional e fixada na cabeceira.',
          'Acesso venoso calibroso (abocath 18 ou 16G) testado com fluxo livre.',
          'Monitorização contínua: Cardioscopia, SpO2, PNI a cada 2 min e Capnografia ligada.'
        ]
      },
      {
        passo: '2. Pré-oxigenação (P-5 min)',
        acoes: [
          'Ofertar O2 a 100% por 3 minutos com máscara com reservatório a 15 L/min (ou 8 respirações em capacidade vital).',
          'Evitar ventilação com pressão positiva com bolsa-válvula-máscara se SpO2 > 92% (prevenir distensão gástrica e regurgitação).',
          'Instalar oxigenação apneica contínua via cateter nasal a 15 L/min durante todo o procedimento.'
        ]
      },
      {
        passo: '3. Pré-tratamento / Otimização (P-3 min)',
        acoes: [
          riscoColapsoHemodinamico
            ? 'Ressuscitação hemodinâmica imediata: infundir bolus de cristaloide ou vasopressor push-dose (Noradrenalina 10-20 mcg).'
            : 'Otimização hemodinâmica e posicionamento adequado (sniffing position / rampa de elevação se obeso).',
          'Se hipertensão intracraniana ou dissecção: considerar Fentanil 2-3 mcg/kg 3 minutos antes da indução para atenuar descarga simpática.'
        ]
      },
      {
        passo: '4. Paralisia com Indução (P-0 min)',
        acoes: [
          'Injetar Hipnótico em bolus imediato: ' + doseHipnotico.posologia + '.',
          'Imediatamente após, injetar Bloqueador Neuromuscular: ' + doseBnm.posologia + '.',
          'Não ventilar com máscara durante o tempo de latência (45-60s) se SpO2 estável.'
        ]
      },
      {
        passo: '5. Posicionamento e Proteção (P+30 seg)',
        acoes: [
          'Aguardar relaxamento da musculatura mandibular (testar flacidez sem tocar na corda vocal).',
          'Posição olfativa estrita (flexão cervical inferior e extensão atlanto-occipital).',
          'Pressão cricoidea (Manobra de Sellick) NÃO é recomendada rotineiramente (pode piorar a visão laringoscópica).'
        ]
      },
      {
        passo: '6. Passagem do Tubo com Laringoscopia (P+45 a 60 seg)',
        acoes: [
          'Inserir lâmina pela comissura labial direita rebatendo a língua para a esquerda.',
          'Visualizar epiglote e cordas vocais; utilizar Bougie se Cormack-Lehane II ou III.',
          'Passar o tubo sob visão direta e avançar até o cuff ultrapassar as cordas vocais em 1 a 2 cm.',
          'Insuflar o cuff imediatamente com seringa (pressão alvo 20 a 30 cmH2O).'
        ]
      },
      {
        passo: '7. Pós-intubação (P+1 min)',
        acoes: [
          'Confirmar posicionamento com Capnografia de onda (padrão ouro confirmatório).',
          'Auscultar 5 pontos: epigástrio (silêncio gástrico), ápices e bases pulmonares (murmúrio vesicular simétrico).',
          'Fixar tubo na comissura labial (~21 a 23 cm no adulto ou 3x o diâmetro interno do tubo).',
          'Conectar à ventilação mecânica com parâmetros protetores (VC 6 mL/kg de peso predito).',
          'Iniciar sedoanalgesia contínua de manutenção imediatamente para evitar despertar em vigília sob paralisia residual.'
        ]
      }
    ];

    return {
      pesoKg: pesoKg,
      indiceChoque: indiceChoque ? +indiceChoque.toFixed(2) : null,
      riscoColapsoHemodinamico: riscoColapsoHemodinamico,
      doseHipnotico: doseHipnotico,
      doseBnm: doseBnm,
      passosRsi: passosRsi,
      alertasCriticos: alertasCriticos
    };
  }

  /**
   * Seleciona o tamanho determinístico de Máscara Laríngea / Dispositivo Supraglótico por peso.
   * @param {number} pesoKg
   * @returns {Object}
   */
  function selecionarDispositivoSupraglotico(pesoKg) {
    pesoKg = Number(pesoKg) || 70;
    var tamanho = 4;
    var volumeCuffMaxMl = 30;
    var tuboMaxMm = 6.0;

    if (pesoKg < 5) {
      tamanho = 1;
      volumeCuffMaxMl = 4;
      tuboMaxMm = 3.5;
    } else if (pesoKg < 10) {
      tamanho = 1.5;
      volumeCuffMaxMl = 7;
      tuboMaxMm = 4.0;
    } else if (pesoKg < 20) {
      tamanho = 2;
      volumeCuffMaxMl = 10;
      tuboMaxMm = 4.5;
    } else if (pesoKg < 30) {
      tamanho = 2.5;
      volumeCuffMaxMl = 14;
      tuboMaxMm = 5.0;
    } else if (pesoKg < 50) {
      tamanho = 3;
      volumeCuffMaxMl = 20;
      tuboMaxMm = 6.0;
    } else if (pesoKg <= 70) {
      tamanho = 4;
      volumeCuffMaxMl = 30;
      tuboMaxMm = 6.5;
    } else {
      tamanho = 5;
      volumeCuffMaxMl = 40;
      tuboMaxMm = 7.0;
    }

    return {
      tamanho: tamanho,
      tipoRecomendado: 'Máscara Laríngea de 2ª Geração (ex: i-gel, ProSeal, Supreme com canal de drenagem gástrica)',
      volumeCuffMaxMl: volumeCuffMaxMl,
      observacaoCuff: 'No caso do dispositivo i-gel, não há cuff inflável (gel elastomérico anatômico sem necessidade de ar).',
      calibreTuboIntubacaoViaMascara: tuboMaxMm + ' mm'
    };
  }

  /**
   * Algoritmo determinístico ASA / DAS / Vortex para manejo de Via Aérea Difícil e CICO.
   * @param {Object} params
   * @returns {Object}
   */
  function algoritmoAsaViaAerea(params) {
    params = params || {};
    var tentativasLaringoscopia = Number(params.tentativasLaringoscopia) || 0;
    var sucessoIntubacao = params.sucessoIntubacao === true;
    var oxigenaComMascara = params.oxigenaComMascara !== false; // Default true a menos que falhe
    var dispositivoSupragloticoTentado = params.dispositivoSupragloticoTentado === true;
    var sucessoSupraglotico = params.sucessoSupraglotico === true;
    var pesoKg = Number(params.pesoKg) || 70;
    var cormackLehane = params.cormackLehane ? Number(params.cormackLehane) : null;

    var statusAtual = '';
    var planoAtivo = '';
    var acoesImediatas = [];
    var alertaVermelhoCico = false;
    var protocoloCricotireoidostomia = null;

    if (sucessoIntubacao) {
      statusAtual = 'SUCESSO NA INTUBAÇÃO OROTRAQUEAL';
      planoAtivo = 'MANUTENÇÃO E PÓS-INTUBAÇÃO';
      acoesImediatas = [
        'Confirmar posicionamento com Capnografia de onda imediata.',
        'Auscultar epigástrio e campos pleuropulmonares bilateralmente.',
        'Fixar o tubo no lábio em ~21 a 23 cm (ou 3x diâmetro interno do tubo).',
        'Iniciar sedoanalgesia contínua de manutenção.',
        'Solicitar radiografia de tórax no leito para checagem da ponta do tubo em relação à carina (alvo 3 a 5 cm acima).'
      ];
    } else if (tentativasLaringoscopia < 3) {
      statusAtual = 'INTUBAÇÃO EM ANDAMENTO (TENTATIVA ' + (tentativasLaringoscopia + 1) + ' DE 3)';
      planoAtivo = 'PLANO A: OTIMIZAÇÃO DA LARINGOSCOPIA';
      acoesImediatas = [
        'Trocar para Videolaringoscópio com lâmina hiperangulada (D-Blade) se disponível.',
        'Utilizar Bougie (introdutor elástico de Eschmann) como guia obrigatório.',
        'Otimizar posicionamento da cabeça (sniffing position ou elevação em rampa).',
        'Realizar manipulação laríngea externa: manobra BURP (Backwards, Upwards, Rightwards Pressure).',
        'Manter oxigenação apneica com cateter nasal a 15 L/min.',
        'ATENÇÃO: Limitar estritamente a no máximo 3 tentativas no total (idealmente a 2ª tentativa realizada pelo operador mais experiente).'
      ];
      if (cormackLehane === 3 || cormackLehane === 4) {
        acoesImediatas.push('Visão laringoscópica desfavorável (Cormack-Lehane ' + cormackLehane + '): O uso de videolaringoscopia com lâmina curva/hiperangulada e bougie é mandatório.');
      }
    } else {
      // 3 ou mais tentativas falharam: Falha do Plano A
      if (oxigenaComMascara && !dispositivoSupragloticoTentado) {
        statusAtual = 'FALHA DE INTUBAÇÃO (VIA AÉREA DIFÍCIL CONFIRMADA) - PACIENTE OXIGENA';
        planoAtivo = 'PLANO B: DISPOSITIVO SUPRAGLÓTICO (MÁSCARA LARÍNGEA)';
        var mlInfo = selecionarDispositivoSupraglotico(pesoKg);
        acoesImediatas = [
          'PARAR novas tentativas de laringoscopia direta para evitar sangramento e edema obstrutivo.',
          'Declarar à equipe em voz alta: "VIA AÉREA DIFÍCIL CONFIRMADA". Chamar ajuda adicional experiente.',
          'Inserir Dispositivo Supraglótico de 2ª geração: ' + mlInfo.tipoRecomendado + ' - Tamanho ' + mlInfo.tamanho + '.',
          'Checar ventilação, expansão torácica e capnografia através da máscara laríngea (máximo de 2 tentativas de inserção).',
          'Se ventilação adequada: estabilizar o paciente, passar sonda gástrica pelo canal de drenagem e planejar intubação definitiva com broncoscópio flexível através do dispositivo ou acordar o paciente.'
        ];
      } else if (dispositivoSupragloticoTentado && sucessoSupraglotico) {
        statusAtual = 'RESGATE COM DISPOSITIVO SUPRAGLÓTICO BEM-SUCEDIDO';
        planoAtivo = 'VENTILAÇÃO DE RESGATE ESTABILIZADA';
        acoesImediatas = [
          'Manter paciente ventilando via Máscara Laríngea com fração inspirada de O2 a 100%.',
          'Passar sonda nasogástrica/orogástrica pelo canal de alívio da ML para descompressão estomacal.',
          'Decisão estratégica definitiva:',
          ' • Opção 1: Intubação orotraqueal guiada por fibrobroncoscópio através da máscara laríngea.',
          ' • Opção 2: Se cirurgia eletiva e paciente sem risco crítico de aspiração, reverter bloqueador e acordar o paciente.',
          ' • Opção 3: Conduzir para traqueostomia eletiva se via aérea definitiva for imperativa a longo prazo.'
        ];
      } else {
        // NÃO INTUBA E NÃO OXIGENA (CICO)
        alertaVermelhoCico = true;
        statusAtual = 'EMERGÊNCIA CRÍTICA: NÃO INTUBA, NÃO OXIGENA (CICO - CANNOT INTUBATE, CANNOT OXYGENATE)';
        planoAtivo = 'PLANO D / eFONA: ACESSO CIRÚRGICO FRONTAL NO PESCOÇO IMEDIATO';
        acoesImediatas = [
          '🚨 ANUNCIAR EM VOZ ALTA PARA TODA A SALA: "EMERGÊNCIA DE VIA AÉREA: NÃO INTUBA, NÃO OXIGENA! INICIANDO ACESSO CIRÚRGICO FRONTAL IMEDIATO!"',
          '🚨 CHAMAR AJUDA IMEDIATA: Acionar cirurgião e suporte de emergência.',
          '🚨 Se o bloqueador neuromuscular utilizado foi o Rocurônio: administrar SUGAMADEX 16 mg/kg IV EM BOLUS RÁPIDO IMEDIATAMENTE (não atrasar a cricotireoidostomia).',
          '🚨 Manter tentativas de oxigenação com máscara a 4 mãos e O2 a 100% enquanto o acesso cirúrgico é executado sem qualquer hesitação.'
        ];

        protocoloCricotireoidostomia = {
          nome: 'Cricotireoidostomia Cirúrgica de Emergência (Técnica Bisturi-Bougie-Tubo / Scalpel-Bougie-Tube)',
          materiais: [
            'Bisturi de lâmina nº 10 ou 11',
            'Bougie (introdutor elástico traqueal de Eschmann)',
            'Tubo orotraqueal com cuff tamanho 6.0 mm',
            'Seringa de 10 mL com ar',
            'Gaze e clorexidina alcoólica'
          ],
          passoAPasso: [
            '1. Extensão cervical máxima (se não houver lesão medular confirmada com risco extremo).',
            '2. Laringe em pinça: com a mão não dominante, palpar a cartilagem tireóide, deslizar o dedo caudalmente até a depressão da membrana cricotireóidea (entre as cartilagens tireóidea e cricóidea).',
            '3. Incisão transversal única e firme de 1.5 a 2.0 cm através da pele e da membrana cricotireóidea com o bisturi nº 10.',
            '4. Rotação do bisturi: girar a lâmina em 90 graus na horizontal com o corte apontando caudalmente (em direção aos pés) para abrir o espaço.',
            '5. Inserir o Bougie através da incisão para o interior da traqueia (sentir os cliques dos anéis traqueais e a parada na carina).',
            '6. Deslizar o Tubo 6.0 mm com cuff sobre o Bougie para dentro da traqueia até o cuff desaparecer.',
            '7. Retirar o Bougie mantendo o tubo firme.',
            '8. Insuflar o cuff imediatamente com 5 a 10 mL de ar.',
            '9. Conectar ao circuito ventilatório, confirmar expansão torácica e capnografia em onda, e fixar com cadarço.'
          ],
          contraindicacoesAvisos: [
            'NÃO tentar punção com agulha fina (Jelco 14) em adultos: tem alta taxa de falha, acotovelamento e não permite ventilação adequada.',
            'A técnica bisturi-bougie-tubo é a técnica padrão-ouro da DAS (Difficult Airway Society) para cricotireoidostomia de resgate em adultos.'
          ]
        };
      }
    }

    return {
      statusAtual: statusAtual,
      planoAtivo: planoAtivo,
      alertaVermelhoCico: alertaVermelhoCico,
      acoesImediatas: acoesImediatas,
      protocoloCricotireoidostomia: protocoloCricotireoidostomia
    };
  }

  /**
   * Formata relatório visual de via aérea para o Cockpit ou Telegram.
   * @param {Object} dados
   * @returns {string}
   */
  function formatarResumoViaAerea(dados) {
    dados = dados || {};
    var out = [];
    out.push("=== MANEJO DETERMINÍSTICO DE VIA AÉREA DIFÍCIL (ASA / DAS) ===");

    if (dados.lemon) {
      out.push("\n[PREDIÇÃO LEMON]: " + dados.lemon.classificacao + " (" + dados.lemon.pontos + " pontos)");
      if (dados.lemon.achados && dados.lemon.achados.length > 0) {
        dados.lemon.achados.forEach(function(a) {
          out.push(" • " + a.criterio + ": " + a.detalhe);
        });
      }
    }

    if (dados.rsi) {
      out.push("\n[SEQUÊNCIA RÁPIDA DE INTUBAÇÃO - RSI (7 Ps)]");
      if (dados.rsi.riscoColapsoHemodinamico) {
        out.push("⚠️ ALERTA: Alto risco de colapso circulatório! Ressuscitação hemodinâmica antes da indução.");
      }
      out.push(" • Hipnótico: " + dados.rsi.doseHipnotico.farmaco + " -> " + dados.rsi.doseHipnotico.posologia);
      out.push(" • Bloqueador: " + dados.rsi.doseBnm.farmaco + " -> " + dados.rsi.doseBnm.posologia);
      if (dados.rsi.doseBnm.antidotoResgate) {
        out.push(" • Antídoto/Resgate: " + dados.rsi.doseBnm.antidotoResgate);
      }
    }

    if (dados.algoritmo) {
      out.push("\n[ALGORITMO ASA / DAS]");
      out.push("Plano: " + dados.algoritmo.planoAtivo);
      out.push("Status: " + dados.algoritmo.statusAtual);
      if (dados.algoritmo.alertaVermelhoCico) {
        out.push("\n🚨 EMERGÊNCIA CICO ATIVADA: ACESSO CIRÚRGICO FRONTAL NO PESCOÇO IMEDIATO!");
      }
    }

    return out.join("\n");
  }

  return {
    avaliarLemon: avaliarLemon,
    avaliarVentilacaoMascara: avaliarVentilacaoMascara,
    calcularRsi: calcularRsi,
    selecionarDispositivoSupraglotico: selecionarDispositivoSupraglotico,
    algoritmoAsaViaAerea: algoritmoAsaViaAerea,
    formatarResumoViaAerea: formatarResumoViaAerea
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViaAereaDificilService;
}
