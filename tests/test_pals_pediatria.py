import subprocess
import json

def test_pals_pediatria_suite():
    """
    Executa a suíte determinística de suporte avançado de vida pediátrico (PALS)
    via subprocesso usando Node.js para garantir que os módulos JS sejam testados na mesma engine do Render.
    """
    result = subprocess.run(
        ["node", "tests/test_pals_pediatria.cjs"],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
        
    assert result.returncode == 0, "A suíte de testes PALS Pediatria falhou."
    assert "TODOS OS TESTES PALS PEDIATRIA PASSARAM COM SUCESSO" in result.stdout
