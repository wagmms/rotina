import subprocess
import json

def test_suporte_nutricional():
    result = subprocess.run(["node", "tests/test_suporte_nutricional.cjs"], capture_output=True, text=True)
    assert result.returncode == 0, f"Falha nos testes de Suporte Nutricional: {result.stderr}"
    assert "TODOS OS TESTES PASSARAM" in result.stdout
