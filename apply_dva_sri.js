const fs = require('fs');

let js = fs.readFileSync('src/02_calculadoras_puras.js', 'utf8');

js = js.replace(/var DVA = \{[\s\S]+?\n  \};\n/m, `var DVA = {
    noradrenalina: {
      nome: 'Noradrenalina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 16, vol: 250, conc: 64, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); padrão: 4 ampolas (16 mg) em 234 mL SG5% (64 mcg/mL).' },
        concentrada: { mg: 32, vol: 250, conc: 128, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); concentrada: 8 ampolas (32 mg) em 218 mL SG5% (128 mcg/mL).' }
      },
      doses: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0],
      acoes: ['Início habitual: 0,05–0,1 mcg/kg/min; titular para PAM ≥ 65 mmHg.', 'Preferir acesso venoso central. Monitorar perfusão periférica e lactato.', 'Dose máxima teórica: geralmente até 3 mcg/kg/min, porém em doses > 0,25-0,5 mcg/kg/min considere associar Vasopressina.'],
      aviso: '⚠️ ALERTA: Doses acima de 1,0 mcg/kg/min representam vasoplegia severa. Considere associação precoce de Vasopressina (0,03 UI/min) e avaliação de CIRCI (corticoide).'
    },
    dobutamina: {
      nome: 'Dobutamina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 250, vol: 250, conc: 1000, ref: 'Ampola: 250 mg/20 mL; padrão: 1 ampola (250 mg) em 230 mL SG5% (1000 mcg/mL).' }
      },
      doses: [2.5, 5, 10, 15, 20],
      acoes: ['Início habitual: 2,5–5 mcg/kg/min; titular até 20 mcg/kg/min.', 'Monitorar taquiarritmias, isquemia miocárdica e hipotensão.', 'Não usar como vasopressor (pode causar vasodilatação periférica inicial).'],
      aviso: 'Doses > 20 mcg/kg/min aumentam expressivamente o consumo miocárdico de oxigênio (MVO2) e o risco de arritmias.'
    },
    nitroprussiato: {
      nome: 'Nitroprussiato de sódio', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/2 mL; padrão: 1 ampola (50 mg) em 248 mL SG5% (200 mcg/mL, envolver em fotoprotetor).' }
      },
      doses: [0.3, 0.5, 1, 2, 3, 5, 10],
      acoes: ['Início habitual: 0,3–0,5 mcg/kg/min; titular a cada 3-5 minutos com linha arterial.', 'Dose máxima recomendada: 10 mcg/kg/min (por no máximo 10 minutos).'],
      aviso: '⚠️ RISCO DE TOXICIDADE: Uso > 48h ou doses altas ou Insuficiência Renal/Hepática têm risco elevado de toxicidade por cianeto/tiocianato (acidose metabólica, confusão mental).'
    },
    nitroglicerina: {
      nome: 'Nitroglicerina', unidade: 'mcg/min', peso: false, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/10 mL; padrão: 1 ampola (50 mg) em 240 mL SG5% ou SF0.9% (200 mcg/mL).' }
      },
      doses: [5, 10, 20, 30, 50, 100, 200],
      acoes: ['Início habitual: 5–10 mcg/min; titular a cada 5–10 min (incrementos de 5-10 mcg/min).', 'Dose máxima habitual: 200 mcg/min.'],
      aviso: '⚠️ CONTRAINDICAÇÕES FORMAIS: Infarto de Ventrículo Direito (VD), PAS < 90 mmHg, uso de inibidores da fosfodiesterase-5 (Sildenafila < 24h ou Tadalafila < 48h).'
    },
    vasopressina: {
      nome: 'Vasopressina', unidade: 'UI/min', peso: false, conc: 'UI/mL',
      preparos: {
        padrao: { mg: 20, vol: 100, conc: 0.2, ref: 'Ampola: 20 UI/1 mL; padrão: 1 ampola (20 UI) em 99 mL SG5% ou SF (0,2 UI/mL).' }
      },
      doses: [0.01, 0.02, 0.03, 0.04],
      acoes: ['Dose fixa: 0,03 a 0,04 UI/min (SSC 2021) = 9 a 12 mL/h. NÃO titular como catecolaminas.', 'Iniciar como 2ª linha quando noradrenalina estiver em 0,25–0,5 mcg/kg/min para poupar catecolamina e melhorar perfusão esplâncnica.'],
      aviso: 'Não titular como catecolamina. Infusão contínua fixa de 0,03 ou 0,04 UI/min.'
    },
    adrenalina: {
      nome: 'Adrenalina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 4, vol: 250, conc: 16, ref: 'Ampola: 1 mg/1 mL; padrão: 4 ampolas (4 mg) em 246 mL SG5% (16 mcg/mL).' },
        concentrada: { mg: 8, vol: 250, conc: 32, ref: 'Ampola: 1 mg/1 mL; concentrada: 8 ampolas (8 mg) em 242 mL SG5% (32 mcg/mL).' }
      },
      doses: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0],
      acoes: ['Início habitual (inotrópico/cronotrópico): 0,01 a 0,1 mcg/kg/min. Como vasopressor: > 0,1 mcg/kg/min.', 'Aumenta consideravelmente o lactato sérico (efeito metabólico beta-2 adrenérgico de glicólise, e não necessariamente hipoperfusão).'],
      aviso: 'Doses maiores causam taquicardia severa e hiperlactatemia metabólica tipo B que pode confundir a avaliação de perfusão.'
    }
  };\n`);

