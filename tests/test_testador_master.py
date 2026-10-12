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

import subprocess
from tooling.testador_master.personas import obter_catalogo_personas
from tooling.testador_master.crawler_engine import ScreenGraph, TelaNode
from tooling.testador_master.tui_renderer import TUIRenderer
from tooling.testador_master.reporter import MasterReporter
from tooling.testador_master.driver_simulado import DriverSimulado
from tooling.testador_master.multimodal_generator import MultimodalGenerator
from tooling.testador_master.repro_generator import BugReproGenerator
from tooling.testador_master.dashboard_generator import DashboardGenerator
from tooling.testador_master.math_oracle import MathOracle


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

    def test_multimodal_generator_e_envio_simulado(self):
        gen = MultimodalGenerator()
        personas = obter_catalogo_personas()
        emergencista = personas["emergencista"]

        # 1. Valida geração de áudio
        dados_audio = gen.gerar_audio_clinico("iam_sala_vermelha")
        self.assertIn("caminho", dados_audio)
        self.assertTrue(Path(dados_audio["caminho"]).exists(), "Arquivo de áudio gerado deve existir")
        self.assertIn("IAM", dados_audio["titulo"])

        # 2. Valida geração de imagem
        dados_img = gen.gerar_imagem_clinica("hemograma_leucocitose")
        self.assertIn("caminho", dados_img)
        self.assertTrue(Path(dados_img["caminho"]).exists(), "Arquivo de imagem gerado deve existir")
        self.assertIn("Hemograma", dados_img["titulo"])

        # 3. Valida decisão multimodal da persona
        acao_mm = emergencista.decidir_acao_multimodal()
        self.assertIsNotNone(acao_mm)
        self.assertIn(acao_mm["tipo"], ["audio", "imagem"])

        # 4. Valida envio multimodal no DriverSimulado
        driver = DriverSimulado()
        iniciou = driver.inicializar()
        self.assertTrue(iniciou, "DriverSimulado deve inicializar com sucesso")

        try:
            # Envio de áudio
            resp_audio = driver.enviar_audio(
                caminho_audio=str(dados_audio["caminho"]),
                caption=dados_audio["caption"]
            )
            self.assertTrue(resp_audio.get("ok"), "Envio de áudio deve retornar ok=True")
            self.assertTrue(len(resp_audio.get("mensagens", [])) > 0, "Áudio deve produzir mensagens de resposta")

            # Envio de foto
            resp_foto = driver.enviar_imagem(
                caminho_imagem=str(dados_img["caminho"]),
                caption=dados_img["caption"]
            )
            self.assertTrue(resp_foto.get("ok"), "Envio de imagem deve retornar ok=True")
            self.assertTrue(len(resp_foto.get("mensagens", [])) > 0, "Imagem deve produzir mensagens de resposta")
        finally:
            driver.encerrar()

    def test_bug_repro_generator_e_execucao_node(self):
        temp_repro_dir = ROOT_DIR / "data" / "temp_repros"
        temp_repro_dir.mkdir(parents=True, exist_ok=True)

        try:
            generator = BugReproGenerator(repro_dir=temp_repro_dir)
            problema = {
                "id": "ISSUE-042",
                "categoria": "🚨 VAZAMENTO TÉCNICO",
                "gravidade": "ALTA",
                "acao": "/menu",
                "descricao": "Vazamento técnico simulado para teste de regressão",
                "sugestao": "Sanitizar saída do menu",
                "timestamp": "2026-10-11T23:00:00"
            }
            acao = {"tipo": "comando", "texto": "/menu", "alvo_desc": "/menu"}
            resposta = {"ok": True, "mensagens": [{"texto": "Menu beira-leito sem erro", "buttons": []}]}

            dados_repro = generator.gerar_script_reproducao(problema, acao, resposta)
            self.assertIsNotNone(dados_repro)
            self.assertIn("arquivo", dados_repro)
            self.assertIn("comando", dados_repro)
            self.assertTrue(Path(dados_repro["arquivo"]).exists(), "Script .cjs deve ser gerado no disco")

            # Valida execução real do script gerado via Node.js
            # Como /menu não contém 'undefined', o teste deve passar com exit code 0
            res = subprocess.run(
                ["node", str(dados_repro["arquivo"])],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=str(ROOT_DIR)
            )
            self.assertEqual(res.returncode, 0, f"Script de reprodução deve passar quando o bug não ocorre: {res.stderr}")
            self.assertIn("SUCESSO", res.stdout)

            # Valida integração com o MasterReporter
            md_file = ROOT_DIR / "data" / "temp_repro_relatorio.md"
            json_file = ROOT_DIR / "data" / "temp_repro_relatorio.json"
            reporter = MasterReporter(md_file, json_file, repro_dir=temp_repro_dir, gerar_repros=True)
            personas = obter_catalogo_personas()
            p = personas["caotico_fuzzer"]

            reporter.registrar_evento(
                ciclo=1,
                persona=p,
                acao={"alvo_desc": "/teste_vazamento", "tipo": "comando", "texto": "/teste_vazamento"},
                resposta={"ok": True, "mensagens": [{"texto": "Resultado: undefined valor", "buttons": []}]},
                tempo_ms=30
            )

            # Confirma que a issue foi registrada e o script foi criado
            prob_vazamento = next((pr for pr in reporter.problemas if "VAZAMENTO" in pr["categoria"]), None)
            self.assertIsNotNone(prob_vazamento)
            self.assertIn("repro_script", prob_vazamento)
            self.assertTrue(Path(ROOT_DIR / prob_vazamento["repro_script"]).exists())

            # Limpa relatórios temporários
            md_file.unlink(missing_ok=True)
            json_file.unlink(missing_ok=True)

        finally:
            # Limpa pasta temporária
            for f in temp_repro_dir.glob("*.cjs"):
                f.unlink(missing_ok=True)
            if temp_repro_dir.exists():
                temp_repro_dir.rmdir()

    def test_dashboard_generator_e_html_valido(self):
        temp_html = ROOT_DIR / "data" / "temp_dashboard_teste.html"

        try:
            generator = DashboardGenerator(output_html=temp_html)
            dados_grafo = {
                "nodes": {
                    "tela_1": {
                        "id": "tela_1",
                        "titulo": "⚡ Central de Comandos",
                        "texto": "Texto principal do menu",
                        "botoes": [[{"text": "🚨 Sala Vermelha", "callback_data": "btn_sala", "url": ""}]],
                        "visitas": 2,
                        "arestas_saindo": {
                            "btn_sala": {"text": "🚨 Sala Vermelha", "destino": "tela_2", "cliques": 1}
                        }
                    },
                    "tela_2": {
                        "id": "tela_2",
                        "titulo": "🚨 Sala Vermelha",
                        "texto": "Drogas e Choque",
                        "botoes": [],
                        "visitas": 1,
                        "arestas_saindo": {}
                    }
                },
                "botoes_clicados": ["btn_sala"],
                "dead_ends": ["tela_2"],
                "tela_atual_id": "tela_2"
            }
            dados_relatorio = {
                "meta": {
                    "total_ciclos": 5,
                    "cobertura_estimada_pct": 25.0,
                    "latencia_media_ms": 120.0,
                    "scripts_reproducao_gerados": 1
                },
                "problemas": [
                    {
                        "id": "ISSUE-001",
                        "categoria": "⚠️ UX DEAD-END",
                        "gravidade": "MÉDIA",
                        "acao": "btn_sala",
                        "descricao": "Tela sem botões",
                        "sugestao": "Adicionar botão voltar",
                        "repro_script": "tests/repros/repro_issue_001.cjs",
                        "repro_cmd": "node tests/repros/repro_issue_001.cjs"
                    }
                ]
            }

            caminho_gerado = generator.gerar_dashboard(dados_grafo, dados_relatorio)
            self.assertTrue(caminho_gerado.exists(), "O arquivo HTML deve ser criado no disco")
            self.assertGreater(caminho_gerado.stat().st_size, 5000, "Dashboard HTML deve ter conteúdo rico")

            conteudo = caminho_gerado.read_text(encoding="utf-8")
            self.assertIn("<!DOCTYPE html>", conteudo)
            self.assertIn("vis-network", conteudo)
            self.assertIn("Central de Comandos", conteudo)
            self.assertIn("graph-canvas", conteudo)
            self.assertIn("metric-deadends", conteudo)
            self.assertIn("repro_issue_001.cjs", conteudo)

        finally:
            temp_html.unlink(missing_ok=True)

    def test_math_oracle_formulas_puras(self):
        oracle = MathOracle()

        # Cockcroft-Gault
        cg_m = oracle.calcular_cockcroft_gault(idade=60, peso=70.0, cr=1.0, eh_feminino=False)
        self.assertEqual(cg_m["crcl"], 77.8)
        self.assertEqual(cg_m["estagio"], "G2")

        cg_f = oracle.calcular_cockcroft_gault(idade=60, peso=70.0, cr=1.0, eh_feminino=True)
        self.assertEqual(cg_f["crcl"], 66.1)

        # Cockcroft com Obeso e Altura (Usa Peso Ajustado)
        cg_obeso = oracle.calcular_cockcroft_gault(idade=50, peso=120.0, cr=1.0, eh_feminino=False, altura_cm=170.0)
        self.assertIn("ajustado", cg_obeso["tipo_peso"])
        self.assertLess(cg_obeso["peso_usado"], 120.0)

        # CKD-EPI 2021 (race-free)
        ckd_h = oracle.calcular_ckd_epi_2021(cr=1.0, idade=60, eh_feminino=False)
        self.assertAlmostEqual(ckd_h["tfg"], 86.2, delta=2.0)

        # Schwartz Pediátrico
        schw = oracle.calcular_schwartz_pediatrico(cr=0.8, altura_cm=120.0)
        self.assertAlmostEqual(schw["tfg"], 61.95, delta=1.0)

        # Winter
        w = oracle.calcular_winter(hco3=12.0)
        self.assertEqual(w["pco2_esperada"], 26.0)
        self.assertEqual(w["minimo"], 24.0)
        self.assertEqual(w["maximo"], 28.0)

        # Gasometria Completa (CAD / Choque Séptico)
        gaso = oracle.calcular_gasometria_completa(
            ph=7.20, pco2=23.0, hco3=10.0, na=140.0, cl=105.0, albumina=4.0, pao2=80.0, fio2=21.0
        )
        self.assertEqual(gaso["disturbio_primario"], "Acidose Metabólica")
        self.assertEqual(gaso["anion_gap"], 25.0)
        self.assertEqual(gaso["anion_gap_corrigido"], 25.0)
        self.assertAlmostEqual(gaso["delta_ratio"], 0.93, delta=0.05)
        self.assertTrue(gaso["compensacao_adequada"])

        # Gap Osmolar
        gap = oracle.calcular_gap_osmolar(osm_medida=315.0, na=140.0, glicose=90.0, ureia=30.0)
        self.assertAlmostEqual(gap["osmolaridade_calculada"], 290.0, delta=1.0)
        self.assertAlmostEqual(gap["gap_osmolar"], 25.0, delta=1.0)
        self.assertTrue(gap["elevado"])

        # Sequência Rápida de Intubação (SRI)
        sri = oracle.calcular_sri(peso=70.0)
        self.assertEqual(sri["etomidato_mg"], 21.0)
        self.assertEqual(sri["etomidato_ml"], 10.5)
        self.assertEqual(sri["succinilcolina_mg"], 105.0)

        # CURB-65
        curb = oracle.calcular_curb65(confusao=True, ureia=60.0, fr=32, pas=85, pad=50, idade=71)
        self.assertEqual(curb["pontos"], 5)
        self.assertIn("Alto Risco", curb["gravidade"])

        # Glasgow-P
        gcs = oracle.calcular_glasgow_p(ocular=4, verbal=5, motora=6, pupilas_arreativas=2)
        self.assertEqual(gcs["gcs_p"], 13)

        # DVA Nora
        dva_nora = oracle.calcular_dva("nora", peso=70.0)
        self.assertEqual(dva_nora["vazao_ml_h"], 6.6)

        # Holliday-Segar
        hs = oracle.calcular_holliday_segar(peso=12.0)
        self.assertEqual(hs["volume_24h"], 1100.0)
        self.assertEqual(hs["vazao_ml_h"], 44.0)

        hs_bva = oracle.calcular_holliday_segar(peso=10.0, condicao="bronquiolite")
        self.assertEqual(hs_bva["volume_24h"], 700.0)

        # Parkland
        pk = oracle.calcular_parkland(peso=70.0, scq=20.0)
        self.assertEqual(pk["volume_24h"], 5600.0)
        self.assertEqual(pk["volume_primeiras_8h"], 2800.0)

        # Cálcio Corrigido
        ca = oracle.calcular_calcio_corrigido(calcio_total=7.5, albumina=2.5)
        self.assertEqual(ca["calcio_corrigido"], 8.7)

    def test_math_oracle_auditoria_interacoes(self):
        oracle = MathOracle()

        # 1. Cockcroft aprovado
        resp_crcl_ok = "*Clearance Estimado:* 77.8 mL/min (Estágio 2)\n\n✅ Nenhuma restrição"
        aud_crcl_ok = oracle.auditar_interacao("/crcl 60 70 1.0 masc", resp_crcl_ok)
        self.assertIsNotNone(aud_crcl_ok)
        self.assertTrue(aud_crcl_ok["aprovado"])
        self.assertEqual(aud_crcl_ok["esperado"], 77.8)

        # 2. Cockcroft reprovado por divergência matemática
        resp_crcl_err = "*Clearance Estimado:* 52.4 mL/min (Estágio 3)\n\n⚠️ Divergência"
        aud_crcl_err = oracle.auditar_interacao("/crcl 60 70 1.0 masc", resp_crcl_err)
        self.assertIsNotNone(aud_crcl_err)
        self.assertFalse(aud_crcl_err["aprovado"])
        self.assertGreater(aud_crcl_err["erro_absoluto"], 10.0)

        # 3. Winter aprovado
        resp_w_ok = "• *PaCO₂ esperada:* 26.0 mmHg\n• *Faixa de compensação esperada:* 24 a 28 mmHg"
        aud_w_ok = oracle.auditar_interacao("/winter 12", resp_w_ok)
        self.assertIsNotNone(aud_w_ok)
        self.assertTrue(aud_w_ok["aprovado"])

        # 4. Parâmetros insuficientes tratados defensivamente
        resp_falta = "❌ Falta informação! Preciso de Idade, Peso e Creatinina."
        aud_falta = oracle.auditar_interacao("/crcl 60", resp_falta)
        self.assertIsNotNone(aud_falta)
        self.assertTrue(aud_falta["aprovado"])

    def test_master_reporter_com_math_oracle(self):
        temp_dir = ROOT_DIR / "data" / "temp_reporter_math"
        temp_dir.mkdir(parents=True, exist_ok=True)
        md_file = temp_dir / "relatorio.md"
        json_file = temp_dir / "relatorio.json"
        repro_dir = temp_dir / "repros"

        try:
            reporter = MasterReporter(
                output_md=md_file,
                output_json=json_file,
                repro_dir=repro_dir,
                gerar_repros=True
            )

            personas = obter_catalogo_personas()
            r1 = personas["r1_clinico"]

            # Evento 1: Cálculo correto de Cockcroft
            acao_ok = {"tipo": "comando", "alvo_desc": "/crcl 60 70 1.0 masc", "texto": "/crcl 60 70 1.0 masc"}
            resp_ok = {
                "ok": True,
                "mensagens": [{"texto": "*Clearance Estimado:* 77.8 mL/min (Estágio 2)\n\n✅ Nenhuma restrição"}]
            }
            reporter.registrar_evento(ciclo=1, persona=r1, acao=acao_ok, resposta=resp_ok, tempo_ms=120)

            self.assertEqual(len(reporter.auditorias_matematicas), 1)
            self.assertTrue(reporter.auditorias_matematicas[0]["aprovado"])
            self.assertEqual(len(reporter.problemas), 0)

            # Evento 2: Cálculo com discrepância matemática
            acao_bug = {"tipo": "comando", "alvo_desc": "/crcl 60 70 1.0 masc", "texto": "/crcl 60 70 1.0 masc"}
            resp_bug = {
                "ok": True,
                "mensagens": [{"texto": "*Clearance Estimado:* 35.0 mL/min (Estágio 3b)\n\n⚠️ Erro de cálculo"}]
            }
            reporter.registrar_evento(ciclo=2, persona=r1, acao=acao_bug, resposta=resp_bug, tempo_ms=130)

            self.assertEqual(len(reporter.auditorias_matematicas), 2)
            self.assertFalse(reporter.auditorias_matematicas[1]["aprovado"])
            
            # Certifica que o problema de DISCREPÂNCIA MATEMÁTICA foi registrado
            probs = [p for p in reporter.problemas if p["categoria"] == "🚨 DISCREPÂNCIA MATEMÁTICA"]
            self.assertEqual(len(probs), 1)
            self.assertEqual(probs[0]["gravidade"], "ALTA")
            self.assertIn("Cockcroft-Gault", probs[0]["descricao"])

            # Certifica que gerou script de reprodução automatizado
            self.assertIsNotNone(probs[0].get("repro_script"))
            repro_path = Path(probs[0]["repro_script"])
            self.assertTrue(repro_path.exists())

            # Testa compilação de relatórios com seção matemática
            grafo = ScreenGraph()
            grafo.registrar_tela("Tela Teste", [])
            reporter.salvar_relatorios(grafo, total_ciclos=2)

            self.assertTrue(md_file.exists())
            self.assertTrue(json_file.exists())

            conteudo_md = md_file.read_text(encoding="utf-8")
            self.assertIn("Fórmulas Clínicas auditadas pelo Oráculo Matemático", conteudo_md)
            self.assertIn("Auditoria Matemática de Fórmulas Clínicas", conteudo_md)
            self.assertIn("Cockcroft-Gault", conteudo_md)

        finally:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()


