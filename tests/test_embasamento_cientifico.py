import subprocess
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def test_protocolos_e_embasamento():
    """Valida protocolos determinísticos e integração com literatura científica."""
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
            fetch: (url) => ({
                getResponseCode: () => 200,
                getContentText: () => {
                    if (url.includes('europepmc')) {
                        return JSON.stringify({
                            resultList: {
                                result: [
                                    { title: 'Estudo Clínico Simulado', authorString: 'Silva et al.', journalTitle: 'Arq Bras Cardiol', pubYear: '2026', pmid: '99999999' }
                                ]
                            }
                        });
                    }
                    return JSON.stringify({ choices: [{ message: { content: 'Resposta simulada' } }] });
                }
            })
        }
    };

    vm.createContext(sandbox);
    vm.runInContext(combined, sandbox);

    // 1. Validar existência dos protocolos clínicos
    assert(sandbox.PROTOCOLOS_CLINICOS_EMERGENCIA, 'PROTOCOLOS_CLINICOS_EMERGENCIA deve existir');
    const pSepse = sandbox.obterProtocoloClinico('choque septico');
    assert(pSepse, 'Deve encontrar protocolo de sepse');
    assert(pSepse.diretriz_brasileira.includes('ILAS'), 'Diretriz brasileira de sepse deve citar ILAS');
    assert(pSepse.diretriz_internacional.includes('Surviving Sepsis'), 'Diretriz internacional deve citar SSC');

    const pIam = sandbox.obterProtocoloClinico('dor toracica e infarto');
    assert(pIam, 'Deve encontrar protocolo de IAM');
    assert(pIam.diretriz_brasileira.includes('SBC'), 'Diretriz de IAM deve citar SBC');

    const pCad = sandbox.obterProtocoloClinico('cetoacidose diabetica');
    assert(pCad, 'Deve encontrar protocolo de CAD');
    assert(pCad.diretriz_brasileira.includes('SBD'), 'Diretriz de CAD deve citar SBD');

    // 2. Validar classificação de intenção para evidência científica
    const rEv1 = sandbox.classificarIntencaoMensagem('Qual a evidência para corticoide no choque séptico?');
    assert.strictEqual(rEv1.intencao, 'EVIDENCIA_MEDICA', 'Deve classificar como EVIDENCIA_MEDICA');

    const rEv2 = sandbox.classificarIntencaoMensagem('pesquisar artigos no pubmed sobre VNI no EAP');
    assert.strictEqual(rEv2.intencao, 'EVIDENCIA_MEDICA', 'Deve classificar busca no PubMed como EVIDENCIA_MEDICA');

    // 3. Validar busca de evidência unificada
    const relatorioEv = sandbox.buscarEvidenciaMedica('choque septico');
    assert(relatorioEv.includes('PMID'), 'Relatório de evidência deve conter PMID');
    assert(relatorioEv.includes('pubmed.ncbi.nlm.nih.gov'), 'Relatório deve conter link para PubMed');

    console.log('OK: Protocolos e bases científicas 100% validados');
    """

    res = subprocess.run(["node", "-e", code], cwd=str(BASE_DIR), capture_output=True, text=True)
    assert res.returncode == 0, res.stderr + "\n" + res.stdout
    assert "OK: Protocolos e bases científicas 100% validados" in res.stdout
