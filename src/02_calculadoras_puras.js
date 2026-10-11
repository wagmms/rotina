/**
 * ==============================================================================
 * MÓDULO 02: CALCULADORAS CLÍNICAS DETERMINÍSTICAS  ·  v3.0.0
 * Compatível com Google Apps Script (V8) e Node.js. Sem dependências externas.
 * ==============================================================================
 * CONTRATO DE QUALIDADE (Conselho de Especialistas: Kimi K3 + Nemotron 3 + GPT-6.1 Sol + Sonnet 5.5)
 *  - Funções puras: sem I/O, sem data/hora, sem aleatoriedade, sem estado global.
 *  - Validação estrita: tipo numérico, finitude, limites fisiológicos.
 *  - Tolerância de ponto flutuante: EPS 1e-9; soma de Wells em meios-pontos inteiros.
 *  - Imunidade a falhas: try/catch global em cada calculadora; nenhuma exceção ou NaN vaza.
 *  - UX Telegram: retornos em HTML formatado com estados funcionais (🔴, 🟠, 🟢, 🔵, ⚪, ⛔)
 *    e teclados inline pré-montados ('calc:<id>:<acao>').
 *  - Camada de compatibilidade reversa: mantém propriedades legadas (textoFormatado, etc.)
 *    para não quebrar handlers existentes nem integrações com IA.
 *
 * REFERÊNCIAS: KDIGO 2024 (CKD-EPI 2021 race-free); SBC 2025 / ESC 2024 (CHA2DS2-VA);
 *   Lim et al. 2003 (CURB-65); Pisters 2010 (HAS-BLED); Wells 2000/2001;
 *   Brennan 2018 (GCS-P); Surviving Sepsis Campaign 2021; Berlim 2012 (SDRA).
 * ==============================================================================
 */

