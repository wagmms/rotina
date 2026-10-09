import subprocess
import sys

def test_hepatologia_hda_nodejs():
    print("Iniciando bateria de testes determinísticos de Hepatologia Clínica e HDA via Node.js...")
    result = subprocess.run(['node', 'tests/test_hepatologia_hda.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_hepatologia_hda.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS TESTES DE HEPATOLOGIA CLÍNICA PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_hepatologia_hda.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_hepatologia_hda_nodejs()
