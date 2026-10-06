import json
import subprocess
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def test_catalogo_aulas_flash_integridade():
    """Valida se o catálogo de aulas flash foi compilado com exatidão matemática e sem vazios."""
    json_path = BASE_DIR / "src/data/aulas_compactas.json"
    assert json_path.exists(), "src/data/aulas_compactas.json não foi encontrado."
    
    aulas = json.loads(json_path.read_text(encoding="utf-8"))
    assert len(aulas) == 317, f"Esperado 317 aulas flash, encontrado {len(aulas)}"
    
    areas_esperadas = {
        "Cirurgia Geral",
        "Clínica Médica",
        "Ginecologia e Obstetrícia",
        "Pediatria",
        "Medicina Preventiva e Social"
    }
    
    areas_encontradas = set(a["area"] for a in aulas)
    assert areas_encontradas == areas_esperadas, f"Divergência nas grandes áreas: {areas_encontradas ^ areas_esperadas}"
    
    for a in aulas:
        assert a.get("id"), "Aula sem ID"
        assert a.get("tit"), "Aula sem título"
        assert a.get("mod"), "Aula sem módulo"
        assert a.get("area"), "Aula sem área"
        assert len(a["tit"]) > 5, f"Título muito curto: {a['tit']}"

def test_cockpit_html_aba_aulas():
    """Valida que o HTML do Cockpit possui a aba tab-aulas e a navegação correta de 7 colunas."""
    html_path = BASE_DIR / "cockpit_movel.html"
    assert html_path.exists(), "cockpit_movel.html não encontrado."
    
    content = html_path.read_text(encoding="utf-8")
    assert 'id="tab-aulas"' in content, "Aba tab-aulas não encontrada no HTML."
    assert "grid-cols-7" in content, "Barra de navegação inferior não atualizada para 7 itens."
    assert "data-tab=\"tab-aulas\"" in content, "Botão de navegação para tab-aulas ausente."
    assert "carregarAulas()" in content, "Chamada carregarAulas() ausente em navegarAba."
    assert "AULAS_FLASH_CATALOGO" in content, "Catálogo embutido ausente no script do cockpit."
    assert 'id="player-container"' in content, "Player container de vídeo ausente."
    assert 'id="busca-aulas-input"' in content, "Campo de busca instantânea ausente."

def test_server_fastify_e_runtime_aulas():
    """Valida que o backend Node.js Fastify e o runtime possuem suporte ao módulo de aulas."""
    script_check = """
    const { buildServer } = require('./server/index.js');
    const runtime = require('./server/runtime.js');
    
    async function test() {
      // 1. Testa build do servidor Fastify
      const server = await buildServer();
      
      // 2. Testa despacho de cockpitRpc para métodos de aulas
      if (typeof runtime.ctx.cockpitAulasProgresso !== 'function') {
        throw new Error('cockpitAulasProgresso não é função no contexto');
      }
      if (typeof runtime.ctx.cockpitAlternarAula !== 'function') {
        throw new Error('cockpitAlternarAula não é função no contexto');
      }
      
      // Testa endpoint de status
      const resAulas = await server.inject({
        method: 'GET',
        url: '/api/aulas-flash'
      });
      if (resAulas.statusCode !== 200) {
        throw new Error('Endpoint /api/aulas-flash retornou status ' + resAulas.statusCode);
      }
      const data = JSON.parse(resAulas.payload);
      if (!data.ok || data.total !== 317) {
        throw new Error('Endpoint /api/aulas-flash não retornou 317 aulas. Retornou: ' + data.total);
      }
      
      console.log('OK');
    }
    test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
    """
    
    res = subprocess.run(["node", "-e", script_check], cwd=str(BASE_DIR), capture_output=True, text=True)
    assert res.returncode == 0, f"Falha no teste do servidor Node Fastify:\n{res.stderr}"
