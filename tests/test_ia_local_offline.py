import subprocess
import sys

def test_ia_local_offline_nodejs():
    print("Iniciando bateria de testes de IA Local (Llama 3 / Mistral) e Fallback Offline via Node.js...")
    result = subprocess.run(['node', 'tests/test_ia_local_offline.cjs'], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode != 0:
        print("❌ FALHA: test_ia_local_offline.cjs retornou código não-zero.")
        sys.exit(1)
    
    if "TODOS OS TESTES DE IA LOCAL E FALLBACK OFFLINE PASSARAM COM SUCESSO" not in result.stdout:
        print("❌ FALHA: Mensagem de sucesso não encontrada na saída.")
        sys.exit(1)
        
    print("✅ test_ia_local_offline.py: Integração e asserções validadas com sucesso.")

if __name__ == '__main__':
    test_ia_local_offline_nodejs()
