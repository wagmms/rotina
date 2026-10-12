"""
Ultra Rotina · Testador Master: Renderizador Visual TUI (Anti-UI-Slop)
Exibe no terminal a tela de conversa do Telegram, botões inline,
balão de pensamento da persona, telemetria beira-leito e trilha de navegação.
"""

import sys
import re
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional

# Paleta ANSI de Alto Contraste
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
ITALIC = "\033[3m"

BLUE = "\033[38;5;39m"
CYAN = "\033[38;5;51m"
GREEN = "\033[38;5;82m"
YELLOW = "\033[38;5;220m"
RED = "\033[38;5;196m"
MAGENTA = "\033[38;5;201m"
WHITE = "\033[38;5;255m"
GRAY = "\033[38;5;244m"


class TUIRenderer:
    def __init__(self, largura_max: int = 86):
        self.largura_max = largura_max

    def obter_largura_terminal(self) -> int:
        try:
            colunas = shutil.get_terminal_size((86, 24)).columns
            return min(self.largura_max, max(60, colunas - 2))
        except Exception:
            return self.largura_max

    def limpar_tela(self):
        """Limpa o terminal para sensação fluida de aplicativo."""
        print("\033[H\033[J", end="", flush=True)

    def _gerar_barra_progresso(self, pct: float, largura: int = 14) -> str:
        """Gera barra de progresso em blocos Unicode elegantes."""
        preenchidos = int(round((pct / 100.0) * largura))
        preenchidos = max(0, min(largura, preenchidos))
        vazios = largura - preenchidos
        return f"{GREEN}{'█' * preenchidos}{GRAY}{'░' * vazios}{RESET}"

    def renderizar_cabecalho(
        self,
        persona: Any,
        ciclo_atual: int,
        ciclos_total: Optional[int],
        modo: str,
        cobertura_pct: float,
        telas_contagem: int,
        botoes_clicados: int,
        falhas_contagem: int,
        latencia_media_ms: float,
        breadcrumbs: str = "Início"
    ):
        """Desenha o HUD superior de telemetria beira-leito."""
        w = self.obter_largura_terminal()
        linha_horiz = "═" * (w - 2)

        ciclo_str = f"{ciclo_atual}" if not ciclos_total else f"{ciclo_atual}/{ciclos_total}"
        hora_str = datetime.now().strftime("%H:%M:%S")

        print(f"\n{CYAN}╔{linha_horiz}╗{RESET}")
        
        # Título com badge de modo
        tag_modo = f"[{modo.upper()}]"
        titulo_principal = f" 🧪 ULTRA ROTINA · TESTADOR MASTER {tag_modo} "
        pad_tit = max(0, w - 2 - len(titulo_principal))
        print(f"{CYAN}║{BOLD}{WHITE}{titulo_principal}{' ' * pad_tit}{CYAN}║{RESET}")
        
        sep = "─" * (w - 2)
        print(f"{CYAN}╟{sep}╢{RESET}")

        # Linha 1: Persona e Tempo
        p_info = f" Persona: {persona.avatar} {persona.nome} ({persona.titulo})"
        c_info = f"Ciclo: {ciclo_str} │ {hora_str} "
        pad1 = max(0, w - 2 - (len(p_info) + len(c_info)))
        print(f"{CYAN}║{BOLD}{YELLOW}{p_info}{' ' * pad1}{WHITE}{c_info}{CYAN}║{RESET}")

        # Linha 2: Métricas e Barra de Cobertura
        barra = self._gerar_barra_progresso(cobertura_pct, 12)
        status_cor = RED if falhas_contagem > 0 else GREEN
        m_info = f" Telas: {telas_contagem} │ Botões: {botoes_clicados} │ Cob: {barra} {cobertura_pct:.1f}% │ Lat: {latencia_media_ms:.0f}ms "
        f_info = f"Erros: {falhas_contagem} "
        pad2 = max(0, w - 2 - (self._tamanho_visivel(m_info) + len(f_info)))
        print(f"{CYAN}║{WHITE}{m_info}{' ' * pad2}{status_cor}{BOLD}{f_info}{CYAN}║{RESET}")

        # Linha 3: Trilha de Navegação (Breadcrumbs)
        if breadcrumbs:
            trilha_txt = f" 🧭 Trilha: {breadcrumbs}"
            if len(trilha_txt) > w - 4:
                trilha_txt = trilha_txt[:w - 7] + "…"
            pad3 = max(0, w - 2 - len(trilha_txt))
            print(f"{CYAN}║{GRAY}{trilha_txt}{' ' * pad3}{CYAN}║{RESET}")

        print(f"{CYAN}╚{linha_horiz}╝{RESET}\n")

    def renderizar_pensamento_persona(self, persona: Any, pensamento: str):
        """Renderiza a caixa de raciocínio interno da persona médica."""
        w = self.obter_largura_terminal()
        linha = "─" * (w - 4)
        tit = f"┌─ {BOLD}{persona.avatar} Raciocínio Clínico ({persona.nome}) {RESET}{YELLOW}"
        pad_tit = max(0, w - 2 - self._tamanho_visivel(tit))
        print(f"{YELLOW}{tit}{linha[:pad_tit]}┐{RESET}")
        
        linhas_pensamento = self._quebrar_texto(pensamento, w - 6)
        for l in linhas_pensamento:
            pad = max(0, w - 4 - len(l))
            print(f"{YELLOW}│ {ITALIC}{WHITE}{l}{' ' * pad}{YELLOW}│{RESET}")
        print(f"{YELLOW}└{'─' * (w - 2)}┘{RESET}\n")

    def renderizar_mensagem_usuario(
        self,
        texto: str,
        persona: Any,
        tipo_acao: str = "comando"
    ):
        """Renderiza o balão de mensagem enviado pelo usuário simulado."""
        w = self.obter_largura_terminal()
        linha = "─" * (w - 4)
        hora = datetime.now().strftime("%H:%M:%S")

        badges = {
            "clique": f"{CYAN}[CLIQUE INLINE]{RESET}",
            "backtrack": f"{YELLOW}[RETORNO/VOLTAR]{RESET}",
            "fuzzing": f"{RED}[FUZZING/EDGE-CASE]{RESET}",
            "comando": f"{GREEN}[COMANDO/TEXTO]{RESET}",
            "audio": f"{MAGENTA}[🎙️ NOTA DE VOZ]{RESET}",
            "imagem": f"{BLUE}[🖼️ IMAGEM DE EXAME]{RESET}"
        }
        badge = badges.get(tipo_acao, f"{GREEN}[AÇÃO]{RESET}")

        tag = f" 👤 Wagner ({persona.nome}) {badge} ─ {hora} "
        pad_tag = max(0, w - 4 - self._tamanho_visivel(tag))

        print(f"{GREEN}┌{tag}{linha[:pad_tag]}┐{RESET}")
        linhas_texto = self._quebrar_texto(texto, w - 6)
        for l in linhas_texto:
            pad = max(0, w - 4 - len(l))
            print(f"{GREEN}│ {BOLD}{WHITE}{l}{' ' * pad}{GREEN}│{RESET}")
        print(f"{GREEN}└{'─' * (w - 2)}┘{RESET}\n")

    def renderizar_resposta_bot(
        self,
        texto_bot: str,
        botoes: List[List[Dict[str, str]]],
        tempo_ms: int,
        tipo: str = "texto"
    ):
        """Renderiza o balão do bot com o texto e a grade visual de botões inline."""
        w = self.obter_largura_terminal()
        linha = "─" * (w - 4)
        hora = datetime.now().strftime("%H:%M:%S")

        tag_tipo = f"{MAGENTA}[EDITADO]{RESET}" if tipo == "edit" else ""
        lat_cor = GREEN if tempo_ms < 500 else (YELLOW if tempo_ms < 1500 else RED)
        tag = f" 🤖 Ultra Rotina Bot {tag_tipo} ─ {hora} ({lat_cor}{tempo_ms}ms{RESET}) "
        pad_tag = max(0, w - 4 - self._tamanho_visivel(tag))

        print(f"{BLUE}┌{tag}{linha[:pad_tag]}┐{RESET}")

        # Corpo da mensagem do bot
        linhas_corpo = self._quebrar_texto(texto_bot, w - 6)
        if len(linhas_corpo) > 24:
            linhas_exibir = linhas_corpo[:22] + [f"{DIM}... [exibição resumida: {len(linhas_corpo)} linhas totais] ...{RESET}"]
        else:
            linhas_exibir = linhas_corpo

        for l in linhas_exibir:
            l_colorida = (
                l.replace("*", f"{BOLD}")
                 .replace("🚨", f"{RED}🚨{RESET}{WHITE}")
                 .replace("⚡", f"{YELLOW}⚡{RESET}{WHITE}")
                 .replace("✅", f"{GREEN}✅{RESET}{WHITE}")
                 .replace("•", f"{CYAN}•{RESET}{WHITE}")
            )
            comp_real = self._tamanho_visivel(l)
            pad = max(0, w - 4 - comp_real)
            print(f"{BLUE}│ {WHITE}{l_colorida}{' ' * pad}{BLUE}│{RESET}")

        # Se houver botões inline, desenha a grade de teclado
        if botoes and len(botoes) > 0:
            tot_b = sum(len(r) for r in botoes)
            print(f"{BLUE}├─ {BOLD}{CYAN}📱 Teclado Inline do Telegram ({tot_b} opções){RESET}{BLUE} {'─' * max(0, w - 46)}┤{RESET}")
            for row in botoes:
                self._renderizar_linha_botoes(row, w)

        print(f"{BLUE}└{'─' * (w - 2)}┘{RESET}\n")

    def _renderizar_linha_botoes(self, row: List[Dict[str, str]], largura_total: int):
        """Renderiza uma fileira de botões inline com balanceamento ergonômico."""
        if not row:
            return

        w_util = largura_total - 6
        n_btns = len(row)
        largura_btn = max(14, int((w_util - (n_btns - 1) * 2) / n_btns))

        linha_topo = "  "
        linha_conteudo = "  "
        linha_base = "  "

        for b in row:
            rotulo = b.get("text", "")
            if len(rotulo) > largura_btn - 4:
                rotulo = rotulo[:largura_btn - 5] + "…"
            
            comp_rotulo = self._tamanho_visivel(rotulo)
            pad_esq = max(0, (largura_btn - 2 - comp_rotulo) // 2)
            pad_dir = max(0, largura_btn - 2 - comp_rotulo - pad_esq)

            linha_topo += f"{CYAN}┌{'─' * (largura_btn - 2)}┐ {RESET}"
            linha_conteudo += f"{CYAN}│{RESET}{' ' * pad_esq}{BOLD}{WHITE}{rotulo}{RESET}{' ' * pad_dir}{CYAN}│ {RESET}"
            linha_base += f"{CYAN}└{'─' * (largura_btn - 2)}┘ {RESET}"

        print(f"{BLUE}│{RESET}{linha_topo[:largura_total - 4]}")
        print(f"{BLUE}│{RESET}{linha_conteudo[:largura_total - 4]}")
        print(f"{BLUE}│{RESET}{linha_base[:largura_total - 4]}")

    def renderizar_acao_em_progresso(self, mensagem: str):
        sys.stdout.write(f"\r{DIM}⏳ {mensagem}...{RESET}")
        sys.stdout.flush()

    def limpar_linha_status(self):
        sys.stdout.write("\r\033[K")
        sys.stdout.flush()

    def _quebrar_texto(self, texto: str, max_largura: int) -> List[str]:
        resultado = []
        for bloco in texto.split("\n"):
            if not bloco:
                resultado.append("")
                continue
            palavras = bloco.split(" ")
            linha_atual = ""
            for p in palavras:
                if len(linha_atual) + len(p) + 1 <= max_largura:
                    linha_atual += (p if not linha_atual else " " + p)
                else:
                    if linha_atual:
                        resultado.append(linha_atual)
                    linha_atual = p
            if linha_atual:
                resultado.append(linha_atual)
        return resultado

    def _tamanho_visivel(self, s: str) -> int:
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        return len(ansi_escape.sub('', s))
