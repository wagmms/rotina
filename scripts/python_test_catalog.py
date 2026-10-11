"""Identifica testes pytest e wrappers executáveis; nenhum arquivo é omitido."""
from pathlib import Path
import ast
import json
import sys


def kind(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    if any(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith("test_")
           for node in ast.walk(tree)):
        return "python"
    for node in tree.body:
        if (isinstance(node, ast.If) and isinstance(node.test, ast.Compare)
                and isinstance(node.test.left, ast.Name) and node.test.left.id == "__name__"
                and len(node.test.ops) == 1 and isinstance(node.test.ops[0], ast.Eq)
                and len(node.test.comparators) == 1
                and isinstance(node.test.comparators[0], ast.Constant)
                and node.test.comparators[0].value == "__main__"):
            return "python-script"
    # Arquivo ambíguo continua na execução pytest; zero testes é uma falha visível.
    return "python"


if __name__ == "__main__":
    print(json.dumps({p.name: kind(p) for p in sorted(Path(sys.argv[1]).glob("test_*.py"))}))
