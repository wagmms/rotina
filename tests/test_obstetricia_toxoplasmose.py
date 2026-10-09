import subprocess
import os


def test_obstetricia_toxoplasmose():
    """
    Executa a suíte determinística de Infectologia & Obstetrícia:
    Rastreamento e Manejo de Toxoplasmose Aguda na Gestação
    (Diretrizes Ministério da Saúde 2022/2024, FEBRASGO 2023, ACOG) via Node.js.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_obstetricia_toxoplasmose.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "20 pass, 0 fail" in result.stdout
