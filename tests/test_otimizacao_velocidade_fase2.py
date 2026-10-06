import subprocess
import pytest

def test_otimizacao_velocidade_fase2_node():
    """Valida as otimizações 1 e 2 (fallback oficial gemini e heurística local de intenção clínica) via Node.js."""
    res = subprocess.run(
        ["node", "tests/test_otimizacao_velocidade_fase2.cjs"],
        capture_output=True,
        text=True,
        check=False
    )
    assert res.returncode == 0, f"Falha no teste Node:\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
    assert "OTIMIZAÇÕES 1 E 2: Todos os testes passaram com 100% de sucesso!" in res.stdout
