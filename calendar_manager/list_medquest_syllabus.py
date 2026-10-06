import sys, io, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('medquest_backup_20260825_204451.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

by_sem = {}
for item in data:
    desc = item.get('raw', {}).get('description') or item.get('description') or ''
    summary = item.get('summary', '')
    ical = item.get('raw', {}).get('iCalUID', '')
    match_lec = re.search(r'medquest-lec-(\d+)-(\d+)', ical)
    if match_lec:
        sem = int(match_lec.group(1))
        order = int(match_lec.group(2))
        if sem not in by_sem:
            by_sem[sem] = {}
        if summary not in by_sem[sem]:
            by_sem[sem][summary] = {'desc': desc, 'order': order, 'raw': item}

for s in sorted(by_sem.keys()):
    print(f'=== SEMANA {s} ===')
    for sm, info in sorted(by_sem[s].items(), key=lambda x: x[1]['order']):
        ord_num = info['order']
        print(f'  [{ord_num}] {sm}')
        if info['desc']:
            lines = info['desc'].split('\n')
            print('     ', lines[0])
            if len(lines) > 1:
                print('     ', lines[1])
