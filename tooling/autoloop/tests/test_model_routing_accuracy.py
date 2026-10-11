"""Suíte de validação exaustiva de alocação de modelos e preservação de cota de revisores."""
import subprocess
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'core'))
sys.path.insert(0, str(Path.home() / '.local/lib/autoloop_core'))

import model_router as mr
from scoped_audit import build_scopes, ScopeError


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()


def init_repo(root):
    git(root, 'init', '-q')
    git(root, 'config', 'user.email', 'test@rotina.invalid')
    git(root, 'config', 'user.name', 'Rotina Test')
    (root / 'src').mkdir(exist_ok=True)
    (root / 'server').mkdir(exist_ok=True)
    (root / 'server/controllers').mkdir(parents=True, exist_ok=True)
    (root / 'tests').mkdir(exist_ok=True)

    # Base commit
    (root / 'src/02_soap_ambulatorial.js').write_text('function tratarSoap() { return 1; }\n')
    (root / 'server/controllers/calculadora.controller.js').write_text('function calcCtrl(req, reply) { return reply.send(); }\n')
    (root / 'server/controllers/utils.js').write_text('function verificarPayload() { return true; }\n')
    (root / 'theme.css').write_text('body { margin: 0; }\n')
    (root / 'README.md').write_text('# Rotina\n')
    (root / 'package-lock.json').write_text('{"version": "1.0.0"}\n')
    (root / 'Dockerfile').write_text('FROM node:20-alpine\n')

    git(root, 'add', '.')
    git(root, 'commit', '-qm', 'chore: initial base')
    return git(root, 'rev-parse', 'HEAD')


def commit_all(root, msg):
    git(root, 'add', '.')
    git(root, 'commit', '-qm', msg)
    return git(root, 'rev-parse', 'HEAD')


class TestMatrizModelosEEsforcos:
    """Valida que cada categoria de tarefa recebe o modelo e o nível de raciocínio estritamente adequados."""

    def test_css_cosmetico_aloca_terra_low(self):
        perfil = mr.classificar_alteracoes('style: ajusta espaçamento', ['theme.css'], '+margin: 4px;', 'rotina')
        assert perfil == 'UI_COSMETICO_LEVE'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-5.6-terra'
        assert cfg['effort'] == 'low'

    def test_css_layout_aloca_terra_medium(self):
        perfil = mr.classificar_alteracoes('feat: layout modal cockpit', ['cockpit.css'], '+display: grid;', 'rotina')
        assert perfil == 'UI_LAYOUT_ESTRUTURAL'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-5.6-terra'
        assert cfg['effort'] == 'medium'

    def test_documentacao_pura_aloca_luna_low(self):
        perfil = mr.classificar_alteracoes('docs: atualiza guia de instalação', ['README.md'], '+passo a passo', 'rotina')
        assert perfil == 'DOCUMENTACAO_PADRAO'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-5.6-luna'
        assert cfg['effort'] == 'low'

    def test_dependencias_lockfile_aloca_luna_medium(self):
        perfil = mr.classificar_alteracoes('chore: bump dependencias', ['package-lock.json'], '-v1\n+v2', 'rotina')
        assert perfil == 'ENGENHARIA_DEPENDENCIAS'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-luna'
        assert cfg['effort'] == 'medium'

    def test_controller_fastify_com_calculadora_no_nome_aloca_luna_medium(self):
        # NUNCA deve alocar Astra só porque o nome do arquivo contém 'calculadora'
        perfil = mr.classificar_alteracoes(
            'refactor: simplifica funcoes do controller',
            ['server/controllers/calculadora.controller.js'],
            '+return reply.status(200).send({ ok: true });',
            'rotina'
        )
        assert perfil == 'ENGENHARIA_PADRAO'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-luna'
        assert cfg['effort'] == 'medium'

    def test_infraestrutura_docker_deploy_aloca_luna_high(self):
        perfil = mr.classificar_alteracoes('ci: otimiza dockerfile e deploy render', ['Dockerfile'], '+RUN npm ci', 'rotina')
        assert perfil == 'ARQUITETURA_INFRAESTRUTURA'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-luna'
        assert cfg['effort'] == 'high'

    def test_engenharia_logica_complexa_auth_aloca_sol_high(self):
        perfil = mr.classificar_alteracoes('feat: autenticacao e validacao jwt', ['server/auth.js'], '+jwt.verify(token)', 'rotina')
        assert perfil == 'ENGENHARIA_LOGICA_COMPLEXA'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-sol'
        assert cfg['effort'] == 'high'

    def test_concorrencia_critica_flock_mutex_aloca_sol_xhigh(self):
        perfil = mr.classificar_alteracoes('fix: previne deadlock com fcntl.flock', ['tooling/lock.py'], '+fcntl.flock(fd, LOCK_EX)', 'rotina')
        assert perfil == 'ARQUITETURA_CONCORRENCIA_CRITICA'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-sol'
        assert cfg['effort'] == 'xhigh'

    def test_clinico_geral_aloca_astra_high(self):
        perfil = mr.classificar_alteracoes(
            'fix: ajuste na conduta e dose de amoxicilina',
            ['src/02_soap_ambulatorial.js'],
            '+const doseMgKg = 50;',
            'rotina'
        )
        assert perfil == 'CLINICO_ROBUSTEZ_PRO'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-astra'
        assert cfg['effort'] == 'high'

    def test_clinico_drogas_criticas_aloca_astra_xhigh(self):
        perfil = mr.classificar_alteracoes(
            'fix: dosagem de noradrenalina em choque septico',
            ['src/03_doses_e_calculos.js'],
            '+const noradrenalinaMcgKgMin = 0.5;',
            'rotina'
        )
        assert perfil == 'CLINICO_DROGAS_CRITICAS_EXTRA'
        cfg = mr.selecionar_modelo_auditoria(perfil)
        assert cfg['model'] == 'gpt-6-astra'
        assert cfg['effort'] == 'xhigh'

    def test_bloqueio_comentarios_residencia_gasta_zero_tokens(self):
        perfil = mr.classificar_alteracoes(
            'fix: altera comentarios de residencia medica',
            ['src/02_soap.js'],
            '+novo texto',
            'rotina'
        )
        assert perfil == 'BLOQUEIO_COMENTARIO_RESIDENCIA'
        with pytest.raises(ValueError, match="BLOQUEIO FATAL.*comentários de residência"):
            mr.selecionar_modelo_auditoria(perfil)


