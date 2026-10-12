# -*- coding: utf-8 -*-
"""
Testes automatizados do Sentinela Bio-Adaptativo Pós-Plantão e Preceptor Socrático.
Valida detecção de plantão no calendário, protocolo anti-burnout e sabatina socrática.
"""

import subprocess
import os
import json
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT_DIR, "src")

def run_node_eval(js_code: str) -> str:
    """Executa código JavaScript simulando o ambiente do Google Apps Script com os módulos carregados."""
    wrapper = f"""
    const fs = require('fs');
    const path = require('path');

    const files = [
        '00_config.js',
        '01_utils.js',
        '02_calculadoras_puras.js',
        '03_bases_locais.js',
        '04_motores_ia.js',
        '05_notion.js',
        '06_rotina_agenda.js',
                '07a_telegram_router.js',
        '07b_telegram_preceptor.js',
        '07c_telegram_consultas_e_ia.js',
        '07d_telegram_callbacks.js',
        '07e_telegram_midia_e_leitos.js',
        '07f_telegram_calculadoras_parser.js',
        '07g_telegram_ajuda_e_protocolos.js',
        '08_main.js',
        '09_enfermaria.js',
        '10_pdf_receita.js'
    ];

    for (const f of files) {{
        const fullPath = path.join('{SRC_DIR}', f);
        if (fs.existsSync(fullPath)) {{
            eval(fs.readFileSync(fullPath, 'utf8'));
        }}
    }}

    {js_code}
    """
    res = subprocess.run(["node", "-e", wrapper], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Erro na execução do Node.js:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
    return res.stdout.strip()

def test_detectar_plantao_sem_eventos():
    """Sem eventos de plantão, deve retornar ehPlantaoHoje e ehPosPlantao como false."""
    code = """
    CalendarApp._setMockEventos([]);
    var res = detectarPlantaoStatus(new Date('2026-10-03T10:00:00'));
    console.log(JSON.stringify(res));
    """
    out = run_node_eval(code)
    data = json.loads(out)
    assert data["ehPlantaoHoje"] is False
    assert data["ehPosPlantao"] is False
    assert data["tituloPlantao"] is None

def test_detectar_plantao_em_andamento():
    """Com plantão ocorrendo no horário de referência, ehPlantaoHoje deve ser true."""
    code = """
    var agora = new Date('2026-10-03T20:00:00');
    var evPlantao = {
        getId: function() { return 'ev-1'; },
        getTitle: function() { return 'Plantão Noturno CTI 12h'; },
        getStartTime: function() { return new Date('2026-10-03T19:00:00'); },
        getEndTime: function() { return new Date('2026-10-04T07:00:00'); },
        getLocation: function() { return 'Hospital das Clínicas'; },
        getDescription: function() { return ''; },
        isAllDayEvent: function() { return false; }
    };
    CalendarApp._setMockEventos([evPlantao]);
    var res = detectarPlantaoStatus(agora);
    console.log(JSON.stringify(res));
    """
    out = run_node_eval(code)
    data = json.loads(out)
    assert data["ehPlantaoHoje"] is True
    assert data["ehPosPlantao"] is False
    assert "Plantão Noturno" in data["tituloPlantao"]
    assert "andamento" in data["detalhes"]

def test_detectar_pos_plantao():
    """Quando o plantão terminou há 2 horas, ehPosPlantao deve ser true."""
    code = """
    var agora = new Date('2026-10-04T09:00:00');
    var evPlantao = {
        getId: function() { return 'ev-2'; },
        getTitle: function() { return 'Plantão PS Emergência'; },
        getStartTime: function() { return new Date('2026-10-03T19:00:00'); },
        getEndTime: function() { return new Date('2026-10-04T07:00:00'); },
        getLocation: function() { return 'PS Central'; },
        getDescription: function() { return ''; },
        isAllDayEvent: function() { return false; }
    };
    CalendarApp._setMockEventos([evPlantao]);
    var res = detectarPlantaoStatus(agora);
    console.log(JSON.stringify(res));
    """
    out = run_node_eval(code)
    data = json.loads(out)
    assert data["ehPosPlantao"] is True
    assert "PS Emergência" in data["tituloPlantao"]
    assert "Pós-plantão" in data["detalhes"]

def test_briefing_modo_pos_plantao():
    """No briefing matinal após plantão, a mensagem deve ativar o Modo Pós-Plantão e Anti-Burnout."""
    code = """
    var agora = new Date();
    // Cria plantão que terminou há 1 hora
    var evPlantao = {
        getId: function() { return 'ev-3'; },
        getTitle: function() { return 'Plantão Noturno CTI'; },
        getStartTime: function() { return new Date(agora.getTime() - (13 * 3600 * 1000)); },
        getEndTime: function() { return new Date(agora.getTime() - (1 * 3600 * 1000)); },
        getLocation: function() { return 'CTI Adulto'; },
        getDescription: function() { return ''; },
        isAllDayEvent: function() { return false; }
    };
    CalendarApp._setMockEventos([evPlantao]);

    var mensagensEnviadas = [];
    ehUsuarioTitular = function(id) { return true; };
    enviarMensagemComTecladoParaChat = function(chatId, texto, kb) {
        mensagensEnviadas.push(texto);
        return true;
    };
    enviarMensagemSegmentada = function(chatId, texto, kb) {
        mensagensEnviadas.push(texto);
        return true;
    };

    enviarBriefingMatinal('123456', true);
    console.log(JSON.stringify(mensagensEnviadas));
    """
    out = run_node_eval(code)
    msgs = json.loads(out)
    assert len(msgs) > 0
    texto = msgs[0]
    assert "MODO PÓS-PLANTÃO ATIVADO" in texto
    assert "Protocolo Anti-Burnout" in texto
    assert "Sono de recuperação" in texto or "sono ininterrupto" in texto

def test_critica_socratica_fallback():
    """Testa geração de crítica socrática concisa do preceptor."""
    code = """
    // Sem chaves de API ativas, deve retornar o fallback socrático padrão
    var critica = gerarCriticaSocraticaPreceptor('Paciente 70 anos em choque séptico');
    console.log(JSON.stringify({ critica: critica }));
    """
    out = run_node_eval(code)
    data = json.loads(out)
    assert len(data["critica"]) > 10
    assert len(data["critica"]) <= 200
    assert "Doutor" in data["critica"] or "descompensação" in data["critica"]
