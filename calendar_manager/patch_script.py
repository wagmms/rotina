import re

with open('/home/wagmoraes/Projetos Prog/Rotina/calendar_manager/reorganize_medquest_ics.py', 'r', encoding='utf-8') as f:
    code = f.read()

import_argparse = """
import sys
import argparse
"""
code = code.replace("import sys", import_argparse, 1)

internato_logic = """
ORDEM_TURMA_J = {
    "Ginecologia e Obstetrícia": 1,
    "Cirurgia": 2,
    "Medicina Intensiva": 3,
    "Preventiva": 4,
    "Clínica Médica": 5,
    "Pediatria": 6
}

def get_prioridade_internato(tema):
    for chave, peso in ORDEM_TURMA_J.items():
        if chave in tema:
            return peso
    return 99

def apply_internato_sort(weeks_data):
    all_topics = []
    for w in sorted(weeks_data.keys()):
        for t in weeks_data[w]:
            t['original_week'] = w
            all_topics.append(t)
    
    all_topics.sort(key=lambda t: (get_prioridade_internato(t.get('especialidade', '') + ' ' + t.get('tema', '')), t['original_week']))
    
    new_weeks_data = {}
    week_keys = sorted(weeks_data.keys())
    idx = 0
    for w in week_keys:
        new_weeks_data[w] = []
        for _ in range(len(weeks_data[w])):
            if idx < len(all_topics):
                new_weeks_data[w].append(all_topics[idx])
                idx += 1
    return new_weeks_data
"""

if "ORDEM_TURMA_J" not in code:
    code = code.replace("def get_service():", internato_logic + "\ndef get_service():", 1)

main_replacement = """def main():
    parser = argparse.ArgumentParser(description='Organiza o calendário do MedQuest.')
    parser.add_argument('--mode', choices=['padrao', 'internato'], default='padrao')
    args = parser.parse_args()

    service = get_service()
    
    # 1. Parse ICS
    weeks_data = parse_ics(ICS_PATH)
    print(f"Arquivo ICS lido com sucesso: {sum(len(v) for v in weeks_data.values())} temas em {len(weeks_data)} semanas.")
    
    if args.mode == 'internato':
        print("🔄 Modo INTERNATO ativado: Reordenando aulas para a grade da Turma J...")
        weeks_data = apply_internato_sort(weeks_data)
"""

code = code.replace("""def main():
    service = get_service()
    
    # 1. Parse ICS
    weeks_data = parse_ics(ICS_PATH)
    print(f"Arquivo ICS lido com sucesso: {sum(len(v) for v in weeks_data.values())} temas em {len(weeks_data)} semanas.")""", main_replacement)

with open('/home/wagmoraes/Projetos Prog/Rotina/calendar_manager/reorganize_medquest_ics.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch aplicado com sucesso!")
