#!/usr/bin/env python3
"""
==============================================================================
ULTRA ROTINA · TESTADOR MASTER (MASTER TESTER E2E AUTÔNOMO)
==============================================================================
Robô testador de alta fidelidade para o Telegram Bot @wagner_rotina_bot.
Simula médicos reais usando o bot pela tela do terminal, explorando menus,
clicando em botões inline, testando calculadoras e gerando relatório vivo de sugestões.
==============================================================================
"""

import os
import sys
import time
import random
import argparse
import signal
from pathlib import Path
from datetime import datetime

# Garante que o diretório raiz está no PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from tooling.testador_master.personas import obter_catalogo_personas
from tooling.testador_master.tui_renderer import TUIRenderer
from tooling.testador_master.crawler_engine import ScreenGraph
from tooling.testador_master.reporter import MasterReporter
from tooling.testador_master.driver_simulado import DriverSimulado
from tooling.testador_master.driver_telethon import DriverTelethon
from tooling.testador_master.multimodal_generator import MultimodalGenerator


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Ultra Rotina · Testador Master para Telegram Bot",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--mode",
        choices=["auto", "live", "simulado"],
        default="auto",
        help=(
            "Modo de execução:\n"
            "  auto      : Tenta Telethon ao vivo; se não logado, oferece fallback simulado\n"
            "  live      : Conecta no Telegram real via Telethon como @wagner_rotina_bot\n"
            "  simulado  : Executa diretamente no runtime local Node.js (ultrarrápido, offline)"
        )
    )
    parser.add_argument(
        "--persona",
        choices=["emergencista", "r1_clinico", "rotina_gestor", "caotico_fuzzer", "estudante_socratico", "todas"],
        default="todas",
        help="Personalidade médica a simular (padrão: 'todas', alternando dinamicamente)"
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=30,
        help="Quantidade de ciclos/ações a executar (0 para rodar indefinidamente)"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=0,
        help="Tempo máximo de execução em minutos (0 para sem limite de tempo)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.8,
        help="Tempo de espera humano entre ações em segundos (padrão: 1.8s)"
    )
    parser.add_argument(
        "--multimodal-prob",
        type=float,
        default=0.15,
        help="Probabilidade de uma persona disparar envio de nota de voz ou foto de exame (padrão: 0.15)"
    )
    parser.add_argument(
        "--login",
        action="store_true",
        help="Inicia assistente de autenticação interativa com o Telegram via Telethon"
    )
    parser.add_argument(
        "--no-clear",
        action="store_true",
        help="Não limpa a tela do terminal a cada turno (mantém histórico contínuo)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Retoma exploração a partir do grafo de telas salvo em disco"
    )
    parser.add_argument(
        "--graph-path",
        type=str,
        default=str(ROOT_DIR / "data" / "testador_master_grafo.json"),
        help="Caminho do arquivo de persistência do grafo de telas"
    )
    parser.add_argument(
        "--output-md",
        type=str,
        default=str(ROOT_DIR / "docs" / "RELATORIO_TESTADOR_MASTER.md"),
        help="Caminho para salvar o relatório de auditoria e sugestões em Markdown"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default=str(ROOT_DIR / "data" / "testador_master_relatorio.json"),
        help="Caminho para salvar os dados brutos e histórico em JSON"
    )
    parser.add_argument(
        "--repro-dir",
        type=str,
        default=str(ROOT_DIR / "tests" / "repros"),
        help="Caminho do diretório para salvar scripts de reprodução (.cjs) de bugs"
    )
    parser.add_argument(
        "--no-repro",
        action="store_true",
        help="Desativa a geração automática de scripts de reprodução isolados"
    )
    return parser


