"""
FIX PASS: Corrigir conflitos de horario e remover eventos desnecessarios.
1. Remover Ingles das tercas (18 e 25/08) - dia da namorada
2. Mover Ingles para DEPOIS dos Estudos de Medicina nos demais dias
3. Remover eventos duplicados de Namorada (Katomart) nos fins de semana
"""
import sys
import io
import os
import re
from datetime import datetime, timedelta
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
TIMEZONE = 'America/Sao_Paulo'

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def main():
    service = get_service()
    
    time_min = '2026-08-30T00:00:00-03:00'
    time_max = '2026-12-31T23:59:59-03:00'
    
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    mq_events = []
    fixed_events = []
    for ev in events:
        s = ev.get('summary', '')
        st = ev['start'].get('dateTime')
        et = ev['end'].get('dateTime')
        if not st or not et:
            continue
        if 'MedQuest' in s or '[MedQuest]' in s:
            mq_events.append(ev)
        else:
            fixed_events.append(ev)
            
    print(f"Total MedQuest events: {len(mq_events)}")
    print(f"Total Fixed events: {len(fixed_events)}")
    
    # Analyze by week
    by_week = defaultdict(list)
    for e in mq_events:
        desc = e.get('description', '')
        match = re.search(r'Semana\s+(\d+)', desc)
        w = int(match.group(1)) if match else 0
        by_week[w].append(e)
        
    for w in sorted(by_week.keys()):
        print(f"\n--- SEMANA {w} ({len(by_week[w])} topicos) ---")
        for e in by_week[w]:
            st = e['start'].get('dateTime', '')
            summ = e.get('summary', '')
            d_str = st.split('T')[0]
            print(f"  [{d_str}] {summ}")
        
        # ============================================================
        # FIX 1: Remover Ingles das tercas (18 e 25/08)
        # Dias da namorada nao devem ter ingles
        # ============================================================

    deleted = 0
    moved = 0
    
    for event in events:
        summary = event.get('summary', '')
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        event_id = event['id']
        
        if 'T' not in start_str:
            continue
            
        date_key = start_str.split('T')[0]
        start_time = start_str.split('T')[1][:5]
        
        if date_key in ['2026-08-18', '2026-08-25'] and 'ingl' in summary.lower():
            print(f"  [DEL] Removendo Ingles de terca {date_key}: {summary}")
            try:
                service.events().delete(calendarId='primary', eventId=event_id).execute()
                deleted += 1
            except Exception as e:
                print(f"    ERRO: {e}")
        
        # ============================================================
        # FIX 2: Mover Ingles para depois dos Estudos de Medicina
        # Em dias de internato (17, 19, 21, 26): Medicina 19:00-20:30, Ingles 20:45-21:30
        # Em dias livres (20, 24, 27): Medicina 19:00-21:00, Ingles 21:15-22:00
        # Em sextas com Date Night (21, 28): remover ingles (conflita com date night)
        # ============================================================
        
        # Sextas: remover ingles (date night comeca 19:45)
        if date_key in ['2026-08-21', '2026-08-28'] and 'ingl' in summary.lower():
            print(f"  [DEL] Removendo Ingles de sexta {date_key} (Date Night): {summary}")
            try:
                service.events().delete(calendarId='primary', eventId=event_id).execute()
                deleted += 1
            except Exception as e:
                print(f"    ERRO: {e}")
        
        # Dias de internato (Seg 17, Qua 19, Qua 26): Ingles deve ser 20:45-21:30
        if date_key in ['2026-08-17', '2026-08-19', '2026-08-26'] and 'ingl' in summary.lower():
            if start_time == '19:00':
                print(f"  [MOV] Movendo Ingles {date_key} de 19:00 para 20:45")
                event['start'] = {
                    'dateTime': f'{date_key}T20:45:00',
                    'timeZone': TIMEZONE,
                }
                event['end'] = {
                    'dateTime': f'{date_key}T21:30:00',
                    'timeZone': TIMEZONE,
                }
                try:
                    service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
                    moved += 1
                except Exception as e:
                    print(f"    ERRO: {e}")
        
        # Dias livres (Qui 20, Seg 24, Qui 27): Ingles deve ser 21:15-22:00
        if date_key in ['2026-08-20', '2026-08-24', '2026-08-27'] and 'ingl' in summary.lower():
            if start_time == '19:00':
                print(f"  [MOV] Movendo Ingles {date_key} de 19:00 para 21:15")
                event['start'] = {
                    'dateTime': f'{date_key}T21:15:00',
                    'timeZone': TIMEZONE,
                }
                event['end'] = {
                    'dateTime': f'{date_key}T22:00:00',
                    'timeZone': TIMEZONE,
                }
                try:
                    service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
                    moved += 1
                except Exception as e:
                    print(f"    ERRO: {e}")
        
        # ============================================================
        # FIX 3: Remover duplicatas de Namorada do Katomart nos fins de semana
        # Manter os eventos mais detalhados (com AGENTE-ROTINA ou com descricao longa)
        # Remover os genéricos curtos do Katomart
        # ============================================================
        if date_key in ['2026-08-29', '2026-08-30']:
            desc = event.get('description', '')
            if 'namorada' in summary.lower() and 'AGENTE-ROTINA' in desc:
                print(f"  [DEL] Removendo evento Katomart duplicado {date_key}: {summary}")
                try:
                    service.events().delete(calendarId='primary', eventId=event_id).execute()
                    deleted += 1
                except Exception as e:
                    print(f"    ERRO: {e}")
    
    print(f"\n>> Deletados: {deleted}")
    print(f">> Movidos: {moved}")
    print("Feito!")

if __name__ == '__main__':
    main()
