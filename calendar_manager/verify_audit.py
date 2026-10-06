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
    time_min = '2026-08-25T13:40:00-03:00'
    time_max = '2026-09-08T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print(f"Verificando {len(events)} eventos a partir de agora...")
    
    timed_events = []
    for ev in events:
        start_str = ev['start'].get('dateTime')
        end_str = ev['end'].get('dateTime')
        summary = ev.get('summary', '')
        if start_str and end_str:
            s_dt = datetime.strptime(start_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
            e_dt = datetime.strptime(end_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
            timed_events.append((s_dt, e_dt, summary))
            
    # Check for overlaps
    overlaps = []
    for i in range(len(timed_events)):
        for j in range(i + 1, len(timed_events)):
            e1 = timed_events[i]
            e2 = timed_events[j]
            # If same day and overlap
            if e1[0].date() == e2[0].date():
                if max(e1[0], e2[0]) < min(e1[1], e2[1]):
                    overlaps.append((e1, e2))
                    
    # Check for study before 08:00
    early_studies = []
    for e in timed_events:
        summary_l = e[2].lower()
        if 'medquest' in summary_l or 'ingl' in summary_l or 'viol' in summary_l or 'estudo' in summary_l or 'revis' in summary_l:
            if e[0].hour < 8:
                early_studies.append(e)
                
    # Check for activities ending after 22:30
    late_events = []
    for e in timed_events:
        if e[1].hour > 22 or (e[1].hour == 22 and e[1].minute > 30):
            late_events.append(e)
            
    print("\n--- RESULTADO DA AUDITORIA ---")
    print(f"Sobreposições encontradas: {len(overlaps)}")
    for o in overlaps:
        print(f"  [CONFLITO] {o[0][0].strftime('%d/%m %H:%M')}-{o[0][1].strftime('%H:%M')} ({o[0][2]}) com {o[1][0].strftime('%H:%M')}-{o[1][1].strftime('%H:%M')} ({o[1][2]})")
        
    print(f"Estudos antes das 08h: {len(early_studies)}")
    for es in early_studies:
        print(f"  [CEDO] {es[0].strftime('%d/%m %H:%M')} | {es[2]}")
        
    print(f"Eventos após as 22h30: {len(late_events)}")
    for le in late_events:
        print(f"  [TARDE] {le[1].strftime('%d/%m %H:%M')} | {le[2]}")
        
    if not overlaps and not early_studies and not late_events:
        print("\n>>> AUDITORIA PERFEITA! 0 sobreposições, 0 estudos antes das 8h, 0 eventos após 22:30. <<<")

if __name__ == '__main__':
    main()
