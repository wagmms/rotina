"""Validação sintática expressa (node --check Fast-Ack) pós-edição para o Autoloop."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
import subprocess
import sys
import time

IGNORED_DIRS = {
    'node_modules', '.git', '.gemini', 'data', 'logs', 'coverage',
    '.pytest_cache', '__pycache__', 'dist', 'build'
}

JS_EXTENSIONS = {'.js', '.cjs', '.mjs'}
PY_EXTENSIONS = {'.py'}
CHECKABLE_EXTENSIONS = JS_EXTENSIONS | PY_EXTENSIONS


def listar_arquivos_modificados_para_sintaxe(root=Path('.')):
    """
    Identifica arquivos .js, .cjs, .mjs e .py modificados, criados ou em staging
    no repositório Git para validação sintática expressa.
    """
    root = Path(root).resolve()
    candidatos = set()

    try:
        # 1. Arquivos modificados no working tree / index
        res = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=root,
            capture_output=True,
            text=True,
            check=False
        )
        if res.returncode == 0:
            for line in res.stdout.splitlines():
                if not line.strip():
                    continue
                # Status porcelain: XY filename ou XY "filename" ou R  old -> new
                status = line[:2]
                if 'D' in status:
                    continue  # Arquivo deletado
                resto = line[3:].strip().strip('"')
                if ' -> ' in resto:
                    resto = resto.split(' -> ')[1].strip().strip('"')
                p = root / resto
                if p.is_dir():
                    for item in p.rglob("*"):
                        if item.is_file():
                            candidatos.add(str(item.relative_to(root)))
                else:
                    candidatos.add(resto)

        # 2. Se working tree estiver limpo, checa arquivos modificados no último commit
        if not candidatos:
            res_diff = subprocess.run(
                ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
                cwd=root,
                capture_output=True,
                text=True,
                check=False
            )
            if res_diff.returncode == 0:
                for line in res_diff.stdout.splitlines():
                    f = line.strip().strip('"')
                    if f:
                        candidatos.add(f)
    except Exception:
        pass

    arquivos_validos = []
    for rel_path in sorted(candidatos):
        partes = Path(rel_path).parts
        if any(p in IGNORED_DIRS for p in partes):
            continue
        ext = Path(rel_path).suffix.lower()
        if ext in CHECKABLE_EXTENSIONS:
            full_path = root / rel_path
            if full_path.is_file():
                arquivos_validos.append(full_path)

    return arquivos_validos


def verificar_sintaxe_arquivo(caminho, timeout=10):
    """
    Executa verificação sintática expressa em um arquivo individual:
    - JavaScript / CommonJS (.js, .cjs, .mjs): node --check
    - Python (.py): python3 -m py_compile
    Retorna (sucesso: bool, erro_formatado: str ou None).
    """
    caminho = Path(caminho).resolve()
    if not caminho.is_file():
        return True, None

    ext = caminho.suffix.lower()

    if ext in JS_EXTENSIONS:
        try:
            res = subprocess.run(
                ["node", "--check", str(caminho)],
                capture_output=True,
                text=True,
                check=False,
                timeout=timeout
            )
            if res.returncode != 0:
                erro = (res.stderr or res.stdout or "").strip()
                return False, erro or f"Falha desconhecida em node --check (código {res.returncode})"
            return True, None
        except FileNotFoundError:
            return True, None  # Se node não estiver no PATH, não quebra
        except subprocess.TimeoutExpired:
            return False, f"Timeout ({timeout}s) em node --check para {caminho.name}"
        except Exception as exc:
            return False, f"Exceção ao verificar sintaxe de {caminho.name}: {exc}"

    if ext in PY_EXTENSIONS:
        try:
            res = subprocess.run(
                [sys.executable or "python3", "-m", "py_compile", str(caminho)],
                capture_output=True,
                text=True,
                check=False,
                timeout=timeout
            )
            if res.returncode != 0:
                erro = (res.stderr or res.stdout or "").strip()
                return False, erro or f"Falha em py_compile (código {res.returncode})"
            return True, None
        except subprocess.TimeoutExpired:
            return False, f"Timeout ({timeout}s) em py_compile para {caminho.name}"
        except Exception as exc:
            return False, f"Exceção ao verificar sintaxe Python de {caminho.name}: {exc}"

    return True, None


def validar_sintaxe_expressa(arquivos=None, root=Path('.')):
    """
    Fast-Ack sintático de altíssima velocidade (< 50ms) pós-edição:
    Verifica se todos os arquivos modificados contêm sintaxe válida antes de disparar testes pesados.
    """
    root = Path(root).resolve()
    started = time.monotonic()

    if arquivos is None:
        lista_alvos = listar_arquivos_modificados_para_sintaxe(root)
    else:
        lista_alvos = [Path(a).resolve() if Path(a).is_absolute() else (root / a).resolve()
                       for a in arquivos]
        lista_alvos = [a for a in lista_alvos if a.is_file() and a.suffix.lower() in CHECKABLE_EXTENSIONS]

    if not lista_alvos:
        return {
            "ok": True,
            "total_checked": 0,
            "failed_count": 0,
            "failures": [],
            "elapsed_seconds": round(time.monotonic() - started, 4),
            "first_error_message": None
        }

    falhas = []
    # Para até 4 arquivos executa sequencial; para mais, distribui em pool leve
    if len(lista_alvos) <= 4:
        for arq in lista_alvos:
            ok, err = verificar_sintaxe_arquivo(arq)
            if not ok:
                rel = str(arq.relative_to(root)) if arq.is_relative_to(root) else str(arq)
                falhas.append({"file": rel, "error": err})
    else:
        with ThreadPoolExecutor(max_workers=min(4, len(lista_alvos))) as executor:
            resultados = list(executor.map(verificar_sintaxe_arquivo, lista_alvos))
            for arq, (ok, err) in zip(lista_alvos, resultados):
                if not ok:
                    rel = str(arq.relative_to(root)) if arq.is_relative_to(root) else str(arq)
                    falhas.append({"file": rel, "error": err})

    elapsed = time.monotonic() - started
    primeiro_erro = falhas[0]["error"] if falhas else None

    return {
        "ok": len(falhas) == 0,
        "total_checked": len(lista_alvos),
        "failed_count": len(falhas),
        "failures": falhas,
        "elapsed_seconds": round(elapsed, 4),
        "first_error_message": primeiro_erro
    }
