"""
Ultra Rotina · Testador Master: Crawler Engine & Máquina de Estados
Rastreia o grafo de telas e botões do Telegram, seleciona ações
com base na persona ativa e maximiza a cobertura de rotas.
Suporta persistência/retomada de estado e rastreamento de breadcrumbs.
"""

import json
import hashlib
import random
from pathlib import Path
from typing import Dict, List, Set, Optional, Any


class TelaNode:
    def __init__(self, tela_id: str, titulo: str, texto: str, botoes: List[List[Dict[str, str]]]):
        self.id = tela_id
        self.titulo = titulo
        self.texto = texto
        self.botoes = botoes
        self.visitas = 0
        self.arestas_saindo: Dict[str, Dict[str, Any]] = {}

        for row in botoes:
            for b in row:
                rotulo = b.get("text", "").strip()
                cb_data = b.get("callback_data", "").strip()
                chave = cb_data if cb_data else f"label:{rotulo}"
                if chave:
                    self.arestas_saindo[chave] = {
                        "text": rotulo,
                        "callback_data": cb_data,
                        "url": b.get("url", ""),
                        "cliques": 0
                    }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "titulo": self.titulo,
            "texto": self.texto,
            "botoes": self.botoes,
            "visitas": self.visitas,
            "arestas_saindo": self.arestas_saindo
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TelaNode":
        node = cls(data["id"], data["titulo"], data["texto"], data["botoes"])
        node.visitas = data.get("visitas", 0)
        node.arestas_saindo = data.get("arestas_saindo", {})
        return node


