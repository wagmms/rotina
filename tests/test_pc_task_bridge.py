# -*- coding: utf-8 -*-
"""
Testes automatizados para o worker local PC Task Bridge e fila em nuvem.
"""

import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def run_node(js_code: str) -> str:
    master_path = BASE_DIR / "ultra_rotina_master.js"
    preamble = f"""
    const fs = require('fs');
    const vm = require('vm');
    const code = fs.readFileSync('{master_path}', 'utf-8');
    vm.runInThisContext(code);
    """
    res = subprocess.run(
        ["node", "-e", preamble + "\n" + js_code],
        capture_output=True,
        text=True,
        check=True
    )
    return res.stdout.strip()


def test_fila_persistente_pc_tasks_gas():
    """Valida o ciclo completo de enfileiramento, listagem e conclusão de tarefas no GAS."""
    js = """
    // Mock de LockService e PropertiesService do Google Apps Script
    var storage = {};
    global.PropertiesService = {
        getScriptProperties: function() {
            return {
                getProperty: function(k) { return storage[k] || null; },
                setProperty: function(k, v) { storage[k] = String(v); },
                deleteProperty: function(k) { delete storage[k]; },
                getProperties: function() { return Object.assign({}, storage); },
                setProperties: function(obj) { Object.assign(storage, obj); }
            };
        }
    };
    global.LockService = {
        getScriptLock: function() {
            return {
                waitLock: function() { return true; },
                releaseLock: function() { return true; }
            };
        }
    };
    global.Utilities = {
        getUuid: function() { return 'uuid_' + Math.random().toString(36).substring(2, 9); }
    };

    var id1 = enfileirarTarefaPc('1771571035', 'tenda', ['--apenas-carnes']);
    var id2 = enfileirarTarefaPc('1771571035', 'sync', []);

    var pendentes = obterTarefasPcPendentes();
    var okConcluir = concluirTarefaPc(id1, 'done', 'Cotação realizada');
    var restantes = obterTarefasPcPendentes();

    console.log(JSON.stringify({
        totalInicial: pendentes.length,
        tarefas: pendentes.map(function(t) { return t.tarefa; }),
        concluiu: okConcluir,
        restantesQtd: restantes.length,
        restanteTarefa: restantes[0].tarefa
    }));
    """
    out = json.loads(run_node(js))
    assert out["totalInicial"] == 2
    assert "tenda" in out["tarefas"]
    assert "sync" in out["tarefas"]
    assert out["concluiu"] is True
    assert out["restantesQtd"] == 1
    assert out["restanteTarefa"] == "sync"


def test_pc_task_bridge_execucao_local_status():
    """Valida a execução do comando 'status' local pelo executor do PC Task Bridge."""
    import sys
    if str(BASE_DIR) not in sys.path:
        sys.path.insert(0, str(BASE_DIR))
    from scripts.pc_task_bridge import executar_tarefa_local, formatar_relatorio_tarefa
    res = executar_tarefa_local('status', [])
    rel = formatar_relatorio_tarefa(res)
    assert res['sucesso'] is True
    assert 'STATUS DO COMPUTADOR LOCAL' in rel


def test_pc_task_bridge_comando_invalido():
    """Valida o tratamento gracioso de comando desconhecido."""
    import sys
    if str(BASE_DIR) not in sys.path:
        sys.path.insert(0, str(BASE_DIR))
    from scripts.pc_task_bridge import executar_tarefa_local
    res = executar_tarefa_local('comando_inexistente_xyz', [])
    assert res['sucesso'] is False
    assert 'não reconhecido' in res['saida']
