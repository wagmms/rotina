import subprocess
import os

def test_audio_tempo_unico_node():
    test_path = os.path.join(os.path.dirname(__file__), "test_audio_tempo_unico.cjs")
    res = subprocess.run(["node", test_path], capture_output=True, text=True)
    assert res.returncode == 0, f"Erro no teste Node.js:\n{res.stdout}\n{res.stderr}"
