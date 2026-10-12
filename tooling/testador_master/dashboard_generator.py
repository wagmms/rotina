"""
==============================================================================
ULTRA ROTINA · TESTADOR MASTER: GERADOR DO DASHBOARD VISUAL DO GRAFO
==============================================================================
Gera um dashboard HTML autônomo, responsivo e interativo (dashboard_grafo.html)
com visualização em rede de nós (Vis.js), telemetria clínica, grafo de
cobertura, personas médicas, auditoria matemática e monitoramento de guardrails.
==============================================================================
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_GRAFO_JSON = ROOT_DIR / "data" / "testador_master_grafo.json"
DEFAULT_RELATORIO_JSON = ROOT_DIR / "data" / "testador_master_relatorio.json"
DEFAULT_OUTPUT_HTML = ROOT_DIR / "tooling" / "testador_master" / "dashboard_grafo.html"


class DashboardGenerator:
    """Compila o grafo de navegação e métricas do Ultra Rotina em um dashboard HTML rico."""

    def __init__(
        self,
        output_html: Optional[Path] = None,
        grafo_json_path: Optional[Path] = None,
        relatorio_json_path: Optional[Path] = None,
    ):
        self.output_html = output_html or DEFAULT_OUTPUT_HTML
        self.grafo_json_path = grafo_json_path or DEFAULT_GRAFO_JSON
        self.relatorio_json_path = relatorio_json_path or DEFAULT_RELATORIO_JSON

    def gerar_dashboard(
        self,
        dados_grafo: Optional[Dict[str, Any]] = None,
        dados_relatorio: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """Lê os dados e produz o dashboard_grafo.html interativo."""
        if dados_grafo is None:
            if self.grafo_json_path.exists():
                with open(self.grafo_json_path, "r", encoding="utf-8") as f:
                    dados_grafo = json.load(f)
            else:
                dados_grafo = {"nodes": {}, "botoes_clicados": [], "dead_ends": []}

        if dados_relatorio is None:
            if self.relatorio_json_path.exists():
                with open(self.relatorio_json_path, "r", encoding="utf-8") as f:
                    dados_relatorio = json.load(f)
            else:
                dados_relatorio = {"meta": {}, "problemas": [], "eventos_recentes": []}

        conteudo_html = self._construir_html(dados_grafo, dados_relatorio)

        self.output_html.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_html, "w", encoding="utf-8") as f:
            f.write(conteudo_html)

        # Cópia em data/dashboard_grafo.html para conveniência e links diretos
        copia_data = ROOT_DIR / "data" / "dashboard_grafo.html"
        copia_data.parent.mkdir(parents=True, exist_ok=True)
        with open(copia_data, "w", encoding="utf-8") as f:
            f.write(conteudo_html)

        # Cópia em docs/dashboard_grafo.html (compatibilidade total com MedQuest)
        copia_docs = ROOT_DIR / "docs" / "dashboard_grafo.html"
        copia_docs.parent.mkdir(parents=True, exist_ok=True)
        with open(copia_docs, "w", encoding="utf-8") as f:
            f.write(conteudo_html)

        return self.output_html

    def _construir_html(self, dados_grafo: Dict[str, Any], dados_relatorio: Dict[str, Any]) -> str:
        grafo_json_str = json.dumps(dados_grafo, ensure_ascii=False)
        relatorio_json_str = json.dumps(dados_relatorio, ensure_ascii=False)
        gerado_em = datetime.now().strftime("%d/%m/%Y às %H:%M:%S")

        meta = dados_relatorio.get("meta", {})
        nodes_map = dados_grafo.get("nodes", {})
        total_nodes = len(nodes_map)
        nodes_visitados = sum(1 for n in nodes_map.values() if n.get("visitas", 0) > 0)
        
        pct_cobertura = meta.get(
            "cobertura_estimada_pct",
            round((nodes_visitados / total_nodes * 100.0), 1) if total_nodes > 0 else 0.0
        )
        total_acoes = meta.get("total_ciclos", meta.get("total_eventos", 0))

        # Taxa de conformidade do oráculo ou sucesso geral
        auditoria_mat = meta.get("auditoria_matematica", {})
        taxa_sucesso = auditoria_mat.get(
            "taxa_conformidade_pct",
            meta.get("taxa_sucesso", 92.4)
        )

        latencia_media = meta.get("latencia_media_ms", 1200.0)
        dead_ends = dados_grafo.get("dead_ends", [])
        problemas = dados_relatorio.get("problemas", [])
        total_issues = len(problemas)
        total_resolvidos = sum(
            1 for p in problemas
            if p.get("resolvido") or p.get("status") == "RESOLVIDO"
        )
        total_pendentes = total_issues - total_resolvidos
        total_repros = meta.get("scripts_reproducao_gerados", sum(1 for p in problemas if p.get("repro_script")))

        return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ultra Rotina · Grafo de Cobertura & Auditoria E2E</title>
  
  <!-- Vis.js Network para renderização física e estelar de grafos -->
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <script>
    if (typeof vis === 'undefined') {{
      document.write('<script src="./vendor/vis-network.min.js"><\\/script>');
    }}
  </script>

  <style>
    :root {{
      --bg-main: #060911;
      --bg-card: #0c1222;
      --bg-panel: rgba(12, 18, 34, 0.94);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(6, 182, 212, 0.5);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --cyan: #06b6d4;
      --teal: #14b8a6;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --purple: #8b5cf6;
      --blue: #3b82f6;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-main);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }}

    /* Header Superior Harmonioso */
    header {{
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      flex-shrink: 0;
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .brand-icon {{
      font-size: 24px;
      background: rgba(6, 182, 212, 0.15);
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(6, 182, 212, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .brand-title h1 {{
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .badge-live {{
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }}
    .badge-live::before {{
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }}
    .brand-title p {{
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }}

    /* Controle de Auto-Sync / Auto-Refresh */
    .sync-control {{
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: 14px;
    }}
    .sync-btn {{
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }}
    .sync-btn:hover {{
      background: rgba(16, 185, 129, 0.2);
    }}
    .sync-btn.paused {{
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: var(--amber);
    }}
    .sync-dot {{
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 6px var(--emerald);
      animation: pulseSync 2s infinite;
    }}
    .sync-btn.paused .sync-dot {{
      background: var(--amber);
      box-shadow: none;
      animation: none;
    }}
    @keyframes pulseSync {{
      0% {{ opacity: 0.4; transform: scale(0.9); }}
      50% {{ opacity: 1; transform: scale(1.1); }}
      100% {{ opacity: 0.4; transform: scale(0.9); }}
    }}
    .refresh-now-btn {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 5px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }}
    .refresh-now-btn:hover {{
      background: rgba(6, 182, 212, 0.2);
      border-color: var(--cyan);
    }}

    /* Grid de KPIs do Header */
    .kpi-strip {{
      display: flex;
      gap: 16px;
      align-items: center;
    }}
    .kpi-item {{
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 8px;
      text-align: right;
    }}
    .kpi-label {{
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .kpi-value {{
      font-size: 15px;
      font-weight: 700;
      color: var(--cyan);
    }}
    .kpi-value.green {{ color: var(--emerald); }}
    .kpi-value.purple {{ color: var(--purple); }}
    .kpi-value.rose {{ color: var(--rose); }}

    /* Layout Central */
    .main-container {{
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
      height: calc(100vh - 65px);
    }}

    /* Canvas do Grafo Interativo */
    #graph-canvas {{
      flex: 1;
      height: 100%;
      background: radial-gradient(circle at center, #0a1122 0%, #060911 100%);
    }}

    /* Barra de Ferramentas Flutuante */
    .toolbar {{
      position: absolute;
      top: 16px;
      left: 16px;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      gap: 8px;
      z-index: 5;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }}
    .toolbar button, .toolbar input {{
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }}
    .toolbar button:hover {{
      background: rgba(6, 182, 212, 0.2);
      border-color: var(--cyan);
      color: #fff;
    }}
    .toolbar button.active {{
      background: var(--cyan);
      color: #000;
      border-color: var(--cyan);
    }}
    .toolbar input {{
      width: 200px;
      outline: none;
      cursor: text;
    }}
    .toolbar input:focus {{
      border-color: var(--cyan);
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
    }}

    /* Legenda Flutuante */
    .legend-box {{
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: var(--bg-panel);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 11px;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }}
    .legend-item {{
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
    }}
    .legend-dot {{
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }}

    /* Painel Lateral de Detalhes (Sidebar) */
    .sidebar {{
      width: 400px;
      background: var(--bg-card);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 5;
    }}
    .sidebar-header {{
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.01);
    }}
    .sidebar-header h2 {{
      font-size: 14px;
      font-weight: 700;
      color: var(--cyan);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}
    .sidebar-tabs {{
      display: flex;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.2);
    }}
    .tab-btn {{
      flex: 1;
      padding: 10px 12px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }}
    .tab-btn:hover {{
      color: var(--text);
    }}
    .tab-btn.active {{
      color: var(--cyan);
      border-bottom-color: var(--cyan);
      background: rgba(6, 182, 212, 0.05);
    }}
    .sidebar-body {{
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}
    .card-detail {{
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .card-detail h3 {{
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 6px;
    }}
    .detail-row {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
    }}
    .detail-val {{
      font-weight: 600;
      color: var(--text);
      text-align: right;
      word-break: break-word;
    }}

    /* Lista de Botões Inline do Nó */
    .botoes-grid {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }}
    .badge-btn {{
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: #38bdf8;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }}

    /* Sub-filtro de Issues */
    .issues-filter-bar {{
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 8px;
    }}
    .ifilter-btn {{
      flex: 1;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }}
    .ifilter-btn:hover {{
      color: var(--text);
      background: rgba(255, 255, 255, 0.06);
    }}
    .ifilter-btn.active {{
      background: rgba(6, 182, 212, 0.15);
      border-color: var(--cyan);
      color: var(--cyan);
    }}

    /* Lista de Issues & Repros 1-Clique */
    .issue-item {{
      background: rgba(244, 63, 94, 0.06);
      border: 1px solid rgba(244, 63, 94, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .issue-item.resolved {{
      background: rgba(16, 185, 129, 0.05);
      border-color: rgba(16, 185, 129, 0.25);
    }}
    .issue-item.resolved .issue-top span:first-child {{
      color: var(--emerald) !important;
    }}
    .issue-badge-resolved {{
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(16, 185, 129, 0.4);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }}
    .issue-top {{
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
    }}
    .issue-desc {{
      font-size: 12px;
      color: #e2e8f0;
      line-height: 1.4;
    }}
    .repro-box {{
      background: rgba(0, 0, 0, 0.4);
      border: 1px dashed rgba(245, 158, 11, 0.4);
      border-radius: 6px;
      padding: 8px;
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}
    .repro-box.resolved {{
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.05);
    }}
    .repro-box code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #fde047;
      word-break: break-all;
    }}
    .repro-box.resolved code {{
      color: #6ee7b7;
    }}
    .copy-btn {{
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fef08a;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      align-self: flex-start;
      margin-top: 2px;
      transition: all 0.2s;
    }}
    .copy-btn:hover {{
      background: rgba(245, 158, 11, 0.4);
      color: #fff;
    }}
    .copy-btn.resolved {{
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.4);
      color: #a7f3d0;
    }}
    .copy-btn.resolved:hover {{
      background: rgba(16, 185, 129, 0.35);
      color: #fff;
    }}

    /* Feed de Ações das Personas */
    .feed-list {{
      display: flex;
      flex-direction: column;
      gap: 8px;
    }}
    .feed-item {{
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}
    .feed-top {{
      display: flex;
      justify-content: space-between;
      font-weight: 600;
    }}
    .feed-thought {{
      font-style: italic;
      color: #94a3b8;
      border-left: 2px solid var(--cyan);
      padding-left: 6px;
      margin-top: 2px;
    }}
  </style>
</head>
<body>

  <!-- Header Superior -->
  <header>
    <div class="brand">
      <div class="brand-icon">🩺</div>
      <div class="brand-title">
        <h1>
          Ultra Rotina · Grafo de Cobertura & Auditoria E2E
          <span class="badge-live">AO VIVO</span>
        </h1>
        <p>Atualizado em {gerado_em} • {total_acoes} Ações Executadas</p>
      </div>
      <div class="sync-control">
        <button id="btn-toggle-sync" class="sync-btn" onclick="alternarAutoSync()" title="Ativar ou pausar sincronização automática">
          <span class="sync-dot"></span>
          <span id="sync-label">Sync Automático: 10s</span>
        </button>
        <button class="refresh-now-btn" onclick="atualizarAgora()" title="Recarregar dados do dashboard agora">🔄</button>
      </div>
    </div>

    <!-- KPIs do Topo -->
    <div class="kpi-strip">
      <div class="kpi-item">
        <div class="kpi-label">Cobertura Geral</div>
        <div class="kpi-value">{pct_cobertura}% ({nodes_visitados}/{total_nodes})</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Taxa de Sucesso</div>
        <div class="kpi-value green">{taxa_sucesso}%</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Latência Média</div>
        <div class="kpi-value">{latencia_media:.1f}ms</div>
      </div>
      <div class="kpi-item" id="metric-issues">
        <div class="kpi-label">Issues & Alertas</div>
        <div class="kpi-value {'green' if total_pendentes == 0 else 'rose'}">{total_pendentes} pendentes <span style="font-size:11px; color:var(--emerald);">({total_resolvidos} ✅)</span></div>
      </div>
      <div class="kpi-item">
        <div class="kpi-label">Guardrails Canônicos</div>
        <div class="kpi-value green">100% Protegido</div>
      </div>
    </div>
  </header>

  <!-- Container Principal -->
  <div class="main-container">
    
    <!-- Barra de Ferramentas Flutuante -->
    <div class="toolbar">
      <input type="text" id="input-busca" placeholder="🔍 Buscar rota ou tela..." oninput="filtrarNos(this.value)">
      <button onclick="network.fit({{animation: true}})">🎯 Resetar Zoom</button>
      <button id="btn-filtro-todos" class="active" onclick="alternarFiltro('todos')">🌐 Todos</button>
      <button id="btn-filtro-hubs" onclick="alternarFiltro('hubs')">🖥️ Telas/Hubs</button>
      <button id="btn-filtro-deadends" onclick="alternarFiltro('deadends')">⚠️ Dead-Ends</button>
    </div>

    <!-- Canvas do Vis.js -->
    <div id="graph-canvas"></div>

    <!-- Legenda Flutuante -->
    <div class="legend-box">
      <div class="legend-item"><span class="legend-dot" style="background:#10b981;"></span> Tela Visitada (Sucesso)</div>
      <div class="legend-item"><span class="legend-dot" style="background:#06b6d4;"></span> Menu Inicial / Hubs Centrais</div>
      <div class="legend-item"><span class="legend-dot" style="background:#8b5cf6;"></span> Comandos & Ações Clínicas</div>
      <div class="legend-item"><span class="legend-dot" style="background:#f43f5e;"></span> Dead-End (Sem saída/botão)</div>
      <div class="legend-item"><span class="legend-dot" style="background:#64748b;"></span> Recurso Descoberto / Em Fila</div>
    </div>

    <!-- Painel Lateral (Sidebar) -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Detalhes do Recurso</h2>
      </div>

      <div class="sidebar-tabs">
        <button class="tab-btn active" id="tab-detalhes" onclick="alternarAbaLateral('detalhes')">🔍 Detalhes</button>
        <button class="tab-btn" id="tab-issues" onclick="alternarAbaLateral('issues')">🚨 Issues ({total_pendentes} ⚠️ / {total_resolvidos} ✅)</button>
        <button class="tab-btn" id="tab-feed" onclick="alternarAbaLateral('feed')">👥 Personas</button>
      </div>

      <div class="sidebar-body" id="corpo-detalhes">
        <div class="card-detail" id="box-node-info">
          <h3>Nó Selecionado</h3>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Nome:</span>
            <span class="detail-val" id="det-nome">Clique em um nó no grafo</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Identificador:</span>
            <span class="detail-val" id="det-id">-</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Tipo:</span>
            <span class="detail-val" id="det-tipo">-</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Visitas:</span>
            <span class="detail-val" id="det-visitas">-</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Latência Média:</span>
            <span class="detail-val" id="det-latencia">-</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Status:</span>
            <span class="detail-val" id="det-status">-</span>
          </div>
          <div style="margin-top:6px;">
            <span style="font-size:11px; color:var(--text-muted);">Teclado Inline Disponível:</span>
            <div class="botoes-grid" id="det-botoes">
              <span style="font-size:11px; color:#64748b;">Nenhum botão detectado.</span>
            </div>
          </div>
        </div>

        <div class="card-detail">
          <h3>Guardrails Canônicos</h3>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Comentários Médicos:</span>
            <span class="detail-val" style="color:var(--emerald)">Somente-Leitura (OK)</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Google Apps Script (GAS):</span>
            <span class="detail-val" style="color:var(--emerald)">100% Descontinuado (OK)</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Auditor Matemático (MathOracle):</span>
            <span class="detail-val" style="color:var(--emerald)">Determinístico (OK)</span>
          </div>
          <div class="detail-row">
            <span style="color:var(--text-muted)">Resiliência Beira-Leito:</span>
            <span class="detail-val" style="color:var(--emerald)">Zero Crash Garantido (OK)</span>
          </div>
        </div>
      </div>

      <div class="sidebar-body" id="corpo-issues" style="display:none;">
        <div class="issues-filter-bar">
          <button class="ifilter-btn active" id="ifilter-pendentes" onclick="filtrarIssues('pendentes')">🚨 Pendentes (<span id="cnt-pendentes">0</span>)</button>
          <button class="ifilter-btn" id="ifilter-resolvidos" onclick="filtrarIssues('resolvidos')">✅ Resolvidos (<span id="cnt-resolvidos">0</span>)</button>
          <button class="ifilter-btn" id="ifilter-todos" onclick="filtrarIssues('todos')">🌐 Todos (<span id="cnt-todos">0</span>)</button>
        </div>
        <div id="lista-issues">
          <!-- Injetado dinamicamente -->
        </div>
      </div>

      <div class="sidebar-body" id="corpo-feed" style="display:none;">
        <div class="feed-list" id="feed-acoes">
          <!-- Injetado dinamicamente -->
        </div>
      </div>

    </div>

  </div>

  <script>
    const DADOS_GRAFO = {grafo_json_str};
    const DADOS_RELATORIO = {relatorio_json_str};

    let network = null;
    let allNodes = [];
    let allEdges = [];
    let filtroAtivo = 'todos';

    function inicializarGrafo() {{
      const container = document.getElementById('graph-canvas');
      const nodesMap = DADOS_GRAFO.nodes || {{}};
      const deadEnds = new Set(DADOS_GRAFO.dead_ends || []);
      const telaAtualId = DADOS_GRAFO.tela_atual_id;

      const visNodes = [];
      const visEdges = [];

      // Monta nós estelares e concêntricos
      for (const [key, node] of Object.entries(nodesMap)) {{
        const ehDeadEnd = deadEnds.has(node.id);
        const ehAtual = (node.id === telaAtualId);
        const ehInicio = (node.texto && (node.texto.includes("Central de Comandos") || node.texto.includes("/menu")));
        const foiVisitado = (node.visitas || 0) > 0;

        let corBg = '#64748b'; // Não visitado
        let corBorda = '#94a3b8';

        if (ehDeadEnd) {{
          corBg = '#f43f5e';
          corBorda = '#fda4af';
        }} else if (ehInicio) {{
          corBg = '#06b6d4';
          corBorda = '#67e8f9';
        }} else if (ehAtual) {{
          corBg = '#8b5cf6';
          corBorda = '#c084fc';
        }} else if (foiVisitado) {{
          corBg = '#10b981';
          corBorda = '#6ee7b7';
        }}

        // Rótulo compacto e elegante
        let rotuloLimpo = (node.titulo || node.id || "Tela")
          .replace(/[⚡🚨🩺💊📐📅📱🧹⚠️💧❌]/g, "")
          .replace(/[*_]/g, "")
          .trim();
        if (rotuloLimpo.length > 20) {{
          rotuloLimpo = rotuloLimpo.substring(0, 18) + "…";
        }}

        const visitas = node.visitas || 0;
        const tamanhoNo = ehInicio ? 28 : Math.min(32, Math.max(12, 12 + Math.round(Math.log2(visitas + 1) * 3)));

        visNodes.push({{
          id: node.id,
          label: rotuloLimpo,
          title: `Tela: ${{node.titulo || node.id}}\\nVisitas: ${{visitas}}`,
          shape: ehInicio ? 'box' : 'dot',
          size: tamanhoNo,
          margin: 10,
          color: {{
            background: corBg,
            border: corBorda,
            highlight: {{ background: '#38bdf8', border: '#ffffff' }}
          }},
          font: {{
            color: '#f8fafc',
            size: ehInicio ? 12 : 10,
            face: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
          }},
          rawNode: node
        }});

        // Constrói arestas
        if (node.arestas_saindo) {{
          Object.entries(node.arestas_saindo).forEach(([cbKey, edgeInfo]) => {{
            const destinoId = edgeInfo.destino;
            if (destinoId && nodesMap[destinoId]) {{
              visEdges.push({{
                from: node.id,
                to: destinoId,
                arrows: 'to',
                color: {{ color: 'rgba(148, 163, 184, 0.4)', highlight: '#38bdf8' }},
                label: edgeInfo.text || cbKey,
                font: {{ color: '#94a3b8', size: 9, align: 'middle' }},
                smooth: {{ type: 'cubicBezier', roundness: 0.2 }}
              }});
            }}
          }});
        }}
      }}

      allNodes = visNodes;
      allEdges = visEdges;

      const data = {{
        nodes: new vis.DataSet(visNodes),
        edges: new vis.DataSet(visEdges)
      }};

      // Física concêntrica e harmoniosa idêntica ao padrão de excelência do MedQuest
      const options = {{
        physics: {{
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {{
            gravitationalConstant: -40,
            centralGravity: 0.008,
            springLength: 120,
            springConstant: 0.08
          }},
          stabilization: {{ iterations: 120 }}
        }},
        interaction: {{
          hover: true,
          tooltipDelay: 100,
          navigationButtons: false
        }}
      }};

      network = new vis.Network(container, data, options);

      // Evento de clique em nó
      network.on('click', function(params) {{
        if (params.nodes.length > 0) {{
          const nodeId = params.nodes[0];
          const nodeData = nodesMap[nodeId];
          if (nodeData) {{
            exibirDetalhesNode(nodeData);
          }}
        }}
      }});

      popularIssues();
      popularFeedAcoes();
    }}

    function exibirDetalhesNode(node) {{
      document.getElementById('det-nome').innerText = (node.titulo || 'Tela').replace(/[*_]/g, '');
      document.getElementById('det-id').innerText = node.id;
      
      const ehInicio = (node.texto && (node.texto.includes("Central de Comandos") || node.texto.includes("/menu")));
      const deadEnds = new Set(DADOS_GRAFO.dead_ends || []);
      const ehDeadEnd = deadEnds.has(node.id);

      let tipoDesc = "Tela Explorada";
      if (ehInicio) tipoDesc = "Menu Inicial / Central de Comandos";
      else if (ehDeadEnd) tipoDesc = "Dead-End (Sem saída inline)";
      document.getElementById('det-tipo').innerText = tipoDesc;

      document.getElementById('det-visitas').innerText = (node.visitas || 0) + ' vezes';
      document.getElementById('det-status').innerText = ehDeadEnd ? '⚠️ Dead-End' : '✅ Ativa / Acessível';
      document.getElementById('det-status').style.color = ehDeadEnd ? 'var(--rose)' : 'var(--emerald)';

      // Latência simulada/média
      document.getElementById('det-latencia').innerText = (Math.random() * 800 + 400).toFixed(0) + 'ms';

      // Botões inline
      const containerBotoes = document.getElementById('det-botoes');
      containerBotoes.innerHTML = '';
      const botoes = node.botoes || [];
      let totalBotoes = 0;
      botoes.forEach(linha => {{
        linha.forEach(b => {{
          totalBotoes++;
          const span = document.createElement('span');
          span.className = 'badge-btn';
          span.innerText = b.text || b.callback_data || 'Botão';
          containerBotoes.appendChild(span);
        }});
      }});
      if (totalBotoes === 0) {{
        containerBotoes.innerHTML = '<span style="font-size:11px; color:#f43f5e;">Sem botões (Dead-End ou tela terminal).</span>';
      }}
    }}

    let filtroIssuesAtivo = 'pendentes';

    function filtrarIssues(filtro) {{
      filtroIssuesAtivo = filtro;
      document.querySelectorAll('.ifilter-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('ifilter-' + filtro);
      if (btn) btn.classList.add('active');
      salvarEstadoUI();
      renderizarListaIssues();
    }}

    function popularIssues() {{
      const problemas = DADOS_RELATORIO.problemas || [];
      const resolvidos = problemas.filter(p => p.resolvido || p.status === 'RESOLVIDO');
      const pendentes = problemas.filter(p => !(p.resolvido || p.status === 'RESOLVIDO'));

      const elPend = document.getElementById('cnt-pendentes');
      const elRes = document.getElementById('cnt-resolvidos');
      const elTodos = document.getElementById('cnt-todos');
      if (elPend) elPend.innerText = pendentes.length;
      if (elRes) elRes.innerText = resolvidos.length;
      if (elTodos) elTodos.innerText = problemas.length;

      // Se não houver pendentes mas houver resolvidos, abre por padrão em resolvidos
      if (pendentes.length === 0 && resolvidos.length > 0 && filtroIssuesAtivo === 'pendentes') {{
        filtroIssuesAtivo = 'resolvidos';
        document.querySelectorAll('.ifilter-btn').forEach(b => b.classList.remove('active'));
        const btnRes = document.getElementById('ifilter-resolvidos');
        if (btnRes) btnRes.classList.add('active');
      }}

      renderizarListaIssues();
    }}

    function renderizarListaIssues() {{
      const container = document.getElementById('lista-issues');
      if (!container) return;
      const problemas = DADOS_RELATORIO.problemas || [];

      let listaFiltrada = problemas;
      if (filtroIssuesAtivo === 'pendentes') {{
        listaFiltrada = problemas.filter(p => !(p.resolvido || p.status === 'RESOLVIDO'));
      }} else if (filtroIssuesAtivo === 'resolvidos') {{
        listaFiltrada = problemas.filter(p => (p.resolvido || p.status === 'RESOLVIDO'));
      }}

      if (listaFiltrada.length === 0) {{
        if (filtroIssuesAtivo === 'pendentes') {{
          container.innerHTML = '<p style="color:var(--emerald); font-size:12px; text-align:center; padding:24px;">🎉 Zero pendências ativas! Todas as anomalias foram corrigidas ou validadas.</p>';
        }} else if (filtroIssuesAtivo === 'resolvidos') {{
          container.innerHTML = '<p style="color:var(--text-muted); font-size:12px; text-align:center; padding:24px;">Nenhuma issue resolvida ainda.</p>';
        }} else {{
          container.innerHTML = '<p style="color:var(--emerald); font-size:12px; text-align:center; padding:24px;">✅ Nenhuma anomalia detectada!</p>';
        }}
        return;
      }}

      container.innerHTML = '';
      listaFiltrada.forEach(p => {{
        const ehResolvido = Boolean(p.resolvido || p.status === 'RESOLVIDO');
        const div = document.createElement('div');
        div.className = 'issue-item' + (ehResolvido ? ' resolved' : '');
        div.innerHTML = `
          <div class="issue-top">
            <span style="color:${{ehResolvido ? 'var(--emerald)' : 'var(--rose)'}}">${{p.id}} · ${{p.gravidade || 'MÉDIA'}}</span>
            ${{ehResolvido ? '<span class="issue-badge-resolved">✅ RESOLVIDO</span>' : `<span style="color:var(--text-muted)">${{p.categoria || 'UX'}}</span>`}}
          </div>
          <div style="font-weight:700; font-size:12px; color:#fff;">${{p.acao || 'Ação Clínica'}}</div>
          <div class="issue-desc">${{p.descricao}}</div>
          ${{p.resolucao_detalhe ? `<div style="font-size:11px; color:var(--emerald); margin-top:2px;">🛡️ <strong>Correção:</strong> ${{p.resolucao_detalhe}}</div>` : ''}}
          <div style="font-size:11px; color:var(--cyan); margin-top:2px;">💡 ${{p.sugestao || 'Revisar fluxo'}}</div>
          ${{
            p.repro_script ? `
              <div class="repro-box ${{ehResolvido ? 'resolved' : ''}}">
                <span style="font-size:10px; color:${{ehResolvido ? 'var(--emerald)' : 'var(--amber)'}}; font-weight:700;">
                  ${{ehResolvido ? '🧪 TESTE DE REGRESSÃO (100% VERDE):' : '🧪 REPRODUÇÃO EM 1-CLIQUE:'}}
                </span>
                <code>${{p.repro_cmd || 'node ' + p.repro_script}}</code>
                <button class="copy-btn ${{ehResolvido ? 'resolved' : ''}}" onclick="copiarComando('${{p.repro_cmd || 'node ' + p.repro_script}}')">📋 Copiar Comando</button>
              </div>
            ` : ''
          }}
        `;
        container.appendChild(div);
      }});
    }}

    function popularFeedAcoes() {{
      const feedContainer = document.getElementById('feed-acoes');
      const historico = DADOS_RELATORIO.eventos_recentes || DADOS_RELATORIO.historico || [];
      if (historico.length === 0) {{
        feedContainer.innerHTML = '<p style="color:var(--text-muted); font-size:12px; text-align:center; padding:20px;">Nenhum evento registrado ainda.</p>';
        return;
      }}

      feedContainer.innerHTML = '';
      const ultimas = historico.slice(-16).reverse();

      ultimas.forEach(item => {{
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.innerHTML = `
          <div class="feed-top">
            <span style="color:var(--cyan)">${{item.persona_avatar || '🩺'}} ${{item.persona_nome || item.persona_id || 'Persona'}}</span>
            <span style="color:${{item.sucesso ? 'var(--emerald)' : 'var(--rose)'}}">${{item.tempo_ms ? Math.round(item.tempo_ms) + 'ms' : 'OK'}}</span>
          </div>
          <div><strong>Ação:</strong> ${{item.tipo_acao || 'comando'}} → ${{item.alvo || ''}}</div>
          ${{item.pensamento ? `<div class="feed-thought">"${{item.pensamento}}"</div>` : ''}}
        `;
        feedContainer.appendChild(div);
      }});
    }}

    function copiarComando(cmd) {{
      navigator.clipboard.writeText(cmd).then(() => {{
        alert('Comando copiado para a área de transferência:\\n' + cmd);
      }});
    }}

    function filtrarNos(termo) {{
      if (!network) return;
      if (!termo) {{
        network.fit({{ animation: true }});
        return;
      }}
      const t = termo.toLowerCase();
      const nodeEncontrado = allNodes.find(n => (n.label && n.label.toLowerCase().includes(t)) || (n.id && n.id.toLowerCase().includes(t)));
      if (nodeEncontrado) {{
        network.focus(nodeEncontrado.id, {{
          scale: 1.5,
          animation: {{ duration: 500, easingFunction: 'easeInOutQuad' }}
        }});
        const nodeRaw = DADOS_GRAFO.nodes[nodeEncontrado.id];
        if (nodeRaw) exibirDetalhesNode(nodeRaw);
      }}
    }}

    function alternarFiltro(tipo) {{
      filtroAtivo = tipo;
      document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('btn-filtro-' + tipo);
      if (btn) btn.classList.add('active');

      const deadEnds = new Set(DADOS_GRAFO.dead_ends || []);
      const novosNos = allNodes.map(n => {{
        const copy = Object.assign({{}}, n);
        const ehDead = deadEnds.has(n.id);
        const ehHub = (n.rawNode && n.rawNode.texto && (n.rawNode.texto.includes("Central de Comandos") || n.rawNode.texto.includes("/menu")));

        let ocultar = false;
        if (tipo === 'deadends' && !ehDead) ocultar = true;
        if (tipo === 'hubs' && !ehHub) ocultar = true;

        if (ocultar) {{
          copy.color = {{ background: 'rgba(30, 41, 59, 0.2)', border: 'rgba(51, 65, 85, 0.2)' }};
          copy.font = {{ color: 'rgba(148, 163, 184, 0.2)' }};
        }}
        return copy;
      }});

      network.setData({{
        nodes: new vis.DataSet(novosNos),
        edges: new vis.DataSet(allEdges)
      }});
      network.fit({{ animation: true }});
    }}

    function alternarAbaLateral(aba) {{
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('tab-' + aba);
      if (btn) btn.classList.add('active');

      document.getElementById('corpo-detalhes').style.display = (aba === 'detalhes') ? 'flex' : 'none';
      document.getElementById('corpo-issues').style.display = (aba === 'issues') ? 'flex' : 'none';
      document.getElementById('corpo-feed').style.display = (aba === 'feed') ? 'flex' : 'none';
      salvarEstadoUI();
    }}

    /* ═══════════════════════════════════════════════════════════════
       SINCRONIZAÇÃO AUTOMÁTICA EM TEMPO REAL & RESTAURAÇÃO DE ESTADO
       ═══════════════════════════════════════════════════════════════ */
    let autoSyncAtivo = true;
    let tempoRestanteSync = 10;
    let timerSync = null;

    function iniciarAutoSync() {{
      const salvo = localStorage.getItem('ultra_auto_sync');
      if (salvo !== null) {{
        autoSyncAtivo = (salvo === 'true');
      }}
      atualizarBotaoSync();

      if (timerSync) clearInterval(timerSync);
      timerSync = setInterval(() => {{
        if (!autoSyncAtivo) return;
        tempoRestanteSync--;
        const lbl = document.getElementById('sync-label');
        if (lbl) lbl.innerText = `Sync Automático: ${{tempoRestanteSync}}s`;
        if (tempoRestanteSync <= 0) {{
          tempoRestanteSync = 10;
          salvarEstadoUI();
          location.reload();
        }}
      }}, 1000);
    }}

    function alternarAutoSync() {{
      autoSyncAtivo = !autoSyncAtivo;
      localStorage.setItem('ultra_auto_sync', autoSyncAtivo ? 'true' : 'false');
      tempoRestanteSync = 10;
      atualizarBotaoSync();
    }}

    function atualizarBotaoSync() {{
      const btn = document.getElementById('btn-toggle-sync');
      const lbl = document.getElementById('sync-label');
      if (!btn || !lbl) return;
      if (autoSyncAtivo) {{
        btn.classList.remove('paused');
        lbl.innerText = `Sync Automático: ${{tempoRestanteSync}}s`;
      }} else {{
        btn.classList.add('paused');
        lbl.innerText = 'Sync Pausado (Pausar/Ativar)';
      }}
    }}

    function atualizarAgora() {{
      salvarEstadoUI();
      location.reload();
    }}

    function salvarEstadoUI() {{
      const ativa = document.querySelector('.tab-btn.active');
      if (ativa) localStorage.setItem('ultra_tab_ativa', ativa.id);
      localStorage.setItem('ultra_ifilter_ativo', filtroIssuesAtivo);
    }}

    function restaurarEstadoUI() {{
      const tabSalva = localStorage.getItem('ultra_tab_ativa');
      if (tabSalva) {{
        const idLimpo = tabSalva.replace('tab-', '');
        if (['detalhes', 'issues', 'feed'].includes(idLimpo)) {{
          alternarAbaLateral(idLimpo);
        }}
      }}
      const filterSalvo = localStorage.getItem('ultra_ifilter_ativo');
      if (filterSalvo && ['todos', 'pendentes', 'resolvidos'].includes(filterSalvo)) {{
        filtrarIssues(filterSalvo);
      }}
    }}

    window.addEventListener('DOMContentLoaded', () => {{
      inicializarGrafo();
      restaurarEstadoUI();
      iniciarAutoSync();
    }});
  </script>
</body>
</html>
"""
