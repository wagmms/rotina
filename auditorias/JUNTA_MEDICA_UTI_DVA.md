> **Modelo Auditor Utilizado:** `gemini-4-argon`
> **Data da Perícia:** 2026-10-15T22:53:53.779Z

Prezado Diretor Clínico,

Realizei uma auditoria forense completa nos 5 módulos que compõem o núcleo de Emergência e Terapia Intensiva do seu bot no Telegram. O código possui uma excelente base arquitetural determinística (sem alucinações de IA nos cálculos), mas **apresenta lacunas graves de segurança clínica, travas de teto posológico ausentes e "pontos cegos" severos no interpretador de comandos** que farão o bot falhar exatamente quando o médico estiver sob estresse na Sala Vermelha.

Abaixo está o diagnóstico rigoroso, traduzido para a prática médica e acompanhado do plano cirúrgico para a sua equipe de engenharia.

---

### 1. 🚨 ERROS CRÍTICOS DE FÓRMULA, DILUIÇÃO OU POSOLOGIA (RISCO AO PACIENTE)

#### A. Drogas Vasoativas e Sedoanalgesia Contínua (`02_calculadoras_puras.js` e `02_emergencia_choque_septico_circi.js`)
*   **Matemática das DVAs (Noradrenalina, Dobutamina, Adrenalina, Vasopressina, Nitroprussiato, Nitroglicerina):** **ACERTO CONFIRMADO.** As concentrações padronizadas (Nora 64 e 128 mcg/mL; Dobuta 1000 mcg/mL; Adrena 16 e 32 mcg/mL; Vaso 0,2 UI/mL; Nipride/Tridil 200 mcg/mL) e a fórmula de conversão `mL/h = (dose × peso × 60) / concentração` estão matematicamente exatas segundo o padrão AMIB/HSL.
*   **FALHA CRÍTICA 1 — Ausência de Conversão Reversa (mL/h ➔ mcg/kg/min) e Dose Específica:** Na vida real, o plantonista olha para a bomba rodando a "18 mL/h" em um paciente de 75 kg e pergunta: *"Qual a dose atual em mcg/kg/min?"*. Ou pergunta: *"Quantos mL/h para fazer 0,35 mcg/kg/min?"*. O módulo `drogasVasoativas` **não faz cálculo reverso** e só exibe uma tabela estática de doses pré-fixadas.
*   **FALHA CRÍTICA 2 — Ausência Total de Calculadoras de Infusão de Sedoanalgesia:** As drogas **Fentanil, Midazolam, Propofol, Dexmedetomidina (Precedex) e Cetamina** existem apenas como texto de compatibilidade em `02_compatibilidade_y_dva.js`, mas **não possuem calculadora de infusão contínua (mL/h ⇄ dose)** em `02_calculadoras_puras.js`.
*   **FALHA CRÍTICA 3 — Choque Séptico Refratário sem Inotrópico (`02_emergencia_choque_septico_circi.js`):** O protocolo aciona perfeitamente Vasopressina (0,03 UI/min = 9 mL/h) e Hidrocortisona (50 mg 6/6h) quando Nora $\ge$ 0,25 mcg/kg/min, mas **omite a associação de Dobutamina ou transição/associação com Adrenalina** caso haja disfunção miocárdica séptica ou hipoperfusão persistente (Diretriz *Surviving Sepsis Campaign 2021*).

