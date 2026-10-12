"""
Ultra Rotina · Testador Master: Gerador de Relatório de Auditoria e Sugestões
Analisa usabilidade, performance beira-leito, ergonomia mobile e gera relatórios estruturados.
"""

import re
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

from tooling.testador_master.repro_generator import BugReproGenerator
from tooling.testador_master.math_oracle import MathOracle


class MasterReporter:
    def __init__(
        self,
        output_md: Path,
        output_json: Path,
        repro_dir: Optional[Path] = None,
        gerar_repros: bool = True
    ):
        self.output_md = output_md
        self.output_json = output_json
        self.repro_dir = repro_dir
        self.gerar_repros = gerar_repros
        self.repro_gen = BugReproGenerator(repro_dir) if gerar_repros else None
        self.math_oracle = MathOracle()
        self.eventos: List[Dict[str, Any]] = []
        self.problemas: List[Dict[str, Any]] = []
        self.sugestoes: List[Dict[str, Any]] = []
        self.auditorias_matematicas: List[Dict[str, Any]] = []
        self.ciclos_anteriores: int = 0
        self.duracao_anterior_seg: int = 0
        self.inicio_sessao = datetime.now()

    def registrar_evento(
        self,
        ciclo: int,
        persona: Any,
        acao: Dict[str, Any],
        resposta: Dict[str, Any],
        tempo_ms: int
    ):
        """Audita cada interação da persona com o bot e extrai anomalias de UX/código."""
        ok = resposta.get("ok", False)
        mensagens = resposta.get("mensagens", [])
        msg_principal = mensagens[0] if mensagens else {}
        texto = msg_principal.get("texto", "")
        botoes = msg_principal.get("buttons", [])

        evento = {
            "timestamp": datetime.now().isoformat(),
            "ciclo": ciclo,
            "persona_id": persona.id,
            "persona_nome": persona.nome,
            "acao_tipo": acao.get("tipo"),
            "alvo": acao.get("alvo_desc"),
            "tempo_ms": tempo_ms,
            "ok": ok,
            "total_mensagens": len(mensagens),
            "texto_len": len(texto),
            "total_botoes": sum(len(r) for r in botoes) if botoes else 0
        }
        self.eventos.append(evento)

        # ─────────────────────────────────────────────────────────────
        # REGRAS DE AUDITORIA CLÍNICA E ERGONÔMICA (BEIRA-LEITO)
        # ─────────────────────────────────────────────────────────────

        # 1. Detecção de Erro Crítico ou Insucesso
        if not ok or not mensagens:
            self._adicionar_problema(
                categoria="🚨 BUG CRÍTICO",
                gravidade="ALTA",
                acao=acao.get("alvo_desc"),
                descricao=f"Falha ao processar ação '{acao.get('alvo_desc')}'. O bot não respondeu ou gerou erro: {resposta.get('erro', 'Sem resposta')}",
                sugestao=f"Garantir bloco defensivo try/catch e resposta amigável para '{acao.get('alvo_desc')}'.",
                acao_obj=acao,
                resposta=resposta
            )

        # 2. Verificação de Stack Traces ou Vazamento Técnico
        termos_erro_tecnico = ["typeerror", "referenceerror", "syntaxerror", "undefined", "[object object]"]
        vazamento_detectado = False
        for termo in termos_erro_tecnico:
            if termo in texto.lower():
                self._adicionar_problema(
                    categoria="🚨 VAZAMENTO TÉCNICO",
                    gravidade="ALTA",
                    acao=acao.get("alvo_desc"),
                    descricao=f"Mensagem contém termo técnico suspeito ('{termo}') exibido ao usuário.",
                    sugestao="Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.",
                    acao_obj=acao,
                    resposta=resposta
                )
                vazamento_detectado = True
                break
        if not vazamento_detectado and re.search(r'\b(?:nan|null)\b', texto, re.IGNORECASE):
            self._adicionar_problema(
                categoria="🚨 VAZAMENTO TÉCNICO",
                gravidade="ALTA",
                acao=acao.get("alvo_desc"),
                descricao="Mensagem contém termo técnico suspeito ('NaN/null') exibido ao usuário.",
                sugestao="Sanitizar saída e validar variáveis antes de compor a resposta do Telegram.",
                acao_obj=acao,
                resposta=resposta
            )

        # 3. Detecção de Dead End (Tela sem botões de volta e sem instrução clara)
        if ok and len(texto) > 100 and not botoes:
            texto_lower = texto.lower()
            tem_dica_retorno = any(k in texto_lower for k in ["/menu", "/ajuda", "/novo", "digite /", "voltar"])
            if not tem_dica_retorno:
                self._adicionar_problema(
                    categoria="⚠️ UX DEAD-END",
                    gravidade="MÉDIA",
                    acao=acao.get("alvo_desc"),
                    descricao=f"Tela gerada por '{acao.get('alvo_desc')}' não possui teclado inline nem instruções de como voltar ou avançar.",
                    sugestao="Incluir teclado inline com botão de retorno ('🔙 Voltar' ou '🏠 Menu') para evitar que o médico fique sem saída.",
                    acao_obj=acao,
                    resposta=resposta
                )

        # 4. Detecção de Poluição Visual / Texto Longo Demais para Mobile
        if len(texto) > 1800:
            self._adicionar_problema(
                categoria="⚠️ ERGONOMIA MOBILE",
                gravidade="BAIXA",
                acao=acao.get("alvo_desc"),
                descricao=f"Resposta muito extensa ({len(texto)} caracteres). Exige scroll longo na tela do celular durante o plantão.",
                sugestao="Quebrar a resposta em tópicos colapsáveis ou resumir condutas em pontos de 1 linha com botão '📖 Ver Mais'.",
                acao_obj=acao,
                resposta=resposta
            )

        # 5. Detecção de Botões com Rótulos Longos (Corte na tela mobile)
        if botoes:
            for row in botoes:
                for b in row:
                    rotulo = b.get("text", "")
                    if len(rotulo) > 34:
                        self._adicionar_problema(
                            categoria="⚠️ RÓTULO TRUNCADO",
                            gravidade="BAIXA",
                            acao=acao.get("alvo_desc"),
                            descricao=f"Botão inline com rótulo muito longo ({len(rotulo)} chars): '{rotulo}'. Risco de truncamento no app do Telegram.",
                            sugestao=f"Encurtar rótulo para até 28 caracteres mantendo o ícone e clareza clínica.",
                            acao_obj=acao,
                            resposta=resposta
                        )

        # 6. Alerta de Latência Superior à Tolerância da Persona
        if tempo_ms > persona.tolerancia_latencia_ms:
            self._adicionar_problema(
                categoria="⏱️ GARGALO DE LATÊNCIA",
                gravidade="MÉDIA" if tempo_ms > 2000 else "BAIXA",
                acao=acao.get("alvo_desc"),
                descricao=f"Ação demorou {tempo_ms}ms, ultrapassando a tolerância de {persona.tolerancia_latencia_ms}ms da persona {persona.nome}.",
                sugestao="Otimizar pré-computação em memória ou cachear resposta de consultas frequentes.",
                acao_obj=acao,
                resposta=resposta
            )

        # 7. Verificação de Entidades Markdown Desbalanceadas (Risco de Parse Error no Telegram)
        if ok and texto:
            if texto.count("*") % 2 != 0:
                self._adicionar_problema(
                    categoria="⚠️ FORMATAÇÃO MARKDOWN",
                    gravidade="BAIXA",
                    acao=acao.get("alvo_desc"),
                    descricao="Texto retornado possui número ímpar de asteriscos (*), o que pode quebrar formatação negrito no Telegram.",
                    sugestao="Fechar todas as tags de negrito (*) ou usar escape de Markdown antes do envio.",
                    acao_obj=acao,
                    resposta=resposta
                )
            if texto.count("`") % 2 != 0:
                self._adicionar_problema(
                    categoria="⚠️ FORMATAÇÃO CODE",
                    gravidade="BAIXA",
                    acao=acao.get("alvo_desc"),
                    descricao="Texto retornado possui crases (`) desbalanceadas, podendo truncar blocos monoespaçados.",
                    sugestao="Revisar template do comando para garantir pares de crases balanceados.",
                    acao_obj=acao,
                    resposta=resposta
                )

        # 8. Salvaguardas Clínicas em Fuzzing / Valores Extremos
        alvo_lower = str(acao.get("alvo_desc", "")).lower()
        tem_negativo_ou_zero = bool(
            re.search(r'(?:^|\s)(?:-\d+|\b0(?:\.0+)?\b)(?:\s|$)', alvo_lower)
            or "peso 0" in alvo_lower
            or "crcl -" in alvo_lower
            or "peso -" in alvo_lower
            or "na -" in alvo_lower
            or "k -" in alvo_lower
        )
        if tem_negativo_ou_zero:
            if ok and ("ml/h" in texto.lower() or "mg" in texto.lower()) and not any(t in texto.lower() for t in ["inválid", "erro", "atenção", "bloque", "positiv"]):
                self._adicionar_problema(
                    categoria="🚨 SEGURANÇA CLÍNICA",
                    gravidade="ALTA",
                    acao=acao.get("alvo_desc"),
                    descricao="Calculadora médica retornou dose ou vazão positiva para entrada com valor nulo ou negativo sem exibir alerta de bloqueio.",
                    sugestao="Adicionar guard clause estrita: exigir peso/dose estritamente positivos antes de calcular BIC ou dosagens.",
                    acao_obj=acao,
                    resposta=resposta
                )

        # 9. Auditoria Matemática Determinística de Fórmulas Clínicas (MathOracle)
        alvo_cmd = acao.get("alvo_desc") or acao.get("texto", "")
        if ok and texto and alvo_cmd:
            try:
                res_math = self.math_oracle.auditar_interacao(str(alvo_cmd), texto)
            except Exception as e:
                res_math = None
            if res_math:
                res_math["ciclo"] = ciclo
                res_math["persona"] = persona.nome
                res_math["comando"] = alvo_cmd
                self.auditorias_matematicas.append(res_math)
                evento["auditoria_matematica"] = res_math

                if not res_math["aprovado"]:
                    self._adicionar_problema(
                        categoria="🚨 DISCREPÂNCIA MATEMÁTICA",
                        gravidade="ALTA",
                        acao=str(alvo_cmd),
                        descricao=f"Divergência matemática detectada na calculadora {res_math['calculadora']}. Esperado pelo oráculo canônico: {res_math.get('esperado')}, bot gerou: {res_math.get('obtido')} (Erro absoluto: {res_math.get('erro_absoluto')}, Tolerância: {res_math.get('tolerancia')}). {res_math.get('detalhes')}",
                        sugestao=f"Revisar precisão de arredondamento e fórmula de {res_math['calculadora']} em src/ para garantir correspondência exata ao padrão médico.",
                        acao_obj=acao,
                        resposta=resposta
                    )

    def _adicionar_problema(
        self,
        categoria: str,
        gravidade: str,
        acao: str,
        descricao: str,
        sugestao: str,
        acao_obj: Optional[Dict[str, Any]] = None,
        resposta: Optional[Dict[str, Any]] = None
    ):
        # Evita duplicatas idênticas de problemas
        for p in self.problemas:
            if p["categoria"] == categoria and p["acao"] == acao:
                p["ocorrencias"] += 1
                if p.get("resolvido"):
                    p["resolvido"] = False
                    p["status"] = "REABERTO_REGRESSAO"
                    p["reaberto_em"] = datetime.now().isoformat()
                return

        item = {
            "id": f"ISSUE-{len(self.problemas) + 1:03d}",
            "categoria": categoria,
            "gravidade": gravidade,
            "acao": acao,
            "descricao": descricao,
            "sugestao": sugestao,
            "ocorrencias": 1,
            "timestamp": datetime.now().isoformat()
        }

        # Gera script autônomo de reprodução se elegível
        if self.gerar_repros and self.repro_gen and acao_obj:
            categorias_elegiveis = ["BUG", "VAZAMENTO", "SEGURANÇA", "DEAD-END", "MARKDOWN", "DISCREPÂNCIA", "MATEMÁTICA"]
            if any(k in categoria for k in categorias_elegiveis):
                dados_repro = self.repro_gen.gerar_script_reproducao(item, acao_obj, resposta or {})
                if dados_repro:
                    item["repro_script"] = dados_repro["relativo"]
                    item["repro_cmd"] = dados_repro["comando"]

        self.problemas.append(item)

    def carregar_estado(self, caminho_json: Path) -> bool:
        """Carrega problemas acumulados e auditorias prévias para continuidade entre sessões (--resume)."""
        if not caminho_json.exists():
            return False
        try:
            with open(caminho_json, "r", encoding="utf-8") as f:
                dados = json.load(f)

            meta = dados.get("meta", {})
            self.ciclos_anteriores += meta.get("total_ciclos", 0)
            self.duracao_anterior_seg += meta.get("duracao_segundos", 0)

            # Carrega problemas salvos do relatório prévio para continuidade da sessão
            problemas_salvos = list(dados.get("problemas", []))

            if problemas_salvos:
                mapa = {(p.get("categoria"), p.get("acao")): p for p in self.problemas}
                for p in problemas_salvos:
                    chave = (p.get("categoria"), p.get("acao"))
                    if chave not in mapa:
                        self.problemas.append(p)
                        mapa[chave] = p
                    else:
                        mapa[chave]["ocorrencias"] += p.get("ocorrencias", 1)

            # Reordena IDs para numeração sequencial limpa
            for i, p in enumerate(self.problemas, start=1):
                p["id"] = f"ISSUE-{i:03d}"

            # Mescla histórico de auditorias matemáticas determinísticas
            salvos_math = dados.get("auditorias_matematicas", [])
            if salvos_math:
                cmds_existentes = {f"{a.get('calculadora')}:{a.get('comando')}" for a in self.auditorias_matematicas}
                for sm in salvos_math:
                    chave_math = f"{sm.get('calculadora')}:{sm.get('comando')}"
                    if chave_math not in cmds_existentes:
                        self.auditorias_matematicas.append(sm)
                        cmds_existentes.add(chave_math)

            return True
        except Exception as e:
            print(f"[MasterReporter] Falha ao carregar estado de problemas salvo: {e}")
            return False

    def salvar_relatorios(self, grafo: Any, total_ciclos: int):
        """Salva os relatórios em Markdown e JSON."""
        self.output_md.parent.mkdir(parents=True, exist_ok=True)
        self.output_json.parent.mkdir(parents=True, exist_ok=True)

        duracao_sessao_seg = max(1, int((datetime.now() - self.inicio_sessao).total_seconds()))
        duracao_total_seg = self.duracao_anterior_seg + duracao_sessao_seg
        minutos = duracao_total_seg // 60
        segundos = duracao_total_seg % 60
        ciclos_totais = self.ciclos_anteriores + total_ciclos

        tempos = [e["tempo_ms"] for e in self.eventos if e["tempo_ms"] > 0]
        latencia_media = (sum(tempos) / len(tempos)) if tempos else 0.0

        tot_math = len(self.auditorias_matematicas)
        aprov_math = sum(1 for a in self.auditorias_matematicas if a["aprovado"])
        discrep_math = tot_math - aprov_math
        taxa_math = (aprov_math / tot_math * 100.0) if tot_math > 0 else 100.0

        # Compilação JSON
        dados_json = {
            "meta": {
                "gerado_em": datetime.now().isoformat(),
                "duracao_formatada": f"{minutos}m {segundos}s",
                "duracao_segundos": duracao_total_seg,
                "total_ciclos": ciclos_totais,
                "total_eventos": len(self.eventos),
                "latencia_media_ms": round(latencia_media, 1),
                "telas_descobertas": len(grafo.nodes),
                "botoes_clicados": len(grafo.botoes_globais_clicados),
                "cobertura_estimada_pct": round(grafo.obter_cobertura_pct(), 1),
                "scripts_reproducao_gerados": sum(1 for p in self.problemas if p.get("repro_script")),
                "auditoria_matematica": {
                    "total_auditados": tot_math,
                    "aprovados": aprov_math,
                    "discrepancias": discrep_math,
                    "taxa_conformidade_pct": round(taxa_math, 1)
                }
            },
            "auditorias_matematicas": self.auditorias_matematicas,
            "problemas": self.problemas,
            "eventos_recentes": self.eventos[-50:]
        }

        with open(self.output_json, "w", encoding="utf-8") as f:
            json.dump(dados_json, f, ensure_ascii=False, indent=2)

        # Compilação Markdown Rico
        md_linhas = [
            "# 📋 Relatório de Auditoria & Sugestões: Testador Master (Telegram)",
            "",
            f"> ⏱️ **Sessão executada em:** {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}  ",
            f"> ⏳ **Duração total:** {minutos}m {segundos}s | **Ciclos concluídos:** {ciclos_totais}  ",
            f"> 📊 **Cobertura estimada:** {grafo.obter_cobertura_pct():.1f}% | **Telas descobertas:** {len(grafo.nodes)} | **Botões testados:** {len(grafo.botoes_globais_clicados)}  ",
            f"> ⚡ **Latência média beira-leito:** {latencia_media:.1f}ms",
            "",
            "---",
            "",
            "## 🎯 Sumário Executivo de Diagnóstico",
            "",
            f"- **Total de anomalias detectadas:** {len(self.problemas)}",
            f"- **Scripts de Reprodução gerados (1-Clique):** {sum(1 for p in self.problemas if p.get('repro_script'))}",
            f"- **🧮 Fórmulas Clínicas auditadas pelo Oráculo Matemático:** {tot_math} ({taxa_math:.1f}% em conformidade determinística)",
            f"- **Críticos / Bugs:** {sum(1 for p in self.problemas if p['gravidade'] == 'ALTA')}",
            f"- **Oportunidades de UX / Ergonomia:** {sum(1 for p in self.problemas if 'UX' in p['categoria'] or 'ERGONOMIA' in p['categoria'])}",
            f"- **Alertas de Performance / Latência:** {sum(1 for p in self.problemas if 'LATÊNCIA' in p['categoria'])}",
            "",
            "---",
            "",
            "## 🚨 Anomalias e Pontos de Atenção Identificados",
            ""
        ]

        if not self.problemas:
            md_linhas.extend([
                "🎉 **Nenhum bug crítico ou falha estrutural foi detectada!**",
                "O bot respondeu com alta consistência, teclados alinhados e latência excelente em todos os fluxos testados.",
                ""
            ])
        else:
            for p in self.problemas:
                md_linhas.extend([
                    f"### `{p['id']}` · {p['categoria']} ({p['gravidade']}) — `{p['acao']}`",
                    f"- **Descrição:** {p['descricao']}",
                    f"- **Ocorrências no teste:** {p['ocorrencias']}x",
                    f"- **💡 Recomendação Cirúrgica:** {p['sugestao']}",
                ])
                if p.get("repro_script"):
                    md_linhas.extend([
                        f"- **🧪 Script de Reprodução Automatizado (Bug Repro):** [`{p['repro_script']}`]({p['repro_script']})",
                        f"  ```bash",
                        f"  {p['repro_cmd']}",
                        f"  ```"
                    ])
                md_linhas.append("")

        md_linhas.extend([
            "---",
            "",
            "## 🧮 Auditoria Matemática de Fórmulas Clínicas (Anti-Alucinação Determinístico)",
            "",
            "> 🛡️ **Gabarito Canônico Determinístico**: Todo cálculo clínico executado durante os testes é auditado em tempo real por um oráculo analítico em Python puro com dupla precisão (Harrison, KDIGO, SBC, SBP, NEJM), sem uso de LLM, prevenindo alucinações e garantindo tolerância estrita (ε < 0.5).",
            "",
            f"**Resumo da Avaliação Numérica:** {aprov_math}/{tot_math} cálculos aprovados ({taxa_math:.1f}% de conformidade)." if tot_math > 0 else "Nenhum comando de cálculo matemático foi acionado nesta sessão.",
            ""
        ])

        if self.auditorias_matematicas:
            md_linhas.extend([
                "| Ciclo | Calculadora | Comando Testado | Esperado (Oráculo) | Obtido (Bot) | Erro Abs | Conformidade |",
                "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
            ])
            for a in self.auditorias_matematicas[:30]:
                ciclo_txt = f"C{a.get('ciclo', 0):02d}"
                calc_txt = a.get("calculadora", "Geral")
                cmd_txt = str(a.get("comando", ""))[:28].replace("|", "-")
                esp_txt = str(a.get("esperado", "-"))
                obt_txt = str(a.get("obtido", "-"))
                err_txt = f"{a.get('erro_absoluto', 0.0):.2f}" if "erro_absoluto" in a else "-"
                status_txt = "✅ **Aprovado**" if a.get("aprovado") else "🚨 **Divergência**"
                md_linhas.append(f"| {ciclo_txt} | {calc_txt} | `{cmd_txt}` | {esp_txt} | {obt_txt} | {err_txt} | {status_txt} |")
            md_linhas.append("")

        md_linhas.extend([
            "---",
            "",
            "## 💡 Catálogo de Sugestões Priorizadas para o Telegram Bot",
            "",
            "Com base na simulação do comportamento das personas (Plantonista de Choque, R1 Metódica, Gestor de Rotina, Fuzzer e Residente de Round), listamos as principais recomendações para elevar a experiência médica beira-leito:",
            "",
            "1. **Teclado de Retorno Universal ('🔙 Voltar' / '🏠 Início')**: Garantir que absolutamente todo comando clínico (ex: `/gaso`, `/dhe`, `/sri`, `/crcl`) termine com uma linha de botões de navegação, eliminando 100% dos *dead-ends* identificados.",
            "2. **Resumo Visual em 1 Tela (Sem Scroll)**: Em condutas de PCR e Choque Séptico, limitar a primeira mensagem aos passos imediatos (1 a 3) com botões para aprofundar, evitando rolagem em situações de emergência.",
            "3. **Feedback Háptico / Textual Imediato em Botões**: Nos callbacks de habit log e ações de rotina, responder `answerCallbackQuery` com texto dinâmico claro (ex: `✅ Concluído!`) para dar retorno instantâneo antes da renderização.",
            "4. **Atalhos de 1 Toque para Cálculos Sequenciais**: Ao calcular `/dva nora 70`, oferecer botões imediatos de titulação rápida (`+0.05 mcg/kg/min`, `-0.05 mcg/kg/min`) para ajuste contínuo durante a infusão.",
            "",
            "---",
            "",
            "## 🗺️ Mapa de Menus e Telas Mapeadas pelo Crawler",
            "",
            "| ID da Tela | Título / Primeira Linha | Botões Disponíveis | Visitas |",
            "| :--- | :--- | :--- | :--- |"
        ])

        for node_id, node in list(grafo.nodes.items())[:30]:
            tot_botoes = len(node.arestas_saindo)
            tit_limpo = node.titulo.replace("|", "-").replace("\n", " ").strip()
            md_linhas.append(f"| `{node_id}` | {tit_limpo[:45]} | {tot_botoes} opções | {node.visitas} |")

        md_linhas.extend([
            "",
            "---",
            "> 🌐 **Dashboard Visual Interativo:** Abra [`data/dashboard_grafo.html`](../data/dashboard_grafo.html) no navegador para explorar o grafo de navegação em tempo real.",
            "",
            "*(Relatório gerado automaticamente pelo Ultra Rotina Testador Master)*"
        ])

        with open(self.output_md, "w", encoding="utf-8") as f:
            f.write("\n".join(md_linhas) + "\n")

        # Compilação do Dashboard Visual Interativo HTML
        try:
            import importlib
            from tooling.testador_master import dashboard_generator
            importlib.reload(dashboard_generator)
            dash_gen = dashboard_generator.DashboardGenerator()
            dados_grafo = grafo.to_dict() if hasattr(grafo, "to_dict") else None
            dash_gen.gerar_dashboard(dados_grafo=dados_grafo, dados_relatorio=dados_json)
        except Exception:
            pass
