import subprocess
import os


def test_obstetricia_rcf_doppler():
    """
    Executa a suíte determinística de Obstetrícia & Medicina Fetal: Restrição de Crescimento Fetal
    (Consenso Delphi, Estágios de Barcelona, limiares TRUFFLE) via Node.js.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_obstetricia_rcf_doppler.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "24 pass, 0 fail" in result.stdout
