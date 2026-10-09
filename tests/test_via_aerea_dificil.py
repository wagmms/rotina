import subprocess
import sys

def main():
    print("Iniciando testes em Python para Manejo de Via Aérea Difícil (Algoritmo ASA)...")
    result = subprocess.run(["node", "tests/test_via_aerea_dificil.cjs"], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