// Update SRI_FARMACOS
js = js.replace(/var SRI_FARMACOS = \{[\s\S]+?\n  \};\n/m, `var SRI_FARMACOS = {
    etomidato:      { nome: 'Etomidato',      dose: 0.3, un: 'mg', conc: 2,  txt: '0,3 mg/kg · 2 mg/mL (ampola 20mg/10mL)',  grupo: 'indutor', contra: 'Evitar em sepse se suspeita de insuficiência adrenal aguda, risco de supressão adrenal transitória.' },
    quetamina:      { nome: 'Quetamina',      dose: 1.5, un: 'mg', conc: 50, txt: '1,5 mg/kg · 50 mg/mL (ampola 50mg/mL)', grupo: 'indutor', contra: 'Broncodilatador (ideal em asma). Evitar em hipertensão craniana severa ou glaucoma sem uso prévio de opioide.' },
    propofol:       { nome: 'Propofol 1%',    dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (ampola 1%)',        grupo: 'indutor', contra: 'Hipotensor potente. Reduzir dose pela metade em choque hemodinâmico ou senilidade.' },
    midazolam:      { nome: 'Midazolam',      dose: 0.2, un: 'mg', conc: 5,  txt: '0,2 mg/kg · 5 mg/mL (ampola 5mg/mL)',   grupo: 'indutor', contra: 'Depressor miocárdico e venodilatador. Evitar em choque descompensado.' },
    rocuronio:      { nome: 'Rocurônio',      dose: 1.2, un: 'mg', conc: 10, txt: '1,2 mg/kg · 10 mg/mL (frasco 50mg/5mL)', grupo: 'bloqueador', contra: 'Ação em ~45-60s. Escolha de excelência. Reversível com Sugamadex.' },
    succinilcolina: { nome: 'Succinilcolina', dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (frasco 100mg/10mL)', grupo: 'bloqueador', contra: '⚠️ CONTRAINDICADA em: Hipercalemia (> 5.5), grandes queimados, esmagamento, miopatias, paralisia/AVC > 48h (risco de PCR por hipercalemia). Teto máximo: 200 mg.' },
    fentanil:       { nome: 'Fentanil',       dose: 2.0, un: 'mcg',conc: 50, txt: '2 mcg/kg · 50 mcg/mL (ampola 50mcg/mL)',  grupo: 'adjuvante', contra: 'Pico de ação em 3-5 min. Atenua reflexo simpático da laringoscopia.' }
  };\n`);

fs.writeFileSync('src/02_calculadoras_puras.js', js);
console.log('Done calculadoras puras SRI/DVA');
