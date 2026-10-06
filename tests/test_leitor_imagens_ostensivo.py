import subprocess
import os

def test_leitor_imagens_ostensivo():
    script_path = os.path.join(os.path.dirname(__file__), "test_leitor_imagens_ostensivo.cjs")
    result = subprocess.run(["node", script_path], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
    assert result.returncode == 0, f"Falha nos testes do Leitor de Imagens:\n{result.stdout}\n{result.stderr}"
