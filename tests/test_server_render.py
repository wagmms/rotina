import subprocess
from pathlib import Path

def test_server_render_fastify():
    test_file = Path(__file__).parent / "test_server_render.cjs"
    res = subprocess.run(["node", str(test_file)], capture_output=True, text=True)
    assert res.returncode == 0, f"Falha no teste do servidor Render:\n{res.stderr}"
    assert "TODOS OS TESTES DO SERVIDOR RENDER PASSARAM" in res.stdout
