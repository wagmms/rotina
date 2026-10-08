// Regressões do código de produção em VM isolada: nenhuma credencial ou rede.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function env() {
  const props = {}, cache = {};
  const c = { console, Buffer,
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => props, getProperty: k => props[k] || null, setProperty: (k,v) => {props[k]=v;}, deleteProperty: k => {delete props[k];} }) },
    CacheService: { getScriptCache: () => ({get: k => cache[k] || null, put: (k,v) => {cache[k]=v;}, remove: k => {delete cache[k];} }) },
    UrlFetchApp: { fetch() { throw Error('Rede proibida neste teste'); } }
  };
  vm.createContext(c);
  for (const file of fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), c, { filename: file });
  }
  c.Utilities.getUuid = () => 'audit-20261008-00000000000000000000';
  c.obterPlanilha = () => 'PARACETAMOL 200 mg/mL';
  return c;
}
let count = 0, failures = 0;
function test(name, run) {
  try { run(); count++; console.log('OK ' + name); }
  catch(e) { failures++; process.exitCode = 1; console.error('FALHA ' + name + ': ' + e.message); }
}
const c = env(), calc = c.CalculadorasClinicas;
test('fármaco explícito prevalece sobre febre e dor', () => {
  for (const drug of ['paracetamol', 'ibuprofeno', 'dipirona']) {
    const r = calc.calcularPosologiaPorTextoLivre(drug + ' criança 20kg com dor e febre');
    assert.equal(r.chave, drug);
  }
});
test('sintomas, diagnósticos e termos desconhecidos não elegem tratamento', () => {
  for (const input of ['hidratação criança 20kg', 'amigdalite 15kg', 'rinite 5 anos', 'dor e febre 15kg', 'diplopia 20kg']) {
    assert.equal(calc.calcularPosologiaPorTextoLivre(input), null, input);
    assert.equal(calc.posologiaPediatrica(20, input).ok, false, input);
  }
});
test('múltiplos fármacos não viram um único cálculo obrigatório', () => {
  assert.equal(calc.calcularPosologiaPorTextoLivre('dipirona e paracetamol 20kg'), null);
  assert.equal(calc.calcularPosologiaPorTextoLivre('amoxicilina clavulanato 20kg').chave, 'amoxicilina_clavulanato');
});
test('negação, alergia e valores conflitantes não recebem esquema automático', () => {
  for (const input of ['não usar paracetamol 20kg', 'alergia a dipirona 20kg', 'amoxicilina 10kg, corrigindo 20kg']) assert.equal(calc.calcularPosologiaPorTextoLivre(input), null);
});
test('idade e peso ausentes não são inventados', () => {
  for (const input of ['loratadina', 'polaramine', 'nitazoxanida', 'amoxicilina']) assert.equal(calc.calcularPosologiaPorTextoLivre(input), null, input);
  const r = calc.calcularPosologiaPorTextoLivre('dexclorfeniramina 8 anos');
  assert.equal(r.pesoKg, null);
  assert.equal(r.idadeAnos, 8);
  assert.equal(r.volumePorTomadaMl, 2.5);
});
test('dose por idade não é alterada pelo peso', () => {
  assert.equal(calc.calcularPosologiaPorTextoLivre('dexclorfeniramina 8 anos 15kg').volumePorTomadaMl, 2.5);
  assert.equal(calc.calcularPosologiaPorTextoLivre('nitazoxanida 6 anos 12kg').volumePorTomadaMl, 10);
});
test('loratadina preserva a faixa de peso até 12 anos inclusive', () => {
  assert.equal(calc.calcularPosologiaPorTextoLivre('loratadina 12 anos 30kg').dosePorTomadaMg, 5);
  assert.equal(calc.calcularPosologiaPorTextoLivre('loratadina 12 anos 31kg').dosePorTomadaMg, 10);
  assert.equal(calc.calcularPosologiaPorTextoLivre('loratadina 13 anos').pesoKg, null);
});
test('lactente, peso inválido e adulto não recebem cálculo pediátrico automático', () => {
  for (const input of ['loratadina 18 meses 10kg', 'paracetamol 0kg', 'amoxicilina 81kg', 'amoxicilina 30 anos 60kg']) assert.equal(calc.calcularPosologiaPorTextoLivre(input), null, input);
});
test('choques diferentes, sintomas e hipóteses ambíguas não recebem protocolo de sepse', () => {
  for (const input of ['choque anafilático', 'choque hemorrágico', 'choque', 'dor torácica', 'descartar sepse', 'sepse e TEP']) assert.equal(c.obterProtocoloClinico(input), null, input);
});
test('negação não contamina o cenário positivo seguinte', () => {
  assert.match(c.obterProtocoloClinico('sem sepse, crise de asma').titulo, /Asma/);
  assert.match(c.obterProtocoloClinico('choque séptico').titulo, /Sepse/);
  assert.match(c.obterProtocoloClinico('infarto').titulo, /Coronariana/);
  assert.equal(c.obterProtocoloClinico('meteprazol'), null);
});
test('medidas equivalentes são preservadas e medidas novas são sinalizadas', () => {
  const out = c.sanitizarObjetivoComRelato('PA 120/80; FC 80 bpm; FR 20 irpm; SpO2 98%; Abdome doloroso.', 'PA 120x80, FC 80, FR 20. Abdome doloroso.');
  assert.match(out, /120\/80/);
  assert.match(out, /80 bpm/);
  assert.match(out, /20 irpm/);
  assert.match(out, /Abdome doloroso/);
  assert.ok(!out.includes('98'));
  assert.match(out, /não confirmada/);
  assert.equal(c.sanitizarObjetivoComRelato('PA 120/80 mmHg', 'PA 120x80'), 'PA 120/80 mmHg');
});
test('negativas não relatadas não entram como fato', () => {
  assert.ok(!c.sanitizarNegativasSOAP('Nega alergias medicamentosas conhecidas.', 'Paciente com tosse.').includes('Nega'));
  assert.match(c.sanitizarNegativasSOAP('Nega alergias.', 'Nega alergias.'), /Nega alergias/);
});
test('SOAP final conserva dez itens e revisa com a mesma base do gerador', () => {
  const e = env(); let gerador, auditor;
  e.filtrarContextoPosologiasHSL = () => 'CONTRAINDICAÇÃO TESTE HSL';
  e.executarRaciocinioClinico = sistema => {
    gerador = sistema;
    return JSON.stringify({subjetivo:'Nega alergias.', objetivo:'PA 120/80.', avaliacao:['Hipótese'], plano:Array.from({length:10},(_,i)=>'Medida '+(i+1))});
  };
  e._iaExecutar = (sistema, contexto, tokens, opts) => { auditor = {contexto, opts}; return 'SEM ALERTAS'; };
  const out = e.gerarSOAPComIA('Paciente com tosse', {fecharPlano:true});
  assert.ok(out.includes('Medida 10'));
  assert.ok(!out.includes('120/80'));
  assert.ok(!out.includes('Nega alergias'));
  assert.ok(gerador.includes('CONTRAINDICAÇÃO TESTE HSL'));
  assert.ok(auditor.contexto.includes('CONTRAINDICAÇÃO TESTE HSL'));
  assert.equal(auditor.opts.clinico, true);
});
test('SOAP mantém aviso quando a revisão está indisponível', () => {
  const e=env();
  e.executarRaciocinioClinico=()=>JSON.stringify({subjetivo:'Tosse',objetivo:'Pendente',plano:['Orientar retorno']});
  e._iaExecutar=()=>null;
  assert.match(e.gerarSOAPComIA('Tosse',{fecharPlano:true}), /Auditoria automática indisponível/);
});
test('áudio usa a mesma barreira para medidas e negativas', () => {
  const e=env();
  e.chamarGeminiPoolMultimodal=()=>JSON.stringify({transcricao:'Paciente com tosse',eh_clinico:true,tipo_relato:'soap',subjetivo:'Nega alergias.',objetivo:'PA 120/80; FC 70 bpm'});
  const out=e.processarAudioClinicoMultimodal('fake','audio/ogg').soapTexto;
  assert.ok(!out.includes('120/80'));
  assert.ok(!out.includes('70 bpm'));
  assert.ok(!out.includes('Nega alergias'));
});
test('extração reconhece títulos em texto, sobrescritos e HTML', () => {
  const {parseSecoesDose}=require('../scripts/extrair_guia_hsl');
  for(const input of ['Adulto¹\nDose adulta\nPediatria¹,²\nRestrição etária\nDose máxima\nLimite\nAjuste de dose\nAjuste renal', '<p><b>Adulto</b></p><p>Dose adulta</p><p><b>Pediatria</b></p><p>Restrição etária</p>']) {
    const r=parseSecoesDose(input);
    assert.equal(r.adulto,'Dose adulta');
    assert.equal(r.pediatria,'Restrição etária');
  }
});
test('normalização HSL preserva texto original e separa restrições pediátricas', () => {
  const raw={farnaco:'FÁRMACO',dose_adulto:'Adulto¹\nDose A\nPediatria¹\nNão recomendado abaixo da idade X',dose_pediatria:'',posologia_completa:'Adulto¹\nDose A\nPediatria¹\nNão recomendado abaixo da idade X'};
  const med=c.normalizarSecoesGuiaHSL([raw])[0];
  assert.equal(med.dose_adulto,'Dose A');
  assert.match(med.dose_pediatria,/Não recomendado/);
  assert.equal(med.posologia_completa,raw.posologia_completa);
  assert.equal(raw.dose_pediatria,'');
  assert.match(c.formatarFichaPosologicaHSL({farnaco:'SEM CAMPO'}),/não localizada na extração/);
});
test('contexto preserva contraindicações, diluição e gestação', () => {
  const e=env();
  e.__BASE_GUIA_HSL__={medicamentos:[{id:1,farnaco:'PARACETAMOL',nome_normalizado:'PARACETAMOL',na_remume:true,dose_adulto:'Dose A',contraindicacoes:'Restrição X',gestacao_lactacao:'Avaliar Y',preparo_diluicao:'Diluição Z',dose_maxima:'Limite W'}]};
  const out=e.filtrarContextoPosologiasHSL('paracetamol');
  for(const text of ['Restrição X','Avaliar Y','Diluição Z','Limite W','não comprova estoque']) assert.ok(out.includes(text),text);
});
test('fontes ficam internas por padrão e podem ser solicitadas', () => {
  const e=env(); e.EXECUCAO_ATUAL={};
  const answer={texto:'Conduta clínica.',modelo:'modelo-teste',groundingMetadata:{groundingChunks:[{web:{uri:'https://example.org/diretriz',title:'Diretriz'}}]}};
  e._iaProvGemini=()=>answer;
  assert.equal(e.chamarGeminiPoolComGrounding('sistema','caso'), 'Conduta clínica.');
  assert.equal(e.EXECUCAO_ATUAL.fontesClinicas[0].groundingMetadata.groundingChunks[0].web.uri,'https://example.org/diretriz');
  assert.match(e.chamarGeminiPoolComGrounding('sistema','caso',2000,{exibirFontes:true}),/https:\/\/example.org/);
});
test('HTTP 429/500 contam como erro sem alterar resposta nem registrar conteúdo', () => {
  const {measureLegacyHttp}=require('../server/telemetry');
  for(const code of [200,429,500]) {
    const response={getResponseCode:()=>code}, ctx={UrlFetchApp:{fetch:()=>response}}, metrics={};
    assert.equal(measureLegacyHttp(ctx,metrics,()=>ctx.UrlFetchApp.fetch('https://api.groq.com/privado')),response);
    assert.equal(metrics.groq.errors,code>=400?1:0);
    assert.ok(!JSON.stringify(metrics).includes('privado'));
  }
});
test('autotestes matemáticos permanecem aprovados', () => assert.equal(calc.autoTeste().length,0));
console.log(count + ' grupos aprovados; ' + failures + ' falhas. Isto não substitui avaliação clínica com respostas reais.');
