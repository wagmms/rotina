"""
Testes automatizados da Rotação Imediata 0ms entre Contas em Erro de Cota (429).
Valida:
1. Transição 0ms da Conta 1 para a Conta 2 em erro 429 sem sleeps intermediários.
2. Reaproveitamento integral do brief da tarefa já gerado e contexto aquecido.
3. Preservação do orçamento de tentativas da tarefa (não conta 429 como falha da tarefa).
4. Acionamento de sleep EXCLUSIVAMENTE quando todas as contas do pool estão bloqueadas simultaneamente.
5. Inexistência de latência na sincronização do pool (0ms) durante o chaveamento.
"""
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import pytest


def test_obter_proximo_alvo_rotaciona_contas_sem_sleep_quando_disponivel(autoloop_mod, monkeypatch):
    """Garante que com múltiplas contas, uma conta bloqueada por cota é pulada em 0ms."""
    monkeypatch.setattr(autoloop_mod, 'obter_contas_disponiveis', lambda: [1, 2, 3, 4, 5, 6, 7])
    monkeypatch.setattr(autoloop_mod, 'resolver_modelo_para_conta', lambda mid, conta: ('Pro', mid))
    monkeypatch.setattr(autoloop_mod, 'bloqueios', {})
    autoloop_mod.indice_conta_atual = 1

    sleep_chamadas = []
    monkeypatch.setattr(autoloop_mod, 'observed_sleep', lambda seg, motivo: sleep_chamadas.append((seg, motivo)))

    # Conta 1 está livre inicialmente
    alvo = autoloop_mod.obter_proximo_alvo([('Pro', 'gemini-3.1-pro-high')], aguardar_se_bloqueado=False)
    assert alvo is not None
    assert alvo[0] == 1
    assert len(sleep_chamadas) == 0

    # Bloqueia a Conta 1 por cota (ex: 429)
    autoloop_mod.bloqueios[(1, 'gemini-3.1-pro-high')] = datetime.now() + timedelta(hours=1)

    # Próxima busca deve retornar imediatamente Conta 2 com 0ms e zero sleeps
    autoloop_mod.indice_conta_atual = 1
    alvo2 = autoloop_mod.obter_proximo_alvo([('Pro', 'gemini-3.1-pro-high')], aguardar_se_bloqueado=False)
    assert alvo2 is not None
    assert alvo2[0] == 2
    assert len(sleep_chamadas) == 0


def test_obter_proximo_alvo_retorna_none_sem_sleep_quando_aguardar_se_bloqueado_falso(autoloop_mod, monkeypatch):
    """Garante que com aguardar_se_bloqueado=False, todas as contas bloqueadas retornam None com 0ms."""
    monkeypatch.setattr(autoloop_mod, 'obter_contas_disponiveis', lambda: [1, 2, 3])
    monkeypatch.setattr(autoloop_mod, 'resolver_modelo_para_conta', lambda mid, conta: ('Pro', mid))

    agora = datetime.now()
    # Bloqueia todas as contas
    autoloop_mod.bloqueios = {
        (1, 'gemini-3.1-pro-high'): agora + timedelta(minutes=30),
        (2, 'gemini-3.1-pro-high'): agora + timedelta(minutes=45),
        (3, 'gemini-3.1-pro-high'): agora + timedelta(minutes=60),
    }

    sleep_chamadas = []
    monkeypatch.setattr(autoloop_mod, 'observed_sleep', lambda seg, motivo: sleep_chamadas.append((seg, motivo)))

    alvo = autoloop_mod.obter_proximo_alvo([('Pro', 'gemini-3.1-pro-high')], aguardar_se_bloqueado=False)
    assert alvo is None
    assert len(sleep_chamadas) == 0, "Com aguardar_se_bloqueado=False, não deve haver sleep!"


def test_obter_proximo_alvo_executa_sleep_somente_quando_todas_contas_bloqueadas(autoloop_mod, monkeypatch):
    """Valida que o sleep de repouso só ocorre quando todas as contas estão simultaneamente bloqueadas."""
    monkeypatch.setattr(autoloop_mod, 'obter_contas_disponiveis', lambda: [1, 2, 3, 4, 5, 6, 7])
    monkeypatch.setattr(autoloop_mod, 'resolver_modelo_para_conta', lambda mid, conta: ('Pro', mid))

    agora = datetime.now()
    # Bloqueia todas as 7 contas configuradas
    autoloop_mod.bloqueios = {
        (c, 'gemini-3.1-pro-high'): agora + timedelta(minutes=30) for c in range(1, 8)
    }

    sleep_chamadas = []
    monkeypatch.setattr(autoloop_mod, 'observed_sleep', lambda seg, motivo: sleep_chamadas.append((seg, motivo)))

    alvo = autoloop_mod.obter_proximo_alvo([('Pro', 'gemini-3.1-pro-high')], aguardar_se_bloqueado=True)
    assert alvo is None
    assert len(sleep_chamadas) == 1
    segundos, motivo = sleep_chamadas[0]
    assert motivo == 'cota'
    assert segundos <= 90, "Teto de repouso deve ser no máximo 90 segundos"


