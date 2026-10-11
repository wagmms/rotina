"""Política local de auditoria Codex, versão 2.

Catálogo não implica especialização, preço relativo ou garantia de acurácia.
A classificação usa o intervalo completo e o diff; incerteza eleva a revisão.
Somente raízes registradas (incluindo worktrees Git) identificam projetos.
"""
from pathlib import Path
import os
import re
import subprocess
import unicodedata

POLITICA_VERSAO = "2"
# Snapshot das capacidades anunciadas pelo cliente em 2026-10-10.
# Validar novamente ao atualizar o cliente; não implica chamada remota validada.
CATALOGO_MODELOS = {
    "gpt-6-astra": frozenset({"low", "medium", "high", "xhigh", "max", "ultra"}),
    "gpt-6-sol": frozenset({"low", "medium", "high", "xhigh", "max", "ultra"}),
    "gpt-6-luna": frozenset({"low", "medium", "high", "xhigh", "max"}),
    "gpt-5.6-sol": frozenset({"low", "medium", "high", "xhigh", "max", "ultra"}),
    "gpt-5.6-terra": frozenset({"low", "medium", "high", "xhigh", "max", "ultra"}),
    "gpt-5.6-luna": frozenset({"low", "medium", "high", "xhigh", "max"}),
}
PROJETOS_REGISTRADOS = {
    Path.home() / "Projetos IA" / "Rotina": "rotina",
    Path.home() / "Projetos IA" / "MedQuest": "medquest",
    Path.home() / "Projetos IA" / "Habitflow": "habitflow",
}
PROJETOS_CLINICOS = {"rotina", "medquest"}
MAX_DIFF_CHARS = 40000
TERMOS_CLINICOS = (
    "dose", "doses", "dosagem", "infusao", "clinico", "clinica", "posologia",
    "droga", "medicamento", "prescricao", "diluicao", "conduta", "antibiotico",
    "pediatrico", "pediatria", "renal", "hemodinamica", "gasometria", "remume",
    "farmaco", "farmacologia", "gabarito", "enare", "revalida", "diagnostico",
    "terapeutica", "insulina", "dose", "dosage", "infusion", "dilution", "mg/kg",
    "mcg/kg", "ug/kg", "ml/h", "calculadora", "calculadoras", "protocolos",
)
TERMOS_CRITICOS = (
    "noradrenalina", "adrenalina", "norepinephrine", "epinephrine", "vasoativa",
    "dva", "milrinona", "dobutamina", "vasopressina", "sulfato de magnesio",
    "mgso4", "potassio", "kcl", "trombolise", "alteplase", "tenecteplase",
    "intubacao", "sedacao", "bloqueio neuromuscular", "toxicidade aguda",
)
TERMOS_CONCORRENCIA = (
    "lock", "flock", "fcntl", "mutex", "deadlock", "race condition",
    "concorrencia", "concurrency", "synchronized", "begin immediate",
    "select for update", "transacao distribuida", "distributed transaction",
)
TERMOS_COMENTARIOS_RESIDENCIA_COMMIT = (
    "comentario de residencia", "comentarios de residencia",
    "comentario da questao", "comentarios das questoes",
    "comentario de questao", "comentarios de questoes",
    "gabarito comentado", "gabaritos comentados",
    "comentario do professor", "comentarios dos professores",
    "revisao de gabarito", "revisar gabarito",
)
TERMOS_COMENTARIOS_RESIDENCIA_DIFF = (
    "update explanations", "set explanation_text", "insert into explanations",
    "delete from explanations", "comentario de residencia",
    "comentarios de residencia", "comentario do professor",
    "comentarios dos professores",
)
EXTENSOES_ESTILO = {".css", ".scss", ".sass", ".less"}
LOCKFILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "uv.lock",
             "poetry.lock", "cargo.lock", "composer.lock", "gemfile.lock"}
ROTAS = {
    "UI_COSMETICO_LEVE": ("gpt-5.6-terra", "low", "Estilo estático verificado pelo diff."),
    "UI_LAYOUT_ESTRUTURAL": ("gpt-5.6-terra", "medium", "Layout em arquivos de estilo."),
    "DOCUMENTACAO_PADRAO": ("gpt-5.6-luna", "low", "Documentação sem indício clínico — modelo leve para máxima economia de cota."),
    "ENGENHARIA_DEPENDENCIAS": ("gpt-6-luna", "medium", "Dependências e lockfiles auditados com economia de cota via Luna."),
    "ENGENHARIA_PADRAO": ("gpt-6-luna", "medium", "Engenharia geral de alto volume via Luna; preserva cota semanal."),
    "ENGENHARIA_LOGICA_COMPLEXA": ("gpt-6-sol", "high", "Autenticação ou lógica complexa."),
    "ARQUITETURA_INFRAESTRUTURA": ("gpt-6-luna", "high", "Infraestrutura e deploy auditados via Luna com alto raciocínio."),
    "ARQUITETURA_CONCORRENCIA_CRITICA": ("gpt-6-sol", "xhigh", "Concorrência requer revisão aprofundada."),
    "CLINICO_ROBUSTEZ_PRO": ("gpt-6-astra", "high", "Impacto clínico possível ou escopo incerto."),
    "CLINICO_DROGAS_CRITICAS_EXTRA": ("gpt-6-astra", "xhigh", "Conteúdo clínico crítico; exige validação independente."),
}


