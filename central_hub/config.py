# -*- coding: utf-8 -*-
"""
Configurações e Catálogo de Tarefas da Central Geral (Rotina Hub).
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List

BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
SCRIPTS_DIR = BASE_DIR / "scripts"
CALENDAR_DIR = BASE_DIR / "calendar_manager"
REVIEWS_DIR = BASE_DIR / "reviews"
DATA_DIR = BASE_DIR / "central_hub" / "data"
TEMPLATES_DIR = BASE_DIR / "central_hub" / "templates"

DATA_DIR.mkdir(parents=True, exist_ok=True)

# Detecta binário Python correto (.venv local se existir)
VENV_PYTHON = BASE_DIR / ".venv" / "bin" / "python"
if VENV_PYTHON.exists():
    PYTHON_BIN = str(VENV_PYTHON)
else:
    PYTHON_BIN = sys.executable

CATALOGO_TAREFAS: Dict[str, Dict[str, Any]] = {
    "build_master": {
        "id": "build_master",
        "nome": "Compilar Ultra Rotina Master",
        "descricao": "Empacota os 13 módulos de src/, valida sintaxe Node.js e gera checksum SHA256.",
        "categoria": "Bot & Deploy",
        "icone": "package-check",
        "cor": "emerald",
        "comando": [PYTHON_BIN, str(BASE_DIR / "build_master.py")],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "test_suite": {
        "id": "test_suite",
        "nome": "Executar Suíte de Testes (Pytest)",
        "descricao": "Roda todos os 113+ testes unitários e de regressão com relatório detalhado.",
        "categoria": "Bot & Deploy",
        "icone": "flask-conical",
        "cor": "sky",
        "comando": [PYTHON_BIN, "-m", "pytest", "tests/", "-v", "--tb=short"],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "deploy_clasp": {
        "id": "deploy_clasp",
        "nome": "Deploy no Google Apps Script (Clasp)",
        "descricao": "Testa, compila, envia via clasp push/deploy e sincroniza comandos no Telegram.",
        "categoria": "Bot & Deploy",
        "icone": "cloud-upload",
        "cor": "amber",
        "comando": [PYTHON_BIN, str(BASE_DIR / "deploy.py")],
        "cwd": str(BASE_DIR),
        "perigoso": True
    },
    "tenda_carnes": {
        "id": "tenda_carnes",
        "nome": "Tenda: Comparador Multicortes de Carnes",
        "descricao": "Compara cortes por preço por kg e monta o carrinho de carnes no Tenda Atacado RP.",
        "categoria": "Nutrição & Compras",
        "icone": "beef",
        "cor": "rose",
        "comando": [PYTHON_BIN, str(SCRIPTS_DIR / "tenda_compras_quinzenal.py"), "--apenas-carnes", "--sem-fechamento"],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "tenda_completo": {
        "id": "tenda_completo",
        "nome": "Tenda: Cotação Quinzenal Completa",
        "descricao": "Monta o carrinho quinzenal com mercearia, hortifrúti, laticínios e radar de oportunidades.",
        "categoria": "Nutrição & Compras",
        "icone": "shopping-cart",
        "cor": "purple",
        "comando": [PYTHON_BIN, str(SCRIPTS_DIR / "tenda_compras_quinzenal.py"), "--modo-completo", "--sem-fechamento"],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "food_optimizer_cpgp": {
        "id": "food_optimizer_cpgp",
        "nome": "Otimizador Nutricional (TACO / CPGP)",
        "descricao": "Calcula custo por grama de proteína e compara cortes nobres vs rendimento.",
        "categoria": "Nutrição & Compras",
        "icone": "calculator",
        "cor": "emerald",
        "comando": [PYTHON_BIN, "-c", "import sys; sys.path.insert(0, 'src'); from food_optimizer import FoodOptimizer, TABELA_NUTRICIONAL_REF; opt = FoodOptimizer(); print('=== TABELA TACO/USDA CARREGADA ==='); [print(f'• {k.upper()}: {v.proteina_por_100g}g prot/100g ({v.categoria})') for k, v in list(TABELA_NUTRICIONAL_REF.items())[:12]]; print('✓ Otimizador operacional com sucesso!')"],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "sync_calendar_medquest": {
        "id": "sync_calendar_medquest",
        "nome": "Sincronizar MedQuest com Agenda",
        "descricao": "Organiza cronograma do MedQuest com pesos de rodízio da Turma J de Internato.",
        "categoria": "Agenda & Calendário",
        "icone": "calendar-sync",
        "cor": "indigo",
        "comando": [PYTHON_BIN, str(CALENDAR_DIR / "sync_avancado_medquest.py"), "--dry-run"],
        "cwd": str(CALENDAR_DIR),
        "perigoso": False
    },
    "audit_calendar": {
        "id": "audit_calendar",
        "nome": "Auditar Conflitos de Agenda",
        "descricao": "Verifica sobreposições de horários, eventos duplicados e integridade de blocos.",
        "categoria": "Agenda & Calendário",
        "icone": "calendar-search",
        "cor": "cyan",
        "comando": [PYTHON_BIN, str(CALENDAR_DIR / "check_overlaps.py")],
        "cwd": str(CALENDAR_DIR),
        "perigoso": False
    },
    "smoke_telegram": {
        "id": "smoke_telegram",
        "nome": "Smoke Test: Webhook do Telegram",
        "descricao": "Envia probe HTTP no endpoint de produção para verificar tempo de resposta e status 200.",
        "categoria": "Diagnóstico & Probes",
        "icone": "send",
        "cor": "blue",
        "comando": [PYTHON_BIN, str(SCRIPTS_DIR / "smoke_telegram.py")],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "smoke_botoes": {
        "id": "smoke_botoes",
        "nome": "Smoke Test: Menus & Botões Inline",
        "descricao": "Simula requisições de callback dos menus de calculadoras e triagem clínica.",
        "categoria": "Diagnóstico & Probes",
        "icone": "layout-grid",
        "cor": "teal",
        "comando": [PYTHON_BIN, str(SCRIPTS_DIR / "smoke_botoes.py")],
        "cwd": str(BASE_DIR),
        "perigoso": False
    },
    "pc_task_bridge": {
        "id": "pc_task_bridge",
        "nome": "PC Task Bridge (Varredura de Fila)",
        "descricao": "Executa varredura das tarefas solicitadas pelo celular via '/pc <tarefa>' e envia relatórios.",
        "categoria": "Diagnóstico & Probes",
        "icone": "cpu",
        "cor": "purple",
        "comando": [PYTHON_BIN, str(SCRIPTS_DIR / "pc_task_bridge.py"), "--once"],
        "cwd": str(BASE_DIR),
        "perigoso": False
    }
}