#### B. Sequência Rápida de Intubação - SRI (`02_calculadoras_puras.js`)
*   **Matemática e Diluições Base:** **ACERTO CONFIRMADO** para um adulto padrão de 70 kg (Etomidato 0,3 mg/kg a 2 mg/mL; Cetamina 1,5 mg/kg a 50 mg/mL; Propofol 1,5 mg/kg a 10 mg/mL; Midazolam 0,2 mg/kg a 5 mg/mL; Rocurônio 1,2 mg/kg a 10 mg/mL; Succinilcolina 1,5 mg/kg a 10 mg/mL; Fentanil 2 mcg/kg a 50 mcg/mL).
*   **FALHA CRÍTICA 4 — Ausência de Trava Matemática de Dose-Teto (Overdose em Obesos):** O código exibe um aviso textual sobre obesidade, mas **calcula e exibe no topo do cartão ("AÇÃO IMEDIATA") a dose multiplicada pelo peso real sem teto!** Se o médico digitar um paciente de 160 kg, o bot manda aspirar **24 mL (240 mg) de Succinilcolina** (acima do teto de 200 mg), **24 mL (48 mg) de Etomidato**, **24 mL (240 mg) de Propofol** e **6,4 mL (320 mcg) de Fentanil**. No estresse da intubação, o médico lê o número grande no topo e causa colapso cardiovascular letal.
*   **FALHA CRÍTICA 5 — Dose de Indução no Choque:** Quando o contexto é `"choque"`, o código apenas oculta o Propofol, mas **mantém a mesma dose cheia de Etomidato (0,3 mg/kg), Cetamina (1,5 mg/kg) e Fentanil (2 mcg/kg)**. Em choque franco, Fentanil deve ser reduzido (0,5–1 mcg/kg) ou omitido, e indutores devem ter dose reduzida (Etomidato 0,15–0,2 mg/kg; Cetamina 0,5–1,0 mg/kg).

#### C. Distúrbios Hidroeletrolíticos: Sódio e Potássio (`02_nefrologia_dhe.js` e `02_calculadoras_puras.js`)
*   **Fórmula de Adrogué-Madias e Teto de Sódio:** **ACERTO CONFIRMADO.** Calcula corretamente $\Delta\text{Na} = (\text{Na}_{\text{infusão}} - \text{Na}_{\text{sérico}}) / (\text{ACT} + 1)$ e trava o planejamento em **8 mEq/L/24h** (prevenindo Síndrome de Desmielinização Osmótica / Mielinólise Pontina).
*   **FALHA CRÍTICA 6 — Omissão Total de Hipocalemia (Reposição de K+):** O arquivo `02_nefrologia_dhe.js` só sabe tratar Potássio alto! Se o médico inserir um paciente com **K+ de 2,2 mEq/L**, a função `avaliarHipercalemia` retorna literalmente: **`{ gravidade: "Normal", conduta: "Nenhuma ação específica." }`**. Isso é um erro gravíssimo. Além disso, **não existe no código nenhuma regra ou calculadora de reposição de KCl 19,1%** (concentração máxima periférica de 40–60 mEq/L vs central até 100 mEq/L, velocidade máxima segura de 10 mEq/h em acesso periférico e 20 mEq/h em central com monitorização de ECG).
*   **FALHA CRÍTICA 7 — Hipercalemia Moderada com ECG Alterado:** Na função `avaliarHipercalemia`, se o K+ estiver entre **5,1 e 5,5 mEq/L com alteração de ECG** (`avaliarHipercalemia(5.4, true)`), o código prescreve Gluconato de Cálcio (porque entra no `else if (k >= 6.5 || ecg)`), mas **NÃO prescreve Solução Polarizante (Glicoinsulina) nem Salbutamol** (pois o bloco de redistribuição exige `if (k > 5.5)` sem verificar `|| ecg`). Qualquer hipercalemia com toxicidade eletrocardiográfica exige shift intracelular imediato!
*   **FALHA CRÍTICA 8 — Solução Polarizante em Hiperglicemia:** O texto prescreve Glicose 50% + Insulina sem alertar que, se a glicemia capilar (HGT) for $\ge 250\text{ mg/dL}$, deve-se administrar **apenas Insulina Regular 10 UI IV isolada**, sem glicose hipertônica (para não agravar a hiperosmolaridade e quebrar o shift de potássio).

---

### 2. 🛡️ FALTA DE TRAVAS DE SEGURANÇA (LIMITES FISIOLÓGICOS E EXTREMOS)

1.  **Fallback Silencioso Perigoso na Nefrologia (`02_nefrologia_dhe.js`):**
    *   Na função `calcularACT(peso, sexo, idade)`, se o médico esquecer o peso, digitar `0`, negativo ou texto (`"setenta"`), o código faz: **`if (isNaN(p) || p <= 0) p = 70;`** e **`if (isNaN(id) || id < 0) id = 40;`**.
    *   **Consequência:** O bot calcula silenciosamente a vazão de **Salina Hipertônica 3%** para uma senhora de 42 kg ou para uma criança como se fosse um homem de 70 kg, sem emitir um único erro!
