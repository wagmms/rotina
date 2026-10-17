#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrator Estruturado de Conhecimento Médico - Tá de Clinicagem (TdC)
Arquitetura: Async HTTPX + BeautifulSoup4 + SQLite WAL/FTS5
Regras: Zero vídeos, zero imagens/logos, rate-limiting defensivo com backoff exponencial,
        foco estrito em texto clínico estruturado (Markdown), tabelas e fluxogramas.
"""

import argparse
import asyncio
import hashlib
import json
import os
import random
import re
import sqlite3
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, NavigableString, Tag

# Importação condicional do Rich para UI de terminal elegante com fallback limpo
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import (
        BarColumn,
        MofNCompleteColumn,
        Progress,
        SpinnerColumn,
        TextColumn,
        TimeElapsedColumn,
    )
    from rich.table import Table

    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    console = None

# Importação condicional do dotenv
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


# ============================================================================
# CONFIGURAÇÕES GLOBAIS E CONSTANTES
# ============================================================================
BASE_URL = "https://www.tadeclinicagem.com.br"
DOMAIN = "tadeclinicagem.com.br"

ENDPOINTS_SEMENTE: Dict[str, str] = {
    # Acervo Central e Busca Completa de Tópicos (~63 páginas / 600+ tópicos)
    "topicos": "/guia/topicos-search/",
    "guia_hub": "/guia/",
    "edition": "/guia/edition/",
    "revisoes": "/guia/revisoes/",
    "fluxogramas": "/guia/fluxogramas/",
    "glossario": "/guia/glossario/",
    "casos": "/guia/casos/",
    "flashcard": "/guia/flashcard/",
    "colecoes": "/guia/colecoes/",
    "questoes": "/guia/lista-questoes/",
    # 21 Subespecialidades Clínicas
    "subesp_cardiologia": "/guia/cardiologia/subespecialidades/",
    "subesp_pneumologia": "/guia/pneumologia/subespecialidades/",
    "subesp_infectologia": "/guia/infectologia/subespecialidades/",
    "subesp_nefrologia": "/guia/nefrologia/subespecialidades/",
    "subesp_neurologia": "/guia/neurologia/subespecialidades/",
    "subesp_gastroenterologia": "/guia/gastroenterologia/subespecialidades/",
    "subesp_endocrinologia": "/guia/endocrinologia/subespecialidades/",
    "subesp_hematologia": "/guia/hematologia/subespecialidades/",
    "subesp_reumatologia": "/guia/reumatologia/subespecialidades/",
    "subesp_terapia_intensiva": "/guia/terapia-intensiva/subespecialidades/",
    "subesp_emergencia": "/guia/emergencia/subespecialidades/",
    "subesp_geriatria": "/guia/geriatria/subespecialidades/",
    "subesp_hepatologia": "/guia/hepatologia/subespecialidades/",
    "subesp_oncologia": "/guia/oncologia/subespecialidades/",
    "subesp_psiquiatria": "/guia/psiquiatria/subespecialidades/",
    "subesp_dermatologia": "/guia/dermatologia/subespecialidades/",
    "subesp_cuidados_paliativos": "/guia/cuidados-paliativos/subespecialidades/",
    "subesp_perioperatorio": "/guia/perioperatorio/subespecialidades/",
    "subesp_ginecologia_obstetricia": "/guia/ginecologia-e-obstetricia/subespecialidades/",
    "subesp_pediatria": "/guia/pediatria/subespecialidades/",
    "subesp_clinica_medica": "/guia/clinica-medica/subespecialidades/",
}

DEFAULT_DB_PATH = Path("data/tdc_knowledge.db")
DEFAULT_CONCURRENCY = 4
DEFAULT_MIN_DELAY = 0.3
DEFAULT_MAX_DELAY = 0.8
DEFAULT_MAX_PAGES_PER_CAT = 10000
MAX_RETRIES = 4
REQUEST_TIMEOUT = 30.0

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0"
)


# ============================================================================
# UTILITÁRIOS DE LOG
# ============================================================================
def log_info(msg: str) -> None:
    if RICH_AVAILABLE and console is not None:
        console.log(f"[bold cyan][INFO][/bold cyan] {msg}")
    else:
        print(f"[INFO] {datetime.now(timezone.utc).isoformat()} - {msg}")


def log_warn(msg: str) -> None:
    if RICH_AVAILABLE and console is not None:
        console.log(f"[bold yellow][WARN][/bold yellow] {msg}")
    else:
        print(f"[WARN] {datetime.now(timezone.utc).isoformat()} - {msg}")


def log_error(msg: str) -> None:
    if RICH_AVAILABLE and console is not None:
        console.log(f"[bold red][ERRO][/bold red] {msg}")
    else:
        print(f"[ERRO] {datetime.now(timezone.utc).isoformat()} - {msg}", file=sys.stderr)


# ============================================================================
# MODELO DE DADOS CLÍNICOS
# ============================================================================
@dataclass
class ClinicalDocument:
    url: str
    slug: str
    category: str
    specialty: str
    title: str
    edition_date: str
    tags: List[str]
    markdown_content: str
    tables_json: str
    flowcharts_json: str
    content_hash: str
    extracted_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ============================================================================
# GERENCIADOR DE AUTENTICAÇÃO (OPERA + FALLBACK .ENV)
# ============================================================================
class AuthManager:
    REQUIRED_COOKIES = {"sessionid", "deep_membership", "csrftoken"}

    @classmethod
    def get_cookies(cls) -> Dict[str, str]:
        cookies: Dict[str, str] = {}

        # 1. Tentativa primária: Extração direta do Opera via rookiepy
        try:
            import rookiepy

            log_info("Extraindo credenciais de sessão do navegador Opera via rookiepy...")
            raw_cookies = rookiepy.opera([DOMAIN])
            for c in raw_cookies:
                name = c.get("name")
                value = c.get("value")
                if name and value:
                    cookies[name] = value

            found_keys = cls.REQUIRED_COOKIES.intersection(cookies.keys())
            if found_keys:
                log_info(f"Cookies obtidos via Opera: {', '.join(sorted(found_keys))}")
                return cookies
        except Exception as exc:
            log_warn(
                f"Falha ao ler cookies do Opera via rookiepy ({exc}). Tentando fallback .env..."
            )

        # 2. Fallback: Variáveis de ambiente (.env)
        env_map = {
            "sessionid": os.getenv("TDC_SESSIONID", "").strip(),
            "deep_membership": os.getenv("TDC_DEEP_MEMBERSHIP", "").strip(),
            "csrftoken": os.getenv("TDC_CSRFTOKEN", "").strip(),
        }
        for k, v in env_map.items():
            if v:
                cookies[k] = v

        if not cookies.get("sessionid"):
            raise RuntimeError(
                "Não foi possível obter 'sessionid' nem via rookiepy (Opera) nem via variáveis "
                "de ambiente (TDC_SESSIONID). Verifique se está logado no Opera ou configure o .env."
            )

        log_info("Credenciais carregadas via variáveis de ambiente (.env).")
        return cookies


# ============================================================================
# BANCO DE DADOS SQLITE (WAL + FTS5)
# ============================================================================
class KnowledgeVault:
    def __init__(self, db_path: Path = DEFAULT_DB_PATH) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=60.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA temp_store=MEMORY;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS clinical_documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL UNIQUE,
                    slug TEXT NOT NULL,
                    category TEXT NOT NULL,
                    specialty TEXT,
                    title TEXT NOT NULL,
                    edition_date TEXT,
                    tags_json TEXT,
                    markdown_content TEXT NOT NULL,
                    tables_json TEXT,
                    flowcharts_json TEXT,
                    content_hash TEXT NOT NULL,
                    extracted_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_clinical_category ON clinical_documents(category);
                CREATE INDEX IF NOT EXISTS idx_clinical_specialty ON clinical_documents(specialty);
                CREATE INDEX IF NOT EXISTS idx_clinical_hash ON clinical_documents(content_hash);

                -- Tabela Virtual FTS5 para busca em texto completo de alta precisão médica
                CREATE VIRTUAL TABLE IF NOT EXISTS clinical_documents_fts USING fts5(
                    title,
                    specialty,
                    category,
                    tags_json,
                    markdown_content,
                    content='clinical_documents',
                    content_rowid='id',
                    tokenize='unicode61 remove_diacritics 2'
                );

                -- Triggers de sincronização automática para o índice FTS5
                CREATE TRIGGER IF NOT EXISTS trg_clinical_ai AFTER INSERT ON clinical_documents BEGIN
                    INSERT INTO clinical_documents_fts(rowid, title, specialty, category, tags_json, markdown_content)
                    VALUES (new.id, new.title, new.specialty, new.category, new.tags_json, new.markdown_content);
                END;

                CREATE TRIGGER IF NOT EXISTS trg_clinical_ad AFTER DELETE ON clinical_documents BEGIN
                    INSERT INTO clinical_documents_fts(clinical_documents_fts, rowid, title, specialty, category, tags_json, markdown_content)
                    VALUES ('delete', old.id, old.title, old.specialty, old.category, old.tags_json, old.markdown_content);
                END;

                CREATE TRIGGER IF NOT EXISTS trg_clinical_au AFTER UPDATE ON clinical_documents BEGIN
                    INSERT INTO clinical_documents_fts(clinical_documents_fts, rowid, title, specialty, category, tags_json, markdown_content)
                    VALUES ('delete', old.id, old.title, old.specialty, old.category, old.tags_json, old.markdown_content);
                    INSERT INTO clinical_documents_fts(rowid, title, specialty, category, tags_json, markdown_content)
                    VALUES (new.id, new.title, new.specialty, new.category, new.tags_json, new.markdown_content);
                END;
                """
            )

    def get_existing_urls(self) -> Set[str]:
        """Retorna todos os URLs já persistidos no banco para retomada rápida."""
        with self._get_conn() as conn:
            rows = conn.execute("SELECT url FROM clinical_documents").fetchall()
            return {r["url"] for r in rows}

    def upsert_document(self, doc: ClinicalDocument) -> str:
        """Insere ou atualiza documento se o hash de conteúdo mudou. Retorna status."""
        with self._get_conn() as conn:
            cur = conn.execute(
                "SELECT id, content_hash FROM clinical_documents WHERE url = ?",
                (doc.url,),
            )
            row = cur.fetchone()

            if row and row["content_hash"] == doc.content_hash:
                return "unchanged"

            tags_str = json.dumps(doc.tags, ensure_ascii=False)

            if row:
                conn.execute(
                    """
                    UPDATE clinical_documents
                    SET slug = ?, category = ?, specialty = ?, title = ?,
                        edition_date = ?, tags_json = ?, markdown_content = ?,
                        tables_json = ?, flowcharts_json = ?, content_hash = ?,
                        extracted_at = ?
                    WHERE id = ?
                    """,
                    (
                        doc.slug,
                        doc.category,
                        doc.specialty,
                        doc.title,
                        doc.edition_date,
                        tags_str,
                        doc.markdown_content,
                        doc.tables_json,
                        doc.flowcharts_json,
                        doc.content_hash,
                        doc.extracted_at,
                        row["id"],
                    ),
                )
                return "updated"
            else:
                conn.execute(
                    """
                    INSERT INTO clinical_documents (
                        url, slug, category, specialty, title, edition_date,
                        tags_json, markdown_content, tables_json, flowcharts_json,
                        content_hash, extracted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        doc.url,
                        doc.slug,
                        doc.category,
                        doc.specialty,
                        doc.title,
                        doc.edition_date,
                        tags_str,
                        doc.markdown_content,
                        doc.tables_json,
                        doc.flowcharts_json,
                        doc.content_hash,
                        doc.extracted_at,
                    ),
                )
                return "inserted"

    def get_stats(self) -> Dict[str, int]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT category, COUNT(*) as qtd FROM clinical_documents GROUP BY category ORDER BY qtd DESC"
            ).fetchall()
            return {r["category"]: r["qtd"] for r in rows}


# ============================================================================
# PARSER INTELIGENTE HTML -> MARKDOWN CLÍNICO LIMPO
# ============================================================================
class ClinicalHTMLParser:
    FORBIDDEN_TAGS = {
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "header",
        "aside",
        "form",
        "button",
        "svg",
        "canvas",
        "video",
        "audio",
        "iframe",
        "embed",
        "object",
    }

    NOISE_SELECTORS = [
        ".navbar",
        ".footer",
        ".sidebar",
        ".menu",
        ".breadcrumbs",
        ".share-buttons",
        ".social-links",
        ".comments",
        ".related-posts",
        ".cookie-banner",
        ".modal",
        ".popup",
        ".ad-container",
        "[aria-hidden='true']",
        ".player",
        ".video-wrapper",
        ".watermark",
        ".pagination",
    ]

    SPECIALTIES_KEYWORDS = {
        "Cardiologia": [
            "insuficiência cardíaca",
            "síndrome coronariana",
            "fibrilação atrial",
            "ecg",
            "hipertensão",
            "cardiologia",
            "infarto",
            "arritmia",
            "valvopatia",
        ],
        "Pneumologia": [
            "asma",
            "dpoc",
            "pneumonia",
            "tromboembolismo pulmonar",
            "tep",
            "derrame pleural",
            "pneumologia",
            "espirometria",
            "hemoptise",
        ],
        "Infectologia": [
            "antibiótico",
            "sepse",
            "meningite",
            "endocardite",
            "hiv",
            "dengue",
            "infectologia",
            "antimicrobiano",
            "tuberculose",
            "arbovirose",
        ],
        "Nefrologia": [
            "lesão renal aguda",
            "doença renal crônica",
            "distúrbio hidroeletrolítico",
            "hiponatremia",
            "hipercalemia",
            "nefrologia",
            "diálise",
            "glomerulonefrite",
        ],
        "Neurologia": [
            "avc",
            "acidente vascular",
            "cefaleia",
            "epilepsia",
            "convulsão",
            "delirium",
            "neurologia",
            "demência",
            "neuropatia",
        ],
        "Gastroenterologia": [
            "cirrose",
            "pancreatite",
            "hemorragia digestiva",
            "doença inflamatória intestinal",
            "hepatite",
            "gastroenterologia",
            "ascite",
            "dispepsia",
        ],
        "Endocrinologia": [
            "diabetes",
            "cetoacidose",
            "tireoide",
            "hipotireoidismo",
            "hipertireoidismo",
            "insulina",
            "adrenal",
            "endocrinologia",
            "osteoporose",
        ],
        "Hematologia": [
            "anemia",
            "plaquetopenia",
            "anticoagulação",
            "transfusão",
            "linfoma",
            "leucemia",
            "hematologia",
            "neutropenia",
            "mieloma",
        ],
        "Reumatologia": [
            "lúpus",
            "artrite",
            "gota",
            "vasculite",
            "espondilite",
            "reumatologia",
            "fibromialgia",
        ],
        "Medicina Intensiva / Emergência": [
            "choque",
            "intubação",
            "ventilação mecânica",
            "droga vasoativa",
            "noradrenalina",
            "parada cardiorrespiratória",
            "sedação",
            "uti",
        ],
        "Geriatria / Cuidados Paliativos": [
            "geriatria",
            "cuidados paliativos",
            "fragilidade",
            "polifarmácia",
            "queda",
            "hipodermóclise",
        ],
        "Psiquiatria": [
            "depressão",
            "ansiedade",
            "bipolar",
            "esquizofrenia",
            "antipsicótico",
            "antidepressivo",
            "psiquiatria",
            "insônia",
        ],
    }

    @classmethod
    def parse_article(
        cls, html: str, url: str, category: str
    ) -> Optional[ClinicalDocument]:
        soup = BeautifulSoup(html, "html.parser")

        # 1. Extração de Metadados antes da limpeza destrutiva
        title = cls._extract_title(soup)
        if not title or len(title) < 3:
            return None

        edition_date = cls._extract_date(soup, html)
        tags = cls._extract_tags(soup)

        # 2. Localizar o container principal de conteúdo clínico
        main_container = (
            soup.find("article")
            or soup.find("main")
            or soup.find(
                "div",
                class_=re.compile(
                    r"(content|article|post|entry|guia|edition|body|topic|questao|card)",
                    re.I,
                ),
            )
            or soup.body
        )
        if not main_container:
            return None

        # 3. Sanitização estrutural (remove scripts, navegação, rodapé, trackers)
        for tag_name in cls.FORBIDDEN_TAGS:
            for t in main_container.find_all(tag_name):
                t.decompose()

        for selector in cls.NOISE_SELECTORS:
            for t in main_container.select(selector):
                t.decompose()

        # 3.1 Tratamento inteligente de Figuras e Fluxogramas Clínicos
        clinical_figures = []
        for img in main_container.find_all("img"):
            src = (img.get("src") or img.get("data-src") or "").strip()
            alt = (img.get("alt") or img.get("title") or "").strip()

            if not src or any(x in src.lower() for x in ["logo", "icon", "avatar", "profile", "data:image/svg"]):
                img.decompose()
                continue

            full_src = urljoin(url, src) if url else src
            alt_clean = alt if alt else f"Figura / Fluxograma Clínico ({title})"
            clinical_figures.append(f"\n**Descrição Clínica do Fluxograma / Tabela:** {alt_clean}\n\n![{alt_clean}]({full_src})\n")
            img.decompose()

        # 4. Extração estruturada de Tabelas e Fluxogramas Textuais
        tables_data = cls._extract_tables(main_container)
        flowcharts_data = cls._extract_flowcharts(main_container, category)

        # 5. Conversão limpa para Markdown Clínico
        md_lines = cls._dom_to_markdown(main_container)
        if clinical_figures:
            md_lines.extend(clinical_figures)

        markdown_content = cls._clean_markdown("\n".join(md_lines))

        # Trava mínima adaptativa: fluxogramas são concisos (título + figura + alt)
        is_flowchart = category == "fluxogramas" or "/fluxogramas/" in url.lower()
        min_len = 25 if is_flowchart else 80
        if len(markdown_content.strip()) < min_len:
            return None

        specialty = cls._infer_specialty(title, tags, markdown_content, category)
        slug = urlparse(url).path.strip("/").replace("/", "_") or "index"
        content_hash = hashlib.sha256(markdown_content.encode("utf-8")).hexdigest()

        return ClinicalDocument(
            url=url,
            slug=slug,
            category=category,
            specialty=specialty,
            title=title,
            edition_date=edition_date,
            tags=tags,
            markdown_content=markdown_content,
            tables_json=json.dumps(tables_data, ensure_ascii=False),
            flowcharts_json=json.dumps(flowcharts_data, ensure_ascii=False),
            content_hash=content_hash,
        )

    @staticmethod
    def _extract_title(soup: BeautifulSoup) -> str:
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(" ", strip=True)
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return str(og_title["content"]).strip()
        if soup.title and soup.title.string:
            return soup.title.string.split("|")[0].split("-")[0].strip()
        return "Sem Título"

    @staticmethod
    def _extract_date(soup: BeautifulSoup, raw_html: str) -> str:
        time_tag = soup.find("time")
        if time_tag:
            dt = time_tag.get("datetime") or time_tag.get_text(strip=True)
            if dt:
                return str(dt).strip()
        meta_date = soup.find("meta", property="article:published_time")
        if meta_date and meta_date.get("content"):
            return str(meta_date["content"]).strip()
        match = re.search(r"\b(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})\b", raw_html)
        return match.group(1) if match else ""

    @staticmethod
    def _extract_tags(soup: BeautifulSoup) -> List[str]:
        tags: Set[str] = set()
        for selector in [".tag", ".badge", ".category", "a[rel='tag']", ".chip"]:
            for el in soup.select(selector):
                txt = el.get_text(" ", strip=True)
                if 2 <= len(txt) <= 45:
                    tags.add(txt)
        return sorted(tags)

    @classmethod
    def _infer_specialty(
        cls, title: str, tags: List[str], content: str, category: str
    ) -> str:
        if category.startswith("subesp_"):
            raw_spec = category.replace("subesp_", "").replace("_", " ").title()
            return raw_spec

        corpus = f"{title} {' '.join(tags)} {content[:2500]}".lower()
        best_spec = "Clínica Médica Geral"
        best_score = 0
        for spec, keywords in cls.SPECIALTIES_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in corpus)
            if score > best_score:
                best_score = score
                best_spec = spec
        return best_spec

    @staticmethod
    def _extract_tables(container: Tag) -> List[Dict[str, object]]:
        extracted = []
        for idx, table in enumerate(container.find_all("table")):
            headers = [th.get_text(" ", strip=True) for th in table.find_all("th")]
            rows = []
            for tr in table.find_all("tr"):
                cells = [
                    td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])
                ]
                if cells and cells != headers:
                    rows.append(cells)
            if headers or rows:
                extracted.append(
                    {"table_index": idx + 1, "headers": headers, "rows": rows}
                )
        return extracted

    @staticmethod
    def _extract_flowcharts(container: Tag, category: str) -> List[Dict[str, object]]:
        """Extrai passos lógicos de algoritmos/fluxogramas textuais."""
        flowcharts = []
        candidates = container.find_all(
            ["div", "section", "ul", "ol"],
            class_=re.compile(r"(fluxo|flow|step|algoritm|decision|card)", re.I),
        )
        if category == "fluxogramas" and not candidates:
            candidates = [container]

        for idx, block in enumerate(candidates):
            steps = [
                li.get_text(" ", strip=True)
                for li in block.find_all(["li", "p", "h3", "h4"])
                if len(li.get_text(strip=True)) > 5
            ]
            if len(steps) >= 2:
                flowcharts.append({"flowchart_index": idx + 1, "steps": steps[:50]})
        return flowcharts

    @classmethod
    def _dom_to_markdown(cls, element: Tag) -> List[str]:
        lines: List[str] = []

        for child in element.children:
            if isinstance(child, NavigableString):
                txt = str(child).strip()
                if txt:
                    lines.append(txt)
                continue

            if not isinstance(child, Tag):
                continue

            name = child.name.lower()

            if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                level = int(name[1])
                heading_text = child.get_text(" ", strip=True)
                if heading_text:
                    lines.append(f"\n{'#' * level} {heading_text}\n")

            elif name == "p":
                p_text = cls._inline_formatting(child)
                if p_text:
                    lines.append(f"\n{p_text}\n")

            elif name in ("ul", "ol"):
                lines.append("")
                for idx, li in enumerate(
                    child.find_all("li", recursive=False), start=1
                ):
                    prefix = f"{idx}." if name == "ol" else "-"
                    li_text = cls._inline_formatting(li)
                    if li_text:
                        lines.append(f"{prefix} {li_text}")
                lines.append("")

            elif name == "blockquote":
                bq_text = child.get_text(" ", strip=True)
                if bq_text:
                    lines.append(f"\n> {bq_text}\n")

            elif name == "table":
                md_table = cls._table_to_markdown(child)
                if md_table:
                    lines.append(f"\n{md_table}\n")

            elif name in ("pre", "code"):
                code_txt = child.get_text("\n", strip=True)
                if code_txt:
                    lines.append(f"\n```\n{code_txt}\n```\n")

            elif name in ("dl",):
                lines.append("")
                for dt_dd in child.find_all(["dt", "dd"], recursive=False):
                    txt = dt_dd.get_text(" ", strip=True)
                    if dt_dd.name == "dt":
                        lines.append(f"**{txt}**")
                    else:
                        lines.append(f": {txt}\n")

            else:
                lines.extend(cls._dom_to_markdown(child))

        return lines

    @staticmethod
    def _inline_formatting(tag: Tag) -> str:
        parts: List[str] = []
        for node in tag.children:
            if isinstance(node, NavigableString):
                parts.append(str(node))
            elif isinstance(node, Tag):
                n = node.name.lower()
                txt = node.get_text(" ", strip=True)
                if not txt:
                    continue
                if n in ("strong", "b"):
                    parts.append(f" **{txt}** ")
                elif n in ("em", "i"):
                    parts.append(f" *{txt}* ")
                elif n == "code":
                    parts.append(f" `{txt}` ")
                elif n == "a":
                    href = str(node.get("href", ""))
                    if (
                        href
                        and not href.startswith("#")
                        and not href.startswith("javascript:")
                    ):
                        full_url = urljoin(BASE_URL, href)
                        parts.append(f" [{txt}]({full_url}) ")
                    else:
                        parts.append(txt)
                else:
                    parts.append(txt)
        return re.sub(r"\s+", " ", "".join(parts)).strip()

    @staticmethod
    def _table_to_markdown(table: Tag) -> str:
        rows = []
        for tr in table.find_all("tr"):
            cells = [
                td.get_text(" ", strip=True).replace("|", "\\|")
                for td in tr.find_all(["th", "td"])
            ]
            if any(cells):
                rows.append(cells)

        if not rows:
            return ""

        max_cols = max(len(r) for r in rows)
        normalized = [r + [""] * (max_cols - len(r)) for r in rows]

        header = normalized[0]
        sep = ["---"] * max_cols
        body = normalized[1:]

        md_lines = [
            "| " + " | ".join(header) + " |",
            "| " + " | ".join(sep) + " |",
        ]
        for r in body:
            md_lines.append("| " + " | ".join(r) + " |")
        return "\n".join(md_lines)

    @staticmethod
    def _clean_markdown(text: str) -> str:
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


# ============================================================================
# COLETOR ASSÍNCRONO E CRAWLER DE ENDPOINTS
# ============================================================================
class TDCCollector:
    FORBIDDEN_EXTENSIONS = (
        ".mp4",
        ".mp3",
        ".avi",
        ".mov",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".svg",
        ".webp",
        ".pdf",
        ".zip",
    )

    IGNORED_PATH_SEGMENTS = (
        "/login",
        "/logout",
        "/signup",
        "/cadastro",
        "/password",
        "/assinar",
        "/conta",
        "/perfil",
    )

    def __init__(
        self,
        cookies: Dict[str, str],
        vault: KnowledgeVault,
        max_pages_per_cat: int = DEFAULT_MAX_PAGES_PER_CAT,
        concurrency: int = DEFAULT_CONCURRENCY,
        min_delay: float = DEFAULT_MIN_DELAY,
        max_delay: float = DEFAULT_MAX_DELAY,
        categories_filter: Optional[List[str]] = None,
        force_refresh: bool = False,
    ) -> None:
        self.cookies = cookies
        self.vault = vault
        self.max_pages_per_cat = max_pages_per_cat
        self.concurrency = max(1, concurrency)
        self.min_delay = max(0.05, min_delay)
        self.max_delay = max(self.min_delay, max_delay)
        self.categories_filter = categories_filter
        self.force_refresh = force_refresh

        self.semaphore = asyncio.Semaphore(self.concurrency)
        self.visited_urls: Set[str] = (
            set() if force_refresh else self.vault.get_existing_urls()
        )
        self.stats = {
            "inserted": 0,
            "updated": 0,
            "unchanged": 0,
            "skipped_cached": len(self.visited_urls),
            "failed": 0,
        }

        if self.visited_urls and not force_refresh:
            log_info(
                f"Retomada inteligente ativa: {len(self.visited_urls)} documentos já existentes no SQLite "
                "serão pulados (use --force para reprocessar tudo)."
            )

    def _build_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": f"{BASE_URL}/guia/",
            "DNT": "1",
        }
        if "csrftoken" in self.cookies:
            headers["X-CSRFToken"] = self.cookies["csrftoken"]
        return headers

    async def _polite_fetch(self, client: httpx.AsyncClient, url: str) -> Optional[str]:
        async with self.semaphore:
            # Pausa defensiva com jitter para proteger o servidor e evitar HTTP 429
            await asyncio.sleep(random.uniform(self.min_delay, self.max_delay))

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code == 200:
                        return resp.text

                    if resp.status_code == 404:
                        return None

                    if resp.status_code == 429:
                        wait_time = (2**attempt) * 4.0 + random.uniform(1.0, 3.0)
                        log_warn(
                            f"HTTP 429 (Rate Limit) em {url}. Backoff de {wait_time:.1f}s "
                            f"(tentativa {attempt}/{MAX_RETRIES})..."
                        )
                        await asyncio.sleep(wait_time)
                        continue

                    if resp.status_code in (401, 403):
                        log_error(
                            f"Acesso negado (HTTP {resp.status_code}) em {url}. Sessão expirada?"
                        )
                        return None

                    if resp.status_code >= 500:
                        await asyncio.sleep(2**attempt)
                        continue

                    return None
                except httpx.RequestError as exc:
                    log_warn(
                        f"Erro de rede ao acessar {url} (tentativa {attempt}/{MAX_RETRIES}): {exc}"
                    )
                    await asyncio.sleep(2**attempt)

            self.stats["failed"] += 1
            return None

    @classmethod
    def _discover_links(
        cls, html: str, current_url: str, base_path: str
    ) -> Tuple[Set[str], Set[str]]:
        """
        Retorna (article_links, pagination_or_hub_links) pertencentes ao escopo do Guia TdC.
        Usa `current_url` no `urljoin` para resolver corretamente paginações relativas (`?page=2`).
        Ignora links de mídia (.mp4, .pdf, .jpg, .png).
        """
        soup = BeautifulSoup(html, "html.parser")
        articles: Set[str] = set()
        pages: Set[str] = set()

        for a in soup.find_all("a", href=True):
            href = str(a["href"]).strip()
            if (
                not href
                or href.startswith("#")
                or href.startswith("mailto:")
                or href.startswith("javascript:")
                or href.startswith("tel:")
            ):
                continue

            # Correção cirúrgica: urljoin sobre current_url (e não BASE_URL)
            full_url = urljoin(current_url, href)
            parsed = urlparse(full_url)

            if DOMAIN not in parsed.netloc:
                continue

            path_lower = parsed.path.lower()
            if path_lower.endswith(cls.FORBIDDEN_EXTENSIONS):
                continue
            if any(seg in path_lower for seg in cls.IGNORED_PATH_SEGMENTS):
                continue
            if not parsed.path.startswith("/guia/"):
                continue

            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

            # 1. Links de paginação explícita (?page=N)
            if parsed.query and "page=" in parsed.query:
                pages.add(f"{clean_url}?{parsed.query}")
                continue

            # 2. Rotas de hubs/índices internos (subespecialidades, coleções, busca de tópicos, listas)
            if re.search(
                r"/guia/([^/]+/subespecialidades|colecoes/[^/]+|topicos-search|lista-questoes)/?$",
                parsed.path,
                re.I,
            ):
                pages.add(clean_url)
                articles.add(clean_url)
                continue

            # 3. Artigos clínicos, tópicos (/guia/<id>/<slug>/), edições, fluxogramas, casos, etc.
            if parsed.path != base_path and parsed.path != "/guia/":
                articles.add(clean_url)

        return articles, pages

    async def _fetch_and_store_article(
        self,
        client: httpx.AsyncClient,
        url: str,
        category: str,
        progress=None,
        task_id=None,
    ) -> None:
        html = await self._polite_fetch(client, url)
        if html:
            doc = ClinicalHTMLParser.parse_article(html, url, category)
            if doc:
                status = self.vault.upsert_document(doc)
                self.stats[status] += 1
        if progress and task_id is not None:
            progress.advance(task_id)

    async def process_category(
        self,
        client: httpx.AsyncClient,
        category: str,
        seed_path: str,
        progress=None,
        task_id=None,
    ) -> None:
        seed_url = urljoin(BASE_URL, seed_path)
        queue_pages: List[str] = [seed_url]
        seen_pages: Set[str] = set()
        discovered_articles: Set[str] = set()

        log_info(
            f"Mapeando índice completo da categoria [bold]{category}[/bold] ({seed_url})..."
        )

        # 1. Descoberta completa de páginas de listagem/paginação sem limite artificial de 50 páginas
        while queue_pages and len(discovered_articles) < self.max_pages_per_cat:
            # Processa as páginas de índice em pequenos lotes concorrentes
            batch: List[str] = []
            while queue_pages and len(batch) < self.concurrency:
                candidate = queue_pages.pop(0)
                if candidate not in seen_pages:
                    seen_pages.add(candidate)
                    batch.append(candidate)

            if not batch:
                continue

            results = await asyncio.gather(
                *(self._polite_fetch(client, page_url) for page_url in batch)
            )

            for current_page, html in zip(batch, results):
                if not html:
                    continue

                # Salva a própria página índice caso contenha glossário/cards/conteúdo clínico direto
                if current_page not in self.visited_urls:
                    doc = ClinicalHTMLParser.parse_article(html, current_page, category)
                    if doc:
                        status = self.vault.upsert_document(doc)
                        self.stats[status] += 1
                        self.visited_urls.add(current_page)

                art_links, page_links = self._discover_links(
                    html, current_page, seed_path
                )
                discovered_articles.update(art_links - self.visited_urls)

                for p_link in sorted(page_links):
                    if p_link not in seen_pages and p_link not in queue_pages:
                        queue_pages.append(p_link)

        # Filtra URLs que ainda não foram visitados
        target_urls = [
            u for u in sorted(discovered_articles) if u not in self.visited_urls
        ][: self.max_pages_per_cat]

        for u in target_urls:
            self.visited_urls.add(u)

        log_info(
            f"Categoria [bold]{category}[/bold]: {len(seen_pages)} página(s) de índice varridas | "
            f"{len(target_urls)} novos documento(s) na fila de extração."
        )

        if progress and task_id is not None:
            progress.update(task_id, total=max(len(target_urls), 1), completed=0)

        if not target_urls:
            if progress and task_id is not None:
                progress.update(task_id, completed=1)
            return

        # 2. Extração concorrente dos artigos/tópicos descobertos
        await asyncio.gather(
            *(
                self._fetch_and_store_article(
                    client, url, category, progress, task_id
                )
                for url in target_urls
            )
        )

    def _get_selected_endpoints(self) -> Dict[str, str]:
        if not self.categories_filter:
            return ENDPOINTS_SEMENTE

        selected: Dict[str, str] = {}
        for cat_key, path in ENDPOINTS_SEMENTE.items():
            if any(
                cat_key == f or cat_key.startswith(f) for f in self.categories_filter
            ):
                selected[cat_key] = path

        if not selected:
            valid = ", ".join(ENDPOINTS_SEMENTE.keys())
            raise ValueError(
                f"Nenhuma categoria corresponde ao filtro {self.categories_filter}. "
                f"Categorias disponíveis: {valid}"
            )
        return selected

    async def run(self) -> None:
        cookies = httpx.Cookies(self.cookies)
        headers = self._build_headers()
        selected_endpoints = self._get_selected_endpoints()

        limits = httpx.Limits(
            max_keepalive_connections=self.concurrency * 2,
            max_connections=self.concurrency * 4,
        )

        async with httpx.AsyncClient(
            cookies=cookies,
            headers=headers,
            timeout=REQUEST_TIMEOUT,
            limits=limits,
            http2=False,
        ) as client:
            if RICH_AVAILABLE and console is not None:
                with Progress(
                    SpinnerColumn(),
                    TextColumn("[bold blue]{task.description}"),
                    BarColumn(),
                    MofNCompleteColumn(),
                    TimeElapsedColumn(),
                    console=console,
                ) as progress:
                    for category, path in selected_endpoints.items():
                        t_id = progress.add_task(f"Extraindo {category}", total=1)
                        await self.process_category(
                            client, category, path, progress, t_id
                        )
            else:
                for category, path in selected_endpoints.items():
                    await self.process_category(client, category, path)


# ============================================================================
# CLI & ENTRYPOINT PRINCIPAL
# ============================================================================
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrator Assíncrono Completo do Guia Tá de Clinicagem (TdC) -> SQLite WAL/FTS5"
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=DEFAULT_CONCURRENCY,
        help=f"Número máximo de requisições simultâneas (padrão: {DEFAULT_CONCURRENCY})",
    )
    parser.add_argument(
        "--min-delay",
        type=float,
        default=DEFAULT_MIN_DELAY,
        help=f"Delay mínimo em segundos entre requisições por worker (padrão: {DEFAULT_MIN_DELAY})",
    )
    parser.add_argument(
        "--max-delay",
        type=float,
        default=DEFAULT_MAX_DELAY,
        help=f"Delay máximo em segundos entre requisições por worker (padrão: {DEFAULT_MAX_DELAY})",
    )
    parser.add_argument(
        "--category",
        nargs="*",
        default=None,
        help="Filtrar categorias específicas (ex: --category topicos fluxogramas subesp_)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=DEFAULT_MAX_PAGES_PER_CAT,
        help=f"Limite máximo de documentos por categoria (padrão: {DEFAULT_MAX_PAGES_PER_CAT})",
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Caminho do arquivo SQLite (padrão: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-baixar e reprocessar URLs que já constam no banco de dados local",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    # Suporta tanto '--category topicos fluxogramas' quanto '--category topicos,fluxogramas'
    categories_filter: Optional[List[str]] = None
    if args.category:
        categories_filter = [
            item.strip()
            for raw in args.category
            for item in raw.split(",")
            if item.strip()
        ]

    if RICH_AVAILABLE and console is not None:
        console.print(
            Panel.fit(
                "[bold green]Extrator de Conhecimento Médico - Tá de Clinicagem (TdC)[/bold green]\n"
                "Modo: Full Crawl Estruturado (Markdown/JSON) | SQLite WAL + FTS5\n"
                f"Concorrência: {args.concurrency} workers | Delay: {args.min_delay:.2f}s–{args.max_delay:.2f}s | "
                "Zero Vídeos/Imagens",
                border_style="cyan",
            )
        )

    cookies = AuthManager.get_cookies()
    vault = KnowledgeVault(args.db_path)
    collector = TDCCollector(
        cookies=cookies,
        vault=vault,
        max_pages_per_cat=args.max_pages,
        concurrency=args.concurrency,
        min_delay=args.min_delay,
        max_delay=args.max_delay,
        categories_filter=categories_filter,
        force_refresh=args.force,
    )

    start_ts = time.perf_counter()
    await collector.run()
    elapsed = time.perf_counter() - start_ts

    db_stats = vault.get_stats()
    total_db = sum(db_stats.values())

    if RICH_AVAILABLE and console is not None:
        table = Table(title=f"Resumo da Extração Clínica ({elapsed:.1f}s)")
        table.add_column("Métrica / Categoria", style="cyan")
        table.add_column("Quantidade", justify="right", style="green")

        table.add_row("Novos Documentos Inseridos", str(collector.stats["inserted"]))
        table.add_row("Documentos Atualizados", str(collector.stats["updated"]))
        table.add_row(
            "Documentos Inalterados (Hash Igual)", str(collector.stats["unchanged"])
        )
        table.add_row(
            "Documentos Pulados (Já no Cache SQLite)",
            str(collector.stats["skipped_cached"]),
        )
        table.add_row("Falhas de Rede / Ignorados", str(collector.stats["failed"]))
        table.add_section()
        for cat, count in db_stats.items():
            table.add_row(f"Banco [{cat}]", str(count))
        table.add_section()
        table.add_row("[bold]TOTAL ACUMULADO NO SQLITE[/bold]", f"[bold]{total_db}[/bold]")

        console.print(table)
    else:
        print(
            f"Concluído em {elapsed:.1f}s | Stats: {collector.stats} | "
            f"Total DB ({total_db}): {db_stats}"
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log_warn(
            "Extração interrompida pelo usuário. Todos os dados já coletados estão salvos com segurança (SQLite WAL)."
        )