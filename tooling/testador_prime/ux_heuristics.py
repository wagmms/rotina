"""
UX HEURISTICS & REDUNDANCY ENGINE (ux_heuristics.py)
Motor heurístico de avaliação de usabilidade beira-leito, detecção de redundâncias,
vazamentos técnicos e geração de sugestões arquiteturais acionáveis.
"""

import re
from typing import Dict, List, Any

# Padrões proibidos de vazamento técnico em respostas ao médico
TECHNICAL_LEAK_PATTERNS = [
    (r"\bundefined\b", "Vazamento de variável não definida ('undefined')"),
    (r"\bNaN\b", "Erro de cálculo matemático ('NaN' - Not a Number)"),
    (r"\[object Object\]", "Serialização incorreta de objeto JS ('[object Object]')"),
    (r"\b(?:ReferenceError|TypeError|SyntaxError|RangeError)\b", "Exceção não tratada do Node.js exposta ao usuário"),
    (r"at\s+[a-zA-Z0-9_$.]+\s+\([^)]+:\d+:\d+\)", "Stack trace técnico exposto na interface clínica"),
    (r"\bSpreadsheetApp\b|\bUrlFetchApp\b|\bPropertiesService\b", "Resquício proibido de Google Apps Script detectado"),
]


class UXHeuristicsAuditor:
    def __init__(self):
        self.findings: List[Dict[str, Any]] = []
        self.redundancies: List[Dict[str, Any]] = []
        self.suggestions: List[Dict[str, str]] = []

    def inspect_text_for_leaks(self, text: str, context: str, target_file: str = "src/07_menu_navegacao.js") -> List[str]:
        """Verifica se há vazamentos técnicos (`undefined`, `NaN`, stack traces) em um texto."""
        leaks_found = []
        if not text:
            return leaks_found

        for pattern, description in TECHNICAL_LEAK_PATTERNS:
            if re.search(pattern, text):
                leaks_found.append(description)
                self.add_finding(
                    severity="CRITICA",
                    engine="UX/LeakDetector",
                    context=context,
                    issue=f"{description} detectado na resposta.",
                    evidence=text[:180].replace("\n", " ")
                )
                self.add_suggestion(
                    severity="CRITICA",
                    target_file=target_file,
                    component=context,
                    problem=f"{description} ao processar '{context}'.",
                    expected_behavior="Aplicar fallback defensivo (coalescência nula `??` e `Number.isFinite()`) antes de formatar a string clínica."
                )
        return leaks_found

    def inspect_telegram_keyboard(self, buttons: List[Dict[str, Any]], context: str) -> Dict[str, Any]:
        """
        Audita um teclado inline do Telegram buscando:
        1. Botões duplicados (mesmo texto ou mesmo callback_data).
        2. Rótulos longos demais (> 26 chars) que truncam em telas de 360px.
        3. Linhas superlotadas (> 3 botões na mesma linha).
        4. Ausência de botão de retorno/navegação em submenus profundos.
        """
        issues = []
        seen_labels = set()
        seen_callbacks = set()
        has_back_button = False

        for btn in buttons:
            label = btn.get("text", "").strip()
            cb = btn.get("callback_data", "").strip()
            row_size = btn.get("row_size", 1)

            if any(w in label.lower() for w in ["voltar", "menu", "início", "inicio", "🔙", "⬅️", "🏠"]):
                has_back_button = True

            # 1. Duplicidade de rótulo no mesmo menu
            norm_label = label.lower()
            if norm_label and norm_label in seen_labels:
                msg = f"Botão redundante/duplicado no mesmo teclado: '{label}'"
                issues.append(msg)
                self.redundancies.append({
                    "origem": "Telegram Inline Keyboard",
                    "contexto": context,
                    "item": label,
                    "detalhe": "Mesmo rótulo exibido mais de uma vez na mesma tela."
                })
                self.add_suggestion(
                    severity="MEDIA",
                    target_file="src/07_menu_navegacao.js",
                    component=f"Teclado inline ({context})",
                    problem=msg,
                    expected_behavior="Unificar ações repetidas e remover o botão duplicado para limpar a visão beira-leito."
                )
            seen_labels.add(norm_label)

            # 2. Duplicidade de callback_data com rótulos diferentes
            if cb and cb in seen_callbacks:
                msg = f"Callback duplicado ('{cb}') apontando para a mesma ação no menu '{context}'."
                issues.append(msg)
                self.redundancies.append({
                    "origem": "Telegram Callback",
                    "contexto": context,
                    "item": f"{label} -> {cb}",
                    "detalhe": "Dois botões diferentes disparam exatamente o mesmo callback_data."
                })
            if cb:
                seen_callbacks.add(cb)

            # 3. Ergonomia mobile 360px: texto de botão longo
            if len(label) > 28 and row_size >= 2:
                msg = f"Botão '{label}' ({len(label)} chars) dividido em linha com {row_size} colunas será truncado em telas de 360px."
                issues.append(msg)
                self.add_suggestion(
                    severity="MELHORIA_UX",
                    target_file="src/07_menu_navegacao.js",
                    component=f"Layout de Botão ({context})",
                    problem=msg,
                    expected_behavior="Reduzir rótulo para <= 20 caracteres ou posicionar o botão em linha exclusiva (1 coluna)."
                )

            # 4. Linha com excesso de botões
            if row_size > 3:
                msg = f"Linha com {row_size} botões lado a lado dificulta o toque rápido (risco de erro ao tocar na emergência)."
                if msg not in issues:
                    issues.append(msg)

        # 5. Excesso global de botões em um único menu (> 14 botões)
        if len(buttons) > 14:
            msg = f"Sobrecarga cognitiva: menu '{context}' exibe {len(buttons)} botões simultaneamente."
            issues.append(msg)
            self.add_suggestion(
                severity="MELHORIA_UX",
                target_file="src/07_menu_navegacao.js",
                component=f"Arquitetura de Menu ({context})",
                problem=msg,
                expected_behavior="Agrupar opções secundárias em subcategorias e manter no máximo 8 a 10 botões visíveis na primeira dobra."
            )

        # 6. Beco sem saída em submenus
        is_root_or_fuzz = any(r in context.lower() for r in ["/start", "menu raiz", "menu principal", "raiz", "fuzz"])
        if buttons and not is_root_or_fuzz and not has_back_button:
            msg = f"Submenu '{context}' possui botões mas não apresenta opção clara de 'Voltar / Menu Principal'."
            issues.append(msg)
            self.add_suggestion(
                severity="ALTA",
                target_file="src/07_menu_navegacao.js",
                component=f"Navegação de Retorno ({context})",
                problem=msg,
                expected_behavior="Adicionar botão padrão '⬅️ Voltar ao Menu' na última linha de todos os submenus clínicos."
            )

        return {
            "total_buttons": len(buttons),
            "has_back_button": has_back_button,
            "issues": issues
        }

    def evaluate_beira_leito_friction(self, flow_name: str, steps_count: int, total_latency_ms: float):
        """Avalia o índice de atrito beira-leito (Toques até a Conduta e Tempo Total)."""
        if steps_count > 4:
            self.add_finding(
                severity="MEDIA",
                engine="UX/Friction",
                context=flow_name,
                issue=f"Fluxo exige {steps_count} interações até a conduta final (meta beira-leito <= 3 toques).",
                evidence=f"{steps_count} passos / {total_latency_ms:.1f}ms"
            )
            self.add_suggestion(
                severity="MELHORIA_UX",
                target_file="src/07_menu_navegacao.js",
                component=f"Fluxo Rápido ({flow_name})",
                problem=f"O fluxo '{flow_name}' requer {steps_count} etapas sequenciais.",
                expected_behavior="Permitir atalho de comando direto em 1 passo (ex.: `/nora 70` ou botões de peso pré-definidos 60kg/70kg/80kg)."
            )

        if total_latency_ms > 800:
            self.add_finding(
                severity="ALTA",
                engine="UX/Performance",
                context=flow_name,
                issue=f"Latência acumulada elevada ({total_latency_ms:.1f}ms) no fluxo '{flow_name}'.",
                evidence=f"Tempo total: {total_latency_ms:.1f}ms"
            )

    def add_finding(self, severity: str, engine: str, context: str, issue: str, evidence: str = ""):
        self.findings.append({
            "severidade": severity,
            "motor": engine,
            "contexto": context,
            "problema": issue,
            "evidencia": evidence
        })

    def add_suggestion(self, severity: str, target_file: str, component: str, problem: str, expected_behavior: str):
        key = f"{target_file}:{component}:{problem}"
        for s in self.suggestions:
            if f"{s['arquivo_alvo']}:{s['componente']}:{s['problema']}" == key:
                return
        self.suggestions.append({
            "severidade": severity,
            "arquivo_alvo": target_file,
            "componente": component,
            "problema": problem,
            "comportamento_esperado": expected_behavior
        })