2.  **Pesos e Eletrólitos Incompatíveis com a Vida (`02_nefrologia_dhe.js` e `02_emergencia_choque_septico_circi.js`):**
    *   `02_nefrologia_dhe.js` aceita **qualquer valor positivo**: se o médico digitar peso `800` (pensando em 800g de um neonato ou erro de digitação de 80 kg), Sódio de `500` ou `15`, ou Potássio de `25` ou `0.5`, o código calcula normalmente sem travar.
    *   `02_emergencia_choque_septico_circi.js` não tem limite superior para a dose de Noradrenalina: se o médico digitar `nora 70 15` (querendo dizer 15 mL/h, mas a função lê como `15 mcg/kg/min`), o código calcula uma vazão letal de **984,4 mL/h** de Noradrenalina e gera a prescrição pronta para o prontuário!
3.  **Teto Pediátrico em Gotas (`02_calculadoras_puras.js`):**
    *   Em `posologiaPediatrica`, o código alerta quando a criança passa de 50 kg para suspensões, mas **omite o alerta para medicamentos em gotas** (`cfg.tipo !== 'gotas'`). Além disso, aceita peso até `80 kg` na pediatria sem bloquear quando a idade é incompatível com o peso (ex: criança de 2 anos com 75 kg por erro de digitação).
4.  **Obesidade Mórbida (> 150–350 kg) em DVA, SRI e Choque (`02_calculadoras_puras.js` e `02_emergencia_choque_septico_circi.js`):**
    *   Aceita pesos até `300–350 kg` multiplicando linearmente a dose pelo peso total. Na prática intensiva, doses de DVA e SRI em superobesos devem sofrer trava de peso máximo de cálculo (ex: 100–120 kg) ou usar Peso Ideal/Ajustado.

---

### 3. 💉 AUDITORIA DE COMPATIBILIDADE EM Y (DVA E SEDAÇÃO)

O módulo `02_compatibilidade_y_dva.js` cobre muito bem o básico (Bicarbonato + Catecolaminas/Cálcio, Furosemida + Noradrenalina/Dobutamina/Milrinona/Amiodarona, Fenitoína + Nora/Dobuta, Ceftriaxona + Cálcio/Ringer). Porém, **há falhas graves que podem induzir erro na beira do leito**:

1.  **BUG CRÍTICO DE FALSO-POSITIVO ("COMPATÍVEL") PARA MEDICAMENTOS NÃO CADASTRADOS:**
    *   Nas linhas 462–474 de `02_compatibilidade_y_dva.js`, se o médico testar duas drogas que **não estão nas 16 fichas de DVA** (por exemplo: `checarCompatibilidadeY('vancomicina', 'piperacilina')` ou `checarCompatibilidadeY('diazepam', 'furosemida')`), a condição `if (!fichaA && !fichaB)` é acionada e o bot responde com um selo verde:
        **`✅ COMPATÍVEL / NÃO APLICÁVEL A BIC`**!
    *   **Risco ao Paciente:** O médico pergunta se pode correr **Vancomicina com Piperacilina-Tazobactam (Tazocin)** na mesma via em Y e o bot dá um **selo verde de COMPATÍVEL**, quando na verdade elas precipitam!
