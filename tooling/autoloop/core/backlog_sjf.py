"""
Priorização Inteligente de Backlog (Shortest-Job-First Clínico / WSJF).
Combina Criticidade Clínica, Especificidade Cirúrgica e Estimativa de Esforço
para maximizar o throughput e resolver Quick-Wins Clínicos prioritariamente,
com proteção contra inanição (Aging) e respeito aos contratos de execução.
"""
from pathlib import Path
import re
import json
import os

PALAVRAS_EMERGENCIA_CRITICA = {
    'pcr', 'acls', 'parada', 'sepse', 'choque', 'adrenalina', 'noradrenalina',
    'intubacao', 'via aerea', 'anafilaxia', 'avc', 'dhe', 'potassio', 'toxicidade',
    'pre-eclampsia', 'eclampsia', 'sulfato de magnesio', 'gasometria', 'sala vermelha'
}

PALAVRAS_FARMACO_CONDUTA = {
    'dose', 'posologia', 'prescricao', 'antibiotico', 'insulina', 'glicemia',
    'droga', 'clearance', 'ajuste renal', 'pedb', 'hsl', 'interacao', 'teto'
}

PALAVRAS_CUIDADO_GERAL = {
    'leito', 'sbar', 'passagem', 'soap', 'prontuario', 'ambulatorio',
    'obstetricia', 'pediatria', 'puericultura', 'prenatal', 'geriatria', 'frax'
}


def avaliar_criticidade_clinica(texto):
    """
    Avalia a criticidade e relevância clínica da tarefa:
    - 4.0: Emergência Médica Crítica / ACLS / Sepse / Sala Vermelha
    - 3.0: Farmacologia / Posologia / Prescrição / Tetos Terapêuticos
    - 2.0: Cuidados Gerais / Enfermaria / SBAR / SOAP / Ambulatório
    - 1.0: UI / UX / Infraestrutura / Fastify / Testes Gerais
    """
    if not texto:
        return 1.0
    low = texto.lower()
    
    if any(re.search(r'\b' + re.escape(p) + r'\b', low) for p in PALAVRAS_EMERGENCIA_CRITICA):
        return 4.0
    if any(re.search(r'\b' + re.escape(p) + r'\b', low) for p in PALAVRAS_FARMACO_CONDUTA):
        return 3.0
    if any(re.search(r'\b' + re.escape(p) + r'\b', low) for p in PALAVRAS_CUIDADO_GERAL):
        return 2.0
    return 1.0


def estimar_esforco_job(texto, root=Path('.')):
    """
    Estima o esforço/duração da tarefa para agendamento Shortest-Job-First (SJF).
    Menor pontuação = Job mais curto / mais rápido de executar (Quick-Win).
    Valores retornados: de 0.5 (micro-tarefa cirúrgica) a 5.0 (tarefa ampla/multimodal).
    """
    if not texto:
        return 2.0
    low = texto.lower()
    
    # 1. Detecção de arquivos alvo
    candidatos_arquivos = set(re.findall(r'(?:src|server|scripts|tooling)/[A-Za-z0-9_./-]+\.(?:js|cjs|py)|cockpit_movel\.html', texto))
    qtd_arquivos = len(candidatos_arquivos)
    
    if qtd_arquivos <= 1:
        esforco = 1.0
    elif qtd_arquivos == 2:
        esforco = 1.8
    else:
        esforco = 2.8

    # 2. Especificidade Cirúrgica (Se já tem função e critério identificados, esforço cai drasticamente)
    tem_funcao = bool(re.search(r'(?:função|funcao|método|metodo|componente|seletor)\s+`?([A-Za-z_$][\w$]*)', texto, re.I))
    tem_aceite = bool(re.search(r'(?:critério de aceite|criterio de aceite|comportamento esperado|aceite)', texto, re.I))
    if tem_funcao and tem_aceite:
        esforco -= 0.4
    elif tem_funcao or tem_aceite:
        esforco -= 0.2

    # 3. Complexidade de Domínio / Modos de Execução
    if any(k in low for k in ['audio', 'áudio', 'voz', 'transcricao', 'transcrição', 'multimodal', 'ffmpeg']):
        esforco += 1.2
    if any(k in low for k in ['revisao geral', 'todas as abas', 'refatoracao completa']):
        esforco += 1.5
    if any(k in low for k in ['ajuste', 'conserto pontual', 'botão', 'botao', 'sintaxe', 'typo', 'teto']):
        esforco -= 0.3

    return max(0.5, round(esforco, 2))


