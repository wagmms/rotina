"""Validação dos testes de Interações Medicamentosas Locais e Segurança Clínica."""
from pathlib import Path
import subprocess


def test_interacoes_medicamentosas_locais():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "tests/test_interacoes_locais.cjs"],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
