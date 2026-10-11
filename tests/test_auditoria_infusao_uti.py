"""Contrato atual após retirada explícita no commit 498b4a5; não reativa módulos."""
import subprocess
from pathlib import Path


def test_auditoria_infusao_uti_desativado_com_autorizacao():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(["node", "tests/test_modulos_desativados.cjs"],
                            cwd=root, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "DESATIVACAO_VALIDADA:auditoria_infusao_uti" in result.stdout