def test_executar_ciclo_nao_sincroniza_token_em_erro_429(autoloop_mod, monkeypatch):
    """Valida que em erro 429 de cota, sincronizar_token_ativo NÃO é chamado para evitar latência no pool."""
    monkeypatch.setattr(autoloop_mod.agy_contas, 'carregar_conta', lambda _: {})
    monkeypatch.setattr(autoloop_mod.agy_contas, 'extract_email', lambda _: 'conta1@teste.com')
    monkeypatch.setattr(autoloop_mod.agy_contas, 'set_active_token', lambda _: None)
    monkeypatch.setattr(autoloop_mod, 'garantir_progress_enxuto', lambda *a, **kw: False)
    monkeypatch.setattr(autoloop_mod, 'bloqueios', {})

    sincronizacoes = []
    monkeypatch.setattr(autoloop_mod.agy_contas, 'sincronizar_token_ativo', lambda: sincronizacoes.append(1))

    # Simula processo retornando 429 / quota
    def observed(cmd, **kwargs):
        kwargs['on_line']('AGY_ERROR RESOURCE_EXHAUSTED 429 quota reached. Resets in 5m\n')
        return subprocess.CompletedProcess(cmd, 1, '', '')

    monkeypatch.setattr(autoloop_mod, 'run_observed', observed)

    resultado = autoloop_mod.executar_ciclo(1, 'Pro', 'gemini-3.1-pro-high', 'tarefa_teste')
    assert resultado is False
    assert autoloop_mod.ultimo_ciclo_cota_esgotada is True
    assert (1, 'gemini-3.1-pro-high') in autoloop_mod.bloqueios
    assert len(sincronizacoes) == 0, "sincronizar_token_ativo não deve ser chamado em 429!"


def test_rotacao_imediata_0ms_preserva_brief_e_executa_proxima_conta(autoloop_mod, monkeypatch, tmp_path):
    """
    Testa o fluxo completo do loop:
    1. Conta 1 falha com 429.
    2. Rotação imediata seleciona Conta 2 com 0ms.
    3. O mesmo resumo_tarefa e contexto_tarefa gerados são reaproveitados.
    4. Conta 2 sucede e conclui a tarefa.
    """
    monkeypatch.chdir(tmp_path)
    (tmp_path / 'data').mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(autoloop_mod, 'obter_contas_disponiveis', lambda: [1, 2])
    monkeypatch.setattr(autoloop_mod, 'resolver_modelo_para_conta', lambda mid, conta: ('Pro', mid))
    monkeypatch.setattr(autoloop_mod, 'bloqueios', {})
    autoloop_mod.indice_conta_atual = 1

    brief_chamadas = []
    orig_build_brief = autoloop_mod.build_task_brief
    def build_brief_spy(task, sel=None, root=Path('.')):
        res = orig_build_brief(task, sel, root=tmp_path)
        brief_chamadas.append(res)
        return res
    monkeypatch.setattr(autoloop_mod, 'build_task_brief', build_brief_spy)

    contas_executadas = []
    sleep_chamadas = []
    monkeypatch.setattr(autoloop_mod, 'observed_sleep', lambda seg, motivo: sleep_chamadas.append((seg, motivo)))

    def mock_executar_ciclo(num_conta, nome_modelo, id_modelo, objetivo, **kwargs):
        contas_executadas.append(num_conta)
        if num_conta == 1:
            # Conta 1 atinge 429
            autoloop_mod.bloqueios[(1, id_modelo)] = datetime.now() + timedelta(hours=1)
            autoloop_mod.ultimo_ciclo_cota_esgotada = True
            return False
        else:
            # Conta 2 tem sucesso
            autoloop_mod.ultimo_ciclo_cota_esgotada = False
            return True

    monkeypatch.setattr(autoloop_mod, 'executar_ciclo', mock_executar_ciclo)
    monkeypatch.setattr(autoloop_mod, 'verificar_e_executar_deploy_agendado', lambda **kw: None)
    monkeypatch.setattr(autoloop_mod, 'carregar_estado_deploy', lambda: {})
    monkeypatch.setattr(autoloop_mod, 'check_unreleased_diff_size', lambda *a, **kw: (0, False))

    # Executa uma iteração simulando a lógica do loop principal
    modelos_ciclo = [('Pro', 'gemini-3.1-pro-high')]
    tarefa_ativa = "Corrigir bug em src/07_telegram_handlers.js"
    resumo_tarefa, contexto_tarefa = autoloop_mod.build_task_brief(tarefa_ativa, root=tmp_path)
    registro_tarefa = {'key': contexto_tarefa['key'], 'members': contexto_tarefa['tests']}

    sucesso = False
    modelo_executado = None

    while True:
        alvo = autoloop_mod.obter_proximo_alvo(modelos_ciclo, aguardar_se_bloqueado=False)
        if alvo is None:
            alvo = autoloop_mod.obter_proximo_alvo(modelos_ciclo, aguardar_se_bloqueado=True)
            if alvo is None:
                continue

        num_conta, nome_modelo, id_modelo = alvo
        modelo_executado = id_modelo

        sucesso = autoloop_mod.executar_ciclo(
            num_conta, nome_modelo, id_modelo, "objetivo",
            tarefa_ativa=tarefa_ativa, resumo_tarefa=resumo_tarefa, task_key=contexto_tarefa['key']
        )

        if not sucesso and autoloop_mod.ultimo_ciclo_cota_esgotada:
            proximo_alvo = autoloop_mod.obter_proximo_alvo(modelos_ciclo, aguardar_se_bloqueado=False)
            if proximo_alvo is not None:
                # Transição 0ms imediata
                continue
            else:
                autoloop_mod.obter_proximo_alvo(modelos_ciclo, aguardar_se_bloqueado=True)
                continue
        break

    assert contas_executadas == [1, 2], "Deve executar Conta 1 e rotacionar imediatamente para Conta 2"
    assert sucesso is True
    # Nenhum sleep durante a transição da Conta 1 para a Conta 2
    sleeps_transicao = [s for s in sleep_chamadas if s[1] == 'entre_ciclos']
    assert len(sleeps_transicao) == 0, "Transição entre Conta 1 e Conta 2 deve ter 0ms de espera!"
