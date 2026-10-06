"""
FIX: Remove overlapping Violao and add Ingles/Violao correctly after Medicina.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

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

def delete_event(service, event_id, reason=""):
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        print(f"  [DEL] {reason}")
    except Exception as e:
        print(f"  [ERRO] {reason}: {e}")

def create_event(service, summary, start_dt, duration_min, color_id=None):
    end_dt = start_dt + timedelta(minutes=duration_min)
    
    body = {
        'summary': summary,
        'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
        'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
        'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]},
    }
    if color_id:
        body['colorId'] = color_id
    
    service.events().insert(calendarId='primary', body=body).execute()
    print(f"  [ADD] {start_dt.strftime('%H:%M')}-{end_dt.strftime('%H:%M')} | {summary}")

def main():
    service = get_service()
    
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    # 1. Delete all Violao
    print("\n[PASSO 1] Removendo Violao antigo...")
    for event in events:
        summary = event.get('summary', '')
        if 'viol' in summary.lower():
            delete_event(service, event['id'], summary)
            
    # 2. Find last Medicina event end time for each day
    print("\n[PASSO 2] Encontrando o fim dos Estudos de Medicina...")
    last_medicina = {}
    for event in events:
        summary = event.get('summary', '')
        start_str = event['start'].get('dateTime', '')
        end_str = event['end'].get('dateTime', '')
        
        if not start_str or not end_str:
            continue
            
        if 'medicina' in summary.lower() or 'cirurgia' in summary.lower() or 'pratica' in summary.lower().replace('á', 'a') or 'revisao' in summary.lower().replace('ã', 'a') or 'pediatria' in summary.lower() or 'clinica' in summary.lower().replace('í', 'i') or 'radiologia' in summary.lower():
            date_key = start_str.split('T')[0]
            end_time = datetime.strptime(end_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
            
            if date_key not in last_medicina or end_time > last_medicina[date_key]:
                last_medicina[date_key] = end_time

    # 3. Add Ingles and Violao
    print("\n[PASSO 3] Adicionando Ingles e Violao...")
    
    # Target days
    days = ['2026-08-17', '2026-08-19', '2026-08-20', '2026-08-24', '2026-08-26', '2026-08-27']
    
    topics_ingles = [
        "📚 Inglês: Listening Ativo",
        "📚 Inglês: Shadowing & Pronúncia",
        "📚 Inglês: Output Ativo",
        "📚 Inglês: Leitura e Vocabulário",
        "📚 Inglês: Fluência e Spoken Review",
        "📚 Inglês: Revisão Semanal"
    ]
    
    topics_violao = [
        "🎸 Violão: Mapeamento CAGED",
        "🎸 Violão: Ritmo & Batidas",
        "🎸 Violão: Escalas e Improvisação"
    ]
    
    i_idx = 0
    v_idx = 0
    
    for date_key in days:
        if date_key in last_medicina:
            start_ingles = last_medicina[date_key] + timedelta(minutes=5) # 5 min break
            
            # Add Ingles (45 min)
            create_event(service, topics_ingles[i_idx], start_ingles, 45, color_id='3')
            i_idx = (i_idx + 1) % len(topics_ingles)
            
            # Check if there's time for Violao
            end_ingles = start_ingles + timedelta(minutes=45)
            
            # If it finishes before 23:15, add 30 min of Violao
            if end_ingles.hour < 23 or (end_ingles.hour == 23 and end_ingles.minute <= 15):
                start_violao = end_ingles
                create_event(service, topics_violao[v_idx], start_violao, 30, color_id='6')
                v_idx = (v_idx + 1) % len(topics_violao)
            else:
                print(f"  [SKIP] Violao em {date_key} (muito tarde, fim as {end_ingles.strftime('%H:%M')})")

if __name__ == '__main__':
    main()
