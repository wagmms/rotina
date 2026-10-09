import subprocess
import sys

def test_climaterio_thm_nodejs():
    print("Iniciando bateria de testes determinísticos de Climatério e THM via Node.js...")
    result = subprocess.run(['node', 'tests/test_climaterio_thm.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_climaterio_thm.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "Todos os testes de Climatério e THM passaram com 100% de sucesso" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_climaterio_thm.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_climaterio_thm_nodejs()
