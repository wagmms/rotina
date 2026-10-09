const assert = require('assert');
const { IaLocalFallbackService } = require('../src/04_ia_local_fallback');
const runtime = require('../server/runtime');

function runTests() {
  console.log('Iniciando suite de testes: IA Generativa Local (Llama 3 / Mistral) e Fallback Clínico Offline');

  // ---------------------------------------------------------------------------
  // Teste 1: Catálogo de Modelos Homologados
  // ---------------------------------------------------------------------------
  const modelos = IaLocalFallbackService.MODELOS_HOMOLOGADOS_LOCAL;
  assert.ok(Array.isArray(modelos), 'Modelos locais devem ser um array');
  assert.ok(modelos.some(m => m.includes('llama3')), 'Deve incluir modelo Llama 3');
  assert.ok(modelos.some(m => m.includes('mistral')), 'Deve incluir modelo Mistral');
  console.log('✓ Teste 1: Catálogo de modelos homologados Llama 3 e Mistral validado.');

  // ---------------------------------------------------------------------------
  // Teste 2: Identificação de Protocolo Clínico - PCR em Adulto (ACLS)
  // ---------------------------------------------------------------------------
  const protoPcr = IaLocalFallbackService.identificarProtocoloClinico('Paciente em parada cardiorrespiratoria com ritmo de fibrilacao ventricular (FV)');
  assert.ok(protoPcr, 'Deve identificar protocolo de PCR');
  assert.strictEqual(protoPcr.titulo.includes('PARADA CARDIORRESPIRATÓRIA'), true);
  
  const condutaPcr = protoPcr.gerarConduta('FV');
  assert.ok(condutaPcr.includes('200 J'), 'Deve conter carga de desfibrilação 200J');
  assert.ok(condutaPcr.includes('Adrenalina 1 mg IV/IO'), 'Deve prescrever Adrenalina 1mg');
  assert.ok(condutaPcr.includes('Amiodarona 300 mg'), 'Deve prescrever Amiodarona 300mg no 3º choque');
  assert.ok(condutaPcr.includes('5Hs e 5Ts'), 'Deve listar 5Hs e 5Ts para ritmos não chocáveis');
  console.log('✓ Teste 2: Protocolo determinístico de PCR Adulto (ACLS) validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 3: PCR em Gestante (ACLS Materno, DULE e Cesariana Perimortem)
  // ---------------------------------------------------------------------------
  const protoPcrGest = IaLocalFallbackService.identificarProtocoloClinico('Gestante 32 semanas em parada cardiorrespiratoria no pronto socorro');
  assert.ok(protoPcrGest, 'Deve identificar PCR em gestante');
  const condutaPcrGest = protoPcrGest.gerarConduta('gestante 32 semanas');
  assert.ok(condutaPcrGest.includes('DULE'), 'Deve exigir manobra DULE contínua');
  assert.ok(condutaPcrGest.includes('NUNCA inclinar a prancha ou o leito a 30 graus'), 'Alerta contra inclinação de 30 graus');
  assert.ok(condutaPcrGest.includes('acima do diafragma'), 'Acesso venoso obrigatório acima do diafragma');
  assert.ok(condutaPcrGest.includes('CESARIANA PERIMORTEM'), 'Deve orientar cesariana perimortem no 4º-5º minuto');
  console.log('✓ Teste 3: Protocolo determinístico de PCR em Gestante e DULE validado.');

  // ---------------------------------------------------------------------------
  // Teste 4: Choque Séptico e Bundle de 1 Hora (ILAS / SSC)
  // ---------------------------------------------------------------------------
  const protoSepse = IaLocalFallbackService.identificarProtocoloClinico('Paciente com choque septico de foco pulmonar, PAM 55 mmHg e lactato elevado');
  assert.ok(protoSepse, 'Deve identificar choque séptico');
  const condutaSepse = protoSepse.gerarConduta('lactato');
  assert.ok(condutaSepse.includes('Lactato sérico'), 'Deve exigir dosagem de lactato');
  assert.ok(condutaSepse.includes('hemoculturas'), 'Deve exigir hemoculturas antes do antibiótico');
  assert.ok(condutaSepse.includes('30 mL/kg'), 'Expansão volêmica com 30 mL/kg de Ringer Lactato');
  assert.ok(condutaSepse.includes('Noradrenalina'), 'Vasopressor de escolha Noradrenalina');
  assert.ok(condutaSepse.includes('PAM >= 65 mmHg'), 'Meta terapêutica PAM >= 65 mmHg');
  console.log('✓ Teste 4: Choque séptico e bundle de 1 hora validado com sucesso.');

  // ---------------------------------------------------------------------------
  // Teste 5: Choque Anafilático e Adrenalina Imediata
  // ---------------------------------------------------------------------------
  const protoAnafilaxia = IaLocalFallbackService.identificarProtocoloClinico('Reacao anafilatica grave com estridor, hipotensao e broncoespasmo');
  assert.ok(protoAnafilaxia, 'Deve identificar anafilaxia');
  const condutaAnaf = protoAnafilaxia.gerarConduta('anafilaxia');
  assert.ok(condutaAnaf.includes('ADRENALINA (1:1.000 / 1 mg/mL) INTRAMUSCULAR'), 'Adrenalina IM imediata');
  assert.ok(condutaAnaf.includes('vasto lateral da coxa'), 'Local obrigatório no vasto lateral');
  assert.ok(condutaAnaf.includes('0,5 mg'), 'Dose adulto de 0,5 mg IM');
  assert.ok(condutaAnaf.includes('5 a 15 minutos'), 'Repetição a cada 5-15 min se refratário');
  console.log('✓ Teste 5: Choque anafilático e posologia de adrenalina intramuscular validados.');

  // ---------------------------------------------------------------------------
  // Teste 6: Síndrome Coronariana Aguda (SCA / IAM com supra)
  // ---------------------------------------------------------------------------
  const protoIam = IaLocalFallbackService.identificarProtocoloClinico('Dor toracica tipica em aperto ha 1 hora com supra de ST no eletrocardiograma');
  assert.ok(protoIam, 'Deve identificar IAM');
  const condutaIam = protoIam.gerarConduta('supra ST');
  assert.ok(condutaIam.includes('10 minutos'), 'Porta-ECG < 10 minutos');
  assert.ok(condutaIam.includes('AAS'), 'Duplo antiplaquetário com AAS');
  assert.ok(condutaIam.includes('Ticagrelor') || condutaIam.includes('Clopidogrel'), 'Inibidor P2Y12 Ticagrelor ou Clopidogrel');
  assert.ok(condutaIam.includes('CONTRAINDICAÇÕES ABSOLUTAS DO NITRATO'), 'Deve listar contraindicações do nitrato');
  console.log('✓ Teste 6: Protocolo de SCA / IAM e duplo bloqueio plaquetário validado.');

  // ---------------------------------------------------------------------------
  // Teste 7: AVC Isquêmico e Janela de Trombólise
  // ---------------------------------------------------------------------------
  const protoAvc = IaLocalFallbackService.identificarProtocoloClinico('Deficit motor subito a esquerda e afasia com suspeita de avc isquêmico');
  assert.ok(protoAvc, 'Deve identificar AVC isquêmico');
  const condutaAvc = protoAvc.gerarConduta('avc');
  assert.ok(condutaAvc.includes('4,5 HORAS'), 'Janela terapêutica de 4,5h');
  assert.ok(condutaAvc.includes('PAS < 185 mmHg e PAD < 110 mmHg'), 'Alvo pressórico pré-trombólise');
  assert.ok(condutaAvc.includes('0,9 mg/kg'), 'Dose de Alteplase 0,9 mg/kg');
  console.log('✓ Teste 7: Protocolo de AVC isquêmico e trombólise validado.');

  // ---------------------------------------------------------------------------
  // Teste 8: Cetoacidose Diabética (CAD) e Regra de Ouro do Potássio
  // ---------------------------------------------------------------------------
  const protoCad = IaLocalFallbackService.identificarProtocoloClinico('Paciente diabetico tipo 1 em cetoacidose diabetica com glicemia 420 e halito cetonico');
  assert.ok(protoCad, 'Deve identificar CAD');
  const condutaCad = protoCad.gerarConduta('cetoacidose');
  assert.ok(condutaCad.includes('1.000 mL/hora'), 'Hidratação inicial vigorosa 1000 mL/h');
  assert.ok(condutaCad.includes('NUNCA iniciar insulina se K+ sérico < 3,3 mEq/L'), 'Regra crítica do potássio');
  assert.ok(condutaCad.includes('0,1 U/kg/hora'), 'Insulina regular 0,1 U/kg/h em bomba');
  console.log('✓ Teste 8: Cetoacidose diabética e salvaguardas de potássio validadas.');

  // ---------------------------------------------------------------------------
  // Teste 9: Pré-Eclâmpsia Grave e Esquema Zuspan
  // ---------------------------------------------------------------------------
  const protoPe = IaLocalFallbackService.identificarProtocoloClinico('Gestante 34 semanas com pre eclampsia grave, PA 170x115 mmHg e cefaleia');
  assert.ok(protoPe, 'Deve identificar pré-eclâmpsia grave');
  const condutaPe = protoPe.gerarConduta('pre eclampsia');
  assert.ok(condutaPe.includes('Esquema Zuspan'), 'Deve indicar Esquema Zuspan');
  assert.ok(condutaPe.includes('4 g IV lento em 20 minutos'), 'Dose de ataque do sulfato de magnésio 4g');
  assert.ok(condutaPe.includes('1 g/hora IV'), 'Dose de manutenção 1g/h contínua');
  assert.ok(condutaPe.includes('Gluconato de Cálcio 10%'), 'Antídoto em caso de toxicidade');
  assert.ok(condutaPe.includes('Hidralazina') || condutaPe.includes('Nifedipino'), 'Controle pressórico de emergência');
  console.log('✓ Teste 9: Pré-eclâmpsia grave e neuroproteção Zuspan validados.');

  // ---------------------------------------------------------------------------
  // Teste 10: Doença Inflamatória Pélvica (DIP) e Monif
  // ---------------------------------------------------------------------------
  const protoDip = IaLocalFallbackService.identificarProtocoloClinico('Mulher com dor pelvica, febre e suspeita de doenca inflamatoria pelvica');
  assert.ok(protoDip, 'Deve identificar DIP');
  const condutaDip = protoDip.gerarConduta('dip');
  assert.ok(condutaDip.includes('Ceftriaxona 500 mg IM'), 'Esquema ambulatorial Monif I');
  assert.ok(condutaDip.includes('Doxiciclina 100 mg VO'), 'Doxiciclina oral 14 dias');
  assert.ok(condutaDip.includes('Metronidazol 500 mg VO'), 'Metronidazol oral 14 dias');
  assert.ok(condutaDip.includes('Monif II a IV'), 'Internação mandatória em peritonite ou abscesso');
  console.log('✓ Teste 10: Protocolo de DIP e estadiamento de Monif validados.');

  // ---------------------------------------------------------------------------
  // Teste 11: Saída Completa de Resposta Offline com Cabeçalho e Rodapé
  // ---------------------------------------------------------------------------
  const respOfflineCompleta = IaLocalFallbackService.gerarRespostaOfflineClinica(
    'Você é médico de emergência.',
    'Paciente em PCR ritmo de FV'
  );
  assert.ok(respOfflineCompleta.includes('MODO OFFLINE DE CONTINGÊNCIA'), 'Deve conter cabeçalho de modo offline');
  assert.ok(respOfflineCompleta.includes('PARADA CARDIORRESPIRATÓRIA'), 'Deve conter corpo da conduta');
  assert.ok(respOfflineCompleta.includes('Conduta baseada em diretrizes clínicas oficiais'), 'Deve conter rodapé com referências');
  console.log('✓ Teste 11: Resposta completa de contingência offline gerada com formatação adequada.');

  // ---------------------------------------------------------------------------
  // Teste 12: Estruturação JSON Heurística Offline
  // ---------------------------------------------------------------------------
  const jsonOfflinePcr = JSON.parse(IaLocalFallbackService.estruturarJsonOffline('', 'paciente em choque e parada cardiaca na sala vermelha'));
  assert.strictEqual(jsonOfflinePcr.intencao, 'CLINICO_EMERGENCIA');
  assert.strictEqual(jsonOfflinePcr.modoOffline, true);

  const jsonOfflineGaso = JSON.parse(IaLocalFallbackService.estruturarJsonOffline('', 'gasometria arterial com pH 7.22 e pCO2 28'));
  assert.strictEqual(jsonOfflineGaso.intencao, 'CLINICO_GASO');

  const jsonOfflineRx = JSON.parse(IaLocalFallbackService.estruturarJsonOffline('', 'prescrever receita de amoxicilina e dipirona'));
  assert.strictEqual(jsonOfflineRx.intencao, 'CLINICO_RX');
  console.log('✓ Teste 12: Estruturação JSON offline e classificação heurística de intenções validadas.');

  // ---------------------------------------------------------------------------
  // Teste 13: Diagnóstico de Status de Saúde da IA Local
  // ---------------------------------------------------------------------------
  const statusLocal = IaLocalFallbackService.verificarStatus({ timeoutMs: 50 });
  assert.ok(typeof statusLocal.online === 'boolean', 'Deve retornar booleano para online');
  assert.strictEqual(statusLocal.fallbackOfflinePronto, true, 'Fallback offline deve estar sempre pronto');
  assert.ok(Array.isArray(statusLocal.modelosDisponiveis), 'Deve listar modelos disponíveis');
  console.log('✓ Teste 13: Verificação de status e prontidão de fallback local validada.');

  // ---------------------------------------------------------------------------
  // Teste 14: Integração RPC Cockpit - cockpitLocalLlm (Status)
  // ---------------------------------------------------------------------------
  const rpcStatus = runtime.cockpitRpc('cockpitLocalLlm', { usuario: 'medico_test' }, [{ acao: 'status' }]);
  assert.ok(rpcStatus, 'Deve responder ao método RPC cockpitLocalLlm');
  assert.strictEqual(rpcStatus.fallbackOfflinePronto, true, 'RPC deve reportar fallbackOfflinePronto');
  assert.ok(Array.isArray(rpcStatus.protocolosOffline), 'Deve listar chaves de protocolos offline');
  assert.ok(rpcStatus.protocolosOffline.includes('PCR_ADULTO'), 'Deve listar PCR_ADULTO');
  console.log('✓ Teste 14: RPC cockpitLocalLlm (ação status) validado.');

  // ---------------------------------------------------------------------------
  // Teste 15: Integração RPC Cockpit - cockpitIaLocalFallback
  // ---------------------------------------------------------------------------
  const rpcFallback = runtime.cockpitRpc('cockpitIaLocalFallback', { usuario: 'medico_test' }, [{
    prompt: 'Gestante 30 semanas com pré-eclâmpsia grave e iminência de eclâmpsia'
  }]);
  assert.strictEqual(rpcFallback.sucesso, true);
  assert.strictEqual(rpcFallback.modoOffline, true);
  assert.ok(rpcFallback.resposta.includes('Esquema Zuspan'), 'Deve conter protocolo Zuspan na resposta');
  console.log('✓ Teste 15: RPC cockpitIaLocalFallback executado e validado com sucesso.');

  console.log('\n🚀 TODOS OS 15 TESTES DE IA LOCAL E FALLBACK OFFLINE PASSARAM COM SUCESSO!\n');
}

runTests();
