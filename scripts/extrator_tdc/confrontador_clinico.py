#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Confrontador e Auditor Clínico: Tá de Clinicagem (SQLite FTS5) vs Bot de Rotina (JS)
Objetivo: Detectar divergências de posologia, pontos de corte de calculadoras,
critérios diagnósticos desatualizados e condutas ausentes no Bot de Rotina.
"""

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    console = None


DEFAULT_DB_PATH = Path("data/tdc_knowledge.db")
DEFAULT_BOT_JS_PATH = Path("src/02_calculadoras_puras.js")
DEFAULT_REPORT_PATH = Path("data/relatorio_auditoria.md")


# Mapa de sinônimos e termos de busca FTS5 para calculadoras e protocolos clássicos
CLINICAL_TOPIC_MAP: Dict[str, Dict[str, str]] = {
    "curb65": {
        "nome": "CURB-65 (Pneumonia Adquirida na Comunidade)",
        "fts_query": "CURB-65 OR CURB65 OR pneumonia adquirida comunidade",
    },
    "qsofa": {
        "nome": "qSOFA / SOFA (Sepse e Choque Séptico)",
        "fts_query": "qSOFA OR SOFA OR sepse OR choque septico",
    },
    "wells": {
        "nome": "Escore de Wells (TEP / TVP)",
        "fts_query": "Wells OR tromboembolismo pulmonar OR TEP OR TVP",
    },
    "cha2ds2": {
        "nome": "CHA2DS2-VASc / Anticoagulação na FA",
        "fts_query": "CHA2DS2 OR fibrilacao atrial OR anticoagulacao",
    },
    "hasbled": {
        "nome": "HAS-BLED (Risco de Sangramento)",
        "fts_query": "HAS-BLED OR sangramento anticoagulacao",
    },
    "cockcroft": {
        "nome": " Clearance de Creatinina (Cockcroft-Gault / CKD-EPI)",
        "fts_query": "Cockcroft OR CKD-EPI OR taxa filtracao glomerular OR creatinina",
    },
    "child": {
        "nome": "Escore de Child-Pugh / MELD (Cirrose Hepática)",
        "fts_query": "Child-Pugh OR MELD OR cirrose",
    },
    "glasgow": {
        "nome": "Escala de Coma de Glasgow / TCE",
        "fts_query": "Glasgow OR traumatismo cranioencefalico",
    },
    "nihss": {
        "nome": "NIHSS / AVC Isquêmico Agudo e Trombólise",
        "fts_query": "NIHSS OR AVC isquemico OR alteplase OR tenecteplase",
    },
    "grace": {
        "nome": "Escore GRACE / HEART (Síndrome Coronariana Aguda)",
        "fts_query": "GRACE OR HEART OR sindrome coronariana aguda OR infarto",
    },
}


@dataclass
class BotFunctionSpec:
    func_name: str
    topic_key: str
    topic_title: str
    fts_query: str
    raw_code: str
    extracted_numbers: List[str] = field(default_factory=list)
    extracted_doses: List[str] = field(default_factory=list)
    extracted_Thresholds: List[str] = field(default_factory=list)


@dataclass
class AuditFinding:
    bot_function: str
    topic_title: str
    status: str  # "CONVERGENTE", "REVISAO_RECOMENDADA", "TOPICO_NAO_ENCONTRADO_NO_TDC"
    tdc_matches_count: int
    tdc_sources: List[Tuple[str, str, str]]  # (title, category, url)
    bot_doses_and_cutoffs: List[str]
    tdc_doses_and_cutoffs: List[str]
    divergences_notes: List[str]


class BotCodeAnalyzer:
    """Analisa estaticamente arquivos JS do Bot de Rotina para extrair funções, cortes e doses."""

    DOSE_PATTERN = re.compile(
        r"\b\d+(?:[.,]\d+)?\s*(?:mg/kg|mcg/kg/min|mg/dia|mg/dL|mEq/L|UI/kg|g/dia|mg|mcg|mL/h|UI)\b",
        re.IGNORECASE,
    )
    CUTOFF_PATTERN = re.compile(
        r"(?:>=|<=|>|<|===|==)\s*\d+(?:\.\d+)?",
    )

    @classmethod
    def parse_js_file(cls, js_path: Path) -> List[BotFunctionSpec]:
        if not js_path.exists():
            raise FileNotFoundError(f"Arquivo do bot não encontrado: {js_path}")

        content = js_path.read_text(encoding="utf-8", errors="replace")
        specs: List[BotFunctionSpec] = []

        # Captura funções nomeadas, arrow functions exportadas ou métodos de objeto
        func_regex = re.compile(
            r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{|"
            r"(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{",
            re.MULTILINE,
        )

        matches = list(func_regex.finditer(content))
        for i, match in enumerate(matches):
            fn_name = match.group(1) or match.group(2)
            start_idx = match.start()
            end_idx = matches[i + 1].start() if i + 1 < len(matches) else min(len(content), start_idx + 4000)
            snippet = content[start_idx:end_idx]

            topic_key, topic_info = cls._match_clinical_topic(fn_name, snippet)
            doses = sorted(set(cls.DOSE_PATTERN.findall(snippet)))
            cutoffs = sorted(set(cls.CUTOFF_PATTERN.findall(snippet)))

            specs.append(
                BotFunctionSpec(
                    func_name=fn_name,
                    topic_key=topic_key,
                    topic_title=topic_info["nome"],
                    fts_query=topic_info["fts_query"],
                    raw_code=snippet,
                    extracted_doses=doses,
                    extracted_Thresholds=cutoffs,
                )
            )

        return specs

    @staticmethod
    def _match_clinical_topic(fn_name: str, code_snippet: str) -> Tuple[str, Dict[str, str]]:
        combined = f"{fn_name} {code_snippet[:400]}".lower()
        for key, info in CLINICAL_TOPIC_MAP.items():
            if key in combined:
                return key, info

        # Tópico dinâmico derivado do nome da função (camelCase -> palavras)
        words = re.sub(r"([a-z])([A-Z])", r"\1 \2", fn_name).replace("_", " ").strip()
        clean_words = [w for w in words.split() if len(w) > 3 and w.lower() not in ("calc", "calcular", "score", "escore")]
        fts_q = " OR ".join(clean_words) if clean_words else fn_name
        return fn_name.lower(), {"nome": f"Função `{fn_name}`", "fts_query": fts_q}


class ClinicalAuditor:
    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        if not self.db_path.exists():
            raise FileNotFoundError(
                f"Banco SQLite FTS5 não encontrado em {self.db_path}. Execute `extrator.py` primeiro."
            )

    def _query_tdc(self, fts_query: str, limit: int = 5) -> List[sqlite3.Row]:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            # Sanitiza query para FTS5
            safe_q = re.sub(r"[^\w\s\-OR]", " ", fts_query).strip()
            if not safe_q:
                return []
            cursor = conn.execute(
                """
                SELECT d.title, d.category, d.specialty, d.url, d.markdown_content, d.tables_json
                FROM clinical_documents_fts f
                JOIN clinical_documents d ON d.id = f.rowid
                WHERE clinical_documents_fts MATCH ?
                ORDER BY bm25(clinical_documents_fts, 5.0, 2.0, 1.5, 2.0, 1.0)
                LIMIT ?
                """,
                (safe_q, limit),
            )
            return cursor.fetchall()
        except sqlite3.OperationalError:
            return []
        finally:
            conn.close()

    def audit_function(self, spec: BotFunctionSpec) -> AuditFinding:
        rows = self._query_tdc(spec.fts_query)
        if not rows:
            return AuditFinding(
                bot_function=spec.func_name,
                topic_title=spec.topic_title,
                status="TOPICO_NAO_ENCONTRADO_NO_TDC",
                tdc_matches_count=0,
                tdc_sources=[],
                bot_doses_and_cutoffs=spec.extracted_doses + spec.extracted_Thresholds,
                tdc_doses_and_cutoffs=[],
                divergences_notes=["Nenhum documento correspondente localizado na base FTS5 para esta função."],
            )

        sources = [(r["title"], r["category"], r["url"]) for r in rows]
        combined_tdc_text = "\n".join(r["markdown_content"] for r in rows)

        tdc_doses = sorted(set(BotCodeAnalyzer.DOSE_PATTERN.findall(combined_tdc_text)))
        notes: List[str] = []

        # Verificação cruzada de posologias e unidades
        if spec.extracted_doses:
            missing_in_tdc = [d for d in spec.extracted_doses if d.lower() not in combined_tdc_text.lower()]
            if missing_in_tdc:
                notes.append(
                    f"Posologias/Unidades presentes no Bot mas não idênticas no texto do TdC: {', '.join(missing_in_tdc)}"
                )

        # Verificação de diretrizes modernas mencionadas no TdC
        modern_markers = [
            ("tenecteplase", "TdC menciona Tenecteplase; verificar se o protocolo de trombólise do Bot contempla além da Alteplase."),
            ("ckd-epi 2021", "TdC cita CKD-EPI 2021 (sem fator racial); verificar se a calculadora renal do Bot usa a equação atualizada."),
            ("surviving sepsis 2021", "TdC referencia Surviving Sepsis 2021 (qSOFA não recomendado isoladamente como triagem única)."),
            ("gold 2024", "TdC menciona atualização GOLD (classificação ABE na DPOC); auditar classificação no Bot."),
            ("gina 2024", "TdC menciona diretriz GINA atualizada (CI + Formoterol de alívio preferencial)."),
        ]
        lower_tdc = combined_tdc_text.lower()
        lower_bot = spec.raw_code.lower()
        for keyword, warning_msg in modern_markers:
            if keyword in lower_tdc and keyword not in lower_bot:
                notes.append(warning_msg)

        status = "REVISAO_RECOMENDADA" if notes else "CONVERGENTE"
        if not notes:
            notes.append("Tópico respaldado na base TdC sem alertas críticos imediatos.")

        return AuditFinding(
            bot_function=spec.func_name,
            topic_title=spec.topic_title,
            status=status,
            tdc_matches_count=len(rows),
            tdc_sources=sources,
            bot_doses_and_cutoffs=(spec.extracted_doses + spec.extracted_Thresholds)[:12],
            tdc_doses_and_cutoffs=tdc_doses[:15],
            divergences_notes=notes,
        )

    def find_missing_high_value_topics(self, existing_specs: List[BotFunctionSpec]) -> List[Dict[str, str]]:
        """Lista fluxogramas e revisões de beira-leito presentes no TdC que ainda não possuem função no Bot."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        existing_keywords = " ".join(s.func_name.lower() for s in existing_specs)

        rows = conn.execute(
            """
            SELECT title, category, specialty, url
            FROM clinical_documents
            WHERE category IN ('fluxogramas', 'revisoes')
            ORDER BY id DESC
            LIMIT 30
            """
        ).fetchall()
        conn.close()

        suggestions = []
        for r in rows:
            title_words = [w.lower() for w in re.findall(r"\w+", r["title"]) if len(w) > 4]
            if not any(w in existing_keywords for w in title_words):
                suggestions.append(
                    {
                        "title": r["title"],
                        "category": r["category"],
                        "specialty": r["specialty"],
                        "url": r["url"],
                    }
                )
        return suggestions[:15]


