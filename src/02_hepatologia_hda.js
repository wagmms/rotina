/**
 * ==============================================================================
 * MÓDULO 02: HEPATOLOGIA CLÍNICA E HEMORRAGIA DIGESTIVA ALTA (HDA)
 * ==============================================================================
 * Diretrizes Clínicas Oficiais:
 *  - AASLD / EASL Guidelines for Management of Portal Hypertension and Variceal Bleeding
 *  - Sociedade Brasileira de Hepatologia (SBH)
 *
 * PILARES CLÍNICOS DETERMINÍSTICOS:
 *  1. Escore MELD / MELD-Na (Model for End-Stage Liver Disease) e Child-Pugh:
 *     - Classificação de gravidade e ajuste posológico.
 *  2. Protocolo Ágil de Manejo de HDA Varicosa:
 *     - IBP IV Contínuo (Esomeprazol ou Pantoprazol: 80 mg bolus seguido de 8 mg/h contínuo).
 *     - Fármacos vasoativos: Terlipressina (2 mg IV bolus 4/4h inicial) ou Octreotide (50 mcg bolus + 50 mcg/h).
 *     - Profilaxia de PBE: Ceftriaxona 1g IV 1x/dia por 7 dias (máx).
 *     - Restrição volêmica (alvo PAS 90-100 mmHg; HR < 100).
 *     - Gatilhos transfusionais (alvo Hb 7-8 g/dL).
 */

