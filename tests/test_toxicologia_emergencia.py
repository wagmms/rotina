import subprocess
import sys
import os

def main():
    print("Iniciando bateria de testes para Toxicologia de Emergência (Node.js)...")
    dir_path = os.path.dirname(os.path.realpath(__file__))
    js_test_path = os.path.join(dir_path, "test_toxicologia_emergencia.cjs")
    
    result = subprocess.run(["node", js_test_path], capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("Erros:", result.stderr, file=sys.stderr)
        
    if result.returncode == 0:
        print("✅ Todos os testes Python-to-Node para Toxicologia de Emergência foram concluídos com sucesso.")
        sys.exit(0)
    else:
        print("❌ Falha na execução dos testes.")
        sys.exit(result.returncode)

if __name__ == "__main__":
    main()
