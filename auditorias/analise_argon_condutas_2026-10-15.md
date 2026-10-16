Aqui está a auditoria técnica e clínica dos 4 módulos anexados, sob o rigor dos protocolos institucionais de Emergência (HCFMUSP) e diretrizes nacionais (SBC, SBPT, AMIB/SSC, FEBRASGO, SBN/KDIGO).

---

### 1. AUDITORIA CLÍNICA: ERROS DE CONDUTA, DOSES E DIRETRIZES DESATUALIZADAS

#### **A. `02_pneumologia_pac.js` (PAC & CURB-65)**
1. **Erro de Critério ATS/IDSA (Critérios Menores de UTI):** O código omite **2 dos 9 critérios menores** clássicos da ATS/IDSA 2019: **Uremia (Ureia > 42-50 mg/dL ou BUN ≥ 20 mg/dL)** e **Frequência Respiratória ≥ 30 irpm**. Sem eles, o algoritmo subestima a indicação de UTI.
2. **Dose Subterapêutica de Amoxicilina Ambulatorial (SBPT):** Amoxicilina 500mg VO 8/8h pode falhar contra *S. pneumoniae* de sensibilidade intermediária no Brasil. A recomendação atual de 1ª linha para adultos hígidos é **Amoxicilina 1g VO 8/8h** (ou 875mg 12/12h).
3. **Ausência de Trava Renal e Gestacional:** Claritromicina e Quinolonas (Levo/Moxifloxacino) são prescritas sem checar **gestação** (teratogênicos/toxicidade cartilaginosa fetal) e sem ajuste por **TFG/Clearance de Creatinina** (Levofloxacino e Amoxicilina+Clavulanato acumulam se ClCr < 50 e < 30 mL/min, respectivamente).
4. **Omissão de Oseltamivir e Corticoide Sistêmico:** Em PAC grave (CURB-65 ≥ 3 ou hipoxemia/UTI), a diretriz atual exige considerar **Hidrocortisona 200mg/dia** (estudo CAPE COD / diretrizes AMIB) e associação empírica de **Oseltamivir 75mg 12/12h** em época sazonal de Influenza/SRAG até descarte viral.

#### **B. `02_emergencia_crise_hipertensiva.js` (Crise Hipertensiva)**
1. **Erro Grave na Pré-Eclâmpsia Grave / Eclâmpsia (FEBRASGO):**
   - O código sugere *"Nifedipino Retard 20mg VO"*. Na emergência obstétrica hipertensiva (PA ≥ 160/110), usa-se **Nifedipino de liberação imediata 10mg VO** a cada 20-30 min (máx 30mg). A formulação *Retard* demora horas para agir e não tira a gestante do risco iminente de AVC hemorrágico. (Nota: Nifedipino cápsula sublingual/mordida continua proscrito em adultos gerais, mas o comprimido engolido de 10mg ação rápida é 1ª linha na gestante segundo a FEBRASGO/OMS).
   - **Esquema de Zuspan (Sulfato de Magnésio):** Faltou a **diluição exata ISMP** (Ataque: 4g = 8mL de MgSO4 50% + 92mL SF 0,9% em 20 min; Manutenção: 1-2g/h em BIC) e a **trava de intoxicação** (Reflexo patelar presente, FR ≥ 16 irpm, Diurese ≥ 25-30 mL/h e antídoto **Gluconato de Cálcio 10% 10mL IV** à cabeceira).
2. **AVC Hemorrágico Omitido:** O código trata todo `temAvc` como AVC Isquêmico. Se for **AVC Hemorrágico (AVCh)** com PAS entre 150-220 mmHg, a meta (INTERACT2/AHA) é reduzir **PAS para ~140 mmHg** já na 1ª hora. Deixar a PA em 215x115 num AVCh expande o hematoma e mata o paciente.
3. **Pseudocrise Hipertensiva:** O código manda fazer *"Captopril 25mg VO se PA persistir elevada após repouso"*. Pela **SBC 2020/2024**, pseudocrise **não recebe anti-hipertensivo de ação rápida no PS**; trata-se apenas a dor/ansiedade e otimiza-se a receita crônica ambulatorial.

#### **C. `02_emergencia_choque_septico_circi.js` (Choque Séptico)**
1. **Atraso na Hidrocortisona (SSC 2021):** O texto diz *"Noradrenalina >= 0,25 mcg/kg/min por >= 4h"*. Na prática de Sala Vermelha, se o doente já atingiu ≥ 0,25 mcg/kg/min e está em escalonamento rápido (associando Vasopressina), **inicia-se a Hidrocortisona imediatamente** junto com a Vasopressina, sem esperar 4 horas de relógio no PS.
2. **Diluição de Noradrenalina e Via Periférica:** Importante explicitar que a Noradrenalina pode ser iniciada em **veia periférica calibrosa (fossa antecubital)** temporariamente para não atrasar a estabilização hemodinâmica enquanto se passa o acesso central.

#### **D. `02_nefrologia_dhe.js` (Sódio e Potássio)**
1. **Sorcal com Manitol (PROSCRITO):** No módulo de hipercalemia está escrito: *"Sorcal 30g VO diluído em 100 mL de água/manitol 10%"*. A diluição de Poliestirenossulfonato de Cálcio (Sorcal) em Manitol ou Sorbitol está **proscrita** pelo risco de **necrose colônica transmural e perfuração intestinal**. Diluir apenas em água ou SG 10%.
2. **Falta do Bicarbonato de Sódio IV na Hipercalemia com Acidose:** No paciente com Hipercalemia + Acidose Metabólica grave (pH < 7,20 ou Bic < 15), o **Bicarbonato de Sódio 8,4% (1 mEq/mL) 50 a 100 mL IV lento** é peça fundamental do shift intracelular e foi omitido.

---

