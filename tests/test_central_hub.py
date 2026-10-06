# -*- coding: utf-8 -*-
"""
Testes automatizados para a Central Geral (Rotina Hub).
Garante conformidade com os princípios do Arquiteto Radical e zero regressão.
"""

import pytest
import asyncio
from starlette.testclient import TestClient

from central_hub.app import app
from central_hub.scanner import HealthScanner
from central_hub.runner import ProcessRunner, runner_instance
from central_hub.config import CATALOGO_TAREFAS, BASE_DIR


@pytest.fixture
def client():
    return TestClient(app)


def test_scanner_audit_bot():
    """Valida se o scanner audita com precisão os módulos do bot."""
    res = HealthScanner.audit_bot()
    assert res["total_modulos"] >= 13
    assert res["total_linhas"] > 6000
    assert res["master"]["existe"] is True
    assert res["master"]["checksum"] is not None
    assert len(res["modulos"]) >= 13


def test_scanner_audit_nutricao():
    """Valida a auditoria do Tenda e Food Optimizer."""
    res = HealthScanner.audit_nutricao()
    assert res["tenda_script_existe"] is True
    assert res["food_optimizer_existe"] is True
    assert "resumo" in res


def test_scanner_audit_agenda():
    """Valida a auditoria da agenda e backups do MedQuest."""
    res = HealthScanner.audit_agenda()
    assert res["token"]["existe"] is True
    assert res["token"]["valido"] is True
    assert res["total_backups_medquest"] > 0


def test_scanner_audit_radar_voos():
    """Valida a auditoria do pool SerpApi de voos."""
    res = HealthScanner.audit_radar_voos()
    assert res["script_existe"] is True
    assert res["chaves_serpapi_ativas"] == 4
    assert res["cota_mensal_total"] == 1000
    assert res["destinos_mapeados"] >= 20


def test_scanner_full_health():
    """Valida o cálculo do score holístico de saúde."""
    health = HealthScanner.get_full_health()
    assert health["score_geral"] >= 80
    assert health["status_geral"] == "Operacional"
    assert "bot" in health
    assert "nutricao" in health
    assert "agenda" in health
    assert "voos" in health


def test_api_status_endpoint(client):
    """Testa o endpoint /api/status da Central."""
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "score_geral" in data
    assert data["status_geral"] == "Operacional"


def test_api_tasks_catalogo(client):
    """Testa se o catálogo de tarefas lista todas as rotinas."""
    resp = client.get("/api/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert "tarefas" in data
    assert len(data["tarefas"]) >= 8
    task_ids = [t["id"] for t in data["tarefas"]]
    assert "build_master" in task_ids
    assert "test_suite" in task_ids
    assert "tenda_carnes" in task_ids


def test_api_food_alimentos(client):
    """Testa o endpoint da base nutricional TACO/USDA."""
    resp = client.get("/api/food/alimentos")
    assert resp.status_code == 200
    alimentos = resp.json()
    assert len(alimentos) >= 10
    chaves = [a["chave"] for a in alimentos]
    assert "alcatra" in chaves
    assert "frango_sassami" in chaves
    assert "mignon_suino" in chaves


def test_api_calcular_cpgp(client):
    """Testa o cálculo do custo por grama de proteína (CPGP)."""
    payload = {
        "nome": "Patinho em Bifes",
        "preco_kg": 38.00,
        "proteina_por_100g": 28.0
    }
    resp = client.post("/api/food/calcular-cpgp", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["cpgp"] > 0
    assert "Excelente" in data["classificacao"] or "Bom" in data["classificacao"]
    assert "R$" in data["cpgp_formatado"]


def test_api_tenda_resumo(client):
    """Testa a leitura do resumo de compras."""
    resp = client.get("/api/tenda/resumo")
    assert resp.status_code == 200
    data = resp.json()
    assert "existe" in data
    assert "conteudo" in data


def test_api_composicao_endpoint(client):
    """Testa o carregamento da página de Composição Corporal."""
    resp = client.get("/composicao")
    assert resp.status_code == 200
    assert "Composição Corporal" in resp.text
    assert "Mounjaro" in resp.text


def test_api_dashboard_html(client):
    """Testa o carregamento da SPA principal."""
    resp = client.get("/")
    assert resp.status_code == 200
    assert "ROTINA HUB" in resp.text
    assert "Ultra Rotina Bot" in resp.text
    assert "tab-terminal" in resp.text


def test_process_runner_async():
    """Valida o funcionamento assíncrono do ProcessRunner."""
    async def _test():
        runner = ProcessRunner()
        assert runner.get_active_execution() is None
        rec = await runner.start_task("food_optimizer_cpgp")
        assert rec.status == "running"
        # Aguarda o término da tarefa rápida
        for _ in range(50):
            await asyncio.sleep(0.1)
            if rec.status != "running":
                break
        assert rec.status == "success"
        assert rec.exit_code == 0
        assert len(rec.logs) > 0

    asyncio.run(_test())

