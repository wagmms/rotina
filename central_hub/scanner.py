# -*- coding: utf-8 -*-
"""
Scanner de Integridade, Saúde e Métricas do Ecossistema Rotina.
"""

import os
import re
import glob
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

from central_hub.config import (
    BASE_DIR, SRC_DIR, SCRIPTS_DIR, CALENDAR_DIR, REVIEWS_DIR, PYTHON_BIN
)


class HealthScanner:
    @staticmethod
    def audit_bot() -> Dict[str, Any]:
        """Audita módulos JS do bot, build master e credenciais."""
        modulos = []
        total_linhas = 0
        total_bytes = 0

        arquivos_js = sorted(glob.glob(str(SRC_DIR / "*.js")))
        for fpath in arquivos_js:
            p = Path(fpath)
            try:
                conteudo = p.read_text(encoding="utf-8")
                linhas = len(conteudo.splitlines())
                tamanho = p.stat().st_size
                total_linhas += linhas
                total_bytes += tamanho
                modulos.append({
                    "nome": p.name,
                    "linhas": linhas,
                    "tamanho_kb": round(tamanho / 1024, 1),
                    "status": "ok"
                })
            except Exception as e:
                modulos.append({
                    "nome": p.name,
                    "linhas": 0,
                    "tamanho_kb": 0,
                    "status": f"erro: {e}"
                })

        master_file = BASE_DIR / "ultra_rotina_master.js"
        master_info = {
            "existe": master_file.exists(),
            "tamanho_kb": round(master_file.stat().st_size / 1024, 1) if master_file.exists() else 0,
            "ultima_modificacao": datetime.fromtimestamp(master_file.stat().st_mtime).strftime("%d/%m/%Y %H:%M:%S") if master_file.exists() else None,
            "checksum": None
        }

        if master_file.exists():
            try:
                conteudo = master_file.read_text(encoding="utf-8")
                # Extrai checksum do cabeçalho se existir
                m = re.search(r"Checksum SHA256:\s*([a-fA-F0-9]+)", conteudo)
                if m:
                    master_info["checksum"] = m.group(1)
                else:
                    master_info["checksum"] = hashlib.sha256(conteudo.encode("utf-8")).hexdigest()[:16]
            except Exception:
                pass

        # Checagem de credenciais
        deploy_state = BASE_DIR / ".deploy_state.json"
        has_deploy_state = deploy_state.exists()
        env_file = BASE_DIR / ".env"
        has_env = env_file.exists()

        bot_token_configurado = False
        if has_deploy_state:
            try:
                ds = json.loads(deploy_state.read_text(encoding="utf-8"))
                if ds.get("config", {}).get("TELEGRAM_BOT_TOKEN"):
                    bot_token_configurado = True
            except Exception:
                pass

        return {
            "total_modulos": len(modulos),
            "modulos": modulos,
            "total_linhas": total_linhas,
            "total_kb": round(total_bytes / 1024, 1),
            "master": master_info,
            "deploy_state_presente": has_deploy_state,
            "env_presente": has_env,
            "bot_token_configurado": bot_token_configurado
        }

    @staticmethod
    def audit_nutricao() -> Dict[str, Any]:
        """Audita script do Tenda, resumos gerados e Food Optimizer."""
        tenda_script = SCRIPTS_DIR / "tenda_compras_quinzenal.py"
        resumo_md = SCRIPTS_DIR / "compras_tenda_resumo.md"
        tenda_session = Path.home() / ".tenda_session.json"
        food_opt = SRC_DIR / "food_optimizer.py"

        resumo_info = {
            "existe": resumo_md.exists(),
            "tamanho_kb": round(resumo_md.stat().st_size / 1024, 1) if resumo_md.exists() else 0,
            "ultima_atualizacao": datetime.fromtimestamp(resumo_md.stat().st_mtime).strftime("%d/%m/%Y %H:%M:%S") if resumo_md.exists() else None
        }

        # Extrai contagem de itens do resumo se existir
        itens_resumo = 0
        if resumo_md.exists():
            try:
                texto = resumo_md.read_text(encoding="utf-8")
                itens_resumo = len(re.findall(r"^\|[^\|]+\|", texto, re.MULTILINE))
            except Exception:
                pass

        return {
            "tenda_script_existe": tenda_script.exists(),
            "food_optimizer_existe": food_opt.exists(),
            "sessao_tenda_ativa": tenda_session.exists(),
            "resumo": resumo_info,
            "itens_no_resumo": itens_resumo
        }

    @staticmethod
    def audit_agenda() -> Dict[str, Any]:
        """Audita tokens de API do Google Calendar e backups MedQuest."""
        token_file = CALENDAR_DIR / "token.json"
        backups = sorted(glob.glob(str(CALENDAR_DIR / "medquest_backup_*.json")), reverse=True)

        token_info = {
            "existe": token_file.exists(),
            "ultima_modificacao": datetime.fromtimestamp(token_file.stat().st_mtime).strftime("%d/%m/%Y %H:%M:%S") if token_file.exists() else None,
            "valido": False
        }

        if token_file.exists():
            try:
                tk = json.loads(token_file.read_text(encoding="utf-8"))
                if "refresh_token" in tk or "token" in tk:
                    token_info["valido"] = True
            except Exception:
                pass

        return {
            "token": token_info,
            "total_backups_medquest": len(backups),
            "ultimo_backup": Path(backups[0]).name if backups else None,
            "scripts_disponiveis": [
                "sync_avancado_medquest.py",
                "check_overlaps.py",
                "reschedule_lunch_studies.py"
            ]
        }

    @staticmethod
    def audit_radar_voos() -> Dict[str, Any]:
        """Audita scripts de voos no Apps Script e pool SerpApi."""
        code_js = SCRIPTS_DIR / "voos_gas" / "Code.js"
        chaves_serpapi = 0
        destinos_mapeados = 0

        if code_js.exists():
            try:
                conteudo = code_js.read_text(encoding="utf-8")
                # Encontra array de chaves
                m_keys = re.findall(r'"([a-f0-9]{64})"', conteudo)
                chaves_serpapi = len(m_keys)
                # Encontra dicionário de destinos (suporta formato direto ou { texto: ... })
                m_dest = re.findall(r'"([a-z\s]+)":\s*(?:\{\s*texto:\s*)?"[🟢🟡🔴]', conteudo)
                destinos_mapeados = len(m_dest)
            except Exception:
                pass

        return {
            "script_existe": code_js.exists(),
            "chaves_serpapi_ativas": chaves_serpapi,
            "cota_mensal_total": chaves_serpapi * 250,
            "cota_diaria_total": chaves_serpapi * 8,
            "destinos_mapeados": destinos_mapeados
        }

    @staticmethod
    def audit_reviews() -> List[Dict[str, Any]]:
        """Lista os relatórios de auditorias recentes."""
        relatorios = []
        mds = sorted(glob.glob(str(REVIEWS_DIR / "*.md")), reverse=True)
        for m in mds[:10]:
            p = Path(m)
            relatorios.append({
                "arquivo": p.name,
                "tamanho_kb": round(p.stat().st_size / 1024, 1),
                "data": datetime.fromtimestamp(p.stat().st_mtime).strftime("%d/%m/%Y %H:%M")
            })
        return relatorios

    @classmethod
    def get_full_health(cls) -> Dict[str, Any]:
        """Retorna relatório holístico de saúde de todo o ecossistema."""
        bot = cls.audit_bot()
        nutricao = cls.audit_nutricao()
        agenda = cls.audit_agenda()
        voos = cls.audit_radar_voos()
        reviews = cls.audit_reviews()

        # Calcula score de saúde (0 a 100)
        score = 0
        if bot["total_modulos"] >= 13: score += 25
        if bot["master"]["existe"]: score += 20
        if bot["bot_token_configurado"]: score += 15
        if nutricao["tenda_script_existe"]: score += 10
        if nutricao["resumo"]["existe"]: score += 10
        if agenda["token"]["valido"]: score += 10
        if voos["chaves_serpapi_ativas"] >= 4: score += 10

        return {
            "score_geral": score,
            "status_geral": "Operacional" if score >= 80 else ("Atenção" if score >= 50 else "Crítico"),
            "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "bot": bot,
            "nutricao": nutricao,
            "agenda": agenda,
            "voos": voos,
            "reviews": reviews,
            "python_bin": PYTHON_BIN
        }
