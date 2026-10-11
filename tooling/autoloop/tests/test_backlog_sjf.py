from pathlib import Path
import json
import pytest
from backlog_sjf import (
    avaliar_criticidade_clinica,
    estimar_esforco_job,
    calcular_wsjf_score,
    extrair_tarefas_pendentes_progress,
    selecionar_tarefa_sjf
)


def test_classificacao_criticidade_clinica():
    # 1. Emergência Crítica / ACLS / Sepse -> 4.0
    assert avaliar_criticidade_clinica("Parada cardiorrespiratória em gestante: protocolo ACLS e massagem") == 4.0
    assert avaliar_criticidade_clinica("Sepse puerperal e choque séptico com noradrenalina") == 4.0
    assert avaliar_criticidade_clinica("Intubação orotraqueal e sequência rápida na sala vermelha") == 4.0

    # 2. Farmacologia / Posologia / Doses -> 3.0
    assert avaliar_criticidade_clinica("Ajuste de dose de antibiótico e clearance de creatinina") == 3.0
    assert avaliar_criticidade_clinica("Prescrição de insulina e controle de glicemia") == 3.0
    assert avaliar_criticidade_clinica("Teto de segurança em infusão contínua") == 3.0

    # 3. Cuidados Gerais / Ambulatório / SOAP / SBAR -> 2.0
    assert avaliar_criticidade_clinica("Passagem de plantão SBAR e censo de leitos na enfermaria") == 2.0
    assert avaliar_criticidade_clinica("Modo SOAP ambulatorial e puericultura") == 2.0
    assert avaliar_criticidade_clinica("Avaliação de risco FRAX em geriatria") == 2.0

    # 4. Interface / UI / Infraestrutura -> 1.0
    assert avaliar_criticidade_clinica("Ajuste de layout CSS e cor do botão no Cockpit PWA") == 1.0
    assert avaliar_criticidade_clinica("Otimização de telemetria e sanitização de rotas Fastify") == 1.0


def test_estimativa_esforco_job_sjf():
    # 1. Micro-job cirúrgico (1 arquivo com função e critério explícitos)
    tarefa_cirurgica = """- [ ] Ajuste de cálculo em `src/02_medicamentos.js`
    - Arquivo/Módulo Alvo: `src/02_medicamentos.js`
    - Função/Componente/Seletor: `calcularNoradrenalina`
    - Critério de Aceite: Retornar vazão correta em mL/h"""
    esforco_cirurgico = estimar_esforco_job(tarefa_cirurgica)
    assert esforco_cirurgico <= 1.0, f"Esforço esperado <= 1.0, obtido: {esforco_cirurgico}"

    # 2. Tarefa com múltiplos arquivos (2 arquivos)
    tarefa_dois_arquivos = """- [ ] Integração entre `src/07_telegram_handlers.js` e `server/index.js`"""
    esforco_medio = estimar_esforco_job(tarefa_dois_arquivos)
    assert esforco_medio >= 1.5

    # 3. Tarefa multimodal de áudio / transcrição (job pesado)
    tarefa_multimodal = """- [ ] Processamento de comandos de voz e áudio clínico multimodal com transcrição em `src/07e_telegram_midia.js`, `src/04_motores_ia.js` e `server/index.js`"""
    esforco_pesado = estimar_esforco_job(tarefa_multimodal)
    assert esforco_pesado >= 3.0, f"Esforço de tarefa multimodal esperado >= 3.0, obtido: {esforco_pesado}"


def test_wsjf_score_prioriza_quick_wins_clinicos():
    # Quick-Win Clínico: alta criticidade médica + cirúrgico de 1 arquivo
    tarefa_quick_win = """- [ ] Corrigir cálculo de sulfato de magnésio em pré-eclâmpsia grave
    - Arquivo/Módulo Alvo: `src/03_obstetricia.js`
    - Função/Componente/Seletor: `calcularZuspan`
    - Critério de Aceite: Garantir dose de ataque de 4g e manutenção de 1g/h"""

    # Tarefa ampla e demorada: áudio multimodal de múltiplos arquivos
    tarefa_pesada = """- [ ] Tratamento de áudio clínico multimodal e transcrição de voz com ffmpeg
    - Arquivo/Módulo Alvo: `src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`
    - Função/Componente/Seletor: `processarAudio`"""

    score_quick_win = calcular_wsjf_score(tarefa_quick_win)
    score_pesada = calcular_wsjf_score(tarefa_pesada)

    assert score_quick_win > score_pesada, f"Quick-win clínico ({score_quick_win}) deve superar job pesado ({score_pesada})"


def test_parsing_e_selecao_inteligente_progress(tmp_path):
    progress_content = """### STATUS: CONSERTO_ERROS

## 🔄 Próxima Tarefa em Andamento

- [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**:
    - Arquivo/Módulo Alvo: `src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`
    - Função/Componente/Seletor: `processarAudio`

---

## 📋 Backlog Prioritário: Testes de Funções

1. [ ] **Emergência - Correção de Dose de Adrenalina em Parada Cardiorrespiratória (`src/01_emergencias.js`)**:
    - Arquivo/Módulo Alvo: `src/01_emergencias.js`
    - Função/Componente/Seletor: `calcularDoseAdrenalinaPCR`
    - Critério de Aceite: 1mg IV a cada 3 a 5 minutos sem intervalo incorreto.

2. [ ] **Cockpit PWA - Ajuste de Margem do Botão SBAR (`cockpit_movel.html`)**:
    - Arquivo/Módulo Alvo: `cockpit_movel.html`
"""
    (tmp_path / "PROGRESS.md").write_text(progress_content, encoding="utf-8")

    tarefas = extrair_tarefas_pendentes_progress(progress_content)
    assert len(tarefas) == 3
    assert tarefas[0]['em_andamento'] is True
    assert "Áudio Clínico" in tarefas[0]['texto']

    # Se a tarefa em andamento for concluída ou não existir, o SJF escolhe a emergência médica cirúrgica
    progress_sem_andamento = progress_content.replace("- [ ] **Telegram Bot - Tratamento de Comandos de Voz", "- [x] **Telegram Bot - Tratamento de Comandos de Voz")
    (tmp_path / "PROGRESS.md").write_text(progress_sem_andamento, encoding="utf-8")

    selecionada = selecionar_tarefa_sjf(root=tmp_path)
    assert selecionada is not None
    assert "Dose de Adrenalina em Parada Cardiorrespiratória" in selecionada


def test_failure_queue_sjf_desempate_clinico(tmp_path):
    import failure_queue as queue
    (tmp_path / "data").mkdir(parents=True, exist_ok=True)
    (tmp_path / "tests").mkdir(parents=True, exist_ok=True)

    # Cria duas suítes que falharam: uma clínica de PCR e uma de UI genérica
    (tmp_path / "tests/test_pcr_gestante.cjs").write_text("throw Error()")
    (tmp_path / "tests/test_ui_botao.cjs").write_text("throw Error()")

    receipt = {
        'scope': 'all',
        'passed': False,
        'fingerprint': 'test',
        'results': [
            {'file': 'tests/test_ui_botao.cjs', 'status': 'failed'},
            {'file': 'tests/test_pcr_gestante.cjs', 'status': 'failed'}
        ]
    }
    (tmp_path / "data/.autoloop_test_receipt.json").write_text(json.dumps(receipt))

    selecionada = queue.select_failure(root=tmp_path)
    assert selecionada is not None
    # A suíte clínica de PCR deve ter precedência no desempate SJF sobre a de UI
    assert selecionada['key'] == 'tests/test_pcr_gestante.cjs'