def normalizar(texto):
    # Separa camelCase antes de remover diacríticos e pontuação.
    texto = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(texto))
    texto = unicodedata.normalize("NFKD", texto).casefold()
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+", texto))


def contem_termo(texto, termos):
    normal = " " + normalizar(texto) + " "
    return any(" " + normalizar(t) + " " in normal for t in termos)


def _git(repo, *args):
    res = subprocess.run(["git", *args], cwd=repo, capture_output=True,
                         text=True, check=False, timeout=15)
    if res.returncode != 0:
        raise ValueError("Não foi possível determinar o escopo Git completo.")
    return res.stdout


def identificar_projeto(repo_dir=None):
    """Identidade por raiz exata registrada; nunca por substring ou package.json."""
    caminho = Path(repo_dir or os.getcwd()).resolve()
    roots = {Path(p).resolve(): nome for p, nome in PROJETOS_REGISTRADOS.items()}
    # Consulta a raiz Git primeiro para não herdar identidade de um repo aninhado.
    try:
        raiz_git = Path(_git(caminho, "rev-parse", "--show-toplevel").strip()).resolve()
        if raiz_git in roots:
            return roots[raiz_git]
        comum = _git(caminho, "rev-parse", "--git-common-dir").strip()
        if comum:
            comum = (caminho / comum).resolve()
            for raiz, nome in roots.items():
                if comum == (raiz / ".git").resolve():
                    return nome
        return "desconhecido"
    except (OSError, ValueError, subprocess.SubprocessError):
        # Uma raiz registrada continua identificada se Git estiver indisponível.
        return roots.get(caminho, "desconhecido")


def eh_projeto_habitflow(repo_dir=None):
    return identificar_projeto(repo_dir) == "habitflow"


def _incerto(projeto):
    return "ARQUITETURA_INFRAESTRUTURA" if projeto == "habitflow" else "CLINICO_ROBUSTEZ_PRO"


def classificar_alteracoes(commits, arquivos, diff, projeto="desconhecido"):
    """Classifica contexto completo já extraído. Nunca usa prefixo ui: como prova."""
    if projeto not in {*PROJETOS_CLINICOS, "habitflow", "desconhecido"}:
        raise ValueError("Identidade de projeto inválida.")
    if not arquivos or not diff.strip() or len(diff) > MAX_DIFF_CHARS:
        return _incerto(projeto)
    # Linhas removidas também são relevantes: apagar uma proteção é uma mudança.
    texto = "\n".join([commits, *arquivos, diff])
    if contem_termo(commits, TERMOS_COMENTARIOS_RESIDENCIA_COMMIT) or contem_termo(diff, TERMOS_COMENTARIOS_RESIDENCIA_DIFF):
        return "BLOQUEIO_COMENTARIO_RESIDENCIA"
    # Binários, symlinks e mudanças de modo não são automaticamente cosméticos.
    if any(s in diff for s in ("Binary files ", "GIT binary patch", "old mode ",
                                "new mode ", "120000", "160000")):
        return _incerto(projeto)
    estilos = all(Path(a).suffix.lower() in EXTENSOES_ESTILO for a in arquivos)
    docs = all(Path(a).suffix.lower() in {".md", ".txt", ".rst"} for a in arquivos)
    # Mesmo CSS pode carregar comportamento via conteúdo gerado/recursos externos.
    estilo_ativo = contem_termo(diff, ("content", "url", "import", "expression", "javascript"))
    if estilos and not estilo_ativo:
        return "UI_LAYOUT_ESTRUTURAL" if contem_termo(commits, ("layout", "modal", "menu")) else "UI_COSMETICO_LEVE"
    if docs:
        if contem_termo(diff, TERMOS_CRITICOS):
            return "CLINICO_DROGAS_CRITICAS_EXTRA" if projeto != "habitflow" else "ENGENHARIA_PADRAO"
        if projeto == "medquest":
            return "ENGENHARIA_PADRAO"
        return "DOCUMENTACAO_PADRAO"
    # Não confundir package-lock.json e similares com locks de processos.
    if all(Path(a).name.lower() in LOCKFILES for a in arquivos):
        return "ENGENHARIA_DEPENDENCIAS"

    # Arquivos puramente de backend HTTP, controladores Fastify, testes ou ferramentas
    # não são fontes clínicas de beira-leito; seus caminhos não devem contaminar a busca de termos clínicos.
    arquivos_busca_clinica = [
        a for a in arquivos
        if not (a.startswith(('server/controllers/', 'server/routes/', 'server/plugins/', 'server/validators/', 'tests/', 'tooling/', 'scripts/')) or a in {'server/index.js', 'server.js'})
    ]
    texto_clinico = "\n".join([commits, *arquivos_busca_clinica, diff])

    # Projetos clínicos escalam para o Astra apenas quando o diff, commit ou fonte clínica contiverem termos médicos reais.
    if projeto != "habitflow":
        if contem_termo(texto_clinico, TERMOS_CRITICOS):
            return "CLINICO_DROGAS_CRITICAS_EXTRA"
        if contem_termo(texto_clinico, TERMOS_CLINICOS):
            return "CLINICO_ROBUSTEZ_PRO"

    texto_sem_lockfiles = "\n".join(
        linha for linha in texto.splitlines()
        if not any(nome in linha.lower() for nome in LOCKFILES)
    )
    if contem_termo(texto_sem_lockfiles, TERMOS_CONCORRENCIA):
        return "ARQUITETURA_CONCORRENCIA_CRITICA"
    if contem_termo(texto, ("docker", "dockerfile", "deploy", "build master", "sync db",
                           "render yaml", "pipeline", "infraestrutura", "terraform", "gradle")):
        return "ARQUITETURA_INFRAESTRUTURA"
    if contem_termo(texto, ("algoritmo", "auth", "jwt", "migracao", "refatoracao ampla")):
        return "ENGENHARIA_LOGICA_COMPLEXA"
    return "ENGENHARIA_PADRAO"


