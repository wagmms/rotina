#!/usr/bin/env python3
"""
Script de Atualização de Alta Engenharia do Player e Catálogo de Aulas Flash R1
Injeta os drive_ids reais (317/317 mapeados) e o novo Player Card Premium
com modo embutido (/preview com referrerpolicy="no-referrer"), botão de abertura
direta no Google Drive (/view), e painel de Pérolas Clínicas extraídas da transcrição.
"""

import json
from pathlib import Path

BASE_DIR = Path("/home/wagmoraes/Projetos IA/Rotina")
COCKPIT_HTML_FILE = BASE_DIR / "cockpit_movel.html"
DEPLOY_HTML_FILE = BASE_DIR / "gh_cockpit_deploy/index.html"
AULAS_JSON_FILE = BASE_DIR / "src/data/aulas_compactas.json"

NOVO_PLAYER_HTML = """      <!-- Player de Vídeo Embutido (Modo Cinema / Sticky) -->
      <div id="player-container" class="hidden glass-card rounded-2xl overflow-hidden border border-brand-500/40 shadow-2xl transition-all duration-300">
        <!-- Barra Superior: Área, Título e Botão Fechar -->
        <div class="bg-surface-900/95 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
          <div class="truncate flex items-center gap-2 min-w-0">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold shrink-0" id="player-area-badge">Área</span>
            <span class="text-xs font-bold text-white truncate" id="player-titulo-aula">Reproduzindo aula</span>
          </div>
          <button onclick="fecharPlayer()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0" title="Fechar player">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Frame do Player com Iframe e Fallback Elegante -->
        <div class="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          <iframe id="player-iframe" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="no-referrer"></iframe>
          <div id="player-placeholder" class="hidden absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 backdrop-blur-sm space-y-2">
            <div class="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <i data-lucide="play-circle" class="w-6 h-6"></i>
            </div>
            <p class="text-xs text-white font-bold px-4" id="player-placeholder-msg">Aula Flash Pronta</p>
            <p class="text-[10px] text-slate-400 max-w-xs">Caso seu navegador bloqueie a prévia embutida do Google Drive, toque abaixo para abrir no app nativo:</p>
            <a id="player-placeholder-link" href="#" target="_blank" rel="noopener noreferrer" class="text-xs px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold inline-flex items-center gap-1.5 transition shadow-lg shadow-brand-500/25">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Abrir Vídeo no Google Drive
            </a>
          </div>
        </div>

        <!-- Controles de Reprodução e Ações -->
        <div class="bg-surface-900/95 p-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-xs">
          <!-- Ações Primárias: Marcar Assistida e Abrir Nativo -->
          <div class="flex items-center gap-1.5">
            <button id="player-btn-assistida" onclick="alternarAulaAtivaAssistida()" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> <span id="player-btn-assistida-label">Marcar como Assistida</span>
            </button>
            <a id="player-link-drive-direto" href="#" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition" title="Assistir no Google Drive nativo (app ou aba externa)">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i> <span>Abrir no Drive</span>
            </a>
          </div>

          <!-- Navegação Entre Aulas -->
          <div class="flex items-center gap-1">
            <button onclick="aulaAnterior()" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]" title="Aula anterior">
              <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Anterior</span>
            </button>
            <button onclick="proximaAula()" class="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]" title="Próxima aula">
              <span class="hidden sm:inline">Próxima</span> <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Card de Pérolas Clínicas & Resumo da Aula -->
        <div id="player-resumo-card" class="bg-slate-950/70 p-3 border-t border-slate-800/80 space-y-1.5 text-xs">
          <div class="flex items-center justify-between text-[11px] text-brand-300 font-bold">
            <div class="flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-brand-400"></i>
              <span>Pérolas Clínicas & Resumo da Aula</span>
            </div>
            <span class="text-[10px] text-slate-500 font-normal truncate max-w-[200px]" id="player-modulo-label"></span>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed font-sans" id="player-resumo-texto">Selecione uma aula para carregar o resumo clínico.</p>
        </div>
      </div>"""

