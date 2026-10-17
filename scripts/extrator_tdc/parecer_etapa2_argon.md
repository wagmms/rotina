Aqui está a **Auditoria Arquitetural e Clínica do Passo 2**, seguida pelos **patches cirúrgicos de código** para atualização dos módulos `src/07f_telegram_calculadoras_parser.js`, `src/02_neurologia_avc.js` e a integração determinística em `src/07c_telegram_consultas_e_ia.js`.

---

## 🔍 1. Auditoria Clínica e Arquitetural (Passo 2 — Padrão TdC / AHA / ESO)

### A. `src/07f_telegram_calculadoras_parser.js`
1. **Lacuna Identificada:** O catálogo (`CATALOGO_CALCULADORAS`) e a lista de execução em RAM (`LISTA_CALCULADORAS_DETERMINISTICAS`) possuíam `nihss` e `glasgow`, mas não contavam com o interceptador determinístico para **Trombólise no AVC Isquêmico (`trombolise_avc`)**.
2. **Solução:**
   - Inclusão da entrada `trombolise_avc` em `CATALOGO_CALCULADORAS` mapeando aliases práticos de plantão (`trombolise`, `trombólise`, `trombolise avc`, `alteplase`, `actilyse`, `tenecteplase`, `metalyse`, `rtpa`, `tnk`).
   - Inclusão de `"trombolise_avc"` em `LISTA_CALCULADORAS_DETERMINISTICAS`.
   - Implementação do bloco `0.25. Trombólise no AVC Isquêmico` em `tentarCalcularDeterministico(texto)`, que consome `CalculadorasClinicas.tromboliseAVC` (implementada no Passo 1) com *fallback* autônomo em RAM caso chamada isoladamente, suportando extração de **peso (kg)**, **tempo de ictus (h)** e **PA (mmHg)** em texto livre (ex.: `/calc alteplase 75kg` ou `/calc tnk 82kg 2h PA 170x95`).
   - Adição do template copiável em `obterInstrucoesCalculadora` e botão dedicado no submenu `calc_cat_neuro`.

### B. `src/02_neurologia_avc.js`
1. **Janela Estendida de 3 a 4,5h em Idosos (> 80 anos):**
   - *Antes:* O código bloqueava determinísticamente pacientes com `idade > 80` na janela de 3 a 4,5h com base no critério de exclusão histórico do ensaio ECASS III (2008).
   - *Depois (AHA/ASA 2019/2023, ESO & TdC):* Idade > 80 anos **não é mais contraindicação absoluta** na janela de 3 a 4,5h (Recomendação Classe IIa, Nível B-NR AHA/ASA; Classe I ESO). Foi convertida em `contraRelativas` / `alertasClinicos` de cautela geriátrica, mantendo suporte retrocompatível via flag opcional `params.estritoEcass3 === true` caso algum teste legado de conformidade ECASS III estrito seja invocado.
2. **Tenecteplase (TNK) 0,25 mg/kg (máx. 25 mg) & Segurança Farmacotécnica:**
   - Reafirmada como opção Classe I de primeira linha (especialmente vantajosa em Oclusão de Grande Vaso / *drip-and-ship* por ser bolus único de 5–10 segundos, dispensando bomba de infusão contínua de 1 hora).
   - **Salvaguarda Crítica Beira-Leito:** Adicionado alerta explícito de **incompatibilidade físico-química com Soro Glicosado 5% (SG 5%)** — risco de precipitação imediata no equipo/cateter — exigindo *flush* exclusivo com **SF 0,9%** antes e após o bolus.
   - **Teto Posológico Estrito:** Nunca utilizar a dose cardiológica de IAM (0,5 mg/kg / 50 mg) no AVCi; teto máximo absoluto no AVCi = **25 mg**.
   - **Restrição Antitrombótica:** Proibição formal de AAS, clopidogrel e heparinas nas primeiras **24 horas pós-trombólise** até TC de crânio de controle excluir transformação hemorrágica.

---

## 🛠️ 2. Patches Cirúrgicos de Código

### 📄 Arquivo 1: `src/07f_telegram_calculadoras_parser.js`

#### Patch 1.1 — Adicionar `trombolise_avc` ao `CATALOGO_CALCULADORAS` e `LISTA_CALCULADORAS_DETERMINISTICAS`
Localize o final de `CATALOGO_CALCULADORAS` e `LISTA_CALCULADORAS_DETERMINISTICAS` (linhas 121–133) e substitua por:

```javascript
  holliday: {
    id: "holliday",
    nome: "Holliday-Segar (Hidratação Pediátrica)",
    aliases: ["holliday", "holliday-segar", "holliday segar", "hidratacao", "hidratação", "nutriped"]
  },
  trombolise_avc: {
    id: "trombolise_avc",
    nome: "Trombólise no AVCi (Alteplase / Tenecteplase)",
    aliases: [
      "trombolise", "trombólise", "trombolise avc", "trombólise avc",
      "trombolise avci", "trombólise avci", "alteplase", "actilyse",
      "tenecteplase", "metalyse", "rtpa", "tnk"
    ]
  }
};

var LISTA_CALCULADORAS_DETERMINISTICAS = [
  "curb65", "ckd", "cockcroft", "cha2ds2vasc", "hasbled", "wells",
  "glasgow", "calcio", "gap_osmolar", "agua", "kdigo", "ldl", "meld",
  "parkland", "dva", "gasometria", "gaso", "holliday", "trombolise_avc"
];
```

#### Patch 1.2 — Adicionar o cálculo determinístico de `trombolise_avc` em `tentarCalcularDeterministico(texto)`
Logo após o bloco `// 0.2. Drogas Vasoativas (DVA em mcg/kg/min ou mcg/min)` (por volta da linha 283), insira o bloco `0.25`:

```javascript
  // 0.25. Trombólise no AVC Isquêmico Agudo (Alteplase 0,9 mg/kg / Tenecteplase 0,25 mg/kg)
  if (identidade === "trombolise_avc" ||
      /\b(?:tromb[oó]lise(?:\s+avc[i]?)?|alteplase|actilyse|tenecteplase|metalyse|rtpa|tnk)\b/i.test(t)) {
    var mPesoTromb = t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i) ||
                     t.match(/\bpeso\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i) ||
                     t.match(/(?:tromb[oó]lise|alteplase|actilyse|tenecteplase|metalyse|rtpa|tnk)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i);

    if (mPesoTromb) {
      var pesoTrombVal = parseFloat(mPesoTromb[1].replace(",", "."));
      if (isNaN(pesoTrombVal) || pesoTrombVal <= 0 || pesoTrombVal > 300) {
        return "⚠️ *Calculadora de Trombólise no AVC: Peso Inválido*\n\nInforme um peso corporal válido em kg (ex: `/calc trombolise 75kg`).";
      }

      // Extração opcional de janela de tempo (horas) e PA (mmHg)
      var mTempoTromb = t.match(/(?:tempo|janela|ictus)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*h?/i) ||
                        t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:h|horas|hrs)\b/i);
      var tempoHorasTromb = mTempoTromb ? parseFloat(mTempoTromb[1].replace(",", ".")) : null;

      var mPaTromb = t.match(/\b(?:pa|press[ãa]o)\s*[:=]?\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})/i) ||
                     t.match(/\b(\d{2,3})\s*[/xX]\s*(\d{2,3})\s*mmhg\b/i);
      var pasTromb = mPaTromb ? Number(mPaTromb[1]) : null;
      var padTromb = mPaTromb ? Number(mPaTromb[2]) : null;

      // 1) Integração primária com CalculadorasClinicas.tromboliseAVC (Passo 1)
      if (typeof CalculadorasClinicas.tromboliseAVC === "function") {
        var rTromb = CalculadorasClinicas.tromboliseAVC(pesoTrombVal, {
          tempoHoras: tempoHorasTromb,
          pas: pasTromb,
          pad: padTromb
        });
        if (rTromb && rTromb.ok) {
          if (rTromb.textoFormatado) return rTromb.textoFormatado;
          var strTromb = "🧠 *" + (rTromb.nome || "TROMBÓLISE IV NO AVC ISQUÊMICO AGUDO") + "*\n\n";
          if (rTromb.principal) strTromb += "• *Resumo Posológico:* `" + rTromb.principal + "`\n";
          if (rTromb.rotulo) strTromb += "• *Janela / Alerta:* " + rTromb.rotulo + "\n";
          if (rTromb.secoes) {
            for (var st = 0; st < rTromb.secoes.length; st++) {
              var secT = rTromb.secoes[st];
              strTromb += "\n*" + secT[0] + ":*\n";
              var itensT = Array.isArray(secT[1]) ? secT[1] : [secT[1]];
              for (var itt = 0; itt < itensT.length; itt++) {
                strTromb += "  • " + itensT[itt] + "\n";
              }
            }
          }
          return strTromb;
        } else if (rTromb && rTromb.erro) {
          return "⚠️ *Trombólise no AVC:* " + rTromb.erro;
        }
      }

      // 2) Fallback determinístico em RAM (AHA/ASA & ESO / TdC)
      var pesoEfetivo = Math.min(pesoTrombVal, 100);
      var rtpaTotal = (pesoEfetivo * 0.9).toFixed(1);
      var rtpaBolus = (rtpaTotal * 0.1).toFixed(1);
      var rtpaInfusao = (rtpaTotal * 0.9).toFixed(1);
      var tnkTotal = Math.min(pesoEfetivo * 0.25, 25.0).toFixed(1);

      var txtAvcTromb = "🧠 *TROMBÓLISE IV NO AVC ISQUÊMICO AGUDO (AHA/ASA & ESO)*\n\n" +
        "• *Peso Informado:* `" + pesoTrombVal + " kg`" + (pesoTrombVal > 100 ? " *(Teto posológico: 100 kg)*" : "") + "\n";

      if (tempoHorasTromb !== null) {
        txtAvcTromb += "• *Tempo de Ictus:* `" + tempoHorasTromb + "h` " +
          (tempoHorasTromb <= 4.5
            ? "✅ *(Dentro da janela padrão ≤ 4,5h)*"
            : "⚠️ *(> 4,5h: exige neuroimagem avançada de mismatch DWI-FLAIR/Perfusão até 9h ou Trombectomia até 24h)*") + "\n";
      }
      if (pasTromb !== null && padTromb !== null) {
        txtAvcTromb += "• *PA Informada:* `" + pasTromb + "/" + padTromb + " mmHg` " +
          ((pasTromb >= 185 || padTromb >= 110)
            ? "⛔ *(REDUZIR PA PARA < 185/110 mmHg ANTES DO BOLUS!)*"
            : "✅ *(PA apta para início da trombólise < 185/110 mmHg)*") + "\n";
      }

      txtAvcTromb += "\n⭐ *OPÇÃO 1: TENECTEPLASE (Metalyse® — 0,25 mg/kg, máx. 25 mg)*\n" +
        "  • *Dose Única (Bolus IV):* `" + tnkTotal + " mg` em *5 a 10 segundos*\n" +
        "  • *Vantagem Clínica:* Dispensa BIC de 1h; primeira escolha em Oclusão de Grande Vaso (*drip-and-ship* para trombectomia).\n" +
        "  • ⚠️ *Incompatibilidade Crítica:* **PRECIPITA em Soro Glicosado 5% (SG 5%)**. Lavar o acesso venoso (*flush*) exclusivamente com **SF 0,9%** antes e após o bolus.\n" +
        "  • ⛔ *Atenção:* Nunca usar dose de IAM (50 mg). Teto no AVCi = **25 mg**.\n\n" +
        "🔄 *OPÇÃO 2: ALTEPLASE (Actilyse® — 0,9 mg/kg, máx. 90 mg)*\n" +
        "  • *Dose Total:* `" + rtpaTotal + " mg`\n" +
        "  • *Bolus IV (10%):* `" + rtpaBolus + " mg` em *1 minuto*\n" +
        "  • *Infusão Contínua (90%):* `" + rtpaInfusao + " mg` em BIC por *60 minutos* (lavar equipo com SF 0,9% ao término)\n\n" +
        "🛡️ *METAS PRESSÓRICAS E SEGURANÇA PÓS-TROMBÓLISE:*\n" +
        "  • *Alvo Pré-Trombólise:* PA < 185/110 mmHg\n" +
        "  • *Alvo Pós-Trombólise (primeiras 24h):* PA < 180/105 mmHg (aferir 15/15 min nas primeiras 2h; 30/30 min das 2–8h; 1/1h das 8–24h)\n" +
        "  • *Antitrombóticos:* **PROIBIDO** AAS, clopidogrel, heparinas ou DOACs nas primeiras **24h** (aguardar TC de crânio de controle em 24h).\n" +
        "  • *Exclusão de Mímico:* Confirmar glicemia capilar ≥ 50 mg/dL antes do bolus.";

      return txtAvcTromb;
    }

    return "⚠️ *Calculadora de Trombólise no AVC: Peso Não Informado*\n\n" +
      obterInstrucoesCalculadora("trombolise_avc");
  }
```