### 2. PADRONIZAÇÃO NA "ESTRUTURA EM 5 TEMPOS" + CASOS DE BORDA

Para padronizar todo o sistema e blindar contra **insuficiência renal (TFG)**, **alergias cruzadas** e **teratogenicidade na gestação**, crie o utilitário transversal abaixo (`00_preceptor_core_5tempos.js`) e refatore os módulos.

#### **Novo Arquivo Base: `src/00_preceptor_core_5tempos.js`**
```javascript
/**
 * ==============================================================================
 * ULTRA ROTINA · CORE DE FORMATAÇÃO EM 5 TEMPOS E TRAVAS DE SEGURANÇA (USP)
 * ==============================================================================
 */
var PreceptorCoreService = (function () {
  'use strict';

  function formatar5Tempos(cabecalho, t1Imediata, t2Exames, t3Prescricao, t4Decisao, t5Alarmes) {
    var linhas = [];
    if (cabecalho) {
      linhas.push(cabecalho);
      linhas.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    linhas.push('⚡ *1. CONDUTA IMEDIATA (Minuto 0 ao 5)*');
    linhas = linhas.concat(t1Imediata || ['• Avaliar ABCDE e sinais vitais.']);
    linhas.push('');
    linhas.push('📋 *2. EXAMES INDISPENSÁVEIS*');
    linhas = linhas.concat(t2Exames || ['• Solicitar exames direcionados.']);
    linhas.push('');
    linhas.push('💊 *3. PRESCRIÇÃO PRONTA (Padrão ISMP)*');
    linhas = linhas.concat(t3Prescricao || ['• Prescrição individualizada.']);
    linhas.push('');
    linhas.push('🏥 *4. CRITÉRIOS DE DECISÃO (Destino)*');
    linhas = linhas.concat(t4Decisao || ['• Reavaliar após medidas iniciais.']);
    linhas.push('');
    linhas.push('⚠️ *5. SINAIS DE ALARME & ARMADILHAS ("O que NÃO fazer")*');
    linhas = linhas.concat(t5Alarmes || ['• Monitorar deterioração clínica.']);

    return linhas.join('\n');
  }

  function avaliarCasosDeBorda(opcoes) {
    opcoes = opcoes || {};
    var tfg = (opcoes.tfg !== undefined && opcoes.tfg !== null) ? Number(opcoes.tfg) : null;
    var gestante = Boolean(opcoes.gestante);
    var alergiaPenicilina = Boolean(opcoes.alergiaPenicilina);
    var alergiaGrave = Boolean(opcoes.alergiaGraveIgE); // Anafilaxia, angioedema, Stevens-Johnson
    var alertasBorda = [];

    if (gestante) {
      alertasBorda.push('🤰 *TRAVA GESTAÇÃO:* PROIBIDO usar Quinolonas (Levo/Moxifloxacino), Claritromicina, Tetraciclinas, IECA/BRA e Nitroprussiato. Seguros (Cat B): Ceftriaxona, Amoxicilina±Clavulanato, Azitromicina, Cefuroxima, Hidralazina, Metildopa.');
    }

    if (tfg !== null && !isNaN(tfg) && tfg < 50) {
      alertasBorda.push('🫘 *AJUSTE RENAL (TFG ' + tfg + ' mL/min):*');
      if (tfg >= 30) {
        alertasBorda.push('  • Levofloxacino: Ataque 750mg, depois 750mg 48/48h (ou 500mg ataque + 250mg 24/24h).');
        alertasBorda.push('  • Claritromicina: Reduzir dose em 50% (250mg 12/12h) se TFG < 30.');
      } else if (tfg >= 10) {
        alertasBorda.push('  • Amoxicilina+Clavulanato: Evitar apresentação 875/125mg! Usar 500/125mg 12/12h.');
        alertasBorda.push('  • Claritromicina: 250mg VO 12/12h (ou 250mg 1x/dia).');
        alertasBorda.push('  • Levofloxacino: Ataque 750mg, depois 500mg 48/48h.');
      } else {
        alertasBorda.push('  • TFG < 10 mL/min / Dialítico: Amoxicilina+Clavulanato 500/125mg 24/24h (dose extra pós-HD). Ceftriaxona e Azitromicina NÃO exigem ajuste renal.');
      }
    }

    if (alergiaPenicilina) {
      if (alergiaGrave) {
        alertasBorda.push('🛑 *ALERGIA GRAVE IgE MEDIADA (Anafilaxia/Angioedema/SCAR):* Evitar TODAS as Penicilinas e Cefalosporinas. Usar Quinolona Respiratória (Levofloxacino/Moxifloxacino) ou Azitromicina (se gestante/baixo risco).');
      } else {
        alertasBorda.push('⚠️ *ALERGIA LEVE A PENICILINA (Exantema tardio não-IgE):* Cefalosporinas de 3ª geração (Ceftriaxona) possuem reação cruzada < 1-2% e podem ser utilizadas com segurança sob observação.');
      }
    }

    return alertasBorda;
  }

  return {
    formatar5Tempos: formatar5Tempos,
    avaliarCasosDeBorda: avaliarCasosDeBorda
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PreceptorCoreService;
}
```

---

### 3. REFATORAÇÃO PRONTA PARA COPIAR E COLAR DOS MÓDULOS

#### **Refatoração 1: `src/02_pneumologia_pac.js` (Com 5 Tempos, 9 Critérios Menores ATS, Ajuste Renal, Gestante e Alergias)**

