# coding: utf-8
"""
Unifica os eventos das Semanas 7 a 50 em um único bloco por tema (sem divisão):
1. Remove os 300 eventos divididos criados a partir de 19/10/2026.
2. Mantém os 28 eventos detalhados das Semanas 3 a 6 (com divisão Parte 1 e Parte 2 intactos).
3. Insere os 150 tópicos das Semanas 7 a 50 como blocos únicos exatamente conforme o ICS.
"""
import sys
import io
import os
import re
import json
import time
from datetime import datetime
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
ICS_PATH = '/home/wagmoraes/Downloads/medquest_cronograma_2026-09-19.ics'
TIMEZONE = 'America/Sao_Paulo'
COLOR_MEDQUEST = '9'

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/calendar'])
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def parse_single_blocks_from_ics(filepath, min_week=7):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    events_by_week = defaultdict(list)
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
        
        desc = ev.get('DESCRIPTION', '').replace(r'\n', '\n')
        m = re.search(r'Semana (\d+)', desc)
        w = int(m.group(1)) if m else -1
        
        if w < min_week:
            continue
            
        dtstart = ev.get('DTSTART', '') # e.g. 20261019T080000
        dtend = ev.get('DTEND', '')
        
        # Convert YYYYMMDDTHHMMSS to YYYY-MM-DDTHH:MM:SS-03:00
        start_iso = f"{dtstart[:4]}-{dtstart[4:6]}-{dtstart[6:8]}T{dtstart[9:11]}:{dtstart[11:13]}:{dtstart[13:15]}-03:00"
        end_iso = f"{dtend[:4]}-{dtend[4:6]}-{dtend[6:8]}T{dtend[9:11]}:{dtend[11:13]}:{dtend[13:15]}-03:00"
        
        events_by_week[w].append({
            'summary': ev.get('SUMMARY', ''),
            'description': desc,
            'start': {'dateTime': start_iso, 'timeZone': TIMEZONE},
            'end': {'dateTime': end_iso, 'timeZone': TIMEZONE},
            'colorId': COLOR_MEDQUEST,
            'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]}
        })
        
    return events_by_week

def main():
    service = get_service()
    
    # 1. Obter e excluir eventos MedQuest de 19/10/2026 em diante
    print("="*70)
    print("ETAPA 1: LOCALIZANDO E REMOVENDO EVENTOS DIVIDIDOS A PARTIR DE 19/10/2026")
    print("="*70)
    
    events_to_delete = []
    pt = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin='2026-10-19T00:00:00-03:00',
            q='medquest',
            pageToken=pt,
            maxResults=2500
        ).execute()
        for ev in res.get('items', []):
            events_to_delete.append(ev)
        pt = res.get('nextPageToken')
        if not pt:
            break
            
    print(f"Total de eventos divididos encontrados para exclusão: {len(events_to_delete)}")
    
    del_count = 0
    err_count = 0
    for idx, ev in enumerate(events_to_delete, 1):
        try:
            service.events().delete(calendarId='primary', eventId=ev['id']).execute()
            del_count += 1
            if del_count % 50 == 0 or del_count == len(events_to_delete):
                print(f"  [{del_count}/{len(events_to_delete)}] Eventos removidos...")
        except Exception as e:
            err_count += 1
            print(f"  Erro ao remover {ev.get('summary')}: {e}")
            
    print(f"✅ Exclusão concluída: {del_count} eventos removidos ({err_count} erros).\n")
    
    # 2. Ler tópicos do ICS como blocos únicos para semanas 7 a 50
    print("="*70)
    print("ETAPA 2: LENDO TÓPICOS EM BLOCO ÚNICO DO ICS (SEMANAS 7 A 50)")
    print("="*70)
    
    weeks_data = parse_single_blocks_from_ics(ICS_PATH, min_week=7)
    total_single_blocks = sum(len(v) for v in weeks_data.values())
    print(f"Total de tópicos em bloco único identificados: {total_single_blocks} tópicos em {len(weeks_data)} semanas.")
    
    # 3. Inserir blocos únicos na agenda
    print("\n" + "="*70)
    print(f"ETAPA 3: INSERINDO {total_single_blocks} BLOCOS ÚNICOS NO GOOGLE CALENDAR")
    print("="*70)
    
    inserted = 0
    errors = 0
    for w in sorted(weeks_data.keys()):
        for ev_body in weeks_data[w]:
            try:
                service.events().insert(calendarId='primary', body=ev_body).execute()
                inserted += 1
                if inserted % 25 == 0 or inserted == total_single_blocks:
                    print(f"  [{inserted}/{total_single_blocks}] Blocos únicos inseridos...")
            except Exception as e:
                errors += 1
                print(f"  Erro ao inserir {ev_body['summary']}: {e}")
                time.sleep(1)
                
    print(f"\n✅ Concluído com sucesso: {inserted} tópicos inseridos em bloco único ({errors} erros).")
    print("="*70)

if __name__ == '__main__':
    main()
