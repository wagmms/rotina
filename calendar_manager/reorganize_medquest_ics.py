# coding: utf-8
"""
Reorganização e Inserção do Cronograma MedQuest a partir do ICS:
1. Faz backup e exclui todos os 162 eventos MedQuest anteriores da agenda.
2. Faz o parsing dos tópicos do ICS (/home/wagmoraes/Downloads/medquest_cronograma_2026-09-27.ics).
3. Começa a partir da SEMANA 2 (28/09/2026) até a SEMANA 52.
4. Organiza todos os tópicos estritamente nos períodos livres da rotina (Seg/Qua/Qui à noite, Sex/Sáb de manhã, Dom diurno).
5. Mantém a divisão em [Parte 1: Teoria] e [Parte 2: Questões] para todos os temas.
6. Garante 0 sobreposições com Internato, Academia, Namorada, Violão e Inglês.
"""

import sys
import argparse
import io
import os
import re
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
ICS_PATH = '/home/wagmoraes/Downloads/medquest_cronograma_2026-09-27.ics'
TIMEZONE = 'America/Sao_Paulo'
COLOR_MEDQUEST = '9' # Blueberry / Estudo

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/calendar'])
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def clean_title(raw_summary):
    t = raw_summary.strip()
    for prefix in ['[MedQuest] 📖 ', '[MedQuest] ✍️ ', '[MedQuest] ']:
        if t.startswith(prefix):
            t = t[len(prefix):]
            break
    return t

def parse_ics(filepath):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Arquivo ICS não encontrado: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    events = []
    for block in content.split('BEGIN:VEVENT'):
        if 'END:VEVENT' not in block:
            continue
        ev = {}
        for line in block.split('\n'):
            line = line.strip()
            if ':' in line:
                k = line.split(':', 1)[0].split(';')[0]
                v = line.split(':', 1)[1]
                ev[k] = v
        events.append(ev)

    weeks = defaultdict(list)
    for ev in events:
        desc = ev.get('DESCRIPTION', '').replace(r'\n', '\n')
        m = re.search(r'Semana (\d+)', desc)
        w = int(m.group(1)) if m else -1
        
        carga_m = re.search(r'Carga:\s*([\d\.]+)h\s*\(Teoria:\s*([\d\.]+)h\s*\+\s*Quest[õo]es:\s*([\d\.]+)h\)', desc)
        total_h = float(carga_m.group(1)) if carga_m else 0.0
        teoria_h = float(carga_m.group(2)) if carga_m else 0.0
        questoes_h = float(carga_m.group(3)) if carga_m else 0.0
        
        url = ''
        if 'https://' in desc:
            url_part = desc[desc.index('https://'):]
            url = url_part.split('\n')[0].split(' ')[0]

        summary = ev.get('SUMMARY', '')
        raw_title = clean_title(summary)
        
        esp_m = re.search(r'\(([^\)]+)\)$', raw_title)
        esp = esp_m.group(1) if esp_m else 'Medicina'
        tema = raw_title[:raw_title.rfind('(')].strip() if esp_m else raw_title

        weeks[w].append({
            'week': w,
            'summary': summary,
            'tema': tema,
            'especialidade': esp,
            'teoria_min': max(30, int(round(teoria_h * 60))),
            'questoes_min': max(30, int(round(questoes_h * 60))),
            'teoria_h': teoria_h,
            'questoes_h': questoes_h,
            'total_h': total_h,
            'url': url,
            'dtstart': ev.get('DTSTART', ''),
            'dtend': ev.get('DTEND', '')
        })

    return weeks

