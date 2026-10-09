import subprocess
import sys

def main():
    print("Iniciando testes em Python para Analgesia PCA...")
    result = subprocess.run(["node", "tests/test_analgesia_pca.cjs"], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
