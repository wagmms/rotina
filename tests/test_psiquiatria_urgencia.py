import subprocess
import sys

def test_psiquiatria_urgencia_nodejs():
    print("Iniciando bateria de testes determinísticos de Psiquiatria de Urgência via Node.js...")
    result = subprocess.run(['node', 'tests/test_psiquiatria_urgencia.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_psiquiatria_urgencia.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS TESTES DE PSIQUIATRIA DE URGÊNCIA PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_psiquiatria_urgencia.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_psiquiatria_urgencia_nodejs()