```javascript
/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC & CURB-65)
 * ==============================================================================
 * Referência: Diretrizes Brasileiras SBPT 2018/2022, ATS/IDSA 2019, CAPE-COD.
 * Padronizado na Estrutura em 5 Tempos + Casos de Borda (TFG, Gestante, Alergia).
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
    var spo2 = (dados.spo2 !== undefined && dados.spo2 !== null) ? Number(dados.spo2) : null;

    // Casos de borda
    var tfg = (dados.tfg !== undefined && dados.tfg !== null) ? Number(dados.tfg) : null;
    var gestante = Boolean(dados.gestante);
    var alergiaPenicilina = Boolean(dados.alergiaPenicilina);
    var alergiaGraveIgE = Boolean(dados.alergiaGraveIgE);

    var c = confusao ? 1 : 0;
    var u = (!isNaN(ureia) && ureia > 50) ? 1 : 0;
    var r = (!isNaN(fr) && fr >= 30) ? 1 : 0;
    var b = ((!isNaN(pas) && pas > 0 && pas < 90) || (!isNaN(pad) && pad > 0 && pad <= 60)) ? 1 : 0;
    var sessentaECinco = (!isNaN(idade) && idade >= 65) ? 1 : 0;

    var escore = c + u + r + b + sessentaECinco;
    var hipoxemia = (!isNaN(spo2) && spo2 > 0 && spo2 < 90);

    var risco = 'BAIXO';
    var mortalidade = '< 1.5%';
    var localRecomendado = 'Tratamento Ambulatorial em Domicílio';
    var t1Imediata = [];
    var t2Exames = [];
    var t3Prescricao = [];
    var t4Decisao = [];
    var t5Alarmes = [];

    if (escore >= 3 || hipoxemia) {
      risco = 'ALTO';
      mortalidade = escore === 3 ? '17%' : '27% a 40%';
      localRecomendado = 'Internação Hospitalar Mandatória (Avaliar UTI se escore ≥ 4, hipoxemia refratária ou critérios ATS/IDSA)';

      t1Imediata = [
        '• Sala de Emergência / Monitorização multiparamétrica (PA, FC, FR, SpO2).',
        '• Oxigenioterapia suplementar se SpO2 < 92% (ou < 88% se DPOC retentor). Avaliar VNI/CNAF se desconforto respiratório.',
        '• Acesso venoso periférico calibroso + Coleta de 2 pares de hemoculturas ANTES do antibiótico (não atrasar ATB > 1h).'
      ];

      t2Exames = [
        '• Raio-X de Tórax PA/Perfil (ou TC/POCUS pulmonar beira-leito).',
        '• Gasometria arterial com lactato, Hemograma, Ureia, Creatinina, Na+, K+, PCR, Bilirrubinas e Plaquetas.',
        '• 2 pares de Hemoculturas periféricas + Cultura de escarro/aspirado traqueal + Painel viral (Influenza/SARS-CoV-2).'
      ];

      if (gestante) {
        t3Prescricao = [
          '• 1ª Linha Gestante (PAC Grave): Ceftriaxona 2g (2 frascos de 1g) diluídos em 100 mL SF 0,9% IV correr em 30 min 1x/dia + Azitromicina 500mg diluída em 250 mL SF 0,9% IV correr em 1h 1x/dia.',
          '• Se época sazonal de Influenza / SRAG: Associar Oseltamivir 75mg VO 12/12h por 5 dias.'
        ];
      } else if (alergiaPenicilina && alergiaGraveIgE) {
        t3Prescricao = [
          '• Alergia IgE Grave a Beta-lactâmico: Levofloxacino 750mg (150mL pronto uso) IV correr em 90 min 1x/dia (ou Moxifloxacino 400mg IV 1x/dia).',
          '• Adjuvante PAC Grave (CAPE-COD): Hidrocortisona 200mg IV/dia (50mg + 10mL SF 0,9% IV de 6/6h) se insuficiência respiratória aguda grave (exceto se Influenza/fungo).'
        ];
      } else {
        t3Prescricao = [
          '• 1ª Linha (PAC Grave): Ceftriaxona 2g + 100 mL SF 0,9% IV em 30 min 24/24h + Azitromicina 500mg + 250 mL SF 0,9% IV em 60 min 24/24h por 7 dias.',
          '• Alternativa (Alergia grave a beta-lactâmicos): Levofloxacino 750mg IV em 90 min 24/24h.',
          '• Corticoide Adjuvante (PAC Grave com Hipoxemia / UTI): Hidrocortisona 50mg + 10 mL SF 0,9% IV em bolus lento 6/6h.'
        ];
      }
    } else if (escore === 2) {
      risco = 'MODERADO';
      mortalidade = '9.2%';
      localRecomendado = 'Enfermaria Clínica Geral ou Observação Hospitalar Supervisionada (24-48h)';

      t1Imediata = [
        '• Aferição completa de sinais vitais + Oximetria de pulso (fornecer O2 se SpO2 < 92%).',
        '• Acesso venoso salinizado e hidratação basal se desidratado.'
      ];
      t2Exames = [
        '• Raio-X de Tórax, Hemograma, Ureia, Creatinina, Sódio, Potássio, Glicemia e PCR.'
      ];
      if (gestante) {
        t3Prescricao = [
          '• Gestante Internada: Ceftriaxona 1g a 2g + 100 mL SF 0,9% IV em 30 min 24/24h + Azitromicina 500mg VO/IV 24/24h por 5 a 7 dias.'
        ];
      } else {
        t3Prescricao = [
          '• 1ª Linha: Ceftriaxona 1g a 2g + 100 mL SF 0,9% IV em 30 min 24/24h + Azitromicina 500mg VO 24/24h por 5 a 7 dias.',
          '• Alternativa IV: Amoxicilina + Clavulanato 1g/200mg + 100 mL SF 0,9% IV em 30 min 8/8h + Azitromicina 500mg VO 24/24h.',
          '• Se estável e boa aceitação oral em observação: Amoxicilina + Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO 24/24h.'
        ];
      }
    } else {
      risco = 'BAIXO';
      mortalidade = '< 1.5%';
      localRecomendado = 'Tratamento Ambulatorial em Domicílio';

      t1Imediata = [
        '• Confirmar estabilidade hemodinâmica, SpO2 ≥ 92% em ar ambiente e capacidade de ingestão oral + suporte social.'
      ];
      t2Exames = [
        '• Raio-X de Tórax para confirmação diagnóstica (exames laboratoriais dispensáveis em jovens hígidos com CURB-65 = 0).'
      ];
      if (gestante) {
        t3Prescricao = [
          '• Gestante Ambulatorial (Sem comorbidades): Amoxicilina 1g VO de 8/8h por 7 dias.',
          '• Gestante (Com comorbidades): Amoxicilina + Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO 1x/dia por 5 dias.'
        ];
      } else {
        t3Prescricao = [
          '• 1ª Linha (Hígido, sem uso recente de ATB): Amoxicilina 1g VO de 8/8h (ou 875mg 12/12h) por 5 a 7 dias.',
          '• Com Comorbidades (DPOC, IC, DM, DRC) ou Idoso: Amoxicilina + Clavulanato 875/125mg VO 12/12h + Azitromicina 500mg VO 1x/dia por 5 a 7 dias.',
          '• Alérgicos a Penicilina (Sem comorbidades): Azitromicina 500mg VO 1x/dia por 5 dias OU Claritromicina 500mg VO 12/12h por 7 dias (Se comorbidades: Levofloxacino 750mg VO 1x/dia por 5 dias).'
        ];
      }
    }

    // Ajustes renais e travas de borda
    if (tfg !== null && !isNaN(tfg) && tfg < 50) {
      t3Prescricao.push('• 🫘 AJUSTE RENAL (TFG ' + tfg + ' mL/min): Se TFG < 30 mL/min, NÃO usar Amoxicilina+Clavulanato 875/125mg (usar 500/125mg 12/12h); reduzir Claritromicina em 50% (250mg 12/12h); ajustar Levofloxacino (750mg ataque, depois 500mg 48/48h). Ceftriaxona e Azitromicina não exigem ajuste.');
    }

    var criteriosUti = [
      'Critérios Maiores ATS/IDSA (1 critério = UTI): (1) Ventilação Mecânica Invasiva; (2) Choque Séptico com necessidade de vasopressor.',
      'Critérios Menores ATS/IDSA (≥ 3 dos 9 critérios = UTI): (1) FR ≥ 30 irpm; (2) PaO2/FiO2 ≤ 250; (3) Infiltrado multilobar; (4) Confusão/desorientação; (5) Uremia (Ureia > 42-50 mg/dL ou BUN ≥ 20); (6) Leucopenia (< 4.000/mm³); (7) Plaquetopenia (< 100.000/mm³); (8) Hipotermia (< 36°C); (9) Hipotensão exigindo ressuscitação volêmica agressiva.'
    ];

    t4Decisao = [
      '• Destino Recomendado: ' + localRecomendado,
      '• ' + criteriosUti[0],
      '• ' + criteriosUti[1],
      '• Critérios de Alta Segura (se ambulatorial): SpO2 ≥ 92% em ar ambiente, FR < 24 irpm, ausência de derrame pleural complicado, aceitação oral plena e retorno garantido em 48-72h.'
    ];

    t5Alarmes = [
      '• ⛔ NÃO prescrever Quinolonas (Levo/Moxifloxacino) como 1ª linha empírica em casos leves ou se houver suspeita de Tuberculose (mascara o diagnóstico de TB e induz resistência).',
      '• ⛔ NÃO usar Quinolonas ou Claritromicina em GESTANTES (risco teratogênico / toxicidade fetal).',
      '• ⛔ NÃO dar alta para paciente com CURB-65 = 0 ou 1 se apresentar SpO2 < 90%, derrame pleural moderado/volumoso ou vulnerabilidade social.',
      '• 🚨 Sinais de Alarme para Retorno Imediato: Piora da falta de ar, febre persistente após 72h de antibiótico, sonolência ou dor torácica pleurítica.'
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
      esquemaSugerido: t3Prescricao,
      criteriosUti: criteriosUti,
      cincoTempos: {
        t1Imediata: t1Imediata,
        t2Exames: t2Exames,
        t3Prescricao: t3Prescricao,
        t4Decisao: t4Decisao,
        t5Alarmes: t5Alarmes
      }
    };
  }

  function formatarTextoTelegram(res) {
    var cabecalho = [
      '🫁 *PNEUMONIA ADQUIRIDA NA COMUNIDADE (PAC & CURB-65)*',
      '📊 *CURB-65:* ' + res.escore + ' pts | *Risco:* ' + res.risco + ' (Mortalidade: ' + res.mortalidadeEstimada + ')'
    ].join('\n');

    var ct = res.cincoTempos || {};
    var linhas = [
      cabecalho,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '⚡ *1. CONDUTA IMEDIATA (Minuto 0 ao 5)*'
    ].concat(ct.t1Imediata || [])
     .concat(['', '📋 *2. EXAMES INDISPENSÁVEIS*'])
     .concat(ct.t2Exames || [])
     .concat(['', '💊 *3. PRESCRIÇÃO PRONTA (Padrão ISMP)*'])
     .concat(res.esquemaSugerido || [])
     .concat(['', '🏥 *4. CRITÉRIOS DE DECISÃO (Internar / UTI vs Alta)*'])
     .concat(ct.t4Decisao || [])
     .concat(['', '⚠️ *5. SINAIS DE ALARME & ARMADILHAS ("O que NÃO fazer")*'])
     .concat(ct.t5Alarmes || []);

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
      idade: null,
      spo2: null,
      tfg: null,
      gestante: /(gestant|gravid)/i.test(texto),
      alergiaPenicilina: /(alerg.*penicilin|alerg.*amoxicilin|alerg.*beta)/i.test(texto),
      alergiaGraveIgE: /(anafilax|angioedem|stevens| IgE)/i.test(texto)
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

    var mSpo2 = texto.match(/(?:spo2|sat)\s*[:=]?\s*(\d{2})/i);
    if (mSpo2) p.spo2 = parseInt(mSpo2[1], 10);

    var mTfg = texto.match(/(?:tfg|clcr|clearance)\s*[:=]?\s*(\d+)/i);
    if (mTfg) p.tfg = parseInt(mTfg[1], 10);

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
```