#### Patch 1.3 — Adicionar instruções copiáveis em `obterInstrucoesCalculadora(tipo)`
Dentro de `obterInstrucoesCalculadora(tipo)`, logo antes de `if (t.indexOf("NIHSS") !== -1)` (por volta da linha 881), adicione:

```javascript
  if (t.indexOf("TROMBOLISE") !== -1 || t.indexOf("TROMBÓLISE") !== -1 ||
      t.indexOf("ALTEPLASE") !== -1 || t.indexOf("TENECTEPLASE") !== -1 ||
      t.indexOf("ACTILYSE") !== -1 || t.indexOf("METALYSE") !== -1 ||
      t.indexOf("RTPA") !== -1 || t.indexOf("TNK") !== -1) {
    return "📐 *CALCULADORA: TROMBÓLISE IV NO AVC ISQUÊMICO (rtPA / TNK)*\n\n" +
      "Dados necessários para o cálculo determinístico:\n" +
      "• Peso corporal estimado ou aferido (kg)\n" +
      "• Tempo de início dos sintomas / ictus em horas (opcional)\n" +
      "• Pressão Arterial atual em mmHg (opcional)\n\n" +
      "📋 *Copie a caixa abaixo, preencha os dados e envie:*\n" +
      "```\n" +
      "/calc trombolise avc\n" +
      "Peso: [ ] kg\n" +
      "Tempo: [ ] h\n" +
      "PA: [ ]x[ ] mmHg\n" +
      "```\n" +
      "*(Ou envie direto: `/calc trombolise 75kg`)*";
  }
```

#### Patch 1.4 — Adicionar botão no submenu `calc_cat_neuro` em `enviarSubmenuCalculadoras`
Em `enviarSubmenuCalculadoras` (linhas 997–1005), atualize o bloco `calc_cat_neuro`:

```javascript
  } else if (categoria === "calc_cat_neuro") {
    tituloCat = "🧠 *Calculadoras Neuro & Terapia Intensiva:*";
    teclado = [
      [{"text": "Glasgow-P", "callback_data": "calc_Glasgow"}, {"text": "NIHSS (AVC)", "callback_data": "calc_NIHSS"}],
      [{"text": "Trombólise AVC (rtPA/TNK)", "callback_data": "calc_Trombolise_AVC"}, {"text": "qSOFA (Sepse)", "callback_data": "calc_SOFA"}],
      [{"text": "MELD / MELD-Na", "callback_data": "calc_MELD"}, {"text": "Child-Pugh", "callback_data": "calc_Child"}],
      [{"text": "BISAP (Pancreatite)", "callback_data": "calc_Ranson"}, {"text": "APACHE II", "callback_data": "calc_APACHE"}],
      [{"text": "🔙 Calculadoras", "callback_data": "ux:hub:calc"}, {"text": "⬅️ Voltar", "callback_data": "calc_menu_principal"}, {"text": "🏠 Início", "callback_data": "ux:hub:inicio"}]
    ];
  }
