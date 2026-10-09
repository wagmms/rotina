import subprocess
import os

def test_hematologia_anemias():
    """
    Executa a suíte determinística de Hematologia Clínica e Investigação de Anemias
    via Node.js para validação end-to-end do módulo.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_hematologia_anemias.cjs")
    result = subprocess.run(["node", "--test", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "pass 9" in result.stdout or "pass" in result.stdout
