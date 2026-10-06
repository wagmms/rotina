"""Integração local dos módulos reais com serviços externos substituídos."""
import pathlib
import subprocess
import pytest

@pytest.mark.parametrize('case', range(25))
def test_runtime_bot(case):
    script=pathlib.Path(__file__).with_name('runtime_bot.cjs')
    result=subprocess.run(['node',str(script),str(case)],capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
