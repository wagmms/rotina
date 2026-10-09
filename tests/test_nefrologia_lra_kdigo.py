import subprocess
import os


def test_nefrologia_lra_kdigo():
    """
    Executa a suíte de Nefrologia LRA KDIGO e diálise de urgência via Node.js.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_nefrologia_lra_kdigo.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "PASSARAM COM SUCESSO" in result.stdout
