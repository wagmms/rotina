/** Separa títulos explícitos; ausência de campo nunca significa contraindicação. */
function separarSecoesPosologicas(texto) {
  var resultado = { adulto: '', pediatria: '', dose_maxima: '', ajuste_dose: '', geral: '', reconhecidas: 0 };
  var atual = 'geral';
  String(texto || '').split(/\r?\n/).forEach(function(linha) {
    var titulo = linha.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[¹²³⁰⁴⁵⁶⁷⁸⁹]+/g, '').replace(/[,:\s]+$/g, '').trim();
    var chave = /^adultos?$/.test(titulo) ? 'adulto'
      : /^(?:pediatria|criancas?)$/.test(titulo) ? 'pediatria'
      : /^dose maxima(?: diaria)?$/.test(titulo) ? 'dose_maxima'
      : /^(?:ajustes?(?: de dose)?|insuficiencia renal)$/.test(titulo) ? 'ajuste_dose' : null;
    if (chave) { atual = chave; resultado.reconhecidas++; }
    else if (linha.trim()) resultado[atual] += (resultado[atual] ? '\n' : '') + linha.trim();
  });
  return resultado;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { separarSecoesPosologicas };