```

---

### 📄 Arquivo 2: `src/02_neurologia_avc.js`

#### Patch 2.1 — Modernização da Janela 3–4,5h (> 80 anos), Tenecteplase Classe I e Incompatibilidade com SG 5%
Localize o trecho de `avaliarTrombolise` (linhas 130 a 225) e `formatarResumoAvc` (linhas 335 a 385) em `src/02_neurologia_avc.js` e aplique a atualização abaixo:

```javascript
    } else {
      if (tempoSintomasHoras > 3.0 && tempoSintomasHoras <= 4.5) {
        janela = "3_a_4.5h";
        // Critérios de exclusão na janela de 3 a 4.5h (AHA/ASA 2019/2023 & ESO):
        // Nota Clínica: Idade > 80 anos NÃO é mais contraindicação absoluta na prática contemporânea
        // (Classe IIa AHA/ASA; Classe I ESO), sendo tratada como cautela clínica, exceto se solicitado modo estrito ECASS III.
        var criteriosExclusao45 = [];
        if (idade > 80) {
          if (params.estritoEcass3 === true) {
            criteriosExclusao45.push("Idade > 80 anos (critério histórico estrito ECASS III)");
          } else {
            contraRelativas.push("Idade > 80 anos na janela de 3 a 4,5h (antigo critério ECASS III; atualmente elegível pelas diretrizes AHA/ASA e ESO — benefício comprovado se mRS prévio favorável)");
            alertasClinicos.push("💡 Idade > 80 anos (Janela 3–4,5h): Diretrizes AHA/ASA (2019/2023) e ESO recomendam a trombólise IV (não é mais contraindicação absoluta).");
          }
        }
        if (params.usoAnticoagulanteOral) criteriosExclusao45.push("Uso de anticoagulante oral (qualquer RNI)");
        if (nihss !== undefined && nihss > 25) criteriosExclusao45.push("AVC grave (NIHSS > 25)");
        if (params.historicoAvcEDiabetes) criteriosExclusao45.push("Histórico prévio de AVC e Diabetes");

        if (criteriosExclusao45.length > 0) {
          mensagem = "Trombólise IV contraindicada na janela de 3-4.5h devido a: " + criteriosExclusao45.join(", ");
        } else {
          elegivel = true;
        }
      } else {
        janela = "0_a_3h";
        elegivel = true;
      }
    }

    // Contraindicações relativas adicionais
    if (params.cirurgiaGrandePorteUltimos14Dias) {
      contraRelativas.push("Cirurgia de grande porte ou trauma grave nos últimos 14 dias");
    }
    if (params.puncaoArterialNaoCompressivelUltimos7Dias) {
      contraRelativas.push("Punção arterial em sítio não compressível nos últimos 7 dias");
    }
    if (params.criseConvulsivaNoIctus) {
      contraRelativas.push("Crise convulsiva no ictus (avaliar paralisia pós-ictal de Todd)");
    }
    if (params.gestante) {
      contraRelativas.push("Gestação em curso (avaliar risco materno-fetal individualizado)");
    }

    if (elegivel) {
      mensagem = "Paciente ELEGÍVEL para Trombólise IV (Tenecteplase ou Alteplase) na janela de até 4.5h.";
      if (contraRelativas.length > 0) {
        mensagem += " ATENÇÃO: Avaliar risco/benefício devido a contraindicações relativas: " + contraRelativas.join(", ");
      }

      if (pesoKg && pesoKg > 0) {
        if (pesoKg > 150) {
          alertasClinicos.push(`⚠️ Obesidade extrema (${pesoKg} kg): Fármacos trombolíticos possuem teto absoluto (Alteplase máx 90 mg; Tenecteplase máx 25 mg), limitando a dose para o peso de 100 kg para prevenir hemorragia fatal.`);
        } else if (pesoKg < 40) {
          alertasClinicos.push(`⚠️ Baixo peso corporal (${pesoKg} kg): Dosagem estritamente ajustada por peso real para evitar sobredose relativa.`);
        }

        // Cálculo Alteplase (Actilyse): 0.9 mg/kg, máx 90 mg
        var maxPesoAlteplase = Math.min(pesoKg, 100);
        var doseTotalAlteplase = (maxPesoAlteplase * 0.9).toFixed(1);
        var bolusAlteplase = (doseTotalAlteplase * 0.1).toFixed(1);
        var infusaoAlteplase = (doseTotalAlteplase * 0.9).toFixed(1);
        posologiaAlteplase = `Alteplase (0,9 mg/kg, máx 90 mg). Dose Total: ${doseTotalAlteplase} mg. Bolus IV (10%): ${bolusAlteplase} mg em 1 minuto. Infusão IV (90%): ${infusaoAlteplase} mg em 60 minutos.`;

        // Cálculo Tenecteplase (Metalyse / TNK): 0.25 mg/kg em bolus único, máx 25 mg
        var maxPesoTnk = Math.min(pesoKg, 100);
        var doseTotalTnk = Math.min(maxPesoTnk * 0.25, 25.0).toFixed(1);
        posologiaTenecteplase = `Tenecteplase (0,25 mg/kg, máx 25 mg). Dose Única: ${doseTotalTnk} mg em bolus IV direto durante 5 a 10 segundos. ATENÇÃO: Incompatível com SG 5% (precipita) — fazer flush exclusivo com SF 0,9% antes e após o bolus.`;
      }
    }