var CalculadorasClinicas = (function () {
  'use strict';

  var VERSAO = '3.0.0';
  var EPS = 1e-9;

  // ───────────────────────── Estados visuais ─────────────────────────
  var ESTADOS = {
    PRIORITARIO: { icone: '🔴', texto: 'AVALIAÇÃO PRIORITÁRIA' },
    ATENCAO:     { icone: '🟠', texto: 'ATENÇÃO' },
    BAIXO:       { icone: '🟢', texto: 'BAIXO RISCO PELO ESCORE' },
    CALCULO:     { icone: '🔵', texto: 'ESTIMATIVA / CÁLCULO' },
    INCOMPLETO:  { icone: '⚪', texto: 'INCOMPLETO' },
    ERRO:        { icone: '⛔', texto: 'NÃO CALCULADO' },
    INTERROMPIDO:{ icone: '⛔', texto: 'CÁLCULO INTERROMPIDO' }
  };

  // ───────────────────────── Utilitários numéricos ─────────────────────────
  function lt(a, b)  { return a < b - EPS; }
  function lte(a, b) { return a <= b + EPS; }
  function gt(a, b)  { return a > b + EPS; }
  function gte(a, b) { return a >= b - EPS; }

  function arred(x, casas) {
    var f = Math.pow(10, casas);
    var s = x < 0 ? -1 : 1;
    return s * Math.round((Math.abs(x) + 1e-12) * f) / f;
  }

  function fmt(x, casas) {
    var r = arred(x, casas);
    if (r === 0) r = 0;
    return r.toFixed(casas).replace('.', ',');
  }

  function fmtMl(x) { return fmt(x, x < 1 ? 2 : 1); }

  function exigirFinito() {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] !== 'number' || !isFinite(arguments[i])) {
        throw new Error('RESULTADO_NAO_FINITO');
      }
    }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function semAcento(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  // ───────────────────────── Contexto de validação ─────────────────────────
  function novoCtx() { return { erros: [], faltas: [], avisos: [] }; }

  function ausente(v) {
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  }

  function num(ctx, v, nome, min, max, opt) {
    opt = opt || {};
    if (ausente(v)) {
      if (opt.opcional) return null;
      ctx.faltas.push(nome);
      return NaN;
    }
    var x;
    if (typeof v === 'number') {
      x = v;
    } else if (typeof v === 'string') {
      var s = v.trim().replace(',', '.');
      if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) {
        ctx.erros.push(nome + ': valor não numérico');
        return NaN;
      }
      x = Number(s);
    } else {
      ctx.erros.push(nome + ': tipo inválido');
      return NaN;
    }
    if (!isFinite(x)) { ctx.erros.push(nome + ': valor não finito'); return NaN; }
    if (opt.inteiro && Math.floor(x) !== x) { ctx.erros.push(nome + ': deve ser inteiro'); return NaN; }
    if (x < min || x > max) {
      ctx.erros.push(nome + ': fora da faixa plausível (' + min + ' a ' + max + ')');
      return NaN;
    }
    return x;
  }

  function bool(ctx, v, nome) {
    if (ausente(v)) { ctx.faltas.push(nome); return null; }
    if (v === true || v === false) return v;
    if (v === 1 || v === 0) return v === 1;
    if (typeof v === 'string') {
      var s = semAcento(v);
      if (s === 'true' || s === 'sim' || s === 's' || s === '1') return true;
      if (s === 'false' || s === 'nao' || s === 'n' || s === '0') return false;
    }
    ctx.erros.push(nome + ': esperado sim/não');
    return null;
  }

  function pendente(ctx) { return ctx.erros.length > 0 || ctx.faltas.length > 0; }

  // ───────────────────────── Renderização Telegram ─────────────────────────
  function btn(texto, id, acao) {
    if (id === 'ux') {
      return { text: texto, callback_data: ('ux:' + acao).slice(0, 64) };
    }
    return { text: texto, callback_data: ('calc:' + id + ':' + acao).slice(0, 64) };
  }

  function montar(o) {
    var est = ESTADOS[o.estado] || ESTADOS.CALCULO;
    var rotulo = o.rotulo || est.texto;
    var L = [];
    L.push(est.icone + ' <b>' + esc(rotulo) + '</b>');
    L.push(esc(o.nome) + ' · <b>' + esc(o.principal) + '</b>');
    (o.secoes || []).forEach(function (s) {
      if (!s[1] || !s[1].length) return;
      L.push('');
      L.push('<b>' + esc(s[0]) + '</b>');
      s[1].forEach(function (x) { L.push('• ' + esc(x)); });
    });
    (o.avisos || []).forEach(function (a, i) {
      if (i === 0) L.push('');
      L.push('⚠️ ' + esc(a));
    });
    return L.join('\n');
  }

  function sucesso(o) {
    var estObj = ESTADOS[o.estado] || ESTADOS.CALCULO;
    var txt = montar(o);
    var obj = {
      ok: true,
      id: o.id,
      nome: o.nome,
      estado: o.rotulo || estObj.texto,
      rotulo: o.rotulo || estObj.texto,
      icone: estObj.icone,
      principal: o.principal,
      dados: o.dados || {},
      avisos: o.avisos || [],
      texto: txt,
      textoFormatado: txt, // Compatibilidade reversa
      botoes: o.botoes || [],
      versao: VERSAO
    };
    // Mescla campos legados diretamente no topo se existirem
    if (o.legado) {
      for (var k in o.legado) {
        if (o.legado.hasOwnProperty(k)) {
          obj[k] = o.legado[k];
        }
      }
    }
    return obj;
  }

  function falhaCtx(id, nome, ctx) {
    var inval = ctx.erros.length > 0;
    var est = inval ? 'ERRO' : 'INCOMPLETO';
    var secoes = [];
    if (inval) {
      secoes.push(['CORRIGIR', ctx.erros.slice()]);
      if (ctx.faltas.length) secoes.push(['FALTA INFORMAR', ctx.faltas.slice()]);
    } else {
      secoes.push(['FALTA INFORMAR', ctx.faltas.slice()]);
    }
    var txt = montar({
      estado: est,
      nome: nome,
      principal: inval ? 'Nenhuma classificação gerada' : 'Dados ausentes não foram considerados negativos',
      secoes: secoes
    });
    var msgErro = (ctx.erros[0] || ctx.faltas[0] || 'Parâmetros inválidos');
    return {
      ok: false,
      id: id,
      nome: nome,
      estado: ESTADOS[est].texto,
      icone: ESTADOS[est].icone,
      erro: msgErro, // Compatibilidade reversa
      erros: ctx.erros.slice(),
      faltas: ctx.faltas.slice(),
      avisos: [],
      texto: txt,
      textoFormatado: txt,
      botoes: [[btn('✏️ Corrigir dados', id, 'editar'), btn('↩️ Voltar', id, 'voltar')]],
      versao: VERSAO
    };
  }

  function falhaInterna(id, nome, e) {
    var codigo = 'E_' + id.toUpperCase() + '_' + (e && e.message ? String(e.message).replace(/[^A-Z0-9_]/gi, '').slice(0, 24).toUpperCase() : 'DESCONHECIDO');
    var txt = montar({
      estado: 'INTERROMPIDO',
      nome: nome,
      principal: 'Sem resultado válido',
      secoes: [['DETALHE', ['Não foi possível produzir um resultado numérico válido.', 'Nenhuma classificação ou orientação foi gerada.', 'Código: ' + codigo]]]
    });
    return {
      ok: false,
      id: id,
      nome: nome,
      estado: ESTADOS.INTERROMPIDO.texto,
      icone: ESTADOS.INTERROMPIDO.icone,
      erro: 'Erro interno no cálculo: ' + codigo,
      codigo: codigo,
      avisos: [],
      texto: txt,
      textoFormatado: txt,
      botoes: [[btn('✏️ Revisar entradas', id, 'editar'), btn('🛠️ Reportar erro', id, 'erro')]],
      versao: VERSAO
    };
  }

  function seguro(id, nome, fn) {
    try { return fn(); } catch (e) { return falhaInterna(id, nome, e); }
  }

  function botoesPadrao(id, linha1) {
    var l1 = Array.isArray(linha1) ? linha1 : [];
    return [l1, [btn('🔙 Sala Vermelha', 'ux', 'hub:sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
  }

  function botoesEmergencia(id, linha1) {
    var l1 = Array.isArray(linha1) ? linha1 : [];
    return [l1, [btn('🔙 Sala Vermelha', 'ux', 'hub:sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
  }

  // ═════════════════════════════ ESCORES ═════════════════════════════

  /** CURB-65 (Lim 2003). Ureia em mg/dL (corte > 50). */
  function curb65(confusao, ureia, fr, pas, pad, idade) {
    var ID = 'curb65', NOME = 'CURB-65';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var conf = bool(c, confusao, 'Confusão mental aguda');
      var u = num(c, ureia, 'Ureia (mg/dL)', 1, 500);
      var f = num(c, fr, 'FR (irpm)', 4, 80);
      var s = num(c, pas, 'PAS (mmHg)', 40, 300);
      var d = num(c, pad, 'PAD (mmHg)', 20, 200);
      var i = num(c, idade, 'Idade (anos)', 0, 120);
      if (!pendente(c) && d >= s) c.erros.push('PAD deve ser menor que a PAS');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [];
      if (conf) crit.push('Confusão mental aguda (+1)');
      if (gt(u, 50)) crit.push('Ureia ' + fmt(u, 0) + ' mg/dL (> 50) (+1)');
      if (gte(f, 30)) crit.push('FR ' + fmt(f, 0) + ' irpm (≥ 30) (+1)');
      if (lt(s, 90) || lte(d, 60)) crit.push('PA ' + fmt(s, 0) + '/' + fmt(d, 0) + ' mmHg (PAS < 90 ou PAD ≤ 60) (+1)');
      if (gte(i, 65)) crit.push('Idade ' + fmt(i, 0) + ' anos (≥ 65) (+1)');
      var score = crit.length;

      var estado, rotulo, mort, acoes, riscoTexto, condutaTexto;
      if (score <= 1) {
        estado = 'BAIXO'; rotulo = 'BAIXO RISCO PELO ESCORE'; mort = '~1,5%';
        riscoTexto = 'Baixo Risco (Mortalidade ~1.5%)';
        condutaTexto = 'Tratamento ambulatorial habitualmente seguro. Antibioticoterapia oral (ex: Amoxicilina + Clavulanato ou Macrolídeo).';
        acoes = ['Tratamento ambulatorial pode ser considerado.', 'Conferir SpO₂, comorbidades e suporte domiciliar.'];
      } else if (score === 2) {
        estado = 'ATENCAO'; rotulo = 'RISCO INTERMEDIÁRIO PELO ESCORE'; mort = '~9,2%';
        riscoTexto = 'Risco Moderado (Mortalidade ~9.2%)';
        condutaTexto = 'Considerar internação hospitalar em enfermaria ou supervisão ambulatorial estrita nas primeiras 48h.';
        acoes = ['Considerar internação em enfermaria ou observação curta.', 'Conferir SpO₂ e necessidade de oxigênio.'];
      } else {
        estado = 'PRIORITARIO'; rotulo = 'ALTO RISCO PELO ESCORE'; mort = '~22%';
        riscoTexto = 'Alto Risco (Mortalidade 15% a 40%)';
        condutaTexto = score >= 4 ? 'Internar; leito de UTI prioritário. Avaliar suporte intensivo e sepse.' : 'Internar em leito hospitalar. Avaliar UTI se instabilidade hemodinâmica.';
        acoes = score >= 4
          ? ['Internar; avaliar leito de UTI.', 'Avaliar sepse, oxigenação e necessidade de suporte.']
          : ['Internar; reavaliar gravidade em curto prazo.', 'Avaliar sepse e oxigenação; considerar UTI se instável.'];
      }
      var avisosCurb = [(5 - score) + ' critérios negativos conferidos. O escore isolado não autoriza alta nem define UTI.'];
      if (gte(i, 90)) {
        avisosCurb.unshift('⚠️ Paciente muito idoso / nonagenário (≥ 90 anos): Apresentação atípica comum (confusão mental aguda, prostração, sem febre/tosse). Limiar baixo para internação hospitalar e vigilância intensiva.');
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: score + '/5 · mortalidade 30 d ' + mort + ' (grupo)',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
                 ['AÇÃO', acoes]],
        avisos: avisosCurb,
        dados: { pontos: score, maximo: 5, criterios: crit },
        legado: {
          pontuacao: score + '/5',
          criterios: crit,
          risco: riscoTexto,
          conduta: condutaTexto
        },
        botoes: botoesPadrao(ID, [btn('🫁 Avaliar gravidade', ID, 'gravidade'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** CKD-EPI 2021 (sem raça). Creatinina em mg/dL. Adultos ≥ 18 anos. */
  function ckdEpi2021(creatinina, idade, ehFeminino) {
    var ID = 'ckdepi', NOME = 'CKD-EPI 2021';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var id = num(c, idade, 'Idade (anos)', 18, 120);
      var fem = bool(c, ehFeminino, 'Sexo feminino (parâmetro da equação)');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var kappa = fem ? 0.7 : 0.9, alfa = fem ? -0.241 : -0.302, mult = fem ? 1.012 : 1.0;
      var r = cr / kappa;
      var tfg = 142 * Math.pow(Math.min(r, 1), alfa) * Math.pow(Math.max(r, 1), -1.200) * Math.pow(0.9938, id) * mult;
      exigirFinito(tfg);

      var g, desc;
      if (gte(tfg, 90)) { g = 'G1'; desc = 'Normal ou elevada (≥ 90 mL/min/1.73m²)'; }
      else if (gte(tfg, 60)) { g = 'G2'; desc = 'Levemente diminuída (60–89 mL/min/1.73m²)'; }
      else if (gte(tfg, 45)) { g = 'G3a'; desc = 'Leve a moderadamente diminuída (45–59 mL/min/1.73m²)'; }
      else if (gte(tfg, 30)) { g = 'G3b'; desc = 'Moderada a gravemente diminuída (30–44 mL/min/1.73m²)'; }
      else if (gte(tfg, 15)) { g = 'G4'; desc = 'Gravemente diminuída (15–29 mL/min/1.73m²)'; }
      else { g = 'G5'; desc = 'Falência renal (< 15 mL/min/1.73m²)'; }
      var grave = (g === 'G4' || g === 'G5');

      var tfgNum = Math.round(tfg * 10) / 10;
      return sucesso({
        id: ID, nome: NOME, estado: grave ? 'ATENCAO' : 'CALCULO',
        rotulo: grave ? 'TFG GRAVEMENTE REDUZIDA' : null,
        principal: fmt(tfg, 1) + ' mL/min/1,73 m²',
        secoes: [
          ['CATEGORIA', [g + ': ' + desc]],
          ['ENTRADAS', ['Creatinina: ' + fmt(cr, 2) + ' mg/dL', 'Idade: ' + fmt(id, 0) + ' anos', 'Parâmetro sexual: ' + (fem ? 'feminino' : 'masculino')]],
          ['AÇÃO', ['Válida apenas com creatinina estável.', 'Para dose de fármaco, conferir também o clearance (Cockcroft-Gault) e a bula.']]
        ],
        avisos: (function () {
          var av = ['Em lesão renal aguda, sarcopenia ou dieta atípica a eTFG pode ser imprecisa; considerar cistatina C (KDIGO 2024). Categoria de eTFG isolada não define DRC.'];
          if (gt(cr, 15)) av.unshift('🚨 Creatinina extremamente elevada (> 15 mg/dL): Falência renal grave/terminal. As equações perdem acurácia na uremia anúrica; avaliar suporte dialítico urgente.');
          if (gte(id, 90)) av.push('⚠️ Paciente muito idoso (≥ 90 anos): Sarcopenia fisiológica comum resulta em creatinina sérica reduzida e eTFG superestimada. Considerar dosagem de Cistatina C.');
          return av;
        })(),
        dados: { tfg: tfgNum, categoria: g, estagio: g },
        legado: {
          tfg: tfgNum,
          estagio: g,
          descricao: desc
        },
        botoes: botoesPadrao(ID, [btn('💊 Revisar ajuste renal', ID, 'ajuste'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Cockcroft-Gault (mL/min). Se altura informada e IMC ≥ 30, usa peso ajustado. */
  function cockcroftGault(creatinina, pesoKg, idade, ehFeminino, alturaCm) {
    var ID = 'cg', NOME = 'Cockcroft-Gault';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var peso = num(c, pesoKg, 'Peso (kg)', 20, 350);
      var id = num(c, idade, 'Idade (anos)', 18, 120);
      var fem = bool(c, ehFeminino, 'Sexo feminino (parâmetro da equação)');
      var alt = num(c, alturaCm, 'Altura (cm)', 100, 230, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var pesoUsado = peso, tipo = 'real', imc = null, pib = null, avisos = [];
      if (alt !== null) {
        imc = peso / Math.pow(alt / 100, 2);
        var pol = alt / 2.54;
        pib = (fem ? 45.5 : 50) + 2.3 * (pol - 60);
        if (pib <= 0) throw new Error('PIB_INVALIDO');
        if (gte(imc, 30)) {
          pesoUsado = pib + 0.4 * (peso - pib);
          tipo = 'ajustado (IMC ' + fmt(imc, 1) + ' ≥ 30)';
        } else if (lt(peso, pib)) {
          tipo = 'real (menor que o ideal)';
        }
      } else {
        avisos.push('Altura não informada: peso real usado. Em IMC ≥ 30 o clearance fica superestimado.');
      }
      var cl = ((140 - id) * pesoUsado) / (72 * cr);
      if (fem) cl *= 0.85;
      exigirFinito(cl, pesoUsado);
      if (cl < 0) cl = 0;
      if (gt(cr, 15)) avisos.unshift('🚨 Creatinina extremamente elevada (> 15 mg/dL): Falência renal terminal com risco iminente de síndrome urêmica.');
      if (gte(id, 90)) avisos.push('⚠️ Paciente muito idoso (≥ 90 anos): Sarcopenia reduz a produção de creatinina, superestimando o clearance real.');
      if (gt(peso, 150)) avisos.push('⚠️ Obesidade severa (> 150 kg): O cálculo com peso real superestima o clearance. Recomenda-se utilizar o Peso Ajustado para ajuste posológico.');
      if (gt(cl, 200)) avisos.push('Valor muito alto: conferir peso, idade e creatinina.');
      avisos.push('Fórmula válida só com creatinina estável (não usar em lesão renal aguda). Unidade: mL/min, não mL/min/1,73 m².');

      var estado, acao;
      if (lt(cl, 30)) { estado = 'ATENCAO'; acao = ['Clearance < 30 mL/min: revisar dose da maioria dos fármacos de excreção renal.']; }
      else if (lt(cl, 50)) { estado = 'ATENCAO'; acao = ['Clearance 30–49 mL/min: conferir ajuste de fármacos de excreção renal.']; }
      else { estado = 'CALCULO'; acao = ['Conferir a regra de ajuste do medicamento escolhido; limiares variam por fármaco.']; }

      var entradas = [
        'Creatinina: ' + fmt(cr, 2) + ' mg/dL',
        'Idade: ' + fmt(id, 0) + ' anos',
        'Peso usado: ' + fmt(pesoUsado, 1) + ' kg · ' + tipo,
        'Parâmetro sexual da equação: ' + (fem ? 'feminino' : 'masculino')
      ];
      var clNum = Math.round(cl * 10) / 10;
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: estado === 'ATENCAO' ? 'REVISÃO DE DOSE NECESSÁRIA' : null,
        principal: fmt(cl, 0) + ' mL/min',
        secoes: [['ENTRADAS', entradas], ['AÇÃO', acao]], avisos: avisos,
        dados: { clearance: clNum, pesoUsadoKg: pesoUsado, tipoPeso: tipo, imc: imc },
        legado: { clearance: clNum, pesoUsadoKg: pesoUsado, tipoPeso: tipo, imc: imc },
        botoes: botoesPadrao(ID, [btn('💊 Selecionar medicamento', ID, 'medicamento'), btn('⚖️ Revisar peso', ID, 'peso')])
      });
    });
  }

  /** Fórmula de Schwartz Pediátrico (atualizada 2009). mL/min/1,73m² para 1 a 17 anos. */
  function schwartzPediatrico(creatinina, alturaCm) {
    var ID = 'schwartz', NOME = 'Schwartz Pediátrico (Atualizado)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 15);
      var alt = num(c, alturaCm, 'Altura (cm)', 40, 220);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var cl = (0.413 * alt) / cr;
      exigirFinito(cl);
      if (cl < 0) cl = 0;
      
      var estado, acao, avisos = [];
      if (lt(cl, 30)) { estado = 'ATENCAO'; acao = ['Clearance < 30 mL/min/1.73m²: Insuficiência renal grave. Ajuste mandatório de fármacos.']; }
      else if (lt(cl, 50)) { estado = 'ATENCAO'; acao = ['Clearance 30–49 mL/min/1.73m²: Insuficiência renal moderada. Conferir bulas.']; }
      else { estado = 'CALCULO'; acao = ['Clearance normal ou levemente reduzido.']; }

      if (gt(cl, 150)) avisos.push('⚠️ Valor > 150 mL/min/1.73m² sugere hiperfiltração ou erro de dados.');

      var entradas = [
        'Creatinina: ' + fmt(cr, 2) + ' mg/dL',
        'Altura: ' + fmt(alt, 1) + ' cm'
      ];
      var clNum = Math.round(cl * 10) / 10;
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: estado === 'ATENCAO' ? 'REVISÃO DE DOSE NECESSÁRIA' : null,
        principal: fmt(cl, 0) + ' mL/min/1.73m²',
        secoes: [['ENTRADAS', entradas], ['AÇÃO', acao]], avisos: avisos,
        dados: { clearance: clNum, alturaCm: alt, creatinina: cr },
        legado: { clearance: clNum, alturaCm: alt, creatinina: cr },
        botoes: botoesPadrao(ID, [btn('💊 Selecionar medicamento', ID, 'medicamento')])
      });
    });
  }

  /**
   * CHA2DS2-VA (SBC 2025 / ESC 2024): sem pontuação para sexo feminino.
   * a2 = idade ≥ 75 (+2); a = idade 65–74 (+1).
   */
  function cha2ds2va(c1, h, a2, d, s2, v, a) {
    var ID = 'cha2ds2va', NOME = 'CHA₂DS₂-VA';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ic = bool(c, c1, 'Insuficiência cardíaca / disfunção de VE');
      var has = bool(c, h, 'Hipertensão arterial');
      var i75 = bool(c, a2, 'Idade ≥ 75 anos');
      var dm = bool(c, d, 'Diabetes mellitus');
      var avc = bool(c, s2, 'AVC / AIT / tromboembolismo prévio');
      var vasc = bool(c, v, 'Doença vascular (IAM, DAOP, placa aórtica)');
      var i65 = bool(c, a, 'Idade 65–74 anos');
      if (!pendente(c) && i75 && i65) c.erros.push('Idade ≥ 75 e 65–74 não podem ser ambas verdadeiras');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [], score = 0;
      function add(cond, txt, p) { if (cond) { score += p; crit.push(txt + ' · +' + p); } }
      add(ic, 'Insuficiência cardíaca', 1);
      add(has, 'Hipertensão', 1);
      add(i75, 'Idade ≥ 75 anos', 2);
      add(dm, 'Diabetes mellitus', 1);
      add(avc, 'AVC/AIT/tromboembolismo prévio', 2);
      add(vasc, 'Doença vascular', 1);
      add(i65 && !i75, 'Idade 65–74 anos', 1);
      var neg = 7 - crit.length;

      var estado, rotulo, acoes, recTexto;
      if (score === 0) {
        estado = 'BAIXO'; rotulo = 'BAIXO RISCO TROMBOEMBÓLICO';
        recTexto = 'Baixo risco (0 pontos). Anticoagulação oral habitualmente NÃO recomendada.';
        acoes = ['Anticoagulação oral não indicada pelo escore.', 'Reavaliar periodicamente.'];
      } else if (score === 1) {
        estado = 'ATENCAO'; rotulo = 'RISCO INTERMEDIÁRIO';
        recTexto = 'Risco intermediário (1 ponto). Considerar anticoagulação oral individualizada.';
        acoes = ['Considerar anticoagulação oral (individualizar).', 'Pesar risco de sangramento (HAS-BLED).'];
      } else {
        estado = 'PRIORITARIO'; rotulo = 'ANTICOAGULAÇÃO RECOMENDADA';
        recTexto = 'Alto risco (≥ 2 pontos). Anticoagulação oral fortemente recomendada (preferência DOACs).';
        acoes = ['Anticoagulação oral recomendada; DOAC preferencial.', 'Conferir função renal, interações e contraindicações.'];
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: score + '/8',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']], ['AÇÃO', acoes]],
        avisos: [neg + ' critérios negativos conferidos. Não se aplica a estenose mitral moderada/grave ou prótese mecânica (usar AVK). Diretriz ESC 2024 / SBC 2025.'],
        dados: { pontos: score, maximo: 8, criterios: crit },
        legado: { pontuacao: score, recomendacao: recTexto, criterios: crit },
        botoes: botoesPadrao(ID, [btn('💊 Revisar anticoagulação', ID, 'anticoag'), btn('🩸 Avaliar sangramento', ID, 'hasbled')])
      });
    });
  }

  /**
   * Compatibilidade com versão legada (CHA2DS2-VASc com sexo feminino como 8º argumento).
   */
  function cha2ds2vasc(c1, h, a2, d, s2, v, a, scFeminino) {
    var ID = 'cha2ds2vasc', NOME = 'CHA₂DS₂-VASc';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ic = bool(c, c1, 'Insuficiência cardíaca / disfunção VE');
      var has = bool(c, h, 'Hipertensão arterial');
      var i75 = bool(c, a2, 'Idade ≥ 75 anos');
      var dm = bool(c, d, 'Diabetes mellitus');
      var avc = bool(c, s2, 'AVC / AIT / tromboembolismo prévio');
      var vasc = bool(c, v, 'Doença vascular (IAM, DAOP, placa aórtica)');
      var i65 = bool(c, a, 'Idade 65–74 anos');
      var fem = bool(c, scFeminino, 'Sexo feminino (Sc)', { opcional: true });
      if (!pendente(c) && i75 && i65) c.erros.push('Idade ≥ 75 e 65–74 não podem ser ambas verdadeiras');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var crit = [], score = 0;
      function add(cond, txt, p) { if (cond) { score += p; crit.push(txt + ' · +' + p); } }
      add(ic, 'Insuficiência cardíaca', 1);
      add(has, 'Hipertensão', 1);
      add(i75, 'Idade ≥ 75 anos', 2);
      add(dm, 'Diabetes mellitus', 1);
      add(avc, 'AVC/AIT/tromboembolismo prévio', 2);
      add(vasc, 'Doença vascular', 1);
      add(i65 && !i75, 'Idade 65–74 anos', 1);
      if (fem) add(true, 'Sexo feminino (Sc)', 1);

      var estado, rotulo, acoes, recTexto;
      var pontosClinicos = score - (fem ? 1 : 0);

      if (pontosClinicos === 0) {
        estado = 'BAIXO';
        rotulo = fem ? 'BAIXO RISCO (APENAS CRITÉRIO DE SEXO)' : 'BAIXO RISCO TROMBOEMBÓLICO';
        recTexto = fem
          ? 'Baixo risco (1 ponto isolado por sexo feminino). Anticoagulação oral NÃO recomendada (Classe III).'
          : 'Baixo risco (0 pontos). Anticoagulação oral NÃO recomendada (Classe III).';
        acoes = ['Anticoagulação oral não indicada pelo escore.', 'Reavaliar fatores clínicos periodicamente.'];
      } else if (pontosClinicos === 1) {
        estado = 'ATENCAO';
        rotulo = 'RISCO INTERMEDIÁRIO';
        recTexto = fem
          ? 'Risco intermediário (2 pontos em mulher: 1 fator clínico não-sexo). Anticoagulação oral pode ser considerada (Classe IIa). Pesar risco de sangramento.'
          : 'Risco intermediário (1 ponto em homem: 1 fator clínico). Anticoagulação oral pode ser considerada (Classe IIa). Pesar risco de sangramento.';
        acoes = ['Considerar anticoagulação oral individualizada (DOAC preferencial).', 'Avaliar risco de sangramento (HAS-BLED).'];
      } else {
        estado = 'PRIORITARIO';
        rotulo = 'ANTICOAGULAÇÃO FORTEMENTE RECOMENDADA';
        recTexto = 'Alto risco (pontuação clínica ≥ 2: homem ≥ 2 ou mulher ≥ 3). Anticoagulação oral fortemente recomendada (Classe I, preferência DOACs).';
        acoes = ['Anticoagulação oral fortemente recomendada; DOAC preferencial.', 'Conferir função renal, interações e contraindicações.'];
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: score + '/9',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']], ['AÇÃO', acoes]],
        avisos: ['Diretrizes recomendam CHA2DS2-VA (race/sex-free) para tomada de decisão; no CHA2DS2-VASc clássico, sexo feminino isolado não pontua como indicação.'],
        dados: { pontos: score, maximo: 9, criterios: crit },
        legado: { pontuacao: score, recomendacao: recTexto, criterios: crit },
        botoes: botoesPadrao(ID, [btn('💊 Revisar anticoagulação', ID, 'anticoag'), btn('🩸 Avaliar sangramento', ID, 'hasbled')])
      });
    });
  }

  /** HAS-BLED (Pisters 2010). E = idade > 65 anos. */
  function hasbled(h, aRenal, aHepatico, s, b, l, e, dDrogas, dAlcool) {
    var ID = 'hasbled', NOME = 'HAS-BLED';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var v = [
        bool(c, h, 'Hipertensão não controlada (PAS > 160)'),
        bool(c, aRenal, 'Disfunção renal (diálise, transplante ou Cr > 2,26 mg/dL)'),
        bool(c, aHepatico, 'Disfunção hepática (cirrose ou bilirrubina > 2× com AST/ALT > 3×)'),
        bool(c, s, 'AVC prévio'),
        bool(c, b, 'Sangramento maior prévio ou predisposição'),
        bool(c, l, 'INR lábil (se em uso de varfarina)'),
        bool(c, e, 'Idade > 65 anos'),
        bool(c, dDrogas, 'Antiplaquetário ou AINE'),
        bool(c, dAlcool, 'Álcool excessivo (≥ 8 doses/semana)')
      ];
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var nomes = ['H · Hipertensão não controlada', 'A · Disfunção renal', 'A · Disfunção hepática', 'S · AVC prévio',
                   'B · Sangramento prévio/predisposição', 'L · INR lábil', 'E · Idade > 65 anos',
                   'D · Antiplaquetário/AINE', 'D · Álcool excessivo'];
      var crit = [], score = 0;
      v.forEach(function (x, i) { if (x) { score++; crit.push(nomes[i] + ' · +1'); } });
      var mod = [];
      if (v[0]) mod.push('Controlar a pressão arterial');
      if (v[5]) mod.push('Melhorar controle do INR ou considerar DOAC');
      if (v[7]) mod.push('Revisar antiplaquetário/AINE');
      if (v[8]) mod.push('Reduzir o consumo de álcool');

      var alto = score >= 3;
      return sucesso({
        id: ID, nome: NOME, estado: alto ? 'ATENCAO' : 'BAIXO',
        rotulo: alto ? 'ALTO RISCO DE SANGRAMENTO' : 'RISCO BAIXO A MODERADO',
        principal: score + '/9',
        secoes: [
          ['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
          ['FATORES A REVISAR', mod.length ? mod : ['Nenhum identificado nas respostas fornecidas.']],
          ['AÇÃO', alto ? ['Corrigir fatores modificáveis e reforçar o acompanhamento.', 'Escore elevado, por si só, não contraindica anticoagulação.']
                        : ['Manter acompanhamento habitual.']]
        ],
        avisos: ['Não usar a pontuação isolada para suspender anticoagulação.'],
        dados: { pontos: score, maximo: 9 },
        legado: { pontuacao: score, altoRisco: alto, fatoresModificaveis: mod },
        botoes: botoesPadrao(ID, [btn('🔎 Revisar fatores', ID, 'fatores'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Wells para TEP. Pontuação em meios-pontos inteiros (sem erro de ponto flutuante). */
  function wellsTEP(sinaisTVP, diagAlternativoMenosProvavel, fcMaior100, imobilizacaoCirurgia, tepTvpPrevio, hemoptise, cancer) {
    var ID = 'wells', NOME = 'Wells (TEP)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var itens = [
        [bool(c, sinaisTVP, 'Sinais/sintomas de TVP'), 'Sinais/sintomas de TVP', 6],
        [bool(c, diagAlternativoMenosProvavel, 'TEP é o diagnóstico mais provável'), 'TEP mais provável que diagnóstico alternativo', 6],
        [bool(c, fcMaior100, 'FC > 100 bpm'), 'FC > 100 bpm', 3],
        [bool(c, imobilizacaoCirurgia, 'Imobilização ≥ 3 dias ou cirurgia em 4 semanas'), 'Imobilização ≥ 3 dias ou cirurgia em 4 semanas', 3],
        [bool(c, tepTvpPrevio, 'TEP/TVP prévio'), 'TEP/TVP prévio', 3],
        [bool(c, hemoptise, 'Hemoptise'), 'Hemoptise', 2],
        [bool(c, cancer, 'Câncer ativo'), 'Câncer ativo', 2]
      ];
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var meios = 0, crit = [];
      itens.forEach(function (it) {
        if (it[0]) { meios += it[2]; crit.push(it[1] + ' · +' + fmt(it[2] / 2, 1)); }
      });
      var pontos = meios / 2;
      var provavel = meios > 8; // > 4,0 pontos
      var condutaTexto = provavel
        ? 'TEP Provável (> 4.0 pontos). Encaminhar para Angiotomografia computadorizada de tórax ou considerar anticoagulação se atraso.'
        : 'TEP Improvável (≤ 4.0 pontos). Solicitar D-dímero de alta sensibilidade; se negativo, TEP excluído com segurança.';

      return sucesso({
        id: ID, nome: NOME, estado: provavel ? 'PRIORITARIO' : 'BAIXO',
        rotulo: provavel ? 'TEP PROVÁVEL PELO ESCORE' : 'TEP IMPROVÁVEL PELO ESCORE',
        principal: fmt(pontos, 1) + ' pontos',
        secoes: [
          ['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
          ['PRÓXIMA ETAPA', provavel
            ? ['Angiotomografia de tórax; cintilografia V/Q se contraindicada.', 'Instabilidade hemodinâmica: ecocardiograma à beira-leito e conduta de TEP de alto risco.', 'Considerar anticoagulação empírica se atraso e baixo risco de sangramento.']
            : ['D-dímero de alta sensibilidade.', 'Negativo (corte idade-ajustado > 50a: idade × 10 ng/mL) exclui TEP.', 'Positivo: angiotomografia.']]
        ],
        avisos: [(7 - crit.length) + ' critérios negativos conferidos. D-dímero só se aplica em probabilidade improvável.'],
        dados: { pontos: pontos, provavel: provavel },
        legado: {
          pontuacao: pontos,
          classificacao: provavel ? 'TEP PROVÁVEL' : 'TEP IMPROVÁVEL',
          conduta: condutaTexto
        },
        botoes: botoesPadrao(ID, [btn('🔎 Abrir investigação', ID, 'investigar'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /** Glasgow e Glasgow-P (Brennan 2018). Pupilas não reagentes: 0, 1 ou 2. */
  function glasgowP(ocular, verbal, motor, pupilasNaoReagentes) {
    var ID = 'glasgow', NOME = 'Glasgow-P';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var o = num(c, ocular, 'Resposta ocular (1–4)', 1, 4, { inteiro: true });
      var vb = num(c, verbal, 'Resposta verbal (1–5)', 1, 5, { inteiro: true });
      var m = num(c, motor, 'Resposta motora (1–6)', 1, 6, { inteiro: true });
      var pInformado = !ausente(pupilasNaoReagentes);
      var p = pInformado ? num(c, pupilasNaoReagentes, 'Pupilas não reagentes (0–2)', 0, 2, { inteiro: true }) : null;
      if (pendente(c)) return falhaCtx(ID, NOME, c);
      var gcs = o + vb + m;
      var gp = pInformado ? (gcs - p) : null;
      var estado, rot, acao, gravidadeTexto;
      if (gcs <= 8) {
        estado = 'PRIORITARIO'; rot = 'GRAVE (GCS ≤ 8)';
        gravidadeTexto = 'TCE Grave (GCS ≤ 8). Indicação formal de via aérea definitiva e vaga de UTI.';
        acao = ['Avaliar via aérea definitiva (intubação orotraqueal imediata).', 'Neuroimagem urgente e avaliação neurocirúrgica se TCE.'];
      } else if (gcs <= 12) {
        estado = 'ATENCAO'; rot = 'MODERADO (GCS 9–12)';
        gravidadeTexto = 'TCE Moderado (GCS 9–12). Observação clínica estrita e tomografia de crânio.';
        acao = ['Observação seriada e neuroimagem.', 'Reavaliar a cada poucos minutos; piora exige via aérea definitiva.'];
      } else {
        estado = 'BAIXO'; rot = 'LEVE (GCS 13–15)';
        gravidadeTexto = 'TCE Leve (GCS 13–15). Avaliar critérios para TC de crânio (New Orleans / Canadian).';
        acao = ['Reavaliação seriada; seguir critérios de neuroimagem.'];
      }
      var comps = ['Ocular: ' + o + '/4', 'Verbal: ' + vb + '/5', 'Motor: ' + m + '/6'];
      if (pInformado) {
        comps.push('Pupilas não reagentes: ' + p + '/2');
      } else {
        comps.push('Reatividade pupilar: Não informada / pendente de exame');
      }
      var resLinhas = ['Glasgow (GCS): ' + gcs + '/15'];
      if (pInformado) {
        resLinhas.push('Glasgow-P: ' + gp + '/15 (GCS − ' + p + ')');
      } else {
        resLinhas.push('Glasgow-P: Não calculado (requer avaliação pupilar)');
      }
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rot,
        principal: pInformado ? ('GCS-P ' + gp + '/15') : ('GCS ' + gcs + '/15'),
        secoes: [
          ['COMPONENTES', comps],
          ['RESULTADOS', resLinhas],
          ['AÇÃO', acao]
        ],
        avisos: ['Classificação por GCS; o GCS-P é índice prognóstico (TCE). Registrar fatores que limitam o exame (sedação, edema).'],
        dados: { gcs: gcs, gcsP: gp, pupilasAvaliadas: pInformado },
        legado: {
          glasgow: gcs + '/15',
          glasgowP: pInformado ? (gp + '/15') : null,
          gcs: gcs,
          gcsP: gp,
          gravidade: gravidadeTexto
        },
        botoes: botoesEmergencia(ID, [btn('🫁 Avaliar via aérea', ID, 'via_aerea'), btn('✏️ Revisar exame', ID, 'editar')])
      });
    });
  }

  // ═════════════════════════════ ESTIMATIVAS & ELETRÓLITOS ═════════════════════════════

  /** Déficit de água livre (hipernatremia). */
  function deficitAguaLivre(naAtual, naAlvo, pesoKg, perfil) {
    var ID = 'dal', NOME = 'Déficit de Água Livre';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var na = num(c, naAtual, 'Na atual (mEq/L)', 100, 200);
      var alvo = num(c, naAlvo, 'Na de referência (mEq/L)', 120, 160, { opcional: true });
      if (alvo === null || alvo === 0) alvo = 140;
      var peso = num(c, pesoKg, 'Peso (kg)', 0.3, 350);
      var fator = NaN;
      if (ausente(perfil)) { c.faltas.push('Perfil (homem, mulher, idoso, idosa, criança)'); }
      else if (typeof perfil !== 'string') { c.erros.push('Perfil: texto esperado'); }
      else {
        var p = semAcento(perfil);
        var crianca = p.indexOf('crianca') !== -1;
        var fem = p.indexOf('mulher') !== -1 || p.indexOf('idosa') !== -1;
        var masc = p.indexOf('homem') !== -1 || p.indexOf('idoso') !== -1;
        var idoso = p.indexOf('idos') !== -1;
        if (crianca) fator = 0.6;
        else if (fem && !masc) fator = idoso ? 0.45 : 0.5;
        else if (masc && !fem) fator = idoso ? 0.5 : 0.6;
        else c.erros.push('Perfil não reconhecido (use homem, mulher, idoso, idosa ou criança)');
      }
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var act = peso * fator;
      var def = act * (na / alvo - 1);
      exigirFinito(act, def);
      var defL = Math.round(def * 10) / 10;
      var actL = Math.round(act * 10) / 10;

      if (lte(na, alvo)) {
        var avisosSemDef = ['Na atual não é maior que a referência: fórmula de hipernatremia não se aplica.'];
        if (lt(peso, 2.0)) avisosSemDef.push('⚠️ Neonato / baixo peso (< 2 kg): Monitorar hidratação rigorosa.');
        if (gt(peso, 150)) avisosSemDef.push('⚠️ Obesidade severa (> 150 kg): Avaliar volemia.');
        return sucesso({
          id: ID, nome: NOME, estado: 'CALCULO', rotulo: 'SEM DÉFICIT PELA FÓRMULA',
          principal: '0,0 L',
          secoes: [['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg']]],
          avisos: avisosSemDef,
          dados: { deficitL: 0, actL: actL },
          legado: { deficitLitros: 0, aguaCorporalTotal: actL },
          botoes: botoesEmergencia(ID, [btn('✏️ Revisar dados', ID, 'editar')])
        });
      }

      var avisosDal = ['Estimativa: não inclui perdas contínuas nem a água de manutenção.', 'Limite de correção: no máximo 10 mEq/L em 24 h (menor em hipernatremia crônica).'];
      if (lt(peso, 2.0)) {
        avisosDal.unshift('⚠️ Neonato / prematuro (< 2 kg): Água corporal proporcionalmente elevada (~75-80%), mas risco crítico de edema cerebral e hemorragia periventricular na correção rápida. Limitar redução de sódio a 0,5 mEq/L/h.');
      }
      if (gt(peso, 150)) {
        avisosDal.push('⚠️ Obesidade severa (> 150 kg): O tecido adiposo possui menor proporção de água. O déficit calculado com peso real pode superestimar a água corporal. Titular hidratação com cautela e monitorar sódio sérico a cada 4–6h.');
      }
      if (gt(na, 175)) {
        avisosDal.unshift('🚨 HIPERNATREMIA EXTREMA (Na > 175 mEq/L): Risco iminente de desidratação neuronal grave, hemorragia subaracnóidea e coma. Correção estritamente lenta (máx 8–10 mEq/L em 24h).');
      }

      return sucesso({
        id: ID, nome: NOME, estado: 'CALCULO', principal: fmt(def, 1) + ' L',
        secoes: [
          ['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg',
                        'Perfil: ' + semAcento(perfil), 'Água corporal estimada: ' + fmt(act, 1) + ' L (fator ' + fmt(fator, 2) + ')']],
          ['AÇÃO', ['Usar como estimativa inicial de planejamento.', 'Reposição preferencialmente enteral/VO ou SG 5%; checar Na a cada 4–6 h.']]
        ],
        avisos: avisosDal,
        dados: { deficitL: defL, actL: actL, fator: fator },
        legado: { deficitLitros: defL, aguaCorporalTotal: actL },
        botoes: botoesPadrao(ID, [btn('💧 Abrir planejamento', ID, 'plano'), btn('✏️ Revisar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Cálcio Corrigido pela Albumina (Payne 1973)
   * Ca_corr = Ca_total + 0.8 * (4.0 - Albumina)
   */
  function calcioCorrigido(calcioTotal, albumina) {
    var ID = 'calcio', NOME = 'Cálcio Corrigido por Albumina';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ca = num(c, calcioTotal, 'Cálcio total (mg/dL)', 2, 25);
      var alb = num(c, albumina, 'Albumina sérica (g/dL)', 0.5, 7.0);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var caCorr = ca + 0.8 * (4.0 - alb);
      exigirFinito(caCorr);
      var caCorrFmt = Math.round(caCorr * 10) / 10;

      var estado, rotulo, statusTexto, conduta;
      if (caCorr < 8.5) {
        estado = 'ATENCAO'; rotulo = 'HIPOCALCEMIA VERDADEIRA';
        statusTexto = 'Hipocalcemia (< 8.5 mg/dL)';
        conduta = ['Investigar hipomagnesemia e deficiência de vitamina D.', 'Sintomático (Chvostek, Trousseau, QT longo): Gluconato de Cálcio 10% IV lento.'];
      } else if (caCorr > 10.5) {
        estado = 'PRIORITARIO'; rotulo = 'HIPERCALCEMIA VERDADEIRA';
        statusTexto = 'Hipercalcemia (> 10.5 mg/dL)';
        conduta = ['Hipercalcemia grave (> 14 mg/dL): Hidratação venosa vigorosa com SF 0.9% e Furosemida.', 'Avaliar Bisfosfonatos (Ácido Zoledrônico) e investigar hiperparatireoidismo / neoplasia.'];
      } else {
        estado = 'BAIXO'; rotulo = 'CÁLCIO CORRIGIDO NORMAL';
        statusTexto = 'Normocalcemia (8.5 a 10.5 mg/dL)';
        conduta = ['Níveis normocalcêmicos fisiológicos após correção de albumina. Manter seguimento habitual.'];
      }

      var avisosCalcio = ['A fórmula de Payne é uma estimativa. Em UTI ou distúrbios críticos, o padrão-ouro é dosar o Cálcio Iônico diretamente.'];
      if (caCorr >= 14.0) {
        avisosCalcio.unshift('🚨 CRISE HIPERCALCÊMICA GRAVE (Cálcio corrigido ≥ 14,0 mg/dL): Risco iminente de arritmias cardíacas fatais, desidratação e coma. Hidratação imediata com SF 0,9% (200–300 mL/h), Furosemida e Bisfosfonato IV.');
      } else if (caCorr < 7.0) {
        avisosCalcio.unshift('🚨 HIPOCALCEMIA GRAVE (< 7,0 mg/dL): Risco iminente de tetania, laringoespasmo, convulsões e prolongamento de QTc. Gluconato de Cálcio 10% IV sob monitorização cardíaca contínua.');
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: fmt(caCorr, 1) + ' mg/dL',
        secoes: [
          ['ENTRADAS', ['Cálcio Total Medido: ' + fmt(ca, 1) + ' mg/dL', 'Albumina Sérica: ' + fmt(alb, 1) + ' g/dL']],
          ['CLASSIFICAÇÃO', [statusTexto]],
          ['AÇÃO', conduta]
        ],
        avisos: avisosCalcio,
        dados: { calcioMedido: ca, albumina: alb, calcioCorrigido: caCorrFmt },
        legado: { calcioCorrigido: caCorrFmt, status: statusTexto },
        botoes: botoesPadrao(ID, [btn('🧪 Repetir exame', ID, 'repetir'), btn('✏️ Editar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Gap Osmolar (Diferença entre osmolaridade medida e calculada)
   * Osm_calc = 2 * Na + Glicose / 18 + Ureia / 6  (ou BUN / 2.8)
   */
  function gapOsmolar(osmMedida, na, glicose, ureia) {
    var ID = 'gaposm', NOME = 'Gap Osmolar Sérico';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var om = num(c, osmMedida, 'Osmolaridade medida (mOsm/kg)', 150, 500);
      var n = num(c, na, 'Sódio (mEq/L)', 100, 200);
      var g = num(c, glicose, 'Glicose (mg/dL)', 10, 2000);
      var u = num(c, ureia, 'Ureia (mg/dL)', 5, 500);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var osmCalc = 2 * n + (g / 18) + (u / 6);
      var gap = om - osmCalc;
      exigirFinito(osmCalc, gap);
      var gapFmt = Math.round(gap * 10) / 10;

      var estado, rotulo, conduta;
      if (gap > 10) {
        estado = 'PRIORITARIO'; rotulo = 'GAP OSMOLAR ELEVADO (> 10 mOsm/kg)';
        conduta = [
          'Sugere presença de solutos não medidos: Metanol, Etilenoglicol, Isopropanol, Propilenoglicol, Manitol.',
          'Se acidose metabólica grave concomitante: suspeita máxima de intoxicação por álcoois tóxicos.',
          'Iniciar suporte, Fomepizol ou Etanol e avaliar hemodiálise de emergência.'
        ];
      } else {
        estado = 'BAIXO'; rotulo = 'GAP OSMOLAR NORMAL (≤ 10 mOsm/kg)';
        conduta = ['Gap osmolar dentro da faixa de referência habitual.'];
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: fmt(gap, 1) + ' mOsm/kg',
        secoes: [
          ['VALORES', ['Osmolaridade Medida: ' + fmt(om, 1) + ' mOsm/kg', 'Osmolaridade Calculada: ' + fmt(osmCalc, 1) + ' mOsm/kg', 'Fórmula: 2×Na + Glicose/18 + Ureia/6']],
          ['AÇÃO', conduta]
        ],
        avisos: (function () {
          var av = ['Um gap normal não exclui totalmente intoxicação em fases muito tardias de metabolização.'];
          if (gap > 50) {
            av.unshift('🚨 GAP OSMOLAR EXTREMO (> 50 mOsm/kg): Suspeita crítica de INTOXICAÇÃO MACIÇA por álcoois tóxicos (Metanol ou Etilenoglicol). Indicação IMEDIATA de hemodiálise de urgência e antídoto (Fomepizol ou Etanol).');
          }
          return av;
        })(),
        dados: { osmolaridadeMedida: om, osmolaridadeCalculada: Math.round(osmCalc * 10) / 10, gapOsmolar: gapFmt },
        legado: { gapOsmolar: gapFmt, osmCalculada: Math.round(osmCalc * 10) / 10 },
        botoes: botoesPadrao(ID, [btn('🧪 Investigar intoxicação', ID, 'intoxicacao'), btn('✏️ Editar dados', ID, 'editar')])
      });
    });
  }

  /**
   * Estadiamento KDIGO de Injúria Renal Aguda (IRA / LRA)
   */
  function estadiamentoKDIGO(crAtual, crBase, debitoUrinarioMlKgH, tempoHoras) {
    var ID = 'kdigo_ira', NOME = 'Estadiamento KDIGO (Injúria Renal Aguda)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ca = num(c, crAtual, 'Creatinina atual (mg/dL)', 0.1, 30);
      var cb = num(c, crBase, 'Creatinina basal (mg/dL)', 0.1, 30, { opcional: true });
      var du = num(c, debitoUrinarioMlKgH, 'Débito urinário (mL/kg/h)', 0, 10, { opcional: true });
      var th = num(c, tempoHoras, 'Tempo do débito (horas)', 1, 72, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Verificação de suficiência de dados
      if (cb === null && (du === null || th === null)) {
        return {
          ok: false,
          incompleto: true,
          id: ID,
          nome: NOME,
          estado: 'INCOMPLETO',
          icone: '⚪',
          rotulo: 'DADOS INSUFICIENTES PARA ESTADIAMENTO KDIGO',
          texto: '⚪ <b>ESTADIAMENTO KDIGO DE IRA</b>\n\n' +
            '⚠️ <b>Dados insuficientes:</b> Para estadiar Injúria Renal Aguda pelo KDIGO, é obrigatório informar:\n' +
            '• Creatinina basal (para comparação com a creatinina atual de ' + fmt(ca, 2) + ' mg/dL), OU\n' +
            '• Débito urinário (mL/kg/h) e período de monitorização (horas).\n\n' +
            '<i>Nota: Um valor isolado de creatinina sem basal ou diurese não permite distinguir IRA de DRC prévia estável.</i>',
          textoFormatado: '⚪ *ESTADIAMENTO KDIGO INCOMPLETO*\nInforme Creatinina Basal ou Débito Urinário.',
          dados: { estagio: null, crAtual: ca, estagioCr: null, estagioDU: null }
        };
      }

      var estagioCr = 0, estagioDU = 0, criterios = [];
      if (cb !== null) {
        var aumentoAbs = ca - cb;
        var razaoCr = ca / cb;
        if (razaoCr >= 3.0 || ca >= 4.0) {
          estagioCr = 3;
          criterios.push('Creatinina ≥ 3.0× basal ou ≥ 4.0 mg/dL com aumento agudo');
        } else if (razaoCr >= 2.0) {
          estagioCr = 2;
          criterios.push('Creatinina 2.0 a 2.9× basal');
        } else if (razaoCr >= 1.5 || aumentoAbs >= 0.3) {
          estagioCr = 1;
          criterios.push('Aumento de Cr ≥ 0.3 mg/dL ou 1.5 a 1.9× basal');
        }
      }

      if (du !== null && th !== null) {
        // KDIGO 2012 / 2024:
        // Estágio 3: Débito < 0.3 mL/kg/h por ≥ 24h OU Anúria por ≥ 12h
        // Estágio 2: Débito < 0.5 mL/kg/h por ≥ 12h
        // Estágio 1: Débito < 0.5 mL/kg/h por 6-12h
        if (du === 0 && th >= 12) {
          estagioDU = 3;
          criterios.push('Anúria por ≥ 12h (Critério KDIGO 3)');
        } else if (du < 0.3 && th >= 24) {
          estagioDU = 3;
          criterios.push('Débito < 0.3 mL/kg/h por ≥ 24h (Critério KDIGO 3)');
        } else if (du < 0.5 && th >= 12) {
          estagioDU = 2;
          criterios.push('Débito < 0.5 mL/kg/h por ' + th + 'h (Critério KDIGO 2)');
        } else if (du < 0.5 && th >= 6) {
          estagioDU = 1;
          criterios.push('Débito < 0.5 mL/kg/h por 6-12h (Critério KDIGO 1)');
        }
      }

      var estagioFinal = Math.max(estagioCr, estagioDU);
      var estado, rotulo, conduta;
      if (estagioFinal === 3) {
        estado = 'PRIORITARIO'; rotulo = 'KDIGO ESTÁGIO 3 (GRAVE)';
        conduta = ['Ajustar rigorosamente doses de antimicrobianos e medicações nefrotóxicas.', 'Monitorar K⁺ e equilíbrio ácido-base a cada 4-6h.', 'Avaliar indicações de Terapia de Substituição Renal (TRS/Hemodiálise).'];
      } else if (estagioFinal === 2) {
        estado = 'ATENCAO'; rotulo = 'KDIGO ESTÁGIO 2 (MODERADO)';
        conduta = ['Suspender todos os nefrotóxicos (AINEs, contraste iodado, etc.).', 'Otimizar perfusão volêmica e PAM alvo ≥ 65 mmHg.', 'Revisar exames e débito urinário de horário.'];
      } else if (estagioFinal === 1) {
        estado = 'ATENCAO'; rotulo = 'KDIGO ESTÁGIO 1 (LEVE)';
        conduta = ['Identificar e corrigir etiologia (desidratação, sepse, drogas).', 'Evitar contraste e monitorar creatinina em 24-48h.'];
      } else {
        estado = 'BAIXO'; rotulo = 'SEM CRITÉRIO KDIGO PARA IRA';
        conduta = ['Função renal estável conforme parâmetros basais informados.'];
      }

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: 'Estágio ' + estagioFinal,
        secoes: [
          ['CRITÉRIOS ATENDIDOS', criterios.length ? criterios : ['Nenhum critério para IRA atingido']],
          ['AÇÃO', conduta]
        ],
        avisos: (function () {
          var av = ['KDIGO 2024: A classificação por débito urinário e creatinina tem implicações prognósticas diretas.'];
          if (gt(ca, 15)) {
            av.unshift('🚨 Creatinina extremamente discrepante (> 15 mg/dL: ' + fmt(ca, 1) + ' mg/dL): Falência renal terminal com risco crítico de complicações urêmicas graves e indicação imediata de diálise de urgência (AEIOU).');
          }
          return av;
        })(),
        dados: { estagio: estagioFinal, criterios: criterios },
        legado: { estagioKDIGO: estagioFinal },
        botoes: botoesPadrao(ID, [btn('💊 Ajuste renal', ID, 'ajuste'), btn('💧 Balanço hídrico', ID, 'balanco')])
      });
    });
  }

  // ═════════════════════════════ GASOMETRIA ═════════════════════════════

  function gasometria(phVal, pco2Val, hco3Val, naVal, clVal, albVal, pao2Val, fio2Val) {
    var ID = 'gaso', NOME = 'Gasometria arterial';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var ph = num(c, phVal, 'pH', 6.0, 8.0);
      var pco2 = num(c, pco2Val, 'PaCO₂ (mmHg)', 5, 200);
      var hco3 = num(c, hco3Val, 'HCO₃⁻ (mEq/L)', 2, 70);
      var na = num(c, naVal, 'Na (mEq/L)', 100, 200, { opcional: true });
      var cl = num(c, clVal, 'Cl (mEq/L)', 60, 160, { opcional: true });
      var alb = num(c, albVal, 'Albumina (g/dL)', 0.5, 7, { opcional: true });
      var pao2 = num(c, pao2Val, 'PaO₂ (mmHg)', 10, 700, { opcional: true });
      var fio2raw = num(c, fio2Val, 'FiO₂ (0,21–1,0 ou 21–100%)', 0.21, 100, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var avisos = [];
      if (lt(ph, 6.80)) {
        avisos.push('🚨 ACIDEMIA EXTREMA (pH < 6.80): Limite crítico de viabilidade fisiológica. Risco iminente de PCR por colapso cardiovascular e perda de responsividade a catecolaminas. Priorizar ventilação agressiva e avaliar suporte dialítico / NaHCO₃ de resgate.');
      }
      if (lte(hco3, 5)) {
        avisos.push('🚨 BICARBONATO EXTREMAMENTE CONSUMIDO (≤ 5 mEq/L): Acidose metabólica severa com esgotamento da capacidade tampão.');
      }
      var phCalc = 6.1 + Math.log(hco3 / (0.0307 * pco2)) / Math.LN10;
      exigirFinito(phCalc);
      if (Math.abs(phCalc - ph) > 0.1) avisos.push('Inconsistência interna (pH calculado ≈ ' + fmt(phCalc, 2) + '): conferir se a amostra é arterial.');

      var pHbaixo = lt(ph, 7.35), pHalto = gt(ph, 7.45);
      var acMet = lt(hco3, 22), alMet = gt(hco3, 26), acResp = gt(pco2, 45), alResp = lt(pco2, 35);

      var disturbio;
      if (pHbaixo) {
        if (acMet && acResp) disturbio = 'Acidose Mista (Metabólica + Respiratória)';
        else if (acMet) disturbio = 'Acidose Metabólica';
        else if (acResp) disturbio = 'Acidose Respiratória';
        else disturbio = 'Acidemia sem alteração evidente de PaCO₂/HCO₃⁻';
      } else if (pHalto) {
        if (alMet && alResp) disturbio = 'Alcalose Mista (Metabólica + Respiratória)';
        else if (alMet) disturbio = 'Alcalose Metabólica';
        else if (alResp) disturbio = 'Alcalose Respiratória';
        else disturbio = 'Alcalemia sem alteração evidente de PaCO₂/HCO₃⁻';
      } else {
        if (acMet && alResp) disturbio = 'Distúrbio Misto com pH normal (Acidose Metabólica + Alcalose Respiratória)';
        else if (alMet && acResp) disturbio = 'Distúrbio Misto com pH normal (Alcalose Metabólica + Acidose Respiratória)';
        else if (acMet || alMet || acResp || alResp) disturbio = 'pH normal compensado ou distúrbio misto';
        else disturbio = 'Gasometria Normal / Sem distúrbio ácido-base evidente';
      }

      var compEsp = null, compAval = null;
      if (acMet && !pHalto) {
        var base = 1.5 * hco3 + 8, mn = base - 2, mx = base + 2;
        compEsp = 'Winter: PaCO₂ esperada ' + fmt(mn, 1) + '–' + fmt(mx, 1) + ' mmHg';
        compAval = gt(pco2, mx) ? 'PaCO₂ acima do esperado: Acidose Respiratória associada'
                 : lt(pco2, mn) ? 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada'
                 : 'Resposta compensatória adequada';
      } else if (alMet && !pHbaixo) {
        var b2 = 40 + 0.7 * (hco3 - 24), mn2 = b2 - 2, mx2 = b2 + 2;
        compEsp = 'PaCO₂ esperada ' + fmt(mn2, 1) + '–' + fmt(mx2, 1) + ' mmHg';
        compAval = gt(pco2, mx2) ? 'PaCO₂ acima do esperado: Acidose Respiratória associada'
                 : lt(pco2, mn2) ? 'PaCO₂ abaixo do esperado: Alcalose Respiratória associada'
                 : 'Resposta compensatória adequada';
      } else if (acResp && !acMet && pHbaixo) {
        var ag1 = 24 + 0.1 * (pco2 - 40), cr1 = 24 + 0.35 * (pco2 - 40);
        compEsp = 'HCO₃⁻ esperado ' + fmt(ag1, 1) + ' (aguda) a ' + fmt(cr1, 1) + ' (crônica) mEq/L';
        compAval = lt(hco3, ag1 - 2) ? 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada'
                 : gt(hco3, cr1 + 2) ? 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada'
                 : 'Compatível com acidose respiratória pura (aguda a crônica)';
      } else if (alResp && !alMet && pHalto) {
        var ag2 = 24 - 0.2 * (40 - pco2), cr2 = 24 - 0.5 * (40 - pco2);
        compEsp = 'HCO₃⁻ esperado ' + fmt(cr2, 1) + ' (crônica) a ' + fmt(ag2, 1) + ' (aguda) mEq/L';
        compAval = gt(hco3, ag2 + 2) ? 'HCO₃⁻ acima do esperado: Alcalose Metabólica associada'
                 : lt(hco3, cr2 - 2) ? 'HCO₃⁻ abaixo do esperado: Acidose Metabólica associada'
                 : 'Compatível com alcalose respiratória pura (aguda a crônica)';
      }

      var secAG = [], agSerico = null, agCorr = null, delta = null, interpAG = '';
      if ((na === null) !== (cl === null)) {
        avisos.push('Ânion gap não calculado: informar Na e Cl juntos.');
      } else if (na !== null) {
        agSerico = na - (cl + hco3);
        agCorr = alb !== null ? agSerico + 2.5 * (4.0 - alb) : null;
        exigirFinito(agSerico);
        var agRef = agCorr !== null ? agCorr : agSerico;
        secAG.push('AG: ' + fmt(agSerico, 1) + ' mEq/L');
        secAG.push(agCorr !== null ? 'AG corrigido (albumina ' + fmt(alb, 1) + ' g/dL): ' + fmt(agCorr, 1) + ' mEq/L'
                                   : 'AG corrigido: não calculado — albumina ausente');
        if (gt(agRef, 12)) {
          interpAG = 'Ânion Gap ELEVADO (> 12 mEq/L)';
          secAG.push(interpAG);
          if (lt(hco3, 24)) {
            delta = (agRef - 12) / (24 - hco3);
            exigirFinito(delta);
            var it;
            if (lt(delta, 0.4)) it = 'Razão delta ' + fmt(delta, 2) + ' (< 0,4): predomina acidose hiperclorêmica associada';
            else if (lt(delta, 0.8)) it = 'Razão delta ' + fmt(delta, 2) + ' (0,4–0,8): acidose mista AG elevado + hiperclorêmica';
            else if (lte(delta, 2.0)) it = 'Razão delta ' + fmt(delta, 2) + ' (0,8–2,0): acidose de AG elevado pura';
            else it = 'Razão delta ' + fmt(delta, 2) + ' (> 2,0): considerar alcalose metabólica associada';
            secAG.push(it);
          }
        } else {
          interpAG = 'Ânion Gap NORMAL (≤ 12 mEq/L)';
          secAG.push(acMet ? 'AG normal: acidose hiperclorêmica (perda digestiva, ATR, SF 0.9%)' : interpAG);
        }
      }

      var secOx = [], pf = null, classifPF = '';
      if (pao2 !== null && fio2raw !== null) {
        var fio2 = fio2raw > 1 ? fio2raw / 100 : fio2raw;
        if (fio2 < 0.21 - EPS || fio2 > 1 + EPS) throw new Error('FIO2_INVALIDA');
        pf = pao2 / fio2;
        exigirFinito(pf);
        var pfNum = Math.round(pf);
        secOx.push('PaO₂/FiO₂: ' + fmt(pf, 0) + ' mmHg (FiO₂ ' + fmt(fio2 * 100, 0) + '%)');
        if (gt(pf, 300)) classifPF = 'Oxigenação Normal (> 300)';
        else if (gt(pf, 200)) classifPF = 'SDRA Leve (Berlim 201–300)';
        else if (gt(pf, 100)) classifPF = 'SDRA Moderada (Berlim 101–200)';
        else classifPF = 'SDRA Grave (Berlim ≤ 100)';
        secOx.push(classifPF);
        avisos.push('SDRA (Berlim 2012) exige: opacidades bilaterais agudas, PEEP ≥ 5 cmH₂O e sem origem cardiogênica exclusiva.');
      }

      var critico = lt(ph, 7.20) || gt(ph, 7.60) || (pf !== null && lte(pf, 100));
      var alterado = disturbio.indexOf('Normal') === -1;
      var estado = critico ? 'PRIORITARIO' : (alterado || (pf !== null && lte(pf, 300)) ? 'ATENCAO' : 'CALCULO');
      var rotulo = critico ? 'ALTERAÇÃO GRAVE · ' + disturbio.toUpperCase() : disturbio.toUpperCase();

      var secoes = [['RESULTADO', ['pH: ' + fmt(ph, 2), 'PaCO₂: ' + fmt(pco2, 0) + ' mmHg', 'HCO₃⁻: ' + fmt(hco3, 0) + ' mEq/L', disturbio]]];
      if (compEsp) secoes.push(['COMPENSAÇÃO', [compEsp, compAval]]);
      if (secAG.length) secoes.push(['ÂNION GAP', secAG]);
      if (secOx.length) secoes.push(['OXIGENAÇÃO', secOx]);

      var pfFinal = (pf !== null ? Math.round(pf) : null);
      var agFinal = (agSerico !== null ? Math.round(agSerico * 10) / 10 : null);
      var agcFinal = (agCorr !== null ? Math.round(agCorr * 10) / 10 : null);

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo, principal: 'pH ' + fmt(ph, 2),
        secoes: secoes, avisos: avisos,
        dados: { disturbio: disturbio, anionGap: agFinal, anionGapCorrigido: agcFinal, razaoDelta: delta, pfRatio: pfFinal },
        legado: {
          ph: ph,
          pco2: pco2,
          hco3: hco3,
          disturbio: disturbio,
          compensacao: compEsp,
          avaliacaoCompensacao: compAval,
          anionGap: agFinal,
          anionGapCorrigido: agcFinal,
          interpretacaoAG: interpAG,
          pfRatio: pfFinal,
          classificacaoPF: classifPF
        },
        botoes: [[btn('🧪 Ver ácido-base', ID, 'acidobase'), btn('🫁 Ver oxigenação', ID, 'oxigenacao')],
                 [btn('🔙 Sala Vermelha', 'ux', 'sala'), btn('🏠 Início', 'ux', 'hub:inicio')]]
      });
    });
  }

  // ═════════════════════════════ INFUSÕES (SALA VERMELHA) ═════════════════════════════

  var DVA = {
    noradrenalina: {
      nome: 'Noradrenalina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 16, vol: 250, conc: 64, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); padrão: 4 ampolas (16 mg) em 234 mL SG5% (64 mcg/mL).' },
        concentrada: { mg: 32, vol: 250, conc: 128, ref: 'Ampola: 4 mg/4 mL (1 mg/mL); concentrada: 8 ampolas (32 mg) em 218 mL SG5% (128 mcg/mL).' }
      },
      doses: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0],
      acoes: ['Início habitual: 0,05–0,1 mcg/kg/min; titular para PAM ≥ 65 mmHg.', 'Preferir acesso venoso central. Monitorar perfusão periférica e lactato.', 'Dose máxima teórica: geralmente até 3 mcg/kg/min, porém em doses > 0,25-0,5 mcg/kg/min considere associar Vasopressina.'],
      aviso: '⚠️ ALERTA: Doses acima de 1,0 mcg/kg/min representam vasoplegia severa. Considere associação precoce de Vasopressina (0,03 UI/min) e avaliação de CIRCI (corticoide).'
    },
    dobutamina: {
      nome: 'Dobutamina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 250, vol: 250, conc: 1000, ref: 'Ampola: 250 mg/20 mL; padrão: 1 ampola (250 mg) em 230 mL SG5% (1000 mcg/mL).' }
      },
      doses: [2.5, 5, 10, 15, 20],
      acoes: ['Início habitual: 2,5–5 mcg/kg/min; titular até 20 mcg/kg/min.', 'Monitorar taquiarritmias, isquemia miocárdica e hipotensão.', 'Não usar como vasopressor (pode causar vasodilatação periférica inicial).'],
      aviso: 'Doses > 20 mcg/kg/min aumentam expressivamente o consumo miocárdico de oxigênio (MVO2) e o risco de arritmias.'
    },
    nitroprussiato: {
      nome: 'Nitroprussiato de sódio', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/2 mL; padrão: 1 ampola (50 mg) em 248 mL SG5% (200 mcg/mL, envolver em fotoprotetor).' }
      },
      doses: [0.3, 0.5, 1, 2, 3, 5, 10],
      acoes: ['Início habitual: 0,3–0,5 mcg/kg/min; titular a cada 3-5 minutos com linha arterial.', 'Dose máxima recomendada: 10 mcg/kg/min (por no máximo 10 minutos).'],
      aviso: '⚠️ RISCO DE TOXICIDADE: Uso > 48h ou doses altas ou Insuficiência Renal/Hepática têm risco elevado de toxicidade por cianeto/tiocianato (acidose metabólica, confusão mental).'
    },
    nitroglicerina: {
      nome: 'Nitroglicerina', unidade: 'mcg/min', peso: false, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/10 mL; padrão: 1 ampola (50 mg) em 240 mL SG5% ou SF0.9% (200 mcg/mL).' }
      },
      doses: [5, 10, 20, 30, 50, 100, 200],
      acoes: ['Início habitual: 5–10 mcg/min; titular a cada 5–10 min (incrementos de 5-10 mcg/min).', 'Dose máxima habitual: 200 mcg/min.'],
      aviso: '⚠️ CONTRAINDICAÇÕES FORMAIS: Infarto de Ventrículo Direito (VD), PAS < 90 mmHg, uso de inibidores da fosfodiesterase-5 (Sildenafila < 24h ou Tadalafila < 48h).'
    },
    vasopressina: {
      nome: 'Vasopressina', unidade: 'UI/min', peso: false, conc: 'UI/mL',
      preparos: {
        padrao: { mg: 20, vol: 100, conc: 0.2, ref: 'Ampola: 20 UI/1 mL; padrão: 1 ampola (20 UI) em 99 mL SG5% ou SF (0,2 UI/mL).' }
      },
      doses: [0.01, 0.02, 0.03, 0.04],
      acoes: ['Dose fixa: 0,03 a 0,04 UI/min (SSC 2021) = 9 a 12 mL/h. NÃO titular como catecolaminas.', 'Iniciar como 2ª linha quando noradrenalina estiver em 0,25–0,5 mcg/kg/min para poupar catecolamina e melhorar perfusão esplâncnica.'],
      aviso: 'Não titular como catecolamina. Infusão contínua fixa de 0,03 ou 0,04 UI/min.'
    },
    adrenalina: {
      nome: 'Adrenalina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 4, vol: 250, conc: 16, ref: 'Ampola: 1 mg/1 mL; padrão: 4 ampolas (4 mg) em 246 mL SG5% (16 mcg/mL).' },
        concentrada: { mg: 8, vol: 250, conc: 32, ref: 'Ampola: 1 mg/1 mL; concentrada: 8 ampolas (8 mg) em 242 mL SG5% (32 mcg/mL).' }
      },
      doses: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0],
      acoes: ['Início habitual (inotrópico/cronotrópico): 0,01 a 0,1 mcg/kg/min. Como vasopressor: > 0,1 mcg/kg/min.', 'Aumenta consideravelmente o lactato sérico (efeito metabólico beta-2 adrenérgico de glicólise, e não necessariamente hipoperfusão).'],
      aviso: 'Doses maiores causam taquicardia severa e hiperlactatemia metabólica tipo B que pode confundir a avaliação de perfusão.'
    }
  };

  var DVA_ALIAS = {
    noradrenalina: 'noradrenalina', norepinefrina: 'noradrenalina', nora: 'noradrenalina',
    adrenalina: 'adrenalina', adrena: 'adrenalina', epinefrina: 'adrenalina', epi: 'adrenalina',
    dobutamina: 'dobutamina', dobuta: 'dobutamina',
    vasopressina: 'vasopressina', vaso: 'vasopressina', pitressin: 'vasopressina',
    nitroprussiato: 'nitroprussiato', nipride: 'nitroprussiato',
    nitroglicerina: 'nitroglicerina', tridil: 'nitroglicerina'
  };

  function drogasVasoativas(droga, pesoKg, solucao) {
    var ID = 'dva', NOME = 'Infusão de Vasoativo';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var chave = ausente(droga) ? 'noradrenalina' : DVA_ALIAS[semAcento(droga)];
      if (!chave) {
        c.erros.push('Droga não reconhecida (noradrenalina, adrenalina, dobutamina, vasopressina, nitroprussiato, nitroglicerina)');
        return falhaCtx(ID, NOME, c);
      }
      var d = DVA[chave];
      var peso = null;
      if (d.peso) peso = num(c, pesoKg, 'Peso (kg)', 30, 350);
      var tipoSol = ausente(solucao) ? 'padrao' : semAcento(solucao);
      if (tipoSol === 'concentrado' || tipoSol === 'concentrada' || tipoSol === '2x') tipoSol = 'concentrada';
      if (tipoSol !== 'padrao' && tipoSol !== 'concentrada') c.erros.push('Solução: use "padrao" ou "concentrada"');
      else if (!d.preparos[tipoSol]) c.erros.push('Solução "' + tipoSol + '" não disponível para ' + d.nome);
      if (pendente(c)) return falhaCtx(ID, d.nome, c);

      var prep = d.preparos[tipoSol];
      var mg = prep.mg;
      var volFinal = prep.vol;
      var conc = prep.conc;
      var textoPreparo = prep.ref;
      exigirFinito(conc);
      if (!(conc > 0)) throw new Error('CONCENTRACAO_ZERO');

      var maxRate = 0;
      var tabelaLegada = [];
      var linhas = d.doses.map(function (dose) {
        var ml;
        if (d.unidade === 'mcg/kg/min') ml = (dose * peso * 60) / conc;
        else if (d.unidade === 'mcg/min') ml = (dose * 60) / conc;
        else ml = (dose * 60) / conc;
        exigirFinito(ml);
        if (ml > maxRate) maxRate = ml;
        var mlArred = Math.round(ml * 10) / 10;
        tabelaLegada.push({ doseMcgKgMin: dose, mlH: mlArred, dose: dose });
        var mlTxt = (mlArred % 1 === 0 ? mlArred : fmt(mlArred, 1)) + ' mL/h';
        return fmt(dose, dose < 0.1 ? 2 : (dose % 1 === 0 ? 0 : 1)) + ' ' + d.unidade + ' → ' + mlTxt;
      });

      var base = [];
      if (d.peso) base.push('Peso: ' + fmt(peso, 1) + ' kg');
      base.push('Quantidade de fármaco: ' + fmt(mg, 0) + (d.unidade === 'UI/min' ? ' UI' : ' mg'));
      base.push('Volume final: ' + fmt(volFinal, 0) + ' mL');
      base.push('Concentração: ' + fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc);
      base.push(textoPreparo);

      var fichaD1 = (typeof CompatibilidadeYDvaService !== 'undefined') ? CompatibilidadeYDvaService.obterFichaDiluicao(chave) : null;
      if (fichaD1) {
        base.push('Diluente Padrão (D1): ' + fichaD1.diluenteD1);
        base.push('Acesso Recomendado: ' + fichaD1.acessoVenoso);
      }

      var avisos = ['Vazões calculadas para a concentração acima. Dupla checagem obrigatória na bomba.'];
      if (d.peso && gt(peso, 150)) avisos.unshift('⚠️ OBESIDADE SEVERA (> 150 kg): O cálculo por mcg/kg/min no peso real pode levar a taxas de infusão excessivas. Recomenda-se titular a dose estritamente pela PAM alvo (≥ 65 mmHg) e considerar o Peso Ideal ou Ajustado.');
      if (d.aviso) avisos.unshift(d.aviso);
      if (fichaD1 && fichaD1.solucaoIncompativelAviso) avisos.push(fichaD1.solucaoIncompativelAviso);

      var taxaFixaVaso = (chave === 'vasopressina' ? 9.0 : null);
      var doseInicialTxt = d.unidade === 'UI/min' 
        ? ('Dose fixa recomendada: ' + fmt(d.doses[0], 2) + ' UI/min (' + (taxaFixaVaso || 9) + ' mL/h na bomba)')
        : ('Dose inicial recomendada: ' + fmt(d.doses[0], d.doses[0] < 0.1 ? 2 : 1) + ' ' + d.unidade + ' (' + (tabelaLegada[0] ? tabelaLegada[0].mlH : '0') + ' mL/h na bomba)');

      var secoes = [
        ['🔴 AÇÃO IMEDIATA / DOSE DE ATAQUE', [
          doseInicialTxt,
          'Alvo imediato: PAM ≥ 65 mmHg (titulação seriada a cada 2 a 5 minutos)',
          (d.peso ? 'Peso considerado: ' + fmt(peso, 0) + ' kg (' + fmt(peso, 1) + ' kg)' : 'Dose fixa independente de peso')
        ]],
        ['🟡 DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO', [
          textoPreparo,
          (fichaD1 ? '💧 Diluente Oficial (D1): ' + fichaD1.diluenteD1 : '💧 Diluente de escolha: SG 5% ou SF 0,9% conforme estabilidade'),
          (fichaD1 ? '💉 Acesso Venoso: ' + fichaD1.acessoVenoso : '💉 Acesso venoso central preferencial'),
          'Concentração da solução: ' + fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc,
          'Tabela de Vazão em Bomba de Infusão Contínua (BIC):'
        ].concat(linhas)],
        ['⚠️ ALERTAS DE SEGURANÇA E BLOQUEIOS', avisos],
        ['ℹ️ JUSTIFICATIVA CLÍNICA E REFERÊNCIAS', ['Droga vasoativa de 1ª linha / suporte hemodinâmico'].concat(d.acoes)]
      ];

      return sucesso({
        id: ID, nome: d.nome, estado: 'CALCULO', rotulo: 'CÁLCULO DE INFUSÃO · CONFERIR PREPARO',
        principal: fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc,
        secoes: secoes,
        avisos: avisos,
        dados: { droga: chave, concentracao: conc, unidadeConcentracao: d.conc, solucao: tipoSol, tabela: tabelaLegada },
        legado: {
          droga: d.nome,
          concentracaoMcgMl: conc,
          pesoKg: peso,
          tabela: tabelaLegada,
          taxaMlH: taxaFixaVaso || (tabelaLegada[0] ? tabelaLegada[0].mlH : null),
          preparo: textoPreparo
        },
        botoes: botoesEmergencia(ID, [btn('🎚️ Calcular outra dose', ID, 'dose'), btn('🧴 Revisar preparo', ID, 'preparo')])
      });
    });
  }

  // ═════════════════════════════ SEQUÊNCIA RÁPIDA DE INTUBAÇÃO ═════════════════════════════

  var SRI_FARMACOS = {
    etomidato:      { nome: 'Etomidato',      dose: 0.3, un: 'mg', conc: 2,  txt: '0,3 mg/kg · 2 mg/mL (ampola 20mg/10mL)',  grupo: 'indutor', contra: 'Evitar em sepse se suspeita de insuficiência adrenal aguda, risco de supressão adrenal transitória.' },
    quetamina:      { nome: 'Quetamina',      dose: 1.5, un: 'mg', conc: 50, txt: '1,5 mg/kg · 50 mg/mL (ampola 50mg/mL)', grupo: 'indutor', contra: 'Broncodilatador (ideal em asma). Evitar em hipertensão craniana severa ou glaucoma sem uso prévio de opioide.' },
    propofol:       { nome: 'Propofol 1%',    dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (ampola 1%)',        grupo: 'indutor', contra: 'Hipotensor potente. Reduzir dose pela metade em choque hemodinâmico ou senilidade.' },
    midazolam:      { nome: 'Midazolam',      dose: 0.2, un: 'mg', conc: 5,  txt: '0,2 mg/kg · 5 mg/mL (ampola 5mg/mL)',   grupo: 'indutor', contra: 'Depressor miocárdico e venodilatador. Evitar em choque descompensado.' },
    rocuronio:      { nome: 'Rocurônio',      dose: 1.2, un: 'mg', conc: 10, txt: '1,2 mg/kg · 10 mg/mL (frasco 50mg/5mL)', grupo: 'bloqueador', contra: 'Ação em ~45-60s. Escolha de excelência. Reversível com Sugamadex.' },
    succinilcolina: { nome: 'Succinilcolina', dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (frasco 100mg/10mL)', grupo: 'bloqueador', contra: '⚠️ CONTRAINDICADA em: Hipercalemia (> 5.5), grandes queimados, esmagamento, miopatias, paralisia/AVC > 48h (risco de PCR por hipercalemia). Teto máximo: 200 mg.' },
    fentanil:       { nome: 'Fentanil',       dose: 2.0, un: 'mcg',conc: 50, txt: '2 mcg/kg · 50 mcg/mL (ampola 50mcg/mL)',  grupo: 'adjuvante', contra: 'Pico de ação em 3-5 min. Atenua reflexo simpático da laringoscopia.' }
  };

  function resolverFarmaco(ctx, v, grupo, rotulo) {
    if (ausente(v)) return null;
    var k = semAcento(v);
    if (k === 'succinil' || k === 'suxametonio') k = 'succinilcolina';
    if (k === 'rocuronio' || k === 'roc') k = 'rocuronio';
    if (k === 'ketamina' || k === 'cetamina') k = 'quetamina';
    if (k === 'nenhum' || k === 'nao') return null;
    var f = SRI_FARMACOS[k];
    if (!f || f.grupo !== grupo) { ctx.erros.push(rotulo + ': fármaco inválido para esta etapa'); return null; }
    return { chave: k, f: f };
  }

  /**
   * SRI / IOT (Pronto-Socorro & UTI)
   * Se indutor/bloqueador forem informados, gera relatório direcionado.
   * Se NÃO informados (ex: '/sri 70'), calcula e exibe o CARTÃO DE EMERGÊNCIA COMPLETO
   * para tomada de decisão imediata à beira-leito sem atraso de comunicação.
   */
  function sequenciaRapidaIntubacao(pesoKg, contextoClinico, indutor, bloqueador, adjuvante) {
    var ID = 'sri', NOME = 'Sequência Rápida de Intubação (SRI)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var peso = num(c, pesoKg, 'Peso (kg)', 30, 300);
      var ctxTxt = 'Padrão / Hemodinâmica Estável';
      var ctxChave = 'padrao';
      if (!ausente(contextoClinico)) {
        if (typeof contextoClinico !== 'string') c.erros.push('Contexto: texto esperado');
        else {
          var t = semAcento(contextoClinico);
          if (/choque|sepse|instav|hipotens/.test(t)) { ctxChave = 'choque'; ctxTxt = 'Choque / Instabilidade Hemodinâmica'; }
          else if (/asma|bronco|dpoc/.test(t)) { ctxChave = 'asma'; ctxTxt = 'Broncoespasmo Grave / Asma / DPOC'; }
          else if (/tce|neuro|avc/.test(t)) { ctxChave = 'tce'; ctxTxt = 'Neurointensivismo / TCE / AVC'; }
        }
      }
      var ind = resolverFarmaco(c, indutor, 'indutor', 'Indutor');
      var blq = resolverFarmaco(c, bloqueador, 'bloqueador', 'Bloqueador');
      var adj = resolverFarmaco(c, adjuvante, 'adjuvante', 'Adjuvante');
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Pré-cálculo universal de todas as drogas para disponibilidade imediata
      function calcDose(farmaco) {
        var d = farmaco.dose * peso;
        var ml = d / farmaco.conc;
        exigirFinito(d, ml);
        return {
          dose: Math.round(d * 10) / 10,
          ml: Math.round(ml * 10) / 10,
          un: farmaco.un,
          conc: farmaco.conc
        };
      }

      var dFentanil = calcDose(SRI_FARMACOS.fentanil);
      var dEtomidato = calcDose(SRI_FARMACOS.etomidato);
      var dQuetamina = calcDose(SRI_FARMACOS.quetamina);
      var dPropofol = calcDose(SRI_FARMACOS.propofol);
      var dMidazolam = calcDose(SRI_FARMACOS.midazolam);
      var dSuccinil = calcDose(SRI_FARMACOS.succinilcolina);
      var dRocuronio = calcDose(SRI_FARMACOS.rocuronio);

      var mostrarTodos = (ind === null && blq === null && adj === null && semAcento(String(adjuvante || '')) !== 'nenhum');
      var linhasDoses = [];
      if (mostrarTodos) {
        linhasDoses.push('1️⃣ Pré-tratamento: Fentanil (50 mcg/mL · 2 mcg/kg): ' + fmt(dFentanil.dose, 0) + ' mcg → ' + fmt(dFentanil.ml, 1) + ' mL IV lento');
        linhasDoses.push('2️⃣ Sedativos / Indução (escolha 1):');
        linhasDoses.push('   • Etomidato (2 mg/mL · 0,3 mg/kg): ' + fmt(dEtomidato.dose, 1) + ' mg → ' + fmt(dEtomidato.ml, 1) + ' mL IV');
        linhasDoses.push('   • Quetamina (50 mg/mL · 1,5 mg/kg): ' + fmt(dQuetamina.dose, 0) + ' mg → ' + fmt(dQuetamina.ml, 1) + ' mL IV');
        if (ctxChave !== 'choque') {
          linhasDoses.push('   • Propofol 1% (10 mg/mL · 1,5 mg/kg): ' + fmt(dPropofol.dose, 0) + ' mg → ' + fmt(dPropofol.ml, 1) + ' mL IV');
        }
        linhasDoses.push('3️⃣ Bloqueadores Neuromusculares (escolha 1):');
        linhasDoses.push('   • Succinilcolina (10 mg/mL · 1,5 mg/kg): ' + fmt(dSuccinil.dose, 0) + ' mg → ' + fmt(dSuccinil.ml, 1) + ' mL IV');
        linhasDoses.push('   • Rocurônio (10 mg/mL · 1,2 mg/kg): ' + fmt(dRocuronio.dose, 1) + ' mg → ' + fmt(dRocuronio.ml, 1) + ' mL IV');
      } else {
        if (adj && adj.chave === 'fentanil') {
          linhasDoses.push('1️⃣ Pré-tratamento Selecionado: Fentanil (50 mcg/mL · 2 mcg/kg): ' + fmt(dFentanil.dose, 0) + ' mcg → ' + fmt(dFentanil.ml, 1) + ' mL IV lento');
        } else if (semAcento(String(adjuvante || '')) === 'nenhum') {
          linhasDoses.push('1️⃣ Pré-tratamento: Nenhum adjuvante (sem opioide)');
        }
        if (ind) {
          var dInd = calcDose(ind.f);
          linhasDoses.push('2️⃣ Indutor Selecionado: ' + ind.f.nome + ' (' + ind.f.conc + ' ' + ind.f.un + '/mL · ' + fmt(ind.f.dose, 1) + ' ' + ind.f.un + '/kg): ' + fmt(dInd.dose, 1) + ' ' + ind.f.un + ' → ' + fmt(dInd.ml, 1) + ' mL IV'); if(ind.f.contra) linhasDoses.push('⚠️ ' + ind.f.contra);
        }
        if (blq) {
          var dBlq = calcDose(blq.f);
          linhasDoses.push('3️⃣ Bloqueador Selecionado: ' + blq.f.nome + ' (' + blq.f.conc + ' ' + blq.f.un + '/mL · ' + fmt(blq.f.dose, 1) + ' ' + blq.f.un + '/kg): ' + fmt(dBlq.dose, 1) + ' ' + blq.f.un + ' → ' + fmt(dBlq.ml, 1) + ' mL IV'); if(blq.f.contra) linhasDoses.push('⚠️ ' + blq.f.contra);
        }
      }

      var recomendacoes = [];
      if (gt(peso, 150)) {
        recomendacoes.push('⚠️ PACIENTE COM OBESIDADE GRAVE (> 150 kg): Fentanil, Propofol e Midazolam devem ser dosados pelo Peso Ideal (IBW). Rocurônio pelo Peso Ideal ou Ajustado (máx 150 mg). Succinilcolina pode ser calculada pelo peso real (máx 200 mg), prevenindo colapso hemodinâmico e bloqueio neuromuscular prolongado.');
      } else if (gt(peso, 100)) {
        recomendacoes.push('⚠️ PACIENTE COM OBESIDADE (≥ 100 kg): Atenção estrita à farmacocinética! Fentanil, Propofol, Etomidato e Midazolam devem ser dosados pelo Peso Ideal (IBW). Rocurônio pelo Peso Ideal ou Ajustado (máx 150 mg). Apenas Succinilcolina deve ser dosada pelo Peso Real (teto máximo de 200 mg).');
      }
      if (ctxChave === 'choque') {
        recomendacoes.push('🏆 Sedativo: Etomidato ou Quetamina (estabilidade cardiovascular).');
        recomendacoes.push('⚠️ Evite Midazolam e Propofol (risco alto de colapso hemodinâmico e vasodilatação).');
        recomendacoes.push('🏆 BNM: Rocurônio preferencial (Succinilcolina se K⁺ comprovadamente normal).');
      } else if (ctxChave === 'asma') {
        recomendacoes.push('🏆 Sedativo: Quetamina (potente broncodilatador simpaticomimético).');
        recomendacoes.push('🏆 BNM: Rocurônio ou Succinilcolina.');
      } else if (ctxChave === 'tce') {
        recomendacoes.push('🏆 Sedativo: Etomidato (mantém Pressão de Perfusão Cerebral e reduz PIC).');
        recomendacoes.push('💉 Fentanil 3 min antes da laringoscopia para atenuar pico simpático.');
        recomendacoes.push('🏆 BNM: Rocurônio preferencial.');
      } else {
        recomendacoes.push('🏆 Sedativo padrão: Etomidato ou Quetamina.');
        recomendacoes.push('🏆 BNM padrão: Succinilcolina ou Rocurônio.');
      }

      var avisos = [
        'Succinilcolina é contraindicada se hipercalemia, queimadura/grande trauma > 72h ou miopatias.',
        'Checklist 7 Ps: Preparação ➔ Pré-oxigenação ➔ Pré-tratamento ➔ Paralisia com indução ➔ Posicionamento ➔ Passagem do tubo ➔ Pós-intubação.'
      ];

      var secoes = [
        ['🔴 AÇÃO IMEDIATA / CONDUTA / DOSE DE ATAQUE', linhasDoses],
        ['🟡 DILUIÇÃO, VELOCIDADE DE INFUSÃO E MANUTENÇÃO', [
          'Peso base: ' + fmt(peso, 1) + ' kg · Cenário clínico: ' + ctxTxt,
          'Ordem cronológica: Pré-oxigenação ➔ Fentanil (lento 2 min) ➔ Indutor em bolus IV ➔ Bloqueador em bolus IV rápido ➔ Laringoscopia aos 45-60s'
        ]],
        ['⚠️ ALERTAS DE SEGURANÇA E BLOQUEIOS', avisos.concat(recomendacoes.filter(function(r) { return r.indexOf('⚠️') !== -1; }))],
        ['ℹ️ JUSTIFICATIVA CLÍNICA E REFERÊNCIAS', recomendacoes.filter(function(r) { return r.indexOf('⚠️') === -1; })]
      ];

      return sucesso({
        id: ID, nome: NOME, estado: 'PRIORITARIO', rotulo: 'SALA VERMELHA · SRI / IOT',
        principal: fmt(peso, 0) + ' kg · ' + ctxTxt,
        secoes: secoes,
        avisos: avisos,
        dados: {
          pesoKg: peso,
          contexto: ctxChave,
          fentanil: { doseMcg: dFentanil.dose, ml: dFentanil.ml },
          etomidato: { doseMg: dEtomidato.dose, ml: dEtomidato.ml },
          quetamina: { doseMg: dQuetamina.dose, ml: dQuetamina.ml },
          succinilcolina: { doseMg: dSuccinil.dose, ml: dSuccinil.ml },
          rocuronio: { doseMg: dRocuronio.dose, ml: dRocuronio.ml },
          propofol: { doseMg: dPropofol.dose, ml: dPropofol.ml }
        },
        legado: {
          pesoKg: peso,
          fentanil: { doseMcg: dFentanil.dose, ml: dFentanil.ml },
          etomidato: { doseMg: dEtomidato.dose, ml: dEtomidato.ml },
          quetamina: { doseMg: dQuetamina.dose, ml: dQuetamina.ml },
          succinilcolina: { doseMg: dSuccinil.dose, ml: dSuccinil.ml },
          rocuronio: { doseMg: dRocuronio.dose, ml: dRocuronio.ml }
        },
        botoes: botoesEmergencia(ID, [btn('✅ Checklist 7 Ps', ID, 'checklist'), btn('🫁 Via Aérea Difícil', ID, 'vad')])
      });
    });
  }

  // ═════════════════════════════ FÓRMULA DE PARKLAND (QUEIMADURAS) ═════════════════════════════

  /**
   * Fórmula de Parkland clássica (ATLS 10ª ed / SBA / ABA):
   * Volume Total 24h = 4 mL × Peso (kg) × % SCQ (Superfície Corpórea Queimada 2º e 3º graus)
   * Solução: Ringer Lactato (RL)
   * 1ª fase (primeiras 8h a contar do acidente): 50% do volume total
   * 2ª fase (próximas 16h): 50% do volume total
   */
  function parkland(pesoKg, scqPorcentagem) {
    var ID = 'parkland', NOME = 'Fórmula de Parkland (Ressuscitação em Grandes Queimados)';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var peso = num(c, pesoKg, 'Peso corporal (kg)', 3, 350);
      var scq = num(c, scqPorcentagem, 'Superfície Corpórea Queimada - SCQ (%)', 1, 100);
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var volTotal = 4 * peso * scq; // em mL de Ringer Lactato
      var vol8h = volTotal / 2;
      var vazao8h = vol8h / 8;
      var vol16h = volTotal / 2;
      var vazao16h = vol16h / 16;
      var debitoMin = Math.round(peso * 0.5 * 10) / 10;
      var debitoMax = Math.round(peso * 1.0 * 10) / 10;

      var linhasResultado = [
        '• Peso: ' + fmt(peso, 1) + ' kg | SCQ: ' + fmt(scq, 0) + '%',
        '• Volume Total 24h (Ringer Lactato): ' + fmt(volTotal, 0) + ' mL',
        '• 1ª Etapa (Primeiras 8h a contar do ACIDENTE): ' + fmt(vol8h, 0) + ' mL (vazão: ' + fmt(vazao8h, 0) + ' mL/h)',
        '• 2ª Etapa (Próximas 16h): ' + fmt(vol16h, 0) + ' mL (vazão: ' + fmt(vazao16h, 0) + ' mL/h)',
        '• Alvo de Débito Urinário (SVD horária): 0,5 a 1,0 mL/kg/h (' + fmt(debitoMin, 1) + ' a ' + fmt(debitoMax, 1) + ' mL/h)'
      ];

      var avisos = [
        'O relógio das primeiras 8 horas conta A PARTIR DO MOMENTO DO ACIDENTE/QUEIMADURA, não da chegada ao hospital.',
        'Descontar da 1ª etapa qualquer volume já infundido no atendimento pré-hospitalar.',
        'Ajustar a taxa horária de Ringer Lactato para cima ou para baixo conforme o débito urinário a cada 1 hora.',
        'Evitar hiper-ressuscitação hídrica ("fluid creep"), que aumenta risco de síndrome compartimental abdominal e edema pulmonar.'
      ];
      if (lt(peso, 10)) {
        avisos.unshift('⚠️ QUEIMADURA EM PEDIATRIA / LACTENTE (< 10 kg): Crianças têm menor reserva hepática de glicogênio. Além do volume de Parkland com Ringer Lactato (3–4 mL/kg/% SCQ), DEVE-SE adicionar hidratação venosa de manutenção com SG 5% (Holliday-Segar) para prevenir hipoglicemia severa.');
      }
      if (gt(peso, 150)) {
        avisos.unshift('⚠️ OBESIDADE SEVERA (> 150 kg): O cálculo pelo peso real gera volumes massivos com risco extremo de "fluid creep", Síndrome Compartimental Abdominal e edema agudo de pulmão. Utilizar o Peso Ideal (IBW) ou diretriz da ABA (2 mL/kg/% SCQ) e titular estritamente pelo débito urinário (0,5 mL/kg/h pelo peso ideal).');
      }
      if (gt(scq, 50)) {
        avisos.unshift('🚨 GRANDE QUEIMADO CRÍTICO (SCQ > 50%): Risco altíssimo de choque distributivo/hipovolêmico precoce e hipotermia. Monitorização em Centro de Queimados e ressuscitação volêmica intensiva.');
      }

      return sucesso({
        id: ID,
        nome: NOME,
        estado: 'CALCULO',
        rotulo: 'PARKLAND · RINGER LACTATO 4 mL/kg/%',
        principal: fmt(volTotal, 0) + ' mL em 24h',
        textoFormatado: '🔥 <b>FÓRMULA DE PARKLAND (RESSUSCITAÇÃO EM GRANDES QUEIMADOS)</b>\n\n' +
          '• <b>Peso:</b> ' + fmt(peso, 1) + ' kg | <b>SCQ:</b> ' + fmt(scq, 0) + '%\n' +
          '• <b>Volume Total (24h):</b> <code>' + fmt(volTotal, 0) + ' mL</code> de Ringer Lactato\n\n' +
          '⏱️ <b>Esquema de Infusão:</b>\n' +
          '1️⃣ <b>Primeiras 8 horas (do acidente):</b> <code>' + fmt(vol8h, 0) + ' mL</code> → <b>' + fmt(vazao8h, 0) + ' mL/h</b> na BIC\n' +
          '2️⃣ <b>Próximas 16 horas:</b> <code>' + fmt(vol16h, 0) + ' mL</code> → <b>' + fmt(vazao16h, 0) + ' mL/h</b> na BIC\n\n' +
          '🎯 <b>Meta de Débito Urinário (SVD horária):</b>\n' +
          '• Adultos: 0,5–1,0 mL/kg/h (<b>' + fmt(debitoMin, 1) + ' a ' + fmt(debitoMax, 1) + ' mL/h</b>)\n\n' +
          '⚠️ <b>Regras de Segurança ATLS 10ª Ed / SBA:</b>\n' +
          '• Descontar volume já recebido no pré-hospitalar das primeiras 8 horas.\n' +
          '• Monitorizar diurese horária rigorosa para titular vazão e prevenir síndrome compartimental abdominal.',
        secoes: [
          ['PARÂMETROS', ['Peso: ' + fmt(peso, 1) + ' kg', 'SCQ: ' + fmt(scq, 0) + '%', 'Fórmula: 4 mL × ' + fmt(peso, 1) + ' × ' + fmt(scq, 0)]],
          ['CRONOGRAMA DE INFUSÃO', [
            '1ª Etapa (8h do trauma): ' + fmt(vol8h, 0) + ' mL (' + fmt(vazao8h, 0) + ' mL/h)',
            '2ª Etapa (16h restantes): ' + fmt(vol16h, 0) + ' mL (' + fmt(vazao16h, 0) + ' mL/h)'
          ]],
          ['CONDUTAS E MONITORIZAÇÃO', avisos]
        ],
        avisos: avisos,
        dados: {
          pesoKg: peso,
          scq: scq,
          volumeTotal24hMl: volTotal,
          volumePrimeiras8hMl: vol8h,
          vazaoPrimeiras8hMlH: vazao8h,
          volumeSeguintes16hMl: vol16h,
          vazaoSeguintes16hMlH: vazao16h,
          debitoUrinarioAlvoMlH: { min: debitoMin, max: debitoMax }
        },
        legado: {
          volumeTotalMl: volTotal,
          volume8hMl: vol8h,
          vazao8hMlH: vazao8h,
          volume16hMl: vol16h,
          vazao16hMlH: vazao16h
        },
        botoes: botoesEmergencia(ID, [btn('🧮 Novo cálculo', ID, 'voltar')])
      });
    });
  }

  function calcularParklandPorTextoLivre(texto) {
    if (!texto || typeof texto !== 'string') return null;
    var t = texto.toLowerCase();
    if (!/(?:parkland|queimadur[as]?)\b/i.test(t)) return null;

    var m1 = texto.match(/(?:parkland|queimadur[as]?)\b.*?(?:(\d+(?:[.,]\d+)?)\s*kg).*?(\d+(?:[.,]\d+)?)\s*%/i) ||
             texto.match(/(?:parkland|queimadur[as]?)\b.*?(\d+(?:[.,]\d+)?)\s*%.*?(?:(\d+(?:[.,]\d+)?)\s*kg)/i);
    if (m1) {
      var p1 = parseFloat((m1[1] || m1[2]).replace(',', '.'));
      var s1 = parseFloat((m1[2] || m1[1]).replace(',', '.'));
      return parkland(p1, s1);
    }

    var mPeso = texto.match(/(?:peso\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i);
    var mScq = texto.match(/(?:scq|superficie|queimadura)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?/i) || texto.match(/(\d+(?:[.,]\d+)?)\s*%/i);
    if (mPeso && mScq) {
      var p = parseFloat(mPeso[1].replace(',', '.'));
      var s = parseFloat(mScq[1].replace(',', '.'));
      return parkland(p, s);
    }
    return null;
  }

  /**
   * MELD (Model for End-Stage Liver Disease - UNOS / Kamath et al. 2007) e MELD-Na (OPTN 2016)
   */
  function meld(bilirrubina, creatinina, inr, sodio, dialiseRecente) {
    var ID = 'meld', NOME = 'MELD / MELD-Na';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var b = num(c, bilirrubina, 'Bilirrubina total (mg/dL)', 0.1, 100);
      var cr = num(c, creatinina, 'Creatinina (mg/dL)', 0.1, 30);
      var i = num(c, inr, 'INR', 0.5, 20);
      var na = num(c, sodio, 'Sódio sérico (mEq/L)', 100, 180, { opcional: true });
      var dialise = bool(c, dialiseRecente, 'Diálise recente (≥ 2x na última semana)', { opcional: true }) || false;
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      // Regras UNOS: Valores mínimos = 1.0; Cr máxima = 4.0
      var bVal = Math.max(1.0, b);
      var inrVal = Math.max(1.0, i);
      var crVal = dialise ? 4.0 : Math.min(4.0, Math.max(1.0, cr));

      // Fórmula UNOS MELD:
      // 9.57 * ln(Cr) + 3.78 * ln(Bilirrubina) + 11.2 * ln(INR) + 6.43
      var meldScore = 9.57 * Math.log(crVal) + 3.78 * Math.log(bVal) + 11.2 * Math.log(inrVal) + 6.43;
      var meldArred = Math.round(meldScore);
      meldArred = Math.max(6, Math.min(40, meldArred));

      var meldNaArred = meldArred;
      var temMeldNa = false;
      if (na !== null && meldArred > 11) {
        temMeldNa = true;
        var naVal = Math.max(125, Math.min(137, na));
        var meldNa = meldArred + 1.32 * (137 - naVal) - (0.033 * meldArred * (137 - naVal));
        meldNaArred = Math.round(meldNa);
        meldNaArred = Math.max(6, Math.min(40, meldNaArred));
      }

      var mortalidade3m = '';
      var estado = 'BAIXO';
      if (meldArred >= 40) { mortalidade3m = '≥ 71,3% de mortalidade em 3 meses'; estado = 'PRIORITARIO'; }
      else if (meldArred >= 30) { mortalidade3m = '52,6% de mortalidade em 3 meses'; estado = 'PRIORITARIO'; }
      else if (meldArred >= 20) { mortalidade3m = '19,6% de mortalidade em 3 meses'; estado = 'ATENCAO'; }
      else if (meldArred >= 10) { mortalidade3m = '6,0% de mortalidade em 3 meses'; estado = 'ATENCAO'; }
      else { mortalidade3m = '1,9% de mortalidade em 3 meses'; estado = 'BAIXO'; }

      var principal = 'MELD ' + meldArred + (temMeldNa ? (' · MELD-Na ' + meldNaArred) : '');
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: 'ESTIMATIVA DE MORTALIDADE HEPÁTICA (MELD)',
        principal: principal,
        secoes: [
          ['PARÂMETROS UTILIZADOS', [
            'Bilirrubina: ' + fmt(b, 1) + ' mg/dL' + (b < 1.0 ? ' (ajustada para 1,0 pelo UNOS)' : ''),
            'Creatinina: ' + fmt(cr, 2) + ' mg/dL' + (dialise ? ' (fixada em 4,0 por diálise)' : (cr < 1.0 ? ' (ajustada para 1,0)' : '')),
            'INR: ' + fmt(i, 2) + (i < 1.0 ? ' (ajustado para 1,0)' : ''),
            (na !== null ? ('Sódio sérico: ' + fmt(na, 0) + ' mEq/L') : 'Sódio: não informado (MELD-Na não calculado)')
          ]],
          ['PROGNÓSTICO ESTIMADO', [mortalidade3m, 'Critério regulador de fila de transplante hepático no Brasil e UNOS.']]
        ],
        avisos: ['MELD pontua entre 6 e 40. Diálise pelo menos 2x nos últimos 7 dias fixa Cr em 4,0 mg/dL.'],
        dados: { meld: meldArred, meldNa: temMeldNa ? meldNaArred : null, dialise: dialise },
        legado: { pontuacao: meldArred, meld: meldArred, meldNa: temMeldNa ? meldNaArred : null, mortalidade: mortalidade3m }
      });
    });
  }

  // ═════════════════════════════ POSOLOGIA PEDIÁTRICA DETERMINÍSTICA ═════════════════════════════

  /**
   * Calculadora Posológica Pediátrica Determinística (Fórmulas Fixas · Revisão clínica necessária)
   * Referências: SBP (Sociedade Brasileira de Pediatria) / Ministério da Saúde / Guia Farmacêutico HSL / REMUME
   */
  // Identifica apenas fármacos explícitos. Sintoma, diagnóstico ou termo desconhecido
  // nunca elege tratamento. Mais de um fármaco exige seleção individual.
  function identificarFarmacoPosologico(texto) {
    var t = semAcento(texto).replace(/_/g, ' ');
    var aliases = {
      amoxicilina_clavulanato: /\b(?:clavulanato|clavulin|amoxiclav)\b/,
      amoxicilina: /\b(?:amoxicilina|amoxil)\b/,
      azitromicina: /\b(?:azitromicina|azitro)\b/,
      cefalexina: /\bcefalexina\b/,
      dipirona: /\b(?:dipirona|novalgina)\b/,
      paracetamol: /\b(?:paracetamol|tylenol)\b/,
      ibuprofeno: /\b(?:ibuprofeno|alivium)\b/,
      prednisolona: /\b(?:prednisolona|prelone)\b/,
      sulfametoxazol_trimetoprima: /\b(?:sulfametoxazol|trimetoprima|bactrim)\b/,
      loratadina: /\b(?:loratadina|claritin)\b/,
      dexclorfeniramina: /\b(?:dexclorfeniramina|polaramine)\b/,
      albendazol: /\b(?:albendazol|zentel)\b/,
      mebendazol: /\b(?:mebendazol|pantelmin)\b/,
      nitazoxanida: /\b(?:nitazoxanida|annita)\b/,
      sais_reidratacao: /\b(?:sro|sais (?:de )?reidratacao|soro oral)\b/,
      budesonida_nasal: /\b(?:budesonida|busonid)\b/
    };
    var encontrados = Object.keys(aliases).filter(function(k) { return aliases[k].test(t); });
    if (encontrados.indexOf('amoxicilina_clavulanato') >= 0) {
      encontrados = encontrados.filter(function(k) { return k !== 'amoxicilina'; });
    }
    return encontrados.length === 1 ? encontrados[0] : null;
  }

  function posologiaPediatrica(pesoKg, farmacoOuCondicao, opcoes) {
    var ID = 'posologia_pediatrica', NOME = 'Posologia Pediátrica Determinística';
    return seguro(ID, NOME, function () {
      var ctx = novoCtx();
      var opt = opcoes || {};
      var termo = semAcento(farmacoOuCondicao || '');
      var peso = num(ctx, pesoKg, 'Peso (kg)', 1, 80, { opcional: true });
      var idade = num(ctx, opt.idadeAnos, 'Idade (anos)', 0, 17, { opcional: true });
      if (ctx.erros.length) return entradaInvalida(ID, NOME, ctx);

      var tabela = {
        amoxicilina: {
          nome: 'Amoxicilina',
          apresentacao: 'Amoxicilina 250 mg/5 mL (suspensão oral)',
          concentracaoMgPorMl: 50,
          doseMgKgDia: opt.doseAlta ? 90 : 50,
          tomadasDia: opt.tomadasDia || 3,
          intervaloHoras: (opt.tomadasDia === 2) ? 12 : 8,
          diasTratamento: opt.diasTratamento || 10,
          doseMaximaAdultoMgDia: 1500,
          volumeFrascoMl: 150,
          indicacao: opt.doseAlta ? 'Otite Média Aguda / Sinusite / PAC (dose alta 90 mg/kg/dia)' : 'Amigdalite / Faringite / Infecções bacterianas leves (50 mg/kg/dia)',
          instrucoes: 'Pode ser administrado com ou sem alimentos. Agitar bem antes de usar.'
        },
        amoxicilina_clavulanato: {
          nome: 'Amoxicilina + Clavulanato de Potássio',
          apresentacao: 'Amoxicilina 250 mg + Clavulanato 62,5 mg / 5 mL (suspensão oral)',
          concentracaoMgPorMl: 50,
          doseMgKgDia: opt.doseAlta ? 90 : 50,
          tomadasDia: 3,
          intervaloHoras: 8,
          diasTratamento: opt.diasTratamento || 10,
          doseMaximaAdultoMgDia: 1500,
          volumeFrascoMl: 75,
          indicacao: opt.doseAlta ? 'Otite complicada / Sinusite refratária (dose alta 90 mg/kg/dia)' : 'Infecções de vias aéreas com suspeita de germes produtores de beta-lactamase (50 mg/kg/dia)',
          instrucoes: 'Administrar preferencialmente no início da refeição para minimizar risco de intolerância gastrintestinal.'
        },
        azitromicina: {
          nome: 'Azitromicina',
          apresentacao: 'Azitromicina 200 mg/5 mL (suspensão oral)',
          concentracaoMgPorMl: 40,
          doseMgKgDia: 10,
          tomadasDia: 1,
          intervaloHoras: 24,
          diasTratamento: opt.diasTratamento || 5,
          doseMaximaAdultoMgDia: 500,
          volumeFrascoMl: 15,
          indicacao: 'Faringite/Amigdalite (opção se alergia a penicilina), PAC atípica (10 mg/kg/dia por 5 dias)',
          instrucoes: 'Administrar 1h antes ou 2h após alimentos. Tomada única diária no mesmo horário.'
        },
        cefalexina: {
          nome: 'Cefalexina',
          apresentacao: 'Cefalexina 250 mg/5 mL (suspensão oral)',
          concentracaoMgPorMl: 50,
          doseMgKgDia: opt.doseAlta ? 100 : 50,
          tomadasDia: 4,
          intervaloHoras: 6,
          diasTratamento: opt.diasTratamento || 7,
          doseMaximaAdultoMgDia: 2000,
          volumeFrascoMl: 100,
          indicacao: 'Piodermites, impetigo, celulite leve, ITU baixa (50 a 100 mg/kg/dia)',
          instrucoes: 'Tomar a cada 6 horas. Agitar bem antes de usar.'
        },
        dipirona: {
          nome: 'Dipirona',
          apresentacao: 'Dipirona 500 mg/mL (solução oral gotas)',
          tipo: 'gotas',
          mgPorGota: 25,
          doseMgKgDose: 12.5,
          tomadasDia: 4,
          intervaloHoras: 6,
          doseMaximaPorDoseMg: 500,
          indicacao: 'Dor ou febre (1 gota para cada 2 kg de peso de 6/6h se necessário)',
          instrucoes: 'Administrar com um pouco de líquido a cada 6 horas se dor ou febre (máximo 4 vezes ao dia).'
        },
        paracetamol: {
          nome: 'Paracetamol',
          apresentacao: 'Paracetamol 200 mg/mL (solução oral gotas)',
          tipo: 'gotas',
          mgPorGota: 10,
          doseMgKgDose: 10,
          tomadasDia: 4,
          intervaloHoras: 6,
          doseMaximaPorDoseMg: 500,
          indicacao: 'Dor ou febre (1 gota por kg de peso de 6/6h se necessário)',
          instrucoes: 'Administrar a cada 6 horas se dor ou febre. Não ultrapassar 5 tomadas ao dia.'
        },
        ibuprofeno: {
          nome: 'Ibuprofeno',
          apresentacao: 'Ibuprofeno 50 mg/mL (solução oral gotas)',
          tipo: 'gotas',
          mgPorGota: 2.5,
          doseMgKgDose: 10,
          tomadasDia: 3,
          intervaloHoras: 8,
          doseMaximaPorDoseMg: 400,
          indicacao: 'Dor, febre ou inflamação (4 gotas por kg da suspensão 50 mg/mL de 8/8h se dor/febre)',
          instrucoes: 'Administrar junto ou logo após alimentos para proteção gástrica.'
        },
        prednisolona: {
          nome: 'Prednisolona (Fosfato Sódico)',
          apresentacao: 'Prednisolona 3 mg/mL (solução oral)',
          concentracaoMgPorMl: 3,
          doseMgKgDia: opt.doseMgKgDia || 1,
          tomadasDia: 1,
          intervaloHoras: 24,
          diasTratamento: opt.diasTratamento || 5,
          doseMaximaAdultoMgDia: 40,
          volumeFrascoMl: 60,
          indicacao: 'Crise asmática / Laringite estridulosa / Broncoespasmo (1 a 2 mg/kg/dia)',
          instrucoes: 'Administrar em dose única pela manhã, após o desjejum, por 3 a 5 dias.'
        },
        sulfametoxazol_trimetoprima: {
          nome: 'Sulfametoxazol + Trimetoprima',
          apresentacao: 'Sulfametoxazol 200 mg + Trimetoprima 40 mg / 5 mL (suspensão oral)',
          concentracaoMgPorMl: 8,
          doseMgKgDia: 8,
          tomadasDia: 2,
          intervaloHoras: 12,
          diasTratamento: opt.diasTratamento || 10,
          doseMaximaAdultoMgDia: 320,
          volumeFrascoMl: 100,
          indicacao: 'Infecções urinárias (ITU) / Infecções respiratórias selecionadas (8 mg TMP/kg/dia)',
          instrucoes: 'Tomar a cada 12 horas (sugestão: 08:00 e 20:00) com boa ingestão hídrica durante o dia.'
        },
        loratadina: {
          nome: 'Loratadina',
          apresentacao: 'Loratadina 1 mg/mL (xarope - frasco com 100 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 1,
          tomadasDia: 1,
          intervaloHoras: 24,
          horarioSugerido: '20:00 (à noite)',
          diasTratamento: opt.diasTratamento || 10,
          volumeFrascoMl: 100,
          indicacao: 'Rinite alérgica / Urticária / Prurido (dose fixa por faixa de peso/idade: 5 mg se 2-12 anos até 30 kg; 10 mg se > 30 kg ou > 12 anos)',
          instrucoes: 'Administrar preferencialmente à noite (às 20:00) para otimizar alívio matinal e evitar sonolência diurna. Não requer cálculo em mg/kg.'
        },
        dexclorfeniramina: {
          nome: 'Dexclorfeniramina (Maleato)',
          apresentacao: 'Dexclorfeniramina 2 mg/5 mL (solução oral - frasco com 120 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 0.4,
          tomadasDia: 3,
          intervaloHoras: 8,
          horarioSugerido: '07:00 - 15:00 - 23:00',
          diasTratamento: opt.diasTratamento || 5,
          volumeFrascoMl: 120,
          indicacao: 'Alergia aguda / Prurido / Urticária (2-6 anos: 1,25 mL de 8/8h; 6-12 anos: 2,5 mL de 8/8h; >12 anos: 5 mL de 8/8h)',
          instrucoes: 'Tomar a cada 8 horas (sugestão: 07h - 15h - 23h). Pode causar sonolência.'
        },
        albendazol: {
          nome: 'Albendazol',
          apresentacao: 'Albendazol 400 mg/10 mL (suspensão oral - frasco com 10 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 40,
          tomadasDia: 1,
          intervaloHoras: 24,
          horarioSugerido: '08:00 (com café da manhã)',
          diasTratamento: 1,
          volumeFrascoMl: 10,
          indicacao: 'Ascaridíase / Oxiuríase / Ancilostomíase / Parasitoses intestinais (400 mg dose única se > 2 anos)',
          instrucoes: 'Tomar em dose única pela manhã junto com alimentos gordurosos para otimizar absorção. Repetir em 14 dias se suspeita de oxiuríase.'
        },
        mebendazol: {
          nome: 'Mebendazol',
          apresentacao: 'Mebendazol 100 mg/5 mL (suspensão oral - frasco com 30 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 20,
          tomadasDia: 2,
          intervaloHoras: 12,
          horarioSugerido: '08:00 e 20:00',
          diasTratamento: 3,
          volumeFrascoMl: 30,
          indicacao: 'Nematodíases / Ascaris / Oxiúrus / Tricocefalo (100 mg 12/12h por 3 dias para > 2 anos)',
          instrucoes: 'Tomar a cada 12 horas (sugestão: 08:00 e 20:00) por 3 dias consecutivos. Não necessita de jejum.'
        },
        nitazoxanida: {
          nome: 'Nitazoxanida',
          apresentacao: 'Nitazoxanida 20 mg/mL (100 mg/5 mL suspensão oral - frasco com 100 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 20,
          tomadasDia: 2,
          intervaloHoras: 12,
          horarioSugerido: '08:00 e 20:00',
          diasTratamento: 3,
          volumeFrascoMl: 100,
          indicacao: 'Gastroenterite viral, Giardíase, Criptosporidíase, Helmintíases mistas (1-3 anos: 100 mg; 4-11 anos: 200 mg de 12/12h por 3 dias)',
          instrucoes: 'Tomar a cada 12 horas (sugestão: 08:00 e 20:00) OBRIGATORIAMENTE junto a alimentos por 3 dias consecutivos.'
        },
        sais_reidratacao: {
          nome: 'Sais de Reidratação Oral (SRO)',
          apresentacao: 'SRO pó para solução oral (envelope para 1000 mL)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 1,
          tomadasDia: 4,
          intervaloHoras: 6,
          horarioSugerido: 'Após cada evacuação líquida ou vômito',
          diasTratamento: 3,
          volumeFrascoMl: 1000,
          indicacao: 'Prevenção e tratamento da desidratação em gastroenterite aguda / diarreia (Plano A / Plano B da OMS/MS)',
          instrucoes: 'Diluir 1 envelope em 1 litro de água tratada ou fervida. Oferecer com frequência em pequenas quantidades.'
        },
        budesonida_nasal: {
          nome: 'Budesonida Spray Nasal',
          apresentacao: 'Budesonida 50 mcg/dose spray nasal (frasco com 120 doses)',
          tipo: 'dose_fixa_idade',
          concentracaoMgPorMl: 1,
          tomadasDia: 1,
          intervaloHoras: 24,
          horarioSugerido: '08:00 (pela manhã)',
          diasTratamento: 30,
          volumeFrascoMl: 120,
          indicacao: 'Rinite alérgica moderada a grave / Rinite vasomotora',
          instrucoes: 'Aplicar 1 jato em cada narina pela manhã (ou de 12/12h se sintomas graves). Assoar e lavar narinas com soro fisiológico antes.'
        }
      };

      var chaveAlvo = identificarFarmacoPosologico(termo);
      if (!chaveAlvo || !tabela[chaveAlvo]) {
        ctx.faltas.push('Um único medicamento explícito; a calculadora não escolhe tratamento por sintomas');
        return entradaInvalida(ID, NOME, ctx);
      }
      var cfg = tabela[chaveAlvo];
      if (cfg.tipo === 'dose_fixa_idade') {
        if (idade === null && peso === null) ctx.faltas.push('Idade em anos ou peso para a faixa etária');
        else if (idade !== null && idade < (chaveAlvo === 'nitazoxanida' ? 1 : 2)) {
          ctx.erros.push('Faixa etária não coberta por este cálculo; consultar avaliação pediátrica');
        }
      } else if (peso === null) ctx.faltas.push('Peso (kg)');
      if (pendente(ctx)) return entradaInvalida(ID, NOME, ctx);
      var dadosCalculados = {};

      if (cfg.tipo === 'dose_fixa_idade') {
        var doseEfetivaMg = 5;
        var volumeMl = 5;
        var diasT = cfg.diasTratamento;

        if (chaveAlvo === 'albendazol') {
          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'suspensao',
            pesoKg: peso,
            doseDiariaTotalMg: 400,
            dosePorTomadaMg: 400,
            volumePorTomadaMl: 10,
            tomadasDia: 1,
            intervaloHoras: 24,
            diasTratamento: 1,
            volumeTotalTratamentoMl: 10,
            volumeFrascoMl: 10,
            frascosNecessarios: 1,
            quantidadeDispensar: '1 frasco(s) de 10 mL (ou 1 comprimido mastigável de 400 mg)',
            instrucaoPosologica: 'Tomar 10 mL (400 mg) por via oral em dose única pela manhã (sugestão: 08:00 com refeição ou alimento gorduroso para melhor absorção). Repetir em 14 dias se suspeita de Enterobius/oxiuríase.',
            memoriaCalculo: 'Dose oficial Ministério da Saúde / HSL: Crianças > 2 anos e adultos recebem 400 mg (10 mL ou 1 comp 400 mg) em dose única INDEPENDENTE DO PESO. Não se calcula por mg/kg. Contraindicado em menores de 2 anos.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'mebendazol') {
          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'suspensao',
            pesoKg: peso,
            doseDiariaTotalMg: 200,
            dosePorTomadaMg: 100,
            volumePorTomadaMl: 5,
            tomadasDia: 2,
            intervaloHoras: 12,
            diasTratamento: 3,
            volumeTotalTratamentoMl: 30,
            volumeFrascoMl: 30,
            frascosNecessarios: 1,
            quantidadeDispensar: '1 frasco(s) de 30 mL',
            instrucaoPosologica: 'Tomar 5 mL (100 mg) por via oral a cada 12 horas (sugestão: 08:00 e 20:00) durante 3 dias consecutivos.',
            memoriaCalculo: 'Dose oficial HSL / REMUME: Crianças > 2 anos recebem 100 mg (5 mL) de 12/12h por 3 dias (dose fixa por idade, não por peso). Frasco de 30 mL cobre o tratamento completo.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'nitazoxanida') {
          var menor4N = idade < 4;
          var menor12N = idade < 12;
          var volN = menor4N ? 5 : (menor12N ? 10 : 25);
          var doseN = menor4N ? 100 : (menor12N ? 200 : 500);
          var volTotN = volN * 2 * 3;
          var frascosN = Math.ceil(volTotN / 100) || 1;
          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'suspensao',
            pesoKg: peso,
            doseDiariaTotalMg: doseN * 2,
            dosePorTomadaMg: doseN,
            volumePorTomadaMl: volN,
            tomadasDia: 2,
            intervaloHoras: 12,
            diasTratamento: 3,
            volumeTotalTratamentoMl: volTotN,
            volumeFrascoMl: 100,
            frascosNecessarios: frascosN,
            quantidadeDispensar: frascosN + ' frasco(s) de 100 mL' + (menor12N ? '' : ' (ou comprimidos de 500 mg)'),
            instrucaoPosologica: 'Tomar ' + volN + ' mL por via oral a cada 12 horas (sugestão: 08:00 e 20:00) OBRIGATORIAMENTE junto a alimentos durante 3 dias consecutivos.',
            memoriaCalculo: 'Dose oficial HSL / bula: 1 a 3 anos: 100 mg (5 mL) 12/12h; 4 a 11 anos: 200 mg (10 mL) 12/12h; >= 12 anos: 500 mg 12/12h com alimentos durante 3 dias.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'sais_reidratacao') {
          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'po_solucao',
            pesoKg: peso,
            doseDiariaTotalMg: 1,
            dosePorTomadaMg: 1,
            volumePorTomadaMl: 150,
            tomadasDia: 4,
            intervaloHoras: 6,
            diasTratamento: 3,
            volumeTotalTratamentoMl: 1000,
            volumeFrascoMl: 1000,
            frascosNecessarios: 4,
            quantidadeDispensar: '4 a 6 envelopes de SRO',
            instrucaoPosologica: 'Diluir 1 envelope em 1 litro de água tratada ou fervida. Oferecer frequentemente em pequenas colheres ou goles após cada evacuação líquida ou vômito.',
            memoriaCalculo: 'Diretriz OMS / MS: Prevenção e tratamento de desidratação (Plano A ambulatorial). Fracionar volume para evitar vômitos reflexos. Solução dura 24h.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'budesonida_nasal') {
          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'spray_nasal',
            pesoKg: peso,
            doseDiariaTotalMg: 0.1,
            dosePorTomadaMg: 0.05,
            volumePorTomadaMl: 1,
            tomadasDia: 1,
            intervaloHoras: 24,
            diasTratamento: 30,
            volumeTotalTratamentoMl: 120,
            volumeFrascoMl: 120,
            frascosNecessarios: 1,
            quantidadeDispensar: '1 frasco(s) de spray nasal (120 doses)',
            instrucaoPosologica: 'Aplicar 1 jato (50 mcg) em cada narina 1 vez ao dia pela manhã (ou de 12/12h se sintomas intensos).',
            memoriaCalculo: 'Diretriz Brasileira de Rinite / HSL: Corticoide tópico nasal de primeira escolha. Uso contínuo diário; efeito pleno a partir de 3 a 7 dias.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'loratadina') {
          var pesoMaior30 = (peso > 30) || idade > 12;
          if (pesoMaior30) {
            doseEfetivaMg = 10;
            volumeMl = 10;
          } else {
            doseEfetivaMg = 5;
            volumeMl = 5;
          }
          var volTotalL = volumeMl * 1 * diasT;
          var frascosL = Math.ceil(volTotalL / cfg.volumeFrascoMl) || 1;

          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'xarope',
            pesoKg: peso,
            doseDiariaTotalMg: doseEfetivaMg,
            dosePorTomadaMg: doseEfetivaMg,
            volumePorTomadaMl: volumeMl,
            tomadasDia: 1,
            intervaloHoras: 24,
            diasTratamento: diasT,
            volumeTotalTratamentoMl: volTotalL,
            volumeFrascoMl: cfg.volumeFrascoMl,
            frascosNecessarios: frascosL,
            quantidadeDispensar: frascosL + ' frasco(s) de ' + cfg.volumeFrascoMl + ' mL',
            instrucaoPosologica: 'Tomar ' + volumeMl + ' mL por via oral 1 vez ao dia, à noite (às 20:00), durante ' + diasT + ' dias.',
            memoriaCalculo: 'Dose oficial do Guia HSL: 2 a 12 anos (até 30 kg): 5 mg (5 mL) 1 vez ao dia. > 12 anos ou > 30 kg: 10 mg (10 mL ou 1 comp) 1 vez ao dia. Dose fixa por faixa etária/peso (NÃO calculada em mg/kg). Apresentação: ' + cfg.apresentacao + '. Horário sugerido: 20:00 (à noite).',
            orientacoes: cfg.instrucoes + (pesoMaior30 ? ' (Paciente com > 30 kg ou > 12 anos recebe a dose máxima de 10 mg).' : ' (Para pacientes com > 30 kg ou > 12 anos, a dose oficial é de 10 mL).'),
            indicacao: cfg.indicacao
          };
        } else if (chaveAlvo === 'dexclorfeniramina') {
          var menor6 = idade < 6;
          var menor12 = idade < 12;
          if (menor6) {
            volumeMl = 1.25;
            doseEfetivaMg = 0.5;
          } else if (menor12) {
            volumeMl = 2.5;
            doseEfetivaMg = 1.0;
          } else {
            volumeMl = 5.0;
            doseEfetivaMg = 2.0;
          }
          var volTotalD = Math.round(volumeMl * 3 * diasT * 10) / 10;
          var frascosD = Math.ceil(volTotalD / cfg.volumeFrascoMl) || 1;

          dadosCalculados = {
            chave: chaveAlvo,
            farmaco: cfg.nome,
            apresentacao: cfg.apresentacao,
            tipo: 'solucao_oral',
            pesoKg: peso,
            doseDiariaTotalMg: doseEfetivaMg * 3,
            dosePorTomadaMg: doseEfetivaMg,
            volumePorTomadaMl: volumeMl,
            tomadasDia: 3,
            intervaloHoras: 8,
            diasTratamento: diasT,
            volumeTotalTratamentoMl: volTotalD,
            volumeFrascoMl: cfg.volumeFrascoMl,
            frascosNecessarios: frascosD,
            quantidadeDispensar: frascosD + ' frasco(s) de ' + cfg.volumeFrascoMl + ' mL',
            instrucaoPosologica: 'Tomar ' + fmtMl(volumeMl) + ' mL por via oral a cada 8 horas (sugestão: 07:00 - 15:00 - 23:00) durante ' + diasT + ' dias.',
            memoriaCalculo: 'Dose oficial do Guia HSL: 2 a 6 anos: 1,25 mL (0,5 mg) 3x/dia; 6 a 12 anos: 2,5 mL (1 mg) 3x/dia; > 12 anos: 5 mL (2 mg) 3x/dia. Horários sugeridos: 07h - 15h - 23h. Apresentação: ' + cfg.apresentacao + '.',
            orientacoes: cfg.instrucoes,
            indicacao: cfg.indicacao
          };
        }
      } else if (cfg.tipo === 'gotas') {
        var doseDesejadaMg = cfg.doseMgKgDose * peso;
        var doseEfetivaMg = Math.min(doseDesejadaMg, cfg.doseMaximaPorDoseMg);
        var gotas = Math.round(doseEfetivaMg / cfg.mgPorGota);
        if (gotas < 1) gotas = 1;

        dadosCalculados = {
          chave: chaveAlvo,
          farmaco: cfg.nome,
          apresentacao: cfg.apresentacao,
          tipo: 'gotas',
          pesoKg: peso,
          dosePorTomadaMg: doseEfetivaMg,
          gotasPorTomada: gotas,
          intervaloHoras: cfg.intervaloHoras,
          instrucaoPosologica: 'Dar ' + gotas + ' gotas por via oral a cada ' + cfg.intervaloHoras + ' horas se dor ou febre (intervalo mínimo de 6h, máx 4 vezes ao dia).',
          memoriaCalculo: 'Dose base: ' + cfg.doseMgKgDose + ' mg/kg × ' + peso + ' kg = ' + fmt(doseDesejadaMg, 1) + ' mg (máx ' + cfg.doseMaximaPorDoseMg + ' mg) ➔ ' + doseEfetivaMg + ' mg ÷ ' + cfg.mgPorGota + ' mg/gota = ' + gotas + ' gotas.',
          quantidadeDispensar: '1 frasco conta-gotas',
          frascos: 1,
          orientacoes: cfg.instrucoes,
          indicacao: cfg.indicacao
        };
      } else {
        var doseDiariaBrutaMg = cfg.doseMgKgDia * peso;
        var doseDiariaEfetivaMg = Math.min(doseDiariaBrutaMg, cfg.doseMaximaAdultoMgDia);
        var dosePorTomadaMg = doseDiariaEfetivaMg / cfg.tomadasDia;
        var volumeMlBruto = dosePorTomadaMg / cfg.concentracaoMgPorMl;
        var volumeMl = Math.round(volumeMlBruto * 10) / 10;
        if (volumeMl < 0.5) volumeMl = 0.5;

        var volumeTotalTratamentoMl = volumeMl * cfg.tomadasDia * cfg.diasTratamento;
        var frascos = Math.ceil(volumeTotalTratamentoMl / cfg.volumeFrascoMl);

        var sugestaoHorario = (cfg.intervaloHoras === 8)
          ? ' (sugestão: 07:00 - 15:00 - 23:00)'
          : ((cfg.intervaloHoras === 12)
            ? ' (sugestão: 08:00 e 20:00)'
            : ((cfg.intervaloHoras === 24)
              ? (chaveAlvo === 'prednisolona' ? ' pela manhã (às 08:00, com alimento)' : ' no mesmo horário (às 10:00)')
              : ''));

        dadosCalculados = {
          chave: chaveAlvo,
          farmaco: cfg.nome,
          apresentacao: cfg.apresentacao,
          tipo: 'suspensao',
          pesoKg: peso,
          doseDiariaTotalMg: doseDiariaEfetivaMg,
          dosePorTomadaMg: Math.round(dosePorTomadaMg * 10) / 10,
          volumePorTomadaMl: volumeMl,
          tomadasDia: cfg.tomadasDia,
          intervaloHoras: cfg.intervaloHoras,
          diasTratamento: cfg.diasTratamento,
          volumeTotalTratamentoMl: Math.round(volumeTotalTratamentoMl * 10) / 10,
          volumeFrascoMl: cfg.volumeFrascoMl,
          frascosNecessarios: frascos,
          quantidadeDispensar: frascos + ' frasco(s) de ' + cfg.volumeFrascoMl + ' mL',
          instrucaoPosologica: 'Tomar ' + fmtMl(volumeMl) + ' mL por via oral a cada ' + cfg.intervaloHoras + ' horas' + sugestaoHorario + ' durante ' + cfg.diasTratamento + ' dias.',
          memoriaCalculo: 'Dose base: ' + cfg.doseMgKgDia + ' mg/kg/dia × ' + peso + ' kg = ' + fmt(doseDiariaBrutaMg, 1) + ' mg/dia (máx ' + cfg.doseMaximaAdultoMgDia + ' mg/dia) ➔ ' + fmt(dosePorTomadaMg, 1) + ' mg por dose (' + cfg.intervaloHoras + '/' + cfg.intervaloHoras + 'h' + sugestaoHorario + ') ➔ Conversão: ' + fmt(dosePorTomadaMg, 1) + ' mg ÷ ' + cfg.concentracaoMgPorMl + ' mg/mL = ' + fmtMl(volumeMl) + ' mL. Volume total: ' + fmtMl(volumeMl) + ' mL × ' + cfg.tomadasDia + ' tomadas × ' + cfg.diasTratamento + ' dias = ' + fmt(volumeTotalTratamentoMl, 1) + ' mL ➔ ' + frascos + ' frasco(s) de ' + cfg.volumeFrascoMl + ' mL.',
          orientacoes: cfg.instrucoes,
          indicacao: cfg.indicacao
        };
      }

      dadosCalculados.idadeAnos = idade;
      if (peso !== null && peso > 50 && cfg.tipo !== 'gotas' && cfg.tipo !== 'dose_fixa_idade') {
        dadosCalculados.orientacoes = '⚠️ PESO ELEVADO / ADOLESCENTE (> 50 kg): Dose calculada limitada pelo teto máximo seguro de adulto (' + cfg.doseMaximaAdultoMgDia + ' mg/dia) para prevenir sobredose. ' + (dadosCalculados.orientacoes || '');
      }
      if (chaveAlvo === 'dipirona' && ((peso !== null && peso < 5.0) || (idade !== null && idade < 0.25))) {
        dadosCalculados.orientacoes = '⚠️ CONTRAINDICAÇÃO: Dipirona é formalmente contraindicada em menores de 3 meses ou < 5 kg (risco de choque anafilactoide e hipotermia grave). ' + (dadosCalculados.orientacoes || '');
      }
      if (chaveAlvo === 'ibuprofeno' && ((peso !== null && peso < 5.0) || (idade !== null && idade < 0.5))) {
        dadosCalculados.orientacoes = '⚠️ CONTRAINDICAÇÃO: Ibuprofeno oral é formalmente contraindicado em menores de 6 meses (risco aumentado de lesão renal aguda e sangramento gastrointestinal). ' + (dadosCalculados.orientacoes || '');
      }

      var linhasResultado = [
        '<b>Fármaco:</b> ' + dadosCalculados.farmaco,
        '<b>Apresentação (REMUME/HSL):</b> ' + dadosCalculados.apresentacao,
        '<b>Peso do Paciente:</b> ' + (peso === null ? 'Não informado (não utilizado neste cálculo)' : fmt(peso, 1) + ' kg'),
        '<b>Esquema calculado para revisão:</b> ' + dadosCalculados.instrucaoPosologica,
        '<b>Quantidade a Dispensar:</b> ' + dadosCalculados.quantidadeDispensar,
        '',
        '<b>Memória de Cálculo (Determinística · Revisão clínica necessária):</b>',
        dadosCalculados.memoriaCalculo,
        '',
        '<b>Orientações Clínicas:</b> ' + dadosCalculados.orientacoes
      ];

      return {
        ok: true,
        id: ID,
        nome: NOME,
        estado: ESTADOS.CALCULO.texto,
        icone: ESTADOS.CALCULO.icone,
        dados: dadosCalculados,
        textoFormatado: '👶 <b>CÁLCULO POSOLÓGICO PEDIÁTRICO DETERMINÍSTICO (FÓRMULA FIXA)</b>\n\n' + linhasResultado.join('\n'),
        botoes: [
          [btn('💊 Gerar Receita no /rx', 'rx', 'prescrever'), btn('↩️ Outro cálculo', ID, 'voltar')]
        ],
        versao: VERSAO
      };
    });
  }

  /**
   * Extrai parâmetros e executa o cálculo determinístico direto a partir de texto livre.
   */
  function calcularPosologiaPorTextoLivre(texto) {
    if (!texto || typeof texto !== 'string') return null;
    var farmaco = identificarFarmacoPosologico(texto);
    if (!farmaco) return null;
    // Múltiplos valores (inclusive correções) precisam de reconciliação clínica.
    var pesos = Array.from(texto.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:kg|quilos?)\b/gi));
    var idades = Array.from(texto.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:anos?|meses|mes)\b/gi));
    if (pesos.length > 1 || idades.length > 1) return null;
    var peso = pesos.length ? Number(pesos[0][1].replace(',', '.')) : null;
    var idade = idades.length ? Number(idades[0][1].replace(',', '.')) : null;
    if (idades.length && /mes/i.test(idades[0][0])) idade /= 12;
    // Contextos de contraindicação ou dose individualizada não recebem esquema fixo.
    if (/\b(?:alerg\w*|nao|evitar|suspender|renal|hepat\w*|gestante|gestacao|dose alta)\b/.test(semAcento(texto))) return null;
    var res = posologiaPediatrica(peso, farmaco, { idadeAnos: idade });
    return res && res.ok && res.dados ? res.dados : null;
  }

  /**
   * Tabela canônica de ajuste renal de antimicrobianos hospitalares críticos (Guia HSL / Sanford / UpToDate).
   */
  function ajusteRenalAntimicrobiano(droga, clcr, hemodialise) {
    var ID = 'ajuste_renal', NOME = 'Ajuste Renal de Antimicrobianos';
    return seguro(ID, NOME, function () {
      var c = novoCtx();
      var dStr = String(droga || '').toLowerCase().trim();
      var crClVal = null;
      if (!ausente(clcr)) crClVal = num(c, clcr, 'Clearance de Creatinina (mL/min)', 0, 350);
      var hd = false;
      if (!ausente(hemodialise)) hd = bool(c, hemodialise, 'Hemodiálise intermitente');
      var atb = null;
      if (/vanco/i.test(dStr)) atb = 'vancomicina';
      else if (/mero/i.test(dStr)) atb = 'meropenem';
      else if (/pip|tazo/i.test(dStr)) atb = 'piperacilina_tazobactam';
      else if (/cefepim/i.test(dStr)) atb = 'cefepime';
      else if (/ceftriax/i.test(dStr)) atb = 'ceftriaxona';
      else if (/cipro/i.test(dStr)) atb = 'ciprofloxacino';
      else if (/polimixina|polimix/i.test(dStr)) atb = 'polimixina_b';
      else if (/fluconazol/i.test(dStr)) atb = 'fluconazol';

      if (pendente(c)) return falhaCtx(ID, NOME, c);
      if (crClVal === null && !hd && atb !== 'ceftriaxona' && atb !== 'polimixina_b') {
        c.faltas.push('Informe o Clearance de Creatinina (mL/min) ou declare se está em Hemodiálise');
        return falhaCtx(ID, NOME, c);
      }

      if (!atb) {
        return {
          ok: false,
          mensagem: 'Antimicrobiano não encontrado. Disponíveis: Vancomicina, Meropenem, Piperacilina-Tazobactam, Cefepime, Ceftriaxona, Ciprofloxacino, Polimixina B, Fluconazol.'
        };
      }

      var res = {
        farmaco: atb,
        nomeExibicao: '',
        dosePadrao: '',
        doseAjustada: '',
        cuidados: '',
        monitorizacao: '',
        clcrInformado: crClVal,
        hemodialise: hd
      };

      if (atb === 'vancomicina') {
        res.nomeExibicao = 'Vancomicina';
        res.dosePadrao = 'Ataque: 25-30 mg/kg (máx 2g). Manutenção: 15-20 mg/kg a cada 8-12h.';
        if (hd) {
          res.doseAjustada = 'Ataque 25-30 mg/kg; redoses subsequentes (500-1000 mg) pós-hemodiálise guiadas por nível sérico.';
        } else if (crClVal >= 90) {
          res.doseAjustada = '15-20 mg/kg EV a cada 8-12h (em infusão lenta de pelo menos 1-2h).';
        } else if (crClVal >= 50) {
          res.doseAjustada = '15-20 mg/kg EV a cada 12h.';
        } else if (crClVal >= 20) {
          res.doseAjustada = '15 mg/kg EV a cada 24h.';
        } else {
          res.doseAjustada = 'Dose de ataque 25 mg/kg; redoses (a cada 48 a 96h) guiadas por nível sérico pré-dose (alvo vale 15-20 mcg/mL).';
        }
        res.cuidados = 'Infusão lenta (máx 10 mg/min ou 1g em 60 min) para prevenir síndrome do homem vermelho. Hidratação adequada.';
        res.monitorizacao = 'Nível de vale sérico pré-4ª dose (alvo: 15-20 mcg/mL para infecções graves ou AUC/MIC 400-600). Creatinina a cada 48h.';
      } else if (atb === 'meropenem') {
        res.nomeExibicao = 'Meropenem';
        res.dosePadrao = '1g EV a cada 8h (2g 8/8h em meningite ou sepse grave).';
        if (hd) {
          res.doseAjustada = '500 mg EV a cada 24h, administrado imediatamente APÓS a hemodiálise nos dias de sessão.';
        } else if (crClVal > 50) {
          res.doseAjustada = '1g EV a cada 8h (recomenda-se infusão estendida em 3 horas para otimização PK/PD).';
        } else if (crClVal >= 26) {
          res.doseAjustada = '1g EV a cada 12h (infusão estendida em 3 horas).';
        } else if (crClVal >= 10) {
          res.doseAjustada = '500 mg EV a cada 12h.';
        } else {
          res.doseAjustada = '500 mg EV a cada 24h.';
        }
        res.cuidados = 'Compatível com infusão estendida (3 horas) para maximizar tempo acima da MIC (T > MIC).';
        res.monitorizacao = 'Função renal e vigilância de crises convulsivas em doses elevadas com disfunção renal.';
      } else if (atb === 'piperacilina_tazobactam') {
        res.nomeExibicao = 'Piperacilina + Tazobactam (Pip-Tazo)';
        res.dosePadrao = '4,5g EV a cada 6h (infusão de 3-4h) ou 4,5g a cada 8h (infusão de 4h).';
        if (hd) {
          res.doseAjustada = '2,25g EV a cada 8h + dose de reforço de 0,75g após cada sessão de hemodiálise.';
        } else if (crClVal > 40) {
          res.doseAjustada = '4,5g EV a cada 6h (ou 4,5g 8/8h em infusão estendida de 3-4h).';
        } else if (crClVal >= 20) {
          res.doseAjustada = '2,25g EV a cada 6h (ou 3,375g EV a cada 8h).';
        } else {
          res.doseAjustada = '2,25g EV a cada 8h.';
        }
        res.cuidados = 'Evitar associação com Vancomicina além de 48-72h se houver alternativa, pelo risco de IRA sinérgica.';
        res.monitorizacao = 'Creatinina sérica diária; eletrólitos (contém 2,79 mEq de Na+ por grama de piperacilina).';
      } else if (atb === 'cefepime') {
        res.nomeExibicao = 'Cefepime';
        res.dosePadrao = '2g EV a cada 8h (infusão em 30 min ou estendida em 3h).';
        if (hd) {
          res.doseAjustada = '1g EV dose de ataque no D1; depois 500 mg a 1g EV a cada 24h (administrar dose após a hemodiálise nos dias de sessão).';
        } else if (crClVal >= 60) {
          res.doseAjustada = '2g EV a cada 8h.';
        } else if (crClVal >= 30) {
          res.doseAjustada = '2g EV a cada 12h.';
        } else if (crClVal >= 11) {
          res.doseAjustada = '2g EV a cada 24h.';
        } else {
          res.doseAjustada = '1g EV a cada 24h.';
        }
        res.cuidados = '⚠️ RISCO CRÍTICO DE ENCEFALOPATIA POR CEFEPIME: se CrCl reduzido sem ajuste, causa rebaixamento, confusão e mioclonias.';
        res.monitorizacao = 'Exame neurológico diário e função renal.';
      } else if (atb === 'ceftriaxona') {
        res.nomeExibicao = 'Ceftriaxona';
        res.dosePadrao = '1g a 2g EV a cada 24h (2g 12/12h em meningite bacteriana).';
        res.doseAjustada = 'NÃO REQUER AJUSTE RENAL. Manter 1g a 2g EV a cada 24h (eliminação mista renal 60% e biliar 40%).';
        res.cuidados = 'Não infundir simultaneamente com soluções que contenham cálcio (como Ringer Lactato) na mesma via pelo risco de precipitação.';
        res.monitorizacao = 'Transaminases e bilirrubinas se uso prolongado.';
      } else if (atb === 'ciprofloxacino') {
        res.nomeExibicao = 'Ciprofloxacino';
        res.dosePadrao = '400 mg EV a cada 12h ou 500-750 mg VO a cada 12h.';
        if (hd) {
          res.doseAjustada = '400 mg EV a cada 24h ou 500 mg VO a cada 24h (administrar após diálise).';
        } else if (crClVal > 50) {
          res.doseAjustada = '400 mg EV 12/12h ou 500 mg VO 12/12h.';
        } else if (crClVal >= 30) {
          res.doseAjustada = '400 mg EV 12/12h ou 500 mg VO 12/12h (monitorar se terapia prolongada).';
        } else {
          res.doseAjustada = '400 mg EV a cada 24h ou 500 mg VO a cada 24h.';
        }
        res.cuidados = 'Prolongamento do intervalo QTc; evitar quelantes orais (cálcio, ferro, antiácidos) se via oral.';
        res.monitorizacao = 'ECG se associado a outras drogas que prolongam QT; função renal.';
      } else if (atb === 'polimixina_b') {
        res.nomeExibicao = 'Polimixina B';
        res.dosePadrao = 'Ataque: 20.000 a 25.000 UI/kg (baseado no peso magro). Manutenção: 15.000 a 25.000 UI/kg/dia divididos em 2 doses (12/12h).';
        res.doseAjustada = 'NÃO REDUZIR DOSE NA INSUFICIÊNCIA RENAL. A depuração da Polimixina B é predominantemente não-renal. Reduções causam subdosagem e falha terapêutica grave.';
        res.cuidados = 'Diferente da Colistina (que requer ajuste renal rígido), a Polimixina B mantém dose plena com suporte e vigilância de IRA.';
        res.monitorizacao = 'Creatinina sérica a cada 24-48h; bloqueio neuromuscular / parestesias.';
      } else if (atb === 'fluconazol') {
        res.nomeExibicao = 'Fluconazol';
        res.dosePadrao = 'Ataque: 400-800 mg dose única. Manutenção: 200-400 mg EV/VO a cada 24h.';
        if (hd) {
          res.doseAjustada = '100% da dose recomendada administrada imediatamente APÓS cada sessão de hemodiálise.';
        } else if (crClVal > 50) {
          res.doseAjustada = 'Manter 100% da dose recomendada (200-400 mg a cada 24h).';
        } else {
          res.doseAjustada = 'Dose de ataque plena no D1; a partir de então, REDUZIR PARA 50% DA DOSE (100-200 mg a cada 24h).';
        }
        res.cuidados = 'Potente inibidor de CYP3A4; verificar interações com imunossupressores e anticoagulantes orais.';
        res.monitorizacao = 'Enzimas hepáticas (TGO/TGP) e eletrólitos.';
      }

      if (crClVal !== null && crClVal > 130) {
        res.cuidados += ' ⚠️ CLEARANCE AUMENTADO (ARC > 130 mL/min): Risco de subdosagem e falha terapêutica. Considerar infusão estendida/contínua e monitorar resposta clínica.';
      }

      var linhas = [
        '<b>Fármaco:</b> ' + res.nomeExibicao,
        '<b>Dose Padrão (CrCl Normal):</b> ' + res.dosePadrao,
        '<b>Dose Ajustada para o Paciente:</b> <code>' + res.doseAjustada + '</code>',
        '<b>Condições Informadas:</b> ' + (hd ? 'Em Hemodiálise' : ('CrCl ' + (crClVal !== null ? crClVal + ' mL/min' : 'não informado'))),
        '<b>Orientações e Cuidados Farmacológicos:</b> ' + res.cuidados,
        '<b>Monitorização de Segurança:</b> ' + res.monitorizacao
      ];

      return {
        ok: true,
        icone: '💉',
        dados: res,
        textoFormatado: '💉 <b>AJUSTE RENAL DE ANTIMICROBIANOS (GUIA HSL / IDSA)</b>\n\n' + linhas.join('\n\n'),
        versao: VERSAO
      };
    });
  }

  /**
   * Extrai parâmetros e executa o cálculo determinístico de ajuste renal a partir de texto livre.
   */
  function calcularAjusteRenalPorTextoLivre(texto) {
    if (!texto || typeof texto !== 'string') return null;
    var dStr = String(texto).toLowerCase();
    var atb = null;
    if (/vanco/i.test(dStr)) atb = 'vancomicina';
    else if (/mero/i.test(dStr)) atb = 'meropenem';
    else if (/pip|tazo/i.test(dStr)) atb = 'piperacilina_tazobactam';
    else if (/cefepim/i.test(dStr)) atb = 'cefepime';
    else if (/ceftriax/i.test(dStr)) atb = 'ceftriaxona';
    else if (/cipro/i.test(dStr)) atb = 'ciprofloxacino';
    else if (/polimixina|polimix/i.test(dStr)) atb = 'polimixina_b';
    else if (/fluconazol/i.test(dStr)) atb = 'fluconazol';
    if (!atb) return null;

    var ehHD = /\b(?:hd|hemodialise|dialise)\b/i.test(dStr);
    var clcrVal = null;
    var clcrMatch = dStr.match(/\b(?:clcr|crcl|tfg|clearance)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i);
    if (clcrMatch && clcrMatch[1]) {
      clcrVal = Number(clcrMatch[1].replace(',', '.'));
    } else {
      var nums = dStr.match(/\b(\d{1,3})\b/g);
      if (nums && nums.length > 0) {
        clcrVal = Number(nums[0]);
      }
    }
    var res = ajusteRenalAntimicrobiano(atb, clcrVal, ehHD);
    return res && res.ok ? res : null;
  }

  // ═════════════════════════════ AUTOTESTE ═════════════════════════════

  function autoTeste() {
    var f = [];
    function ok(cond, msg) { if (!cond) f.push(msg); }
    var API = publico;
    var r;
    r = API.ckdEpi2021(1.0, 60, false); ok(r.ok && Math.abs(r.dados.tfg - 86.2) < 2.0, 'CKD-EPI homem 60a Cr1,0');
    r = API.schwartzPediatrico(0.8, 120); ok(r.ok && Math.abs(r.dados.clearance - 61.9) < 1.0, 'Schwartz Pediátrico Cr0.8 Alt120');
    r = API.ckdEpi2021(0, 60, false);   ok(!r.ok, 'CKD-EPI Cr=0 deve falhar');
    r = API.cockcroftGault(1.0, 70, 60, false); ok(r.ok && Math.abs(r.dados.clearance - 77.8) < 1.0, 'CG base');
    r = API.cockcroftGault(1.0, 120, 50, false, 170); ok(r.ok && r.dados.tipoPeso.indexOf('ajustado') === 0, 'CG peso ajustado em obeso');
    r = API.wellsTEP(false, true, true, false, false, false, false); ok(r.ok && r.dados.pontos === 4.5 && r.dados.provavel === true, 'Wells 4,5 provável');
    r = API.wellsTEP(false, false, true, true, false, false, false); ok(r.ok && r.dados.pontos === 3 && r.dados.provavel === false, 'Wells 3,0 improvável');
    r = API.wellsTEP('talvez', false, false, false, false, false, false); ok(!r.ok, 'Wells entrada inválida');
    r = API.curb65(true, 60, 32, 85, 50, 71); ok(r.ok && r.dados.pontos === 5, 'CURB-65 máx');
    r = API.curb65(false, 'abc', 20, 120, 80, 40); ok(!r.ok, 'CURB-65 ureia textual');
    r = API.cha2ds2va(false, true, false, false, false, false, true); ok(r.ok && r.dados.pontos === 2, 'CHA2DS2-VA 2');
    r = API.cha2ds2va(false, false, true, false, false, false, true); ok(!r.ok, 'CHA2DS2-VA idades conflitantes');
    r = API.gasometria(7.10, 24, 8, 140, 105, 4, 80, 0); ok(!r.ok, 'FiO2=0 rejeitado');
    r = API.gasometria(7.30, 29, 14, 140, 100, 4, 60, 40); ok(r.ok && /adequada/i.test(r.texto), 'Winter na borda');
    r = API.drogasVasoativas('noradrenalina', 70, 'padrao'); ok(r.ok && /6,6 mL\/h/.test(r.texto), 'Nora 70 kg 0,1 = 6,6 mL/h');
    r = API.drogasVasoativas('noradrenalina', 0, 'padrao'); ok(!r.ok, 'Nora peso 0');
    r = API.deficitAguaLivre(160, 140, 70, 'homem'); ok(r.ok && Math.abs(r.dados.deficitL - 6.0) < 0.2, 'Déficit 6,0 L');
    r = API.sequenciaRapidaIntubacao(70, 'padrao'); ok(r.ok && r.dados.etomidato.ml === 10.5, 'SRI etomidato 10.5 mL');
    r = API.glasgowP(4, 5, 6, 2); ok(r.ok && r.dados.gcsP === 13, 'GCS-P 13');
    r = API.calcioCorrigido(7.5, 2.5); ok(r.ok && r.dados.calcioCorrigido === 8.7, 'Cálcio corrigido Payne');
    r = API.gapOsmolar(315, 140, 90, 30); ok(r.ok && r.dados.gapOsmolar > 15, 'Gap osmolar elevado');
    r = API.estadiamentoKDIGO(2.5, 1.0, null, null); ok(r.ok && r.dados.estagio === 2, 'KDIGO estagio 2');
    r = API.posologiaPediatrica(16, 'amoxicilina'); ok(r.ok && r.dados.volumePorTomadaMl === 5.3 && r.dados.frascosNecessarios === 2, 'Amoxi 16 kg 5.3 mL');
    r = API.posologiaPediatrica(15, 'azitromicina'); ok(r.ok && r.dados.volumePorTomadaMl === 3.8, 'Azitro 15 kg 3.8 mL');
    r = API.posologiaPediatrica(16, 'dipirona'); ok(r.ok && r.dados.gotasPorTomada === 8, 'Dipirona 16 kg 8 gotas');
    r = API.posologiaPediatrica(14, 'paracetamol'); ok(r.ok && r.dados.gotasPorTomada === 14, 'Paracetamol 14 kg 14 gotas');
    r = API.calcularPosologiaPorTextoLivre('amigdalite crianca 16kg'); ok(r === null, 'Diagnóstico não elege antibiótico');
    r = API.ajusteRenalAntimicrobiano('meropenem', 20); ok(r.ok && r.dados.doseAjustada.indexOf('500 mg') !== -1, 'Meropenem CrCl 20 500mg');
    r = API.ajusteRenalAntimicrobiano('ceftriaxona', 15); ok(r.ok && /NÃO REQUER AJUSTE/.test(r.dados.doseAjustada), 'Ceftriaxona sem ajuste renal');
    r = API.ajusteRenalAntimicrobiano('vancomicina', 40); ok(r.ok && /24h/.test(r.dados.doseAjustada), 'Vancomicina CrCl 40 24h');
    r = API.ajusteRenalAntimicrobiano('polimixina b', 10); ok(r.ok && /NÃO REDUZIR DOSE/.test(r.dados.doseAjustada), 'Polimixina B sem redução');
    r = API.calcularAjusteRenalPorTextoLivre('ajuste meropenem clcr 25'); ok(r && r.ok && r.dados.doseAjustada.indexOf('12h') !== -1, 'Ajuste livre Meropenem CrCl 25');
    r = API.processarAcao(null, 'curb65', 'criterios'); ok(r.ok && /CURB-65/.test(r.textoFormatado), 'processarAcao curb65 criterios');
    return f;
  }

  function processarAcao(chatId, id, acao, args) {
    id = String(id || '').toLowerCase();
    acao = String(acao || '').toLowerCase();
    var titulo = '';
    var linhas = [];
    var botoes = null;

    if (acao === 'criterios') {
      if (id === 'curb65') {
        titulo = '📚 CRITÉRIOS · CURB-65';
        linhas = [
          'Escore prognóstico de mortalidade em PAC (Pneumonia Adquirida na Comunidade):',
          '• <b>C</b>onfusão mental (AMTS ≤ 8 ou desorientação tempo/espaço) = 1 pt',
          '• <b>U</b>reia > 50 mg/dL (BUN > 19 mg/dL) = 1 pt',
          '• <b>R</b>espiratória (FR ≥ 30 irpm) = 1 pt',
          '• <b>B</b>lood Pressure (PAS < 90 mmHg ou PAD ≤ 60 mmHg) = 1 pt',
          '• <b>65</b> Idade ≥ 65 anos = 1 pt',
          '',
          '<b>Interpretação e Conduta:</b>',
          '• 0–1 pt: Baixo risco (mortalidade < 3%). Tratamento ambulatorial seguro.',
          '• 2 pts: Risco intermediário (mortalidade ~9%). Considerar internação em enfermaria.',
          '• ≥ 3 pts: Alto risco (mortalidade 15–40%). Internação hospitalar obrigatória; ≥ 4 avaliar UTI.',
          '',
          '<i>Fonte: Lim WS et al. Thorax 2003 / Diretriz SBPT 2018.</i>'
        ];
      } else if (id === 'wells_tep') {
        titulo = '📚 CRITÉRIOS · Wells para TEP';
        linhas = [
          'Escore preditivo para Tromboembolismo Pulmonar:',
          '• Sinais/sintomas clínicos de TVP (+3,0 pts)',
          '• Diagnóstico alternativo menos provável que TEP (+3,0 pts)',
          '• Frequência cardíaca > 100 bpm (+1,5 pts)',
          '• Imobilização ≥ 3 dias ou cirurgia prévia nas últimas 4 semanas (+1,5 pts)',
          '• História prévia documentada de TVP ou TEP (+1,5 pts)',
          '• Hemoptise (+1,0 pt)',
          '• Neoplasia ativa em tratamento ou paliativo (+1,0 pt)',
          '',
          '<b>Interpretação (Modelo Dicotômico ESC 2019):</b>',
          '• ≤ 4,0 pts: TEP Improvável. Solicitar D-Dímero de alta sensibilidade para exclusão.',
          '• > 4,0 pts: TEP Provável. Não aguardar D-Dímero; indicar Angiotomografia de Tórax imediata.',
          '',
          '<i>Fonte: Wells PS et al. Thromb Haemost 2000 / ESC Guidelines 2019.</i>'
        ];
      } else if (id === 'hasbled') {
        titulo = '📚 CRITÉRIOS · HAS-BLED';
        linhas = [
          'Escore de Risco Hemorrágico em Fibrilação Atrial:',
          '• <b>H</b>ipertensão (PAS > 160 mmHg não controlada) = 1 pt',
          '• <b>A</b>bnormal Renal ou Hepático (1 pt cada, máx 2)',
          '• <b>S</b>troke (história prévia de AVC) = 1 pt',
          '• <b>B</b>leeding (história de sangramento maior ou predisposição) = 1 pt',
          '• <b>L</b>ábil INR (tempo na faixa terapêutica < 60%) = 1 pt',
          '• <b>E</b>lderly (Idade > 65 anos) = 1 pt',
          '• <b>D</b>rogas ou Álcool (AINEs/antiagregantes ou etilismo, 1 pt cada, máx 2)',
          '',
          '<b>Interpretação:</b>',
          '• ≥ 3 pts: Alto risco de sangramento. <b>Atenção:</b> HAS-BLED elevado NÃO contraindica anticoagulação; sinaliza necessidade de vigilância intensiva e correção de fatores modificáveis.',
          '',
          '<i>Fonte: Pisters R et al. Chest 2010 / SBC Diretriz de FA 2025.</i>'
        ];
      } else if (id === 'cha2ds2va') {
        titulo = '📚 CRITÉRIOS · CHA₂DS₂-VA (ESC 2024 / SBC 2025)';
        linhas = [
          'Prevenção de AVC na Fibrilação Atrial (escala 0–8):',
          '• <b>C</b> Insuficiência Cardíaca congestiva / disfunção VE = 1 pt',
          '• <b>H</b> Hipertensão arterial sistêmica = 1 pt',
          '• <b>A₂</b> Idade ≥ 75 anos = 2 pts',
          '• <b>D</b> Diabetes Mellitus = 1 pt',
          '• <b>S₂</b> AVC / AIT / Tromboembolismo prévio = 2 pts',
          '• <b>V</b> Doença Vascular (IAM prévio, DAP, placa aórtica) = 1 pt',
          '• <b>A</b> Idade 65–74 anos = 1 pt',
          '*(Critério sexo feminino retirado das diretrizes ESC 2024 e SBC 2025)*',
          '',
          '<b>Conduta:</b>',
          '• 0 pt: Sem terapia antitrombótica.',
          '• 1 pt: Anticoagulação deve ser considerada (classe IIa).',
          '• ≥ 2 pts: Anticoagulação oral recomendada (classe I) — preferencialmente DOACs.',
          '',
          '<i>Fonte: ESC Guidelines AF 2024 / Diretriz SBC 2025.</i>'
        ];
      } else if (id === 'kdigo_ira') {
        titulo = '📚 CRITÉRIOS · KDIGO para Injúria Renal Aguda';
        linhas = [
          'Estadiamento de IRA baseado em Creatinina e Débito Urinário:',
          '• <b>Estágio 1:</b> Cr 1,5–1,9× o basal OU aumento ≥ 0,3 mg/dL em 48h; DU < 0,5 mL/kg/h por 6–12h.',
          '• <b>Estágio 2:</b> Cr 2,0–2,9× o basal; DU < 0,5 mL/kg/h por ≥ 12h.',
          '• <b>Estágio 3:</b> Cr 3,0× o basal OU Cr ≥ 4,0 mg/dL com aumento agudo ≥ 0,5 mg/dL OU início de TRS; DU < 0,3 mL/kg/h por ≥ 24h ou anúria por ≥ 12h.',
          '',
          '<i>Fonte: KDIGO AKI Guidelines 2012.</i>'
        ];
      } else {
        titulo = '📚 CRITÉRIOS · ' + id.toUpperCase();
        linhas = [
          'Critérios validados de acordo com a literatura médica de referência.',
          'Utilize a calculadora fornecendo os dados clínicos correspondentes.'
        ];
      }
    } else if (acao === 'ajuste' || acao === 'medicamento') {
      titulo = '💊 REVISÃO DE AJUSTE RENAL DE FÁRMACOS';
      linhas = [
        'Ajuste posológico conforme estimativa da função renal:',
        '• Utilize <b>Cockcroft-Gault</b> com peso ajustado (Devine) para antibióticos, quimioterápicos e bulas de DOACs.',
        '• Utilize <b>CKD-EPI 2021</b> para estadiamento crônico de DRC e prognóstico.',
        '',
        '<b>Para revisar um medicamento específico:</b>',
        'Envie: <code>/rx &lt;medicamento&gt; ClCr &lt;valor&gt;</code> ou <code>/rx &lt;medicamento&gt; DRC estádio &lt;G3a-G5&gt;</code>',
        '',
        '⚠️ <i>Nenhuma dose foi alterada automaticamente. Confirme sempre na bula do medicamento e no protocolo institucional.</i>'
      ];
    } else if (acao === 'anticoag') {
      titulo = '🩸 CONDUTA EM ANTICOAGULAÇÃO (FA)';
      linhas = [
        'Recomendações da Diretriz Brasileira de FA (2025) e ESC (2024):',
        '• <b>DOACs como 1ª linha:</b> Apixabana, Rivaroxabana, Dabigatrana ou Edoxabana (preferíveis à Varfarina na ausência de prótese valvar mecânica ou estenose mitral moderada/grave).',
        '• <b>Critérios de Dose Reduzida (Apixabana):</b> Se 2 de 3: Idade ≥ 80a, Peso ≤ 60kg, Cr ≥ 1,5 mg/dL ➔ reduzir para 2,5 mg 12/12h.',
        '• <b>Rivaroxabana:</b> ClCr 15–49 mL/min ➔ reduzir de 20 mg/dia para 15 mg/dia.',
        '',
        'Calcule também o risco hemorrágico com HAS-BLED para acompanhamento seguro.'
      ];
    } else if (acao === 'checklist') {
      titulo = '✅ CHECKLIST DOS 7 Ps · SRI / IOT';
      linhas = [
        'Sequência cronológica para intubação em via aérea de emergência:',
        '1. <b>Planejamento e Preparação (T-10 min):</b> Monitorização contínua, acesso venoso pérvio, laringo/videolaringo testado, tubos com guia, aspiração montada, drogas aspiradas e rotuladas, material de resgate (Bougie, Máscara Laríngea).',
        '2. <b>Pré-oxigenação (T-5 min):</b> FiO₂ 100% sob máscara com reservatório a 15 L/min por 3–5 min ou 8 incursões vitais profundas. Elevar cabeceira 20–30° (rampa se obeso).',
        '3. <b>Pré-tratamento / Otimização (T-3 min):</b> Ressuscitação hemodinâmica antes da indução (cristaloide ou noradrenalina em push-dose se PAM baixa). Fentanil se trauma de crânio ou dissecção de aorta.',
        '4. <b>Paralisia com Indução Simultânea (T-0):</b> Administrar indutor (ex: Etomidato 0,3 mg/kg ou Cetamina 1,5–2 mg/kg) seguido imediatamente de bloqueador neuromuscular (ex: Rocurônio 1,2 mg/kg ou Succinilcolina 1,5 mg/kg) em bolus EV rápido.',
        '5. <b>Posicionamento e Proteção (T+45s):</b> Aguardar 45–60s para relaxamento total. Alinhamento dos eixos (posição de olfacionista).',
        '6. <b>Passagem do Tubo com Confirmação (T+60s):</b> Laringoscopia, visualização das cordas vocais, introdução do TOT, insuflação do cuff. Confirmação imediata: capnografia em onda (padrão-ouro) + ausculta epigástrica e pulmonar bilateral.',
        '7. <b>Pós-intubação:</b> Fixação rígida do TOT, radiografia de tórax de controle, sedoanalgesia contínua iniciada de imediato (ex: Fentanil + Midazolam/Propofol) e acoplamento em ventilação mecânica protetora.'
      ];
      botoes = [[btn('🔙 Voltar à Dose SRI', 'ux', 'srimenu'), btn('🔙 Sala Vermelha', 'ux', 'sala')], [btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'vad') {
      titulo = '🫁 AVALIAÇÃO DE VIA AÉREA DIFÍCIL (LEMON)';
      linhas = [
        'Mnemônico LEMON para predição de laringoscopia difícil:',
        '• <b>L (Look externally):</b> Micrognatia, retrognatia, trauma facial, pescoço curto/espesso, barba densa, obesidade mórbida.',
        '• <b>E (Evaluate 3-3-2):</b> Abertura bucal < 3 dedos, distância mento-hioide < 3 dedos, distância tireo-hioide < 2 dedos.',
        '• <b>M (Mallampati):</b> Classes III (apenas base da úvula visível) e IV (apenas palato duro).',
        '• <b>O (Obstruction):</b> Estridor, hematoma cervical, abscesso periamigdaliano, neoplasia de via aérea.',
        '• <b>N (Neck mobility):</b> Limitação de extensão cervical (colar cervical rígido, espondilite anquilosante).',
        '',
        '⚠️ <b>Regra de Ouro da Sala Vermelha:</b>',
        'Se suspeita de via aérea difícil: convoque ajuda sênior, prepare o <b>Bougie</b> desde a primeira tentativa, tenha <b>Máscara Laríngea</b> desembalada para resgate e kit de cricotireoidostomia cirúrgica à beira do leito.'
      ];
      botoes = [[btn('🔙 Voltar à Dose SRI', 'ux', 'srimenu'), btn('🔙 Sala Vermelha', 'ux', 'sala')], [btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'acidobase') {
      titulo = '🧪 FISIOLOGIA ÁCIDO-BASE · GASOMETRIA';
      linhas = [
        'Interpretação sistemática do equilíbrio ácido-base:',
        '1. <b>pH:</b> &lt; 7,35 (Acidemia) | &gt; 7,45 (Alcalemia).',
        '2. <b>Distúrbio Primário:</b> Olhar PaCO₂ e HCO₃⁻.',
        '3. <b>Compensação Respiratória (Winter na Acidose Metabólica):</b>',
        '   • PaCO₂ esperada = (1,5 × HCO₃⁻) + 8 ± 2',
        '   • Se PaCO₂ aferida &gt; esperada: Acidose Respiratória associada.',
        '   • Se PaCO₂ aferida &lt; esperada: Alcalose Respiratória associada.',
        '4. <b>Ânion Gap:</b> Na⁺ - (Cl⁻ + HCO₃⁻) [VR: 8–12 mEq/L]. Corrigir por albumina se &lt; 4,0 g/dL.',
        '5. <b>Razão Delta (ΔAG / ΔHCO₃):</b> (AG - 12) / (24 - HCO₃⁻).',
        '   • &lt; 0,4: Acidose hiperclorêmica pura (AG normal).',
        '   • 0,4–0,8: Acidose mista (AG elevado + hiperclorêmica).',
        '   • 0,8–2,0: Acidose metabólica pura com AG elevado.',
        '   • &gt; 2,0: Acidose com AG elevado associada a Alcalose Metabólica preexistente.'
      ];
      botoes = [[btn('🔙 Sala Vermelha', 'ux', 'sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'oxigenacao') {
      titulo = '🫁 OXIGENAÇÃO E CRITÉRIOS DE BERLIN (SDRA)';
      linhas = [
        'Classificação da SDRA pela relação PaO₂ / FiO₂ (com PEEP ≥ 5 cmH₂O):',
        '• <b>Leve:</b> 201 a 300 mmHg',
        '• <b>Moderada:</b> 101 a 200 mmHg',
        '• <b>Grave:</b> ≤ 100 mmHg',
        '',
        '<b>Pilares da Ventilação Protetora:</b>',
        '• Volume corrente: 4 a 6 mL/kg do Peso Ideal / Predito (Fórmula de Devine).',
        '• Pressão de platô ≤ 30 cmH₂O.',
        '• Driving Pressure (Pressão de Distensão = Platô - PEEP) ≤ 15 cmH₂O.',
        '• Posição Prona precoce por ≥ 16 horas contínuas se PaO₂/FiO₂ &lt; 150 mmHg.'
      ];
      botoes = [[btn('🔙 Sala Vermelha', 'ux', 'sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'dose' || acao === 'preparo') {
      titulo = '🧴 PREPARO E TITULAÇÃO DE VASOATIVOS';
      linhas = [
        '<b>Noradrenalina:</b>',
        '• Padrão: 4 ampolas (16 mg) + 234 mL SG 5% = 64 mcg/mL.',
        '• Concentrada (2x): 8 ampolas (32 mg) + 218 mL SG 5% = 128 mcg/mL.',
        '• Titulação: Iniciar a 0,05–0,1 mcg/kg/min; titular a cada 2–5 min buscando PAM ≥ 65 mmHg.',
        '',
        '<b>Vasopressina:</b>',
        '• Diluição: 1 ampola (20 UI) + 99 mL SG 5% ou SF 0,9% = 0,2 UI/mL.',
        '• Dose fixa: 0,03 UI/min (9 mL/h na bomba contínua). Não requer titulação rápida.',
        '• Associação: Iniciar quando noradrenalina atingir 0,25–0,5 mcg/kg/min no choque séptico (Surviving Sepsis Campaign).'
      ];
      botoes = [[btn('🔙 Voltar ao DVA', 'ux', 'dvamenu'), btn('🔙 Sala Vermelha', 'ux', 'sala')], [btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'editar' || acao === 'voltar' || acao === 'peso') {
      titulo = '✏️ REVISÃO DE PARÂMETROS';
      linhas = [
        'Para refazer este cálculo com novos valores clínicos, digite diretamente no chat os novos dados do paciente.',
        '💡 <i>Exemplos:</i>',
        '• Para DVA: <code>/dva nora 75 concentrada</code>',
        '• Para SRI: <code>/sri 82 choque</code>',
        '• Para Gaso: <code>/gaso pH 7.20, pCO2 24, HCO3 9, Na 138, Cl 102</code>',
        '• Para DRC: <code>/calc ckd_epi Cr 1.6, idade 72, feminino</code>'
      ];
      botoes = [[btn('🔙 Sala Vermelha', 'ux', 'sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else if (acao === 'pdf') {
      titulo = '📄 EXPORTAÇÃO E REGISTRO';
      linhas = [
        'Para arquivar este resultado clínico estruturado com data e hora oficiais no seu prontuário pessoal:',
        '• Utilize o botão <b>📁 Salvar no Notion Tasks</b> na mensagem de resumo.',
        '• Para gerar receituário oficial em PDF para medicamentos, utilize o comando <code>/rx</code>.'
      ];
      botoes = [[btn('🔙 Sala Vermelha', 'ux', 'sala'), btn('🏠 Início', 'ux', 'hub:inicio')]];
    } else {
      titulo = 'ℹ️ INFORMAÇÕES DA CALCULADORA (' + id.toUpperCase() + ')';
      linhas = [
        'Ação solicitada: ' + acao,
        'Módulo determinístico de apoio à decisão clínica validado (v3.0).'
      ];
    }

    var textoFormatado = '<b>' + titulo + '</b>\n\n' + linhas.join('\n');
    return {
      ok: true,
      id: id,
      acao: acao,
      textoFormatado: textoFormatado,
      botoes: botoes
    };
  }

  var publico = {
    versao: VERSAO,
    curb65: curb65,
    ckdEpi2021: ckdEpi2021,
    cockcroftGault: cockcroftGault,
    schwartzPediatrico: schwartzPediatrico,
    cha2ds2va: cha2ds2va,
    cha2ds2vasc: cha2ds2vasc,
    hasbled: hasbled,
    wellsTEP: wellsTEP,
    deficitAguaLivre: deficitAguaLivre,
    calcioCorrigido: calcioCorrigido,
    gapOsmolar: gapOsmolar,
    estadiamentoKDIGO: estadiamentoKDIGO,
    glasgowP: glasgowP,
    gasometria: gasometria,
    meld: meld,
    parkland: parkland,
    calcularParklandPorTextoLivre: calcularParklandPorTextoLivre,
    drogasVasoativas: drogasVasoativas,
    auditarInfusaoUti: function (p) {
      if (typeof CompatibilidadeYDvaService !== 'undefined') return CompatibilidadeYDvaService.auditarPrescricaoCombinada(p);
      if (typeof AuditoriaInfusaoUtiService !== 'undefined') return AuditoriaInfusaoUtiService.auditarVazaoBomba(p);
      throw new Error('Serviço de Auditoria de Infusão não carregado.');
    },
    calcularVazaoSeguraUti: function (p) {
      if (typeof AuditoriaInfusaoUtiService !== 'undefined') return AuditoriaInfusaoUtiService.calcularVazaoSegura(p);
      throw new Error('Serviço de Auditoria de Infusão não carregado.');
    },
    auditarPrescricaoMultiplaUti: function (p) {
      if (typeof CompatibilidadeYDvaService !== 'undefined') return CompatibilidadeYDvaService.auditarPrescricaoCombinada(p);
      if (typeof AuditoriaInfusaoUtiService !== 'undefined') return AuditoriaInfusaoUtiService.auditarPrescricaoMultipla(p);
      throw new Error('Serviço de Auditoria de Infusão não carregado.');
    },
    compatibilidadeYDva: function (drogaA, drogaB) {
      if (typeof CompatibilidadeYDvaService !== 'undefined') return CompatibilidadeYDvaService.checarCompatibilidadeY(drogaA, drogaB);
      throw new Error('Serviço de Compatibilidade em Y não carregado.');
    },
    formatarParecerCompatibilidadeY: function (drogaA, drogaB) {
      if (typeof CompatibilidadeYDvaService !== 'undefined') return CompatibilidadeYDvaService.formatarParecerCompatibilidadeY(drogaA, drogaB);
      throw new Error('Serviço de Compatibilidade em Y não carregado.');
    },
    gerarTabelaTitulacaoUti: function (d, p, s) {
      if (typeof AuditoriaInfusaoUtiService !== 'undefined') return AuditoriaInfusaoUtiService.gerarTabelaTitulacao(d, p, s);
      throw new Error('Serviço de Auditoria de Infusão não carregado.');
    },
    sequenciaRapidaIntubacao: sequenciaRapidaIntubacao,
    posologiaPediatrica: posologiaPediatrica,
    calcularPosologiaPorTextoLivre: calcularPosologiaPorTextoLivre,
    ajusteRenalAntimicrobiano: ajusteRenalAntimicrobiano,
    calcularAjusteRenalPorTextoLivre: calcularAjusteRenalPorTextoLivre,
    processarAcao: processarAcao,
    autoTeste: autoTeste
  };
  return publico;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalculadorasClinicas;
}
