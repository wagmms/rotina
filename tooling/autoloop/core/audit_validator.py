"""
audit_validator.py - Módulo Canônico Compartilhado de Validação de Pareceres Codex.
Usado uniformemente por autoloop, deploy.py do MedQuest e qualquer pipeline do ecossistema.
Garante paridade matemática e semântica absoluta entre todos os publicadores.
"""

import re
from typing import Tuple, Dict, Any, Optional

VEREDITOS_VALIDOS = {"pass", "fail", "inconclusive"}
SEVERIDADES_VALIDAS = {"critical", "high", "medium", "low", "info"}
CAMPOS_OBRIGATORIOS_PARECER = ["candidate_sha", "verdict", "summary", "findings", "limitations", "required_followups"]
CAMPOS_OBRIGATORIOS_FINDING = ["file", "line_range", "severity", "description", "failure_scenario"]


def avaliar_parecer_auditoria(dados: Any, sha_esperado: str) -> Tuple[bool, str]:
    """
    Validação canônica em três níveis:
    1. Validação Estrutural e Tipagem Estrita (JSON Schema com additionalProperties: false).
    2. Validação Criptográfica de Identidade (SHA-1/Git 40 hex chars).
    3. Validação Semântica do Veredito (regras de segurança e tolerância zero a limitações).

    Retorna (aprovado: bool, motivo: str).
    """
    # 0. Validação de SHA esperado
    if not sha_esperado or not isinstance(sha_esperado, str) or not re.fullmatch(r'^[0-9a-fA-F]{40}$', sha_esperado.strip()):
        return False, f"sha_esperado obrigatório inválido: '{sha_esperado}'. Deve ser um SHA hexadecimal completo de 40 caracteres."

    sha_esperado_limpo = sha_esperado.strip().lower()

    # 1. Validação Estrutural do Raiz
    if not isinstance(dados, dict) or not dados:
        return False, "Parecer deve ser um dicionário JSON não-vazio."

    # additionalProperties: false no raiz
    chaves_permitidas_raiz = set(CAMPOS_OBRIGATORIOS_PARECER)
    extras_raiz = set(dados.keys()) - chaves_permitidas_raiz
    if extras_raiz:
        return False, f"Parecer contém campos extras não permitidos pelo schema (additionalProperties: false): {sorted(list(extras_raiz))}."

    # Campos obrigatórios presentes e não nulos
    for campo in CAMPOS_OBRIGATORIOS_PARECER:
        if campo not in dados:
            return False, f"Campo obrigatório do schema ausente: '{campo}'."
        if dados[campo] is None:
            return False, f"Campo obrigatório '{campo}' não pode ser nulo."

    if not isinstance(dados["summary"], str) or not dados["summary"].strip():
        return False, "Campo 'summary' deve ser uma string não-vazia."

    if not isinstance(dados["findings"], list):
        return False, "Campo 'findings' deve ser estritamente uma lista."

    if not isinstance(dados["limitations"], list):
        return False, "Campo 'limitations' deve ser estritamente uma lista."

    if not isinstance(dados["required_followups"], list):
        return False, "Campo 'required_followups' deve ser estritamente uma lista."

    # Validação dos itens de limitations e required_followups
    for idx, lim in enumerate(dados["limitations"]):
        if not isinstance(lim, str):
            return False, f"Item {idx+1} de 'limitations' deve ser string, recebido: {type(lim).__name__}."

    for idx, rf in enumerate(dados["required_followups"]):
        if not isinstance(rf, str):
            return False, f"Item {idx+1} de 'required_followups' deve ser string, recebido: {type(rf).__name__}."

    verdict = dados["verdict"]
    if verdict not in VEREDITOS_VALIDOS:
        return False, f"Veredito '{verdict}' não é reconhecido pelo contrato (válidos: {sorted(list(VEREDITOS_VALIDOS))})."

    # Validação estrutural de findings
    chaves_permitidas_finding = set(CAMPOS_OBRIGATORIOS_FINDING)
    for idx, f in enumerate(dados["findings"]):
        if not isinstance(f, dict):
            return False, f"Item {idx+1} de 'findings' não é um objeto válido."

        # additionalProperties: false em finding
        extras_f = set(f.keys()) - chaves_permitidas_finding
        if extras_f:
            return False, f"Item {idx+1} de 'findings' possui campos extras não permitidos: {sorted(list(extras_f))}."

        faltantes_f = chaves_permitidas_finding - set(f.keys())
        if faltantes_f:
            return False, f"Item {idx+1} de 'findings' não contém campos obrigatórios: {sorted(list(faltantes_f))}."

        sev = f.get("severity")
        if sev not in SEVERIDADES_VALIDAS:
            return False, f"Item {idx+1} de 'findings' possui severidade inválida '{sev}' (válidas: {sorted(list(SEVERIDADES_VALIDAS))})."

        if not isinstance(f.get("file"), str) or not f["file"].strip():
            return False, f"Item {idx+1} de 'findings' possui campo 'file' inválido ou vazio."

        if not isinstance(f.get("description"), str) or not f["description"].strip():
            return False, f"Item {idx+1} de 'findings' possui campo 'description' inválido ou vazio."

        # line_range e failure_scenario: devem ser string ou null (None)
        if f.get("line_range") is not None and not isinstance(f["line_range"], str):
            return False, f"Item {idx+1} de 'findings': campo 'line_range' deve ser string ou null, recebido: {type(f['line_range']).__name__}."

        if f.get("failure_scenario") is not None and not isinstance(f["failure_scenario"], str):
            return False, f"Item {idx+1} de 'findings': campo 'failure_scenario' deve ser string ou null, recebido: {type(f['failure_scenario']).__name__}."

    # 2. Validação Criptográfica de Identidade do Candidato
    sha_parecer = str(dados.get("candidate_sha", "")).strip()
    if not re.fullmatch(r'^[0-9a-fA-F]{40}$', sha_parecer):
        return False, f"candidate_sha no parecer ('{sha_parecer}') não é um SHA hexadecimal válido de 40 caracteres."

    if sha_parecer.lower() != sha_esperado_limpo:
        return False, f"Divergência de SHA candidato: parecer avaliou '{sha_parecer}', mas commit a publicar é '{sha_esperado}'."

    # 3. Validação Semântica do Veredito
    if verdict != "pass":
        return False, f"Veredito não aprovado: {verdict}"

    achados_graves = [f for f in dados["findings"] if f.get("severity") in ["critical", "high"]]
    if achados_graves:
        return False, f"Inconsistência detectada: veredito 'pass' contém {len(achados_graves)} achado(s) crítico(s) ou grave(s)."

    if len(dados["required_followups"]) > 0:
        return False, f"Veredito 'pass' possui {len(dados['required_followups'])} verificação(ões) pendente(s) obrigatória(s)."

    # Tolerância zero a limitações declaradas em liberação automática
    if len(dados["limitations"]) > 0:
        return False, f"Liberação automática bloqueada: o parecer contém {len(dados['limitations'])} limitação(ões) declarada(s) que exigem triagem humana."

    return True, "Aprovado sem achados impeditivos."