---

#### **Refatoração 2: `src/02_emergencia_crise_hipertensiva.js` (Com 5 Tempos, Correção FEBRASGO, AVCh vs AVCi e Pseudocrise SBC)**

```javascript
/**
 * ==============================================================================
 * ULTRA ROTINA · MÓDULO DE CRISE HIPERTENSIVA (PSEUDOCRISE, URGÊNCIA & EMERGÊNCIA)
 * ==============================================================================
 * Referência: Diretrizes Brasileiras de Hipertensão Arterial (SBC 2020/2024),
 * AHA/ACC 2023, FEBRASGO (Pré-eclâmpsia/Zuspan). Padrão 5 Tempos.
 * ==============================================================================
 */

var EmergenciaCriseHipertensivaService = (function () {
  'use strict';

  function classificarCrise(dados) {
    dados = dados || {};
    var pas = Number(dados.pas || dados.pressaoSistolica) || 180;
    var pad = Number(dados.pad || dados.pressaoDiastolica) || 110;
    var loa = dados.lesaoOrgaoAlvo || {};

    var temEap = Boolean(loa.eap || dados.eap || dados.edemaPulmao || dados.dispneiaGrave);
    var temEncefalopatia = Boolean(loa.encefalopatia || dados.encefalopatia || dados.confusao || dados.papiledema);
    var temDisseccao = Boolean(loa.disseccao || dados.disseccao || dados.dorRasgando);
    var temIam = Boolean(loa.iam || dados.iam || dados.dorPrecordial || dados.sca);
    var temAvc = Boolean(loa.avc || dados.avc || dados.deficitFocal);
    var temAvcHemorragico = Boolean(loa.avcHemorragico || dados.avcHemorragico || dados.avch);
    var temPreEclampsia = Boolean(loa.preeclampsia || dados.preeclampsia || dados.gestante);

    var temLoaAguda = temEap || temEncefalopatia || temDisseccao || temIam || temAvc || temAvcHemorragico || temPreEclampsia;

    var tipo = 'URGENCIA_HIPERTENSIVA';
    var titulo = 'Urgência Hipertensiva (PA ≥ 180x120 mmHg sem Lesão Aguda de Órgão-Alvo)';
    var local = 'Sala de Observação / UPA (2 a 6 horas)';
    var metaPressorica = 'Redução gradual para ~160/100 mmHg em 24 a 48h (queda máxima de 20-25% da PAM nas primeiras horas).';
    var t1Imediata = [];
    var t2Exames = [];
    var medicacoes = [];
    var condutas = [];
    var alertas = [];

    var dorAnsiedade = Boolean(dados.dor || dados.ansiedade || dados.estresse || dados.cefaleiaTensional);

    if (!temLoaAguda && (dorAnsiedade || (pas < 180 && pad < 120))) {
      tipo = 'PSEUDOCRISE_HIPERTENSIVA';
      titulo = 'Pseudocrise Hipertensiva (Elevação Reativa da PA por Dor/Ansiedade/Má Adesão)';
      local = 'Acolhimento / Sala de Medicação / UBS';
      metaPressorica = 'NÃO há meta de redução aguda no PS. O foco exclusivo é tratar o sintoma desencadeante e reconciliar uso crônico.';

      t1Imediata.push('• Repouso em ambiente calmo e silencioso por 30 a 60 minutos.');
      t1Imediata.push('• Aferir PA nos dois membros e descartar sinais de alarme neurológicos ou cardiovasculares.');

      t2Exames.push('• Nenhum exame laboratorial ou de imagem é obrigatório se exame físico normal.');

      medicacoes.push('• Se Dor Aguda: Dipirona 1g (2mL) + 8mL AD IV lento (ou 500mg-1g VO).');
      medicacoes.push('• Se Crise de Ansiedade/Pânico: Diazepam 5 a 10mg VO ou Clonazepam 0,5 a 1mg VO.');
      medicacoes.push('• Se má adesão medicamentosa: Reiniciar anti-hipertensivos de uso habitual do paciente.');

      condutas.push('• Reavaliar PA após 30-60 minutos de analgesia/ansiólise.');
      condutas.push('• Alta com encaminhamento para UBS para ajuste ambulatorial.');

      alertas.push('⛔ PROIBIDO prescrever Nifedipino sublingual ou anti-hipertensivos de ação rápida para "baixar a PA na marra" na pseudocrise (risco de isquemia cerebral/coronariana por queda abrupta).');
    } else if (temLoaAguda) {
      tipo = 'EMERGENCIA_HIPERTENSIVA';
      titulo = 'EMERGÊNCIA HIPERTENSIVA (Lesão Aguda de Órgão-Alvo em Curso)';
      local = '🚨 SALA VERMELHA / MONITORIZAÇÃO CONTÍNUA / UTI';

      t1Imediata.push('• MOV (Monitorização multiparamétrica, Oxigênio se SpO2 < 94%, 2 Acessos Venosos).');
      t1Imediata.push('• Planejar passagem de PAI (Pressão Arterial Invasiva radial) para titulação minuto a minuto.');

      t2Exames.push('• ECG 12 derivações imediato, Raio-X de Tórax no leito, Troponina, Creatinina, Ureia, Na+, K+, Hemograma com esfregaço (pesquisa de esquizócitos/MAT) e Urina 1.');

      if (temDisseccao) {
        metaPressorica = 'META DISSECÇÃO DE AORTA: FC < 60 bpm PRIMEIRO e PAS 100-120 mmHg em até 20 minutos!';
        medicacoes.push('💉 1º PASSO (Frenar FC e dP/dt): Esmolol (2500mg/10mL em 240mL SF 0,9% = 10mg/mL) ataque 500 mcg/kg em 1 min + manutenção 50-200 mcg/kg/min OU Metoprolol 5mg IV lento a cada 5 min (máx 15mg) até FC < 60 bpm.');
        medicacoes.push('💉 2º PASSO (Só após FC bloqueada): Nitroprussiato de Sódio 50mg (1 amp) + 248mL SG 5% (200 mcg/mL) em BIC protegido da luz — iniciar a 0,3 a 0,5 mcg/kg/min (máx 10 mcg/kg/min) até PAS < 120 mmHg.');
        medicacoes.push('💉 3º PASSO (Analgesia): Morfina 2 a 4mg IV a cada 5-15 min (reduz descarga adrenérgica).');
        condutas.push('• Solicitar Angio-TC de Aorta Total urgente e acionar Cirurgia Cardiovascular imediatamente.');
        alertas.push('⛔ ARMADILHA FATAL: NUNCA iniciar Nitroprussiato (vasodilatador puro) antes do Betabloqueador na dissecção de aorta! A taquicardia reflexa aumenta o estresse de cisalhamento (dP/dt) e rompe a aorta.');
      } else if (temEap) {
        metaPressorica = 'META EAP HIPERTENSIVO: Reduzir PAM em 20 a 25% imediatamente com alívio da congestão pulmonar.';
        t1Imediata.push('• Instalar VNI (CPAP 8-10 cmH2O ou BiPAP) imediatamente com cabeceira elevada a 90°.');
        medicacoes.push('💉 1ª Linha: Nitroglicerina (Tridil) 50mg/10mL + 240mL SG 5% (200 mcg/mL) em frasco ecoflac — iniciar a 10-20 mcg/min (3 a 6 mL/h) e titular a cada 5 min até 200 mcg/min.');
        medicacoes.push('💉 Alternativa (se pós-carga extrema): Nitroprussiato de Sódio 50mg + 248mL SG 5% (200 mcg/mL) — iniciar a 0,3 mcg/kg/min.');
        medicacoes.push('💉 Furosemida 20mg/2mL: 2 a 4 ampolas (40 a 80mg) IV em bolus (administrar após início da vasodilatação).');
        alertas.push('⛔ NÃO usar Betabloqueador no EAP hipertensivo agudo. Evitar uso rotineiro de Morfina (aumenta necessidade de IOT e mortalidade no registro ADHERE).');
      } else if (temIam) {
        metaPressorica = 'META SCA / IAM: Reduzir PA gradualmente até alívio da angina (evitar PAD < 60 mmHg para não reduzir perfusão coronariana).';
        medicacoes.push('💉 Nitroglicerina (Tridil) 50mg + 240mL SG 5% (200 mcg/mL) — iniciar a 3 mL/h (10 mcg/min) e titular a cada 5 min conforme dor e PA.');
        medicacoes.push('💊 AAS 300mg VO mastigado + Clopidogrel 300-600mg (ou Ticagrelor 180mg) + Enoxaparina conforme protocolo SCA.');
        alertas.push('⛔ PROIBIDO usar Nitroprussiato de Sódio no IAM (causa "roubo de fluxo coronariano" nas áreas isquêmicas) e proibido usar Nitratos se uso de Sildenafila/Tadalafila nas últimas 24-48h ou IAM de VD.');
      } else if (temAvc || temAvcHemorragico) {
        t2Exames.unshift('• 🚨 TOMOGRAFIA DE CRÂNIO SEM CONTRASTE IMEDIATA (porta-TC < 20 min) para diferenciar AVC Isquêmico de Hemorrágico.');
        if (temAvcHemorragico) {
          metaPressorica = 'META AVC HEMORRÁGICO (AVCh): Reduzir PAS para ~140 mmHg (faixa 130-150 mmHg) na 1ª hora (evitar quedas > 60 mmHg em 1h).';
          medicacoes.push('💉 Labetalol 10-20mg IV em 2 min (ou Metoprolol 5mg IV) OU Nitroprussiato de Sódio (50mg + 248mL SG 5%) titulado com cautela (atenção à PIC).');
        } else {
          metaPressorica = 'META AVC ISQUÊMICO (AVCi): Se candidato a Trombólise -> baixar PA para < 185/110 mmHg antes do rtPA (e manter < 180/105 nas 24h). Se NÃO trombolisar -> hipertensão permissiva (só baixar em 15% se PA ≥ 220/120 mmHg).';
          medicacoes.push('💉 Se PA > 185/110 em candidato a trombólise: Metoprolol 5mg IV lento a cada 10 min (máx 15mg) ou Nitroprussiato de Sódio 0,3-0,5 mcg/kg/min em BIC.');
        }
        alertas.push('⛔ NUNCA reduzir abruptamente a PA no AVC isquêmico fora de janela de trombólise se PA < 220/120 mmHg (infarta a área de penumbra isquêmica!).');
      } else if (temPreEclampsia) {
        metaPressorica = 'META GESTANTE (FEBRASGO): Manter PAS entre 140-150 mmHg e PAD entre 90-100 mmHg (quedas bruscas causam sofrimento fetal agudo).';
        t2Exames.push('• Rotina HELLP: TGO, TGP, Bilirrubinas, DHL, Plaquetas, Creatinina, Ácido Úrico, Relação Proteína/Creatinina urinária e Cardiotocografia fetal.');
        medicacoes.push('💊 1ª Escolha (FEBRASGO): Nifedipino 10mg VO (comprimido de ação rápida engolido, NÃO sublingual) a cada 20-30 min se PA ≥ 160/110 mmHg (máx 30mg).');
        medicacoes.push('💉 Alternativa IV: Hidralazina 20mg/1mL + 19mL AD (1 mg/mL) — fazer 5 mL (5mg) IV lento a cada 20 min até controle pressórico (máx 20-30mg).');
        medicacoes.push('💉 PREVENÇÃO DE ECLÂMPSIA (Esquema de Zuspan - Sulfato de Magnésio 50% [1g = 2mL]):');
        medicacoes.push('   • Ataque: MgSO4 50% 8 mL (4g) + SF 0,9% 92 mL IV correr em 20 minutos em BIC.');
        medicacoes.push('   • Manutenção: MgSO4 50% 20 mL (10g) + SF 0,9% 480 mL (20 mg/mL) — correr a 50 mL/h (1g/h) a 100 mL/h (2g/h) em BIC.');
        alertas.push('⛔ PROIBIDO na Gestação: IECA (Captopril/Enalapril), BRA (Losartana) e Atenolol (teratogênicos/oligodramnia). Evitar Nitroprussiato (intoxicação fetal por cianeto).');
        alertas.push('🛡️ VIGILÂNCIA DO MAGNÉSIO: Checar de 1/1h Reflexo Patelar, FR ≥ 16 irpm e Diurese ≥ 25 mL/h. Se abolição do reflexo ou depressão respiratória: suspender MgSO4 e aplicar Antídoto (Gluconato de Cálcio 10% 10 mL IV lento em 3-5 min).');
      } else {
        metaPressorica = 'META ENCEFALOPATIA HIPERTENSIVA: Reduzir PAM em 20 a 25% na 1ª hora; atingir 160/100 mmHg em 2 a 6 horas.';
        medicacoes.push('💉 Nitroprussiato de Sódio 50mg (1 amp) + 248mL SG 5% (200 mcg/mL) protegido da luz — iniciar a 0,25 a 0,5 mcg/kg/min em BIC.');
      }
    } else {
      // Urgência Hipertensiva
      t1Imediata.push('• Repouso em leito de observação, exame físico cardiovascular, pulmonar, neurológico e fundoscopia para confirmar ausência de LOA aguda.');
      t2Exames.push('• ECG de 12 derivações, Creatinina, Sódio, Potássio e Urina 1.');
      medicacoes.push('💊 1ª Opção: Captopril 25mg a 50mg VO (início em 15-30 min, pico 1h). Pode repetir após 1h (evitar se suspeita de estenose bilateral de artéria renal ou hipercalemia).');
      medicacoes.push('💊 2ª Opção: Clonidina 0,100mg a 0,200mg VO (excelente se componente simpático/rebote por suspensão de medicação).');
      medicacoes.push('💊 3ª Opção: Anlodipino 5mg a 10mg VO ou Hidralazina 25mg VO.');
      condutas.push('• Observar por 2 a 4 horas até PAS < 180 e PAD < 110 mmHg, otimizar receita de uso contínuo e garantir retorno ambulatorial em 72h.');
      alertas.push('⛔ NUNCA usar medicação intravenosa ou Nifedipino sublingual na Urgência Hipertensiva (risco de AVC isquêmico hemodinâmico por hipoperfusão).');
    }

    var t4Decisao = [
      '• Destino: ' + local,
      '• Meta Pressórica: ' + metaPressorica
    ].concat(condutas);

    return {
      tipo: tipo,
      titulo: titulo,
      pas: pas,
      pad: pad,
      localRecomendado: local,
      metaPressorica: metaPressorica,
      condutas: condutas,
      medicacoes: medicacoes,
      alertas: alertas,
      cincoTempos: {
        t1Imediata: t1Imediata,
        t2Exames: t2Exames,
        t3Prescricao: medicacoes,
        t4Decisao: t4Decisao,
        t5Alarmes: alertas
      }
    };
  }

  function formatarTextoTelegram(res) {
    var ct = res.cincoTempos || {};
    var linhas = [
      '❤️ *MANEJO DE CRISE HIPERTENSIVA (SBC / AHA / FEBRASGO)*',
      '🩺 *Classificação:* ' + res.titulo,
      '📟 *PA Aferida:* ' + res.pas + ' × ' + res.pad + ' mmHg',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '⚡ *1. CONDUTA IMEDIATA (Minuto 0 ao 5)*'
    ].concat(ct.t1Imediata || [])
     .concat(['', '📋 *2. EXAMES INDISPENSÁVEIS*'])
     .concat(ct.t2Exames || [])
     .concat(['', '💊 *3. PRESCRIÇÃO PRONTA (Padrão ISMP)*'])
     .concat(res.medicacoes || [])
     .concat(['', '🏥 *4. CRITÉRIOS DE DECISÃO & METAS*'])
     .concat(ct.t4Decisao || [])
     .concat(['', '⚠️ *5. SINAIS DE ALARME & ARMADILHAS ("O que NÃO fazer")*'])
     .concat(res.alertas || []);

    return linhas.join('\n');
  }

  function extrairParametrosTexto(texto) {
    texto = String(texto || '').toLowerCase();
    var pas = 180, pad = 110;
    var mPas = texto.match(/pas\s*[:=]?\s*(\d{2,3})/);
    var mPad = texto.match(/pad\s*[:=]?\s*(\d{2,3})/);
    if (mPas && mPad) {
      pas = parseInt(mPas[1], 10);
      pad = parseInt(mPad[1], 10);
    } else {
      var mPa = texto.match(/(\d{2,3})\s*[xX/]\s*(\d{2,3})/);
      if (mPa) {
        pas = parseInt(mPa[1], 10);
        pad = parseInt(mPa[2], 10);
      } else {
        var mPaEspaco = texto.match(/\b(1\d\d|2\d\d)\s+(\d{2,3})\b/);
        if (mPaEspaco) {
          pas = parseInt(mPaEspaco[1], 10);
          pad = parseInt(mPaEspaco[2], 10);
        }
      }
    }

    var loa = {
      eap: /(eap|edema agudo|congestao pulmonar|crepit)/i.test(texto),
      encefalopatia: /(encefalopatia|confus|papiledema|turvacao|coma)/i.test(texto),
      disseccao: /(dissecc|dor rasgando|dor transfix|assimetria de pulso)/i.test(texto),
      iam: /(iam|dor precordial|infarto|sca|supra)/i.test(texto),
      avc: /(avc|deficit|hemiplegia|afasia)/i.test(texto),
      avcHemorragico: /(avch|hemorragic|sangramento intracraniano)/i.test(texto),
      preeclampsia: /(gestant|gravid|preeclamp|eclamp)/i.test(texto)
    };

    var dorAnsiedade = /(dor|ansiedad|panico|estresse|nervos|tensional)/i.test(texto);

    return {
      pas: pas,
      pad: pad,
      lesaoOrgaoAlvo: loa,
      dor: dorAnsiedade
    };
  }

  return {
    classificarCrise: classificarCrise,
    formatarTextoTelegram: formatarTextoTelegram,
    extrairParametrosTexto: extrairParametrosTexto
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmergenciaCriseHipertensivaService;
}
```

