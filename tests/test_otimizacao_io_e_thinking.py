import subprocess
import pytest

def test_otimizacao_io_e_thinking_node():
    """Valida otimização de I/O em PropertiesService e calibração de thinkingConfig via Node.js."""
    res = subprocess.run(
        ["node", "tests/test_otimizacao_io_e_thinking.cjs"],
        capture_output=True,
        text=True,
        check=False
    )
    assert res.returncode == 0, f"Falha no teste Node:\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
    assert "OTIMIZAÇÕES 3 E 4: Todos os testes passaram com 100% de sucesso!" in res.stdout
