"""Executa wrappers __main__, preservando seu código de saída e asserções."""
import runpy
import sys
from types import SimpleNamespace
from scripts.pytest_cjs_receipts import pytest_configure, pytest_unconfigure

config = SimpleNamespace()
pytest_configure(config)
try:
    runpy.run_path(sys.argv[1], run_name="__main__")
finally:
    pytest_unconfigure(config)
