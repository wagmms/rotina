import sys, io, json, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

targets = [
    'Taquiarritmias', 'Abdome Agudo Inflamatório', 'Assistência Pré-Natal',
    'Abdome Agudo Obstrutivo', 'Rastreamento Citopatológico', 'Cardiopatias Congênitas',
    'Insuficiência Cardíaca', 'Atendimento Inicial ao Politraumatizado', 'Diabetes Gestacional',
    'Síndromes Coronarianas Agudas', 'Litíase Biliar', 'Arritmias, Síncope e Parada Cardiorrespiratória Pediátrica',
    'Estudos Epidemiológicos', 'Dermatologia Clínica', 'Síndromes Hipertensivas na Gravidez',
    'Cirurgia Bariátrica', 'Dermatoses Infecciosas', 'Diarreia Aguda'
]

found = {}
for f_name in glob.glob('medquest_backup_*.json'):
    with open(f_name, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for item in data:
        s = item.get('summary', '')
        desc = item.get('raw', {}).get('description') or item.get('description') or ''
        if '📖' in s:
            for t in targets:
                if t.lower() in s.lower() and t not in found and desc:
                    found[t] = {'summary': s, 'desc': desc, 'raw': item}

print(f'Found {len(found)} / {len(targets)} exact target topics:')
for k in targets:
    if k in found:
        v = found[k]
        sm = v['summary']
        print(f'[{k}] -> {sm}')
        lines = v['desc'].split('\n') if v['desc'] else []
        for l in lines[:3]:
            print('   ', l)
    else:
        print(f'[{k}] -> NOT FOUND')
