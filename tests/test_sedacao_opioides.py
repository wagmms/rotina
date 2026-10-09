import subprocess
import sys
import os

def test_sedacao_opioides_nodejs():
    """Roda a suite de testes de Sedação e Opioides em Node.js e integra com o Pytest"""
    script_path = os.path.join(os.path.dirname(__file__), "test_sedacao_opioides.cjs")
    result = subprocess.run(["node", script_path], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
        
    assert result.returncode == 0, "Falha nos testes de SedacaoOpioidesService (Node.js)"
