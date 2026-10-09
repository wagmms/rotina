import subprocess
import sys
import os

def test_saude_idoso_nodejs():
    """Roda a suite de testes do Saude Idoso em Node.js e integra com o Pytest"""
    script_path = os.path.join(os.path.dirname(__file__), "test_saude_idoso.cjs")
    result = subprocess.run(["node", script_path], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
        
    assert result.returncode == 0, "Falha nos testes do Saude Idoso (Node.js)"
