import subprocess
import sys

def test_endocrinologia_diabetes_nodejs():
    print("Iniciando bateria de testes determinísticos de Endocrinologia e Diabetes via Node.js...")
    result = subprocess.run(['node', 'tests/test_endocrinologia_diabetes.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_endocrinologia_diabetes.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS 15 TESTES DE ENDOCRINOLOGIA E DIABETES (SBD / ADA) PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_endocrinologia_diabetes.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_endocrinologia_diabetes_nodejs()
