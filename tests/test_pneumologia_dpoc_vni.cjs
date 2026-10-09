const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Carregar o módulo
const srcPath = path.join(__dirname, '..', 'src', '02_pneumologia_dpoc_vni.js');
const code = fs.readFileSync(srcPath, 'utf8');
const context = vm.createContext({ module: {} });
vm.runInContext(code, context);
const PneumologiaDpocVniService = context.module.exports || context.PneumologiaDpocVniService;

function runTests() {
    console.log("Executando testes para PneumologiaDpocVniService...");

    // Teste 1: Indicação clássica de VNI (Acidose Respiratória)
    let res1 = PneumologiaDpocVniService.avaliarVni({
        ph: "7.28",
        pco2: "65",
        po2: "55",
        fr: "30",
        uso_musculatura_acessoria: true
    });
    assert.strictEqual(res1.indicacao, true);
    assert.strictEqual(res1.contraindicacao_absoluta, false);
    assert.ok(res1.criterios_indicacao.some(c => c.includes("Acidose respiratória")));
    
    // Teste 2: Contraindicação absoluta (Choque)
    let res2 = PneumologiaDpocVniService.avaliarVni({
        ph: "7.15",
        pco2: "80",
        instabilidade_hemodinamica: true
    });
    assert.strictEqual(res2.indicacao, false);
    assert.strictEqual(res2.contraindicacao_absoluta, true);
    assert.ok(res2.contraindicacoes.some(c => c.includes("Instabilidade hemodinâmica")));

    // Teste 3: Alerta Crítico de Acidemia
    let res3 = PneumologiaDpocVniService.avaliarVni({
        ph: "7.18",
        pco2: "75",
        fr: "35"
    });
    assert.strictEqual(res3.indicacao, true);
    assert.ok(res3.alertas.some(a => a.includes("Acidemia severa (pH < 7.20)")));

    // Teste 4: Formatação de Texto Telegram
    let texto = PneumologiaDpocVniService.formatarTextoTelegram(res1);
    assert.ok(texto.includes("INDICAÇÃO CONFIRMADA DE VNI"));
    assert.ok(texto.includes("PARÂMETROS INICIAIS SUGERIDOS"));
    assert.ok(texto.includes("BiPAP"));

    console.log("Todos os testes passaram com sucesso.");
}

runTests();
