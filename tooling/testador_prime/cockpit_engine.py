"""
COCKPIT ENGINE PRIME 2.0 (cockpit_engine.py)
Auditoria completa da interface web móvel (Cockpit PWA) e da API Fastify:
1. Auditoria Estática de DOM/HTML (IDs duplicados, ergonomia de inputs mobile, botões redundantes).
2. Paridade de Deploy (`cockpit_movel.html` vs `gh_cockpit_deploy/index.html`).
3. Testes de Integração RPC (`POST /api/cockpit`) e REST (`/api/rotina/*`, `/health`, `/cockpit`).
"""

import os
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Any, List
from .ux_heuristics import UXHeuristicsAuditor


class CockpitDOMParser(HTMLParser):
    """Analisa o HTML do Cockpit para extrair IDs, botões, inputs e abas."""
    def __init__(self):
        super().__init__()
        self.ids: List[str] = []
        self.buttons: List[Dict[str, Any]] = []
        self.inputs: List[Dict[str, Any]] = []
        self.tabs: List[str] = []
        self._current_btn: Dict[str, Any] | None = None

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        attr_dict = dict(attrs)
        el_id = attr_dict.get("id")
        if el_id:
            self.ids.append(el_id)
            if el_id.startswith("tab-") or "tab" in attr_dict.get("class", ""):
                self.tabs.append(el_id)

        if tag == "button":
            self._current_btn = {
                "id": el_id or "",
                "class": attr_dict.get("class", ""),
                "onclick": attr_dict.get("onclick", ""),
                "type": attr_dict.get("type", "button"),
                "text": ""
            }
        elif tag in ("input", "select", "textarea"):
            self.inputs.append({
                "tag": tag,
                "id": el_id or "",
                "name": attr_dict.get("name", ""),
                "type": attr_dict.get("type", "text"),
                "inputmode": attr_dict.get("inputmode", ""),
                "placeholder": attr_dict.get("placeholder", "")
            })

    def handle_data(self, data: str):
        if self._current_btn is not None:
            self._current_btn["text"] += data.strip() + " "

    def handle_endtag(self, tag: str):
        if tag == "button" and self._current_btn is not None:
            self._current_btn["text"] = self._current_btn["text"].strip()
            self.buttons.append(self._current_btn)
            self._current_btn = None