2.  **Incompatibilidades Clássicas de UTI Ausentes na Matriz (`REGRAS_COMPATIBILIDADE_Y`):**
    *   **Furosemida + Midazolam:** A ficha textual do Midazolam diz que é incompatível com Furosemida (precipita), mas **o par `'furosemida_midazolam'` NÃO existe na matriz `REGRAS_COMPATIBILIDADE_Y`**! Se o médico consultar no bot, cairá na regra genérica (`⚠️ CONDICIONAL / SEM REGRA EM BANCO`) em vez de bloquear (`🛑 INCOMPATÍVEL`).
    *   **Furosemida + Fentanil / Adrenalina:** Citados na ficha da Furosemida como incompatíveis, mas **ausentes na matriz `REGRAS_COMPATIBILIDADE_Y`**.
    *   **Fenitoína com Fentanil, Midazolam, Propofol, Dexmedetomidina, Vasopressina, Adrenalina, Amiodarona:** Só existem regras para `fenitoina_noradrenalina` e `dobutamina_fenitoina`. Se o médico cruzar `Fenitoína + Midazolam` ou `Fenitoína + Fentanil`, o bot dirá que "não há registro de precipitação catalogada", quando a Fenitoína precipita com **qualquer** droga em Y!
    *   **Bicarbonato de Sódio com Midazolam, Fentanil, Propofol, Adrenalina:** Faltam os pares na matriz (`adrenalina_bicarbonato_de_sodio`, `bicarbonato_de_sodio_midazolam`, etc.).
    *   **Antimicrobianos e Drogas Críticas de UTI totalmente ausentes:**
        *   **Piperacilina-Tazobactam (Tazocin) + Vancomicina** (incompatibilidade física clássica em concentrações de UTI) e **Pip-Tazo + Aminoglicosídeos (Amicacina/Gentamicina)** (inativação química).
        *   **Anfotericina B** (incompatível com SF 0,9% e com todas as drogas em Y; exige SG 5% exclusivo).
        *   **Diazepam** (precipita na maioria das soluções aquosas e em Y com quase todas as drogas).
        *   **Insulina Regular** (incompatibilidades com soluções alcalinas/catecolaminas específicas).
        *   **Cetamina e Rocurônio** (muito usados em BIC na UTI, ausentes no catálogo).

---

### 4. ⚡ POR QUE O BOT PODE FALHAR OU DEMORAR NO TELEGRAM (PARSER DE COMANDOS)

O arquivo `07f_telegram_calculadoras_parser.js` é o grande gargalo de usabilidade. Quando ele não entende o comando determinístico (retorna `null`), a mensagem do médico cai no fallback da Inteligência Artificial (LLM), que demora vários segundos ou falha.

Aqui estão todos os **"Pontos Cegos"** onde o médico digita como na vida real e o parser falha:

1.  **SRI (`"sri 85kg"`, `"intubacao 70"`, `"sri 80 choque"`):**
    *   `sri` está no `CATALOGO_CALCULADORAS`, mas **NÃO está na `LISTA_CALCULADORAS_DETERMINISTICAS`** (linha 128) e **NÃO tem bloco `if (identidade === "sri")` dentro de `tentarCalcularDeterministico`!**
    *   Resultado: Nenhum comando de intubação funciona de forma rápida/determinística no parser!
2.  **Módulos Inteiros "Órfãos" no Parser (Choque Séptico, Sódio/Hiponatremia, Potássio/Hipercalemia, Compatibilidade em Y, Pediatria):**
    *   `"choque 70kg nora 0.3"` ➔ O módulo `02_emergencia_choque_septico_circi.js` **não é chamado em lugar nenhum** do parser!
    *   `"k 6.8"`, `"potassio 7.1 ecg"`, `"hipercalemia 6.5"` ➔ O módulo `02_nefrologia_dhe.js` **não está conectado ao parser**!
    *   `"na 114 65kg"`, `"hiponatremia 112 70kg"` ➔ O cálculo de Salina 3% (`planejarCorrecaoHiponatremia`) **não está conectado ao parser**!
    *   `"y nora fenta"`, `"compatibilidade nora furosemida"` ➔ O módulo `02_compatibilidade_y_dva.js` **não está conectado ao parser**!
3.  **DVA sem a palavra "kg" ou com vazão/dose (`"nora 80 0.2"`, `"nora 70"`, `"adrena 70kg"`):**
    *   Na linha 245, o regex exige a palavra `kg`: `t.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i)`. Se o médico digitar rápido `/dva nora 80` ou `nora 80 0.2`, `matchPesoDva` dá `null` e o bot recusa o cálculo dizendo "Parâmetros Insuficientes"!
    *   Além disso, **Adrenalina (`adrena`, `epinefrina`) foi esquecida** tanto nos `aliases` de `dva` (linha 115) quanto no `if` da linha 244! Se o médico digitar `"adrena 70kg"`, o parser ignora completamente.
