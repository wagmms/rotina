"""Todos os testes do orquestrador usam diretórios temporários."""
from pathlib import Path
import sys
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core"))
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


import os
import importlib.util
import importlib.machinery

AUTOLOOP_PATH = Path(os.environ.get("AUTOLOOP_TEST_EXECUTABLE", str(Path(__file__).resolve().parents[1] / "autoloop.py")))

@pytest.fixture(autouse=True)
def isolated_cwd(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

@pytest.fixture(scope="module")
def autoloop_mod():
    assert AUTOLOOP_PATH.exists(), f"Arquivo não encontrado: {AUTOLOOP_PATH}"
    loader = importlib.machinery.SourceFileLoader("autoloop", str(AUTOLOOP_PATH))
    spec = importlib.util.spec_from_loader("autoloop", loader)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["autoloop"] = mod
    loader.exec_module(mod)
    return mod
