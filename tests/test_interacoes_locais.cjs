const assert = require('assert');
const runtime = require('../server/runtime.js');

console.log('🧪 Iniciando testes de Interações Medicamentosas Locais...');

// 1. Checa status da fonte de dados
const statusInteracoes = runtime.ctx.checarStatusFonteDrive(runtime.ctx.ConfigService.get('SPREADSHEET_ID_INTERACOES'), true);
assert(statusInteracoes.includes('Conectada ✅'), 'Status deve indicar conectada');
assert(statusInteracoes.includes('219 registros'), 'Deve conter 219 registros');
console.log('✓ Status da fonte verificado:', statusInteracoes);

// 2. Checa recuperação da tabela completa
const baseInteracoes = runtime.ctx.obterPlanilha('interacoes', runtime.ctx.ConfigService.get('SPREADSHEET_ID_INTERACOES'), true, true);
const linhas = baseInteracoes.split('\n');
assert.equal(linhas.length, 219, 'Deve conter exatamente 219 linhas');
assert(linhas[0].includes('ANFOTERICINA B'), 'Primeira linha deve ser Anfotericina B');
assert(linhas[linhas.length - 1].includes('VANCOMICINA') && linhas[linhas.length - 1].includes('Varfarina'), 'Última linha deve ser Vancomicina x Varfarina');
console.log('✓ Tabela de 219 interações carregada com integridade total.');

// 3. Testa correspondência clínica para pares de alta gravidade
let promptCapturado = '';
runtime.ctx.executarRaciocinioClinico = (prompt, mensagem) => {
  promptCapturado = prompt + '\n' + mensagem;
  return 'Teste clínico executado com sucesso';
};

// Caso 1: Amiodarona + Sinvastatina (Risco de rabdomiólise)
runtime.ctx.verificarInteracaoComIA('amiodarona sinvastatina');
assert(promptCapturado.includes('AMIODARONA'), 'Prompt deve conter AMIODARONA');
assert(promptCapturado.includes('Sinvastatina'), 'Prompt deve conter Sinvastatina');
assert(promptCapturado.includes('rabdomiólise'), 'Prompt deve conter o efeito clínico de rabdomiólise da base local');
assert(promptCapturado.includes('Base Local (Tabela Farmacológica)'), 'Prompt deve instruir o uso da Base Local como fonte primária');
console.log('✓ Par Amiodarona + Sinvastatina recuperado com destaque de rabdomiólise.');

// Caso 2: Tramadol + Amitriptilina (Contraindicado - Síndrome Serotoninérgica)
promptCapturado = '';
runtime.ctx.verificarInteracaoComIA('tramadol amitriptilina');
assert(promptCapturado.includes('AMITRIPTILINA | Tramadol | Contraindicado'), 'Prompt deve priorizar o match exato de Tramadol com Amitriptilina');
assert(promptCapturado.includes('Síndrome Serotoninérgica'), 'Prompt deve indicar síndrome serotoninérgica da tabela');
console.log('✓ Par Tramadol + Amitriptilina recuperado com classificação Contraindicado.');

// Caso 3: Ciprofloxacino + Sais de Ferro (Quelação e diminuição de absorção)
promptCapturado = '';
runtime.ctx.verificarInteracaoComIA('ciprofloxacino sulfato ferroso');
assert(promptCapturado.includes('CIPROFLOXACINO | Sulfato Ferroso'), 'Prompt deve recuperar a interação de Ciprofloxacino com ferro');
assert(promptCapturado.includes('absorção'), 'Prompt deve conter mecanismo de absorção/quelação');
console.log('✓ Par Ciprofloxacino + Sulfato Ferroso recuperado com sucesso.');

// Caso 4: Medicamento sem cadastro na tabela local
promptCapturado = '';
runtime.ctx.verificarInteracaoComIA('fármaco_inexistente_xyz outra_droga');
assert(promptCapturado.includes('Nenhum registro para'), 'Prompt deve sinalizar ausência na base local');
assert(promptCapturado.includes('Conhecimento Geral (medicamento não cadastrado na Base Local)'), 'Fonte deve instruir conhecimento geral com rigor');
console.log('✓ Fallback seguro de fármaco não cadastrado testado com sucesso.');

console.log('\n🎉 TODOS OS TESTES DE INTERAÇÕES MEDICAMENTOSAS LOCAIS FORAM APROVADOS COM SUCESSO!');