4.  **Déficit de Água Livre sem rótulo explícito (`"na 162 70kg"` ou `"agua 160 70kg"`):**
    *   Na linha 333, o parser exige que o médico escreva `na:` ou `sódio:`. Se digitar `/calc agua 160 70kg`, ele não acha o sódio e falha.
5.  **Colisão de Palavras-Chave (`identificarCalculadora`):**
    *   Como `"vaso"` é alias de `dva` e `"tep"` / `"tvp"` são aliases de `wells`, se um médico digitar `"wells paciente sem tvp com vaso dilatado"`, a ordem das palavras pode desviar o roteador.

---

### 5. 🛠️ PLANO DE CORREÇÃO IMEDIATA (ESPECIFICAÇÃO TÉCNICA PARA O ENGENHEIRO)

Entregue a especificação abaixo diretamente ao seu Engenheiro de Software. Todas as correções estão prontas para aplicação imediata:

#### PASSO 1: Em `src/02_calculadoras_puras.js`
1.  **Adicionar Sedoanalgesia Contínua e Cálculo Reverso em `DVA` / `drogasVasoativas(droga, pesoKg, solucao, doseOuVazao)`:**
    *   Incluir no objeto `DVA` e `DVA_ALIAS`:
        *   `fentanil`: Ampola 500 mcg/10 mL (puro = 50 mcg/mL ou diluído 4 amp em 160 mL = 10 mcg/mL), unidade `mcg/kg/h` (ou `mcg/h`).
        *   `midazolam`: 3 amp (150 mg/30 mL) + 120 mL SF/SG5% = `1000 mcg/mL (1 mg/mL)`, unidade `mg/kg/h`.
        *   `propofol`: Puro 1% = `10 mg/mL (10.000 mcg/mL)`, unidade `mg/kg/h` (ou `mcg/kg/min`), alerta de teto a `4 mg/kg/h` (risco de PRIS).
        *   `dexmedetomidina` (`precedex`): 2 amp (400 mcg/4 mL) + 96 mL SF 0,9% = `4 mcg/mL`, unidade `mcg/kg/h` (0,2 a 1,4 mcg/kg/h).
        *   `cetamina` (`quetamina`): 2 amp (500 mg/10 mL) + 240 mL SF/SG5% = `2 mg/mL (2000 mcg/mL)`, unidade `mg/kg/h`.
    *   Adicionar 4º parâmetro opcional `alvoEspecifico` em `drogasVasoativas`: se o usuário informar `12 ml/h`, calcular a dose exata (`dose = (mlH * conc) / (peso * 60)`); se informar `0.25 mcg/kg/min`, destacar a vazão exata no topo (`mlH = (dose * peso * 60) / conc`).
    *   Aplicar trava de peso máximo de cálculo (`pesoCalculo = Math.min(peso, 120)`) com aviso explícito quando `peso > 120 kg`.
2.  **Aplicar Trava de Dose-Teto (Cap) e Redução no Choque em `sequenciaRapidaIntubacao`:**
    *   Substituir a função interna `calcDose(farmaco)` por:
        ```javascript
        function calcDose(farmaco, chave) {
          var multDose = farmaco.dose;
          // Redução automática de segurança se Choque Hemodinâmico
          if (ctxChave === 'choque') {
            if (chave === 'etomidato') multDose = 0.2; // 0,2 mg/kg no choque
            if (chave === 'quetamina') multDose = 1.0; // 1,0 mg/kg no choque
            if (chave === 'fentanil')  multDose = 1.0; // 1,0 mcg/kg no choque
          }
          // Peso de cálculo travado em 100 kg para lipofílicos/BNM não-despolarizante e teto absoluto por fármaco
          var pesoRef = (chave === 'succinilcolina') ? peso : Math.min(peso, 100);
          var tetosMaximos = { fentanil: 200, etomidato: 30, quetamina: 200, propofol: 200, midazolam: 15, succinilcolina: 200, rocuronio: 150 };
          var dBruta = multDose * pesoRef;
          var teto = tetosMaximos[chave] || 9999;
          var d = Math.min(dBruta, teto);
          var ml = d / farmaco.conc;
          exigirFinito(d, ml);
          return {
            dose: Math.round(d * 10) / 10,
            ml: Math.round(ml * 10) / 10,
            un: farmaco.un,
            conc: farmaco.conc,
            travadoPorTeto: dBruta > teto
          };
        }
        ```
