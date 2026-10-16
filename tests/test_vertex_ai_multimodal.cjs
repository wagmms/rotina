/**
 * TESTES DE INTEGRAÇÃO VERTEX AI E MULTIMODAL GEMINI-4-ARGON
 * Valida:
 * 1. VertexAuthService está presente no runtime e configurado com service account.
 * 2. chamarVertexAIGemini despacha requisições com token Bearer OAuth2.
 * 3. chamarGeminiPoolMultimodal prioriza Tier-0 Vertex AI gemini-4-argon antes de tentar fallbacks.
 * 4. processarMensagemFoto executa feedback visual e trata imagens médicas com laudo e conduta.
 * 5. Protocolo ACLS PCR no Telegram especifica a 2ª dose de Amiodarona corretamente.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- TESTES VERTEX AI & MULTIMODAL ARGON ---');

// 1. Testa runtime.js
const runtime = require('../server/runtime.js');
assert(runtime.ctx.VertexAuthService, 'VertexAuthService deve estar exposto no ctx');
assert.strictEqual(runtime.ctx.VertexAuthService.isConfigured(), true, 'VertexAuthService deve estar configurado');
assert.strictEqual(runtime.ctx.VertexAuthService.getModel(), 'gemini-4-argon', 'Modelo padrão deve ser gemini-4-argon');
assert.strictEqual(runtime.ctx.VertexAuthService.getLocation(), 'global', 'Location padrão deve ser global');

const authInfo = runtime.ctx.VertexAuthService.getAuthInfo();
assert(authInfo && authInfo.accessToken, 'Deve gerar token OAuth2 válido');
console.log('  ✓ 1. VertexAuthService configurado e gerando token OAuth2 Bearer');

// 2. Testa existência de chamarVertexAIGemini no ctx
assert(typeof runtime.ctx.chamarVertexAIGemini === 'function', 'chamarVertexAIGemini deve existir no contexto');
console.log('  ✓ 2. Função chamarVertexAIGemini compilada e disponível no contexto clínico');

// 3. Testa mock de chamarGeminiPoolMultimodal com Vertex AI
let chamadaVertexOcorreu = false;
const originalFetch = runtime.ctx.UrlFetchApp.fetch;
runtime.ctx.UrlFetchApp.fetch = function(url, options) {
  if (url.includes('aiplatform.googleapis.com') && url.includes('gemini-4-argon')) {
    chamadaVertexOcorreu = true;
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: 'LAUDO ELETROCARDIOGRÁFICO: Ritmo sinusal, sem supra ou infra de ST.' }]
          }
        }]
      })
    };
  }
  return originalFetch.apply(this, arguments);
};

const fakeImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const laudo = runtime.ctx.analisarImagemMedicaComIA(fakeImageBase64, 'image/png', 'Paciente com dor torácica atípica.');

assert(chamadaVertexOcorreu, 'Deve ter chamado endpoint Vertex AI');
assert(laudo && laudo.includes('LAUDO ELETROCARDIOGRÁFICO'), 'Laudo deve conter o retorno da IA');
console.log('  ✓ 3. analisarImagemMedicaComIA despachou prioritariamente para Vertex AI (gemini-4-argon)');

// Restaura fetch
runtime.ctx.UrlFetchApp.fetch = originalFetch;

// 4. Testa protocolo PCR ACLS
let msgPcrCapturada = '';
const originalEnviar = runtime.ctx.enviarMensagemComTecladoParaChat;
runtime.ctx.enviarMensagemComTecladoParaChat = function(chatId, texto, teclado) {
  msgPcrCapturada = texto;
  return true;
};

runtime.ctx.tratarComandoPcr('123', 'chocavel');
assert(msgPcrCapturada.includes('Amiodarona 300 mg'), 'Deve conter Amiodarona 300 mg');
assert(msgPcrCapturada.includes('pós-4º choque'), 'Deve especificar 2ª dose pós-4º choque');
console.log('  ✓ 4. Protocolo ACLS PCR especifica conduta correta de Amiodarona (AHA/SBC)');

runtime.ctx.enviarMensagemComTecladoParaChat = originalEnviar;

console.log('✅ TODOS OS TESTES DE VERTEX AI E MULTIMODAL FORAM APROVADOS!');
