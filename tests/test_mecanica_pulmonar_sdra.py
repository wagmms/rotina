import subprocess
import pytest

def test_mecanica_pulmonar_sdra():
    # Executa o teste JavaScript usando Node.js
    resultado = subprocess.run(['node', 'tests/test_mecanica_pulmonar_sdra.cjs'], capture_output=True, text=True)
    
    # Exibe a saída para debug se falhar
    if resultado.returncode != 0:
        print("STDOUT:", resultado.stdout)
        print("STDERR:", resultado.stderr)
        
    assert resultado.returncode == 0, f"O teste JS de SDRA falhou. Erro: {resultado.stderr}"
    assert "✅ Todos os testes de SDRA/Mecânica Pulmonar passaram com sucesso." in resultado.stdout