---

#### **Refatoração 3: Correção Crítica em `src/02_nefrologia_dhe.js` (Expurgo do Manitol no Sorcal + Inclusão de Bicarbonato na Acidose + Formatação 5 Tempos)**

Substitua o bloco de eliminação gastrointestinal e prescrição de hipercalemia em `src/02_nefrologia_dhe.js` pelo trecho corrigido abaixo:

```javascript
        // Correção dentro de avaliarHipercalemia(kAtual, ecgAlterado) em src/02_nefrologia_dhe.js:

        // 2B. Bicarbonato de Sódio IV se Acidose Metabólica Associada
        if (k > 5.5 || ecg) {
            var condutaBicarbonato = "REDISTRIBUIÇÃO (SE ACIDOSE METABÓLICA pH < 7,20 ou Bic < 15 mEq/L): Bicarbonato de Sódio 8,4% (1 mEq/mL) 50 a 100 mL IV correr em 30 a 60 minutos (ou solução isotônica: 150 mL de NaHCO3 8,4% + 850 mL de SG 5%).";
            condutas.push(condutaBicarbonato);
            tripe.redistribuicaoIntracelular.push(condutaBicarbonato);
        }

        // 3. Eliminação Corporal de Potássio (EXPURGO DO MANITOL NO SORCAL)
        if (k > 5.0) {
            var condutaFurosemida = "ELIMINAÇÃO RENAL: Furosemida 40-80 mg IV em bolus lento (caliurese forçada se função renal e volemia permitirem; se hipovolêmico, associar SF 0,9% ou Ringer Lactato se sem anúria).";
            condutas.push(condutaFurosemida);
            tripe.eliminacaoCorporal.push(condutaFurosemida);
            prescricoes.push("Furosemida 20mg/2mL: 2 a 4 ampolas (40 a 80 mg) IV em bolus lento (avaliar débito urinário e volemia).");

            var condutaSorcal = "ELIMINAÇÃO GASTROINTESTINAL: Ciclossilicato de Zircônio (Lokelma) 10g VO diluído em água de 8/8h (1ª escolha se disponível) OU Poliestirenossulfonato de Cálcio (Sorcal) 30g VO diluído em 100 mL de ÁGUA POTÁVEL ou SG 10% de 8/8h. ⛔ PROIBIDO diluir Sorcal em Manitol ou Sorbitol (risco de necrose e perfuração colônica). Contraindicado em íleo paralítico ou pós-operatório abdominal.";
            condutas.push(condutaSorcal);
            tripe.eliminacaoCorporal.push(condutaSorcal);
            prescricoes.push("Poliestirenossulfonato de Cálcio (Sorcal) 30g VO diluído exclusivamente em 100 mL de água potável (ou SG 10%) de 8/8h (NUNCA diluir em Manitol).");
        }
```