class CockpitEnginePrime:
    def __init__(self, root_dir: Path, send_bridge_cmd, ux_auditor: UXHeuristicsAuditor, verbose: bool = False):
        self.root_dir = root_dir
        self.send_cmd = send_bridge_cmd
        self.ux = ux_auditor
        self.verbose = verbose
        self.api_results: List[Dict[str, Any]] = []
        self.dom_summary: Dict[str, Any] = {}

    def run_all(self) -> Dict[str, Any]:
        self._audit_static_html()
        self._test_http_and_rpc_endpoints()

        total_api = len(self.api_results)
        passed_api = sum(1 for r in self.api_results if r["sucesso"])
        avg_latency = round(sum(r["latencia_ms"] for r in self.api_results) / max(1, total_api), 2)

        return {
            "dom_audit": self.dom_summary,
            "total_testes_api": total_api,
            "aprovados_api": passed_api,
            "falhas_api": total_api - passed_api,
            "taxa_sucesso_api_pct": round((passed_api / max(1, total_api)) * 100, 1),
            "latencia_media_api_ms": avg_latency,
            "execucoes_api": self.api_results
        }

    def _audit_static_html(self):
        """Audita o arquivo cockpit_movel.html e sua paridade com gh_cockpit_deploy/index.html."""
        cockpit_path = self.root_dir / "cockpit_movel.html"
        deploy_path = self.root_dir / "gh_cockpit_deploy" / "index.html"

        if not cockpit_path.exists():
            self.ux.add_finding(
                severity="CRITICA",
                engine="Cockpit/DOM",
                context="cockpit_movel.html",
                issue="Arquivo principal do Cockpit não encontrado na raiz do projeto."
            )
            self.dom_summary = {"encontrado": False}
            return

        html_content = cockpit_path.read_text(encoding="utf-8", errors="replace")
        parser = CockpitDOMParser()
        parser.feed(html_content)

        # 1. Verifica IDs duplicados no HTML
        seen_ids = set()
        duplicate_ids = []
        for el_id in parser.ids:
            if el_id in seen_ids and el_id not in duplicate_ids:
                duplicate_ids.append(el_id)
            seen_ids.add(el_id)

        if duplicate_ids:
            self.ux.add_finding(
                severity="ALTA",
                engine="Cockpit/DOM",
                context="cockpit_movel.html",
                issue=f"IDs HTML duplicados encontrados ({len(duplicate_ids)}): {', '.join(duplicate_ids[:8])}",
                evidence="document.getElementById retornará apenas o primeiro elemento, quebrando scripts."
            )
            self.ux.add_suggestion(
                severity="ALTA",
                target_file="cockpit_movel.html",
                component=f"Elementos com IDs: {', '.join(duplicate_ids[:5])}",
                problem="Existência de múltiplos elementos DOM compartilhando o mesmo atributo `id`.",
                expected_behavior="Garantir unicidade estrita de todos os IDs no HTML do Cockpit."
            )

        # 2. Verifica botões redundantes ou sem rótulo/ação clara
        btn_labels = {}
        empty_buttons = 0
        for btn in parser.buttons:
            txt = btn["text"].strip()
            if not txt and not btn["id"]:
                empty_buttons += 1
            elif txt:
                btn_labels[txt] = btn_labels.get(txt, 0) + 1

        repeated_buttons = [k for k, v in btn_labels.items() if v >= 3 and len(k) > 3]
        if repeated_buttons:
            for rb in repeated_buttons:
                self.ux.redundancies.append({
                    "origem": "Cockpit HTML",
                    "contexto": "cockpit_movel.html",
                    "item": f"Botão '{rb}' ({btn_labels[rb]}x)",
                    "detalhe": "Mesmo botão repetido em múltiplas seções/abas da interface móvel."
                })
            self.ux.add_suggestion(
                severity="MELHORIA_UX",
                target_file="cockpit_movel.html",
                component="Barra de Ações / Botões de Abas",
                problem=f"Botões repetidos múltiplas vezes no DOM: {', '.join(repeated_buttons[:5])}.",
                expected_behavior="Transformar ações globais recorrentes em um único componente compartilhado ou barra inferior fixa."
            )

        # 3. Ergonomia de Inputs Clínicos (peso, idade, creatinina, dose)
        numeric_keywords = ("peso", "idade", "creat", "dose", "ampola", "vazao", "volume", "fc", "pa", "glasgow")
        inputs_missing_numeric_mode = []
        for inp in parser.inputs:
            ident = f"{inp['id']} {inp['name']} {inp['placeholder']}".lower()
            if any(k in ident for k in numeric_keywords):
                if inp["type"] not in ("number", "tel", "range") and inp["inputmode"] not in ("decimal", "numeric"):
                    inputs_missing_numeric_mode.append(inp["id"] or inp["name"] or inp["placeholder"])

        if inputs_missing_numeric_mode:
            self.ux.add_suggestion(
                severity="MELHORIA_UX",
                target_file="cockpit_movel.html",
                component=f"Inputs clínicos ({', '.join(inputs_missing_numeric_mode[:5])})",
                problem="Campos numéricos clínicos não abrem o teclado numérico decimal automaticamente no celular.",
                expected_behavior="Adicionar `inputmode=\"decimal\"` nos inputs de peso, creatinina e doses para economizar toques na beira do leito."
            )

        # 4. Verifica paridade entre cockpit_movel.html e gh_cockpit_deploy/index.html
        parity_ok = True
        if deploy_path.exists():
            deploy_content = deploy_path.read_text(encoding="utf-8", errors="replace")
            if len(deploy_content) != len(html_content):
                parity_ok = False
                self.ux.add_finding(
                    severity="MEDIA",
                    engine="Cockpit/Parity",
                    context="cockpit_movel.html vs gh_cockpit_deploy/index.html",
                    issue="Diferença de tamanho/conteúdo detectada entre o Cockpit raiz e o pacote de deploy.",
                    evidence=f"Raiz: {len(html_content)} bytes | Deploy: {len(deploy_content)} bytes"
                )
                self.ux.add_suggestion(
                    severity="MEDIA",
                    target_file="gh_cockpit_deploy/index.html",
                    component="Sincronização de Deploy PWA",
                    problem="O arquivo `gh_cockpit_deploy/index.html` está dessincronizado em relação a `cockpit_movel.html`.",
                    expected_behavior="Sincronizar ambos os arquivos ou automatizar a cópia no script de build/deploy."
                )

        # 5. Extrai chamadas RPC declaradas no JS do Cockpit
        rpc_calls = sorted(set(re.findall(r"cockpit[A-Z][a-zA-Z0-9_]+", html_content)))

        self.dom_summary = {
            "encontrado": True,
            "tamanho_kb": round(len(html_content) / 1024, 1),
            "total_ids": len(parser.ids),
            "ids_duplicados": duplicate_ids,
            "total_botoes": len(parser.buttons),
            "botoes_repetidos": repeated_buttons,
            "total_inputs": len(parser.inputs),
            "inputs_sem_inputmode_decimal": inputs_missing_numeric_mode,
            "paridade_deploy_ok": parity_ok,
            "chamadas_rpc_detectadas": rpc_calls
        }

    def _call_api(self, label: str, method: str, url: str, payload: Dict[str, Any] | None = None, auth: bool = True, expected_status: int = 200):
        res = self.send_cmd({
            "cmd": "COCKPIT_HTTP",
            "method": method,
            "url": url,
            "payload": payload,
            "auth": auth
        })
        status = res.get("status", 500)
        latency = res.get("latency_ms", 0.0)
        body = res.get("body")
        body_str = str(body) if body is not None else ""

        is_html = isinstance(body, str) and ("<!DOCTYPE" in body or "<html" in body)
        leaks = []
        if not is_html:
            leaks = self.ux.inspect_text_for_leaks(body_str, context=f"Cockpit API: {label}", target_file="server/index.js")

        success = (status == expected_status) and (len(leaks) == 0)

        if not success and expected_status == 200:
            self.ux.add_finding(
                severity="ALTA",
                engine="Cockpit/API",
                context=f"{method} {url} ({label})",
                issue=f"Status HTTP {status} (esperado {expected_status}).",
                evidence=body_str[:160]
            )

        rec = {
            "cenario": label,
            "metodo": method,
            "url": url,
            "status_http": status,
            "status_esperado": expected_status,
            "sucesso": success,
            "latencia_ms": latency,
            "vazamentos": leaks,
            "amostra_resposta": body_str[:160].replace("\n", " ")
        }
        self.api_results.append(rec)
        return rec

    def _test_http_and_rpc_endpoints(self):
        """Testa rotas públicas, autenticação, RPC /api/cockpit e endpoints REST de rotina."""
        # 1. Health & Interface Web
        self._call_api("Healthcheck (/health)", "GET", "/health", auth=False, expected_status=200)
        self._call_api("Servir Cockpit HTML (/cockpit)", "GET", "/cockpit", auth=False, expected_status=200)

        # 2. Segurança / Autenticação da API do Cockpit
        self._call_api("Segurança: RPC sem Token (Deve retornar 401)", "POST", "/api/cockpit", payload={"metodo": "cockpitConsultar", "session": ""}, auth=False, expected_status=401)

        # 3. Chamadas RPC reais do Cockpit
        rpc_tests = [
            ("RPC: Calcular Noradrenalina 70kg (DVA)", {"metodo": "cockpitCalcular", "args": ["dva", {"droga": "nora", "peso": 70}]}),
            ("RPC: Calcular IOT 80kg (SRI)", {"metodo": "cockpitCalcular", "args": ["sri", {"peso": 80, "cenario": "padrao"}]}),
            ("RPC: Calcular Clearance Creatinina", {"metodo": "cockpitCalcular", "args": ["crcl", {"peso": 75, "idade": 60, "creatinina": 1.4, "sexo": "m"}]}),
            ("RPC: Consultar Protocolo Clínico", {"metodo": "cockpitConsultar", "args": ["sepse"]}),
            ("RPC: Busca REMUME Medicamentos", {"metodo": "cockpitRemume", "args": ["amiodarona"]}),
        ]

        for label, payload in rpc_tests:
            self._call_api(label, "POST", "/api/cockpit", payload=payload, auth=True, expected_status=200)

        # 4. Endpoints REST de Rotina e Status
        rest_tests = [
            ("REST: Listar Blocos de Rotina (/api/rotina/blocos)", "GET", "/api/rotina/blocos"),
            ("REST: Resumo da Rotina (/api/rotina/resumo)", "GET", "/api/rotina/resumo"),
            ("REST: Status da Agenda Google (/api/rotina/calendar/status)", "GET", "/api/rotina/calendar/status"),
            ("REST: Status Geral do Sistema (/api/status)", "GET", "/api/status"),
        ]
        for label, method, url in rest_tests:
            self._call_api(label, method, url, auth=True, expected_status=200)
