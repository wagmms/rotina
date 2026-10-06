const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

const server = spawn(process.execPath, ['-e', `
  const http = require('node:http');
  http.createServer((req, res) => {
    if (req.url === '/lento') {
      setTimeout(() => { res.writeHead(200); res.end('atrasado'); }, 300);
      return;
    }
    if (req.url === '/corpo-lento') {
      res.writeHead(200);
      res.write('inicio');
      setTimeout(() => res.end('fim'), 300);
      return;
    }
    res.setHeader('content-type', 'application/octet-stream');
    res.end(req.url === '/primeiro' ? Buffer.from([0, 255, 1, 128]) : Buffer.from([9, 8, 7]));
  }).listen(0, '127.0.0.1', function () { console.log(this.address().port); });
`], { stdio: ['ignore', 'pipe', 'pipe'] });

async function main() {
  const port = await new Promise((resolve, reject) => {
    let output = '';
    server.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('\n')) resolve(Number(output.trim()));
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Servidor de teste saiu: ${code}`)));
  });
  const { ctx } = require('../server/runtime.js');
  const url = `http://127.0.0.1:${port}`;

  const primeiro = ctx.UrlFetchApp.fetch(url + '/primeiro').getBlob();
  assert.deepEqual([...primeiro.getBytes()], [0, 255, 1, 128]);
  const lento = ctx.UrlFetchApp.fetch(url + '/lento', { timeoutMs: 40, muteHttpExceptions: true });
  assert.equal(lento.getResponseCode(), 504);
  const corpoLento = ctx.UrlFetchApp.fetch(url + '/corpo-lento', { timeoutMs: 40, muteHttpExceptions: true });
  assert.equal(corpoLento.getResponseCode(), 504);
  const segundo = ctx.UrlFetchApp.fetch(url + '/segundo').getBlob();
  assert.deepEqual([...segundo.getBytes()], [9, 8, 7]);
  assert.deepEqual([...primeiro.getBytes()], [0, 255, 1, 128]);
  console.log('OK: bytes binários preservados após timeout e nova requisição');
}

main().then(() => {
  server.kill();
  process.exit(0); // Evita gravar dados do usuário no hook beforeExit do runtime.
}).catch(err => {
  server.kill();
  console.error(err);
  process.exit(1);
});
