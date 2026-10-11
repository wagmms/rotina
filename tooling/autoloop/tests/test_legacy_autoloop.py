"""
Testes automatizados para a arquitetura de Squads de Subagentes do Autoloop (Opção 1 - Arquiteto Radical).
Valida o paralelismo de subagentes, resolução de papéis e preservação inegociável da qualidade.
"""

import sys
import os
import importlib.util
import importlib.machinery
from pathlib import Path
import pytest

# Carrega dinamicamente o executável do autoloop como módulo
AUTOLOOP_PATH = Path(os.environ.get("AUTOLOOP_TEST_EXECUTABLE", str(Path(__file__).resolve().parents[1] / "autoloop.py")))

@pytest.fixture(scope="module")
def autoloop_mod():
    assert AUTOLOOP_PATH.exists(), f"Arquivo não encontrado: {AUTOLOOP_PATH}"
    loader = importlib.machinery.SourceFileLoader("autoloop", str(AUTOLOOP_PATH))
    spec = importlib.util.spec_from_loader("autoloop", loader)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["autoloop"] = mod
    loader.exec_module(mod)
    return mod


@pytest.fixture(autouse=True)
def preserve_legacy_process_mocks(autoloop_mod, monkeypatch):
    import subprocess
    monkeypatch.setattr(autoloop_mod, "executar_etapa", lambda cmd, etapa, timeout=None, input_data=None, **kw:
        subprocess.run(cmd, input=input_data, capture_output=True, text=True, timeout=timeout, check=False))
    monkeypatch.setattr(autoloop_mod, "fingerprint_tree", lambda: "legacy-fixture")

def test_squad_rapido_ou_dupla(autoloop_mod):
    nome, agentes = autoloop_mod.resolver_squad_agentes("rapido")
    assert nome == "Dupla Ágil"
    assert len(agentes) == 2
    ids = [a["id"] for a in agentes]
    assert "core-dev" in ids
    assert "qa-tester" in ids

    nome2, agentes2 = autoloop_mod.resolver_squad_agentes("dupla")
    assert nome2 == "Dupla Ágil"
    assert len(agentes2) == 2

def test_squad_clinico(autoloop_mod):
    nome, agentes = autoloop_mod.resolver_squad_agentes("clinico")
    assert nome == "Segurança Clínica"
    assert len(agentes) == 2
    ids = [a["id"] for a in agentes]
    assert "core-dev" in ids
    assert "clinical-auditor" in ids
    auditor = next(a for a in agentes if a["id"] == "clinical-auditor")
    assert auditor["model_default"] == "pro"

def test_squad_completo(autoloop_mod):
    nome, agentes = autoloop_mod.resolver_squad_agentes("full", perfil_tarefa="CLINICO_ROBUSTEZ_PRO")
    assert nome == "Squad Completo"
    assert len(agentes) == 3
    ids = [a["id"] for a in agentes]
    assert "core-dev" in ids
    assert "qa-tester" in ids
    assert "clinical-auditor" in ids

def test_squad_auto_roteamento_cognitivo(autoloop_mod):
    # Tarefa de engenharia pura -> Dupla com QA
    nome_eng, agentes_eng = autoloop_mod.resolver_squad_agentes("auto", perfil_tarefa="UI_ENGENHARIA_FLASH")
    assert nome_eng == "Engenharia Ágil + QA"
    assert len(agentes_eng) == 2
    ids_eng = [a["id"] for a in agentes_eng]
    assert "core-dev" in ids_eng
    assert "qa-tester" in ids_eng

    # Tarefa de robustez clínica -> Trio com Auditor Pro
    nome_cli, agentes_cli = autoloop_mod.resolver_squad_agentes("auto", perfil_tarefa="CLINICO_ROBUSTEZ_PRO")
    assert nome_cli == "Clínico Completo"
    assert len(agentes_cli) == 3
    ids_cli = [a["id"] for a in agentes_cli]
    assert "clinical-auditor" in ids_cli

def test_subagentes_customizados_aliases(autoloop_mod):
    nome, agentes = autoloop_mod.resolver_squad_agentes("auto", subagents_custom_str="dev,qa")
    assert nome == "Personalizado"
    assert len(agentes) == 2
    ids = [a["id"] for a in agentes]
    assert ids == ["core-dev", "qa-tester"]

    nome_trio, agentes_trio = autoloop_mod.resolver_squad_agentes("auto", subagents_custom_str="core,test,clinico")
    assert nome_trio == "Personalizado"
    assert len(agentes_trio) == 3
    ids_trio = [a["id"] for a in agentes_trio]
    assert "core-dev" in ids_trio
    assert "qa-tester" in ids_trio
    assert "clinical-auditor" in ids_trio

def test_montagem_prompt_garantia_de_qualidade(autoloop_mod):
    nome, agentes = autoloop_mod.resolver_squad_agentes("full", perfil_tarefa="CLINICO_ROBUSTEZ_PRO")
    prompt = autoloop_mod.montar_prompt_ciclo(
        objetivo="Refatorar cálculo de sulfato de magnésio",
        nome_squad=nome,
        lista_agentes=agentes,
        diretriz_kaizen="DIRETRIZ KAIZEN ATIVA",
        perfil_tarefa="CLINICO_ROBUSTEZ_PRO"
    )

    # Verifica se os pilares de aceleração e qualidade estão no contrato do prompt
    assert "invoke_subagent" in prompt
    assert "Tech Lead" in prompt
    assert "Four-Eyes Principle" in prompt or "Double-Check" in prompt
    assert "core-dev" in prompt
    assert "qa-tester" in prompt
    assert "clinical-auditor" in prompt
    assert "REGRA DE QUALIDADE ABSOLUTA" in prompt
    assert "Zero Regressões" in prompt
    assert "DIRETRIZ KAIZEN ATIVA" in prompt

def test_classificacao_clinica_precedencia_absoluta(autoloop_mod):
    """
    Testa a correção do achado P1 do ChatGPT:
    Termos de interface (menu, botão, Fastify) JAMAIS podem rebaixar tarefas clínicas que envolvam doses ou infusão.
    """
    # 1. Tarefa com termo de interface + dose clínica
    perfil1, _, modelos1 = autoloop_mod.classificar_perfil_tarefa("Corrigir dose de insulina no menu")
    assert perfil1 == "CLINICO_ROBUSTEZ_PRO", "Dose de insulina no menu deve ser classificada como clínica (Pro)!"
    assert any("pro" in m[1] for m in modelos1)

    # 2. Tarefa com termo de infraestrutura + infusão
    perfil2, _, modelos2 = autoloop_mod.classificar_perfil_tarefa("Ajustar arredondamento de infusao no Fastify")
    assert perfil2 == "CLINICO_ROBUSTEZ_PRO", "Infusão no Fastify deve ser classificada como clínica (Pro)!"
    assert any("pro" in m[1] for m in modelos2)

    # 3. Tarefa puramente de interface
    perfil3, _, modelos3 = autoloop_mod.classificar_perfil_tarefa("Criar novo botão no menu do Telegram")
    assert perfil3 == "UI_ENGENHARIA_FLASH", "Botão no menu sem conteúdo clínico deve ser Flash!"
    assert all("flash" in m[1] for m in modelos3)

