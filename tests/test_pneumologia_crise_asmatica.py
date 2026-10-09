import subprocess
import os

def test_pneumologia_crise_asmatica():
    """
    Executa a suíte determinística de Pneumologia e Emergência: Manejo da Crise Asmática Grave
    e Estado de Mal Asmático via Node.js para validação end-to-end do módulo.
    """
    test_file = os.path.join(os.path.dirname(__file__), "test_pneumologia_crise_asmatica.cjs")
    result = subprocess.run(["node", test_file], capture_output=True, text=True)
    assert result.returncode == 0, f"Teste JS falhou:\n{result.stderr}\n{result.stdout}"
    assert "9 pass, 0 fail" in result.stdout