class TestIsolamentoEscoposBuildScopes:
    """Valida que build_scopes protege o Astra contra contaminação por backend/infraestrutura."""

    def test_release_misto_isola_controllers_em_luna_e_apenas_src_em_astra(self, tmp_path):
        base = init_repo(tmp_path)

        # Modifica 1 arquivo clínico em src/
        (tmp_path / 'src/02_soap_ambulatorial.js').write_text(
            'function tratarSoap() { verificarPayload(); return 2; }\n'
        )
        # Modifica controladores Fastify em server/controllers/
        (tmp_path / 'server/controllers/calculadora.controller.js').write_text(
            'function calcCtrl(req, reply) { return reply.send({ ok: 1 }); }\n'
        )
        (tmp_path / 'server/controllers/utils.js').write_text(
            'function verificarPayload() { return false; }\n'
        )

        candidate = commit_all(tmp_path, 'refactor: controladores e ajuste soap')

        _, _, scopes = build_scopes(tmp_path, base, candidate, mr.classificar_alteracoes, mr.selecionar_modelo_auditoria)

        clinical_scopes = [s for s in scopes if s['category'] == 'clinical']
        engineering_scopes = [s for s in scopes if s['category'] == 'engineering']

        assert len(clinical_scopes) == 1
        assert len(engineering_scopes) == 1

        # O escopo clínico deve conter EXCLUSIVAMENTE o arquivo médico de src/
        assert clinical_scopes[0]['files'] == ['src/02_soap_ambulatorial.js']
        assert clinical_scopes[0]['config']['model'] == 'gpt-6-astra'
        assert clinical_scopes[0]['config']['effort'] in {'high', 'xhigh'}

        # Os controllers Fastify NUNCA podem ser transferidos para o Astra
        eng_files = engineering_scopes[0]['files']
        assert 'server/controllers/calculadora.controller.js' in eng_files
        assert 'server/controllers/utils.js' in eng_files
        assert engineering_scopes[0]['config']['model'] == 'gpt-6-luna'
        assert engineering_scopes[0]['config']['effort'] == 'medium'

    def test_release_apenas_backend_fastify_nao_chama_astra(self, tmp_path):
        base = init_repo(tmp_path)

        (tmp_path / 'server/controllers/calculadora.controller.js').write_text(
            'function calcCtrl(req, reply) { return reply.send({ version: 2 }); }\n'
        )
        candidate = commit_all(tmp_path, 'refactor: rotina de resposta json')

        _, _, scopes = build_scopes(tmp_path, base, candidate, mr.classificar_alteracoes, mr.selecionar_modelo_auditoria)

        # Nenhum escopo clínico criado; zero tokens de Astra consumidos
        clinical_scopes = [s for s in scopes if s['category'] == 'clinical']
        assert len(clinical_scopes) == 0

        engineering_scopes = [s for s in scopes if s['category'] == 'engineering']
        assert len(engineering_scopes) == 1
        assert engineering_scopes[0]['config']['model'] == 'gpt-6-luna'
        assert engineering_scopes[0]['config']['effort'] == 'medium'