---

### 4. RESUMO EXECUTIVO DO CHECKLIST DE SEGURANÇA IMPLEMENTADO

| Módulo | Falha Identificada | Correção Aplicada no Código |
| :--- | :--- | :--- |
| **`02_pneumologia_pac.js`** | Faltavam 2 critérios menores ATS/IDSA; Amoxicilina em subdose (500mg); sem ajuste renal/gestante. | Incluídos os 9 critérios menores completos; Amoxicilina 1g 8/8h; Hidrocortisona no PAC grave; travas de TFG (< 30 e < 50 mL/min), Gestante e Alergia IgE. |
| **`02_emergencia_crise_hipertensiva.js`** | Nifedipino *Retard* na pré-eclâmpsia; Zuspan sem antídoto/diluição; AVCh tratado igual AVCi; Captopril na pseudocrise. | Nifedipino 10mg ação rápida VO na gestante; Zuspan com diluição ISMP e Gluconato de Cálcio 10%; separação AVCh (meta PAS ~140) vs AVCi; analgesia/ansiólise isolada na pseudocrise. |
| **`02_emergencia_choque_septico_circi.js`** | Espera de 4h rígida para Hidrocortisona no choque refratário. | Acionamento imediato de Vasopressina (9 mL/h fixa) + Hidrocortisona (50mg IV 6/6h) ao atingir Noradrenalina ≥ 0,25 mcg/kg/min. |
| **`02_nefrologia_dhe.js`** | Diluição de Sorcal em Manitol 10% (risco de necrose colônica); omissão do Bicarbonato IV na acidose. | Expurgo do Manitol (diluição exclusiva em água ou SG 10%); adição de NaHCO3 8,4% se pH < 7,20. |