3.  **Corrigir Alerta de Teto Pediátrico em Gotas (`posologiaPediatrica`):**
    *   Remover a restrição `&& cfg.tipo !== 'gotas'` na linha 997 e adicionar alerta sempre que `doseDesejadaMg > cfg.doseMaximaPorDoseMg`.

#### PASSO 2: Em `src/02_emergencia_choque_septico_circi.js`
1.  **Adicionar Limite Fisiológico da Dose de Noradrenalina:**
    *   Na linha 14, alterar para:
        ```javascript
        if (!doseNoraMcgKgMin || isNaN(doseNoraMcgKgMin) || doseNoraMcgKgMin <= 0 || doseNoraMcgKgMin > 3.5) {
          return { erro: "Dose de Noradrenalina inválida ou fora do limite fisiológico (informe entre 0,01 e 3,5 mcg/kg/min). Se tentou informar mL/h, especifique 'ml/h'." };
        }
        ```
2.  **Incluir Avaliação de Inotrópico (Dobutamina / Adrenalina) no Choque Refratário:**
    *   Dentro do bloco `if (choqueRefratario)`, adicionar o item `4. SUPORTE INOTRÓPICO (SE DISFUNÇÃO MIOCÁRDICA / HIPOPERFUSÃO PERSISTENTE):` recomendando avaliação ecocardiográfica à beira-leito (POCUS) e associação de **Dobutamina (2,5 a 20 mcg/kg/min)** ou **Adrenalina (0,01 a 0,2 mcg/kg/min)** caso persista hipoperfusão com PAM adequada.

#### PASSO 3: Em `src/02_nefrologia_dhe.js`
1.  **Eliminar o Fallback Silencioso de 70 kg em `calcularACT` e Validar Faixas Fisiológicas:**
    *   Substituir `calcularACT`:
        ```javascript
        function calcularACT(peso, sexo, idade) {
            var p = parseFloat(peso);
            if (isNaN(p) || p < 0.5 || p > 300) return null; // Proibido assumir 70kg silenciosamente!
            var id = (idade !== undefined && idade !== null && idade !== '') ? parseFloat(idade) : 40;
            if (isNaN(id) || id < 0 || id > 120) return null;
            var s = sexo ? String(sexo).toLowerCase() : 'm';
            var fator = (s === 'f' || s === 'feminino' || s === 'mulher') ? (id >= 65 ? 0.45 : 0.5) : (id >= 65 ? 0.5 : 0.6);
            return Math.max(0.1, p * fator);
        }
        ```
    *   Em `planejarCorrecaoHiponatremia` e `calcularDeficitAguaLivre`, verificar `if (!act) return { erro: "Peso (0,5 a 300 kg) ou idade inválidos. Informe o peso real do paciente." };` e bloquear Sódio fora da faixa `90 a 220 mEq/L`.
