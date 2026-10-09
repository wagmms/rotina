#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys
import os

def main():
    script = os.path.join(os.path.dirname(__file__), "test_auditoria_kaizen_clinico.cjs")
    res = subprocess.run(["node", script])
    sys.exit(res.returncode)

if __name__ == "__main__":
    main()
