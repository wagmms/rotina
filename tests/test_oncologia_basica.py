import pytest
import subprocess
import os

def test_oncologia_basica():
    test_file = os.path.join(os.path.dirname(__file__), "test_oncologia_basica.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou: {result.stderr}"
    assert "Todos os testes de Oncologia Básica passaram!" in result.stdout
