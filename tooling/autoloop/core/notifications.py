"""
Módulo Profundo: Notificações e Relatórios (Telegram & Progresso).
Gerencia:
- Envio seguro de relatórios HTML para múltiplos chats Telegram.
- Coleta de mudanças do Git, tarefas do PROGRESS.md e sugestões futuras.
- Persistência de data/ultimas_mudancas.json e formatação de telemetria.
"""
from datetime import datetime
import html
import json
import os
from pathlib import Path
import re
import subprocess
from typing import Any, Dict, List, Optional, Tuple
import urllib.request
import urllib.error

from task_context import coletar_telemetria_ciclo, formatar_bloco_telemetria
import sys


def _get_autoloop_delegate(attr_name: str, fallback_func: Any) -> Any:
    """Busca atributo dinamicamente em 'autoloop' para suportar monkeypatch em testes."""
    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test")
    if mod and hasattr(mod, attr_name):
        return getattr(mod, attr_name)
    return fallback_func


def obter_commit_head(repo_dir: str = ".") -> Optional[str]:
    """Retorna o SHA completo (40 caracteres) do commit HEAD atual ou None."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo_dir),
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        sha = res.stdout.strip()
        if res.returncode == 0 and len(sha) == 40 and all(c in "0123456789abcdefABCDEF" for c in sha):
            return sha
        return None
    except Exception:
        return None


def obter_credenciais_telegram(
    token_override: Optional[str] = None,
    chat_override: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """
    Recupera as credenciais do Telegram para notificações de deploy e autoloop.
    Prioridades:
    1. Parâmetros explícitos (token_override, chat_override)
    2. Variáveis de ambiente (BOT_TOKEN_IA_HUB / AUTOLOOP_TELEGRAM_BOT_TOKEN)
    3. Arquivo protegido ~/.config/autoloop/telegram.json ou ~/.config/ia-hub/ia-hub.env
    4. Fallback (.env ou TELEGRAM_BOT_TOKEN)
    """
    token = token_override or os.environ.get("BOT_TOKEN_IA_HUB") or os.environ.get("AUTOLOOP_TELEGRAM_BOT_TOKEN")
    chat_id = chat_override or os.environ.get("TELEGRAM_CHAT_ID", "").strip()

    config_json = Path.home() / ".config" / "autoloop" / "telegram.json"
    if (not token or not chat_id) and config_json.exists():
        try:
            with open(config_json, "r", encoding="utf-8") as f:
                sec = json.load(f)
                if not token:
                    token = sec.get("telegram_bot_token", "").strip()
                if not chat_id:
                    chat_id = sec.get("telegram_chat_id", "").strip()
        except Exception:
            pass

    ia_hub_env = Path.home() / ".config" / "ia-hub" / "ia-hub.env"
    if (not token or not chat_id) and ia_hub_env.exists():
        try:
            for line in ia_hub_env.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("BOT_TOKEN_IA_HUB=") and not token:
                    token = line.split("=", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("TELEGRAM_CHAT_ID=") and not chat_id:
                    chat_id = line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass

    if not token:
        token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        if not token:
            env_path = Path(".env")
            if env_path.exists():
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("AUTOLOOP_TELEGRAM_BOT_TOKEN=") or line.startswith("TELEGRAM_BOT_TOKEN="):
                                token = line.split("=", 1)[1].strip().strip('"').strip("'")
                                break
                except Exception:
                    pass

    if not chat_id:
        chat_id = "1771571035"

    return token or None, chat_id or None


def enviar_relatorio_telegram(
    texto_html: str,
    token_override: Optional[str] = None,
    chat_override: Optional[str] = None
) -> bool:
    """
    Envia o relatório formatado em HTML para o Telegram.
    Divide automaticamente mensagens longas (> 4000 caracteres) e
    suporta múltiplos chats separados por vírgula.
    """
    fn_cred = _get_autoloop_delegate("obter_credenciais_telegram", obter_credenciais_telegram)
    token, chat_id = fn_cred(token_override, chat_override)
    if not token or token.startswith("123456789:"):
        return False

    mod = sys.modules.get("autoloop") or sys.modules.get("autoloop_quota_test")
    urllib_req = getattr(getattr(mod, "urllib", None), "request", urllib.request) if mod else urllib.request

    url = f"https://api.telegram.org/bot{token}/sendMessage"

    chunks = []
    if len(texto_html) <= 4000:
        chunks = [texto_html]
    else:
        linhas = texto_html.split("\n")
        chunk_atual = []
        tam_atual = 0
        for l in linhas:
            if tam_atual + len(l) + 1 > 4000 and chunk_atual:
                chunks.append("\n".join(chunk_atual))
                chunk_atual = [l]
                tam_atual = len(l) + 1
            else:
                chunk_atual.append(l)
                tam_atual += len(l) + 1
        if chunk_atual:
            chunks.append("\n".join(chunk_atual))

    sucesso_total = True
    target_chats = [c.strip() for c in str(chat_id).split(",") if c.strip()]
    if not target_chats:
        return False

    for c_id in target_chats:
        for chunk in chunks:
            payload = {
                "chat_id": c_id,
                "text": chunk,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }
            try:
                data_encoded = json.dumps(payload).encode("utf-8")
                req = urllib_req.Request(
                    url,
                    data=data_encoded,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (compatible; UltraRotinaBot/1.0)"
                    }
                )
                with urllib_req.urlopen(req, timeout=15) as resp:
                    resp_data = json.loads(resp.read().decode())
                    if not resp_data.get("ok"):
                        sucesso_total = False
            except Exception:
                sucesso_total = False

    return sucesso_total


def formatar_markdown_para_html(texto: str) -> str:
    """Converte marcadores simples do Markdown para HTML suportado pelo Telegram."""
    texto_esc = html.escape(texto)
    texto_esc = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', texto_esc)
    texto_esc = re.sub(r'\*(.+?)\*', r'<i>\1</i>', texto_esc)
    texto_esc = re.sub(r'`(.+?)`', r'<code>\1</code>', texto_esc)
    return texto_esc


def coletar_mudancas_ciclo(
    commit_anterior: Optional[str] = None,
    horas: float = 6.0,
    root: Path = Path(".")
) -> List[Dict[str, str]]:
    """Coleta commits realizados no ciclo especificado."""
    root = Path(root).resolve()
    commits = []
    try:
        cmd = None
        if commit_anterior and commit_anterior != "HEAD":
            chk = subprocess.run(
                ["git", "cat-file", "-t", commit_anterior],
                cwd=root,
                capture_output=True,
                text=True,
                check=False
            )
            if chk.returncode == 0:
                cmd = ["git", "log", f"{commit_anterior}..HEAD", "--pretty=format:%h|%s|%an"]

        if not cmd:
            cmd = ["git", "log", f"--since={int(horas * 60)} minutes ago", "--pretty=format:%h|%s|%an"]

        res = subprocess.run(cmd, cwd=root, capture_output=True, text=True, check=False)
        for linha in res.stdout.strip().splitlines():
            if linha.strip():
                partes = linha.split("|", 2)
                if len(partes) == 3:
                    h, s, a = partes
                    commits.append({"hash": h, "subject": s, "autor": a})
                else:
                    commits.append({"hash": "", "subject": linha, "autor": ""})
    except Exception:
        pass

    if not commits:
        try:
            res_alt = subprocess.run(
                ["git", "log", "-n", "5", "--pretty=format:%h|%s|%an"],
                cwd=root,
                capture_output=True,
                text=True,
                check=False
            )
            for linha in res_alt.stdout.strip().splitlines():
                if linha.strip():
                    partes = linha.split("|", 2)
                    if len(partes) == 3:
                        h, s, a = partes
                        commits.append({"hash": h, "subject": s, "autor": a})
        except Exception:
            pass

    return commits


def coletar_status_progress(root: Path = Path(".")) -> Tuple[List[str], Optional[str]]:
    """Lê o PROGRESS.md para identificar a tarefa em foco e tarefas concluídas recentemente."""
    concluidas = []
    proxima_tarefa = None
    root = Path(root).resolve()
    candidatos = [
        root / "PROGRESS.md",
        Path("PROGRESS.md"),
        Path.home() / "Projetos IA" / "Rotina" / "PROGRESS.md"
    ]
    caminho = next((c for c in candidatos if c.is_file()), None)

    if caminho:
        try:
            linhas = caminho.read_text(encoding="utf-8").splitlines()
            for l in linhas:
                l_str = l.strip()
                if (l_str.startswith("- [x]") or re.match(r'^\d+[A-Za-z]?\.\s*\[x\]', l_str)) and len(concluidas) < 3:
                    m = re.search(r'\*\*(.*?)\*\*', l_str)
                    if m:
                        concluidas.append(m.group(1))
                if (l_str.startswith("- [ ]") or re.match(r'^\d+[A-Za-z]?\.\s*\[ \]', l_str)) and not proxima_tarefa:
                    m = re.search(r'\*\*(.*?)\*\*', l_str)
                    if m:
                        proxima_tarefa = m.group(1)
        except Exception:
            pass
    return concluidas, proxima_tarefa


def coletar_sugestoes_futuras(root: Path = Path(".")) -> List[str]:
    """Coleta sugestões futuras registradas no PROGRESS.md."""
    sugestoes = []
    root = Path(root).resolve()
    candidatos = [
        root / "PROGRESS.md",
        root / "docs" / "SUGESTOES_FUTURAS.md",
        root / "data" / "sugestoes.md",
        root / "SUGESTOES.md"
    ]
    caminho_encontrado = next((c for c in candidatos if c.is_file()), None)
    if not caminho_encontrado:
        return sugestoes

    try:
        linhas = caminho_encontrado.read_text(encoding="utf-8").splitlines()
        dentro_secao = False
        for linha in linhas:
            l = linha.strip()
            if re.match(r'^##\s+.*(?:sugest|futur)', l, re.IGNORECASE):
                dentro_secao = True
                continue
            elif dentro_secao and (re.match(r'^##?\s+', l) or l.startswith("---") or l.startswith("___")):
                dentro_secao = False
                continue

            if dentro_secao:
                if (l.startswith("*(") or l.startswith("(*") or l.startswith("(") or l.startswith(">")) and l.endswith(")"):
                    continue
                if l.startswith("<!--") and l.endswith("-->"):
                    continue
                if l.startswith("- ") or l.startswith("* ") or re.match(r'^\d+[\.\)]\s+', l):
                    item = re.sub(r'^[-*]\s+', '', l)
                    item = re.sub(r'^\d+[\.\)]\s+', '', item)
                    item = re.sub(r'^\[[\s x]\]\s+', '', item)
                    item = item.strip()
                    if item and item not in sugestoes:
                        sugestoes.append(item)
    except Exception:
        pass

    return sugestoes


def enviar_relatorio_ciclo_rotina(
    nome_modelo: str,
    num_conta: int,
    nome_squad: str = "Squad Padrão",
    notificar_telegram: bool = False,
    root: Path = Path(".")
) -> bool:
    """Gera o resumo do ciclo, persiste em data/ultimas_mudancas.json e opcionalmente notifica."""
    root = Path(root).resolve()
    fn_status = _get_autoloop_delegate("coletar_status_progress", coletar_status_progress)
    fn_mudancas = _get_autoloop_delegate("coletar_mudancas_ciclo", coletar_mudancas_ciclo)
    fn_head = _get_autoloop_delegate("obter_commit_head", obter_commit_head)
    fn_telemetria = _get_autoloop_delegate("coletar_telemetria_ciclo", coletar_telemetria_ciclo)
    fn_telegram = _get_autoloop_delegate("enviar_relatorio_telegram", enviar_relatorio_telegram)

    try:
        concluidas, proxima = fn_status(root)
    except TypeError:
        concluidas, proxima = fn_status()

    try:
        commits = fn_mudancas(horas=1.0, root=root)
    except TypeError:
        try:
            commits = fn_mudancas(horas=1.0)
        except TypeError:
            commits = fn_mudancas()

    hora_str = datetime.now().strftime("%d/%m/%Y às %H:%M")

    try:
        novo_head = fn_head(str(root))
    except TypeError:
        novo_head = fn_head()

    try:
        telemetria_ciclo = fn_telemetria(root=root, horas=1.0)
    except TypeError:
        telemetria_ciclo = fn_telemetria(horas=1.0)

    linha_telemetria = formatar_bloco_telemetria(telemetria_ciclo)

    linhas = [
        "🚀 <b>ULTRA ROTINA · ATUALIZAÇÃO DO AUTOLOOP</b>",
        f"⏱️ <i>Ciclo finalizado em {hora_str}</i>",
        "",
        f"🧠 <b>Modelo / Conta:</b> <code>{nome_modelo}</code> (Conta {num_conta})",
        f"⚡ <b>Squad:</b> <code>{nome_squad}</code>",
        f"🔖 <b>Commit HEAD:</b> <code>{novo_head}</code>"
    ]
    if linha_telemetria:
        linhas.append(linha_telemetria)

    if concluidas:
        linhas.append("")
        linhas.append("✅ <b>Última(s) Tarefa(s) Concluída(s):</b>")
        for t in concluidas[:2]:
            linhas.append(f"• {html.escape(t)}")

    if proxima:
        linhas.append("")
        linhas.append("🎯 <b>Próxima Tarefa em Foco:</b>")
        linhas.append(f"• {html.escape(proxima)}")

    if commits:
        linhas.append("")
        linhas.append("📋 <b>Commits Recentes:</b>")
        for c in commits[:3]:
            h_code = f"<code>{c['hash']}</code>" if c['hash'] else "•"
            linhas.append(f"• {h_code} {html.escape(c['subject'])}")

    linhas.append("")
    linhas.append("💡 <i>Deploy automático no Render a cada 6h. Para forçar deploy imediato, envie</i> <b>/deploy</b>.")

    texto_html = "\n".join(linhas)

    try:
        info_ciclo = {
            "timestamp": hora_str,
            "modelo": nome_modelo,
            "conta": num_conta,
            "squad": nome_squad,
            "commit_head": novo_head,
            "telemetria": telemetria_ciclo,
            "tarefas_concluidas": concluidas[:5],
            "proxima_tarefa": proxima,
            "commits_recentes": commits[:5],
            "texto_html": texto_html
        }
        (root / "data").mkdir(parents=True, exist_ok=True)
        with open(root / "data" / "ultimas_mudancas.json", "w", encoding="utf-8") as f:
            json.dump(info_ciclo, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    if notificar_telegram:
        fn_telegram(texto_html)

    return True
