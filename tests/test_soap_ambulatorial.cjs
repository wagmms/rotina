/**
 * Suíte de Testes Clínicos e Funcionais do Módulo SOAP Ambulatorial Ágil
 * Atenção Primária, Consultório, Estratificação de Risco SBC/SBD e Atestados CFM.
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../server/runtime');

let aprovados = 0;
let total = 0;

function test(nome, fn) {
  total++;
  try {
    fn();
    console.log(`✅ APROVADO: ${nome}`);
    aprovados++;
  } catch (err) {
    console.error(`❌ FALHOU: ${nome} :: ${err.message}`);
    process.exitCode = 1;
  }
}

const ctx = runtime.ctx;
const SoapAmbulatorialService = ctx.SoapAmbulatorialService;

// =============================================================================
// 1. VALIDAÇÃO DOS PARÂMETROS E VALORES DE REFERÊNCIA
// =============================================================================
test('1. Valores de referência de sinais vitais ambulatoriais são fidedignos', () => {
  assert(SoapAmbulatorialService, 'SoapAmbulatorialService deve existir no contexto');
  const ref = SoapAmbulatorialService.VALORES_REFERENCIA;
  assert(ref.pa.otima.includes('120/80'), 'PA ótima deve ser < 120/80');
  assert(ref.pa.has_estagio_1.includes('140-159'), 'HAS estágio 1 deve ser 140-159');
  assert(ref.fc.normal.includes('60 a 100'), 'FC normal deve ser 60-100');
  assert(ref.fr.normal.includes('12 a 20'), 'FR normal deve ser 12-20');
  assert(ref.spo2.normal.includes('>= 95%'), 'SpO2 normal deve ser >= 95%');
  assert(ref.tax.afebril.includes('36.0 a 37.2'), 'Temperatura normal deve ser 36.0-37.2');
  assert(ref.glicemia_capilar.jejum_normal.includes('< 100'), 'Glicemia jejum normal deve ser < 100');
  assert(ref.imc.eutrofia.includes('18.5 a 24.9'), 'Eutrofia deve ser IMC 18.5 a 24.9');
});

// =============================================================================
// 2. MODELOS DIRECIONADOS DE EXAME FÍSICO COM ATALHOS RÁPIDOS
// =============================================================================
test('2. Modelos dirigidos de exame físico contêm manobras e achados essenciais', () => {
  const m = SoapAmbulatorialService.MODELOS_EXAME_FISICO;
  assert(m.checkup_geral && m.checkup_geral.texto.includes('BEG'), 'Check-up geral deve conter BEG e sistemas básicos');
  
  // HAS: ausculta de carótidas, sem B3/B4, sem edema
  assert(m.has_rotina.texto.includes('carótidas') && m.has_rotina.texto.includes('B3'), 'Exame HAS deve avaliar carótidas e ausência de B3/B4');
  
  // DM: exame dos pés, monofilamento 10g e pulsos pedioso e tibial posterior
  assert(m.dm_rotina.texto.includes('Monofilamento 10g') && m.dm_rotina.texto.includes('tibial posterior'), 'Exame DM deve ter monofilamento 10g e pulsos');
  
  // Respiratório: oroscopia, otoscopia e ausculta pulmonar
  assert(m.respiratorio_ivas.texto.includes('Oroscopia') && m.respiratorio_ivas.texto.includes('Otoscopia'), 'Exame IVAS deve ter oroscopia e otoscopia');
  
  // Gastro/Dispepsia: Murphy negativo, descompressão brusca negativa (Blumberg)
  assert(m.dispepsia_gastro.texto.includes('Murphy') && m.dispepsia_gastro.texto.includes('Blumberg'), 'Exame gastro deve ter Murphy e Blumberg');
  
  // Lombalgia: Lasègue negativo, força motora e reflexos patelar/aquileu
  assert(m.lombalgia_postural.texto.includes('Lasègue') && m.lombalgia_postural.texto.includes('Reflexos patelar e aquileu'), 'Exame lombar deve ter Lasègue e reflexos');
  
  // Cefaleia: pares cranianos, reflexos e sinais meníngeos (rigidez de nuca ausente)
  assert(m.cefaleia_neuro.texto.includes('Pares Cranianos') && m.cefaleia_neuro.texto.includes('Sinais Meníngeos'), 'Exame cefaleia deve avaliar pares cranianos e meningismo');
  
  // Saúde mental: humor, afeto, pensamento e crítica
  assert(m.saude_mental.texto.includes('Humor e Afeto') && m.saude_mental.texto.includes('Juízo Crítico'), 'Exame psíquico deve ter humor, afeto e juízo crítico');
});

// =============================================================================
// 3. AUTOCOMPLEÇÃO E BUSCA DE CID-10 E CIAP-2 AMBULATORIAL
// =============================================================================
test('3. Catálogo e busca de diagnósticos retornam códigos CID-10 e CIAP-2 oficiais', () => {
  const buscaHas = SoapAmbulatorialService.buscarDiagnostico('has');
  assert(buscaHas.length > 0 && buscaHas[0].cid10 === 'I10' && buscaHas[0].ciap2 === 'K86', 'HAS deve retornar I10 / K86');

  const buscaDm = SoapAmbulatorialService.buscarDiagnostico('diabetes tipo 2');
  assert(buscaDm.length > 0 && buscaDm[0].cid10.startsWith('E11') && buscaDm[0].ciap2 === 'T90', 'DM2 deve retornar E11 / T90');

  const buscaLombar = SoapAmbulatorialService.buscarDiagnostico('dor nas costas');
  assert(buscaLombar.length > 0 && buscaLombar[0].cid10 === 'M54.5' && buscaLombar[0].ciap2 === 'L03', 'Lombalgia deve retornar M54.5 / L03');

  const buscaDrge = SoapAmbulatorialService.buscarDiagnostico('refluxo');
  assert(buscaDrge.length > 0 && buscaDrge[0].cid10 === 'K21.9' && buscaDrge[0].ciap2 === 'D84', 'DRGE deve retornar K21.9 / D84');

  const buscaItu = SoapAmbulatorialService.buscarDiagnostico('infeccao urinaria');
  assert(buscaItu.length > 0 && buscaItu[0].cid10 === 'N30.0' && buscaItu[0].ciap2 === 'U71', 'Cistite/ITU deve retornar N30.0 / U71');

  const buscaAnsiedade = SoapAmbulatorialService.buscarDiagnostico('ansiedade');
  assert(buscaAnsiedade.length > 0 && buscaAnsiedade[0].cid10 === 'F41.1' && buscaAnsiedade[0].ciap2 === 'P74', 'TAG deve retornar F41.1 / P74');
});

// =============================================================================
// 4. ESTRATIFICAÇÃO DE RISCO CARDIOVASCULAR (SBC / SBD)
// =============================================================================
test('4. Estratificação de risco cardiovascular aplica critérios SBC/SBD corretamente', () => {
  // Cenário 1: IAM prévio -> Muito Alto Risco (meta LDL < 50)
  const r1 = SoapAmbulatorialService.estratificarRiscoCardiovascular({ iam: true, pas: 130, ldl: 90 });
  assert.strictEqual(r1.nivel, 'MUITO ALTO');
  assert(r1.meta_ldl.includes('< 50'), 'Meta de LDL para muito alto risco deve ser < 50 mg/dL');

  // Cenário 2: DM com DRC ou LDL >= 190 -> Muito Alto Risco
  const r2 = SoapAmbulatorialService.estratificarRiscoCardiovascular({ dm: true, drc: true });
  assert.strictEqual(r2.nivel, 'MUITO ALTO');

  // Cenário 3: DM isolado sem DRC -> Alto Risco (meta LDL < 70)
  const r3 = SoapAmbulatorialService.estratificarRiscoCardiovascular({ dm: true, pas: 130, pad: 80, ldl: 110 });
  assert.strictEqual(r3.nivel, 'ALTO');
  assert(r3.meta_ldl.includes('< 70'), 'Meta de LDL para alto risco deve ser < 70 mg/dL');

  // Cenário 4: Homem 55a hipertenso e tabagista -> Intermediário (meta LDL < 100)
  const r4 = SoapAmbulatorialService.estratificarRiscoCardiovascular({ idade: 55, sexo: 'm', pas: 145, pad: 90, tabagismo: true, ldl: 140 });
  assert.strictEqual(r4.nivel, 'INTERMEDIÁRIO');
  assert(r4.meta_ldl.includes('< 100'), 'Meta de LDL para risco intermediário deve ser < 100 mg/dL');

  // Cenário 5: Jovem 25a sem comorbidades -> Baixo Risco
  const r5 = SoapAmbulatorialService.estratificarRiscoCardiovascular({ idade: 25, sexo: 'f', pas: 115, pad: 75, ldl: 100 });
  assert.strictEqual(r5.nivel, 'BAIXO');
  assert(r5.meta_ldl.includes('< 130'), 'Meta de LDL para baixo risco deve ser < 130 mg/dL');
});

// =============================================================================
// 5. ESTRUTURAÇÃO DO PRONTUÁRIO SOAP AMBULATORIAL ÁGIL
// =============================================================================
test('5. Estruturação do SOAP ambulatorial contempla todos os 4 eixos e critérios clínicos', () => {
  const dados = {
    pacienteNome: 'João da Silva',
    idade: 58,
    queixaPrincipal: 'Acompanhamento de pressão alta e diabetes',
    tempoEvolucao: '5 anos',
    hda: 'Paciente relata bom estado geral, nega precordialgia, dispneia aos esforços ou tonturas. Faz uso regular das medicações prescritas.',
    medicacoesUso: 'Losartana 50mg 1x/dia, Hidroclorotiazida 25mg 1x/dia, Metformina 850mg 2x/dia',
    alergias: 'Nega alergias',
    sinaisVitais: { pa: '132/84', fc: '72', fr: '16', spo2: '98', glicemia: '138', peso: '78', imc: '26.8' },
    modeloExameFisico: 'dm_rotina',
    diagnosticos: [
      'Hipertensão Arterial Sistêmica Primária (CID-10: I10 / CIAP-2: K86)',
      'Diabetes Mellitus Tipo 2 (CID-10: E11.9 / CIAP-2: T90)',
      'Sobrepeso grau 1 (CID-10: E66.9)'
    ],
    estratificacaoRisco: SoapAmbulatorialService.estratificarRiscoCardiovascular({ dm: true, pas: 132, pad: 84 }),
    prescricaoMedicamentosa: [
      { nome: 'Losartana Potássica', apresentacao: '50 mg', quantidade: '60 comprimidos', posologia: '1 comprimido VO pela manhã', horarios: '08:00', duracao: 'Uso contínuo (60 dias)' },
      { nome: 'Hidroclorotiazida', apresentacao: '25 mg', quantidade: '30 comprimidos', posologia: '1 comprimido VO pela manhã', horarios: '08:00', duracao: 'Uso contínuo (60 dias)' },
      { nome: 'Metformina', apresentacao: '850 mg', quantidade: '120 comprimidos', posologia: '1 comprimido VO após almoço e jantar', horarios: '12:00 e 19:00', duracao: 'Uso contínuo' }
    ],
    mev: [
      'Dieta DASH e hipossódica (< 2g de sal/dia).',
      'Contagem moderada de carboidratos, evitar açúcares refinados e bebidas açucaradas.',
      'Caminhada 30 minutos diários, pelo menos 5 vezes por semana.'
    ],
    sinaisAlarme: [
      'Dor no peito, falta de ar súbita, perda de força motora ou glicemia capilar > 300 mg/dL com náuseas/vômitos.'
    ],
    retornoDias: 60
  };

  const soap = SoapAmbulatorialService.estruturarSoapAmbulatorial(dados);
  assert(soap.subjetivo.includes('Queixa Principal (QP)'), 'Subjetivo deve conter QP');
  assert(soap.subjetivo.includes('Losartana 50mg'), 'Subjetivo deve conter medicações em uso');
  assert(soap.objetivo.includes('132/84 mmHg'), 'Objetivo deve conter PA');
  assert(soap.objetivo.includes('Monofilamento 10g'), 'Objetivo deve conter exame dos pés do modelo DM');
  assert(soap.avaliacao.includes('I10') && soap.avaliacao.includes('E11.9'), 'Avaliação deve conter CIDs corretos');
  assert(soap.avaliacao.includes('Risco ALTO'), 'Avaliação deve conter estratificação de risco');
  assert(soap.plano.includes('Prescrição Medicamentosa'), 'Plano deve conter prescrição medicamentosa');
  assert(soap.plano.includes('08:00') && soap.plano.includes('Dieta DASH'), 'Plano deve conter horários e MEV');
  assert(soap.plano.includes('Sinais de Alarme'), 'Plano deve conter sinais de alarme');
  assert(soap.plano.includes('60 dias'), 'Plano deve conter retorno em 60 dias');
  assert(soap.textoProntuario.includes('PRONTUÁRIO CLÍNICO AMBULATORIAL'), 'Texto de prontuário deve estar completo');
});

// =============================================================================
// 6. EXPORTAÇÃO LIMPA DE RECEITA MÉDICA AMBULATORIAL
// =============================================================================
test('6. Exportação limpa de receita médica em texto puro gera formato para PEP', () => {
  const dadosRx = {
    pacienteNome: 'Maria Aparecida Santos',
    data: '08/10/2026',
    itens: [
      { via: 'USO ORAL', nome: 'Losartana Potássica', apresentacao: '50 mg', quantidade: '60 comprimidos', posologia: '1 comprimido pela manhã', horarios: '08:00', duracao: '60 dias' },
      { via: 'USO ORAL', nome: 'Anlodipino', apresentacao: '5 mg', quantidade: '60 comprimidos', posologia: '1 comprimido à noite', horarios: '20:00', duracao: '60 dias' }
    ],
    orientacoes: [
      'Manter aferições regulares da pressão arterial.',
      'Não interromper as medicações sem orientação médica.'
    ]
  };

  const textoRx = SoapAmbulatorialService.exportarReceitaTexto(dadosRx);
  assert(textoRx.includes('RECEITUÁRIO MÉDICO AMBULATORIAL'), 'Deve conter cabeçalho');
  assert(textoRx.includes('Maria Aparecida Santos'), 'Deve conter nome do paciente');
  assert(textoRx.includes('[USO ORAL]'), 'Deve agrupar por via');
  assert(textoRx.includes('Losartana Potássica 50 mg -------------------- 60 comprimidos'), 'Deve conter quantidade alinhada');
  assert(textoRx.includes('08:00'), 'Deve conter cronofarmacologia / horário');
  assert(textoRx.includes('ORIENTAÇÕES AO PACIENTE'), 'Deve conter orientações');
});

// =============================================================================
// 7. EXPORTAÇÃO LIMPA DE ATESTADO MÉDICO LEGAL (RESOLUÇÕES CFM 1.658/2002 E 1.851/2008)
// =============================================================================
test('7. Exportação de atestado médico segue resoluções do CFM e regras de sigilo', () => {
  // Teste 7A: Sem CID (sigilo médico preservado por padrão)
  const atSemCid = SoapAmbulatorialService.exportarAtestadoTexto({
    pacienteNome: 'Carlos Eduardo Mendes',
    pacienteDoc: 'MG-12.345.678',
    dias: 3,
    aPartirDe: '08/10/2026',
    incluirCid: false
  });
  assert(atSemCid.includes('ATESTADO MÉDICO'), 'Deve conter título');
  assert(atSemCid.includes('3 (três) dia(s)'), 'Deve conter número em algarismo e por extenso');
  assert(atSemCid.includes('Diagnóstico omitido nos termos do sigilo médico'), 'Deve declarar omissão legal do CID');
  assert(!atSemCid.includes('CID-10:'), 'Não deve conter CID sem consentimento');

  // Teste 7B: Com CID mediante consentimento expresso
  const atComCid = SoapAmbulatorialService.exportarAtestadoTexto({
    pacienteNome: 'Carlos Eduardo Mendes',
    pacienteDoc: 'MG-12.345.678',
    dias: 7,
    aPartirDe: '08/10/2026',
    incluirCid: true,
    cid: 'M54.5',
    cidDescricao: 'Lombalgia mecânica'
  });
  assert(atComCid.includes('7 (sete) dia(s)'), 'Extenso de 7 deve ser sete');
  assert(atComCid.includes('Diagnóstico / CID-10: M54.5 - Lombalgia mecânica'), 'Deve conter CID quando autorizado');
  assert(atComCid.includes('autorização expressa do paciente'), 'Deve citar conformidade com resolução CFM');
});

// =============================================================================
// 8. GUIA DE ENCAMINHAMENTO / REFERÊNCIA SISREG
// =============================================================================
test('8. Exportação de encaminhamento ambulatorial gera formato SBAR regulado', () => {
  const enc = SoapAmbulatorialService.exportarEncaminhamentoTexto({
    pacienteNome: 'Antônio Ferreira',
    especialidade: 'Cardiologia',
    motivo: 'Hipertensão arterial refratária com uso de 3 fármacos em doses plenas.',
    cid: 'I10',
    hda: 'Paciente hipertenso há 10 anos, em uso de Losartana 100mg + Anlodipino 10mg + HCTZ 25mg com PA média 165/105 mmHg.',
    exames: 'ECG com sobrecarga ventricular esquerda; Ecocardiograma com HVE concêntrica; Creatinina 1.1 mg/dL.',
    tratamentos: 'IECA/BRA + BCC + Tiazídico otimizados há 6 meses com boa adesão confirmada.',
    objetivoParecer: 'Avaliação de hipertensão resistente e indicação de Espironolactona / investigação de causa secundária.'
  });

  assert(enc.includes('GUIA DE ENCAMINHAMENTO / REFERÊNCIA AMBULATORIAL'), 'Deve conter título');
  assert(enc.includes('CARDIOLOGIA'), 'Deve conter especialidade');
  assert(enc.includes('MOTIVO DO ENCAMINHAMENTO'), 'Deve conter motivo');
  assert(enc.includes('Hipertensão arterial refratária'), 'Deve conter texto do motivo');
});

// =============================================================================
// 9. DISPATCH RPC DO COCKPIT NO RUNTIME NODE.JS
// =============================================================================
test('9. Métodos RPC ambulatoriais funcionam no runtime e no cockpitRpc', () => {
  const crypto = require('crypto');
  const botToken = 'fake_bot_token_12345';
  ctx.ConfigService.get = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : null;
  ctx.ConfigService.exigir = (k) => k === 'TELEGRAM_CHAT_ID' ? '123' : (k === 'TELEGRAM_BOT_TOKEN' ? botToken : 'dummy');
  const hashEsperado = crypto.createHmac('sha256', botToken).update('123').digest('hex');
  const fakeSession = 'ck_' + hashEsperado;

  // Testa cockpitBuscarCid via RPC
  const resCid = runtime.cockpitRpc('cockpitBuscarCid', fakeSession, ['lombalgia']);
  assert(resCid.sucesso === true, 'cockpitBuscarCid deve responder com sucesso');
  assert(resCid.resultados.length > 0 && resCid.resultados[0].cid10 === 'M54.5', 'Deve achar M54.5');

  // Testa cockpitEstratificarRisco via RPC
  const resRisco = runtime.cockpitRpc('cockpitEstratificarRisco', fakeSession, [{ dm: true, pas: 140 }]);
  assert(resRisco.sucesso === true, 'cockpitEstratificarRisco deve responder com sucesso');
  assert.strictEqual(resRisco.resultado.nivel, 'ALTO');

  // Testa cockpitGerarAtestadoTexto via RPC
  const resAt = runtime.cockpitRpc('cockpitGerarAtestadoTexto', fakeSession, [{ pacienteNome: 'José', dias: 2 }]);
  assert(resAt.sucesso === true && resAt.textoAtestado.includes('2 (dois) dia(s)'), 'Atestado via RPC deve funcionar');

  // Testa cockpitGerarReceitaTexto via RPC
  const resRx = runtime.cockpitRpc('cockpitGerarReceitaTexto', fakeSession, [{
    pacienteNome: 'José',
    itens: [{ nome: 'Dipirona 500mg', quantidade: '1 caixa', posologia: '1 cp se dor' }]
  }]);
  assert(resRx.sucesso === true && resRx.textoReceita.includes('Dipirona 500mg'), 'Receita via RPC deve funcionar');

  // Testa cockpitSoapAmbulatorial via RPC
  const resSoap = runtime.cockpitRpc('cockpitSoapAmbulatorial', fakeSession, [{
    pacienteNome: 'José',
    queixaPrincipal: 'Dor de garganta há 2 dias',
    modeloExameFisico: 'respiratorio_ivas'
  }]);
  assert(resSoap.sucesso === true && resSoap.soap.subjetivo.includes('Dor de garganta'), 'SOAP via RPC deve funcionar');
});

// =============================================================================
// 10. INTEGRAÇÃO DOS COMANDOS NO BOT TELEGRAM
// =============================================================================
test('10. Comandos /ambulatorio e /atestado no Telegram Bot respondem com assertividade', () => {
  let msgEnviada = null;
  const originalEnviar = ctx.enviarMensagemParaChat;
  const originalEnviarKb = ctx.enviarMensagemComTecladoParaChat;
  ctx.enviarMensagemParaChat = (chatId, texto) => {
    msgEnviada = texto;
    return { ok: true };
  };
  ctx.enviarMensagemComTecladoParaChat = (chatId, texto, kb) => {
    msgEnviada = texto;
    return { ok: true };
  };

  try {
    // 10A: Ajuda do /ambulatorio quando enviado sem parâmetros
    ctx.processarMensagemTexto({ chat: { id: 123 }, text: '/ambulatorio' });
    assert(msgEnviada && msgEnviada.includes('MÓDULO SOAP AMBULATORIAL ÁGIL'), 'Comando /ambulatorio sem args deve enviar guia');

    // 10B: /atestado com dias e motivo
    ctx.processarMensagemTexto({ chat: { id: 123 }, text: '/atestado 3 dias repouso lombalgia, paciente Carlos Silva' });
    assert(msgEnviada && msgEnviada.includes('Carlos Silva'), 'Atestado deve conter nome do paciente');
    assert(msgEnviada && msgEnviada.includes('3 (três) dia(s)'), 'Atestado deve conter 3 dias por extenso');
  } finally {
    ctx.enviarMensagemParaChat = originalEnviar;
    ctx.enviarMensagemComTecladoParaChat = originalEnviarKb;
  }
});

console.log(`\n🎉 SUITE CONCLUÍDA: ${aprovados}/${total} testes aprovados com 100% de sucesso.`);
if (aprovados !== total) {
  process.exit(1);
}
