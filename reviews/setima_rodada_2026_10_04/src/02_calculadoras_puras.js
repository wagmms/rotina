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
    return [linha1, [btn('📚 Ver critérios', id, 'criterios'), btn('📄 Gerar PDF', id, 'pdf')]];
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
      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: score + '/5 · mortalidade 30 d ' + mort + ' (grupo)',
        secoes: [['PONTUARAM', crit.length ? crit : ['Nenhum critério pontuou.']],
                 ['AÇÃO', acoes]],
        avisos: [(5 - score) + ' critérios negativos conferidos. O escore isolado não autoriza alta nem define UTI.'],
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
        avisos: ['Em lesão renal aguda, sarcopenia ou dieta atípica a eTFG pode ser imprecisa; considerar cistatina C (KDIGO 2024). Categoria de eTFG isolada não define DRC.'],
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
        botoes: botoesPadrao(ID, [btn('🫁 Avaliar via aérea', ID, 'via_aerea'), btn('✏️ Revisar exame', ID, 'editar')])
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
      var peso = num(c, pesoKg, 'Peso (kg)', 2, 350);
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
        return sucesso({
          id: ID, nome: NOME, estado: 'CALCULO', rotulo: 'SEM DÉFICIT PELA FÓRMULA',
          principal: '0,0 L',
          secoes: [['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg']]],
          avisos: ['Na atual não é maior que a referência: fórmula de hipernatremia não se aplica.'],
          dados: { deficitL: 0, actL: actL },
          legado: { deficitLitros: 0, aguaCorporalTotal: actL },
          botoes: [[btn('✏️ Revisar dados', ID, 'editar'), btn('📄 Gerar PDF', ID, 'pdf')]]
        });
      }
      return sucesso({
        id: ID, nome: NOME, estado: 'CALCULO', principal: fmt(def, 1) + ' L',
        secoes: [
          ['ENTRADAS', ['Na atual: ' + fmt(na, 0) + ' mEq/L', 'Na de referência: ' + fmt(alvo, 0) + ' mEq/L', 'Peso: ' + fmt(peso, 1) + ' kg',
                        'Perfil: ' + semAcento(perfil), 'Água corporal estimada: ' + fmt(act, 1) + ' L (fator ' + fmt(fator, 2) + ')']],
          ['AÇÃO', ['Usar como estimativa inicial de planejamento.', 'Reposição preferencialmente enteral/VO ou SG 5%; checar Na a cada 4–6 h.']]
        ],
        avisos: ['Estimativa: não inclui perdas contínuas nem a água de manutenção.', 'Limite de correção: no máximo 10 mEq/L em 24 h (menor em hipernatremia crônica).'],
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

      return sucesso({
        id: ID, nome: NOME, estado: estado, rotulo: rotulo,
        principal: fmt(caCorr, 1) + ' mg/dL',
        secoes: [
          ['ENTRADAS', ['Cálcio Total Medido: ' + fmt(ca, 1) + ' mg/dL', 'Albumina Sérica: ' + fmt(alb, 1) + ' g/dL']],
          ['CLASSIFICAÇÃO', [statusTexto]],
          ['AÇÃO', conduta]
        ],
        avisos: ['A fórmula de Payne é uma estimativa. Em UTI ou distúrbios críticos, o padrão-ouro é dosar o Cálcio Iônico diretamente.'],
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
        avisos: ['Um gap normal não exclui totalmente intoxicação em fases muito tardias de metabolização.'],
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
        avisos: ['KDIGO 2024: A classificação por débito urinário e creatinina tem implicações prognósticas diretas.'],
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
      var ph = num(c, phVal, 'pH', 6.5, 8.0);
      var pco2 = num(c, pco2Val, 'PaCO₂ (mmHg)', 5, 200);
      var hco3 = num(c, hco3Val, 'HCO₃⁻ (mEq/L)', 2, 70);
      var na = num(c, naVal, 'Na (mEq/L)', 100, 200, { opcional: true });
      var cl = num(c, clVal, 'Cl (mEq/L)', 60, 160, { opcional: true });
      var alb = num(c, albVal, 'Albumina (g/dL)', 0.5, 7, { opcional: true });
      var pao2 = num(c, pao2Val, 'PaO₂ (mmHg)', 10, 700, { opcional: true });
      var fio2raw = num(c, fio2Val, 'FiO₂ (0,21–1,0 ou 21–100%)', 0.21, 100, { opcional: true });
      if (pendente(c)) return falhaCtx(ID, NOME, c);

      var avisos = [];
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
                 [btn('✏️ Revisar dados', ID, 'editar'), btn('📄 Gerar PDF', ID, 'pdf')]]
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
      doses: [0.05, 0.1, 0.2, 0.5, 1.0],
      acoes: ['Início habitual: 0,05–0,1 mcg/kg/min; titular para PAM ≥ 65 mmHg.', 'Preferir acesso venoso central. Monitorar perfusão periférica e lactato.'],
      aviso: null
    },
    dobutamina: {
      nome: 'Dobutamina', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 250, vol: 250, conc: 1000, ref: 'Ampola: 250 mg/20 mL; padrão: 1 ampola (250 mg) em 230 mL SG5% (1000 mcg/mL).' }
      },
      doses: [2.5, 5, 10, 15, 20],
      acoes: ['Início habitual: 2,5–5 mcg/kg/min; titular até 20 mcg/kg/min.', 'Monitorar taquiarritmias, isquemia miocárdica e hipotensão.'],
      aviso: null
    },
    nitroprussiato: {
      nome: 'Nitroprussiato de sódio', unidade: 'mcg/kg/min', peso: true, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/2 mL; padrão: 1 ampola (50 mg) em 248 mL SG5% (200 mcg/mL, fotoprotetor).' }
      },
      doses: [0.3, 0.5, 1, 2, 3, 5],
      acoes: ['Início habitual: 0,3–0,5 mcg/kg/min; titular com linha arterial.', 'Cuidado com toxicidade por cianeto/tiocianato em uso prolongado.'],
      aviso: null
    },
    nitroglicerina: {
      nome: 'Nitroglicerina', unidade: 'mcg/min', peso: false, conc: 'mcg/mL',
      preparos: {
        padrao: { mg: 50, vol: 250, conc: 200, ref: 'Ampola: 50 mg/10 mL; padrão: 1 ampola (50 mg) em 240 mL SG5% ou SF0.9% (200 mcg/mL).' }
      },
      doses: [5, 10, 20, 30, 50, 100],
      acoes: ['Início habitual: 5–10 mcg/min; titular a cada 5–10 min.', 'Contraindicações: Infarto de VD, PAS < 90 mmHg, Sildenafila < 24h ou Tadalafila < 48h.'],
      aviso: null
    },
    vasopressina: {
      nome: 'Vasopressina', unidade: 'UI/min', peso: false, conc: 'UI/mL',
      preparos: {
        padrao: { mg: 20, vol: 100, conc: 0.2, ref: 'Ampola: 20 UI/1 mL; padrão: 1 ampola (20 UI) em 99 mL SG5% (0,2 UI/mL).' }
      },
      doses: [0.01, 0.02, 0.03, 0.04],
      acoes: ['Dose fixa: 0,03 UI/min (SSC 2021) = 9 mL/h; não titular.', 'Iniciar quando noradrenalina estiver em 0,25–0,5 mcg/kg/min.'],
      aviso: 'Não titular como catecolamina. Dose contínua fixa.'
    }
  };

  var DVA_ALIAS = {
    noradrenalina: 'noradrenalina', norepinefrina: 'noradrenalina', nora: 'noradrenalina',
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
        c.erros.push('Droga não reconhecida (noradrenalina, dobutamina, vasopressina, nitroprussiato, nitroglicerina)');
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

      var avisos = ['Vazões calculadas para a concentração acima. Dupla checagem obrigatória na bomba.'];
      if (d.aviso) avisos.unshift(d.aviso);

      var taxaFixaVaso = (chave === 'vasopressina' ? 9.0 : null);
      return sucesso({
        id: ID, nome: d.nome, estado: 'CALCULO', rotulo: 'CÁLCULO DE INFUSÃO · CONFERIR PREPARO',
        principal: fmt(conc, d.unidade === 'UI/min' ? 1 : 0) + ' ' + d.conc,
        secoes: [['BASE DO CÁLCULO', base], ['DOSE → VAZÃO', linhas], ['AÇÃO', ['Alvo inicial: PAM ≥ 65 mmHg.'].concat(d.acoes)]],
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
        botoes: botoesPadrao(ID, [btn('🎚️ Calcular outra dose', ID, 'dose'), btn('🧴 Revisar preparo', ID, 'preparo')])
      });
    });
  }

  // ═════════════════════════════ SEQUÊNCIA RÁPIDA DE INTUBAÇÃO ═════════════════════════════

  var SRI_FARMACOS = {
    etomidato:      { nome: 'Etomidato',      dose: 0.3, un: 'mg', conc: 2,  txt: '0,3 mg/kg · 2 mg/mL (ampola 20mg/10mL)',  grupo: 'indutor' },
    quetamina:      { nome: 'Quetamina',      dose: 1.5, un: 'mg', conc: 50, txt: '1,5 mg/kg · 50 mg/mL (ampola 50mg/mL)', grupo: 'indutor' },
    propofol:       { nome: 'Propofol 1%',    dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (ampola 1%)',        grupo: 'indutor' },
    midazolam:      { nome: 'Midazolam',      dose: 0.2, un: 'mg', conc: 5,  txt: '0,2 mg/kg · 5 mg/mL (ampola 5mg/mL)',   grupo: 'indutor' },
    rocuronio:      { nome: 'Rocurônio',      dose: 1.2, un: 'mg', conc: 10, txt: '1,2 mg/kg · 10 mg/mL (frasco 50mg/5mL)', grupo: 'bloqueador' },
    succinilcolina: { nome: 'Succinilcolina', dose: 1.5, un: 'mg', conc: 10, txt: '1,5 mg/kg · 10 mg/mL (frasco 100mg/10mL)', grupo: 'bloqueador' },
    fentanil:       { nome: 'Fentanil',       dose: 2.0, un: 'mcg',conc: 50, txt: '2 mcg/kg · 50 mcg/mL (ampola 50mcg/mL)',  grupo: 'adjuvante' }
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
          linhasDoses.push('2️⃣ Indutor Selecionado: ' + ind.f.nome + ' (' + ind.f.conc + ' ' + ind.f.un + '/mL · ' + fmt(ind.f.dose, 1) + ' ' + ind.f.un + '/kg): ' + fmt(dInd.dose, 1) + ' ' + ind.f.un + ' → ' + fmt(dInd.ml, 1) + ' mL IV');
        }
        if (blq) {
          var dBlq = calcDose(blq.f);
          linhasDoses.push('3️⃣ Bloqueador Selecionado: ' + blq.f.nome + ' (' + blq.f.conc + ' ' + blq.f.un + '/mL · ' + fmt(blq.f.dose, 1) + ' ' + blq.f.un + '/kg): ' + fmt(dBlq.dose, 1) + ' ' + blq.f.un + ' → ' + fmt(dBlq.ml, 1) + ' mL IV');
        }
      }

      var recomendacoes = [];
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
        ['BASE DO CÁLCULO', ['Peso do Paciente: ' + fmt(peso, 1) + ' kg', 'Contexto: ' + ctxTxt]],
        ['CONDUTA RECOMENDADA', recomendacoes],
        ['CARTÃO DE DOSES CALCULADAS (BEIRA-LEITO)', linhasDoses]
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
        botoes: botoesPadrao(ID, [btn('✅ Checklist 7 Ps', ID, 'checklist'), btn('🫁 Via Aérea Difícil', ID, 'vad')])
      });
    });
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

  // ═════════════════════════════ AUTOTESTE ═════════════════════════════

  function autoTeste() {
    var f = [];
    function ok(cond, msg) { if (!cond) f.push(msg); }
    var API = publico;
    var r;
    r = API.ckdEpi2021(1.0, 60, false); ok(r.ok && Math.abs(r.dados.tfg - 86.2) < 2.0, 'CKD-EPI homem 60a Cr1,0');
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
    } else if (acao === 'pdf') {
      titulo = '📄 EXPORTAÇÃO E REGISTRO';
      linhas = [
        'Para arquivar este resultado clínico estruturado com data e hora oficiais no seu prontuário pessoal:',
        '• Utilize o botão <b>📁 Salvar no Notion Tasks</b> na mensagem de resumo.',
        '• Para gerar receituário oficial em PDF para medicamentos, utilize o comando <code>/rx</code>.'
      ];
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
    drogasVasoativas: drogasVasoativas,
    sequenciaRapidaIntubacao: sequenciaRapidaIntubacao,
    processarAcao: processarAcao,
    autoTeste: autoTeste
  };
  return publico;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalculadorasClinicas;
}
