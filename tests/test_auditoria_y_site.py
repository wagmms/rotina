import subprocess
import os
import pytest

def test_auditoria_y_site_js():
    """
    Executa a suite determinística de Y-Site (compatibilidade) escrita em Node.js.
    """
    script_path = os.path.join(os.path.dirname(__file__), "test_auditoria_y_site.cjs")
    result = subprocess.run(["node", script_path], capture_output=True, text=True)
    
    assert result.returncode == 0, f"Teste JS falhou: {result.stderr}"
    assert "Todos os testes de Y-Site (CJS) passaram com sucesso!" in result.stdout