def backup_and_delete_medquest(service, dry_run=False):
    print("\n" + "="*70)
    print("ETAPA 1: BACKUP E EXCLUSÃO DE EVENTOS MEDQUEST EXISTENTES")
    print("="*70)
    
    cal_list = service.calendarList().list().execute().get('items', [])
    all_events_to_delete = []
    seen = set()

    for cal in cal_list:
        cid = cal['id']
        cname = cal.get('summary', 'Sem nome')
        is_medquest_cal = 'medquest' in cname.lower()
        
        pt = None
        while True:
            try:
                res = service.events().list(calendarId=cid, pageToken=pt, maxResults=2500).execute()
                for ev in res.get('items', []):
                    eid = ev.get('id')
                    s = ev.get('summary') or ''
                    d = ev.get('description') or ''
                    props = ev.get('extendedProperties', {}).get('private', {})
                    
                    is_mq = (
                        is_medquest_cal
                        or 'medquest' in s.lower()
                        or 'medquest' in d.lower()
                        or 'medquestPlan' in props
                        or 'medquest_sync' in props
                    )
                    
                    if is_mq and (cid, eid) not in seen:
                        seen.add((cid, eid))
                        all_events_to_delete.append({
                            'calendarId': cid,
                            'calendarName': cname,
                            'eventId': eid,
                            'summary': s,
                            'start': ev.get('start', {}),
                            'end': ev.get('end', {}),
                            'raw': ev
                        })
                pt = res.get('nextPageToken')
                if not pt:
                    break
            except Exception as e:
                print(f"Erro ao buscar no calendário {cname}: {e}")
                break

    print(f"Total de eventos MedQuest encontrados para exclusão: {len(all_events_to_delete)}")
    
    backup_file = os.path.join(os.path.dirname(__file__), f"medquest_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(all_events_to_delete, f, ensure_ascii=False, indent=2)
    print(f"✅ Backup de segurança salvo em: {backup_file}")

    if dry_run:
        print(f"[DRY-RUN] Simulação: {len(all_events_to_delete)} eventos seriam apagados.")
        return len(all_events_to_delete)

    del_count = 0
    err_count = 0
    for idx, item in enumerate(all_events_to_delete, 1):
        try:
            service.events().delete(calendarId=item['calendarId'], eventId=item['eventId']).execute()
            del_count += 1
            if del_count % 25 == 0 or del_count == len(all_events_to_delete):
                print(f"  [{del_count}/{len(all_events_to_delete)}] Eventos deletados...")
        except Exception as e:
            err_count += 1
            print(f"  ⚠️ Erro ao deletar {item['summary']}: {e}")

    print(f"✅ Exclusão concluída: {del_count} deletados com sucesso ({err_count} erros).\n")
    return del_count

def build_schedule_events(weeks_data, max_week=52):
    """
    Constrói a grade de estudos sem colisões:
    - Seg: 19:45 às 21:15 (max 90m) -> Teoria 0
    - Qua: 20:00 às 22:00 (120m)    -> Questões 0
    - Qui: 19:45 às 21:15 (max 90m) -> Teoria 1
    - Sex: 08:30 às 10:30 (120m)    -> Questões 1 (Manhã livre de Internato)
    - Sex: 10:45 às 12:45 (120m)    -> Teoria 2 (se 4 temas)
    - Sáb: 08:30 às 10:30/11:30     -> Teoria do tema do fim de semana
    - Sáb: 10:45 às 12:45 (120m)    -> Questões do tema 3 (se 4 temas)
    - Dom: 10:30 às 12:30 (120m)    -> Questões (ajustado p/ 11:15 no dia 27/12)
    """
    schedule = []
    base_monday = datetime(2026, 9, 21) # Semana 1 base
    
    for w in sorted(weeks_data.keys()):
        if w < 2 or w > max_week:
            continue
            
        w_monday = base_monday + timedelta(weeks=w - 1)
        topics = list(weeks_data[w])
        topics.sort(key=lambda x: x['teoria_min']) # Temas com teoria mais curta durante noites de semana
        num = len(topics)
        
        d_seg = (w_monday + timedelta(days=0)).strftime('%Y-%m-%d')
        d_qua = (w_monday + timedelta(days=2)).strftime('%Y-%m-%d')
        d_qui = (w_monday + timedelta(days=3)).strftime('%Y-%m-%d')
        d_sex = (w_monday + timedelta(days=4)).strftime('%Y-%m-%d')
        d_sab = (w_monday + timedelta(days=5)).strftime('%Y-%m-%d')
        d_dom = (w_monday + timedelta(days=6)).strftime('%Y-%m-%d')
        
        # Ajuste específico de evento pessoal já existente (27/12 Aniversário 10-11)
        dom_s = '11:15' if d_dom == '2026-12-27' else '10:30'
        # Ajuste de voo em 11/01/2027 (17:00 às 20:05)
        seg_s = '20:30' if d_seg == '2027-01-11' else '19:45'

        if num == 1:
            t0 = topics[0]
            schedule.append({
                'd': d_seg, 's': seg_s, 'dur': min(t0['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t0['tema']} ({t0['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t0['teoria_h']}h = {t0['teoria_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Teoria: {t0['url']}"
            })
            schedule.append({
                'd': d_qua, 's': '20:00', 'dur': min(t0['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t0['tema']} ({t0['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t0['questoes_h']}h = {t0['questoes_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Questões: {t0['url']}"
            })

        elif num == 2:
            t0, t1 = topics[0], topics[1]
            schedule.append({
                'd': d_seg, 's': seg_s, 'dur': min(t0['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t0['tema']} ({t0['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t0['teoria_h']}h = {t0['teoria_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Teoria: {t0['url']}"
            })
            schedule.append({
                'd': d_qua, 's': '20:00', 'dur': min(t0['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t0['tema']} ({t0['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t0['questoes_h']}h = {t0['questoes_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Questões: {t0['url']}"
            })
            schedule.append({
                'd': d_sab, 's': '08:30', 'dur': min(t1['teoria_min'], 180),
                't': f"[MedQuest] 📖 {t1['tema']} ({t1['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t1['teoria_h']}h = {t1['teoria_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Teoria: {t1['url']}"
            })
            schedule.append({
                'd': d_dom, 's': dom_s, 'dur': min(t1['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t1['tema']} ({t1['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t1['questoes_h']}h = {t1['questoes_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Questões: {t1['url']}"
            })

        elif num == 3:
            t0, t1, t2 = topics[0], topics[1], topics[2]
            schedule.append({
                'd': d_seg, 's': seg_s, 'dur': min(t0['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t0['tema']} ({t0['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t0['teoria_h']}h = {t0['teoria_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Teoria: {t0['url']}"
            })
            schedule.append({
                'd': d_qua, 's': '20:00', 'dur': min(t0['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t0['tema']} ({t0['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t0['questoes_h']}h = {t0['questoes_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Questões: {t0['url']}"
            })
            schedule.append({
                'd': d_qui, 's': '19:45', 'dur': min(t1['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t1['tema']} ({t1['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t1['teoria_h']}h = {t1['teoria_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Teoria: {t1['url']}"
            })
            schedule.append({
                'd': d_sex, 's': '08:30', 'dur': min(t1['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t1['tema']} ({t1['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t1['questoes_h']}h = {t1['questoes_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Questões: {t1['url']}"
            })
            schedule.append({
                'd': d_sab, 's': '08:30', 'dur': min(t2['teoria_min'], 180),
                't': f"[MedQuest] 📖 {t2['tema']} ({t2['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t2['teoria_h']}h = {t2['teoria_min']} min)\nSemana {w} • {t2['especialidade']}\n\n🔗 Teoria: {t2['url']}"
            })
            schedule.append({
                'd': d_dom, 's': dom_s, 'dur': min(t2['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t2['tema']} ({t2['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t2['questoes_h']}h = {t2['questoes_min']} min)\nSemana {w} • {t2['especialidade']}\n\n🔗 Questões: {t2['url']}"
            })

        elif num == 4:
            t0, t1, t2, t3 = topics[0], topics[1], topics[2], topics[3]
            schedule.append({
                'd': d_seg, 's': seg_s, 'dur': min(t0['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t0['tema']} ({t0['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t0['teoria_h']}h = {t0['teoria_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Teoria: {t0['url']}"
            })
            schedule.append({
                'd': d_qua, 's': '20:00', 'dur': min(t0['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t0['tema']} ({t0['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t0['questoes_h']}h = {t0['questoes_min']} min)\nSemana {w} • {t0['especialidade']}\n\n🔗 Questões: {t0['url']}"
            })
            schedule.append({
                'd': d_qui, 's': '19:45', 'dur': min(t1['teoria_min'], 95),
                't': f"[MedQuest] 📖 {t1['tema']} ({t1['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t1['teoria_h']}h = {t1['teoria_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Teoria: {t1['url']}"
            })
            schedule.append({
                'd': d_sex, 's': '08:30', 'dur': min(t1['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t1['tema']} ({t1['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t1['questoes_h']}h = {t1['questoes_min']} min)\nSemana {w} • {t1['especialidade']}\n\n🔗 Questões: {t1['url']}"
            })
            schedule.append({
                'd': d_sex, 's': '10:45', 'dur': min(t2['teoria_min'], 120),
                't': f"[MedQuest] 📖 {t2['tema']} ({t2['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t2['teoria_h']}h = {t2['teoria_min']} min)\nSemana {w} • {t2['especialidade']}\n\n🔗 Teoria: {t2['url']}"
            })
            schedule.append({
                'd': d_dom, 's': dom_s, 'dur': min(t2['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t2['tema']} ({t2['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t2['questoes_h']}h = {t2['questoes_min']} min)\nSemana {w} • {t2['especialidade']}\n\n🔗 Questões: {t2['url']}"
            })
            schedule.append({
                'd': d_sab, 's': '08:30', 'dur': min(t3['teoria_min'], 120),
                't': f"[MedQuest] 📖 {t3['tema']} ({t3['especialidade']}) (Parte 1: Teoria)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Teoria ({t3['teoria_h']}h = {t3['teoria_min']} min)\nSemana {w} • {t3['especialidade']}\n\n🔗 Teoria: {t3['url']}"
            })
            q_start = datetime.strptime('08:30', '%H:%M') + timedelta(minutes=min(t3['teoria_min'], 120) + 15)
            schedule.append({
                'd': d_sab, 's': q_start.strftime('%H:%M'), 'dur': min(t3['questoes_min'], 120),
                't': f"[MedQuest] ✍️ {t3['tema']} ({t3['especialidade']}) (Parte 2: Questões)",
                'c': COLOR_MEDQUEST,
                'desc': f"📚 Carga: Questões ({t3['questoes_h']}h = {t3['questoes_min']} min)\nSemana {w} • {t3['especialidade']}\n\n🔗 Questões: {t3['url']}"
            })

    return schedule

def audit_against_calendar(service, new_events, time_min_str, time_max_str):
    print("\n" + "="*70)
    print("AUDITORIA DE COLISÕES E REGRAS DE ROTINA")
    print("="*70)
    
    events_existing = service.events().list(
        calendarId='primary', timeMin=time_min_str, timeMax=time_max_str,
        singleEvents=True, orderBy='startTime', maxResults=2500
    ).execute().get('items', [])
    
    existing_blocks = []
    for ev in events_existing:
        s = ev.get('summary') or ''
        d = ev.get('description') or ''
        props = ev.get('extendedProperties', {}).get('private', {})
        if 'medquest' in s.lower() or 'medquest' in d.lower() or 'medquestPlan' in props or 'medquest_sync' in props:
            continue
        st = ev['start'].get('dateTime')
        en = ev['end'].get('dateTime')
        if st and en:
            st_dt = datetime.fromisoformat(st)
            en_dt = datetime.fromisoformat(en)
            existing_blocks.append((st_dt, en_dt, s))

    overlaps = []
    late_events = []
    early_events = []

    for item in new_events:
        start_dt = datetime.fromisoformat(f"{item['d']}T{item['s']}:00-03:00")
        end_dt = start_dt + timedelta(minutes=item['dur'])
        
        # Regra 1: Não estudar antes das 08h00
        if start_dt.hour < 8:
            early_events.append((item['d'], item['s'], item['t']))

        # Regra 2: Corte do sono (22:30)
        if (end_dt.hour == 22 and end_dt.minute > 30) or (end_dt.hour > 22 and end_dt.hour < 5):
            late_events.append((item['d'], item['s'], item['t'], end_dt.strftime('%H:%M')))

        # Regra 3: Sobreposições
        if start_dt.isoformat() < time_max_str and end_dt.isoformat() > time_min_str:
            for est, een, esum in existing_blocks:
                if max(start_dt, est) < min(end_dt, een):
                    overlaps.append({
                        'new': (item['d'], item['s'], item['dur'], item['t']),
                        'existing': (est.strftime('%Y-%m-%d %H:%M'), een.strftime('%H:%M'), esum)
                    })

    if overlaps:
        print(f"⚠️ CONFLITOS ENCONTRADOS: {len(overlaps)}")
        for o in overlaps[:10]:
            print(f"  NOVO: {o['new']}")
            print(f"  EXISTENTE: {o['existing']}")
    else:
        print("✅ ZERO COLISÕES DETECTADAS! Todos os blocos estão livres de conflito.")

    if early_events:
        print(f"⚠️ EVENTOS ANTES DAS 08:00: {len(early_events)}")
    else:
        print("✅ HORÁRIO MATUTINO RESPEITADO! Nenhum estudo antes das 08:00.")

    if late_events:
        print(f"⚠️ EVENTOS PASSANDO DO HORÁRIO DE SONO (22:30): {len(late_events)}")
    else:
        print("✅ HORÁRIO DE SONO RESPEITADO! Nenhum evento ultrapassa as 22:30.")

    return len(overlaps) == 0 and len(late_events) == 0 and len(early_events) == 0

def insert_events_to_calendar(service, schedule):
    print("\n" + "="*70)
    print(f"INSERINDO {len(schedule)} BLOCOS DE ESTUDO NO GOOGLE CALENDAR")
    print("="*70)
    
    inserted = 0
    errors = 0
    for idx, item in enumerate(schedule, 1):
        start_dt = datetime.strptime(f"{item['d']} {item['s']}", '%Y-%m-%d %H:%M')
        end_dt = start_dt + timedelta(minutes=item['dur'])
        
        sync_id = f"{item['d']}_{item['s']}_{item['t']}"
        body = {
            'summary': item['t'],
            'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'colorId': item.get('c', COLOR_MEDQUEST),
            'description': item.get('desc', ''),
            'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]},
            'extendedProperties': {
                'private': {
                    'medquest_sync': 'true',
                    'sync_id': sync_id
                }
            }
        }
        
        try:
            service.events().insert(calendarId='primary', body=body).execute()
            inserted += 1
            if inserted % 25 == 0 or inserted == len(schedule):
                print(f"  [{inserted}/{len(schedule)}] Blocos inseridos...")
        except Exception as e:
            errors += 1
            print(f"  ⚠️ Erro ao inserir {item['t']} em {item['d']}: {e}")
            time.sleep(1)

    print(f"\n✅ Concluído com sucesso: {inserted} eventos inseridos ({errors} erros).")
    return inserted

def main():
    parser = argparse.ArgumentParser(description='Organiza o calendário do MedQuest.')
    parser.add_argument('--dry-run', action='store_true', help='Apenas simula a reorganização')
    parser.add_argument('--max-week', type=int, default=52, help='Semana máxima a agendar')
    args = parser.parse_args()

    service = get_service()
    
    # 1. Parse ICS
    weeks_data = parse_ics(ICS_PATH)
    print(f"Arquivo ICS lido com sucesso: {sum(len(v) for v in weeks_data.values())} temas em {len(weeks_data)} semanas.")
    
    # 2. Build Schedule from Week 2 to max_week
    schedule = build_schedule_events(weeks_data, max_week=args.max_week)
    print(f"Cronograma gerado: {len(schedule)} blocos de estudo (Parte 1 e Parte 2) cobrindo as Semanas 2 a {args.max_week}.")
    
    # Save schedule json
    out_json = os.path.join(os.path.dirname(__file__), 'medquest_full_schedule_2026_2027.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(schedule, f, ensure_ascii=False, indent=2)
    print(f"Cronograma salvo em: {out_json}")

    # 3. Audit
    time_min = '2026-09-28T00:00:00-03:00'
    time_max = '2027-10-01T00:00:00-03:00'
    audit_ok = audit_against_calendar(service, schedule, time_min, time_max)
    if not audit_ok:
        print("⚠️ Auditoria reportou inconsistências. Abortando inserção.")
        return

    # 4. Backup & Delete Old MedQuest
    backup_and_delete_medquest(service, dry_run=args.dry_run)

    if args.dry_run:
        print("✨ [DRY-RUN] Simulação concluída com sucesso. Nenhuma alteração foi gravada.")
        return

    # 5. Insert New Schedule
    insert_events_to_calendar(service, schedule)

    print("\n" + "="*70)
    print("PROCESSO FINALIZADO COM SUCESSO!")
    print("="*70)

if __name__ == '__main__':
    main()
