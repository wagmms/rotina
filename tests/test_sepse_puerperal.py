import subprocess
import sys

def test_sepse_puerperal_nodejs():
    print("Iniciando bateria de testes determinísticos de Sepse Puerperal via Node.js...")
    result = subprocess.run(['node', 'tests/test_sepse_puerperal.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_sepse_puerperal.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "Todos os testes de Sepse Puerperal passaram com sucesso" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_sepse_puerperal.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_sepse_puerperal_nodejs()