def generate_markdown_report(
    findings: List[AuditFinding],
    missing_topics: List[Dict[str, str]],
    output_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Relatório de Auditoria e Confrontação Clínica (TdC vs Bot de Rotina)",
        f"**Gerado em:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`\n",
        "## 1. Resumo Executivo",
        f"- **Funções Auditadas no Bot:** {len(findings)}",
        f"- **Convergentes:** {sum(1 for f in findings if f.status == 'CONVERGENTE')}",
        f"- **Revisão Recomendada:** {sum(1 for f in findings if f.status == 'REVISAO_RECOMENDADA')}",
        f"- **Sem Correspondência Direta no Banco:** {sum(1 for f in findings if f.status == 'TOPICO_NAO_ENCONTRADO_NO_TDC')}\n",
        "---",
        "## 2. Confrontação Detalhada por Calculadora / Protocolo\n",
    ]

    for f in findings:
        badge = "🟢 CONVERGENTE" if f.status == "CONVERGENTE" else (
            "🟡 REVISÃO RECOMENDADA" if f.status == "REVISAO_RECOMENDADA" else "⚪ SEM MATCH FTS5"
        )
        lines.append(f"### `{f.bot_function}` — {f.topic_title} [{badge}]")
        lines.append(f"- **Cortes/Doses detectados no Bot:** `{', '.join(f.bot_doses_and_cutoffs) or 'N/A'}`")
        lines.append(f"- **Doses/Unidades extraídas no TdC:** `{', '.join(f.tdc_doses_and_cutoffs) or 'N/A'}`")
        lines.append("- **Notas de Auditoria:**")
        for note in f.divergences_notes:
            lines.append(f"  - {note}")
        if f.tdc_sources:
            lines.append("- **Referências no Banco Local TdC:**")
            for title, cat, url in f.tdc_sources:
                lines.append(f"  - [{cat.upper()}] [{title}]({url})")
        lines.append("")

    lines.append("---")
    lines.append("## 3. Protocolos e Fluxogramas do TdC Sugeridos para Expansão do Bot\n")
    if missing_topics:
        for item in missing_topics:
            lines.append(
                f"- **[{item['specialty']} / {item['category']}]** {item['title']} — [Link]({item['url']})"
            )
    else:
        lines.append("- Nenhuma sugestão adicional no momento.")

    output_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Confrontador Clínico TdC vs Bot de Rotina")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Caminho do banco SQLite do TdC")
    parser.add_argument("--bot-js", type=Path, default=DEFAULT_BOT_JS_PATH, help="Arquivo JS das calculadoras do Bot")
    parser.add_argument("--out", type=Path, default=DEFAULT_REPORT_PATH, help="Caminho do relatório Markdown gerado")
    args = parser.parse_args()

    specs = BotCodeAnalyzer.parse_js_file(args.bot_js)
    auditor = ClinicalAuditor(args.db)

    findings = [auditor.audit_function(s) for s in specs]
    missing = auditor.find_missing_high_value_topics(specs)

    generate_markdown_report(findings, missing, args.out)

    if RICH_AVAILABLE:
        table = Table(title="Auditoria Clínica: Bot de Rotina vs Tá de Clinicagem")
        table.add_column("Função JS", style="cyan")
        table.add_column("Tópico Clínico", style="white")
        table.add_column("Status", style="bold")
        table.add_column("Fontes TdC", justify="right")

        for f in findings:
            color = "green" if f.status == "CONVERGENTE" else ("yellow" if f.status == "REVISAO_RECOMENDADA" else "dim")
            table.add_row(f.bot_function, f.topic_title, f"[{color}]{f.status}[/{color}]", str(f.tdc_matches_count))

        console.print(table)
        console.print(Panel(f"Relatório completo salvo em: [bold green]{args.out}[/bold green]", border_style="green"))
    else:
        print(f"Auditoria concluída. Relatório salvo em: {args.out}")


if __name__ == "__main__":
    main()