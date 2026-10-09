import subprocess
from pathlib import Path

def test_defensivo_telegram_e_rpc():
    """Valida resiliência defensiva a parâmetros malformados e vazios no Telegram e Fastify RPC."""
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "tests/test_defensivo_telegram_rpc.cjs"], cwd=root,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
