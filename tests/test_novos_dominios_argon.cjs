'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const DiluicaoDomain = require('../src/domain/diluicao_injetaveis_domain.js');
const PacotesDomain = require('../src/domain/pacotes_sindromicos_domain.js');
const ChecklistDomain = require('../src/domain/checklist_clinico_domain.js');
const TimeBlockingDomain = require('../src/domain/time_blocking_optimizer_domain.js');

test('DiluicaoInjetaveisDomain: Catálogo, consulta de fármaco e compatibilidade em Y', () => {
  const domain = new DiluicaoDomain();
  const catalogo = domain.listarCatalogo();
  assert.ok(catalogo.length >= 6, 'Deve listar no mínimo 6 fármacos críticos');

  // Consulta noradrenalina
  const nora = domain.consultarFarmaco('noradrenalina', 70);
  assert.equal(nora.id, 'noradrenalina');
  assert.ok(nora.nomeGenerico.includes('Norepinefrina'));
  assert.ok(Array.isArray(nora.tabelaTitulacao));
  assert.ok(nora.tabelaTitulacao.length > 0);
  assert.ok(nora.textoFormatado.includes('GUIA DE DILUIÇÃO E INFUSÃO'));

  // Compatibilidade em Y
  const compNoraAmio = domain.checarCompatibilidadeY('noradrenalina', 'amiodarona');
  assert.equal(compNoraAmio.status, 'compativel');
  assert.ok(compNoraAmio.textoFormatado.includes('PARECER DE COMPATIBILIDADE'));

  // Validação defensiva de limites
  assert.throws(() => domain.consultarFarmaco('farmaco_inexistente', 70), /não encontrado/i);
  assert.throws(() => domain.consultarFarmaco('noradrenalina', -5), /Peso inválido/i);
  assert.throws(() => domain.consultarFarmaco('noradrenalina', 400), /Peso inválido/i);
});

test('PacotesSindromicosDomain: Kits sindrômicos, escore Centor/McIsaac e PEP', () => {
  const domain = new PacotesDomain();
  const kits = domain.listarKits();
  assert.equal(kits.length, 5, 'Deve conter os 5 kits sindrômicos canônicos');

  // Cólica nefrética
  const colica = domain.obterKit('colica_nefretica', { pesoKg: 70 });
  assert.equal(colica.id, 'colica_nefretica');
  assert.ok(colica.prescricaoHospitalar.length >= 4);
  assert.ok(colica.prescricaoAlta.length >= 2);
  assert.ok(colica.textoCopiaPEP.includes('PROTOCOLO CLINICO E PRESCRICAO'));

  // Amigdalite com e sem alergia
  const amigdaliteSemAlergia = domain.obterKit('amigdalite_bacteriana', { alergiaPenicilina: false });
  const temBenzatina = amigdaliteSemAlergia.prescricaoHospitalar.some(p => p.farmaco.includes('Benzatina'));
  assert.ok(temBenzatina, 'Deve incluir Penicilina Benzatina para não alérgicos');

  const amigdaliteComAlergia = domain.obterKit('amigdalite_bacteriana', { alergiaPenicilina: true });
  const temAzitro = amigdaliteComAlergia.prescricaoAlta.some(p => p.farmaco.includes('Azitromicina'));
  assert.ok(temAzitro, 'Deve incluir macrolídeo (Azitromicina) para alérgicos');

  // Avaliação Centor/McIsaac
  const centorAlto = domain.avaliarEscore('centor_mcisaac', {
    febre: true,
    ausenciaTosse: true,
    adenomegalia: true,
    exsudato: true,
    idade: 25
  });
  assert.ok(centorAlto.pontuacao >= 3);
  assert.ok(centorAlto.condutaRecomendada.length > 10);

  // Formatação para Telegram
  const txtTelegram = domain.gerarTextoFormatadoTelegram('colica_nefretica');
  assert.ok(txtTelegram.includes('CÓLICA NEFRÉTICA'));
});

test('ChecklistClinicoDomain: FAST-HUG SB, manipulação de bitmask e relatórios de segurança', () => {
  const domain = new ChecklistDomain();
  const listas = domain.listarChecklists();
  assert.ok(listas.length >= 4);

  const chk = domain.obterChecklist('fast_hug_sb');
  assert.equal(chk.itens.length, 9);

  // Manipulação de bits
  let mask = 0;
  mask = domain.alternarBit(mask, 0); // Feeding
  assert.equal(mask, 1);
  mask = domain.alternarBit(mask, 1); // Analgesia
  assert.equal(mask, 3);

  // Avaliação com itens pendentes
  const avalParcial = domain.avaliar('fast_hug_sb', mask);
  assert.equal(avalParcial.completados, 2);
  assert.equal(avalParcial.status, 'incompleto');
  assert.equal(avalParcial.aprovadoSeguranca, false);

  // Completar todos os bits
  const maskCompleta = (1 << chk.itens.length) - 1;
  const avalCompleta = domain.avaliar('fast_hug_sb', maskCompleta);
  assert.equal(avalCompleta.completados, 9);
  assert.equal(avalCompleta.status, 'completo');
  assert.equal(avalCompleta.aprovadoSeguranca, true);

  // Formatação Telegram
  const txtFormatado = domain.gerarTextoFormatadoTelegram('fast_hug_sb', mask);
  assert.ok(txtFormatado.includes('[x]'));
  assert.ok(txtFormatado.includes('[ ]'));
});

test('TimeBlockingOptimizerDomain: Remanejamento dinâmico, proteção do sono e degradação graciosa', () => {
  const domain = new TimeBlockingDomain();

  // Otimização normal sem atraso
  const optNormal = domain.otimizarGrade({
    horaAtual: '14:00',
    atrasoMinutos: 0,
    blocosConcluidos: ['bloco_plantao_manha']
  });
  assert.ok(Array.isArray(optNormal.timeline));
  assert.ok(optNormal.timeline.length > 0);

  // Otimização com atraso excessivo de 240 minutos (degradação graciosa)
  const optAtraso = domain.otimizarGrade({
    horaAtual: '17:00',
    atrasoMinutos: 240,
    blocosConcluidos: []
  });
  assert.ok(Array.isArray(optAtraso.timeline));
  // O teto das 22:30 (1350 min) deve ser rigorosamente respeitado para todos os blocos com horário alocado
  for (const bloco of optAtraso.timeline) {
    if (bloco.fimMin !== undefined && bloco.status !== 'CANCELADO_POR_TETO_SONO') {
      assert.ok(bloco.fimMin <= 1350, `Bloco ${bloco.id} (${bloco.fim}) não pode ultrapassar 22:30`);
    }
  }

  // Simulação de cenários com plantão estendido
  const simulacao = domain.simularCenarios('16:00', 90);
  assert.ok(simulacao.impactoLiquido.perdaMinutosEstudo >= 0);

  // Formatação para exibição
  const txtTimeline = domain.gerarTimelineFormatada(optNormal);
  assert.ok(txtTimeline.includes('COCKPIT TIME-BLOCKING MÉDICO'));
});
