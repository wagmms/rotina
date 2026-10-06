# -*- coding: utf-8 -*-
"""
Aplicação FastAPI para a Central Geral (Rotina Hub).
Serve a interface web SPA, rotas REST e streaming SSE de logs em tempo real.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from central_hub.config import (
    BASE_DIR, SCRIPTS_DIR, REVIEWS_DIR, CATALOGO_TAREFAS, TEMPLATES_DIR
)
from central_hub.runner import runner_instance
from central_hub.scanner import HealthScanner

app = FastAPI(
    title="Rotina Hub - Central Geral",
    description="Cockpit Unificado de Controle e Observabilidade de Rotinas",
    version="1.0.0"
)

# Permite chamadas locais
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunTaskRequest(BaseModel):
    task_id: str
    custom_args: Optional[List[str]] = None


class CPGPCalculationRequest(BaseModel):
    nome: str
    preco_kg: float
    proteina_por_100g: float


@app.get("/api/status")
async def get_system_status():
    """Retorna o estado de saúde holístico do ecossistema Rotina."""
    return HealthScanner.get_full_health()


@app.get("/api/tasks")
async def list_available_tasks():
    """Lista o catálogo de tarefas e identifica se há alguma em execução ativa."""
    active = runner_instance.get_active_execution()
    return {
        "tarefas": list(CATALOGO_TAREFAS.values()),
        "tarefa_ativa": active
    }


@app.post("/api/tasks/run")
async def run_task(req: RunTaskRequest):
    """Inicia uma tarefa assíncrona com streaming de logs disponível."""
    if req.task_id not in CATALOGO_TAREFAS:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada no catálogo.")

    active = runner_instance.get_active_execution()
    if active:
        raise HTTPException(
            status_code=409,
            detail=f"Já existe uma tarefa em execução: {active['task_name']} ({active['execution_id']})."
        )

    try:
        record = await runner_instance.start_task(req.task_id, req.custom_args)
        return {
            "sucesso": True,
            "execution_id": record.execution_id,
            "task_id": record.task_id,
            "task_name": record.task_name,
            "status": record.status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tasks/stop/{execution_id}")
async def stop_task(execution_id: str):
    """Interrompe uma tarefa em execução."""
    ok = await runner_instance.cancel_task(execution_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Não foi possível interromper a tarefa especificada.")
    return {"sucesso": True, "mensagem": f"Tarefa {execution_id} interrompida com sucesso."}


@app.get("/api/tasks/stream/{execution_id}")
async def stream_task_logs(execution_id: str):
    """Endpoint SSE (Server-Sent Events) para transmissão contínua de logs ao vivo."""
    return StreamingResponse(
        runner_instance.stream_logs(execution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/tasks/history")
async def get_execution_history(limit: int = 50):
    """Retorna o histórico das últimas execuções."""
    return runner_instance.list_history(limit)


@app.get("/api/tasks/history/{execution_id}")
async def get_execution_detail(execution_id: str):
    """Retorna os detalhes e logs completos de uma execução."""
    detalhes = runner_instance.get_execution_details(execution_id)
    if not detalhes:
        raise HTTPException(status_code=404, detail="Registro de execução não encontrado.")
    return detalhes


@app.get("/api/tenda/resumo")
async def get_tenda_resumo():
    """Lê o último relatório de compras gerado pelo script do Tenda."""
    resumo_file = SCRIPTS_DIR / "compras_tenda_resumo.md"
    if not resumo_file.exists():
        return {"existe": False, "conteudo": "Nenhum relatório de compras gerado ainda."}

    try:
        texto = resumo_file.read_text(encoding="utf-8")
        return {"existe": True, "conteudo": texto}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler resumo: {e}")


@app.get("/api/reviews/{filename}")
async def get_review_content(filename: str):
    """Lê um relatório de auditoria específico da pasta reviews/ com proteção de path."""
    clean_name = os.path.basename(filename)
    review_path = REVIEWS_DIR / clean_name
    if not review_path.exists() or not review_path.is_file():
        raise HTTPException(status_code=404, detail="Relatório de auditoria não encontrado.")

    try:
        return {"arquivo": clean_name, "conteudo": review_path.read_text(encoding="utf-8")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/food/alimentos")
async def get_food_database():
    """Retorna a base de alimentos de referência TACO/USDA do FoodOptimizer."""
    try:
        sys.path.insert(0, str(BASE_DIR / "src"))
        from food_optimizer import TABELA_NUTRICIONAL_REF
        alimentos = []
        for chave, p in TABELA_NUTRICIONAL_REF.items():
            alimentos.append({
                "chave": chave,
                "nome": p.nome,
                "categoria": p.categoria,
                "proteina_por_100g": p.proteina_por_100g,
                "descricao": p.descricao_nutricional
            })
        return alimentos
    except Exception as e:
        return []


@app.post("/api/food/calcular-cpgp")
async def calculate_cpgp(req: CPGPCalculationRequest):
    """Calcula o Custo por Grama de Proteína (CPGP) e fornece diagnóstico."""
    if req.proteina_por_100g <= 0:
        raise HTTPException(status_code=400, detail="Teor de proteína deve ser maior que zero.")

    # 1 kg tem 10 x (proteina_por_100g) gramas de proteína
    gramas_proteina_por_kg = req.proteina_por_100g * 10
    cpgp = req.preco_kg / gramas_proteina_por_kg

    # Classificação
    if cpgp < 0.12:
        classificacao = "Excelente Custo-Benefício (Ouro Nutricional)"
        cor = "emerald"
    elif cpgp < 0.20:
        classificacao = "Bom Rendimento Proteico"
        cor = "sky"
    elif cpgp < 0.30:
        classificacao = "Moderado / Custo Elevado"
        cor = "amber"
    else:
        classificacao = "Baixo Rendimento Proteico (Muito Caro por Proteína)"
        cor = "rose"

    return {
        "nome": req.nome,
        "preco_kg": req.preco_kg,
        "proteina_por_100g": req.proteina_por_100g,
        "gramas_proteina_por_kg": gramas_proteina_por_kg,
        "cpgp": round(cpgp, 4),
        "cpgp_formatado": f"R$ {cpgp:.2f} / g de proteína",
        "classificacao": classificacao,
        "cor": cor
    }


@app.get("/composicao", response_class=HTMLResponse)
async def serve_composicao_corporal():
    """Serve a página de Composição Corporal & Protocolo Mounjaro."""
    comp_file = BASE_DIR / "composicao_corporal.html"
    if not comp_file.exists():
        raise HTTPException(status_code=404, detail="Arquivo composicao_corporal.html não encontrado.")
    return comp_file.read_text(encoding="utf-8")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon():
    """Serve o ícone oficial do Rotina Hub para abas do navegador."""
    icon_path = Path.home() / ".local/share/icons/rotina-hub.png"
    if icon_path.exists():
        return FileResponse(icon_path, media_type="image/png")
    return Response(status_code=204)


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve a interface principal da Central Geral (Rotina Hub)."""
    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Template do dashboard não encontrado.")
    return index_file.read_text(encoding="utf-8")

