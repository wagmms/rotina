import subprocess
import sys

def test_dip_abscesso_tubo_ovariano_nodejs():
    print("Iniciando bateria de testes determinísticos de DIP e ATO via Node.js...")
    result = subprocess.run(['node', 'tests/test_dip_abscesso_tubo_ovariano.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_dip_abscesso_tubo_ovariano.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS TESTES DE DIP E ABSCESSO TUBO-OVARIANO PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_dip_abscesso_tubo_ovariano.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_dip_abscesso_tubo_ovariano_nodejs()
