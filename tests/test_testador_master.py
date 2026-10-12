"""
Suíte de Testes Automatizados: Testador Master
Valida componentes do Crawler, Personas, Renderer TUI, Reporter e Driver Simulado.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from tooling.testador_master.personas import obter_catalogo_personas
from tooling.testador_master.crawler_engine import ScreenGraph, TelaNode
from tooling.testador_master.tui_renderer import TUIRenderer
from tooling.testador_master.reporter import MasterReporter
from tooling.testador_master.driver_simulado import DriverSimulado


class TestTestadorMaster(unittest.TestCase):
    def test_catalogo_personas_completo(self):
        personas = obter_catalogo_personas()
        self.assertEqual(len(personas), 5)
        self.assertIn("emergencista", personas)
        self.assertIn("r1_clinico", personas)
        self.assertIn("rotina_gestor", personas)
        self.assertIn("caotico_fuzzer", personas)
        self.assertIn("estudante_socratico", personas)

        for p_id, p in personas.items():
            self.assertTrue(len(p.nome) > 0)
            self.assertTrue(len(p.comandos_favoritos) > 0)
            self.assertTrue(len(p.palavras_chave_botoes) > 0)
            self.assertTrue(len(p.mensagens_teste) > 0)
            pensamento = p.gerar_pensamento("comando", "/pcr")
            self.assertIsInstance(pensamento, str)
            self.assertTrue(len(pensamento) > 5)

            # Valida gerador dinâmico de casos
            cmd_dinamico = p.gerar_comando_dinamico()
            self.assertIn("texto", cmd_dinamico)
            self.assertTrue(len(cmd_dinamico["texto"]) > 0)

    def test_screen_graph_e_decisoes(self):
        grafo = ScreenGraph()
        texto_tela = "⚡ Central de Comandos Beira-Leito\nEscolha uma opção:"
        botoes = [
            [{"text": "🚨 Sala Vermelha", "callback_data": "ux:hub:sala", "url": ""}],
            [{"text": "🛏️ Enfermaria", "callback_data": "ux:hub:enf", "url": ""}]
        ]

        node = grafo.registrar_tela(texto_tela, botoes)
        self.assertIsInstance(node, TelaNode)
        self.assertEqual(len(node.arestas_saindo), 2)
        self.assertIn("ux:hub:sala", node.arestas_saindo)

        personas = obter_catalogo_personas()
        emergencista = personas["emergencista"]

        # Como emergencista, deve priorizar a Sala Vermelha pelo score de palavras-chave
        acao = grafo.decidir_proxima_acao(emergencista, permitir_fuzzing=False)
        self.assertEqual(acao["tipo"], "clique")
        self.assertEqual(acao["callback_data"], "ux:hub:sala")

        # Testa breadcrumbs
        self.assertIn("Central de Comandos", grafo.obter_breadcrumbs_str())

    def test_screen_graph_persistencia(self):
        grafo = ScreenGraph()
        texto_tela = "⚡ Teste Persistência"
        botoes = [[{"text": "Botão A", "callback_data": "btn_a", "url": ""}]]
        grafo.registrar_tela(texto_tela, botoes)
        grafo.registrar_clique(grafo.tela_atual_id, "btn_a")

        arquivo_temp = ROOT_DIR / "data" / "temp_test_grafo.json"
        grafo.salvar_estado(arquivo_temp)
        self.assertTrue(arquivo_temp.exists())

        novo_grafo = ScreenGraph()
        carregou = novo_grafo.carregar_estado(arquivo_temp)
        self.assertTrue(carregou)
        self.assertEqual(len(novo_grafo.nodes), 1)
        self.assertIn("btn_a", novo_grafo.botoes_globais_clicados)

        arquivo_temp.unlink(missing_ok=True)

    def test_tui_renderer_formatacao_e_progresso(self):
        tui = TUIRenderer(largura_max=80)
        linhas = tui._quebrar_texto("Texto longo para teste de quebra automática em várias linhas", 20)
        self.assertTrue(len(linhas) > 1)
        for l in linhas:
            self.assertLessEqual(len(l), 20)

        barra = tui._gerar_barra_progresso(50.0, 10)
        self.assertIn("█", barra)
        self.assertIn("░", barra)

    def test_reporter_deteccao_problemas_e_markdown(self):
        md_file = ROOT_DIR / "data" / "temp_test_relatorio.md"
        json_file = ROOT_DIR / "data" / "temp_test_relatorio.json"

        reporter = MasterReporter(md_file, json_file)
        personas = obter_catalogo_personas()
        p = personas["emergencista"]

        # 1. Registra falha de dead-end
        reporter.registrar_evento(
            ciclo=1,
            persona=p,
            acao={"alvo_desc": "Tela Sem Botao", "tipo": "comando"},
            resposta={"ok": True, "mensagens": [{"texto": "Texto longo sem teclado inline e sem dica de volta" * 5, "buttons": []}]},
            tempo_ms=100
        )
        self.assertTrue(any("DEAD-END" in prob["categoria"] for prob in reporter.problemas))

        # 2. Registra falha de markdown desbalanceado
        reporter.registrar_evento(
            ciclo=2,
            persona=p,
            acao={"alvo_desc": "/teste_md", "tipo": "comando"},
            resposta={"ok": True, "mensagens": [{"texto": "*Texto com asterisco sem fechar", "buttons": []}]},
            tempo_ms=50
        )
        self.assertTrue(any("MARKDOWN" in prob["categoria"] for prob in reporter.problemas))

        # 3. Registra falha de salvaguarda clínica (peso <= 0)
        reporter.registrar_evento(
            ciclo=3,
            persona=p,
            acao={"alvo_desc": "/dva nora -5", "tipo": "comando"},
            resposta={"ok": True, "mensagens": [{"texto": "Dose calculada: 12 mL/h de noradrenalina em BIC.", "buttons": []}]},
            tempo_ms=50
        )
        self.assertTrue(any("SEGURANÇA CLÍNICA" in prob["categoria"] for prob in reporter.problemas))

        # Salva e limpa
        grafo = ScreenGraph()
        reporter.salvar_relatorios(grafo, total_ciclos=3)
        self.assertTrue(md_file.exists())
        self.assertTrue(json_file.exists())

        md_file.unlink(missing_ok=True)
        json_file.unlink(missing_ok=True)

    def test_driver_simulado_smoke(self):
        driver = DriverSimulado()
        iniciou = driver.inicializar()
        self.assertTrue(iniciou, "DriverSimulado deve inicializar node_bridge.js")

        try:
            resp = driver.enviar_mensagem("/menu")
            self.assertTrue(resp.get("ok"), "Envio de /menu deve ter ok=True")
            self.assertTrue(len(resp.get("mensagens", [])) > 0)
            self.assertIn("Central de Comandos", resp["mensagens"][0]["texto"])
            self.assertTrue(len(resp["mensagens"][0]["buttons"]) > 0)
        finally:
            driver.encerrar()


if __name__ == "__main__":
    unittest.main()
