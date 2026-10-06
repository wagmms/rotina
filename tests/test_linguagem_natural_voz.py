import subprocess
import json
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def test_classificador_linguagem_natural():
    """Valida a classificação semântica com novas intenções em tempo real."""
    code = """
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    const assert = require('assert');

    const srcDir = path.join(process.cwd(), 'src');
    const files = fs.readdirSync(srcDir).sort().filter(f => f.endsWith('.js'));
    const combined = files.map(f => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\\n');

    const sandbox = {
        console,
        Buffer,
        PropertiesService: {
            getScriptProperties: () => ({
                getProperties: () => ({
                    PROVEDOR_TEXTO_PADRAO: 'GROQ',
                    GROQ_API_KEY: 'test_key'
                }),
                getProperty: () => null,
                setProperty: () => {},
                deleteProperty: () => {}
            })
        },
        CacheService: {
            getScriptCache: () => ({
                get: () => null,
                put: () => {},
                remove: () => {}
            })
        },
        LockService: {
            getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
            getUserLock: () => ({ tryLock: () => true, releaseLock: () => {} })
        },
        UrlFetchApp: {
            fetch: () => ({
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ choices: [{ message: { content: 'Resposta simulada' } }] })
            })
        }
    };

    vm.createContext(sandbox);
    vm.runInContext(combined, sandbox);

    // Testes de heurísticas e intenções
    const rVoz1 = sandbox.classificarIntencaoMensagem('Me responda com um áudio');
    assert.strictEqual(rVoz1.intencao, 'PRECEPTOR_VOZ', 'Deveria classificar como PRECEPTOR_VOZ');

    const rVoz2 = sandbox.classificarIntencaoMensagem('Quero falar com o meu preceptor socrático. O que fazer no pneumotórax hipertensivo?');
    assert.strictEqual(rVoz2.intencao, 'PRECEPTOR_VOZ', 'Deveria classificar preceptor socrático como PRECEPTOR_VOZ');

    const rGaso = sandbox.classificarIntencaoMensagem('pH 7.20, pCO2 58, HCO3 22');
    assert.strictEqual(rGaso.intencao, 'CLINICO_GASO', 'Deveria classificar como CLINICO_GASO');

    const rRx = sandbox.classificarIntencaoMensagem('prescrever amoxicilina 500mg');
    assert.strictEqual(rRx.intencao, 'CLINICO_RX', 'Deveria classificar como CLINICO_RX');

    console.log('OK: Classificador validado com sucesso');
    """

    res = subprocess.run(["node", "-e", code], cwd=str(BASE_DIR), capture_output=True, text=True)
    assert res.returncode == 0, res.stderr + "\n" + res.stdout
    assert "OK: Classificador validado com sucesso" in res.stdout
