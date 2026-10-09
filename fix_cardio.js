const fs = require('fs');

let js = fs.readFileSync('src/02_cardiologia_emergencia.js', 'utf8');

// strip the mess I appended
js = js.split('// =================================================================================\n    // PARADA CARDIORRESPIRATÓRIA (ACLS - Adulto)')[0];

// insert functions before return {
js = js.replace(/    return \{\n        avaliarRiscoSCA/, `
    function aclsAdulto() {
        var justificativas = [];
        var condutasRitmo = [
            "🔴 RITMOS CHOCÁVEIS (FV / TV sem pulso):",
            "1. RCP de alta qualidade imediata (30:2) até o desfibrilador estar pronto.",
            "2. CHOQUE (Carga Bifásica: 120-200J; Monofásica: 360J).",
            "3. Reiniciar RCP por 2 minutos IMEDIATAMENTE após o choque (sem checar pulso).",
            "4. Acesso IV/IO. Adrenalina 1 mg a cada 3 a 5 minutos.",
            "5. Amiodarona (1ª dose 300 mg IV em bolus; 2ª dose 150 mg após 3-5 min) OU Lidocaína (1 a 1,5 mg/kg 1ª dose; 0,5 a 0,75 mg/kg 2ª dose) em FV/TV refratária.",
            "",
            "🔴 RITMOS NÃO CHOCÁVEIS (Assistolia / AESP):",
            "1. RCP de alta qualidade IMEDIATA.",
            "2. Acesso IV/IO e Adrenalina 1 mg IMEDIATA assim que acesso disponível.",
            "3. RCP por 2 minutos e repetir Adrenalina a cada 3 a 5 minutos.",
            "4. TRATAR CAUSAS REVERSÍVEIS (5Hs e 5Ts)."
        ];
        
        var causasReversiveis = [
            "H - Hipovolemia (infundir Ringer ou SF rápido)",
            "H - Hipóxia (IOT, FiO2 100%)",
            "H - Hidrogênio / Acidose (bicarbonato se acidose grave preexistente)",
            "H - Hipocalemia / Hipercalemia (Cálcio IV em hipercalemia, repor K em hipo)",
            "H - Hipotermia (reaquecimento ativo)",
            "T - Tensão no tórax / Pneumotórax (descompressão por agulha ou dreno)",
            "T - Tamponamento cardíaco (pericardiocentese)",
            "T - Toxinas (antídotos específicos)",
            "T - Trombose pulmonar (Trombolítico em parada presenciada TEP)",
            "T - Trombose coronariana (Angioplastia pós-RCE)"
        ];

        return {
            ok: true,
            titulo: 'ACLS 2024/2025: Algoritmo de Parada Cardiorrespiratória (Adulto)',
            ritmos: condutasRitmo,
            causas: causasReversiveis,
            justificativas: justificativas
        };
    }

    function criseHipertensiva() {
        var justificativas = [
            "Diretrizes SBC (2020) - Avaliação beira-leito de PA severa (PA ≥ 180/110 mmHg)"
        ];
        
        var urgencia = [
            "🟡 URGÊNCIA HIPERTENSIVA (PA Elevada SEM lesão de órgão-alvo [LOA]):",
            "- Clínica: Assintomático, cefaleia leve, ansiedade, epistaxe.",
            "- ERRO COMUM: Não reduzir agressivamente a PA na urgência.",
            "- Conduta: Repouso de 30-60 min num ambiente calmo. Evitar medicações sublinguais (Captopril/Nifedipina) devido à queda brusca imprevisível e risco de AVC isquêmico.",
            "- Retorno gradual (24 a 48h) a valores de PA basal, ajustando a terapia anti-hipertensiva oral crônica (Captopril 25-50 mg VO ou Clonidina 0,1-0,2 mg VO)."
        ];
        
        var emergencia = [
            "🔴 EMERGÊNCIA HIPERTENSIVA (PA Elevada COM lesão de órgão-alvo em curso):",
            "- Clínica: Encefalopatia hipertensiva, AVCi/AVEh, EAP, SCA, Dissecção Aórtica, Eclâmpsia.",
            "- METAS DE REDUÇÃO (Regra Geral): Reduzir PAM em 20-25% na 1ª hora. ALVOS ESPECÍFICOS:",
            "  • Dissecção de Aorta: PAS < 120 e FC < 60 em 20 min (Nitroprussiato + Esmolol/Metoprolol).",
            "  • AVE Hemorrágico: PAS 140 mmHg no máximo na 1ª hora (Labetalol / Nitroprussiato).",
            "  • EAP: Nitroprussiato IV e Nitroglicerina IV.",
            "  • Eclâmpsia: PAS < 160, PAD < 105 (Hidralazina IV ou Metildopa).",
            "- Medicamentos: Nitroprussiato de Sódio IV (vasodilatador direto, 0,3 mcg/kg/min), Nitroglicerina IV (venodilatador 5 mcg/min)."
        ];

        return {
            ok: true,
            titulo: 'Manejo Beira-Leito da Crise Hipertensiva',
            urgencia: urgencia,
            emergencia: emergencia,
            justificativas: justificativas
        };
    }

    return {
        aclsAdulto: aclsAdulto,
        criseHipertensiva: criseHipertensiva,
        avaliarRiscoSCA`);

fs.writeFileSync('src/02_cardiologia_emergencia.js', js);
console.log('Fixed cardio emergencia');
