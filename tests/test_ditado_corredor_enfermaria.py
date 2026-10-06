import subprocess
import os

def test_ditado_corredor_enfermaria_node():
    test_path = os.path.join(os.path.dirname(__file__), "test_ditado_corredor_enfermaria.cjs")
    res = subprocess.run(["node", test_path], capture_output=True, text=True)
    assert res.returncode == 0, f"Erro no teste Node.js:\n{res.stdout}\n{res.stderr}"
