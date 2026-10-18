"""
TELEGRAM ENGINE PRIME 2.0 (telegram_engine.py)
Executa baterias de testes reais no runtime do Telegram Bot:
1. Jornadas Clínicas (Sala Vermelha, Calculadoras, Rotina, SOAP, Plantão).
2. Crawler de Menus e Botões Inline (detecção de redundâncias e becos sem saída).
3. Fuzzing Beira-Leito (entradas extremas, pesos negativos, comandos malformados).
"""

from typing import Dict, Any, List
from .ux_heuristics import UXHeuristicsAuditor


class TelegramEnginePrime:
    def __init__(self, send_bridge_cmd, ux_auditor: UXHeuristicsAuditor, verbose: bool = False):
        self.send_cmd = send_bridge_cmd
        self.ux = ux_auditor
        self.verbose = verbose
        self.results: List[Dict[str, Any]] = []

    def _step(self, step_type: str, value: str, label: str) -> Dict[str, Any]:
        payload = {"cmd": "TELEGRAM", "type": step_type}
        if step_type == "callback":
            payload["data"] = value
        else:
            payload["text"] = value

        res = self.send_cmd(payload)
        full_text = res.get("full_text", "")
        buttons = res.get("buttons", [])
        latency = res.get("latency_ms", 0.0)
        ok = res.get("ok", False) and (len(full_text.strip()) > 0 or len(buttons) > 0)

        # Verifica vazamentos técnicos em todas as respostas
        leaks = self.ux.inspect_text_for_leaks(full_text, context=label, target_file="src/07_menu_navegacao.js")
        if leaks:
            ok = False

        # Audita o teclado inline retornado
        kb_audit = self.ux.inspect_telegram_keyboard(buttons, context=label)

        record = {
            "cenario": label,
            "tipo": step_type,
            "entrada": value,
            "sucesso": ok,
            "latencia_ms": latency,
            "tamanho_resposta": len(full_text),
            "qtd_botoes": len(buttons),
            "vazamentos": leaks,
            "problemas_ux_teclado": kb_audit["issues"],
            "erro": res.get("error"),
            "amostra_texto": full_text[:160].replace("\n", " ") if full_text else "(sem texto capturado)",
            "botoes": buttons
        }
        self.results.append(record)
        return record

    def run_all(self, cycles: int = 1, persona: str = "todas") -> Dict[str, Any]:
        for c in range(cycles):
            self._run_core_clinical_flows(cycle=c + 1)
            self._run_persona_scenarios(persona_filter=persona, cycle=c + 1)
            self._run_inline_menu_crawler()
            self._run_bedside_fuzzing()

    def _run_persona_scenarios(self, persona_filter: str = "todas", cycle: int = 1):
        """Dispara casos clínicos e comandos dinâmicos gerados pelas personas médicas."""
        try:
            from tooling.testador_master.personas import obter_catalogo_personas
            personas = obter_catalogo_personas()
            alvos = [personas[persona_filter]] if persona_filter in personas else list(personas.values())
            for p in alvos:
                cmd_obj = p.gerar_comando_dinamico()
                texto_cmd = cmd_obj.get("texto", "/start")
                self._step("text", texto_cmd, f"[Ciclo {cycle}] {p.avatar} {p.nome} ({p.id}): {texto_cmd}")
        except Exception as e:
            if self.verbose:
                print(f"[Persona Engine] Aviso: {e}")

        total = len(self.results)
        passed = sum(1 for r in self.results if r["sucesso"])
        avg_latency = round(sum(r["latencia_ms"] for r in self.results) / max(1, total), 2)

        return {
            "total_testes": total,
            "aprovados": passed,
            "falhas": total - passed,
            "taxa_sucesso_pct": round((passed / max(1, total)) * 100, 1),
            "latencia_media_ms": avg_latency,
            "execucoes": self.results
        }

    def _run_core_clinical_flows(self, cycle: int = 1):
        """Testa as jornadas essenciais do médico no plantão."""
        flows = [
            ("Inicialização /start", [("text", "/start")]),
            ("Menu de Calculadoras (/calc)", [("text", "/calc")]),
            ("Atalho Direto Noradrenalina 70kg", [("text", "noradrenalina 70kg")]),
            ("Atalho Direto Sequência Rápida IOT 80kg", [("text", "iot 80kg")]),
            ("Cálculo de Clearance de Creatinina", [("text", "clearance 65 anos 72kg cr 1.6")]),
            ("Fluxo de Rotina Médica (/rotina)", [("text", "/rotina")]),
            ("Evolução SOAP Rápida (/soap)", [("text", "/soap")]),
            ("Gestão de Plantão (/plantao)", [("text", "/plantao")]),
            ("Consulta REMUME / Prescrição", [("text", "/remume dipirona")]),
            ("Ajuda e Comandos (/ajuda)", [("text", "/ajuda")]),
            # --- NOVAS FEATURES ADICIONADAS ---
            ("Módulo GO / Ginecologia & Obstetrícia (/go)", [("text", "/go")]),
            ("Cálculo Pré-Natal & Idade Gestacional (/prenatal)", [("text", "/prenatal 10/01/2026")]),
            ("Protocolo Sulfato de Magnésio Zuspan (/mgso4)", [("text", "/mgso4 zuspan 65kg")]),
            ("Personalização de Nome do Médico (/nome)", [("text", "/nome Dr. Wagner Moraes")]),
            ("Consulta de Perfil do Usuário (/perfil)", [("text", "/perfil")]),
            ("Configuração de Cidade Ativa (/cidade)", [("text", "/cidade São Paulo - SP")]),
            ("Busca REMUME Local (/remume amoxicilina)", [("text", "/remume amoxicilina")]),
            ("Central do Plantão Sniper (/sniper)", [("text", "/sniper")]),
        ]

        for flow_name, steps in flows:
            total_latency = 0.0
            for idx, (stype, val) in enumerate(steps):
                rec = self._step(stype, val, f"[Ciclo {cycle}] {flow_name} (Passo {idx + 1})")
                total_latency += rec["latencia_ms"]
            self.ux.evaluate_beira_leito_friction(flow_name, len(steps), total_latency)

    def _run_inline_menu_crawler(self):
        """
        Navega automaticamente pelos botões do menu inicial para testar callbacks,
        identificar botões mortos e auditar redundâncias entre telas.
        """
        start_rec = self._step("text", "/start", "Crawler: Menu Raiz (/start)")
        buttons = start_rec.get("botoes", [])

        visited_callbacks = set()
        for btn in buttons[:10]:  # Explora até os 10 primeiros botões do menu principal
            cb = btn.get("callback_data", "")
            label = btn.get("text", "Botão")
            if not cb or cb in visited_callbacks or cb.startswith("http"):
                continue
            visited_callbacks.add(cb)
            sub_rec = self._step("callback", cb, f"Crawler Callback: {label} ({cb})")

            if not sub_rec["sucesso"]:
                self.ux.add_finding(
                    severity="ALTA",
                    engine="Telegram/Crawler",
                    context=f"Botão '{label}' ({cb})",
                    issue="Botão inline não retornou resposta válida ou gerou erro.",
                    evidence=str(sub_rec.get("erro") or "Sem saída")
                )

    def _run_bedside_fuzzing(self):
        """
        Envia entradas caóticas, valores clínicos impossíveis e payloads malformados
        para garantir que o bot não quebre nem exiba NaN/undefined.
        """
        fuzz_inputs = [
            ("Fuzz: Peso Zero", "noradrenalina 0kg"),
            ("Fuzz: Peso Negativo", "fentanil -75kg"),
            ("Fuzz: Peso Extremo Adulto", "propofol 650kg"),
            ("Fuzz: Decimal com Vírgula e Espaço", " clearance  80,5 kg  cr 0,0 "),
            ("Fuzz: Comando Inexistente", "/comando_inexistente_prime_2025"),
            ("Fuzz: Apenas Números Soltos", "00000000"),
            ("Fuzz: Caracteres Especiais & XSS", "<script>alert('xss')</script> & drop table users; /* test */"),
            ("Fuzz: Emojis Clínicos Isolados", "🚑💉🫀⚠️"),
            ("Fuzz: Texto Longo de Evolução", "Paciente masculino, 68 anos, HAS e DM2, admitido com dor torácica típica há 2 horas, PA 80x50, FC 118 bpm, SatO2 89% AA. " * 3),
        ]

        for label, text in fuzz_inputs:
            self._step("text", text, label)
