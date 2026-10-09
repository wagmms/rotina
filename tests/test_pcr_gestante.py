import subprocess
import sys

def test_pcr_gestante_nodejs():
    print("Iniciando bateria de testes determinísticos de PCR na Gestante via Node.js...")
    result = subprocess.run(['node', 'tests/test_pcr_gestante.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_pcr_gestante.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "Todos os testes de PCR na Gestante passaram com sucesso" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_pcr_gestante.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_pcr_gestante_nodejs()