def calcular_wsjf_score(texto_tarefa, tentativas=0, posicao_fila=0, is_in_progress=False):
    """
    Calcula o Score Weighted Shortest-Job-First (WSJF) Clínico:
    Score = (Criticidade_Clínica * 1.5 + Especificidade_Cirúrgica) / Esforço_Estimado + Aging + Bônus_Continuidade - Penalidade_Falhas
    """
    criticidade = avaliar_criticidade_clinica(texto_tarefa)
    esforco = estimar_esforco_job(texto_tarefa)
    
    # Especificidade cirúrgica dá bônus de agilidade
    tem_alvo = bool(re.search(r'(?:src|server|scripts|tooling)/[A-Za-z0-9_./-]+\.(?:js|cjs|py)|cockpit_movel\.html', texto_tarefa))
    tem_funcao = bool(re.search(r'(?:função|funcao|método|metodo|componente|seletor)', texto_tarefa, re.I))
    tem_aceite = bool(re.search(r'(?:critério de aceite|criterio de aceite|comportamento esperado|aceite)', texto_tarefa, re.I))
    
    especificidade = 0.0
    if tem_alvo and tem_funcao and tem_aceite:
        especificidade = 1.5
    elif tem_alvo:
        especificidade = 0.8
        
    score_base = (criticidade * 1.5 + especificidade) / esforco
    
    # Aging: tarefas que estão aguardando recebem pequeno incremento para evitar inanição
    aging = min(2.0, posicao_fila * 0.15)
    
    # Continuidade: se já está na seção de Próxima Tarefa em Andamento, tem preferência de não troca
    continuidade = 2.0 if is_in_progress else 0.0
    
    # Penalidade por tentativas anteriores sem aprovação
    penalidade_tentativas = tentativas * 1.2
    
    score_final = score_base + aging + continuidade - penalidade_tentativas
    return round(score_final, 3)


def extrair_tarefas_pendentes_progress(conteudo_progress):
    """
    Faz parsing completo de PROGRESS.md e extrai todas as tarefas pendentes [ ]
    com seu texto integral (incluindo sublinhas estruturadas).
    """
    if not conteudo_progress:
        return []
    
    tarefas = []
    
    # 1. Checa '## 🔄 Próxima Tarefa em Andamento'
    m_andamento = re.search(r'##\s*🔄\s*Próxima Tarefa em Andamento(.*?)(?:##|\Z)', conteudo_progress, re.DOTALL | re.IGNORECASE)
    if m_andamento:
        bloco_andamento = m_andamento.group(1).strip()
        m_item = re.search(r'^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[ \]\s*\*\*.*?(?=(?:^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[|\Z|##|---))', bloco_andamento, re.DOTALL | re.MULTILINE)
        if m_item:
            tarefas.append({
                'id': 'andamento',
                'texto': m_item.group(0).strip(),
                'em_andamento': True,
                'posicao': 0
            })

    # 2. Checa '## 📋 Backlog Prioritário'
    m_backlog = re.search(r'##\s*📋\s*Backlog Prioritário.*?(.*?)(?:##|\Z)', conteudo_progress, re.DOTALL | re.IGNORECASE)
    if m_backlog:
        bloco_backlog = m_backlog.group(1).strip()
        itens = re.finditer(r'^\s*(\d+[A-Za-z]?\.|\-|\*)\s*\[ \]\s*\*\*(.*?)(?=(?:^\s*(?:\d+[A-Za-z]?\.|\-|\*)\s*\[|\Z|##|---))', bloco_backlog, re.DOTALL | re.MULTILINE)
        idx = 1
        for m in itens:
            texto_item = m.group(0).strip()
            # Ignora se for idêntica à tarefa já capturada em andamento
            if tarefas and tarefas[0]['texto'] == texto_item:
                continue
            tarefas.append({
                'id': f'backlog_{idx}',
                'texto': texto_item,
                'em_andamento': False,
                'posicao': idx
            })
            idx += 1

    return tarefas


def selecionar_tarefa_sjf(root=Path('.')):
    """
    Seleciona a próxima tarefa usando o algoritmo Shortest-Job-First Clínico (WSJF).
    Lê o PROGRESS.md, pontua todas as tarefas pendentes elegíveis e retorna o texto da melhor.
    """
    root = Path(root)
    progress_file = root / "PROGRESS.md"
    if not progress_file.is_file():
        return None
        
    try:
        conteudo = progress_file.read_text(encoding="utf-8")
    except Exception:
        return None
        
    candidatas = extrair_tarefas_pendentes_progress(conteudo)
    if not candidatas:
        return None
        
    from loop_guard import task_allowed
    from failure_queue import read_json
    
    state = read_json(root / 'data/.autoloop_failure_queue.json', {})
    items = state.get('items', {}) if isinstance(state.get('items'), dict) else {}
    
    elegiveis = []
    for c in candidatas:
        import hashlib
        key = 'progress-' + hashlib.sha256(c['texto'].encode()).hexdigest()[:12]
        if not task_allowed(key, root):
            continue
            
        tentativas = items.get(key, {}).get('attempts', 0) if isinstance(items.get(key), dict) else 0
        score = calcular_wsjf_score(
            texto_tarefa=c['texto'],
            tentativas=tentativas,
            posicao_fila=c['posicao'],
            is_in_progress=c['em_andamento']
        )
        c['key'] = key
        c['score'] = score
        c['criticidade'] = avaliar_criticidade_clinica(c['texto'])
        c['esforco'] = estimar_esforco_job(c['texto'])
        elegiveis.append(c)
        
    if not elegiveis:
        return None
        
    # Ordena pelo maior score WSJF
    elegiveis.sort(key=lambda x: x['score'], reverse=True)
    return elegiveis[0]['texto']
