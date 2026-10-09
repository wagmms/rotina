import subprocess
import sys

def test_rbac_perfis_clinicos_nodejs():
    print("Iniciando bateria de testes determinísticos de RBAC e Perfis Clínicos via Node.js...")
    result = subprocess.run(['node', 'tests/test_rbac_perfis_clinicos.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_rbac_perfis_clinicos.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS TESTES DE RBAC E PERFIS CLÍNICOS PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_rbac_perfis_clinicos.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_rbac_perfis_clinicos_nodejs()
