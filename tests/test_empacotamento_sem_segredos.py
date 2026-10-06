from scripts.empacotar_gas import empacotar


def test_empacotamento_usa_servicos_nativos_e_nao_embute_configuracao():
    codigo = 'function doGet() { return PropertiesService.getScriptProperties().getProperty("X"); }'
    resultado = empacotar(codigo)
    assert 'function(Logger, PropertiesService, Utilities, CalendarApp)' in resultado
    assert 'typeof PropertiesService !== "undefined" ? PropertiesService : undefined' in resultado
    assert 'var AMBIENTE_PRODUCAO =' not in resultado
    assert 'provisionarTemporariamente' not in resultado
