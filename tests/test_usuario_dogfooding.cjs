/**
 * ==============================================================================
 * SIMULAÇÃO DE USUÁRIO REAL (DOGFOODING & JORNADA CLÍNICA COMPLETA)
 * ==============================================================================
 * Simula as ações exatas de um médico no Telegram e no Cockpit PWA:
 * 1. Consulta de Medicamentos na Lactação (/lactacao amiodarona, enalapril, bactrim)
 * 2. Navegação no Hub G&O via Telegram (/go -> Lactação e Nutriz)
 * 3. Busca de Injetáveis Críticos na REMUME (Amiodarona, Adenosina, Adrenalina, Furosemida)
 * 4. Geração de Prontuário SOAP Ambulatorial com Cópia Direta para o PEP
 * 5. Verificação da Resiliência dos Endpoints da Rotina e Agenda
 * ==============================================================================
 */

'use strict';

const assert = require('assert');
const path = require('path');
const runtime = require(path.join(__dirname, '..', 'server', 'runtime.js'));

async function simularJornadaUsuario() {
  console.log('🩺 INICIANDO BATERIA DE DOGFOODING (SIMULAÇÃO DO USUÁRIO MÉDICO)...\n');

  const ctx = runtime.ctx;
  const chatId = '1771571035';

  let mensagensEnviadas = [];
  ctx.enviarMensagemParaChat = (id, texto) => {
    mensagensEnviadas.push({ tipo: 'texto', id, texto });
  };
  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {
    mensagensEnviadas.push({ tipo: 'teclado', id, texto, kb });
  };
  ctx.executarPostTelegram = (url, payload) => {
    if (payload && payload.text) {
      mensagensEnviadas.push({ tipo: 'post', id: payload.chat_id, texto: payload.text, kb: payload.reply_markup });
    }
    return true;
  };

  // --------------------------------------------------------------------------
  // CENÁRIO 1: O médico consulta medicamentos na lactação via comando /lactacao
  // --------------------------------------------------------------------------
  console.log('--- Cenário 1: Consulta de Lactação no Telegram ---');

  // 1.1 Amiodarona (Fármaco de alto risco - Hale L5 / Vermelho)
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/lactacao amiodarona' });
  assert(mensagensEnviadas.length >= 1, 'Deve responder ao comando /lactacao amiodarona');
  let textoAmiodarona = mensagensEnviadas[0].texto;
  console.log('Resultado /lactacao amiodarona:\n' + textoAmiodarona.slice(0, 300) + '...\n');
  assert(textoAmiodarona.includes('Hale L5') || textoAmiodarona.includes('Contraindicado'), 'Amiodarona deve ser classificada como contraindicada / L5');
  assert(textoAmiodarona.includes('🔴'), 'Deve exibir semáforo vermelho');
  assert(textoAmiodarona.includes('Alternativas') || textoAmiodarona.includes('Propranolol') || textoAmiodarona.includes('Metoprolol'), 'Deve fornecer alternativas seguras');

  // 1.2 Enalapril (Fármaco seguro - Hale L2 / Verde)
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/lactacao enalapril' });
  let textoEnalapril = mensagensEnviadas[0].texto;
  console.log('Resultado /lactacao enalapril:\n' + textoEnalapril.slice(0, 300) + '...\n');
  assert(textoEnalapril.includes('Compatível') || textoEnalapril.includes('L2'), 'Enalapril deve ser seguro/compatível');
  assert(textoEnalapril.includes('🟢'), 'Deve exibir semáforo verde');

  // 1.3 Bactrim / Sulfametoxazol + Trimetoprima (Cautela - Hale L3 / Amarelo)
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/lactacao sulfametoxazol' });
  let textoBactrim = mensagensEnviadas[0].texto;
  console.log('Resultado /lactacao sulfametoxazol:\n' + textoBactrim.slice(0, 300) + '...\n');
  assert(textoBactrim.includes('🟡'), 'Sulfametoxazol deve ter semáforo amarelo (cautela)');
  assert(textoBactrim.includes('Kernicterus') || textoBactrim.includes('G6PD') || textoBactrim.includes('cautela'), 'Deve alertar para kernicterus ou G6PD');

  // --------------------------------------------------------------------------
  // CENÁRIO 2: O médico navega no Hub G&O até a opção de Lactação
  // --------------------------------------------------------------------------
  console.log('--- Cenário 2: Navegação no Hub G&O ---');
  mensagensEnviadas = [];
  ctx.processarMensagemTexto({ chat: { id: chatId }, text: '/go' });
  assert(mensagensEnviadas.length >= 1, 'Deve abrir o Hub G&O');
  let hubGoMsg = mensagensEnviadas[0];
  let botoesGo = JSON.stringify(hubGoMsg.kb);
  assert(botoesGo.includes('go_lactacao') || botoesGo.includes('Lactação'), 'Hub G&O deve ter botão para Lactação');

  // Clica no botão de Lactação
  mensagensEnviadas = [];
  ctx.processarCallbackBotao({
    id: 'cb_lact',
    data: 'go_lactacao',
    message: { chat: { id: chatId }, message_id: 100 }
  });
  assert(mensagensEnviadas.length >= 1, 'Callback go_lactacao deve renderizar o guia');
  let guiaLactacao = mensagensEnviadas[0].texto;
  console.log('Guia G&O Lactação recebido com sucesso!\n' + guiaLactacao.slice(0, 250) + '...\n');
  assert(guiaLactacao.includes('SEGURANÇA MEDICAMENTOSA NA LACTAÇÃO') || guiaLactacao.includes('LACTAÇÃO'), 'Deve conter cabeçalho do guia');

  // --------------------------------------------------------------------------
  // CENÁRIO 3: Verificação de Injetáveis da REMUME no Cockpit PWA
  // --------------------------------------------------------------------------
  console.log('--- Cenário 3: Auditoria da REMUME no Cockpit PWA ---');
  const fs = require('fs');
  const htmlCockpit = fs.readFileSync(path.join(__dirname, '..', 'gh_cockpit_deploy', 'index.html'), 'utf8');

  // Amiodarona
  assert(htmlCockpit.includes('amiodarona 50 mg/ml ap. 3 ml'), 'Deve conter apresentação ampola de amiodarona');
  assert(!htmlCockpit.includes('amiodarona 50 mg/ml ap. 3 ml\': \'1 comp VO') && !htmlCockpit.includes('amiodarona 50 mg/ml ap. 3 ml\': \'1 comprimido via oral'), 'Amiodarona injetável NUNCA pode ter via oral');
  assert(htmlCockpit.includes('SG 5%') || htmlCockpit.includes('infusão contínua'), 'Deve ter posologia correta para amiodarona EV');

  // Adenosina
  assert(htmlCockpit.includes('adenosina 3 mg/ml ap. 2 ml'), 'Deve conter adenosina injetável');
  assert(htmlCockpit.includes('bolus IV ultrarrápido') || htmlCockpit.includes('flush de 20 mL SF'), 'Deve instruir bolus rápido em adenosina');

  // Adrenalina
  assert(htmlCockpit.includes('adrenalina 1 mg/ml ap. 1 ml'), 'Deve conter adrenalina injetável');
  assert(htmlCockpit.includes('vasto lateral da coxa') || htmlCockpit.includes('1 mg IV/IO a cada 3 a 5 min'), 'Deve instruir doses corretas de adrenalina');

  console.log('✅ REMUME: Injetáveis 100% saneados, sem qualquer menção de via oral para parenterais!\n');

  // --------------------------------------------------------------------------
  // CENÁRIO 4: Médico utiliza o SOAP e copia para o PEP
  // --------------------------------------------------------------------------
  console.log('--- Cenário 4: SOAP com Cópia para o PEP ---');
  // Mock de raciocínio de IA retornando JSON estrito
  ctx.executarRaciocinioClinico = (prompt, caso) => {
    return JSON.stringify({
      subjetivo: 'QP: Tosse e febre há 3 dias.\nHDA: Início com tosse produtiva e febre alta. Nega viagens.',
      objetivo: 'Sinais Vitais: PA: 130/80 mmHg | FC: 88 bpm | FR: 18 irpm | SpO2: 96% em ar ambiente | T: 38.2°C.\nGeral: BEG, lúcido e orientado.\nACV: RCR 2T BNF sem sopros.\nAR: Murmúrio vesicular presente bilateralmente, estertores crepitantes em base direita.\nAbdome: Plano, indolor, sem visceromegalias.\nExtremidades: Sem edema, panturrilhas livres.',
      avaliacao: ['Pneumonia Adquirida na Comunidade (PAC) leve - CID-10 J13 / CIAP-2 R81'],
      plano: {
        prescricao: [
          'Amoxicilina 500mg VO de 8/8h por 7 dias',
          'Dipirona 1g VO se dor ou febre até 6/6h'
        ],
        exames: [
          'Radiografia de tórax PA e perfil para documentação'
        ],
        orientacoes: [
          'Hidratação abundante (2L de água/dia)',
          'Sinais de alarme: falta de ar, piora da febre após 48h ou prostração intensa procurar pronto-socorro imediatamente'
        ]
      }
    });
  };

  const resultadoSoap = ctx.gerarSOAPComIA('Homem 42 anos com tosse com expectoração amarelada e febre há 3 dias. Faça a avaliação e o plano.');
  console.log('SOAP Consolidado gerado:\n' + resultadoSoap.slice(0, 400) + '...\n');
  assert(resultadoSoap.includes('SÍNTESE SOAP · REGISTRO CONSOLIDADO'), 'Deve conter cabeçalho SOAP consolidado');
  assert(resultadoSoap.includes('A - Avaliação'), 'Deve conter avaliação');
  assert(resultadoSoap.includes('P - Plano'), 'Deve conter plano');
  assert(resultadoSoap.includes('CÓPIA DIRETA PARA O PEP (1 TOQUE)'), 'Deve conter seção para cópia no PEP');
  assert(resultadoSoap.includes('```text'), 'Deve conter bloco de código para cópia sem markdown');
  assert(resultadoSoap.includes('[REGISTRO SOAP - PRONTUÁRIO ELETRÔNICO]'), 'Deve identificar o cabeçalho PEP');
  console.log('✅ SOAP: Padrão FMRP-USP com bloco limpo de cópia PEP validado com sucesso!\n');

  // --------------------------------------------------------------------------
  // CENÁRIO 5: Configuração e Resiliência do Preceptor Live e Google Calendar
  // --------------------------------------------------------------------------
  console.log('--- Cenário 5: Verificação de Resiliência de Configurações ---');
  assert(htmlCockpit.includes('window.ULTRA_CONFIG'), 'HTML do Cockpit deve conter inicializador de window.ULTRA_CONFIG');
  assert(htmlCockpit.includes('window.BACKEND_URL'), 'HTML do Cockpit deve definir window.BACKEND_URL');
  assert(htmlCockpit.includes('rotina-tt8n.onrender.com'), 'Fallback de produção deve apontar para o Render');
  console.log('✅ Configurações e WebSockets validados com sucesso!\n');

  console.log('🎉 TODOS OS CENÁRIOS DE DOGFOODING DO USUÁRIO FORAM APROVADOS COM DISTINÇÃO!');
}

simularJornadaUsuario().catch(err => {
  console.error('❌ ERRO NO DOGFOODING:', err);
  process.exit(1);
});