2.  **Corrigir `avaliarHipercalemia` e Criar Manejo de Hipocalemia (`avaliarPotassio`):**
    *   Bloquear valores incompatíveis com a vida (`if (k < 1.0 || k > 15.0) return { erro: "Potássio fora da faixa biologicamente plausível (1,0 a 15,0 mEq/L). Confira o exame." };`).
    *   **Se `k < 3.5` (HIPOCALEMIA):** Redirecionar para nova função `avaliarHipocalemia(k, ecg)`:
        *   **Leve (3,0–3,4 mEq/L):** Reposição oral preferencial (Xarope KCl 6% 15–30 mL VO 8/8h ou Slow-K 600 mg 1–2 comp VO 8/8h).
        *   **Moderada/Grave (< 3,0 mEq/L ou sintomática/ECG alterado):** Reposição IV de **KCl 19,1%** (1 ampola de 10 mL = 25 mEq).
        *   **Travas Críticas de Prescrição IV:**
            *   *Acesso Venoso Periférico:* Concentração máxima **40 mEq/L** (ex: 1 ampola 10 mL KCl 19,1% = 25 mEq em 500 mL de SF 0,9% = 50 mEq/L [aceitável até 60 mEq/L]; ideal 1 amp em 500 mL SF 0,9%). Velocidade máxima periférica: **10 mEq/h** (correr 500 mL em 2,5 a 3 horas).
            *   *Acesso Venoso Central:* Concentração máxima **100 mEq/L** (ex: 2 ampolas [50 mEq] em 500 mL SF 0,9%). Velocidade máxima central: **20 mEq/h** em BIC com monitorização contínua de ECG.
            *   *Regras de Ouro:* Diluir em **SF 0,9%** (evitar SG 5% pois estimula insulina endógena e piora a hipocalemia inicialmente) e **checar/repor Magnésio concomitantemente** (Sulfato de Magnésio 50% 4 mL = 2g IV em 100 mL SF em 30 min, pois hipomagnesemia torna a hipocalemia refratária).
    *   **No bloco de Hipercalemia (`k > 5.0`):**
        *   Alterar a condição de Redistribuição Intracelular (linha 157) de `if (k > 5.5)` para **`if (k > 5.5 || ecg)`** (garantindo Solução Polarizante + Beta-2 agonista sempre que houver alteração de ECG).
        *   Adicionar alerta explícito na Solução Polarizante: *"Se glicemia capilar (HGT) ≥ 250 mg/dL, administrar APENAS Insulina Regular 10 UI IV isolada (sem SG 50%) e monitorar HGT de 1/1h."*

#### PASSO 4: Em `src/02_compatibilidade_y_dva.js`
1.  **Eliminar o Falso-Positivo de Drogas Desconhecidas (`checarCompatibilidadeY`):**
    *   Nas linhas 462–474, substituir o retorno `status: 'COMPATIVEL'` quando `!fichaA && !fichaB` por:
        ```javascript
        if (!fichaA && !fichaB) {
          return {
            ok: true,
            drogaA: idA,
            drogaB: idB,
            status: 'NAO_CATALOGADO',
            icone: '⚠️',
            grau: 'FÁRMACO NÃO CATALOGADO NA MATRIZ DE BIC · CONSULTAR FARMÁCIA',
            mecanismo: 'Um ou ambos os fármacos informados não constam na matriz determinística de infusão contínua.',
            conduta: 'NÃO assumir compatibilidade. Administrar em vias separadas ou lavar a via com SF 0,9% antes e após, ou consultar tabela Trissel/Farmácia Clínica.',
            alertaCritico: false,
            fichaA: null,
            fichaB: null
          };
        }
        ```
2.  **Regra Universal para Drogas "Proibidas em Y" (`fenitoina`, `bicarbonato_de_sodio`, `furosemida`, `anfotericina_b`, `diazepam`):**
    *   Antes de cair no fallback genérico da linha 477, adicionar uma trava automática:
        *   Se qualquer uma das drogas for `fenitoina`, `anfotericina_b` ou `diazepam` ➔ retornar imediatamente `status: 'INCOMPATIVEL'`, `alertaCritico: true` (exigem via exclusiva absoluta).
        *   Se qualquer uma for `bicarbonato_de_sodio` cruzada com `adrenalina`, `midazolam`, `fentanil`, `propofol`, `dexmedetomidina` ou `cloreto_de_potassio` ➔ retornar `status: 'INCOMPATIVEL'`, `alertaCritico: true`.
        *   Se qualquer uma for `furosemida` cruzada com `midazolam`, `fentanil`, `adrenalina`, `dexmedetomidina`, `vancomicina` ou `gentamicina` ➔ retornar `status: 'INCOMPATIVEL'`, `alertaCritico: true`.
3.  **Adicionar Antimicrobianos Críticos em `ALIASES_FARMACOS` e `REGRAS_COMPATIBILIDADE_Y`:**
    *   Incluir aliases para `piperacilina_tazobactam` (`tazocin`, `piptazo`, `piperacilina`), `vancomicina` (`vanco`), `amicacina`, `gentamicina`, `anfotericina_b`, `diazepam`, `insulina`, `cetamina`, `rocuronio`.
    *   Adicionar os pares `piperacilina_tazobactam_vancomicina` (`🛑 INCOMPATÍVEL EM Y — Precipitação física dependente de concentração; infundir em lúmens separados`), `amicacina_piperacilina_tazobactam` e `gentamicina_piperacilina_tazobactam` (`🛑 INCOMPATÍVEL EM Y — Inativação química do aminoglicosídeo pelo beta-lactâmico`).