def test_defesa_em_profundidade_parecer_codex(autoloop_mod):
    """
    Testa a regra de liberação defensiva estrita (Rodada 3):
    Schema compliance obrigatório, SHA obrigatório, severidades estritas e bloqueio de qualquer limitação declarada.
    """
    sha_valido = "a" * 40

    # 1. Parecer 100% íntegro aprovado
    parecer_ok = {
        "candidate_sha": sha_valido,
        "verdict": "pass",
        "summary": "Diff validado com sucesso.",
        "findings": [],
        "limitations": [],
        "required_followups": []
    }
    aprovado, motivo = autoloop_mod.avaliar_parecer_auditoria(parecer_ok, sha_esperado=sha_valido)
    assert aprovado is True
    assert "Aprovado" in motivo

    # 2. Bloqueio se sha_esperado não for fornecido ou for inválido
    aprovado_sem_sha, mot_sem_sha = autoloop_mod.avaliar_parecer_auditoria(parecer_ok, sha_esperado=None)
    assert aprovado_sem_sha is False
    assert "sha_esperado obrigatório inválido" in mot_sem_sha

    aprovado_sha_invalido, mot_sha_invalido = autoloop_mod.avaliar_parecer_auditoria(parecer_ok, sha_esperado="zzzzzzz")
    assert aprovado_sha_invalido is False
    assert "Deve ser um SHA hexadecimal completo de 40 caracteres" in mot_sha_invalido

    # 3. Bloqueio de campos ausentes do schema (ex: apenas {"verdict": "pass"})
    parecer_incompleto_schema = {"verdict": "pass", "candidate_sha": sha_valido}
    aprovado_sem_campos, mot_sem_campos = autoloop_mod.avaliar_parecer_auditoria(parecer_incompleto_schema, sha_esperado=sha_valido)
    assert aprovado_sem_campos is False
    assert "Campo obrigatório do schema ausente" in mot_sem_campos

    # 4. Bloqueio de campos extras não permitidos (additionalProperties: false)
    parecer_com_extra = dict(parecer_ok)
    parecer_com_extra["campo_extra_proibido"] = "valor"
    aprovado_extra, mot_extra = autoloop_mod.avaliar_parecer_auditoria(parecer_com_extra, sha_esperado=sha_valido)
    assert aprovado_extra is False
    assert "additionalProperties: false" in mot_extra

    # 5. Bloqueio de tipo incorreto em summary (summary numérico)
    parecer_sum_num = dict(parecer_ok)
    parecer_sum_num["summary"] = 12345
    aprovado_sum_num, mot_sum_num = autoloop_mod.avaliar_parecer_auditoria(parecer_sum_num, sha_esperado=sha_valido)
    assert aprovado_sum_num is False
    assert "Campo 'summary' deve ser uma string" in mot_sum_num

    # 6. Bloqueio de finding incompleto (ex: apenas severity: low, sem file/description)
    parecer_finding_incompleto = {
        "candidate_sha": sha_valido,
        "verdict": "pass",
        "summary": "Teste",
        "findings": [{"severity": "low"}],
        "limitations": [],
        "required_followups": []
    }
    aprovado_find_incomp, mot_find_incomp = autoloop_mod.avaliar_parecer_auditoria(parecer_finding_incompleto, sha_esperado=sha_valido)
    assert aprovado_find_incomp is False
    assert "não contém campos obrigatórios" in mot_find_incomp

    # 7. Bloqueio de campos nulos (ex: findings: null)
    parecer_nulo = {
        "candidate_sha": sha_valido,
        "verdict": "pass",
        "summary": "Teste",
        "findings": None,
        "limitations": [],
        "required_followups": []
    }
    aprovado_nulo, mot_nulo = autoloop_mod.avaliar_parecer_auditoria(parecer_nulo, sha_esperado=sha_valido)
    assert aprovado_nulo is False
    assert "não pode ser nulo" in mot_nulo

    # 8. Bloqueio de severidade inválida (ex: 'fatal')
    parecer_sev_invalida = {
        "candidate_sha": sha_valido,
        "verdict": "pass",
        "summary": "Teste",
        "findings": [{
            "severity": "fatal",
            "file": "index.js",
            "line_range": "10-20",
            "description": "Crash fatal",
            "failure_scenario": "Nenhum"
        }],
        "limitations": [],
        "required_followups": []
    }
    aprovado_sev, mot_sev = autoloop_mod.avaliar_parecer_auditoria(parecer_sev_invalida, sha_esperado=sha_valido)
    assert aprovado_sev is False
    assert "severidade inválida 'fatal'" in mot_sev

    # 9. Bloqueio de qualquer limitação declarada (reproduzindo os dois casos do ChatGPT)
    for lim in [
        "Não foi possível verificar a conversão de unidades.",
        "Unable to validate the modified calculation."
    ]:
        parecer_lim = {
            "candidate_sha": sha_valido,
            "verdict": "pass",
            "summary": "Validado com ressalva",
            "findings": [],
            "limitations": [lim],
            "required_followups": []
        }
        aprovado_lim, mot_lim = autoloop_mod.avaliar_parecer_auditoria(parecer_lim, sha_esperado=sha_valido)
        assert aprovado_lim is False, f"Limitação '{lim}' deveria ter bloqueado a aprovação!"
        assert "exigem triagem humana" in mot_lim

    # 10. Inconsistência: pass com achado crítico ou alto
    parecer_contraditorio = {
        "candidate_sha": sha_valido,
        "verdict": "pass",
        "summary": "Aprovado mas com falha",
        "findings": [{
            "severity": "critical",
            "file": "calculadoras.js",
            "line_range": "42-50",
            "description": "Teto tóxico ultrapassado",
            "failure_scenario": "Superdosagem"
        }],
        "limitations": [],
        "required_followups": []
    }
    aprovado_contra, mot_contra = autoloop_mod.avaliar_parecer_auditoria(parecer_contraditorio, sha_esperado=sha_valido)
    assert aprovado_contra is False
    assert "Inconsistência detectada" in mot_contra

    # 11. Veredito fail e inconclusive explícitos
    for verd in ["fail", "inconclusive"]:
        parecer_v = {
            "candidate_sha": sha_valido,
            "verdict": verd,
            "summary": "Resultado de auditoria",
            "findings": [],
            "limitations": [],
            "required_followups": []
        }
        aprovado_v, mot_v = autoloop_mod.avaliar_parecer_auditoria(parecer_v, sha_esperado=sha_valido)
        assert aprovado_v is False
        assert f"Veredito não aprovado: {verd}" in mot_v

    # 12. Divergência de SHA
    aprovado_sha, mot_sha = autoloop_mod.avaliar_parecer_auditoria(parecer_ok, sha_esperado="b" * 40)
    assert aprovado_sha is False
    assert "Divergência de SHA" in mot_sha

