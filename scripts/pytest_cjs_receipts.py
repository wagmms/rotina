"""Executa as asserções Python, reaproveitando apenas subprocessos CJS idênticos.

Argumentos extras, node --test, ambiente diferente, entrada ou cwd diferente
executam o subprocesso real. Nenhum teste Python é removido da coleta.
"""
from pathlib import Path
import json
import os
import subprocess


def pytest_configure(config):
    receipt_path = os.environ.get("AUTOLOOP_CJS_RECEIPTS")
    if not receipt_path:
        return
    receipts = json.loads(Path(receipt_path).read_text())
    original = subprocess.run
    root = Path.cwd().resolve()

    def run(command, *args, **kwargs):
        allowed = {"cwd", "capture_output", "text", "check", "timeout"}
        if (not args and isinstance(command, (list, tuple)) and len(command) == 2
                and command[0] == "node" and set(kwargs) <= allowed
                and kwargs.get("capture_output") is True and kwargs.get("text") is True
                and Path(kwargs.get("cwd") or root).resolve() == root):
            try:
                file = (root / str(command[1])).resolve().relative_to(root).as_posix()
            except (ValueError, TypeError):
                file = None
            receipt = receipts.get(file)
            deadline = kwargs.get("timeout")
            if receipt and (deadline is None or receipt["seconds"] <= deadline):
                result = subprocess.CompletedProcess(command, receipt["code"], receipt["stdout"], receipt["stderr"])
                if kwargs.get("check") and result.returncode:
                    raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
                return result
        return original(command, *args, **kwargs)

    subprocess.run = run
    config._autoloop_original_run = original


def pytest_unconfigure(config):
    if hasattr(config, "_autoloop_original_run"):
        subprocess.run = config._autoloop_original_run
