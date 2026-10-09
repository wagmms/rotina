import subprocess
import json

def test_nefrologia_dhe():
    result = subprocess.run(["node", "tests/test_nefrologia_dhe.cjs"], capture_output=True, text=True)
    assert result.returncode == 0, f"Falha nos testes de Nefrologia DHE: {result.stderr}"
    assert "TODOS OS TESTES PASSARAM" in result.stdout