#### PASSO 5: Em `src/07f_telegram_calculadoras_parser.js`
1.  **Expandir `CATALOGO_CALCULADORAS` e `LISTA_CALCULADORAS_DETERMINISTICAS`:**
    *   Adicionar `"sri"`, `"choque"`, `"potassio"`, `"hiponatremia"`, `"compatibilidade_y"`, `"pediatria"` na `LISTA_CALCULADORAS_DETERMINISTICAS`.
    *   No `CATALOGO_CALCULADORAS`:
        *   Em `dva.aliases`, incluir `"adrena"`, `"adrenalina"`, `"epinefrina"`, `"nipride"`, `"tridil"`, `"fentanil"`, `"midazolam"`, `"propofol"`, `"precedex"`, `"dexmedetomidina"`.
        *   Criar entradas para `choque` (aliases: `["choque", "choque septico", "circi"]`), `potassio` (aliases: `["potassio", "hipercalemia", "hipocalemia", "k", "k+"]`), `hiponatremia` (aliases: `["hiponatremia", "salina 3%", "nacl 3%", "adrogue"]`), `compatibilidade_y` (aliases: `["compatibilidade", "via em y", "em y", "y"]`).
2.  **Conectar os 5 Novos Blocos em `tentarCalcularDeterministico(texto)`:**
    *   **Bloco SRI:** Se `identidade === "sri"` ou `/\b(?:sri|intuba[çc][ãa]o|iot)\b/i.test(t)`, extrair peso com regex flexível `(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:kg)?\b` e contexto (`choque|asma|tce|padrao`) e chamar `CalculadorasClinicas.sequenciaRapidaIntubacao(peso, ctx)`.
    *   **Bloco DVA Flexível (Aceitar sem "kg" e com dose/vazão):** Na linha 245, se `matchPesoDva` for nulo, buscar o primeiro número entre `30 e 250` após o nome da droga (ex: `"nora 80 0.2"` ➔ peso = `80`, dose = `0.2`). Incluir `adrenalina`, `fentanil`, `midazolam`, `propofol`, `dexmedetomidina`.
    *   **Bloco Choque Séptico:** Se `identidade === "choque"` ou `/\bchoque\s+s[eé]ptico|circi\b/i.test(t)`, extrair peso e dose de Nora e chamar `EmergenciaChoqueSepticoService.formatarTextoTelegram(EmergenciaChoqueSepticoService.avaliarCirciEVasopressina(peso, dose))`.
    *   **Bloco Potássio (`k 6.8`, `potassio 2.5`):** Se `identidade === "potassio"` ou `/^(?:\/calc\s+)?(?:k\+?|pot[aá]ssio|hipercalemia|hipocalemia)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i.test(t)`, chamar `NefrologiaDheService.avaliarHipercalemia(kVal, /ecg|onda\s+t|alarga/i.test(t))` e formatar a resposta.
    *   **Bloco Sódio / Hiponatremia (`na 114 65kg`):** Se `/^(?:\/calc\s+)?(?:na\b|s[oó]dio|hiponatremia)\s*[:=]?\s*(\d{2,3})/i.test(t)`: se `na < 135`, chamar `NefrologiaDheService.planejarCorrecaoHiponatremia(na, peso, sexo, idade, 3)`; se `na > 145`, chamar `CalculadorasClinicas.deficitAguaLivre(na, 140, peso, perfil)`.
    *   **Bloco Compatibilidade em Y (`y nora fenta`):** Se `/^(?:\/calc\s+)?(?:y|em\s+y|compatibilidade(?:\s+em\s+y)?)\s+([a-z0-9_]+)\s+(?:e|com|\+|x|vs)?\s*([a-z0-9_]+)/i.test(t)`, chamar `CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(m[1], m[2])`.