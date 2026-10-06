# -*- coding: utf-8 -*-
"""
Testes automatizados do pipeline de compilação e integridade estrutural do script compilado.
"""

import subprocess
import os
import pytest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MASTER_JS = os.path.join(ROOT_DIR, "ultra_rotina_master.js")
BUILD_SCRIPT = os.path.join(ROOT_DIR, "build_master.py")

def test_build_execution():
    res = subprocess.run(["python3", BUILD_SCRIPT], cwd=ROOT_DIR, capture_output=True, text=True)
    assert res.returncode == 0
    assert "Sucesso!" in res.stdout
    assert os.path.exists(MASTER_JS)

def test_compiled_script_integrity():
    with open(MASTER_JS, "r", encoding="utf-8") as f:
        content = f.read()

    funcoes_obrigatorias = [
        "doGet",
        "doPost",
        "ConfigService",
        "CalculadorasClinicas",
        "executarCicloRotina5Min",
        "verificarAgendaENotificar",
        "enviarBriefingMatinal",
        "enviarCheckinNoturno",
        "gerarSOAPComIA",
        "gerarPrescricaoComIA",
        "gerarPassagemPlantaoSBAR",
        "gerarPitchERoundComIA",
        "processarCalculadoraClinicaComIA",
        "verificarInteracaoComIA",
        "processarMensagemVoz",
        "processarMensagemFoto",
        "chamarNotionAPI",
        "criarTarefaNotion",
        "setupScriptProperties",
        "configurarWebhookTelegram",
        "configurarMenuTelegram",
        "instalarTodosOsAcionadores",
        "obterTecladoFixoPrincipal",
        "classificarIntencaoMensagem",
        "extrairDadosEventoCalendario",
        "criarEventoAgendaGoogle",
        "consultarEventosAgenda",
        "gerarResumoFimPlantao",
        "marcarHabitoProativoHoje",
        "EnfermariaService",
        "ReceitaPdfService",
        "detectarPlantaoStatus",
        "gerarCriticaSocraticaPreceptor",
        "gerarAudioTtsGoogle",
        "enviarAudioVozTelegram"
    ]

    for fn in funcoes_obrigatorias:
        assert fn in content, f"Função obrigatória '{fn}' ausente em ultra_rotina_master.js"

def test_syntax_check_node():
    res = subprocess.run(["node", "--check", MASTER_JS], capture_output=True, text=True)
    assert res.returncode == 0, f"Erro de sintaxe JS no arquivo de produção: {res.stderr}"
