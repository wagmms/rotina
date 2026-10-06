"""
Final verification: Read calendar and produce clean summary.
Also identifies remaining all-day task items that should be events.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from datetime import datetime
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')

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
    
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime',
        maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    weekdays_pt = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo']
    
    current_date = None
    all_day_tasks = []
    conflicts = []
    prev_end = None
    prev_summary = None
    
    for event in events:
        summary = event.get('summary', '(sem titulo)')
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        end_str = event['end'].get('dateTime', event['end'].get('date', ''))
        
        if 'T' in start_str:
            date_key = start_str.split('T')[0]
            start_time = start_str.split('T')[1][:5]
            end_time = end_str.split('T')[1][:5] if 'T' in end_str else ''
            time_str = f"{start_time} - {end_time}"
        else:
            date_key = start_str
            time_str = "DIA INTEIRO"
            all_day_tasks.append({'date': date_key, 'summary': summary, 'id': event['id']})
        
        if date_key != current_date:
            current_date = date_key
            dt = datetime.strptime(date_key, '%Y-%m-%d')
            wd = weekdays_pt[dt.weekday()]
            print(f"\n{'='*55}")
            print(f"  {wd.upper()}, {dt.strftime('%d/%m/%Y')}")
            print(f"{'='*55}")
            prev_end = None
            prev_summary = None
        
        # Check for time conflicts within same day
        if 'T' in start_str and prev_end and 'T' in prev_end:
            prev_end_time = prev_end.split('T')[1][:5]
            if start_time < prev_end_time and date_key == prev_end.split('T')[0]:
                conflicts.append(f"  CONFLITO: '{prev_summary}' (ate {prev_end_time}) vs '{summary}' (comeca {start_time}) em {date_key}")
        
        if 'T' in start_str:
            prev_end = end_str
            prev_summary = summary
        
        # Classify and icon
        sl = summary.lower()
        if any(k in sl for k in ['internato', 'plantao', 'upa', 'samu', 'ue']):
            icon = "INTERNATO"
        elif 'academia' in sl or 'treino' in sl:
            icon = "ACADEMIA "
        elif 'medicina' in sl or 'estudos de med' in sl:
            icon = "MEDICINA "
        elif 'namorada' in sl or 'date night' in sl or 'casal' in sl:
            icon = "NAMORADA "
        elif 'ingl' in sl:
            icon = "INGLES   "
        elif 'viol' in sl:
            icon = "VIOLAO   "
        elif 'estudo' in sl or 'pratica' in sl or 'revisao' in sl:
            icon = "TAREFA   "
        else:
            icon = "OUTRO    "
        
        print(f"  [{icon}] {time_str:20s} {summary}")
    
    # Report
    print(f"\n\n{'='*55}")
    print("RELATORIO DE VERIFICACAO")
    print(f"{'='*55}")
    
    print(f"\nTotal de eventos: {len(events)}")
    print(f"Tarefas de dia inteiro: {len(all_day_tasks)}")
    
    if conflicts:
        print(f"\nCONFLITOS ENCONTRADOS ({len(conflicts)}):")
        for c in conflicts:
            print(c)
    else:
        print("\nZero conflitos de horario!")
    
    if all_day_tasks:
        print(f"\nTAREFAS DIA INTEIRO (candidatas a conversao):")
        for t in all_day_tasks:
            print(f"  {t['date']} | {t['summary']}")

if __name__ == '__main__':
    main()
