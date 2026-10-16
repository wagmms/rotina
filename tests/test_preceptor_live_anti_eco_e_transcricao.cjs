const assert = require('assert');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { buildServer } = require('../server/index.js');

async function testPreceptorAntiEcoETranscricao() {
  console.log('🧪 Iniciando teste de Anti-Eco, Transcrição Streaming e Prevenção de Vozes Concorrentes...');

  // 1. Auditoria Estática dos Arquivos Frontend
  const htmlFrontend = fs.readFileSync(path.join(__dirname, '../gh_cockpit_deploy/index.html'), 'utf8');

  assert.ok(
    htmlFrontend.includes('function isPreceptorSpeaking()'),
    'Frontend deve possuir a função isPreceptorSpeaking para cancelamento de loop acústico'
  );

  assert.ok(
    htmlFrontend.includes('if (isPreceptorSpeaking())'),
    'Microfone deve descartar frames captados enquanto o Preceptor estiver reproduzindo áudio'
  );

  assert.ok(
    htmlFrontend.includes('window.speechSynthesis.cancel()'),
    'Frontend deve cancelar qualquer síntese de voz de terceiros ao tocar áudio neural'
  );

  assert.ok(
    htmlFrontend.includes('bolhaStreamingAtual'),
    'Frontend deve manter bolhaStreamingAtual para agrupar fragmentos de transcrição contínua'
  );

  // 2. Auditoria Estática do Backend
  const serverIndex = fs.readFileSync(path.join(__dirname, '../server/index.js'), 'utf8');

  assert.ok(
    serverIndex.includes("'gemini-3.8-live'"),
    'Backend deve ter gemini-3.8-live configurado na lista de modelos candidatos'
  );

  assert.ok(
    serverIndex.includes('inputAudioTranscription: {}'),
    'Backend deve habilitar inputAudioTranscription no config da Live API'
  );

  assert.ok(
    serverIndex.includes('outputAudioTranscription: {}'),
    'Backend deve habilitar outputAudioTranscription no config da Live API'
  );

  assert.ok(
    serverIndex.includes('sc.inputTranscription?.text'),
    'Backend deve ler sc.inputTranscription.text para transcrição do médico em tempo real'
  );

  assert.ok(
    serverIndex.includes('sc.outputTranscription?.text'),
    'Backend deve ler sc.outputTranscription.text para transcrição do Preceptor em tempo real'
  );

  assert.ok(
    serverIndex.includes('processandoTurno'),
    'Backend deve possuir trava de concorrência processandoTurno para evitar vozes paralelas'
  );

  // 3. Teste Dinâmico de WebSocket no Servidor Fastify
  process.env.NODE_ENV = 'test';
  const app = await buildServer();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  const port = address.port;

  const wsUrl = `ws://127.0.0.1:${port}/live`;
  const ws = new WebSocket(wsUrl);

  const msgsRecebidas = [];
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout aguardando fluxo WebSocket do teste')), 4000);

    ws.on('open', () => {});

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      msgsRecebidas.push(msg);

      if (msg.type === 'ready') {
        // Envia evento de áudio simulado
        ws.send(JSON.stringify({
          audio: Buffer.alloc(3200).toString('base64')
        }));
      }

      if (msg.type === 'turnComplete') {
        clearTimeout(timer);
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  ws.close();
  await app.close();

  assert.ok(msgsRecebidas.some(m => m.type === 'ready'), 'Deveria ter recebido evento ready');
  assert.ok(msgsRecebidas.some(m => m.type === 'transcript' && m.role === 'user'), 'Deveria ter transcrição do usuário');
  assert.ok(msgsRecebidas.some(m => m.type === 'transcript' && m.role === 'model'), 'Deveria ter transcrição do modelo');
  assert.ok(msgsRecebidas.some(m => m.type === 'audio'), 'Deveria ter evento de áudio');
  assert.ok(msgsRecebidas.some(m => m.type === 'turnComplete'), 'Deveria ter turnComplete');

  console.log('✅ Suíte Anti-Eco, Transcrição Streaming e Single-Voice aprovada com 100% de sucesso!\n');
}

testPreceptorAntiEcoETranscricao().catch((err) => {
  console.error('❌ Falha no teste:', err);
  process.exit(1);
});