NOVA_LOGICA_PLAYER_JS = """    function abrirAulaFlash(aulaId) {
      hapticFeedback('medium');
      const aula = AULAS_FLASH_CATALOGO.find(a => a.id === aulaId);
      if (!aula) return;

      aulasState.aulaAtiva = aula;

      const playerContainer = document.getElementById('player-container');
      const iframe = document.getElementById('player-iframe');
      const placeholder = document.getElementById('player-placeholder');
      const tituloAulaEl = document.getElementById('player-titulo-aula');
      const areaBadgeEl = document.getElementById('player-area-badge');
      const resumoTextoEl = document.getElementById('player-resumo-texto');
      const moduloLabelEl = document.getElementById('player-modulo-label');
      const linkDireto = document.getElementById('player-link-drive-direto');
      const placeholderLink = document.getElementById('player-placeholder-link');

      if (tituloAulaEl) tituloAulaEl.textContent = aula.tit;
      if (areaBadgeEl) areaBadgeEl.textContent = aula.area.split(' ')[0];
      if (moduloLabelEl) moduloLabelEl.textContent = aula.mod;
      if (resumoTextoEl) resumoTextoEl.textContent = aula.res || 'Sem resumo cadastrado para esta aula.';
      if (playerContainer) playerContainer.classList.remove('hidden');

      // URLs oficiais do Google Drive para arquivo individual
      const drivePreviewUrl = aula.drive_id && aula.drive_id.length > 5
        ? `https://drive.google.com/file/d/${aula.drive_id}/preview` 
        : `https://drive.google.com/drive/folders/1ft5ewJehuQD1Ez3vrWNbNVEYr4Z0k0pn`;
      
      const driveViewUrl = aula.drive_id && aula.drive_id.length > 5
        ? `https://drive.google.com/file/d/${aula.drive_id}/view` 
        : `https://drive.google.com/drive/folders/1ft5ewJehuQD1Ez3vrWNbNVEYr4Z0k0pn`;

      if (linkDireto) linkDireto.href = driveViewUrl;
      if (placeholderLink) placeholderLink.href = driveViewUrl;

      // Reprodução no player embutido
      if (aula.drive_id && aula.drive_id.length > 5) {
        iframe.src = drivePreviewUrl;
        iframe.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
      } else {
        iframe.src = 'about:blank';
        iframe.classList.add('hidden');
        if (placeholder) {
          placeholder.classList.remove('hidden');
          document.getElementById('player-placeholder-msg').textContent = aula.tit;
        }
      }

      // Atualiza botão de assistida no player
      atualizarBotaoAssistidaPlayer(aula.id);

      // Re-renderiza para destacar a aula ativa no catálogo
      renderizarCatalogoAulas();

      // Rola suavemente até o player
      playerContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.lucide) lucide.createIcons();
    }

    function fecharPlayer() {
      hapticFeedback('light');
      const playerContainer = document.getElementById('player-container');
      const iframe = document.getElementById('player-iframe');
      if (iframe) iframe.src = 'about:blank';
      if (playerContainer) playerContainer.classList.add('hidden');
      aulasState.aulaAtiva = null;
      renderizarCatalogoAulas();
    }"""


def atualizar_arquivo(caminho_arquivo: Path, aulas_json_str: str):
    print(f"Atualizando {caminho_arquivo.name}...")
    conteudo = caminho_arquivo.read_text(encoding="utf-8")

    # 1. Substituir o bloco HTML do player-container
    import re
    # Encontrar <div id="player-container" ... </div> antes de <!-- Barra de Filtros por Pílulas
    padrao_player = r'(<div id="player-container"[\s\S]*?</div>\s*</div>\s*</div>)'
    match_player = re.search(r'<div id="player-container"[\s\S]*?</div>\s*</div>\s*</div>', conteudo)
    if not match_player:
        # tentar padrão alternativo: até <!-- Barra de Filtros
        match_player = re.search(r'<div id="player-container"[\s\S]*?(?=\s*<!-- Barra de Filtros)', conteudo)
    
    if match_player:
        trecho_antigo = match_player.group(0)
        conteudo = conteudo.replace(trecho_antigo, NOVO_PLAYER_HTML)
        print("  ✓ HTML do #player-container atualizado.")
    else:
        print("  [AVISO] Bloco #player-container não localizado por regex!")

    # 2. Atualizar const AULAS_FLASH_CATALOGO
    padrao_catalogo = r'const AULAS_FLASH_CATALOGO = \[[\s\S]*?\];'
    match_cat = re.search(padrao_catalogo, conteudo)
    if match_cat:
        novo_cat = f"const AULAS_FLASH_CATALOGO = {aulas_json_str};"
        conteudo = conteudo.replace(match_cat.group(0), novo_cat)
        print("  ✓ const AULAS_FLASH_CATALOGO atualizado com 317 drive_ids.")
    else:
        print("  [ERRO] const AULAS_FLASH_CATALOGO não encontrado!")

    # 3. Atualizar function abrirAulaFlash e fecharPlayer
    padrao_funcoes = r'function abrirAulaFlash\(aulaId\) \{[\s\S]*?function fecharPlayer\(\) \{[\s\S]*?renderizarCatalogoAulas\(\);\s*\}'
    match_func = re.search(padrao_funcoes, conteudo)
    if match_func:
        conteudo = conteudo.replace(match_func.group(0), NOVA_LOGICA_PLAYER_JS)
        print("  ✓ Funções abrirAulaFlash e fecharPlayer atualizadas.")
    else:
        print("  [AVISO] Funções abrirAulaFlash e fecharPlayer não localizadas por regex exata!")

    caminho_arquivo.write_text(conteudo, encoding="utf-8")
    print(f"  ✓ {caminho_arquivo.name} gravado com sucesso.")


def main():
    aulas_json_str = AULAS_JSON_FILE.read_text(encoding="utf-8")
    atualizar_arquivo(COCKPIT_HTML_FILE, aulas_json_str)
    atualizar_arquivo(DEPLOY_HTML_FILE, aulas_json_str)
    print("\nTodos os arquivos foram atualizados com sucesso!")


if __name__ == "__main__":
    main()