const HepatologiaHdaService = (function() {

  function calcularChildPugh(bilirrubina, albumina, inr, ascite, encefalopatia) {
    let pontos = 0;
    
    // Bilirrubina (mg/dL)
    if (bilirrubina < 2.0) pontos += 1;
    else if (bilirrubina <= 3.0) pontos += 2;
    else pontos += 3;

    // Albumina (g/dL)
    if (albumina > 3.5) pontos += 1;
    else if (albumina >= 2.8) pontos += 2;
    else pontos += 3;

    // INR
    if (inr < 1.7) pontos += 1;
    else if (inr <= 2.2) pontos += 2;
    else pontos += 3;

    // Ascite (0=ausente, 1=leve/controlada, 2=moderada/tensa)
    if (ascite === 0) pontos += 1;
    else if (ascite === 1) pontos += 2;
    else pontos += 3;

    // Encefalopatia (0=ausente, 1=grau 1-2, 2=grau 3-4)
    if (encefalopatia === 0) pontos += 1;
    else if (encefalopatia === 1) pontos += 2;
    else pontos += 3;

    let classe = '';
    let sobrevida1ano = '';
    let sobrevida2anos = '';
    if (pontos <= 6) { classe = 'A'; sobrevida1ano = '100%'; sobrevida2anos = '85%'; }
    else if (pontos <= 9) { classe = 'B'; sobrevida1ano = '80%'; sobrevida2anos = '60%'; }
    else { classe = 'C'; sobrevida1ano = '45%'; sobrevida2anos = '35%'; }

    return { pontos, classe, sobrevida1ano, sobrevida2anos };
  }

  function calcularMeldNa(bilirrubina, inr, creatinina, sodio, dialise) {
    // Limits
    let cr = Math.max(1.0, creatinina);
    if (cr > 4.0 || dialise) cr = 4.0;
    
    let bil = Math.max(1.0, bilirrubina);
    let myInr = Math.max(1.0, inr);
    
    // Original MELD (UNOS formula)
    let meldOriginal = (3.78 * Math.log(bil)) + (11.2 * Math.log(myInr)) + (9.57 * Math.log(cr)) + 6.43;
    meldOriginal = Math.round(meldOriginal);
    
    if (meldOriginal < 11) {
        return { meldOriginal: meldOriginal, meldNa: meldOriginal };
    }

    let na = sodio;
    if (na < 125) na = 125;
    if (na > 137) na = 137;

    // MELD-Na formula
    let meldNa = meldOriginal - na - (0.025 * meldOriginal * (140 - na)) + 140;
    meldNa = Math.round(meldNa);

    return { meldOriginal, meldNa };
  }

  function manejarHdaVaricosa(peso, estabilidadeHemodinamica, contraindicacaoTerlipressina) {
    let t = [];
    
    t.push("💊 *Protocolo de HDA Varicosa (Hemorragia Digestiva Alta)*");
    t.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Ressuscitação e Metas
    t.push("💧 *1. Ressuscitação e Metas Hemodinâmicas:*");
    if (estabilidadeHemodinamica === false) {
       t.push(" • Acesso venoso duplo e calibroso. Iniciar ressuscitação volêmica cuidadosa.");
    }
    t.push(" • **Restrição de Cristaloides:** Evitar sobrecarga (risco de rebote de hipertensão portal). Alvo de PAS 90-100 mmHg.");
    t.push(" • **Transfusão Restritiva:** Transfundir CHAD apenas se Hb < 7 g/dL (alvo Hb 7 a 8 g/dL).");
    t.push("");

    // Fármaco Vasoativo
    t.push("🩸 *2. Droga Vasoativa (Iniciar IMEDIATAMENTE, antes da EDA):*");
    if (!contraindicacaoTerlipressina) {
       let doseTerli = (peso && peso < 50) ? "1 mg" : "2 mg";
       t.push(` • **Terlipressina:** ${doseTerli} IV em bolus a cada 4 horas (primeiras 24-48h).`);
       t.push("   ↳ _Alerta:_ Monitorar isquemia miocárdica/periférica e hiponatremia.");
    } else {
       t.push(" • **Octreotide:** 50 mcg IV em bolus, seguido de infusão contínua de 50 mcg/h.");
       t.push("   ↳ _(Indicado devido à contraindicação ou indisponibilidade de Terlipressina)_");
    }
    t.push("");

    // Profilaxia Infecciosa
    t.push("🦠 *3. Profilaxia para PBE (Peritonite Bacteriana Espontânea):*");
    t.push(" • **Ceftriaxona:** 1g IV a cada 24 horas (máx 7 dias).");
    t.push("   ↳ _Obrigatório em todo cirrótico com sangramento TGI, reduz mortalidade e ressangramento._");
    t.push("");

    // IBP
    t.push("💊 *4. Supressão Ácida (IBP):*");
    t.push(" • **Pantoprazol ou Esomeprazol:** 80 mg IV em bolus (2 ampolas).");
    t.push(" • Seguida de infusão contínua de 8 mg/h por 72h (ou 40 mg IV de 12/12h se infusão não disponível).");
    t.push("");

    // EDA
    t.push("🔬 *5. Endoscopia Digestiva Alta (EDA):*");
    t.push(" • Deve ser realizada em **< 12 horas** da admissão.");
    t.push(" • Considerar Eritromicina 250mg IV 30-120 min antes para esvaziamento gástrico (se disponível).");

    return t.join("\n");
  }

  function avaliarHepatopatia(params) {
    let p = params || {};
    let t = [];
    
    if (p.bilirrubina !== undefined && p.albumina !== undefined && p.inr !== undefined && p.ascite !== undefined && p.encefalopatia !== undefined) {
      const child = calcularChildPugh(p.bilirrubina, p.albumina, p.inr, p.ascite, p.encefalopatia);
      t.push(`📊 *Escore de Child-Pugh:* ${child.pontos} pontos (Classe ${child.classe})`);
      t.push(` • Sobrevida estimada: ${child.sobrevida1ano} (1 ano) / ${child.sobrevida2anos} (2 anos).`);
      
      if (child.classe === 'C') {
         t.push(" ⚠️ *Atenção:* Insuficiência hepática grave. Ajustar rigorosamente doses de medicações de metabolismo hepático.");
      }
      t.push("");
    }

    if (p.bilirrubina !== undefined && p.inr !== undefined && p.creatinina !== undefined && p.sodio !== undefined) {
      const meld = calcularMeldNa(p.bilirrubina, p.inr, p.creatinina, p.sodio, p.dialise || false);
      t.push(`📈 *Escore MELD-Na:* ${meld.meldNa}`);
      t.push(` • MELD Original: ${meld.meldOriginal}`);
      t.push(` • Reflete a mortalidade em 3 meses e indica prioridade para transplante hepático.`);
      t.push("");
    }

    if (p.hda) {
      t.push(manejarHdaVaricosa(p.peso || 70, p.estabilidadeHemodinamica, p.contraindicacaoTerlipressina));
    }

    return t.join("\n").trim();
  }

  return {
    calcularChildPugh: calcularChildPugh,
    calcularMeldNa: calcularMeldNa,
    manejarHdaVaricosa: manejarHdaVaricosa,
    avaliarHepatopatia: avaliarHepatopatia
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HepatologiaHdaService;
  module.exports.HepatologiaHdaService = HepatologiaHdaService;
}
