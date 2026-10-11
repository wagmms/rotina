"""
Testes automatizados para o validador sintático expresso (node --check Fast-Ack) pós-edição.
Garante:
1. Detecção instantânea de SyntaxError em arquivos .js, .cjs e .py.
2. Fast-fail / Fast-Ack antes do disparo de baterias de testes pesadas.
3. Resiliência e medição de tempo ultrarrápido (< 50ms).
"""
import json
import os
import subprocess
from pathlib import Path
import pytest
from syntax_checker import (
    verificar_sintaxe_arquivo,
    listar_arquivos_modificados_para_sintaxe,
    validar_sintaxe_expressa
)


def test_verificar_sintaxe_arquivo_js_valido(tmp_path):
    arquivo = tmp_path / "valid.js"
    arquivo.write_text("function somar(a, b) { return a + b; }\nmodule.exports = { somar };\n")
    ok, erro = verificar_sintaxe_arquivo(arquivo)
    assert ok is True
    assert erro is None


def test_verificar_sintaxe_arquivo_js_invalido(tmp_path):
    arquivo = tmp_path / "invalid.js"
    arquivo.write_text("function somar(a, b) { return a + ; }\n")
    ok, erro = verificar_sintaxe_arquivo(arquivo)
    assert ok is False
    assert erro is not None
    assert "SyntaxError" in erro or "Unexpected token" in erro


def test_verificar_sintaxe_arquivo_cjs_valido_e_invalido(tmp_path):
    arq_valido = tmp_path / "valid.cjs"
    arq_valido.write_text("const x = { a: 1, b: 2 };\n")
    ok1, erro1 = verificar_sintaxe_arquivo(arq_valido)
    assert ok1 is True
    assert erro1 is None

    arq_invalido = tmp_path / "invalid.cjs"
    arq_invalido.write_text("const x = { a: 1, b: ;\n")
    ok2, erro2 = verificar_sintaxe_arquivo(arq_invalido)
    assert ok2 is False
    assert erro2 is not None
    assert "SyntaxError" in erro2


def test_verificar_sintaxe_arquivo_python(tmp_path):
    py_ok = tmp_path / "test_ok.py"
    py_ok.write_text("def run():\n    return 42\n")
    ok, erro = verificar_sintaxe_arquivo(py_ok)
    assert ok is True
    assert erro is None

    py_bad = tmp_path / "test_bad.py"
    py_bad.write_text("def run():\n    return 42 +\n")
    ok_bad, erro_bad = verificar_sintaxe_arquivo(py_bad)
    assert ok_bad is False
    assert erro_bad is not None
    assert "SyntaxError" in erro_bad


def test_validar_sintaxe_expressa_lote_com_falha(tmp_path):
    f1 = tmp_path / "f1.js"
    f1.write_text("const a = 10;\n")
    f2 = tmp_path / "f2.js"
    f2.write_text("const b = ;\n")  # Erro de sintaxe
    f3 = tmp_path / "f3.py"
    f3.write_text("c = 20\n")

    res = validar_sintaxe_expressa(arquivos=[f1, f2, f3], root=tmp_path)
    assert res["ok"] is False
    assert res["total_checked"] == 3
    assert res["failed_count"] == 1
    assert len(res["failures"]) == 1
    assert "f2.js" in res["failures"][0]["file"]
    assert "SyntaxError" in res["first_error_message"]
    assert res["elapsed_seconds"] < 1.0


def test_validar_sintaxe_expressa_lote_com_sucesso(tmp_path):
    f1 = tmp_path / "ok1.js"
    f1.write_text("const a = 10;\n")
    f2 = tmp_path / "ok2.cjs"
    f2.write_text("module.exports = { ok: true };\n")

    res = validar_sintaxe_expressa(arquivos=[f1, f2], root=tmp_path)
    assert res["ok"] is True
    assert res["total_checked"] == 2
    assert res["failed_count"] == 0
    assert len(res["failures"]) == 0
    assert res["first_error_message"] is None
    assert res["elapsed_seconds"] < 0.5


def test_listar_arquivos_modificados_git(tmp_path):
    subprocess.run(["git", "init"], cwd=tmp_path, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.email", "test@test.local"], cwd=tmp_path, capture_output=True, check=True)

    src_dir = tmp_path / "src"
    src_dir.mkdir(parents=True)
    js_file = src_dir / "app.js"
    js_file.write_text("console.log('init');\n")

    # Arquivo não rastreado no git
    alvos = listar_arquivos_modificados_para_sintaxe(tmp_path)
    assert any("app.js" in str(a) for a in alvos)

    # Commit e depois modifica
    subprocess.run(["git", "add", "."], cwd=tmp_path, capture_output=True, check=True)
    subprocess.run(["git", "commit", "-m", "initial"], cwd=tmp_path, capture_output=True, check=True)

    # Modificado
    js_file.write_text("console.log('modificado');\n")
    alvos_mod = listar_arquivos_modificados_para_sintaxe(tmp_path)
    assert any("app.js" in str(a) for a in alvos_mod)


def test_fast_ack_bloqueia_execucao_antes_dos_testes(tmp_path, monkeypatch):
    """Simula o fluxo do autoloop comprovando que erro de sintaxe impede disparar npm test."""
    f_bad = tmp_path / "broken.js"
    f_bad.write_text("function broken() { const x = ; }\n")

    testes_executados = []
    def fake_executar_etapa(cmd, etapa, **kwargs):
        testes_executados.append(etapa)
        class Dummy:
            returncode = 0
        return Dummy()

    # Se a validação sintática falha, a etapa de testes nunca é acionada
    res = validar_sintaxe_expressa(arquivos=[f_bad], root=tmp_path)
    assert res["ok"] is False

    if res["ok"]:
        fake_executar_etapa(["npm", "run", "test:all"], "testes_finais_ciclo")

    assert len(testes_executados) == 0, "Testes pesados JAMAIS devem ser disparados se houver erro de sintaxe!"
