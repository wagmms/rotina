import subprocess
import sys

def test_suporte_nutricional_nodejs():
    print("Iniciando bateria de testes determinísticos de Suporte Nutricional via Node.js...")
    result = subprocess.run(['node', 'tests/test_suporte_nutricional.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_suporte_nutricional.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS 15 TESTES DE SUPORTE NUTRICIONAL (UTI/ENFERMARIA) PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_suporte_nutricional.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_suporte_nutricional_nodejs()
