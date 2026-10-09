const assert = require('assert');
const WebSocket = require('ws');
const { buildServer } = require('../server/index.js');
const runtime = require('../server/runtime.js');

async function testPreceptorLive() {
  console.log('🧪 Iniciando teste do Preceptor IA Live (gemini-3.8-live / WebSocket)...');
  process.env.NODE_ENV = 'test';

  const app = await buildServer();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  const port = address.port;

  console.log(`✓ Servidor Fastify ouvindo na porta efêmera ${port}`);

  const wsUrl = `ws://127.0.0.1:${port}/live`;
  const ws = new WebSocket(wsUrl);

  const msgs = [];
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout aguardando conexão WebSocket')), 4000);

    ws.on('open', () => {
      console.log('✓ WebSocket /live conectado com sucesso');
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      msgs.push(msg);

      if (msg.type === 'ready') {
        console.log('✓ Mensagem "ready" recebida do Preceptor Live');
        // Enviar pergunta clínica por texto/áudio simulado
        ws.send(JSON.stringify({
          text: 'Paciente 62 anos, DM2, dor precordial opressiva há 2 horas irradiada para MSE com supra de ST em V1-V4.'
        }));
      }

      if (msg.type === 'transcript') {
        console.log(`✓ Transcrição recebida do Preceptor: "${msg.text}"`);
      }

      if (msg.type === 'turnComplete') {
        console.log('✓ Turno completado pelo Preceptor');
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

  assert(msgs.some(m => m.type === 'ready'), 'Deveria ter recebido mensagem ready');
  assert(msgs.some(m => m.type === 'transcript'), 'Deveria ter recebido transcrição');
  assert(msgs.some(m => m.type === 'turnComplete'), 'Deveria ter completado o turno');

  console.log('🎉 TESTE DO PRECEPTOR IA LIVE PASSOU COM 100% DE SUCESSO!\n');
}

testPreceptorLive().catch(err => {
  console.error('❌ Erro no teste do Preceptor Live:', err);
  process.exit(1);
});
