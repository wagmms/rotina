"""
PRIME REPORTER 2.0 (prime_reporter.py)
Gerador de relatórios executivos e técnicos (Terminal ANSI, JSON e Markdown).
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any
from .ux_heuristics import UXHeuristicsAuditor


class PrimeReporter:
    def __init__(self, root_dir: Path, ux_auditor: UXHeuristicsAuditor):
        self.root_dir = root_dir
        self.ux = ux_auditor

    def generate_all(self, tg_report: Dict[str, Any] | None, ck_report: Dict[str, Any] | None, elapsed_sec: float) -> Dict[str, Any]:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        tg_score = tg_report["taxa_sucesso_pct"] if tg_report else 100.0
        ck_score = ck_report["taxa_sucesso_api_pct"] if ck_report else 100.0

        # Penaliza score de UX com base em problemas críticos/altos e redundâncias
        ux_penalty = (
            sum(10 for f in self.ux.findings if f["severidade"] == "CRITICA") +
            sum(4 for f in self.ux.findings if f["severidade"] == "ALTA") +
            sum(2 for _ in self.ux.redundancies)
        )
        ux_score = max(0.0, round(100.0 - ux_penalty, 1))

        active_scores = [ux_score]
        if tg_report:
            active_scores.append(tg_score)
        if ck_report:
            active_scores.append(ck_score)

        prime_score = round(sum(active_scores) / len(active_scores), 1)

        consolidated = {
            "versao": "2.0.0",
            "timestamp": timestamp,
            "duracao_segundos": round(elapsed_sec, 2),
            "scores": {
                "prime_global_pct": prime_score,
                "telegram_pct": tg_score if tg_report else None,
                "cockpit_api_pct": ck_score if ck_report else None,
                "usabilidade_ux_pct": ux_score
            },
            "telegram": tg_report,
            "cockpit": ck_report,
            "achados_ux_e_erros": self.ux.findings,
            "redundancias_detectadas": self.ux.redundancies,
            "sugestoes_acionaveis": self.ux.suggestions
        }

        self._save_json(consolidated)
        self._save_markdown(consolidated)
        self._print_terminal_summary(consolidated)

        return consolidated

    def _save_json(self, data: Dict[str, Any]):
        out_dir = self.root_dir / "data"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "resultado_prime_2_0.json"
        out_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _save_markdown(self, data: Dict[str, Any]):
        docs_dir = self.root_dir / "docs"
        docs_dir.mkdir(parents=True, exist_ok=True)
        md_path = docs_dir / "RELATORIO_TESTADOR_PRIME_2_0.md"

        scores = data["scores"]
        tg = data.get("telegram")
        ck = data.get("cockpit")

        lines = [
            "# 🛡️ Relatório de Auditoria — Bot Testador Prime 2.0",
            "",
            f"- **Data da Execução:** `{data['timestamp']}`",
            f"- **Tempo Total:** `{data['duracao_segundos']}s`",
            f"- **Score Global Prime 2.0:** **{scores['prime_global_pct']}%**",
            "",
            "## 1. Painel de Saúde do Ecossistema",
            "",
            "| Motor Avaliado | Taxa de Sucesso / Score | Latência Média | Status |",
            "| :--- | :---: | :---: | :---: |",
        ]

        if tg:
            st_tg = "✅ Saudável" if tg["taxa_sucesso_pct"] >= 95 else "⚠️ Atenção"
            lines.append(f"| **Telegram Bot Engine** | `{tg['taxa_sucesso_pct']}%` ({tg['aprovados']}/{tg['total_testes']}) | `{tg['latencia_media_ms']} ms` | {st_tg} |")

        if ck:
            st_ck = "✅ Saudável" if ck["taxa_sucesso_api_pct"] >= 95 else "⚠️ Atenção"
            lines.append(f"| **Cockpit PWA & API Fastify** | `{ck['taxa_sucesso_api_pct']}%` ({ck['aprovados_api']}/{ck['total_testes_api']}) | `{ck['latencia_media_api_ms']} ms` | {st_ck} |")

        st_ux = "✅ Otimizado" if scores["usabilidade_ux_pct"] >= 85 else "🔧 Requer Refino"
        lines.append(f"| **Usabilidade & Anti-Redundância** | `{scores['usabilidade_ux_pct']}%` | — | {st_ux} |")
        lines.append("")

        # Seção do Cockpit DOM
        if ck and ck.get("dom_audit", {}).get("encontrado"):
            dom = ck["dom_audit"]
            lines.extend([
                "## 2. Auditoria Estática de DOM e Ergonomia Mobile (`cockpit_movel.html`)",
                "",
                f"- **Tamanho do Bundle HTML:** `{dom['tamanho_kb']} KB`",
                f"- **Total de Elementos com ID:** `{dom['total_ids']}` (IDs Duplicados: `{len(dom['ids_duplicados'])}`)",
                f"- **Total de Botões:** `{dom['total_botoes']}` (Botões Repetidos >= 3x: `{len(dom['botoes_repetidos'])}`)",
                f"- **Inputs sem Teclado Numérico (`inputmode=\"decimal\"`):** `{len(dom['inputs_sem_inputmode_decimal'])}`",
                f"- **Paridade com `gh_cockpit_deploy/index.html`:** `{'✅ Sincronizado' if dom['paridade_deploy_ok'] else '⚠️ Dessincronizado'}`",
                f"- **Funções RPC Mapeadas no Frontend:** `{', '.join(dom['chamadas_rpc_detectadas']) or 'Nenhuma'}`",
                ""
            ])

        # Seção de Redundâncias
        lines.extend([
            "## 3. Auditoria de Redundâncias (Botões, Fluxos e Telas)",
            ""
        ])
        if data["redundancias_detectadas"]:
            lines.append("| Origem | Contexto | Item Redundante | Detalhe Técnico |")
            lines.append("| :--- | :--- | :--- | :--- |")
            for r in data["redundancias_detectadas"]:
                lines.append(f"| {r['origem']} | `{r['contexto']}` | **{r['item']}** | {r['detalhe']} |")
        else:
            lines.append("✅ Nenhuma redundância crítica de botões ou ações duplicadas foi detectada neste ciclo.")
        lines.append("")

        # Seção de Erros e Achados de UX
        lines.extend([
            "## 4. Erros, Vazamentos Técnicos e Pontos de Atrito",
            ""
        ])
        if data["achados_ux_e_erros"]:
            lines.append("| Severidade | Motor | Contexto | Problema Detectado | Evidência |")
            lines.append("| :---: | :--- | :--- | :--- | :--- |")
            for f in data["achados_ux_e_erros"]:
                lines.append(f"| **{f['severidade']}** | `{f['motor']}` | `{f['contexto']}` | {f['problema']} | `{f['evidencia'][:80]}` |")
        else:
            lines.append("✅ Zero vazamentos técnicos (`undefined`, `NaN`, stack traces) ou falhas de rota.")
        lines.append("")

        # Seção de Sugestões Acionáveis
        lines.extend([
            "## 5. Sugestões Acionáveis de Melhoria (Padrão Arquitetural Ultra Rotina)",
            "",
            "> As sugestões abaixo foram geradas empiricamente pelos testes do **Prime 2.0** e estão formatadas para aplicação direta ou inclusão em `docs/SUGESTOES_FUTURAS.md`.",
            ""
        ])
        if data["sugestoes_acionaveis"]:
            for idx, s in enumerate(data["sugestoes_acionaveis"], 1):
                lines.extend([
                    f"### Sugestão #{idx} [{s['severidade']}] — `{s['componente']}`",
                    f"- **Arquivo Alvo:** `{s['arquivo_alvo']}`",
                    f"- **Componente/Função:** `{s['componente']}`",
                    f"- **Problema Identificado:** {s['problema']}",
                    f"- **Comportamento Esperado:** {s['comportamento_esperado']}",
                    ""
                ])
        else:
            lines.append("Nenhuma sugestão pendente — todos os indicadores atingiram 100% de conformidade.")

        md_path.write_text("\n".join(lines), encoding="utf-8")

    def _print_terminal_summary(self, data: Dict[str, Any]):
        scores = data["scores"]
        print("\n" + "=" * 74)
        print(" 🚀 BOT TESTADOR PRIME 2.0 — PAINEL DE AUDITORIA ULTRA ROTINA")
        print("=" * 74)
        print(f" ⏱️  Duração: {data['duracao_segundos']}s | 🏆 Score Global Prime: {scores['prime_global_pct']}%")
        print("-" * 74)
        if data.get("telegram"):
            tg = data["telegram"]
            print(f" 🤖 Telegram Bot Engine : {tg['taxa_sucesso_pct']}% ({tg['aprovados']}/{tg['total_testes']} ok) | Latência Média: {tg['latencia_media_ms']}ms")
        if data.get("cockpit"):
            ck = data["cockpit"]
            print(f" 📱 Cockpit & Fastify API: {ck['taxa_sucesso_api_pct']}% ({ck['aprovados_api']}/{ck['total_testes_api']} ok) | Latência Média: {ck['latencia_media_api_ms']}ms")
        print(f" 🧠 Usabilidade & UX     : {scores['usabilidade_ux_pct']}% | Redundâncias: {len(data['redundancias_detectadas'])} | Sugestões: {len(data['sugestoes_acionaveis'])}")
        print("-" * 74)

        if data["sugestoes_acionaveis"]:
            print(" 💡 PRINCIPAIS SUGESTÕES GERADAS COM BASE NOS TESTES:")
            for s in data["sugestoes_acionaveis"][:5]:
                print(f"   • [{s['severidade']}] {s['arquivo_alvo']} ({s['componente']}): {s['comportamento_esperado']}")
            print("-" * 74)

        print(" 📄 Relatório Markdown : docs/RELATORIO_TESTADOR_PRIME_2_0.md")
        print(" 📊 Telemetria JSON    : data/resultado_prime_2_0.json")
        print("=" * 74 + "\n")
