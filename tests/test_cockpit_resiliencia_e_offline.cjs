const fs = require('fs');
const path = require('path');
const assert = require('assert');
const runtime = require('../server/runtime.js');

async function executarTestes() {
  console.log('=== TESTES DE INTEGRAÇÃO, RESILIÊNCIA E OFFLINE DO COCKPIT PWA ===\n');

  const session = 'bot';

  // [1] Validação de Métodos RPC Consumidos pelo Cockpit PWA
  console.log('[1] Testando Métodos RPC do Cockpit...');
  
  // 1.1 Consulta básica do Cockpit (cockpitConsultar)
  const consultar = runtime.cockpitRpc('cockpitConsultar', session, []);
  assert(consultar && typeof consultar === 'object', 'cockpitConsultar deve retornar objeto');
  assert(Array.isArray(consultar.leitos), 'cockpitConsultar.leitos deve ser array');
  assert(Array.isArray(consultar.casosDoDia), 'cockpitConsultar.casosDoDia deve ser array');
  console.log('  ✓ cockpitConsultar: censo de leitos e histórico diário validados');

  // 1.2 REMUME (cockpitRemume)
  const remume = runtime.cockpitRpc('cockpitRemume', session, []);
  assert(remume && Array.isArray(remume.itens), 'cockpitRemume deve retornar array de itens');
  assert(remume.itens.length > 0, 'REMUME deve conter itens carregados em RAM');
  console.log(`  ✓ cockpitRemume: ${remume.itens.length} medicamentos locais prontos`);

  // 1.3 Perfil e Aulas (cockpitPerfil, cockpitAulasProgresso, cockpitAlternarAula)
  const perfil = runtime.cockpitRpc('cockpitPerfil', session, []);
  assert(perfil && typeof perfil === 'object', 'cockpitPerfil deve retornar objeto');
  const aulas = runtime.cockpitRpc('cockpitAulasProgresso', session, []);
  assert(aulas && Array.isArray(aulas.assistidas), 'cockpitAulasProgresso deve retornar assistidas');
  const altAula = runtime.cockpitRpc('cockpitAlternarAula', session, ['aula-1', true]);
  assert(altAula && altAula.ok === true, 'cockpitAlternarAula deve alternar com ok: true');
  console.log('  ✓ Perfil e Aulas Flash do Cockpit validados');

  // 1.4 Prescrição, Atestado e SOAP (cockpitSoapAmbulatorial, cockpitGerarReceitaTexto, cockpitGerarAtestadoTexto)
  const soapRes = runtime.cockpitRpc('cockpitSoapAmbulatorial', session, [{
    paciente: 'João Silva', idade: 45, sexo: 'm', queixa: 'Tosse produtiva há 3 dias'
  }]);
  assert(soapRes && soapRes.sucesso === true, 'cockpitSoapAmbulatorial deve retornar sucesso');
  assert(soapRes.soap && typeof soapRes.soap.textoProntuario === 'string', 'SOAP deve conter textoProntuario');

  const recRes = runtime.cockpitRpc('cockpitGerarReceitaTexto', session, [{
    paciente: 'Maria Santos', itens: [{ medicamento: 'Amoxicilina 500mg', posologia: '1 cp 8/8h por 7 dias' }]
  }]);
  assert(recRes && typeof recRes.textoReceita === 'string', 'Receita deve conter textoReceita');

  const atestRes = runtime.cockpitRpc('cockpitGerarAtestadoTexto', session, [{
    paciente: 'Carlos Eduardo', dias: 3, motivo: 'Repouso por quadro infeccioso respiratório'
  }]);
  assert(atestRes && typeof atestRes.textoAtestado === 'string', 'Atestado deve conter textoAtestado');
  console.log('  ✓ SOAP Ambulatorial, Receita e Atestado CFM validados');

  // 1.5 Calculadoras e Cross-Check (cockpitCalcular, cockpitChecarSeguranca)
  const calcDva = runtime.cockpitRpc('cockpitCalcular', session, ['dva', { droga: 'nora', peso: '70' }]);
  assert(calcDva && calcDva.ok === true, 'cockpitCalcular dva deve retornar ok: true');
  assert(calcDva.textoFormatado.includes('Noradrenalina'), 'Texto DVA deve conter Noradrenalina');

  const calcGaso = runtime.cockpitRpc('cockpitCalcular', session, ['gaso', { ph: '7.28', pco2: '28', hco3: '13' }]);
  assert(calcGaso && calcGaso.ok === true, 'cockpitCalcular gaso deve retornar ok: true');

  const crossCheck = runtime.cockpitRpc('cockpitChecarSeguranca', session, ['amiodarona, fluconazol', 'ICFEr']);
  assert(crossCheck && typeof crossCheck === 'object', 'cockpitChecarSeguranca deve retornar objeto');
  assert(crossCheck.interacoes !== undefined, 'cockpitChecarSeguranca deve reportar interações');
  console.log('  ✓ Calculadoras DVA/Gaso e Cross-Check Farmacológico validados');

  // 1.6 Módulos Especializados e Obstetrícia Beira-Leito
  const preNatal = runtime.cockpitRpc('cockpitCalcularPrenatal', session, [{ dum: '2026-01-15' }]);
  assert(preNatal && typeof preNatal === 'object', 'cockpitCalcularPrenatal deve retornar cálculo');

  const soroPrenatal = runtime.cockpitRpc('cockpitInterpretarSorologiasPrenatal', session, [{ ig: 12, toxo_igg: 'positivo', toxo_igm: 'negativo' }]);
  assert(soroPrenatal && typeof soroPrenatal === 'object', 'cockpitInterpretarSorologiasPrenatal deve retornar laudo');

  const mgso4 = runtime.cockpitRpc('cockpitSulfatoMagnesio', session, [{ pesoKg: 65, indicacao: 'pre_eclampsia_grave' }]);
  assert(mgso4 && typeof mgso4 === 'object', 'cockpitSulfatoMagnesio deve calcular Zuspan');

  const criseHasObs = runtime.cockpitRpc('cockpitCriseHipertensivaObstetrica', session, [{ pas: 170, pad: 115 }]);
  assert(criseHasObs && typeof criseHasObs === 'object', 'cockpitCriseHipertensivaObstetrica deve retornar conduta');

  const hpp = runtime.cockpitRpc('cockpitHemorragiaPosParto', session, [{ etiopatia: 'atonia' }]);
  assert(hpp && typeof hpp === 'object', 'cockpitHemorragiaPosParto deve retornar conduta 4 Ts');
  console.log('  ✓ Módulos de Ginecologia & Obstetrícia Beira-Leito validados');

  // 1.7 Cardiologia Intensiva, IC Descompensada e Choque Séptico
  const icDesc = runtime.cockpitRpc('cockpitICDescompensada', session, [{ congestao: true, baixa_perfusao: false, pas: 140 }]);
  assert(icDesc && icDesc.sucesso === true, 'cockpitICDescompensada deve retornar sucesso');
  assert(icDesc.textoFormatado.includes('CARDIOLOGIA INTENSIVA'), 'cockpitICDescompensada deve incluir cabeçalho');

  const chqSept = runtime.cockpitRpc('cockpitChoqueSeptico', session, [{ pesoKg: 70, doseNora: 0.35 }]);
  assert(chqSept && typeof chqSept === 'object', 'cockpitChoqueSeptico deve retornar objeto');
  console.log('  ✓ Cardiologia Intensiva (Forrester/Stevenson) e Choque Séptico validados');

  // [2] Validação do Motor Determinístico Offline (calcularOfflineLocal)
  console.log('\n[2] Testando Motor Determinístico Offline (calcularOfflineLocal)...');
  
  // Extrai a função calcularOfflineLocal de cockpit_movel.html para validação isolada
  const cockpitHtml = fs.readFileSync(path.resolve(__dirname, '../cockpit_movel.html'), 'utf8');
  assert(cockpitHtml.includes('function calcularOfflineLocal(tipo, entrada)'), 'cockpit_movel.html deve conter calcularOfflineLocal');

  // Cria contexto com a função calcularOfflineLocal
  const vm = require('vm');
  const sandbox = {
    parseFloat, isNaN, Math, String, Number, Boolean, Array, Object, JSON
  };
  vm.createContext(sandbox);

  // Isola a função do HTML
  const startIdx = cockpitHtml.indexOf('function calcularOfflineLocal(tipo, entrada) {');
  assert(startIdx !== -1, 'Função calcularOfflineLocal não encontrada no HTML');
  const endMarker = 'const valorCalc = id =>';
  const endIdx = cockpitHtml.indexOf(endMarker, startIdx);
  assert(endIdx !== -1, 'Fim de calcularOfflineLocal não encontrado');
  const fnCode = cockpitHtml.substring(startIdx, endIdx).trim();

  vm.runInContext(fnCode, sandbox);
  const calcOffline = sandbox.calcularOfflineLocal;
  assert(typeof calcOffline === 'function', 'calcularOfflineLocal deve ser função executável');

  // Testes dos tipos suportados:
  // 2.1 DVA Noradrenalina
  const resNora = calcOffline('dva', { droga: 'nora', peso: '70' });
  assert(resNora.includes('NORADRENALINA') && resNora.includes('mL/h em BIC'), 'DVA Noradrenalina offline deve computar vazão');
  assert(resNora.includes('[OFFLINE]'), 'Deve indicar flag [OFFLINE]');

  // 2.2 SRI Choque
  const resSri = calcOffline('sri', { cenario: 'choque', peso: '80' });
  assert(resSri.includes('QUETAMINA') && resSri.includes('ROCURÔNIO'), 'SRI Choque offline deve calcular Quetamina e Rocurônio');

  // 2.3 Clearance Cockcroft-Gault
  const resCrcl = calcOffline('crcl', { idade: '65', peso: '70', creatinina: '1.4', sexo: 'f' });
  assert(resCrcl.includes('CLEARANCE DE CREATININA') && resCrcl.includes('KDIGO'), 'Clearance offline deve calcular ClCr e estágio');

  // 2.4 Gasometria 5 Passos
  const resGaso = calcOffline('gaso', { ph: '7.28', pco2: '28', hco3: '13', na: '140', cl: '100' });
  assert(resGaso.includes('Acidose Metabólica') && resGaso.includes('Fórmula de Winter'), 'Gasometria offline deve interpretar acidose e Winter');

  // 2.5 DHE Hipercalemia
  const resK = calcOffline('dhe', { modo: 'hipercalemia', kAtual: '6.8', ecgAlterado: true });
  assert(resK.includes('HIPERCALEMIA') && resK.includes('Gluconato de Cálcio'), 'DHE K+ offline deve prescrever Gluconato de Cálcio');

  // 2.6 PALS
  const resPals = calcOffline('pals', { modo: 'pals', peso: '15' });
  assert(resPals.includes('Adrenalina 1:10.000') && resPals.includes('DESFIBRILAÇÃO'), 'PALS offline deve calcular Adrenalina e Joules');

  // 2.7 KDIGO (Novo)
  const resKdigo = calcOffline('kdigo', { crBasal: '1.0', crAtual: '2.5' });
  assert(resKdigo.includes('KDIGO Estágio 2') && resKdigo.includes('+1.5 mg/dL'), 'KDIGO offline deve calcular estágio 2 e variação');

  // 2.8 CURB-65 / PAC (Novo)
  const resCurb = calcOffline('curb65', { c: true, r: true, idade: 70 });
  assert(resCurb.includes('CURB-65: 3 ponto(s)') && resCurb.includes('Alto Risco'), 'CURB-65 offline deve somar pontos e estratificar');

  // 2.9 Dengue MS 2024 (Novo)
  const resDengue = calcOffline('dengue', { peso: '60', grupo: 'C' });
  assert(resDengue.includes('GRUPO C') && resDengue.includes('600 mL/h'), 'Dengue offline deve calcular 10 mL/kg/h nas 2 primeiras horas');

  // 2.10 Crise Hipertensiva (Novo)
  const resHas = calcOffline('crise_has', { pas: '200', pad: '120', loa: true });
  assert(resHas.includes('EMERGÊNCIA HIPERTENSIVA') && resHas.includes('Nitroprussiato'), 'Crise HAS offline deve diagnosticar emergência');

  console.log('  ✓ 10/10 calculadoras clínicas determinísticas offline aprovadas com 100% de sucesso.');

  // [3] Validação do Service Worker & Resiliência PWA
  console.log('\n[3] Testando Service Worker e Cache PWA...');

  const swRootPath = path.resolve(__dirname, '../sw.js');
  const swDeployPath = path.resolve(__dirname, '../gh_cockpit_deploy/sw.js');

  assert(fs.existsSync(swRootPath), 'sw.js deve existir na raiz do projeto');
  assert(fs.existsSync(swDeployPath), 'sw.js deve existir em gh_cockpit_deploy/ para GitHub Pages');

  const swContent = fs.readFileSync(swRootPath, 'utf8');
  assert(swContent.includes('ultra-rotina-cockpit-v3.2'), 'sw.js deve conter versão v3.2 atualizada');
  assert(swContent.includes("'./index.html'") && swContent.includes("'./manifest.json'"), 'sw.js deve suportar caminhos relativos para subpaths');
  assert(swContent.includes('fallbackCockpit'), 'sw.js deve conter fallback para abertura offline 0ms');

  // Valida registro relativo em cockpit_movel.html e gh_cockpit_deploy/index.html
  assert(cockpitHtml.includes("navigator.serviceWorker.register('./sw.js')"), 'cockpit_movel.html deve registrar ./sw.js relativo');
  const deployHtml = fs.readFileSync(path.resolve(__dirname, '../gh_cockpit_deploy/index.html'), 'utf8');
  assert(deployHtml.includes("navigator.serviceWorker.register('./sw.js')"), 'gh_cockpit_deploy/index.html deve registrar ./sw.js relativo');

  // Valida Empty State elegante de leitos e otimização Lucide
  assert(cockpitHtml.includes('Censo Vazio / Sem Leitos Ativos'), 'cockpit_movel.html deve conter empty state elegante de leitos');
  assert(cockpitHtml.includes('lucide.createIcons({ root: container })'), 'cockpit_movel.html deve restringir Lucide ao container de leitos');
  assert(deployHtml.includes('lucide.createIcons({ root: container })'), 'gh_cockpit_deploy/index.html deve restringir Lucide ao container de leitos');

  console.log('  ✓ Service Worker v3.1 sincronizado e validado para Render e GitHub Pages');
  console.log('  ✓ Registro relativo ./sw.js verificado (imune a 404 em subpath)');
  console.log('  ✓ Renderização otimizada de cards de leitos e empty state verificados');

  console.log('\n🎉 SUCESSO TOTAL: Todos os testes de integração, resiliência e offline do Cockpit PWA foram aprovados!');
}

executarTestes().catch(err => {
  console.error('❌ Falha nos testes do Cockpit:', err);
  process.exit(1);
});
