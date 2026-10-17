/**
 * BATERIA DE TESTES: PIPELINE DETERMINÍSTICO E GATEKEEPER CLÍNICO REMUME (GEMINI 4 ARGON)
 * Valida:
 * 1. Filtro estrito de domínios oficiais (_ehUrlOficialConfiavel).
 * 2. Gatekeeper Clínico de Sanidade Farmacológica (validarSanidadeClinicaRemume).
 * 3. Parser estruturado de HTML/Tabelas (_limparHtmlParaTexto).
 * 4. Resiliência do fluxo de busca web e fallback seguro para RENAME Nacional.
 */
const assert = require('assert');
const path = require('path');
const CatalogoRemumeService = require('../src/data/remumes/index.js');

let total = 0, pass = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    pass++;
    console.log('✅ APROVADO: ' + name);
  } catch (e) {
    process.exitCode = 1;
    console.error('❌ FALHOU: ' + name + '\n' + e.stack);
  }
}

// 1. Validação estrita de domínios oficiais (.gov.br / prefeituras)
test('1. _ehUrlOficialConfiavel valida domínios governamentais e rejeita URLs genéricas', () => {
  // Domínios válidos
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://garrafaodonorte.pa.gov.br/saude/remume.pdf'), true);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://saude.sp.gov.br/documentos/remume.html'), true);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://prefeiturabauru.sp.gov.br/medicamentos'), true);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://camaracampinas.sp.gov.br/leis/remume'), true);

  // Domínios inválidos/rejeitados por segurança
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://farmaciaonline.com/remedios.pdf'), false);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('https://blogmedicamentos.com.br/garrafao'), false);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel('http://site-suspeito.net/lista.txt'), false);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel(''), false);
  assert.strictEqual(CatalogoRemumeService._ehUrlOficialConfiavel(null), false);
});

// 2. Gatekeeper Clínico de Sanidade Farmacológica
test('2. validarSanidadeClinicaRemume reprova documento que não menciona o município', () => {
  const textoSemCidade = 'Lista de medicamentos essenciais de Bauru: Dipirona 500mg, Amoxicilina 500mg, Losartana 50mg, Metformina 850mg, Omeprazol 20mg.';
  const itens = [
    'Dipirona Sódica 500 mg - Comprimido',
    'Amoxicilina 500 mg - Cápsula',
    'Losartana Potássica 50 mg - Comprimido',
    'Metformina 850 mg - Comprimido',
    'Omeprazol 20 mg - Cápsula'
  ];

  const res = CatalogoRemumeService.validarSanidadeClinicaRemume(textoSemCidade, itens, 'Garrafão do Norte', 'PA');
  assert.strictEqual(res.aprovado, false);
  assert.match(res.motivo, /vínculo territorial/i);
});

test('3. validarSanidadeClinicaRemume reprova documento com menos de 5 medicamentos âncora do SUS', () => {
  const textoComPoucasAncoras = 'Prefeitura de Garrafão do Norte - REMUME: Apenas Dipirona 500mg e Paracetamol 500mg.';
  const itens = [
    'Dipirona Sódica 500 mg - Comprimido',
    'Paracetamol 500 mg - Comprimido'
  ];

  const res = CatalogoRemumeService.validarSanidadeClinicaRemume(textoComPoucasAncoras, itens, 'Garrafão do Norte', 'PA');
  assert.strictEqual(res.aprovado, false);
  assert.match(res.motivo, /medicamentos âncora/i);
});

test('4. validarSanidadeClinicaRemume aprova documento oficial completo com 5+ âncoras e densidade farmacológica', () => {
  const textoValido = `
    PREFEITURA MUNICIPAL DE GARRAFÃO DO NORTE - PA
    SECRETARIA MUNICIPAL DE SAÚDE
    RELAÇÃO MUNICIPAL DE MEDICAMENTOS ESSENCIAIS (REMUME)
    1. Amoxicilina 500mg cápsula
    2. Dipirona Sódica 500mg comprimido
    3. Losartana Potássica 50mg comprimido
    4. Metformina 850mg comprimido
    5. Omeprazol 20mg cápsula
    6. Hidroclorotiazida 25mg comprimido
    7. Enalapril 10mg comprimido
    8. Salbutamol 100mcg aerossol
    9. Paracetamol 500mg comprimido
    10. Glibenclamida 5mg comprimido
    11. Cefalexina 500mg cápsula
    12. Azitromicina 500mg comprimido
    13. Ibuprofeno 600mg comprimido
    14. Furosemida 40mg comprimido
    15. Sinvastatina 20mg comprimido
    16. Prednisona 20mg comprimido
  `;

  const itens = CatalogoRemumeService.extrairMedicamentosDeTextoBruto(textoValido);
  assert.ok(itens.length >= 15, 'Deve ter extraído ao menos 15 medicamentos válidos');

  const res = CatalogoRemumeService.validarSanidadeClinicaRemume(textoValido, itens, 'Garrafão do Norte', 'PA');
  assert.strictEqual(res.aprovado, true, 'Deve ser aprovado pelo Gatekeeper');
  assert.ok(res.ancorasEncontradas.length >= 5, 'Deve conter 5 ou mais âncoras');
});

// 5. Parser de HTML para texto estruturado
test('5. _limparHtmlParaTexto preserva tabelas com delimitadores estruturados para parser farmacológico', () => {
  const html = `
    <html>
      <body>
        <h1>Prefeitura Municipal de Garrafão do Norte</h1>
        <table>
          <tr><th>Medicamento</th><th>Dosagem</th><th>Forma</th></tr>
          <tr><td>Amoxicilina</td><td>500mg</td><td>cápsula</td></tr>
          <tr><td>Dipirona</td><td>500mg</td><td>comprimido</td></tr>
        </table>
      </body>
    </html>
  `;

  const textoLimpo = CatalogoRemumeService._limparHtmlParaTexto(html);
  assert.match(textoLimpo, /Garrafão do Norte/i);
  assert.match(textoLimpo, /Amoxicilina\s*;\s*500mg\s*;\s*cápsula/i);

  const meds = CatalogoRemumeService.extrairMedicamentosDeTextoBruto(textoLimpo);
  assert.ok(meds.length >= 2, 'Deve extrair os medicamentos da tabela HTML');
});

console.log(`\nRESULTADO FINAL: ${pass}/${total} testes aprovados.`);
if (pass !== total) process.exit(1);
