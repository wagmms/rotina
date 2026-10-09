import subprocess
import os


def test_hepatologia_colestase_gestacional():
    """
    Executa a suíte determinística de Hepatologia & Emergência Obstétrica:
    Colestase Intra-hepática da Gestação (CIG / RCOG / SMFM / Ovadia) e
    Esteatose Hepática Aguda (Critérios de Swansea) via Node.js.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_hepatologia_colestase_gestacional.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "46 pass, 0 fail" in result.stdout