def test_pipeline_deploy_gate_auditoria_com_persistencia_real(autoloop_mod, monkeypatch, tmp_path):
    """
    Critério P1 do ChatGPT (Rodada 5):
    Testa o caminho de deploy com a FUNÇÃO REAL de persistência em diretório temporário,
    sem mock permissivo (lambda **kwargs).
    Comprova:
    1. Ausência absoluta de TypeError em salvar_estado_deploy.
    2. Gravação correta de horários e SHA no estado persistido.
    3. Bloqueio absoluto de git push na reprovação (fail).
    4. Execução correta de git push e registro de last_pushed_at na aprovação (pass).
    """
    sha_teste = "c" * 40
    comandos_executados = []

    # Redireciona STATE_DEPLOY_FILE para diretório temporário
    fake_state_file = tmp_path / "data" / "estado_deploy.json"
    fake_state_file.parent.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(autoloop_mod, "STATE_DEPLOY_FILE", fake_state_file)

    def fake_subprocess_run(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
        comandos_executados.append(cmd_str)

        class FakeResult:
            def __init__(self, returncode, stdout="", stderr=""):
                self.returncode = returncode
                self.stdout = stdout
                self.stderr = stderr

        if "build_master.py" in cmd_str:
            return FakeResult(0, "Build OK")
        elif "npm test" in cmd_str:
            return FakeResult(0, "Tests OK")
        elif "git status --porcelain" in cmd_str:
            return FakeResult(0, "")
        elif "--abbrev-ref" in cmd_str:
            return FakeResult(0, "main")
        elif "git rev-parse HEAD" in cmd_str:
            return FakeResult(0, sha_teste)
        elif "git push" in cmd_str:
            return FakeResult(0, "Push OK")
        return FakeResult(0)

    monkeypatch.setattr("subprocess.run", fake_subprocess_run)
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: sha_teste)
    monkeypatch.setattr(autoloop_mod, "enviar_relatorio_telegram", lambda *args, **kwargs: True)

    # 1. CENÁRIO REPROVADO (FAIL) COM PERSISTÊNCIA REAL
    comandos_executados.clear()
    parecer_fail = {
        "candidate_sha": sha_teste,
        "verdict": "fail",
        "summary": "Falha na auditoria",
        "findings": [],
        "limitations": [],
        "required_followups": []
    }
    monkeypatch.setattr(autoloop_mod, "obter_parecer_auditoria_candidato", lambda **kwargs: (parecer_fail, None))

    resultado_fail = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert resultado_fail is False, "Deploy com parecer fail deve retornar False!"
    assert not any("git push" in c for c in comandos_executados), "git push JAMAIS pode ser chamado no cenário fail!"
    import json
    repair_state = json.loads((tmp_path / 'data/.autoloop_audit_repairs.json').read_text())
    assert repair_state[sha_teste]['status'] == 'rejected'
    packet = tmp_path / repair_state[sha_teste]['packet']
    assert json.loads((packet / 'report.json').read_text())['report'] == parecer_fail


    # Comprova que o arquivo real foi gravado sem TypeError
    assert fake_state_file.exists(), "Arquivo de estado real deve ter sido persistido após reprovação!"
    import json
    with open(fake_state_file, "r", encoding="utf-8") as f:
        estado_gravado_fail = json.load(f)
    assert estado_gravado_fail.get("last_attempt_at") is not None
    assert estado_gravado_fail.get("next_retry_at") is not None

    # 2. CENÁRIO APROVADO (PASS) COM PERSISTÊNCIA REAL
    comandos_executados.clear()
    parecer_pass = {
        "candidate_sha": sha_teste,
        "verdict": "pass",
        "summary": "Aprovado sem restrições",
        "findings": [],
        "limitations": [],
        "required_followups": []
    }
    monkeypatch.setattr(autoloop_mod, "obter_parecer_auditoria_candidato", lambda **kwargs: (parecer_pass, None))

    resultado_pass = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert resultado_pass is True, "Deploy legítimo com parecer pass deve retornar True!"
    repair_state = json.loads((tmp_path / 'data/.autoloop_audit_repairs.json').read_text())
    assert repair_state[sha_teste]['status'] == 'approved_by_new_audit'

    assert any("git push" in c for c in comandos_executados), "git push DEVE ser executado quando aprovado!"

    with open(fake_state_file, "r", encoding="utf-8") as f:
        estado_gravado_pass = json.load(f)
    assert estado_gravado_pass.get("last_pushed_sha") == sha_teste
    assert estado_gravado_pass.get("last_pushed_at") is not None
    assert estado_gravado_pass.get("next_retry_at") is None


def test_release_multi_commit_detecta_risco_clinico(autoloop_mod, monkeypatch, tmp_path):
    """Range Git real: mudança crítica seguida de documentação continua crítica."""
    import subprocess
    import model_router
    def git(*args):
        return subprocess.run(["git", *args], cwd=tmp_path, capture_output=True,
                              text=True, check=True).stdout.strip()
    git("init", "-q")
    git("config", "user.name", "Router Test")
    git("config", "user.email", "test@example.invalid")
    monkeypatch.setattr(model_router, "PROJETOS_REGISTRADOS", {tmp_path: "rotina"})
    (tmp_path / "utils.ts").write_text("const value = 1;\n")
    git("add", ".")
    git("-c", "commit.gpgsign=false", "commit", "-qm", "initial")
    base = git("rev-parse", "HEAD")
    (tmp_path / "utils.ts").write_text("const noradrenalina = 10;\n")
    git("add", ".")
    git("-c", "commit.gpgsign=false", "commit", "-qm", "fix: ajuste")
    (tmp_path / "README.md").write_text("Documentação\n")
    git("add", ".")
    git("-c", "commit.gpgsign=false", "commit", "-qm", "docs: atualiza")
    candidate = git("rev-parse", "HEAD")
    perfil = autoloop_mod.classificar_risco_release(base, candidate)
    assert perfil == "CLINICO_DROGAS_CRITICAS_EXTRA"