def classificar_perfil_release(base_sha=None, candidate_sha=None, repo_dir=None):
    """Lê o range exato; sem base só aceita histórico com um único commit."""
    cwd = repo_dir or os.getcwd()
    projeto = identificar_projeto(cwd)
    try:
        # Refs são resolvidas uma vez, com proteção contra argumentos/opções.
        def resolver(ref):
            return _git(cwd, "rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}").strip()
        candidato = resolver(candidate_sha or "HEAD")
        if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", candidato):
            return _incerto(projeto)
        if base_sha:
            base = resolver(base_sha)
            if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", base) or base == candidato:
                return _incerto(projeto)
            _git(cwd, "merge-base", "--is-ancestor", base, candidato)
            intervalo = f"{base}..{candidato}"
            commits = _git(cwd, "log", "--format=%s %b", intervalo, "--")
            arquivos = _git(cwd, "diff", "--no-ext-diff", "--no-textconv", "--name-only", "-z", intervalo, "--").split("\0")
            diff = _git(cwd, "diff", "--no-ext-diff", "--no-textconv", "--no-color", "--unified=5", intervalo, "--")
        else:
            if _git(cwd, "rev-list", "--count", candidato, "--").strip() != "1":
                return _incerto(projeto)
            commits = _git(cwd, "log", "-1", "--format=%s %b", candidato, "--")
            arquivos = _git(cwd, "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", candidato, "--").split("\0")
            diff = _git(cwd, "show", "--root", "--format=", "--no-ext-diff", "--no-textconv", "--no-color", "--unified=5", candidato, "--")
        return classificar_alteracoes(commits, [a for a in arquivos if a], diff, projeto)
    except (OSError, ValueError, subprocess.SubprocessError):
        return _incerto(projeto)


def validar_configuracao_modelo(modelo, effort):
    if modelo not in CATALOGO_MODELOS or effort not in CATALOGO_MODELOS[modelo]:
        raise ValueError(f"Modelo/esforço não suportado pelo catálogo local: {modelo}/{effort}")


def selecionar_modelo_auditoria(perfil_tarefa, repo_dir=None):
    if perfil_tarefa == "BLOQUEIO_COMENTARIO_RESIDENCIA":
        raise ValueError(
            "BLOQUEIO FATAL: Tentativa de alteração em comentários de residência médica detectada. "
            "Comentários elaborados por professores são canônicos e congelados. "
            "É terminantemente proibido gastar tokens de Gemini ou GPT revisando esses comentários."
        )
    if perfil_tarefa not in ROTAS:
        raise ValueError(f"Perfil de auditoria desconhecido: {perfil_tarefa!r}")
    modelo, effort, motivo = ROTAS[perfil_tarefa]
    if modelo == "gpt-6-astra" and eh_projeto_habitflow(repo_dir):
        modelo, effort = "gpt-6-sol", "xhigh"
        motivo = "Política explícita do HabitFlow: revisão aprofundada sem Astra."
    validar_configuracao_modelo(modelo, effort)
    return {"model": modelo, "effort": effort, "tier": perfil_tarefa,
            "justificativa": motivo, "policy_version": POLITICA_VERSAO}
