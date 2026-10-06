"""Regressões de integridade das bases, auditoria e fontes sem rede real."""
import subprocess
from pathlib import Path


def test_otimizacao_qualidade():
    root = Path(__file__).resolve().parent.parent
    result = subprocess.run(
        ["node", str(root / "tests/test_otimizacao_qualidade.cjs")],
        cwd=root, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout + "\n" + result.stderr
