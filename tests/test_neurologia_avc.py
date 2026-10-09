import subprocess

def test_neurologia_avc_suite():
    result = subprocess.run(
        ["node", "tests/test_neurologia_avc.cjs"],
        capture_output=True,
        text=True
    )
    if result.stderr:
        print("STDERR:", result.stderr)
        
    assert result.returncode == 0, "A suíte de testes Neurologia AVC falhou."
    assert "TODOS OS TESTES NEUROLOGIA AVC PASSARAM COM SUCESSO" in result.stdout