class ScreenGraph:
    def __init__(self):
        self.nodes: Dict[str, TelaNode] = {}
        self.historico_acoes: List[Dict[str, Any]] = []
        self.botoes_globais_descobertos: Set[str] = set()
        self.botoes_globais_clicados: Set[str] = set()
        self.comandos_testados: Set[str] = set()
        self.dead_ends: Set[str] = set()
        self.tela_atual_id: Optional[str] = None
        self.breadcrumbs: List[str] = []

    def gerar_id_tela(self, texto: str, botoes: List[List[Dict[str, str]]]) -> str:
        """Gera um hash único representativo da tela e de seus botões."""
        primeiras_linhas = "\n".join(texto.split("\n")[:3])
        botoes_sig = []
        for r in botoes:
            for b in r:
                botoes_sig.append(b.get("callback_data") or b.get("text") or "")
        
        bruto = f"{primeiras_linhas}|{'#'.join(botoes_sig)}"
        return hashlib.sha1(bruto.encode("utf-8")).hexdigest()[:12]

    def registrar_tela(self, texto: str, botoes: List[List[Dict[str, str]]]) -> TelaNode:
        """Adiciona ou atualiza uma tela no grafo e gerencia a trilha de navegação."""
        tela_id = self.gerar_id_tela(texto, botoes)
        linhas = [l.strip() for l in texto.split("\n") if l.strip()]
        titulo = linhas[0][:50] if linhas else "Tela Sem Texto"

        if tela_id not in self.nodes:
            node = TelaNode(tela_id, titulo, texto, botoes)
            self.nodes[tela_id] = node
            for chave in node.arestas_saindo:
                self.botoes_globais_descobertos.add(chave)
        else:
            node = self.nodes[tela_id]

        node.visitas += 1
        self.tela_atual_id = tela_id

        # Atualiza a trilha de navegação (breadcrumbs)
        tit_curto = titulo.replace("*", "").replace("⚡", "").replace("🚨", "").strip()[:24]
        if not self.breadcrumbs or self.breadcrumbs[-1] != tit_curto:
            self.breadcrumbs.append(tit_curto)
            if len(self.breadcrumbs) > 5:
                self.breadcrumbs.pop(0)

        # Se não tiver botões e não for tela transitória, é um potencial dead end
        if not node.arestas_saindo and "voltar" not in texto.lower() and "menu" not in texto.lower():
            self.dead_ends.add(tela_id)

        return node

    def registrar_clique(self, tela_id: str, chave_botao: str):
        """Registra a execução de um clique."""
        self.botoes_globais_clicados.add(chave_botao)
        if tela_id in self.nodes and chave_botao in self.nodes[tela_id].arestas_saindo:
            self.nodes[tela_id].arestas_saindo[chave_botao]["cliques"] += 1

    def registrar_comando(self, comando_ou_texto: str):
        cmd = comando_ou_texto.split(" ")[0].strip()
        self.comandos_testados.add(cmd)

    def obter_cobertura_pct(self, total_comandos_conhecidos: int = 40) -> float:
        """Calcula o percentual de cobertura estimado da exploração."""
        total_descoberto = len(self.botoes_globais_descobertos) + total_comandos_conhecidos
        if total_descoberto == 0:
            return 0.0
        total_testado = len(self.botoes_globais_clicados) + len(self.comandos_testados)
        return min(100.0, (total_testado / total_descoberto) * 100.0)

    def obter_breadcrumbs_str(self) -> str:
        """Retorna a trilha de navegação formatada para a TUI."""
        if not self.breadcrumbs:
            return "Início"
        return " ➔ ".join(self.breadcrumbs)

    def decidir_proxima_acao(
        self,
        persona: Any,
        permitir_fuzzing: bool = True
    ) -> Dict[str, Any]:
        """
        Decide cirurgicamente a próxima ação:
        1. Fuzzing comportamental (se sorteado pela persona)
        2. Navegação em botões da tela atual (priorizando afinidade clínica e novidade)
        3. Backtracking inteligente (se todos os botões já foram explorados)
        4. Injeção de comando dinâmico da persona
        """
        # 1. Avalia se aplica fuzzing nesta rodada
        if permitir_fuzzing and random.random() < persona.prob_fuzzing:
            escolhida = persona.gerar_comando_dinamico()
            if escolhida.get("tipo") == "fuzzing":
                return {
                    "tipo": "fuzzing",
                    "texto": escolhida["texto"],
                    "alvo_desc": escolhida["texto"],
                    "pensamento": persona.gerar_pensamento("fuzzing", escolhida["texto"])
                }

        node_atual = self.nodes.get(self.tela_atual_id) if self.tela_atual_id else None

        # 2. Se a tela atual tiver botões inline disponíveis
        if node_atual and node_atual.arestas_saindo:
            candidatos = []
            ultimas_acoes = [a.get("alvo_desc") for a in self.historico_acoes[-4:]]

            for chave, dados in node_atual.arestas_saindo.items():
                if dados.get("url"):
                    continue
                
                rotulo = dados["text"].lower()
                cb = dados["callback_data"].lower()
                cliques = dados["cliques"]

                # Pontuação de interesse
                score = 100.0

                if cliques == 0:
                    score += 150.0
                if chave not in self.botoes_globais_clicados:
                    score += 200.0

                for kw in persona.palavras_chave_botoes:
                    if kw in rotulo or kw in cb:
                        score += 80.0
                        break

                score -= (cliques * 60.0)

                if dados["text"] in ultimas_acoes:
                    score -= 100.0

                if any(v in rotulo for v in ["voltar", "início", "inicio", "menu"]):
                    if any(d["cliques"] == 0 for d in node_atual.arestas_saindo.values()):
                        score -= 70.0
                    else:
                        score += 60.0

                candidatos.append((score, chave, dados))

            if candidatos:
                candidatos.sort(key=lambda x: x[0], reverse=True)
                melhor_score, melhor_chave, melhor_dados = candidatos[0]

                if melhor_score > 0:
                    eh_backtrack = any(v in melhor_dados["text"].lower() for v in ["voltar", "início", "inicio", "menu"])
                    tipo_acao = "backtrack" if eh_backtrack else "clique"
                    return {
                        "tipo": "clique",
                        "tela_id": node_atual.id,
                        "chave": melhor_chave,
                        "callback_data": melhor_dados["callback_data"],
                        "rotulo": melhor_dados["text"],
                        "alvo_desc": melhor_dados["text"],
                        "pensamento": persona.gerar_pensamento(tipo_acao, melhor_dados["text"])
                    }

        # 3. Dispara comando dinâmico gerado pela persona
        cmd_dinamico = persona.gerar_comando_dinamico()
        cmd_alvo = cmd_dinamico["texto"]
        return {
            "tipo": cmd_dinamico.get("tipo", "comando"),
            "texto": cmd_alvo,
            "alvo_desc": cmd_alvo,
            "pensamento": persona.gerar_pensamento("comando", cmd_alvo)
        }

    def salvar_estado(self, caminho_arquivo: Path):
        """Persiste o grafo de navegação em disco para retomada contínua."""
        caminho_arquivo.parent.mkdir(parents=True, exist_ok=True)
        dados = {
            "nodes": {nid: node.to_dict() for nid, node in self.nodes.items()},
            "botoes_descobertos": list(self.botoes_globais_descobertos),
            "botoes_clicados": list(self.botoes_globais_clicados),
            "comandos_testados": list(self.comandos_testados),
            "dead_ends": list(self.dead_ends),
            "tela_atual_id": self.tela_atual_id
        }
        with open(caminho_arquivo, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)

    def carregar_estado(self, caminho_arquivo: Path) -> bool:
        """Carrega estado persistido de sessão anterior."""
        if not caminho_arquivo.exists():
            return False
        try:
            with open(caminho_arquivo, "r", encoding="utf-8") as f:
                dados = json.load(f)
            self.nodes = {nid: TelaNode.from_dict(d) for nid, d in dados.get("nodes", {}).items()}
            self.botoes_globais_descobertos = set(dados.get("botoes_descobertos", []))
            self.botoes_globais_clicados = set(dados.get("botoes_clicados", []))
            self.comandos_testados = set(dados.get("comandos_testados", []))
            self.dead_ends = set(dados.get("dead_ends", []))
            self.tela_atual_id = dados.get("tela_atual_id")
            return True
        except Exception as e:
            print(f"[ScreenGraph] Falha ao carregar estado salvo: {e}")
            return False