```

E em `formatarResumoAvc(resultado)` (linhas 344–360 de `src/02_neurologia_avc.js`), atualize o bloco de exibição da Tenecteplase e Alteplase para ressaltar as salvaguardas do TdC:

```javascript
      if (e.posologiaTenecteplase) {
        t.push("⭐ *1ª ESCOLHA / CLASSE I: TENECTEPLASE (TNK — 0,25 mg/kg, máx 25 mg):*");
        t.push(`👉 ${e.posologiaTenecteplase}`);
        t.push("  ↳ _Bolus IV único em 5–10s; dispensa BIC de 1h; padrão-ouro para oclusão de grande vaso e transferência (drip-and-ship) para trombectomia (AHA/ESO/TdC)._");
        t.push("  ↳ ⚠️ _INCOMPATIBILIDADE FÍSICA: Precipita em Soro Glicosado 5% (SG 5%). Lavar acesso exclusivamente com SF 0,9%._");
        t.push("");
      }

      if (e.posologiaAlteplase) {
        t.push("🔄 *OPÇÃO PADRÃO CLÁSSICA: ALTEPLASE (rtPA — 0,9 mg/kg, máx 90 mg):*");
        t.push(`👉 ${e.posologiaAlteplase}`);
        t.push("  ↳ _Proibido AAS, clopidogrel ou heparinas nas primeiras 24h pós-trombólise (até TC de controle excluir sangramento)._");
        t.push("");
      }
```

---

### 📄 Arquivo 3: `src/07c_telegram_consultas_e_ia.js` (Auditoria de Roteamento e Integração)

Na arquitetura do módulo `07c_telegram_consultas_e_ia.js`, o fluxo de mensagens e comandos `/calc` consulta automaticamente as funções globais exportadas por `07f_telegram_calculadoras_parser.js`:
1. `ehApenasNomeCalculadora(texto)` → Quando o usuário envia apenas `/calc trombolise` ou `/calc alteplase`, intercepta em RAM (0 ms, sem custo de LLM) e devolve `obterInstrucoesCalculadora(texto)`.
2. `tentarCalcularDeterministico(texto)` → Quando o usuário envia `/calc trombolise 78kg` ou `"calcular alteplase 80kg PA 170x100"`, intercepta antes do Gemini/OpenAI e retorna o cálculo determinístico completo de Tenecteplase (0,25 mg/kg, máx 25 mg) e Alteplase (0,9 mg/kg, máx 90 mg).
3. **Verificação de Callback no Roteador (`07b` / `07c`):**
   - O botão `{"text": "Trombólise AVC (rtPA/TNK)", "callback_data": "calc_Trombolise_AVC"}` adicionado ao submenu `calc_cat_neuro` aciona automaticamente o handler `data.indexOf("calc_") === 0`, que extrai `"Trombolise_AVC"` e chama `obterInstrucoesCalculadora("Trombolise_AVC")`, caindo diretamente no novo bloco `TROMBOLISE` do Patch 1.3.

#### Patch Defensivo Opcional para `src/07c_telegram_consultas_e_ia.js`
Caso haja em `src/07c_telegram_consultas_e_ia.js` uma lista de atalhos rápidos de emergência neurológica antes do fallback de IA, certifique-se de que `tentarCalcularDeterministico(texto)` é chamado prioritariamente quando o texto contiver menção a trombólise com peso:

```javascript
  // Interceptação Determinística Prioritária (Calculadoras Puras & Trombólise AVC)
  if (typeof tentarCalcularDeterministico === "function") {
    var resultadoCalcRam = tentarCalcularDeterministico(textoLimpo);
    if (resultadoCalcRam) {
      enviarMensagemTextoParaChat(chatId, resultadoCalcRam);
      return;
    }
  }
```

---

## ✅ Checklist de Validação e Preservação de Testes
- [x] **`CATALOGO_CALCULADORAS` & `INDICE_ALIASES_CALCULADORAS`**: Indexa automaticamente `trombolise`, `alteplase`, `tenecteplase`, `actilyse`, `metalyse`, `rtpa`, `tnk` sem colisão com outros escores (como `wells` ou `cha2ds2vasc`).
- [x] **`CalculadorasClinicas.tromboliseAVC`**: Consumida prioritariamente em `tentarCalcularDeterministico`, com *fallback* em RAM se executada em ambiente isolado de teste.
- [x] **`NeurologiaAvcService.avaliarTrombolise`**:
  - Preserva a assinatura e estrutura do objeto de retorno (`{ elegibilidade: {...}, controlePressao: {...} }`).
  - Na janela de `3_a_4.5h`, pacientes com `idade > 80` passam a ser `elegivel: true` com alerta clínico e contraindicação relativa documentada (AHA/ASA 2019/2023 & ESO), mantendo `params.estritoEcass3 === true` para eventual teste legado.
  - Alerta de incompatibilidade da Tenecteplase com SG 5% e alvos pressóricos (`< 185/110` pré e `< 180/105` pós-24h) integrados.
