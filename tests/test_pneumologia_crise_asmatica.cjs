const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const scriptPath = path.join(__dirname, '../src/02_pneumologia_crise_asmatica.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

const context = {};
vm.createContext(context);
vm.runInContext(scriptCode, context);

const PneumologiaCriseAsmaticaService = context.PneumologiaCriseAsmaticaService;

function runTests() {
    let pass = 0, fail = 0;

    function test(name, fn) {
        try {
            fn();
            pass++;
            console.log(`[PASS] ${name}`);
        } catch (e) {
            fail++;
            console.error(`[FAIL] ${name}`);
            console.error(e);
        }
    }

    // 1. Crise Leve a Moderada
    test('Crise Leve a Moderada - Estratificação e Prescrição', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            fala: 'frases_completas',
            posicao: 'sentado',
            estado_mental: 'calmo',
            musculatura_acessoria: 'ausente',
            fc: 105,
            fr: 22,
            spo2: 94,
            pfe: 350,
            pfe_previsto: 500, // 70%
            ausculta: 'sibilos_expiratorios'
        });

        assert.strictEqual(res.gravidade.nivel, 'LEVE_MODERADA');
        assert.ok(res.gravidade.titulo.includes('Leve a Moderada'));
        assert.strictEqual(res.gravidade.pfe_porcentagem, 70);
        assert.ok(res.plano.broncodilatacao_saba.opcao_preferencial.includes('4 a 10 jatos'));
        assert.ok(res.plano.corticoide_sistemico.oral.includes('Prednisona ou Prednisolona 40 a 50 mg'));
        assert.strictEqual(res.plano.anticolinergico_ipratropio.indicado, false, 'Ipratrópio não deve ser rotina na leve inicial');
        assert.strictEqual(res.plano.sulfato_magnesio.indicado, false, 'Sulfato de Magnésio não deve ser indicado na leve');
    });

    // 2. Crise Asmática Grave
    test('Crise Asmática Grave - Tripé, Palavras e Dessaturação', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            fala: 'palavras_isoladas',
            posicao: 'tripe',
            estado_mental: 'agitado',
            musculatura_acessoria: 'acentuada',
            fc: 130,
            fr: 34,
            spo2: 88,
            pfe_porcentagem: 40,
            ausculta: 'sibilos_difusos'
        });

        assert.strictEqual(res.gravidade.nivel, 'GRAVE');
        assert.ok(res.gravidade.titulo.includes('Grave'));
        assert.strictEqual(res.plano.anticolinergico_ipratropio.indicado, true, 'Ipratrópio é mandatório na crise grave');
        assert.ok(res.plano.anticolinergico_ipratropio.posologia.includes('40 gotas') || res.plano.anticolinergico_ipratropio.posologia.includes('0.5 mg'));
        assert.strictEqual(res.plano.sulfato_magnesio.indicado, true, 'Sulfato de Magnésio deve ser preparado/indicado para crise grave');
        assert.ok(res.plano.oxigenoterapia.alvo_spo2.includes('93% a 95%'));
    });

    // 3. Ameaça à Vida / Parada Iminente com Tórax Silencioso
    test('Parada Iminente - Tórax Silencioso e Exaustão', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            ausculta: 'torax_silencioso',
            estado_mental: 'sonolento',
            respiracao_paradoxal: true,
            fc: 50, // bradicardia por fadiga
            fr: 10,
            spo2: 82
        });

        assert.strictEqual(res.gravidade.nivel, 'PARADA_IMINENTE');
        assert.ok(res.gravidade.titulo.includes('AMEAÇA À VIDA'));
        assert.strictEqual(res.plano.sulfato_magnesio.indicado, true);
        assert.ok(res.plano.sulfato_magnesio.dose.includes('2,0 g'));
        assert.ok(res.plano.resgate_adjuvante !== null, 'Deve ter adrenalina IM de resgate no estado de mal com tórax silencioso');
        assert.ok(res.plano.resgate_adjuvante.farmaco.includes('Adrenalina'));
        assert.ok(res.plano.manejo_ventilatorio.sequencia_rapida_intubacao.inducao_escolha.includes('KETAMINA'));
        assert.ok(res.plano.manejo_ventilatorio.parametros_ventilador_protetor.conduta_colapso_pos_iot.includes('DESCONECTAR O PACIENTE DO VENTILADOR'));
    });

    // 4. Gasometria com PaCO2 Normal/Alta em Crise Aguda (Fadiga Muscular)
    test('Alerta Gasométrico Crítico - PaCO2 normal em crise de asma é sinal pré-parada', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            fc: 125,
            fr: 30,
            spo2: 91,
            gasometria: { ph: 7.28, paco2: 44, pao2: 60 }
        });

        assert.strictEqual(res.gravidade.nivel, 'PARADA_IMINENTE');
        assert.ok(res.gravidade.criterios_ameaca_vida.some(c => c.includes('PaCO2 normal ou elevada')));
    });

    // 5. Crise Refratária pós-1ª hora
    test('Crise Refratária pós-1h - Indicação Oportuna de Sulfato de Magnésio 2g IV', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            refratario_1h: true,
            spo2: 91,
            fc: 118,
            fr: 28,
            pfe_porcentagem: 48
        });

        assert.strictEqual(res.plano.sulfato_magnesio.indicado, true);
        assert.ok(res.plano.sulfato_magnesio.dose.includes('2,0 g'));
        assert.ok(res.plano.sulfato_magnesio.tempo_infusao.includes('20 minutos'));
    });

    // 6. Cenário Pediátrico
    test('Manejo Pediátrico - Doses ajustadas por peso e idade', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            idade: 5,
            pesoKg: 18,
            faixa_etaria: 'pediatrico',
            fc: 145,
            fr: 38,
            spo2: 91,
            musculatura_acessoria: 'acentuada',
            fala: 'palavras_isoladas'
        });

        assert.strictEqual(res.gravidade.nivel, 'GRAVE');
        assert.ok(res.plano.broncodilatacao_saba.opcao_preferencial.includes('4 a 6 jatos'));
        assert.strictEqual(res.plano.anticolinergico_ipratropio.indicado, true);
        assert.ok(res.plano.anticolinergico_ipratropio.posologia.includes('20 gotas') || res.plano.anticolinergico_ipratropio.posologia.includes('0.25 mg'));
        assert.ok(res.plano.corticoide_sistemico.oral.includes('Prednisolona'));
        assert.strictEqual(res.plano.sulfato_magnesio.indicado, true);
        assert.ok(res.plano.sulfato_magnesio.dose.includes('900 mg') || res.plano.sulfato_magnesio.dose.includes('50 mg/kg'));
    });

    // 7. Bloqueios de Segurança Clínicos
    test('Bloqueios de Segurança - Bloqueio de Sedativos e Antibióticos', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            spo2: 89,
            fc: 125,
            fr: 32
        });

        assert.ok(res.plano.bloqueios_seguranca.length >= 3);
        assert.ok(res.plano.bloqueios_seguranca[0].includes('CONTRAINDICAÇÃO FORMAL') && res.plano.bloqueios_seguranca[0].includes('sedativos'));
        assert.ok(res.plano.bloqueios_seguranca[1].includes('ANTIBIÓTICOS'));
        assert.ok(res.plano.bloqueios_seguranca[2].includes('MUCOLÍTICOS'));
    });

    // 8. Critérios de Destino e Prescrição de Alta
    test('Critérios de Destino e Prescrição de Alta Estruturada', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({ spo2: 95, fr: 18, fc: 80 });
        const dest = res.plano.criterios_destino;
        assert.ok(dest.alta_emergencia.criterios.some(c => c.includes('PFE') && c.includes('70%')));
        assert.ok(dest.alta_emergencia.prescricao_alta.some(p => p.includes('Prednisona')));
        assert.ok(dest.alta_emergencia.prescricao_alta.some(p => p.includes('Corticoide Inalatório')));
        assert.ok(dest.alta_emergencia.prescricao_alta.some(p => p.includes('Salbutamol Spray')));
        assert.ok(dest.internacao_uti.criterios.some(c => c.includes('Sulfato de Magnésio')));
    });

    // 9. Formatação de Texto Telegram
    test('Formatação Telegram - Contém seções essenciais', () => {
        const res = PneumologiaCriseAsmaticaService.avaliarCriseAsmatica({
            ausculta: 'torax_silencioso',
            estado_mental: 'sonolento'
        });
        const txt = PneumologiaCriseAsmaticaService.formatarTextoTelegram(res);
        assert.ok(txt.includes('PNEUMOLOGIA & EMERGÊNCIA'));
        assert.ok(txt.includes('ESTRATIFICAÇÃO DE GRAVIDADE'));
        assert.ok(txt.includes('SINAIS DE AMEAÇA À VIDA'));
        assert.ok(txt.includes('SULFATO DE MAGNÉSIO 2G IV'));
        assert.ok(txt.includes('ESTRATÉGIA VENTILATÓRIA & IOT PROTETORA'));
        assert.ok(txt.includes('BLOQUEIOS DE SEGURANÇA'));
    });

    console.log(`\nResultados Pneumologia Crise Asmática: ${pass} pass, ${fail} fail`);
    if (fail > 0) process.exit(1);
}

runTests();
