#!/usr/bin/env python3
"""
Injetor de Alta Engenharia para o Centro de Aulas Flash R1 no Cockpit Móvel
Adiciona a aba tab-aulas, a barra de navegação de 7 itens, o player embutido,
o motor de busca instantânea e o catálogo de dados compactos.
"""

import json
from pathlib import Path

BASE_DIR = Path("/home/wagmoraes/Projetos IA/Rotina")
COCKPIT_HTML_FILE = BASE_DIR / "cockpit_movel.html"
AULAS_JSON_FILE = BASE_DIR / "src/data/aulas_compactas.json"

def main():
    print("=" * 70)
    print("INJETANDO CENTRO DE AULAS FLASH R1 NO COCKPIT MÓVEL")
    print("=" * 70)

    html = COCKPIT_HTML_FILE.read_text(encoding="utf-8")
    aulas_data = AULAS_JSON_FILE.read_text(encoding="utf-8")

    # 1. Atualizar Bottom Nav (grid-cols-6 -> grid-cols-7 com botão Aulas)
    nav_antigo = """    <div class="grid grid-cols-6 h-14 max-w-3xl mx-auto px-1">
      <button onclick="navegarAba('tab-soap', 'SOAP & Copiloto')" class="nav-btn flex flex-col items-center justify-center text-brand-400 transition" data-tab="tab-soap">
        <i data-lucide="sparkles" class="w-5 h-5"></i>
        <span class="text-[9px] font-semibold mt-0.5">SOAP</span>
      </button>
      <button onclick="navegarAba('tab-leitos', 'Leitos & Enfermaria')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-leitos">
        <div class="relative inline-flex">
          <i data-lucide="hospital" class="w-5 h-5"></i>
          <span id="badge-leitos" class="hidden absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface-900"></span>
        </div>
        <span class="text-[9px] font-medium mt-0.5">Leitos</span>
      </button>
      <button onclick="navegarAba('tab-remume', 'Prescrição & REMUME')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-remume">
        <i data-lucide="pill" class="w-5 h-5"></i>
        <span class="text-[9px] font-medium mt-0.5">REMUME</span>
      </button>
      <button onclick="navegarAba('tab-calculadoras', 'Calculadoras de Bolso')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-calculadoras">
        <i data-lucide="calculator" class="w-5 h-5"></i>
        <span class="text-[9px] font-medium mt-0.5">Cálculos</span>
      </button>
      <button onclick="navegarAba('tab-rotina', 'Rotina & Estudos')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-rotina">
        <i data-lucide="calendar" class="w-5 h-5"></i>
        <span class="text-[9px] font-medium mt-0.5">Rotina</span>
      </button>
      <button onclick="navegarAba('tab-corpo', 'Perfil & Rotina')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-corpo">
        <i data-lucide="user-circle" class="w-5 h-5"></i>
        <span class="text-[9px] font-medium mt-0.5">Perfil</span>
      </button>
    </div>"""

    nav_novo = """    <div class="grid grid-cols-7 h-14 max-w-3xl mx-auto px-0.5">
      <button onclick="navegarAba('tab-soap', 'SOAP & Copiloto')" class="nav-btn flex flex-col items-center justify-center text-brand-400 transition" data-tab="tab-soap">
        <i data-lucide="sparkles" class="w-4 h-4 sm:w-5 sm:h-5"></i>
        <span class="text-[8.5px] sm:text-[9px] font-semibold mt-0.5">SOAP</span>
      </button>
      <button onclick="navegarAba('tab-leitos', 'Leitos & Enfermaria')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-leitos">
        <div class="relative inline-flex">
          <i data-lucide="hospital" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          <span id="badge-leitos" class="hidden absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">Leitos</span>
      </button>
      <button onclick="navegarAba('tab-remume', 'Prescrição & REMUME')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-remume">
        <i data-lucide="pill" class="w-4 h-4 sm:w-5 sm:h-5"></i>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">REMUME</span>
      </button>
      <button onclick="navegarAba('tab-calculadoras', 'Calculadoras de Bolso')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-calculadoras">
        <i data-lucide="calculator" class="w-4 h-4 sm:w-5 sm:h-5"></i>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">Cálculos</span>
      </button>
      <button onclick="navegarAba('tab-aulas', 'Centro de Aulas R1')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-aulas">
        <div class="relative inline-flex">
          <i data-lucide="graduation-cap" class="w-4 h-4 sm:w-5 sm:h-5"></i>
          <span id="badge-aulas" class="hidden absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full"></span>
        </div>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">Aulas</span>
      </button>
      <button onclick="navegarAba('tab-rotina', 'Rotina & Estudos')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-rotina">
        <i data-lucide="calendar" class="w-4 h-4 sm:w-5 sm:h-5"></i>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">Rotina</span>
      </button>
      <button onclick="navegarAba('tab-corpo', 'Perfil & Rotina')" class="nav-btn flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 transition" data-tab="tab-corpo">
        <i data-lucide="user-circle" class="w-4 h-4 sm:w-5 sm:h-5"></i>
        <span class="text-[8.5px] sm:text-[9px] font-medium mt-0.5">Perfil</span>
      </button>
    </div>"""

    if nav_antigo not in html:
        print("[ERRO]: Trecho de navegação antiga não encontrado exatamente.")
        return

    html = html.replace(nav_antigo, nav_novo)
    print("✓ Barra de navegação atualizada para 7 itens.")

    # 2. Inserir a div da aba tab-aulas antes de </main>
    tab_aulas_html = """    <!-- =================================================================== -->
    <!-- ABA: CENTRO DE AULAS FLASH R1 EXTENSIVO (DRIVE EMBUTIDO) -->
    <!-- =================================================================== -->
    <div id="tab-aulas" class="tab-pane hidden space-y-3.5">
      <!-- Card Superior de Progresso Geral -->
      <div class="glass-card-accent rounded-xl p-3.5 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-sm">
              <i data-lucide="graduation-cap" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white tracking-tight">Extensivo R1 — Aulas Flash</h3>
              <p class="text-[10px] text-slate-300 font-medium" id="aulas-progresso-texto">Carregando progresso...</p>
            </div>
          </div>
          <button onclick="sincronizarAulasProgresso(true)" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition" title="Sincronizar Progresso">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5" id="btn-refresh-aulas"></i>
          </button>
        </div>
        <!-- Barra de Progresso Visual -->
        <div class="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/60">
          <div id="aulas-barra-progresso" class="bg-gradient-to-r from-emerald-500 to-brand-400 h-full rounded-full transition-all duration-500" style="width: 0%"></div>
        </div>
      </div>

      <!-- Player de Vídeo Embutido (Modo Cinema / Sticky) -->
      <div id="player-container" class="hidden glass-card rounded-2xl overflow-hidden border border-brand-500/40 shadow-2xl transition-all duration-300">
        <!-- Barra de Status do Vídeo -->
        <div class="bg-surface-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
          <div class="truncate flex items-center gap-1.5 min-w-0">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-semibold text-white truncate" id="player-titulo-aula">Reproduzindo aula</span>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button onclick="fecharPlayer()" class="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition" title="Fechar player">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Frame do Player -->
        <div class="relative w-full aspect-video bg-black flex items-center justify-center">
          <iframe id="player-iframe" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          <div id="player-placeholder" class="hidden flex-col items-center justify-center p-4 text-center space-y-2">
            <i data-lucide="video" class="w-8 h-8 text-brand-400"></i>
            <p class="text-xs text-slate-200 font-medium px-4" id="player-placeholder-msg">Vídeo pronto para reprodução</p>
            <p class="text-[10px] text-slate-400 max-w-xs">Acesse diretamente pelo Google Drive no navegador ou aplicativo nativo:</p>
            <a id="player-link-drive" href="https://drive.google.com/drive/folders/1ft5ewJehuQD1Ez3vrWNbNVEYr4Z0k0pn" target="_blank" class="text-[11px] px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold inline-flex items-center gap-1.5 transition shadow-md shadow-brand-500/20">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Abrir no Google Drive
            </a>
          </div>
        </div>

        <!-- Controles Inferiores do Player -->
        <div class="bg-surface-900/95 p-2.5 flex items-center justify-between gap-2 border-t border-slate-800 text-xs">
          <button id="player-btn-assistida" onclick="alternarAulaAtivaAssistida()" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> <span id="player-btn-assistida-label">Marcar como Assistida</span>
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="aulaAnterior()" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition" title="Aula anterior">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <button onclick="proximaAula()" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition" title="Próxima aula">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
            <a id="player-btn-externo" href="https://drive.google.com/drive/folders/1ft5ewJehuQD1Ez3vrWNbNVEYr4Z0k0pn" target="_blank" class="p-1.5 rounded-lg bg-slate-800 text-sky-400 hover:text-white transition" title="Abrir pasta no Google Drive">
              <i data-lucide="folder" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros por Pílulas das 5 Grandes Áreas -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button onclick="filtrarAreaAulas('todas')" class="pilula-area active px-3 py-1.5 rounded-full font-semibold whitespace-nowrap bg-brand-500/20 text-brand-300 border border-brand-500/40 transition" data-area="todas">
          Todas <span class="ml-1 text-[10px] opacity-80" id="badge-count-todas">317</span>
        </button>
        <button onclick="filtrarAreaAulas('Cirurgia Geral')" class="pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition" data-area="Cirurgia Geral">
          Cirurgia <span class="ml-1 text-[10px] opacity-80" id="badge-count-cirurgia">75</span>
        </button>
        <button onclick="filtrarAreaAulas('Clínica Médica')" class="pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition" data-area="Clínica Médica">
          Clínica <span class="ml-1 text-[10px] opacity-80" id="badge-count-clinica">111</span>
        </button>
        <button onclick="filtrarAreaAulas('Ginecologia e Obstetrícia')" class="pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition" data-area="Ginecologia e Obstetrícia">
          GO <span class="ml-1 text-[10px] opacity-80" id="badge-count-go">63</span>
        </button>
        <button onclick="filtrarAreaAulas('Pediatria')" class="pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition" data-area="Pediatria">
          Pediatria <span class="ml-1 text-[10px] opacity-80" id="badge-count-ped">43</span>
        </button>
        <button onclick="filtrarAreaAulas('Medicina Preventiva e Social')" class="pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition" data-area="Medicina Preventiva e Social">
          Preventiva <span class="ml-1 text-[10px] opacity-80" id="badge-count-prev">25</span>
        </button>
      </div>

      <!-- Barra de Busca Instantânea & Toggle de Pendências -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
          <input type="text" id="busca-aulas-input" oninput="aoDigitarBuscaAulas(this.value)" placeholder="Buscar patologia, tema ou módulo..." class="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/60 transition">
          <button id="limpar-busca-aulas" onclick="limparBuscaAulas()" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
        <button id="btn-toggle-pendentes" onclick="alternarFiltroPendentes()" class="px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white text-xs flex items-center gap-1 transition whitespace-nowrap" title="Ver apenas aulas não assistidas">
          <i data-lucide="filter" class="w-3.5 h-3.5"></i> <span id="label-pendentes" class="hidden sm:inline">Pendentes</span>
        </button>
      </div>

      <!-- Lista de Módulos e Aulas em Acordeão Retrátil -->
      <div id="lista-modulos-aulas" class="space-y-2.5 pb-6">
        <!-- Renderizado dinamicamente -->
      </div>
    </div>
"""

    ponto_insercao = "  </main>"
    if ponto_insercao not in html:
        print("[ERRO]: Tag </main> não encontrada.")
        return

    html = html.replace(ponto_insercao, tab_aulas_html + "\n" + ponto_insercao)
    print("✓ Painel tab-aulas injetado antes de </main>.")

    # 3. Adicionar chamada a carregarAulas() em navegarAba
    ponto_navegar = "if (tabId === 'tab-corpo' || tabId === 'tab-rotina') carregarPerfil();"
    chamada_aulas = ponto_navegar + "\n      if (tabId === 'tab-aulas') carregarAulas();"
    if ponto_navegar not in html:
        print("[ERRO]: Chamada carregarPerfil() não encontrada em navegarAba.")
        return

    html = html.replace(ponto_navegar, chamada_aulas)
    print("✓ Chamada carregarAulas() adicionada ao navegador de abas.")

    # 4. Injetar o Script Controlador das Aulas Flash com dados embutidos
    script_controlador = f"""
    // =========================================================================
    // MÓDULO: CENTRO DE AULAS FLASH R1 EXTENSIVO (DRIVE EMBUTIDO)
    // =========================================================================
    const AULAS_FLASH_CATALOGO = {aulas_data};

    const aulasState = {{
      areaAtiva: 'todas',
      termoBusca: '',
      apenasPendentes: false,
      aulaAtiva: null,
      assistidas: new Set(),
      modulosAbertos: new Set(),
      inicializado: false
    }};

    // Inicialização do estado de progresso (localStorage + RPC)
    function inicializarAulas() {{
      if (aulasState.inicializado) return;
      try {{
        const salvas = localStorage.getItem('cockpit_aulas_assistidas');
        if (salvas) {{
          const lista = JSON.parse(salvas);
          if (Array.isArray(lista)) {{
            aulasState.assistidas = new Set(lista);
          }}
        }}
      }} catch (e) {{}}

      aulasState.inicializado = true;
      sincronizarAulasProgresso(false);
      renderizarCatalogoAulas();
      atualizarProgressoGeral();
    }}

    async function sincronizarAulasProgresso(mostrarFeedback = false) {{
      const btnRefresh = document.getElementById('btn-refresh-aulas');
      if (btnRefresh) btnRefresh.classList.add('animate-spin');
      try {{
        const resp = await cockpitRpc('cockpitAulasProgresso');
        if (resp && Array.isArray(resp.assistidas)) {{
          resp.assistidas.forEach(id => aulasState.assistidas.add(id));
          try {{
            localStorage.setItem('cockpit_aulas_assistidas', JSON.stringify([...aulasState.assistidas]));
          }} catch (e) {{}}
          renderizarCatalogoAulas();
          atualizarProgressoGeral();
          if (mostrarFeedback) copiarToast('Progresso sincronizado com o servidor!');
        }}
      }} catch (err) {{
        console.warn('[Cockpit Aulas] Falha ao sincronizar progresso com servidor:', err.message);
      }} finally {{
        if (btnRefresh) setTimeout(() => btnRefresh.classList.remove('animate-spin'), 400);
      }}
    }}

    function carregarAulas() {{
      inicializarAulas();
      lucide.createIcons();
    }}

    function atualizarProgressoGeral() {{
      const total = AULAS_FLASH_CATALOGO.length;
      const assistidasCount = [...aulasState.assistidas].filter(id => AULAS_FLASH_CATALOGO.some(a => a.id === id)).length;
      const pct = total > 0 ? Math.round((assistidasCount / total) * 100) : 0;

      const barra = document.getElementById('aulas-barra-progresso');
      if (barra) barra.style.width = pct + '%';

      const texto = document.getElementById('aulas-progresso-texto');
      if (texto) texto.textContent = `${{assistidasCount}} de ${{total}} aulas concluídas • ${{pct}}%`;
    }}

    function filtrarAreaAulas(area) {{
      hapticFeedback('light');
      aulasState.areaAtiva = area;
      document.querySelectorAll('.pilula-area').forEach(btn => {{
        if (btn.dataset.area === area) {{
          btn.className = 'pilula-area active px-3 py-1.5 rounded-full font-semibold whitespace-nowrap bg-brand-500/20 text-brand-300 border border-brand-500/40 transition';
        }} else {{
          btn.className = 'pilula-area px-3 py-1.5 rounded-full font-medium whitespace-nowrap bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition';
        }}
      }});
      renderizarCatalogoAulas();
    }}

    let buscaAulasTimeout = null;
    function aoDigitarBuscaAulas(val) {{
      clearTimeout(buscaAulasTimeout);
      const btnLimpar = document.getElementById('limpar-busca-aulas');
      if (btnLimpar) btnLimpar.classList.toggle('hidden', !val);

      buscaAulasTimeout = setTimeout(() => {{
        aulasState.termoBusca = (val || '').trim().toLowerCase();
        renderizarCatalogoAulas();
      }}, 120);
    }}

    function limparBuscaAulas() {{
      hapticFeedback('light');
      const input = document.getElementById('busca-aulas-input');
      if (input) input.value = '';
      const btnLimpar = document.getElementById('limpar-busca-aulas');
      if (btnLimpar) btnLimpar.classList.add('hidden');
      aulasState.termoBusca = '';
      renderizarCatalogoAulas();
    }}

    function alternarFiltroPendentes() {{
      hapticFeedback('light');
      aulasState.apenasPendentes = !aulasState.apenasPendentes;
      const btn = document.getElementById('btn-toggle-pendentes');
      if (btn) {{
        if (aulasState.apenasPendentes) {{
          btn.className = 'px-2.5 py-2 rounded-xl border border-brand-500/50 bg-brand-500/20 text-brand-300 text-xs flex items-center gap-1 transition whitespace-nowrap font-medium';
        }} else {{
          btn.className = 'px-2.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white text-xs flex items-center gap-1 transition whitespace-nowrap';
        }}
      }}
      renderizarCatalogoAulas();
    }}

    function alternarModuloAberto(moduloId) {{
      hapticFeedback('light');
      if (aulasState.modulosAbertos.has(moduloId)) {{
        aulasState.modulosAbertos.delete(moduloId);
      }} else {{
        aulasState.modulosAbertos.add(moduloId);
      }}
      renderizarCatalogoAulas();
    }}

    function renderizarCatalogoAulas() {{
      const container = document.getElementById('lista-modulos-aulas');
      if (!container) return;

      // Filtragem das aulas
      let filtradas = AULAS_FLASH_CATALOGO.filter(item => {{
        if (aulasState.areaAtiva !== 'todas' && item.area !== aulasState.areaAtiva) return false;
        if (aulasState.apenasPendentes && aulasState.assistidas.has(item.id)) return false;
        if (aulasState.termoBusca) {{
          const termo = aulasState.termoBusca;
          const noTit = (item.tit || '').toLowerCase().includes(termo);
          const noMod = (item.mod || '').toLowerCase().includes(termo);
          const noRes = (item.res || '').toLowerCase().includes(termo);
          if (!noTit && !noMod && !noRes) return false;
        }}
        return true;
      }});

      if (filtradas.length === 0) {{
        container.innerHTML = `
          <div class="glass-card p-6 rounded-2xl text-center space-y-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-500 mx-auto"></i>
            <p class="text-xs text-slate-300 font-medium">Nenhuma aula flash encontrada para os filtros atuais.</p>
            <button onclick="limparBuscaAulas()" class="text-[11px] text-brand-400 font-semibold hover:underline">Limpar filtros e busca</button>
          </div>
        `;
        lucide.createIcons();
        return;
      }}

      // Agrupamento por Módulo
      const modulosMap = new Map();
      filtradas.forEach(aula => {{
        const chave = aula.area + ' — ' + aula.mod;
        if (!modulosMap.has(chave)) {{
          modulosMap.set(chave, {{
            area: aula.area,
            modulo: aula.mod,
            chave: chave,
            aulas: []
          }});
        }}
        modulosMap.get(chave).aulas.push(aula);
      }});

      // Montagem do HTML em blocos
      let htmlModulos = '';
      modulosMap.forEach(grupo => {{
        const totalMod = grupo.aulas.length;
        const assistidasMod = grupo.aulas.filter(a => aulasState.assistidas.has(a.id)).length;
        const todasConcluidas = assistidasMod === totalMod && totalMod > 0;
        
        // Se há busca ativa, abre automaticamente os módulos correspondentes
        const estaAberto = aulasState.termoBusca.length > 0 || aulasState.modulosAbertos.has(grupo.chave);

        htmlModulos += `
          <div class="glass-card rounded-xl overflow-hidden border border-slate-800/80 transition">
            <!-- Cabeçalho do Módulo (Acordeão) -->
            <button onclick="alternarModuloAberto('${{grupo.chave.replace(/'/g, "\\\\'") }}')" class="w-full p-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">${{grupo.area.split(' ')[0]}}</span>
                  <span class="text-xs font-bold text-white truncate">${{grupo.modulo}}</span>
                </div>
                <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                  <span>${{totalMod}} ${{totalMod === 1 ? 'aula flash' : 'aulas flash'}}</span>
                  <span>•</span>
                  <span class="${{todasConcluidas ? 'text-emerald-400 font-bold' : 'text-slate-400'}}">${{assistidasMod}}/${{totalMod}} concluídas</span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                ${{todasConcluidas ? '<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>' : ''}}
                <i data-lucide="${{estaAberto ? 'chevron-up' : 'chevron-down'}}" class="w-4 h-4 text-slate-400"></i>
              </div>
            </button>

            <!-- Lista de Aulas do Módulo -->
            ${{estaAberto ? `
              <div class="p-2 pt-0 space-y-1.5 border-t border-slate-800/60 bg-surface-950/40">
                ${{grupo.aulas.map(aula => {{
                  const assistida = aulasState.assistidas.has(aula.id);
                  const isAtiva = aulasState.aulaAtiva && aulasState.aulaAtiva.id === aula.id;
                  return `
                    <div class="p-2.5 rounded-lg border ${{isAtiva ? 'border-brand-500/60 bg-brand-500/10' : 'border-slate-800/80 bg-slate-900/60'}} flex items-start justify-between gap-2.5 transition">
                      <div class="min-w-0 flex-1 cursor-pointer" onclick="abrirAulaFlash('${{aula.id}}')">
                        <div class="flex items-center gap-1.5">
                          <button class="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 hover:scale-105 transition" title="Assistir aula">
                            <i data-lucide="play" class="w-2.5 h-2.5 fill-current"></i>
                          </button>
                          <span class="text-[11px] font-bold ${{assistida ? 'text-slate-400 line-through' : 'text-white'}}">${{aula.tit}}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">${{aula.res}}</p>
                      </div>

                      <button onclick="alternarAulaAssistida('${{aula.id}}', event)" class="p-1 rounded-md ${{assistida ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}} transition flex-shrink-0 mt-0.5" title="${{assistida ? 'Marcar como não assistida' : 'Marcar como assistida'}}">
                        <i data-lucide="${{assistida ? 'check-check' : 'check'}}" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  `;
                }}).join('')}}
              </div>
            ` : ''}}
          </div>
        `;
      }});

      container.innerHTML = htmlModulos;
      lucide.createIcons();
    }}

    function abrirAulaFlash(aulaId) {{
      hapticFeedback('medium');
      const aula = AULAS_FLASH_CATALOGO.find(a => a.id === aulaId);
      if (!aula) return;

      aulasState.aulaAtiva = aula;

      const playerContainer = document.getElementById('player-container');
      const iframe = document.getElementById('player-iframe');
      const placeholder = document.getElementById('player-placeholder');
      const tituloAulaEl = document.getElementById('player-titulo-aula');
      const btnAssistida = document.getElementById('player-btn-assistida');
      const labelAssistida = document.getElementById('player-btn-assistida-label');
      const linkDrive = document.getElementById('player-link-drive');
      const btnExterno = document.getElementById('player-btn-externo');

      if (tituloAulaEl) tituloAulaEl.textContent = `${{aula.mod}} • ${{aula.tit}}`;
      if (playerContainer) playerContainer.classList.remove('hidden');

      // Atualiza botões de ação e links
      const driveFolderUrl = "https://drive.google.com/drive/folders/1ft5ewJehuQD1Ez3vrWNbNVEYr4Z0k0pn";
      const driveSearchUrl = "https://drive.google.com/drive/search?q=" + encodeURIComponent(aula.vid || aula.tit);

      if (linkDrive) linkDrive.href = driveFolderUrl;
      if (btnExterno) btnExterno.href = driveSearchUrl;

      // Se temos o ID direto do arquivo no Google Drive
      if (aula.drive_id && aula.drive_id.length > 5) {{
        iframe.src = `https://drive.google.com/file/d/${{aula.drive_id}}/preview`;
        iframe.classList.remove('hidden');
        placeholder.classList.add('hidden');
      }} else {{
        // Quando o ID específico está mapeado para abertura no Drive
        iframe.classList.add('hidden');
        placeholder.classList.remove('hidden');
        document.getElementById('player-placeholder-msg').textContent = aula.tit;
      }}

      // Atualiza botão de assistida no player
      atualizarBotaoAssistidaPlayer(aula.id);

      // Re-renderiza para destacar a aula ativa
      renderizarCatalogoAulas();

      // Rola até o player
      playerContainer.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
    }}

    function fecharPlayer() {{
      hapticFeedback('light');
      const playerContainer = document.getElementById('player-container');
      const iframe = document.getElementById('player-iframe');
      if (iframe) iframe.src = 'about:blank';
      if (playerContainer) playerContainer.classList.add('hidden');
      aulasState.aulaAtiva = null;
      renderizarCatalogoAulas();
    }}

    function atualizarBotaoAssistidaPlayer(aulaId) {{
      const btn = document.getElementById('player-btn-assistida');
      const label = document.getElementById('player-btn-assistida-label');
      if (!btn || !label) return;

      const assistida = aulasState.assistidas.has(aulaId);
      if (assistida) {{
        btn.className = 'px-2.5 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 transition';
        label.textContent = 'Aula Assistida ✓';
      }} else {{
        btn.className = 'px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition';
        label.textContent = 'Marcar como Assistida';
      }}
    }}

    async function alternarAulaAtivaAssistida() {{
      if (!aulasState.aulaAtiva) return;
      await alternarAulaAssistida(aulasState.aulaAtiva.id);
      atualizarBotaoAssistidaPlayer(aulasState.aulaAtiva.id);
    }}

    async function alternarAulaAssistida(aulaId, event) {{
      if (event) event.stopPropagation();
      hapticFeedback('medium');

      const jaAssistida = aulasState.assistidas.has(aulaId);
      if (jaAssistida) {{
        aulasState.assistidas.delete(aulaId);
      }} else {{
        aulasState.assistidas.add(aulaId);
      }}

      // Persistência local imediata (0ms de latência)
      try {{
        localStorage.setItem('cockpit_aulas_assistidas', JSON.stringify([...aulasState.assistidas]));
      }} catch (e) {{}}

      renderizarCatalogoAulas();
      atualizarProgressoGeral();
      copiarToast(jaAssistida ? 'Aula marcada como pendente.' : 'Aula concluída com sucesso!');

      // Sincronização em segundo plano com o backend Render
      try {{
        cockpitRpc('cockpitAlternarAula', aulaId, !jaAssistida);
      }} catch (e) {{
        console.warn('[Cockpit Aulas] Erro ao sincronizar com backend:', e.message);
      }}
    }}

    function proximaAula() {{
      if (!aulasState.aulaAtiva) return;
      const idx = AULAS_FLASH_CATALOGO.findIndex(a => a.id === aulasState.aulaAtiva.id);
      if (idx !== -1 && idx < AULAS_FLASH_CATALOGO.length - 1) {{
        abrirAulaFlash(AULAS_FLASH_CATALOGO[idx + 1].id);
      }} else {{
        copiarToast('Você chegou à última aula do curso!');
      }}
    }}

    function aulaAnterior() {{
      if (!aulasState.aulaAtiva) return;
      const idx = AULAS_FLASH_CATALOGO.findIndex(a => a.id === aulasState.aulaAtiva.id);
      if (idx > 0) {{
        abrirAulaFlash(AULAS_FLASH_CATALOGO[idx - 1].id);
      }} else {{
        copiarToast('Esta é a primeira aula do curso.');
      }}
    }}
"""

    ponto_script = "  </script>\n</body>"
    if ponto_script not in html:
        print("[ERRO]: Tag de fechamento </script></body> não encontrada.")
        return

    html = html.replace(ponto_script, script_controlador + "\n  </script>\n</body>")
    print("✓ Módulo JavaScript controlador e dados integrados ao Cockpit.")

    COCKPIT_HTML_FILE.write_text(html, encoding="utf-8")
    print(f"✓ Arquivo atualizado com sucesso: {COCKPIT_HTML_FILE}")

if __name__ == "__main__":
    main()