def main():
    parser = criar_argument_parser()
    args = parser.parse_args()

    # 1. Se solicitado comando de login interativo
    if args.login:
        driver_tel = DriverTelethon()
        ok = driver_tel.autenticar_interativo()
        sys.exit(0 if ok else 1)

    print("\n" + "=" * 70)
    print("🚀 INICIALIZANDO ULTRA ROTINA · TESTADOR MASTER")
    print("=" * 70)

    # 2. Inicialização do Driver
    driver = None
    modo_ativo = args.mode

    if args.mode in ["live", "auto"]:
        print("📡 Conectando ao Telegram Client (Telethon)...")
        driver_live = DriverTelethon()
        if driver_live.inicializar():
            driver = driver_live
            modo_ativo = "live"
            print("✅ Conectado com sucesso ao Telegram como usuário real!")
        else:
            if args.mode == "live":
                print("❌ Falha na conexão Telethon. Execute com --login para autorizar a conta.")
                sys.exit(1)
            else:
                print("⚠️ Telethon não autorizado. Alternando automaticamente para o modo 'simulado' (Node Runtime Bridge)...")
                driver_sim = DriverSimulado()
                if driver_sim.inicializar():
                    driver = driver_sim
                    modo_ativo = "simulado"
                    print("✅ Conectado ao runtime oficial Ultra Rotina (77 módulos) em RAM!")
                else:
                    print("❌ Falha ao inicializar o motor local.")
                    sys.exit(1)
    else:
        print("💻 Inicializando motor local (Driver Simulado)...")
        driver_sim = DriverSimulado()
        if driver_sim.inicializar():
            driver = driver_sim
            modo_ativo = "simulado"
            print("✅ Conectado ao runtime oficial Ultra Rotina (77 módulos) em RAM!")
        else:
            print("❌ Falha ao inicializar o motor local.")
            sys.exit(1)

    # 3. Preparação dos subsistemas
    tui = TUIRenderer()
    grafo = ScreenGraph()
    grafo_path = Path(args.graph_path)

    if args.resume and grafo_path.exists():
        if grafo.carregar_estado(grafo_path):
            print(f"🔄 Retomando exploração do grafo prévio ({len(grafo.nodes)} telas, {len(grafo.botoes_globais_clicados)} botões já testados)!")

    reporter = MasterReporter(
        output_md=Path(args.output_md),
        output_json=Path(args.output_json),
        repro_dir=Path(args.repro_dir),
        gerar_repros=not args.no_repro
    )

    if args.resume and Path(args.output_json).exists():
        if reporter.carregar_estado(Path(args.output_json)):
            print(f"🔄 Retomando backlog prévio de {len(reporter.problemas)} anomalias/issues auditadas!")
    catalogo_personas = obter_catalogo_personas()
    multimodal_gen = MultimodalGenerator()

    lista_personas = (
        list(catalogo_personas.values())
        if args.persona == "todas"
        else [catalogo_personas[args.persona]]
    )

    interrompido = False

    def handle_sigint(sig, frame):
        nonlocal interrompido
        print("\n\n🛑 [INTERRUPÇÃO SOLICITADA] Finalizando ciclo com segurança e salvando relatórios...")
        interrompido = True

    signal.signal(signal.SIGINT, handle_sigint)

    # 4. Início da exploração: envia comando inicial para abrir a tela
    print("\nIniciando sessão do usuário... Enviando /menu inicial.")
    resp_inicial = driver.enviar_mensagem("/menu")
    if resp_inicial.get("ok") and resp_inicial.get("mensagens"):
        msg = resp_inicial["mensagens"][0]
        grafo.registrar_tela(msg.get("texto", ""), msg.get("buttons", []))
        grafo.registrar_comando("/menu")

    ciclo = 0
    inicio_tempo = time.time()
    limite_tempo_seg = args.duration * 60 if args.duration > 0 else 0

    try:
        while not interrompido:
            ciclo += 1

            # Checa limite de ciclos
            if args.cycles > 0 and ciclo > args.cycles:
                print(f"\n🎯 Limite de {args.cycles} ciclos atingido com sucesso!")
                break

            # Checa limite de tempo
            if limite_tempo_seg > 0 and (time.time() - inicio_tempo) > limite_tempo_seg:
                print(f"\n⏱️ Limite de tempo de {args.duration} minutos atingido!")
                break

            # Seleciona persona para este ciclo
            persona_atual = lista_personas[(ciclo - 1) % len(lista_personas)]

            # Decide cirurgicamente a próxima ação: avalia ação multimodal ou grafo
            acao = None
            if random.random() < args.multimodal_prob:
                acao_mm = persona_atual.decidir_acao_multimodal()
                if acao_mm:
                    tipo_mm = acao_mm.get("tipo")
                    subtipo = acao_mm.get("subtipo", "aleatorio")
                    caption_mm = acao_mm.get("caption", "")

                    if tipo_mm == "audio":
                        dados_midia = multimodal_gen.gerar_audio_clinico(subtipo)
                        acao = {
                            "tipo": "audio",
                            "caminho": str(dados_midia["caminho"]),
                            "caption": caption_mm or dados_midia.get("caption", ""),
                            "titulo": dados_midia.get("titulo", "Nota de Voz"),
                            "texto": f"🎙️ [Nota de Voz: {dados_midia.get('titulo')}] - \"{dados_midia.get('texto_falado')}\"",
                            "alvo_desc": dados_midia.get("titulo", "Nota de Voz"),
                            "pensamento": persona_atual.gerar_pensamento("audio", dados_midia.get("titulo", "áudio de voz"))
                        }
                    elif tipo_mm == "imagem":
                        dados_midia = multimodal_gen.gerar_imagem_clinica(subtipo)
                        acao = {
                            "tipo": "imagem",
                            "caminho": str(dados_midia["caminho"]),
                            "caption": caption_mm or dados_midia.get("caption", ""),
                            "titulo": dados_midia.get("titulo", "Exame Clínico"),
                            "texto": f"🖼️ [Exame Clínico: {dados_midia.get('titulo')}] {('(' + caption_mm + ')') if caption_mm else ''}",
                            "alvo_desc": dados_midia.get("titulo", "Exame Clínico"),
                            "pensamento": persona_atual.gerar_pensamento("imagem", dados_midia.get("titulo", "exame de imagem"))
                        }

            if not acao:
                acao = grafo.decidir_proxima_acao(persona_atual)

            # Métricas para o HUD
            tempos_registrados = [e["tempo_ms"] for e in reporter.eventos if e["tempo_ms"] > 0]
            lat_med = (sum(tempos_registrados) / len(tempos_registrados)) if tempos_registrados else 0.0

            if not args.no_clear:
                tui.limpar_tela()

            # Renderiza cabeçalho com telemetria viva e breadcrumbs
            tui.renderizar_cabecalho(
                persona=persona_atual,
                ciclo_atual=ciclo,
                ciclos_total=args.cycles if args.cycles > 0 else None,
                modo=modo_ativo,
                cobertura_pct=grafo.obter_cobertura_pct(),
                telas_contagem=len(grafo.nodes),
                botoes_clicados=len(grafo.botoes_globais_clicados),
                falhas_contagem=len([p for p in reporter.problemas if p["gravidade"] == "ALTA"]),
                latencia_media_ms=lat_med,
                breadcrumbs=grafo.obter_breadcrumbs_str()
            )

            # Exibe o raciocínio da persona
            tui.renderizar_pensamento_persona(persona_atual, acao.get("pensamento", ""))

            # Exibe o balão do usuário simulado com badge correspondente
            eh_clique = acao.get("tipo") in ["clique", "backtrack"]
            eh_audio = acao.get("tipo") == "audio"
            eh_imagem = acao.get("tipo") == "imagem"

            texto_usuario = (
                f"[Clique no botão: {acao.get('rotulo')}]"
                if eh_clique
                else acao.get("texto", "")
            )
            tui.renderizar_mensagem_usuario(
                texto_usuario,
                persona_atual,
                tipo_acao=acao.get("tipo", "comando")
            )

            # Executa a ação pelo driver
            tui.renderizar_acao_em_progresso("Aguardando resposta do Telegram Bot")
            inicio_acao = time.time()

            if eh_clique:
                resp = driver.clicar_botao(
                    callback_data=acao.get("callback_data", ""),
                    rotulo=acao.get("rotulo", "")
                )
                grafo.registrar_clique(acao.get("tela_id", ""), acao.get("chave", ""))
            elif eh_audio:
                resp = driver.enviar_audio(
                    caminho_audio=acao.get("caminho", ""),
                    caption=acao.get("caption", "")
                )
                grafo.registrar_comando(f"[audio:{acao.get('alvo_desc')}]")
            elif eh_imagem:
                resp = driver.enviar_imagem(
                    caminho_imagem=acao.get("caminho", ""),
                    caption=acao.get("caption", "")
                )
                grafo.registrar_comando(f"[imagem:{acao.get('alvo_desc')}]")
            else:
                resp = driver.enviar_mensagem(acao.get("texto", ""))
                grafo.registrar_comando(acao.get("texto", ""))

            tui.limpar_linha_status()
            tempo_ms = resp.get("tempo_ms", int((time.time() - inicio_acao) * 1000))

            # Registra evento na auditoria
            try:
                reporter.registrar_evento(ciclo, persona_atual, acao, resp, tempo_ms)
            except Exception as e:
                print(f"\033[33m⚠️ [AVISO] Falha ao registrar evento no reporter (Ciclo {ciclo}): {e}\033[0m")
            grafo.historico_acoes.append(acao)

            # Renderiza resposta do bot
            if resp.get("ok") and resp.get("mensagens"):
                for m in resp["mensagens"]:
                    tui.renderizar_resposta_bot(
                        texto_bot=m.get("texto", ""),
                        botoes=m.get("buttons", []),
                        tempo_ms=tempo_ms,
                        tipo=m.get("tipo", "texto")
                    )
                    grafo.registrar_tela(m.get("texto", ""), m.get("buttons", []))
            else:
                erro_txt = resp.get("erro", "Bot não respondeu dentro do tempo limite.")
                print(f"\033[31m❌ [FALHA] {erro_txt} ({tempo_ms}ms)\033[0m\n")

            # Salva relatórios e grafo periodicamente
            if ciclo % 5 == 0:
                reporter.salvar_relatorios(grafo, ciclo, em_execucao=True)
                grafo.salvar_estado(grafo_path)

            # Delay humano configurável antes da próxima ação
            if args.delay > 0 and not interrompido:
                time.sleep(args.delay)

    finally:
        # Encerramento limpo e emissão do relatório final
        print("\n💾 Salvando relatório final e estado do grafo...")
        try:
            reporter.salvar_relatorios(grafo, ciclo, em_execucao=False, motivo="Sessão cancelada ou concluída")
        except Exception as e:
            print(f"⚠️ Falha ao salvar relatórios: {e}")
        try:
            grafo.salvar_estado(grafo_path)
        except Exception as e:
            print(f"⚠️ Falha ao salvar estado do grafo: {e}")

        # Compilação automática do Dashboard Visual Interativo
        try:
            from tooling.testador_master.dashboard_generator import DashboardGenerator
            dash_gen = DashboardGenerator()
            dash_gen.gerar_dashboard()
        except Exception as e:
            print(f"⚠️ Falha ao gerar dashboard visual: {e}")

        if driver:
            try:
                driver.encerrar()
            except Exception:
                pass

        print("\n" + "=" * 70)
        print("📊 RESUMO FINAL DA AUDITORIA DO TESTADOR MASTER:")
        print("=" * 70)
        print(f"• Ciclos executados: {ciclo}")
        print(f"• Telas únicas mapeadas: {len(grafo.nodes)}")
        print(f"• Botões inline testados: {len(grafo.botoes_globais_clicados)}")
        print(f"• Cobertura estimada: {grafo.obter_cobertura_pct():.1f}%")
        print(f"• Problemas identificados: {len(reporter.problemas)}")
        total_repros = sum(1 for p in reporter.problemas if p.get("repro_script"))
        if total_repros > 0:
            print(f"• 🧪 Scripts de Reprodução gerados: {total_repros} (em tests/repros/)")
        print(f"• Relatório Markdown gerado: {args.output_md}")
        print(f"• Dados JSON gerados: {args.output_json}")
        print(f"• 🌐 Dashboard Visual Interativo: {ROOT_DIR / 'data' / 'dashboard_grafo.html'}")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