def test_pipeline_deploy_bloqueia_mudanca_concorrente_e_branch(autoloop_mod, monkeypatch):
    """
    Critério P0 do ChatGPT:
    Comprova que se a branch não for main ou se o HEAD mudar concorrentemente após a auditoria,
    o push é fatalmente bloqueado.
    """
    sha_auditado = "a" * 40
    sha_concorrente = "b" * 40
    comandos_executados = []

    class FakeResult:
        def __init__(self, returncode, stdout=""):
            self.returncode = returncode
            self.stdout = stdout

    # 1. Branch diferente de main
    def fake_run_branch(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
        comandos_executados.append(cmd_str)
        if "build_master.py" in cmd_str or "npm test" in cmd_str or "git status" in cmd_str:
            return FakeResult(0, "")
        elif "--abbrev-ref" in cmd_str:
            return FakeResult(0, "feature/experimental")
        elif "git rev-parse HEAD" in cmd_str:
            return FakeResult(0, sha_auditado)
        return FakeResult(0)

    monkeypatch.setattr("subprocess.run", fake_run_branch)
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: sha_auditado)
    monkeypatch.setattr(autoloop_mod, "obter_parecer_auditoria_candidato", lambda **kwargs: ({"candidate_sha": sha_auditado, "verdict": "pass", "summary": "OK", "findings": [], "limitations": [], "required_followups": []}, None))

    res_branch = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_branch is False, "Deploy em branch diferente de main deve ser abortado!"
    assert not any("git push" in c for c in comandos_executados), "git push não pode ser chamado fora da main!"

    # 2. Mudança concorrente de HEAD
    comandos_executados.clear()
    head_calls = [sha_auditado, sha_concorrente]

    def fake_obter_head():
        if head_calls:
            return head_calls.pop(0)
        return sha_concorrente

    def fake_run_concorrente(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
        comandos_executados.append(cmd_str)
        if "build_master.py" in cmd_str or "npm test" in cmd_str or "git status" in cmd_str:
            return FakeResult(0, "")
        elif "--abbrev-ref" in cmd_str:
            return FakeResult(0, "main")
        return FakeResult(0)

    monkeypatch.setattr("subprocess.run", fake_run_concorrente)
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", fake_obter_head)

    res_conc = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_conc is False, "Deploy com HEAD concorrente deve ser abortado!"
    assert not any("git push" in c for c in comandos_executados), "git push não pode ser chamado se HEAD difere do candidato auditado!"


def test_validador_compartilhado_rejeita_line_range_e_failure_scenario_invalidos(autoloop_mod):
    """
    Critério P1 do ChatGPT:
    Comprova que tipos inválidos em line_range e failure_scenario são rejeitados de forma estrita.
    """
    sha_teste = "f" * 40
    parecer_line_range_int = {
        "candidate_sha": sha_teste,
        "verdict": "pass",
        "summary": "OK",
        "findings": [
            {
                "severity": "low",
                "file": "calc.py",
                "line_range": 123,  # Inválido: int
                "description": "Notice",
                "failure_scenario": None
            }
        ],
        "limitations": [],
        "required_followups": []
    }
    valido_lr, mot_lr = autoloop_mod.avaliar_parecer_auditoria(parecer_line_range_int, sha_esperado=sha_teste)
    assert valido_lr is False
    assert "campo 'line_range' deve ser string ou null" in mot_lr

    parecer_scenario_int = {
        "candidate_sha": sha_teste,
        "verdict": "pass",
        "summary": "OK",
        "findings": [
            {
                "severity": "low",
                "file": "calc.py",
                "line_range": "10-20",
                "description": "Notice",
                "failure_scenario": 456  # Inválido: int
            }
        ],
        "limitations": [],
        "required_followups": []
    }
    valido_sc, mot_sc = autoloop_mod.avaliar_parecer_auditoria(parecer_scenario_int, sha_esperado=sha_teste)
    assert valido_sc is False
    assert "campo 'failure_scenario' deve ser string ou null" in mot_sc


def test_estado_grava_e_le_preservando_timestamps_e_agendador(autoloop_mod, monkeypatch, tmp_path):
    """
    Critério P1 do ChatGPT (Rodada 6):
    1. salvar -> carregar preserva horários numéricos epoch e legíveis, SHA e prazo de nova tentativa.
    2. Estado novo e relógio avançado além do intervalo disparam exatamente uma tentativa elegível.
    3. Prazo de backoff futuro impede a tentativa; quando vence, a política definida permite retomada.
    4. Nova gravação e reinício preservam os mesmos valores sem restaurar a inicialização indefinidamente.
    """
    fake_state_file = tmp_path / "data" / "estado_deploy_sched.json"
    fake_state_file.parent.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(autoloop_mod, "STATE_DEPLOY_FILE", fake_state_file)

    t0 = 1773000000.0  # Tempo base
    sha_teste = "d" * 40

    # 1. Teste de fidelidade salvar -> carregar
    autoloop_mod.salvar_estado_deploy(
        last_pushed_sha=sha_teste,
        last_pushed_ts=t0,
        last_attempt_ts=t0,
        next_retry_ts=t0 + 900.0
    )
    estado = autoloop_mod.carregar_estado_deploy()
    assert estado["last_pushed_sha"] == sha_teste
    assert estado["last_pushed_ts"] == t0
    assert estado["last_attempt_ts"] == t0
    assert estado["next_retry_ts"] == t0 + 900.0
    # Consumo matemático no agendador: campos numéricos canônicos
    assert isinstance(estado["last_pushed_at"], (int, float))
    assert estado["last_pushed_at"] == t0
    assert isinstance(estado["last_attempt_at"], (int, float))
    assert estado["last_attempt_at"] == t0
    assert isinstance(estado["next_retry_at"], (int, float))
    assert estado["next_retry_at"] == t0 + 900.0

    # 2. Agendador com relógio controlado
    if fake_state_file.exists():
        fake_state_file.unlink()

    mock_clock = [t0]
    monkeypatch.setattr("time.time", lambda: mock_clock[0])

    deploys_executados = []
    def fake_executar_deploy(**kwargs):
        deploys_executados.append(mock_clock[0])
        # Simula sucesso gravando estado
        autoloop_mod.salvar_estado_deploy(
            last_pushed_sha=sha_teste,
            last_pushed_ts=mock_clock[0],
            last_attempt_ts=mock_clock[0],
            next_retry_ts=None
        )
        return True

    monkeypatch.setattr(autoloop_mod, "executar_deploy_e_relatorio", fake_executar_deploy)

    # Chamada 1: Estado novo -> apenas inicializa e agenda próximo em 3h, sem deploy imediato
    res1 = autoloop_mod.verificar_e_executar_deploy_agendado(intervalo_horas=3.0)
    assert res1 is False
    assert len(deploys_executados) == 0

    # Chamada 2: Relógio avançou 4 horas (14400s) -> decorrido 4h >= 3h -> dispara EXATAMENTE 1 vez
    mock_clock[0] = t0 + 14400.0
    res2 = autoloop_mod.verificar_e_executar_deploy_agendado(intervalo_horas=3.0)
    assert res2 is True
    assert len(deploys_executados) == 1

    # Chamada 3: Chamada imediata subsequente (mesmo tempo) -> não dispara
    res3 = autoloop_mod.verificar_e_executar_deploy_agendado(intervalo_horas=3.0)
    assert res3 is False
    assert len(deploys_executados) == 1

    # 3. Prazo de backoff futuro impede a tentativa; quando vence, permite retomada
    agora_falha = mock_clock[0] + 100.0
    mock_clock[0] = agora_falha
    # Simula gravação de falha com backoff de 15 minutos (900s)
    autoloop_mod.salvar_estado_deploy(last_attempt_ts=agora_falha, next_retry_ts=agora_falha + 900.0)

    # 5 minutos depois (ainda em backoff):
    mock_clock[0] = agora_falha + 300.0
    res_backoff = autoloop_mod.verificar_e_executar_deploy_agendado(intervalo_horas=3.0)
    assert res_backoff is False
    assert len(deploys_executados) == 1  # Bloqueado pelo backoff

    # 4. Retomada após vencimento do backoff:
    # Quando o relógio avança além do retry (900s) e acumula o intervalo elegível:
    mock_clock[0] = agora_falha + 1000.0 + (3.0 * 3600)
    res_retomada = autoloop_mod.verificar_e_executar_deploy_agendado(intervalo_horas=3.0)
    assert res_retomada is True
    assert len(deploys_executados) == 2  # Nova tentativa elegível disparada com sucesso!

    # 5. Nova gravação e reinício preservam os mesmos valores sem restaurar inicialização
    estado_reinicio = autoloop_mod.carregar_estado_deploy()
    assert estado_reinicio["last_pushed_sha"] == sha_teste
    assert estado_reinicio["next_retry_ts"] is None  # Limpo após o sucesso de deploy


def test_adapter_bloqueia_quando_base_ausente_ou_invalida_em_multi_commit(autoloop_mod, monkeypatch, tmp_path):
    """Git real; ausência de base, identidade inválida e diff indisponível bloqueiam chamadas."""
    import subprocess
    import scoped_audit
    original = subprocess.run
    for args in [('init', '-q'), ('config', 'user.email', 'fixture@example.invalid'), ('config', 'user.name', 'Fixture')]:
        original(['git', *args], check=True)
    (tmp_path / 'a.js').write_text('const dose = 1;')
    original(['git','add','.'],check=True)
    original(['git','commit','-qm','base'],check=True)
    base = original(['git','rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    (tmp_path / 'a.js').write_text('const dose = 2;')
    original(['git','add','.'],check=True)
    original(['git','commit','-qm','change'],check=True)
    head = original(['git','rev-parse','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
    calls = []
    monkeypatch.setattr(autoloop_mod, 'revisar_escopo_codex', lambda *a: calls.append(a))
    assert autoloop_mod.obter_parecer_auditoria_candidato(head)[0] is None
    assert autoloop_mod.obter_parecer_auditoria_candidato(head, 'f'*40)[0] is None
    actual_git = scoped_audit.git
    def failed_diff(root, *args):
        if args[0] == 'diff':
            raise scoped_audit.ScopeError('diff indisponível')
        return actual_git(root, *args)
    monkeypatch.setattr(scoped_audit, 'git', failed_diff)
    assert 'diff indisponível' in autoloop_mod.obter_parecer_auditoria_candidato(head, base)[1]
    assert not calls


def test_import_error_bloqueia_fatalmente_sem_validador_permissivo(monkeypatch, tmp_path):
    """
    Critério P0 do ChatGPT (Rodada 7):
    Injeta ImportError real durante a execução do bloco try/except de produção
    de Autoloop e MedQuest.
    Comprova que a função avaliar_parecer_auditoria:
    1. É chamada APÓS a saída do bloco except.
    2. NÃO lança NameError (resolvendo o escopo de _erro_importacao_validador).
    3. Retorna deterministamente (False, msg_erro_configuracao) preservando o contrato.
    4. Na integração do gate, bloqueia qualquer deploy/push sem registros indevidos de sucesso.
    """
    import builtins
    import importlib.machinery
    import importlib.util

    sha_teste = "e" * 40
    parecer_aparentemente_perfeito = {
        "candidate_sha": sha_teste,
        "verdict": "pass",
        "summary": "Diff validado perfeitamente.",
        "findings": [],
        "limitations": [],
        "required_followups": []
    }

    # Intercepta a importação de 'audit_validator' para lançar ImportError real
    real_import = builtins.__import__
    def fake_import(name, *args, **kwargs):
        if name == "audit_validator":
            raise ImportError("Simulated missing audit_validator module")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)

    # 1. Executa o módulo de produção do Autoloop com ImportError injetado
    al_path = AUTOLOOP_PATH
    loader_al = importlib.machinery.SourceFileLoader("autoloop_import_fail", str(al_path))
    spec_al = importlib.util.spec_from_loader("autoloop_import_fail", loader_al)
    mod_al = importlib.util.module_from_spec(spec_al)
    loader_al.exec_module(mod_al)

    # Invoca a função de produção gerada no bloco except, APÓS sair do bloco (sem NameError)
    valido_al, msg_al = mod_al.avaliar_parecer_auditoria(parecer_aparentemente_perfeito, sha_teste)
    assert valido_al is False, "Na ausência de audit_validator, Autoloop DEVE reprovar!"
    assert "FALHA CRÍTICA DE CONFIGURAÇÃO" in msg_al
    assert "Simulated missing audit_validator module" in msg_al

    # 2. Executa o módulo de produção do MedQuest deploy com ImportError injetado
    mq_path = Path("/home/wagmoraes/Projetos IA/MedQuest/deploy.py")
    loader_mq = importlib.machinery.SourceFileLoader("medquest_deploy_import_fail", str(mq_path))
    spec_mq = importlib.util.spec_from_loader("medquest_deploy_import_fail", loader_mq)
    mod_mq = importlib.util.module_from_spec(spec_mq)
    loader_mq.exec_module(mod_mq)

    # Invoca a função de produção gerada no bloco except, APÓS sair do bloco (sem NameError)
    valido_mq, msg_mq = mod_mq.avaliar_parecer_auditoria(parecer_aparentemente_perfeito, sha_teste)
    assert valido_mq is False, "Na ausência de audit_validator, MedQuest DEVE reprovar!"
    assert "FALHA CRÍTICA DE CONFIGURAÇÃO" in msg_mq
    assert "Simulated missing audit_validator module" in msg_mq

    # 3. Integração do gate: comprova que na ausência do validador, nenhum deploy/push é realizado
    comandos_executados = []
    class FakeResult:
        def __init__(self, returncode, stdout=""):
            self.returncode = returncode
            self.stdout = stdout

    def fake_subprocess_run(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
        comandos_executados.append(cmd_str)
        if "build_master.py" in cmd_str or "npm test" in cmd_str or "git status" in cmd_str:
            return FakeResult(0, "")
        elif "--abbrev-ref" in cmd_str:
            return FakeResult(0, "main")
        elif "git rev-parse HEAD" in cmd_str:
            return FakeResult(0, sha_teste)
        return FakeResult(0)

    monkeypatch.setattr("subprocess.run", fake_subprocess_run)
    monkeypatch.setattr(mod_al, "obter_commit_head", lambda: sha_teste)
    monkeypatch.setattr(mod_al, "STATE_DEPLOY_FILE", tmp_path / "data" / "estado_fail.json")

    # Injeta a função de validação falha no gate de deploy do autoloop
    monkeypatch.setattr(mod_al, "obter_parecer_auditoria_candidato", lambda **kwargs: (parecer_aparentemente_perfeito, None))

    res_deploy_al = mod_al.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_deploy_al is False, "Deploy com validador indisponível deve retornar False!"
    assert not any("git push" in c for c in comandos_executados), "git push JAMAIS pode ser chamado se validador falhar!"


def test_codex_quota_exhausted_never_allows_deploy_when_tests_pass(autoloop_mod, monkeypatch, tmp_path):
    """
    Testa que cota esgotada bloqueia o deploy mesmo com a antiga opção de fallback.
    1. Build e testes aprovados não substituem a auditoria obrigatória.
    2. Com AUTOLOOP_CODEX_FALLBACK_ON_QUOTA=0 (modo estrito), o deploy bloqueia.
    3. Quando o Codex tem cota e reprova (verdict: fail), o deploy é fatalmente bloqueado.
    """
    sha_teste = "f" * 40
    comandos_executados = []

    class FakeResult:
        def __init__(self, returncode, stdout=""):
            self.returncode = returncode
            self.stdout = stdout

    def fake_subprocess_run(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
        comandos_executados.append(cmd_str)
        if "build_master.py" in cmd_str or "npm test" in cmd_str or "git status" in cmd_str:
            return FakeResult(0, "")
        elif "--abbrev-ref" in cmd_str:
            return FakeResult(0, "main")
        elif "git rev-parse HEAD" in cmd_str:
            return FakeResult(0, sha_teste)
        elif "git push" in cmd_str:
            return FakeResult(0, "Push OK")
        return FakeResult(0)

    monkeypatch.setattr("subprocess.run", fake_subprocess_run)
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: sha_teste)
    monkeypatch.setattr(autoloop_mod, "STATE_DEPLOY_FILE", tmp_path / "data" / "estado_quota.json")
    monkeypatch.setattr(autoloop_mod, "enviar_relatorio_telegram", lambda *args, **kwargs: True)

    # 1. Simula erro de cota esgotada do Codex (CODEX_QUOTA_EXHAUSTED) com fallback ativo (padrão)
    monkeypatch.setenv("AUTOLOOP_CODEX_FALLBACK_ON_QUOTA", "1")
    monkeypatch.setattr(
        autoloop_mod,
        "obter_parecer_auditoria_candidato",
        lambda **kwargs: (None, "CODEX_QUOTA_EXHAUSTED: 429 Too Many Requests - You exceeded your current quota")
    )

    comandos_executados.clear()
    res_quota_fallback = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_quota_fallback is False, "Cota não pode dispensar a auditoria obrigatória!"
    assert not any("git push" in c for c in comandos_executados), "Sem auditoria válida, nenhum push é permitido!"

    # 2. Simula erro de cota com modo estrito (AUTOLOOP_CODEX_FALLBACK_ON_QUOTA=0)
    monkeypatch.setenv("AUTOLOOP_CODEX_FALLBACK_ON_QUOTA", "0")
    comandos_executados.clear()
    res_quota_strict = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_quota_strict is False, "Deploy com cota esgotada no modo estrito DEVE ser bloqueado!"
    assert not any("git push" in c for c in comandos_executados), "git push NÃO pode ser chamado no modo estrito!"

    # 3. Com cota disponível, mas veredito fail -> DEVE bloquear categoricamente mesmo com fallback ativo!
    monkeypatch.setenv("AUTOLOOP_CODEX_FALLBACK_ON_QUOTA", "1")
    parecer_fail = {
        "candidate_sha": sha_teste,
        "verdict": "fail",
        "summary": "Falha clínica detectada",
        "findings": [],
        "limitations": [],
        "required_followups": []
    }
    monkeypatch.setattr(autoloop_mod, "obter_parecer_auditoria_candidato", lambda **kwargs: (parecer_fail, None))
    comandos_executados.clear()
    res_fail = autoloop_mod.executar_deploy_e_relatorio(intervalo_horas=3.0)
    assert res_fail is False, "Deploy com veredito fail DEVE ser bloqueado categoricamente!"
    assert not any("git push" in c for c in comandos_executados), "git push JAMAIS pode ser chamado quando reprovado pelo Codex!"









@pytest.mark.parametrize("invalid_config", [False, True])
def test_adapter_reclassifica_diff_e_valida_comando(autoloop_mod, monkeypatch, tmp_path, invalid_config):
    """Git real + CLI simulado: perfil externo não rebaixa mudança crítica."""
    import subprocess
    import json
    import model_router
    original_run = subprocess.run
    def git(*args):
        return original_run(["git", *args], cwd=tmp_path, capture_output=True,
                            text=True, check=True).stdout.strip()
    git("init", "-q")
    git("config", "user.name", "Router Test")
    git("config", "user.email", "test@example.invalid")
    (tmp_path / "utils.ts").write_text("const value = 1;\n")
    git("add", ".")
    git("-c", "commit.gpgsign=false", "commit", "-qm", "initial")
    base = git("rev-parse", "HEAD")
    (tmp_path / "utils.ts").write_text("const noradrenalina = 10;\n")
    git("add", ".")
    git("-c", "commit.gpgsign=false", "commit", "-qm", "fix: ajuste")
    candidate = git("rev-parse", "HEAD")
    monkeypatch.setattr(model_router, "PROJETOS_REGISTRADOS", {tmp_path: "rotina"})
    fake_home = tmp_path / "fake_home"
    schema = fake_home / ".codex" / "schemas" / "codex_audit_schema.json"
    schema.parent.mkdir(parents=True)
    schema.write_text('{"type":"object"}')
    monkeypatch.setattr(Path, "home", classmethod(lambda cls: fake_home))
    monkeypatch.setattr(autoloop_mod.shutil, "which", lambda _: "/usr/bin/true")
    monkeypatch.setattr(autoloop_mod, "AUDIT_DIR", tmp_path / "audits")
    calls = []
    def run(cmd, *args, **kwargs):
        if cmd[0] != "/usr/bin/true":
            return original_run(cmd, *args, **kwargs)
        calls.append(cmd)
        assert cmd[cmd.index("-m") + 1] == "gpt-6-astra"
        assert cmd[cmd.index("-c") + 1] == "model_reasoning_effort=xhigh"
        assert cmd[-1] == '-'
        manifests = list((tmp_path / 'data/scoped_audits/contexts').glob('*/manifest.json'))
        assert manifests
        manifest = json.loads(manifests[0].read_text())
        assert any('noradrenalina' in (tmp_path / entry['patch']).read_text() for entry in manifest['patches'])
        output = Path(cmd[cmd.index("--output-last-message") + 1])
        output.write_text(json.dumps({"candidate_sha": candidate, "verdict": "pass",
            "summary": "Fixture", "findings": [], "limitations": [], "required_followups": []}))
        return subprocess.CompletedProcess(cmd, 0, "", "")
    monkeypatch.setattr(subprocess, "run", run)
    if invalid_config:
        monkeypatch.setattr(autoloop_mod, "selecionar_modelo_auditoria",
                            lambda *a, **kw: {"model": "gpt-6-astra", "effort": "extra-high"})
    data, error = autoloop_mod.obter_parecer_auditoria_candidato(
        candidate, base, perfil_tarefa="UI_COSMETICO_LEVE")
    if invalid_config:
        assert data is None and "Modelo/esforço não suportado" in error
        assert not calls
    else:
        assert error is None and data["verdict"] == "pass"
        assert len(calls) == 1


def test_roteador_ausente_bloqueia_adapter(monkeypatch):
    import builtins
    original_import = builtins.__import__
    def importing(name, *args, **kwargs):
        if name == "model_router":
            raise ImportError("router missing")
        return original_import(name, *args, **kwargs)
    monkeypatch.setattr(builtins, "__import__", importing)
    loader = importlib.machinery.SourceFileLoader("autoloop_router_missing", str(AUTOLOOP_PATH))
    spec = importlib.util.spec_from_loader("autoloop_router_missing", loader)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    data, error = module.obter_parecer_auditoria_candidato("a" * 40)
    assert data is None and "router missing" in error


@pytest.mark.parametrize("text", ["Corrigir menu dedicado no Telegram", "Criar um teclado dedicado ao cockpit", "Corrigir contraste CSS"])
def test_substrings_nao_acionam_auditoria_clinica(autoloop_mod, text):
    profile, _, models = autoloop_mod.classificar_perfil_tarefa(text)
    assert profile == "UI_ENGENHARIA_FLASH"
    assert all("flash" in model for _, model in models)


@pytest.mark.parametrize("text", ["Ajustar dose de insulina no menu", "Revisar CAD", "Corrigir infusao de DVA no Fastify", "Revisar posologias", "Corrigir calcularDose em src", "Corrigir dose_maxima em src"])
def test_clinico_nao_tem_fallback_inferior(autoloop_mod, text):
    profile, _, models = autoloop_mod.classificar_perfil_tarefa(text)
    assert profile == "CLINICO_ROBUSTEZ_PRO"
    assert len(models) == 1 and "pro" in models[0][1]


def test_prompt_recebe_tarefa_exata_e_bateria_unica(autoloop_mod):
    name, agents = autoloop_mod.resolver_squad_agentes()
    prompt = autoloop_mod.montar_prompt_ciclo("objetivo", name, agents, "", tarefa_ativa="Corrigir foo em src/a.js: função f; aceite X")
    assert "Corrigir foo em src/a.js: função f; aceite X" in prompt
    assert "npm run test:all" in prompt
    assert "Não execute a mesma bateria simultaneamente" in prompt


def test_edicao_durante_auditoria_bloqueia_push(autoloop_mod, monkeypatch):
    import subprocess
    calls = []
    class Result:
        returncode = 0
        stderr = ""
        stdout = ""
    def run(cmd, **kwargs):
        calls.append(cmd)
        result = Result()
        if "--abbrev-ref" in cmd: result.stdout = "main"
        return result
    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(autoloop_mod, "obter_commit_head", lambda: "a" * 40)
    identity = ["before"]
    monkeypatch.setattr(autoloop_mod, "fingerprint_tree", lambda: identity[0])
    def audit(**kwargs):
        identity[0] = "changed"
        return {"candidate_sha": "a"*40, "verdict":"pass", "summary":"Fixture", "findings":[], "limitations":[], "required_followups":[]}, None
    monkeypatch.setattr(autoloop_mod, "obter_parecer_auditoria_candidato", audit)
    assert autoloop_mod.executar_deploy_e_relatorio() is False
    assert not any("push" in cmd for cmd in calls)

@pytest.mark.parametrize('code,quota', [(0, False), (7, False), (1, True)])
def test_cooldown_so_em_cota_real(autoloop_mod, monkeypatch, code, quota):
    import subprocess
    from datetime import datetime
    monkeypatch.setattr(autoloop_mod.agy_contas, 'carregar_conta', lambda _: {})
    monkeypatch.setattr(autoloop_mod.agy_contas, 'extract_email', lambda _: 'fixture@example.invalid')
    monkeypatch.setattr(autoloop_mod.agy_contas, 'set_active_token', lambda _: None)
    monkeypatch.setattr(autoloop_mod.agy_contas, 'sincronizar_token_ativo', lambda: None)
    monkeypatch.setattr(autoloop_mod, 'garantir_progress_enxuto', lambda *a, **kw: False)
    monkeypatch.setattr(autoloop_mod, 'enviar_relatorio_ciclo_rotina', lambda *a: None)
    monkeypatch.setattr(autoloop_mod, 'bloqueios', {})
    monkeypatch.setattr(autoloop_mod.time, 'sleep', lambda _: None)
    monkeypatch.setattr(autoloop_mod, 'executar_etapa', lambda *a, **kw: subprocess.CompletedProcess([], 0, '', ''))
    def observed(cmd, **kwargs):
        if quota: kwargs['on_line']('AGY_ERROR RESOURCE_EXHAUSTED 429 quota. Resets in 5m\n')
        return subprocess.CompletedProcess(cmd, code, '', '')
    monkeypatch.setattr(autoloop_mod, 'run_observed', observed)
    result = autoloop_mod.executar_ciclo(1, 'Pro', 'gemini-3.1-pro-high', 'fixture')
    if quota:
        assert result is False
        assert autoloop_mod.bloqueios[(1, 'gemini-3.1-pro-high')] > datetime.now()
    else:
        assert (1, 'gemini-3.1-pro-high') not in autoloop_mod.bloqueios
        assert result is (code == 0)


def test_pending_engineering_does_not_inherit_generic_clinical_warning(autoloop_mod, tmp_path):
    import json
    import hashlib
    import failure_queue
    root = Path(__file__).resolve().parents[3]
    for name in ['test_teclado_adaptativo.cjs', 'test_teclado_adaptativo.py']:
        target = tmp_path / 'tests' / name
        target.parent.mkdir(exist_ok=True)
        target.write_bytes((root / 'tests' / name).read_bytes())
    data = tmp_path / 'data'
    data.mkdir()
    (data / '.autoloop_test_receipt.json').write_text(json.dumps({
        'scope': 'all', 'passed': False, 'results': [
            {'file': 'tests/test_teclado_adaptativo.cjs', 'status': 'failed'},
            {'file': 'tests/test_teclado_adaptativo.py', 'status': 'failed'}]}))
    task = autoloop_mod.obter_pendencia_validacao()
    assert autoloop_mod.classificar_perfil_tarefa(task)[0] == 'UI_ENGENHARIA_FLASH'
    assert 'auditoria clínica Pro' not in task


@pytest.mark.parametrize('expression', ["'tests/test_infusao.cjs'", "os.path.join(os.path.dirname(__file__), 'test_infusao.cjs')"])
def test_missing_test_infrastructure_does_not_route_by_medical_filename(autoloop_mod, tmp_path, expression):
    import json
    from failure_queue import select_failure
    (tmp_path / 'tests').mkdir()
    (tmp_path / 'tests/test_infusao.py').write_text(f"subprocess.run(['node', {expression}])")
    (tmp_path / 'data').mkdir()
    (tmp_path / 'data/.autoloop_test_receipt.json').write_text(json.dumps({
        'scope': 'all', 'passed': False, 'results': [{'file': 'tests/test_infusao.py', 'status': 'failed'}]}))
    selected = select_failure(tmp_path)
    assert selected['engineering']
    assert autoloop_mod.classificar_pendencia(selected)[0] == 'UI_ENGENHARIA_FLASH'
    assert 'Não inventar asserções' in selected['task']
    (tmp_path / 'tests/test_infusao.cjs').write_text('assert.strictEqual(dose, 10)')
    selected = select_failure(tmp_path)
    assert not selected['engineering']
    assert autoloop_mod.classificar_pendencia(selected)[0] == 'CLINICO_ROBUSTEZ_PRO'


def test_cycle_connects_brief_and_explicit_usage_to_task(autoloop_mod, monkeypatch, tmp_path):
    import json
    import subprocess
    monkeypatch.setattr(autoloop_mod.agy_contas, 'carregar_conta', lambda _: {})
    monkeypatch.setattr(autoloop_mod.agy_contas, 'extract_email', lambda _: 'fixture@example.invalid')
    monkeypatch.setattr(autoloop_mod.agy_contas, 'set_active_token', lambda _: None)
    monkeypatch.setattr(autoloop_mod.agy_contas, 'sincronizar_token_ativo', lambda: None)
    monkeypatch.setattr(autoloop_mod, 'garantir_progress_enxuto', lambda *a, **kw: False)
    monkeypatch.setattr(autoloop_mod, 'enviar_relatorio_ciclo_rotina', lambda *a: None)
    monkeypatch.setattr(autoloop_mod, 'executar_etapa', lambda *a, **kw: subprocess.CompletedProcess([], 0, '', ''))
    def observed(cmd, **kwargs):
        assert cmd[cmd.index('--output-format') + 1] == 'stream-json'
        assert 'resumo-funcao' in cmd[-1]
        kwargs['on_line'](json.dumps({'type': 'result', 'usage': {'input_tokens': 40, 'output_tokens': 12}}))
        return subprocess.CompletedProcess(cmd, 0, '', '')
    monkeypatch.setattr(autoloop_mod, 'run_observed', observed)
    assert autoloop_mod.executar_ciclo(1, 'Pro', 'gemini-3.1-pro-high', 'fixture',
        resumo_tarefa='resumo-funcao', task_key='fixture-key')
    rows = [json.loads(line) for line in (tmp_path / 'data/autoloop_metrics.jsonl').read_text().splitlines()]
    usage = next(row for row in rows if row['stage'] == 'consumo_agy')
    assert usage['task_key'] == 'fixture-key'
    assert usage['tokens'] == {'input_tokens': 40, 'output_tokens': 12}


@pytest.mark.parametrize('ready', [False, True])
def test_scheduler_reaudits_ready_new_candidate_without_waiting(autoloop_mod, monkeypatch, ready):
    monkeypatch.setattr(autoloop_mod, 'ready_for_reaudit', lambda: ready)
    monkeypatch.setattr(autoloop_mod, 'carregar_estado_deploy', lambda: {
        'last_attempt_at': 1000, 'next_retry_at': 2800, 'ultimo_pushed_sha': 'a' * 40})
    monkeypatch.setattr(autoloop_mod.time, 'time', lambda: 1000)
    calls = []
    def deploy(**kwargs):
        calls.append(kwargs)
        return True
    monkeypatch.setattr(autoloop_mod, 'executar_deploy_e_relatorio', deploy)
    assert autoloop_mod.verificar_e_executar_deploy_agendado() is ready
    assert len(calls) == int(ready)


def test_formatador_etapa_resumido_testes(autoloop_mod, capsys):
    handler = autoloop_mod.formatador_etapa_resumido("testes_finais_ciclo")
    handler("[TESTES] 10 suítes; 2 processos; código abc123; dados isolados.")
    handler("[OK] tests/test_fastify.cjs: 0.5s")
    handler("[OK] tests/test_seguranca.cjs: 0.8s")
    handler("[TESTES] 10/10 aprovadas; 1.30s; código estável.")
    captured = capsys.readouterr().out
    assert "10/10 aprovadas" in captured
    assert "✅" in captured
    # Não deve ter impressões de linha inteira com print comum para cada [OK]
    assert captured.count("\n") <= 2


def test_formatador_etapa_resumido_falha(autoloop_mod, capsys):
    handler = autoloop_mod.formatador_etapa_resumido("testes_finais_ciclo")
    handler("[FALHA] tests/test_erro.cjs: 0.2s (timeout)")
    captured = capsys.readouterr().out
    assert "❌" in captured
    assert "test_erro.cjs" in captured

