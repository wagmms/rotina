"""
V2 REORGANIZATION: Strict 22:30 cutoff, full durations, English priority.
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

def create_event(service, summary, date_str, start_time, duration_min, color_id=None):
    start_dt = datetime.strptime(f"{date_str} {start_time}", '%Y-%m-%d %H:%M')
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
    print(f"  [ADD] {start_time}-{end_dt.strftime('%H:%M')} ({duration_min}m) | {summary}")

def main():
    service = get_service()
    
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print("\n[PASSO 1] Limpando eventos anteriores (Medicina, Ingles, Violao)...")
    for event in events:
        summary = event.get('summary', '')
        sl = summary.lower()
        if 'T' not in event['start'].get('dateTime', ''):
            continue
        if 'cirurgia' in sl or 'pratica' in sl.replace('á','a') or 'revisao' in sl.replace('ã','a') or 'pediatria' in sl or 'clinica' in sl.replace('í','i') or 'radiologia' in sl or 'ingl' in sl or 'viol' in sl:
            delete_event(service, event['id'], summary)
            
    # Refresh events after deletion
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print("\n[PASSO 2] Ajustando namorada para corte as 22:30 e inicio na sexta...")
    for event in events:
        summary = event.get('summary', '')
        if 'namorada' in summary.lower() or 'casal' in summary.lower() or 'date' in summary.lower():
            start_str = event['start'].get('dateTime', '')
            end_str = event['end'].get('dateTime', '')
            if not start_str or not end_str:
                continue
                
            date_key = start_str.split('T')[0]
            start_time = start_str.split('T')[1][:5]
            end_dt = datetime.strptime(end_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
            
            modified = False
            
            # Corte as 22:30
            if end_dt.hour == 23 or (end_dt.hour == 22 and end_dt.minute > 30):
                end_dt = end_dt.replace(hour=22, minute=30, second=0)
                event['end']['dateTime'] = end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00')
                modified = True
                print(f"  [MOD] {date_key} - Cortando fim para 22:30")
                
            # Date Night de Sexta (21/08) deve começar 20:15 para dar espaço à revisão
            if date_key == '2026-08-21' and start_time == '19:45':
                new_start = start_str.replace('19:45', '20:15')
                event['start']['dateTime'] = new_start
                modified = True
                print(f"  [MOD] {date_key} - Movendo inicio do Date Night para 20:15")
                
            if modified:
                service.events().update(calendarId='primary', eventId=event['id'], body=event).execute()

    print("\n[PASSO 3] Criando novos eventos com durações totais e Inglês diário...")
    schedule = [
        # SEG 17
        {'d': '2026-08-17', 's': '19:00', 'dur': 90, 't': '📚 Cirurgia Geral - Diverticulite e Abdome Isquemico', 'c': '9'},
        {'d': '2026-08-17', 's': '20:35', 'dur': 45, 't': '📚 Inglês: Listening Ativo', 'c': '3'},
        {'d': '2026-08-17', 's': '21:20', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # TER 18 (Manha/Tarde)
        {'d': '2026-08-18', 's': '09:00', 'dur': 110, 't': '📚 Cirurgia Geral - Apendicite e Colecistite Aguda', 'c': '9'},
        {'d': '2026-08-18', 's': '11:00', 'dur': 110, 't': '📚 Cirurgia Geral - Trauma: Abordagem Inicial (xABCDE)', 'c': '9'},
        {'d': '2026-08-18', 's': '14:00', 'dur': 80, 't': '📚 Prática - Algoritmos de Abdome Agudo', 'c': '9'},
        {'d': '2026-08-18', 's': '15:30', 'dur': 45, 't': '📚 Inglês: Shadowing & Pronúncia', 'c': '3'},
        {'d': '2026-08-18', 's': '16:15', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
        
        # QUA 19
        {'d': '2026-08-19', 's': '19:00', 'dur': 100, 't': '📚 Cirurgia Geral - Trauma Torácico e Abdominal', 'c': '9'},
        {'d': '2026-08-19', 's': '20:45', 'dur': 45, 't': '📚 Inglês: Output Ativo', 'c': '3'},
        {'d': '2026-08-19', 's': '21:30', 'dur': 30, 't': '🎸 Violão: Escalas e Improvisação', 'c': '6'},
        
        # QUI 20
        {'d': '2026-08-20', 's': '09:00', 'dur': 90, 't': '📚 Cirurgia Geral - TCE e Trauma Cervical', 'c': '9'},
        {'d': '2026-08-20', 's': '10:40', 'dur': 90, 't': '📚 Prática - Protocolos xABCDE e Trauma Toracoabdominal', 'c': '9'},
        {'d': '2026-08-20', 's': '14:00', 'dur': 110, 't': '📚 Clínica Médica - Arritmias, Síncope e PCR no Adulto', 'c': '9'},
        {'d': '2026-08-20', 's': '16:00', 'dur': 45, 't': '📚 Inglês: Leitura e Vocabulário', 'c': '3'},
        {'d': '2026-08-20', 's': '16:45', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # SEX 21
        {'d': '2026-08-21', 's': '19:00', 'dur': 70, 't': '📚 Revisão - Abdome Agudo e Isquemia', 'c': '9'},
        # (SCA 110m moved to Saturday)
        
        # SAB 22
        {'d': '2026-08-22', 's': '08:00', 'dur': 110, 't': '📚 Clínica Médica - Síndrome Coronariana Aguda (SCA)', 'c': '9'},
        {'d': '2026-08-22', 's': '10:00', 'dur': 110, 't': '📚 Clínica Médica - Sepse, Choque Séptico e Outros Choques', 'c': '9'},
        {'d': '2026-08-22', 's': '12:00', 'dur': 90, 't': '📚 Clínica Médica - AVC Isquêmico e Hemorrágico', 'c': '9'},
        
        # DOM 23 (Free from study - tasks moved to Seg 24)
        
        # SEG 24
        {'d': '2026-08-24', 's': '09:00', 'dur': 100, 't': '📚 Pediatria - Emergências: PCR, Arritmias e Choque', 'c': '9'},
        {'d': '2026-08-24', 's': '10:50', 'dur': 80, 't': '📚 Prática - ECG e Algoritmos de PCR/SCA', 'c': '9'},
        {'d': '2026-08-24', 's': '14:00', 'dur': 90, 't': '📚 Cirurgia e Clínica - Queimaduras e Intoxicações', 'c': '9'},
        {'d': '2026-08-24', 's': '15:40', 'dur': 100, 't': '📚 Cirurgia Geral - Hemorragia Digestiva Alta e Baixa', 'c': '9'},
        {'d': '2026-08-24', 's': '19:00', 'dur': 45, 't': '📚 Inglês: Fluência e Spoken Review', 'c': '3'},
        {'d': '2026-08-24', 's': '19:45', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
        
        # TER 25
        {'d': '2026-08-25', 's': '09:00', 'dur': 90, 't': '📚 Radiologia - Rádio Explica I (Emergências e Trauma)', 'c': '9'},
        {'d': '2026-08-25', 's': '10:40', 'dur': 80, 't': '📚 Revisão - Trauma Geral e TCE', 'c': '9'},
        {'d': '2026-08-25', 's': '14:00', 'dur': 45, 't': '📚 Inglês: Revisão Semanal', 'c': '3'},
        {'d': '2026-08-25', 's': '14:45', 'dur': 30, 't': '🎸 Violão: Escalas e Improvisação', 'c': '6'},
        
        # QUA 26
        {'d': '2026-08-26', 's': '19:00', 'dur': 80, 't': '📚 Revisão - Emergências Cardiovasculares e PCR', 'c': '9'},
        {'d': '2026-08-26', 's': '20:25', 'dur': 45, 't': '📚 Inglês: Listening Ativo', 'c': '3'},
        {'d': '2026-08-26', 's': '21:10', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # QUI 27
        {'d': '2026-08-27', 's': '09:00', 'dur': 90, 't': '📚 Prática - Manejo de Choque, AVC e Intoxicações', 'c': '9'},
        {'d': '2026-08-27', 's': '10:40', 'dur': 90, 't': '📚 Revisão - Hemorragia Digestiva e Queimaduras', 'c': '9'},
        {'d': '2026-08-27', 's': '14:00', 'dur': 80, 't': '📚 Revisão - Emergências Pediátricas e Radiologia', 'c': '9'},
        {'d': '2026-08-27', 's': '15:30', 'dur': 45, 't': '📚 Inglês: Shadowing & Pronúncia', 'c': '3'},
        {'d': '2026-08-27', 's': '16:15', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
    ]
    
    for ev in schedule:
        create_event(service, ev['t'], ev['d'], ev['s'], ev['dur'], color_id=ev['c'])
        
    print("\n[OK] Tudo recriado com sucesso respeitando o limite das 22:30!")

if __name__ == '__main__':
    main()
