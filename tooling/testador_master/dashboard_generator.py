"""
Ultra Rotina · Testador Master: Gerador do Dashboard Visual do Grafo de Telas
Gera um dashboard HTML autônomo, responsivo e interativo (dashboard_grafo.html)
com visualização em nós do fluxo do Telegram Bot, telemetria e scripts de reprodução.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_GRAFO_JSON = ROOT_DIR / "data" / "testador_master_grafo.json"
DEFAULT_RELATORIO_JSON = ROOT_DIR / "data" / "testador_master_relatorio.json"
DEFAULT_OUTPUT_HTML = ROOT_DIR / "tooling" / "testador_master" / "dashboard_grafo.html"


class DashboardGenerator:
    """Compila o grafo de telas e métricas de auditoria em um dashboard HTML rico."""

    def __init__(
        self,
        output_html: Optional[Path] = None,
        grafo_json_path: Optional[Path] = None,
        relatorio_json_path: Optional[Path] = None
    ):
        self.output_html = output_html or DEFAULT_OUTPUT_HTML
        self.grafo_json_path = grafo_json_path or DEFAULT_GRAFO_JSON
        self.relatorio_json_path = relatorio_json_path or DEFAULT_RELATORIO_JSON

    def gerar_dashboard(
        self,
        dados_grafo: Optional[Dict[str, Any]] = None,
        dados_relatorio: Optional[Dict[str, Any]] = None
    ) -> Path:
        """Lê os arquivos JSON e gera o dashboard_grafo.html estático interativo."""
        # Se não fornecidos em memória, lê dos arquivos JSON
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
                dados_relatorio = {"meta": {}, "problemas": []}

        conteudo_html = self._construir_html(dados_grafo, dados_relatorio)

        self.output_html.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_html, "w", encoding="utf-8") as f:
            f.write(conteudo_html)

        # Cria cópia de conveniência em data/dashboard_grafo.html
        copia_data = ROOT_DIR / "data" / "dashboard_grafo.html"
        copia_data.parent.mkdir(parents=True, exist_ok=True)
        with open(copia_data, "w", encoding="utf-8") as f:
            f.write(conteudo_html)

        return self.output_html

    def _construir_html(self, dados_grafo: Dict[str, Any], dados_relatorio: Dict[str, Any]) -> str:
        grafo_str = json.dumps(dados_grafo, ensure_ascii=False)
        relatorio_str = json.dumps(dados_relatorio, ensure_ascii=False)
        gerado_em = datetime.now().strftime("%d/%m/%Y às %H:%M:%S")

        html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ultra Rotina · Dashboard Visual do Grafo de Telas (Telegram)</title>
  
  <!-- Vis.js Network para renderização interativa física de grafos (Offline-First com Fallback) -->
  <script src="./vendor/vis-network.min.js"></script>
  <script>
    if (typeof vis === 'undefined') {{
      document.write('<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"><\\/script>');
    }}
  </script>
  
  <style>
    :root {{
      --bg-main: #090d16;
      --bg-card: #0f172a;
      --bg-panel: rgba(15, 23, 42, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(6, 182, 212, 0.4);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --cyan: #06b6d4;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
      --purple: #8b5cf6;
      --blue: #3b82f6;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      width: 100vw;
      height: 100vh;
      min-width: 100vw;
      min-height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg-main);
      color: var(--text);
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }}

    /* Topbar Header */
    header {{
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 100;
      flex-shrink: 0;
      height: 64px;
      width: 100%;
    }}

    .logo-area {{
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }}

    .logo-badge {{
      background: linear-gradient(135deg, #0284c7, #06b6d4);
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: 8px;
      letter-spacing: 0.5px;
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.3);
    }}

    .logo-title {{
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
    }}

    .logo-sub {{
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }}

    /* Métricas Executivas */
    .metrics-bar {{
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }}

    .metrics-bar::-webkit-scrollbar {{
      display: none;
    }}

    .metric-chip {{
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      white-space: nowrap;
    }}

    .metric-chip strong {{
      color: #fff;
      font-weight: 700;
    }}

    .metric-chip.emerald strong {{ color: var(--emerald); }}
    .metric-chip.cyan strong {{ color: var(--cyan); }}
    .metric-chip.amber strong {{ color: var(--amber); }}
    .metric-chip.rose strong {{ color: var(--rose); }}
    .metric-chip.purple strong {{ color: var(--purple); }}

    /* Layout Principal: Grafo + Painel Lateral */
    main {{
      display: flex;
      flex: 1;
      width: 100%;
      height: calc(100vh - 64px);
      min-height: 0;
      min-width: 0;
      position: relative;
      overflow: hidden;
    }}

    /* Wrapper do Grafo que isola o Canvas do Vis.js */
    #graph-wrapper {{
      flex: 1;
      height: 100%;
      min-width: 0;
      min-height: 0;
      position: relative;
      background: radial-gradient(circle at 50% 50%, #0d1527 0%, #080c14 100%);
      overflow: hidden;
    }}

    #graph-canvas {{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }}

    /* Controles Flutuantes do Grafo */
    .floating-controls {{
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
    }}

    .control-btn-group {{
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 6px;
      display: flex;
      gap: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }}

    .btn {{
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
      white-space: nowrap;
    }}

    .btn:hover {{
      background: rgba(51, 65, 85, 0.95);
      border-color: var(--cyan);
      color: #fff;
    }}

    .btn.active {{
      background: var(--cyan);
      color: #000;
      border-color: var(--cyan);
    }}

    .search-input {{
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 12px;
      color: #fff;
      width: 220px;
      outline: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      transition: border-color 0.2s ease;
    }}

    .search-input:focus {{
      border-color: var(--cyan);
    }}

    /* Legenda Flutuante */
    .legend-box {{
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 11px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
    }}

    .legend-item {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .legend-dot {{
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }}

    /* Painel Lateral Direito (Inspector) */
    aside {{
      width: 440px;
      flex-shrink: 0;
      background: var(--bg-panel);
      backdrop-filter: blur(20px);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      z-index: 90;
      transition: width 0.2s ease;
      overflow: hidden;
    }}

    .panel-tabs {{
      display: flex;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.5);
    }}

    .panel-tab {{
      flex: 1;
      text-align: center;
      padding: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s ease;
    }}

    .panel-tab:hover {{
      color: #fff;
    }}

    .panel-tab.active {{
      color: var(--cyan);
      border-bottom-color: var(--cyan);
      background: rgba(6, 182, 212, 0.05);
    }}

    .panel-body {{
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}

    .card {{
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
    }}

    .card-title {{
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--cyan);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .screen-text-box {{
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #e2e8f0;
      max-height: 220px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }}

    .button-grid {{
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }}

    .button-item {{
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }}

    .button-item:hover {{
      border-color: var(--cyan);
      background: rgba(30, 41, 59, 0.8);
    }}

    .button-item .btn-cb {{
      font-family: monospace;
      font-size: 10px;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
    }}

    .button-item.clicked {{
      border-left: 3px solid var(--emerald);
    }}

    .badge-status {{
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }}
    .badge-status.dead-end {{ background: rgba(244, 63, 94, 0.2); color: var(--rose); border: 1px solid var(--rose); }}
    .badge-status.visited {{ background: rgba(16, 185, 129, 0.2); color: var(--emerald); border: 1px solid var(--emerald); }}
    .badge-status.hub {{ background: rgba(6, 182, 212, 0.2); color: var(--cyan); border: 1px solid var(--cyan); }}

    /* Lista de Problemas & Repros */
    .issue-item {{
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }}

    .issue-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .issue-id {{
      font-family: monospace;
      font-weight: 700;
      font-size: 12px;
      color: var(--amber);
    }}

    .issue-desc {{
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
    }}

    .repro-box {{
      background: #020617;
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}

    .repro-box code {{
      font-family: monospace;
      font-size: 11px;
      color: var(--cyan);
      word-break: break-all;
    }}

    .copy-btn {{
      align-self: flex-end;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid var(--cyan);
      color: var(--cyan);
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
    }}

    .copy-btn:hover {{
      background: var(--cyan);
      color: #000;
    }}

    /* Scrollbars elegantes */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: transparent; }}
    ::-webkit-scrollbar-thumb {{ background: rgba(255, 255, 255, 0.15); border-radius: 4px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: rgba(255, 255, 255, 0.3); }}
  </style>
</head>
<body>

  <!-- Topbar Header -->
  <header>
    <div class="logo-area">
      <div class="logo-badge">ULTRA ROTINA</div>
      <div>
        <div class="logo-title">Dashboard Visual do Grafo de Telas</div>
        <div class="logo-sub">Telegram Bot E2E • Auditoria & Navegação Viva ({gerado_em})</div>
      </div>
    </div>

    <!-- Métricas Executivas -->
    <div class="metrics-bar" id="metrics-bar">
      <div class="metric-chip cyan">
        <span>🗺️ Telas:</span>
        <strong id="metric-telas">0</strong>
      </div>
      <div class="metric-chip emerald">
        <span>📱 Botões Testados:</span>
        <strong id="metric-botoes">0</strong>
      </div>
      <div class="metric-chip purple">
        <span>🎯 Cobertura:</span>
        <strong id="metric-cobertura">0%</strong>
      </div>
      <div class="metric-chip amber">
        <span>⚡ Latência:</span>
        <strong id="metric-latencia">0ms</strong>
      </div>
      <div class="metric-chip rose">
        <span>🚨 Dead-Ends:</span>
        <strong id="metric-deadends">0</strong>
      </div>
      <div class="metric-chip cyan">
        <span>🧪 Scripts Repro:</span>
        <strong id="metric-repros">0</strong>
      </div>
    </div>
  </header>

  <!-- Corpo Principal -->
  <main>
    <!-- Wrapper do Grafo Interativo -->
    <div id="graph-wrapper">
      <!-- Canvas do Grafo exclusivo para o Vis.js (não apaga os controles) -->
      <div id="graph-canvas"></div>

      <!-- Controles Flutuantes -->
      <div class="floating-controls">
        <div class="control-btn-group">
          <input type="text" id="search-box" class="search-input" placeholder="🔍 Filtrar tela ou comando...">
          <button class="btn" id="btn-fit">🎯 Centralizar</button>
          <button class="btn" id="btn-toggle-layout" title="Alternar entre modo físico orgânico e árvore direcionada">🌲 Modo Árvore</button>
          <button class="btn" id="btn-toggle-deadends">⚠️ Dead-Ends</button>
          <button class="btn" id="btn-reload">🔄 Atualizar</button>
        </div>
      </div>

      <!-- Legenda Flutuante -->
      <div class="legend-box">
        <div class="legend-item"><div class="legend-dot" style="background:#06b6d4"></div><span>Menu Inicial / Hub</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div><span>Tela Explorada com Botões</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#f43f5e"></div><span>⚠️ Dead-End (Sem saída/botão)</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div><span>Última Tela Ativa</span></div>
      </div>
    </div>

    <!-- Painel Lateral / Inspector -->
    <aside id="inspector-panel">
      <div class="panel-tabs">
        <div class="panel-tab active" data-tab="tab-node">🔍 Detalhes da Tela</div>
        <div class="panel-tab" data-tab="tab-issues">🚨 Issues & Repros (<span id="tab-issue-count">0</span>)</div>
      </div>

      <!-- Conteúdo da Aba: Detalhes do Nó -->
      <div class="panel-body" id="tab-node">
        <div id="node-empty-state" style="text-align: center; color: var(--text-muted); margin-top: 40px;">
          <p style="font-size: 32px; margin-bottom: 8px;">🧭</p>
          <p>Clique em qualquer nó do grafo para inspecionar os detalhes da mensagem, botões inline e links de navegação.</p>
        </div>

        <div id="node-details" style="display: none; display: flex; flex-direction: column; gap: 14px;">
          <div class="card">
            <div class="card-title">
              <span>Metadados da Tela</span>
              <span id="node-badge" class="badge-status visited">VISITADA</span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;" id="node-title">Título</div>
            <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">
              ID: <span id="node-id" style="color: var(--cyan);">--</span> │ Visitas: <span id="node-visits">0</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Mensagem Renderizada pelo Bot</div>
            <div class="screen-text-box" id="node-text"></div>
          </div>

          <div class="card">
            <div class="card-title">
              <span>Teclado Inline do Telegram</span>
              <span id="node-buttons-count" style="color: var(--text-muted); font-size: 11px;">0 opções</span>
            </div>
            <div class="button-grid" id="node-buttons-list"></div>
          </div>
        </div>
      </div>

      <!-- Conteúdo da Aba: Issues & Repros -->
      <div class="panel-body" id="tab-issues" style="display: none;">
        <div id="issues-list"></div>
      </div>
    </aside>
  </main>

  <!-- Dados Injetados em Tempo de Compilação -->
  <script>
    const DADOS_GRAFO_INJETADOS = {grafo_str};
    const DADOS_RELATORIO_INJETADOS = {relatorio_str};

    let network = null;
    let nosDataset = null;
    let arestasDataset = null;
    let deadendsDestaqueAtivo = false;

    // Inicialização da Aplicação
    document.addEventListener("DOMContentLoaded", () => {{
      carregarMetricas(DADOS_GRAFO_INJETADOS, DADOS_RELATORIO_INJETADOS);
      carregarIssues(DADOS_RELATORIO_INJETADOS);
      renderizarGrafo(DADOS_GRAFO_INJETADOS);
      configurarEventosUI();
    }});

    function carregarMetricas(grafo, relatorio) {{
      const meta = relatorio.meta || {{}};
      const nodes = grafo.nodes || {{}};
      const deadEnds = grafo.dead_ends || [];
      const botoesClicados = grafo.botoes_clicados || [];
      const problemas = relatorio.problemas || [];

      document.getElementById("metric-telas").innerText = Object.keys(nodes).length;
      document.getElementById("metric-botoes").innerText = botoesClicados.length;
      document.getElementById("metric-cobertura").innerText = (meta.cobertura_estimada_pct || 0).toFixed(1) + "%";
      document.getElementById("metric-latencia").innerText = (meta.latencia_media_ms || 0).toFixed(0) + "ms";
      document.getElementById("metric-deadends").innerText = deadEnds.length;
      
      const reprosCount = meta.scripts_reproducao_gerados || problemas.filter(p => p.repro_script).length;
      document.getElementById("metric-repros").innerText = reprosCount;
      document.getElementById("tab-issue-count").innerText = problemas.length;
    }}

    function carregarIssues(relatorio) {{
      const container = document.getElementById("issues-list");
      const problemas = relatorio.problemas || [];
      container.innerHTML = "";

      if (problemas.length === 0) {{
        container.innerHTML = '<div style="text-align: center; color: var(--emerald); padding: 40px 0;"><p style="font-size: 32px;">✅</p><p>Nenhum problema detectado até o momento!</p></div>';
        return;
      }}

      problemas.forEach(p => {{
        const div = document.createElement("div");
        div.className = "issue-item";
        div.innerHTML = `
          <div class="issue-header">
            <span class="issue-id">${{p.id}} · ${{p.gravidade}}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${{p.categoria}}</span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #fff;">${{p.acao || 'Ação Geral'}}</div>
          <div class="issue-desc">${{p.descricao}}</div>
          <div style="font-size: 11px; color: var(--cyan); margin-top: 4px;">💡 ${{p.sugestao}}</div>
          ${{
            p.repro_script ? `
              <div class="repro-box">
                <span style="font-size: 10px; color: var(--amber); font-weight: 700;">🧪 SCRIPT DE REPRODUÇÃO 1-CLIQUE:</span>
                <code>${{p.repro_cmd || 'node ' + p.repro_script}}</code>
                <button class="copy-btn" onclick="copiarComando('${{p.repro_cmd || 'node ' + p.repro_script}}')">📋 Copiar Comando</button>
              </div>
            ` : ''
          }}
        `;
        container.appendChild(div);
      }});
    }}

    function renderizarGrafo(grafo) {{
      const container = document.getElementById("graph-canvas");
      if (!container) return;

      const nodesData = [];
      const edgesData = [];
      const nodesMap = grafo.nodes || {{}};
      const deadEnds = new Set(grafo.dead_ends || []);
      const telaAtualId = grafo.tela_atual_id;

      Object.values(nodesMap).forEach(node => {{
        const ehDeadEnd = deadEnds.has(node.id);
        const ehAtual = (node.id === telaAtualId);
        const ehInicio = (node.texto && (node.texto.includes("Central de Comandos") || node.texto.includes("/menu")));

        let corFundo = "#2563eb";
        let corBorda = "#60a5fa";

        if (ehDeadEnd) {{
          corFundo = "#e11d48";
          corBorda = "#fda4af";
        }} else if (ehAtual) {{
          corFundo = "#059669";
          corBorda = "#6ee7b7";
        }} else if (ehInicio) {{
          corFundo = "#0891b2";
          corBorda = "#67e8f9";
        }}

        // Rótulo compacto e limpo para o nó
        let rotuloLimpo = (node.titulo || "Tela")
          .replace(/[⚡🚨🩺💊📐📅📱🧹⚠️💧❌]/g, "")
          .replace(/[*_]/g, "")
          .trim();
        if (rotuloLimpo.length > 24) {{
          rotuloLimpo = rotuloLimpo.substring(0, 22) + "…";
        }}

        nodesData.push({{
          id: node.id,
          label: rotuloLimpo,
          title: `Tela: ${{node.titulo}}\\nVisitas: ${{node.visitas}}`,
          color: {{
            background: corFundo,
            border: corBorda,
            highlight: {{ background: "#06b6d4", border: "#ffffff" }}
          }},
          font: {{
            color: "#ffffff",
            size: 13,
            face: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
          }},
          shape: "box",
          margin: {{ top: 12, right: 16, bottom: 12, left: 16 }},
          borderWidth: 2,
          shadow: {{ enabled: true, color: "rgba(0,0,0,0.5)", size: 8, x: 2, y: 3 }},
          nodeRaw: node
        }});

        // Constrói as arestas saindo desta tela
        if (node.arestas_saindo) {{
          Object.entries(node.arestas_saindo).forEach(([cbKey, edgeInfo]) => {{
            const destinoId = edgeInfo.destino;
            if (destinoId && nodesMap[destinoId]) {{
              edgesData.push({{
                from: node.id,
                to: destinoId,
                label: edgeInfo.text || cbKey,
                arrows: "to",
                color: {{ color: "rgba(148, 163, 184, 0.45)", highlight: "#06b6d4" }},
                font: {{ color: "#94a3b8", size: 10, align: "middle", strokeWidth: 3, strokeColor: "#090d16" }},
                smooth: {{ type: "cubicBezier", roundness: 0.2 }}
              }});
            }}
          }});
        }}
      }});

      nosDataset = new vis.DataSet(nodesData);
      arestasDataset = new vis.DataSet(edgesData);

      const options = {{
        nodes: {{
          shape: "box",
          margin: {{ top: 12, right: 16, bottom: 12, left: 16 }},
          borderWidth: 2,
          shadow: {{ enabled: true, color: "rgba(0,0,0,0.5)", size: 8, x: 2, y: 3 }}
        }},
        edges: {{
          arrows: {{ to: {{ enabled: true, scaleFactor: 0.8 }} }},
          selectionWidth: 2,
          smooth: {{ type: "cubicBezier", roundness: 0.2 }}
        }},
        physics: {{
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: {{
            gravitationalConstant: -280,
            centralGravity: 0.015,
            springLength: 220,
            springConstant: 0.07,
            damping: 0.35,
            avoidOverlap: 1
          }},
          stabilization: {{
            enabled: true,
            iterations: 200,
            updateInterval: 25
          }}
        }},
        interaction: {{
          hover: true,
          tooltipDelay: 100,
          zoomView: true,
          dragView: true
        }}
      }};

      network = new vis.Network(container, {{ nodes: nosDataset, edges: arestasDataset }}, options);

      // Auto-enquadramento assim que a física estabilizar
      network.once("stabilizationIterationsDone", () => {{
        network.fit({{ animation: false }});
      }});

      // Evento de seleção de nó
      network.on("click", (params) => {{
        if (params.nodes && params.nodes.length > 0) {{
          const nodeId = params.nodes[0];
          const nodeObj = nosDataset.get(nodeId);
          if (nodeObj && nodeObj.nodeRaw) {{
            exibirDetalhesTela(nodeObj.nodeRaw, deadEnds.has(nodeId));
          }}
        }}
      }});

      // Se houver nós, seleciona o primeiro para inspecionar
      if (nodesData.length > 0) {{
        exibirDetalhesTela(nodesData[0].nodeRaw, deadEnds.has(nodesData[0].id));
      }}
    }}

    function exibirDetalhesTela(node, ehDeadEnd) {{
      const emptyState = document.getElementById("node-empty-state");
      if (emptyState) emptyState.style.display = "none";
      const details = document.getElementById("node-details");
      if (details) details.style.display = "flex";

      const elId = document.getElementById("node-id");
      if (elId) elId.innerText = node.id;
      const elTitle = document.getElementById("node-title");
      if (elTitle) elTitle.innerText = node.titulo || "Sem título";
      const elVisits = document.getElementById("node-visits");
      if (elVisits) elVisits.innerText = node.visitas || 1;
      const elText = document.getElementById("node-text");
      if (elText) elText.innerText = node.texto || "(Sem texto registrado)";

      const badge = document.getElementById("node-badge");
      if (badge) {{
        if (ehDeadEnd) {{
          badge.className = "badge-status dead-end";
          badge.innerText = "⚠️ DEAD-END (SEM SAÍDA)";
        }} else {{
          badge.className = "badge-status visited";
          badge.innerText = "VISITADA";
        }}
      }}

      // Monta lista de botões
      const listContainer = document.getElementById("node-buttons-list");
      if (listContainer) {{
        listContainer.innerHTML = "";
        const botoes = node.botoes || [];
        const flatBotoes = botoes.flat();

        const countEl = document.getElementById("node-buttons-count");
        if (countEl) countEl.innerText = `${{flatBotoes.length}} opções`;

        if (flatBotoes.length === 0) {{
          listContainer.innerHTML = '<div style="font-size: 11px; color: var(--rose);">Nenhum botão inline nesta tela.</div>';
          return;
        }}

        flatBotoes.forEach(b => {{
          const btnItem = document.createElement("div");
          btnItem.className = "button-item";
          btnItem.innerHTML = `
            <span>${{b.text}}</span>
            <span class="btn-cb">${{b.callback_data || b.url || 'sem callback'}}</span>
          `;
          listContainer.appendChild(btnItem);
        }});
      }}
    }}

    function configurarEventosUI() {{
      // Tabs do Inspector
      document.querySelectorAll(".panel-tab").forEach(tab => {{
        tab.addEventListener("click", () => {{
          document.querySelectorAll(".panel-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          const alvo = tab.getAttribute("data-tab");
          const tabNode = document.getElementById("tab-node");
          const tabIssues = document.getElementById("tab-issues");
          if (tabNode) tabNode.style.display = (alvo === "tab-node") ? "flex" : "none";
          if (tabIssues) tabIssues.style.display = (alvo === "tab-issues") ? "block" : "none";
        }});
      }});

      // Botão Centralizar
      const btnFit = document.getElementById("btn-fit");
      if (btnFit) {{
        btnFit.addEventListener("click", () => {{
          if (network) network.fit({{ animation: true }});
        }});
      }}

      // Botão Alternar Layout (Árvore Hierárquica vs Físico Livre)
      let modoArvore = false;
      const btnLayout = document.getElementById("btn-toggle-layout");
      if (btnLayout) {{
        btnLayout.addEventListener("click", () => {{
          modoArvore = !modoArvore;
          btnLayout.classList.toggle("active", modoArvore);
          btnLayout.innerText = modoArvore ? "⚛️ Modo Físico" : "🌲 Modo Árvore";

          if (modoArvore) {{
            network.setOptions({{
              layout: {{
                hierarchical: {{
                  enabled: true,
                  direction: "UD",
                  sortMethod: "directed",
                  levelSeparation: 140,
                  nodeSpacing: 220
                }}
              }},
              physics: {{ enabled: false }}
            }});
          }} else {{
            network.setOptions({{
              layout: {{ hierarchical: {{ enabled: false }} }},
              physics: {{
                enabled: true,
                solver: "forceAtlas2Based",
                forceAtlas2Based: {{
                  gravitationalConstant: -280,
                  centralGravity: 0.015,
                  springLength: 220,
                  springConstant: 0.07,
                  damping: 0.35,
                  avoidOverlap: 1
                }}
              }}
            }});
          }}
          setTimeout(() => {{ if (network) network.fit({{ animation: true }}); }}, 150);
        }});
      }}

      // Botão Destacar Dead-Ends
      const btnDeadends = document.getElementById("btn-toggle-deadends");
      if (btnDeadends) {{
        btnDeadends.addEventListener("click", () => {{
          deadendsDestaqueAtivo = !deadendsDestaqueAtivo;
          btnDeadends.classList.toggle("active", deadendsDestaqueAtivo);

          const deadEnds = new Set(DADOS_GRAFO_INJETADOS.dead_ends || []);
          if (nosDataset) {{
            nosDataset.forEach(n => {{
              const isDead = deadEnds.has(n.id);
              nosDataset.update({{
                id: n.id,
                borderWidth: (deadendsDestaqueAtivo && isDead) ? 5 : 2,
                size: (deadendsDestaqueAtivo && isDead) ? 35 : 20
              }});
            }});
          }}
        }});
      }}

      // Botão Atualizar (Fetch se disponível)
      const btnReload = document.getElementById("btn-reload");
      if (btnReload) {{
        btnReload.addEventListener("click", () => {{
          window.location.reload();
        }});
      }}

      // Campo de Busca
      const searchBox = document.getElementById("search-box");
      if (searchBox) {{
        searchBox.addEventListener("input", (e) => {{
          const termo = e.target.value.toLowerCase().trim();
          if (!nosDataset) return;
          if (!termo) {{
            nosDataset.forEach(n => nosDataset.update({{ id: n.id, hidden: false }}));
            return;
          }}
          nosDataset.forEach(n => {{
            const texto = ((n.nodeRaw && n.nodeRaw.texto) || "" + n.label).toLowerCase();
            nosDataset.update({{ id: n.id, hidden: !texto.includes(termo) }});
          }});
        }});
      }}
    }}

    function copiarComando(cmd) {{
      navigator.clipboard.writeText(cmd).then(() => {{
        alert("Comando copiado para a área de transferência!\\n\\nCole no terminal:\\n" + cmd);
      }}).catch(() => {{
        prompt("Copie o comando abaixo:", cmd);
      }});
    }}
  </script>
</body>
</html>
"""
        return html


if __name__ == "__main__":
    generator = DashboardGenerator()
    caminho = generator.gerar_dashboard()
    print(f"✅ Dashboard gerado com sucesso em: {caminho}")
