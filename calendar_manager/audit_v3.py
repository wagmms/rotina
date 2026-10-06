# coding: utf-8
import sys, io, os, json
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
service = build('calendar', 'v3', credentials=creds)

time_min = '2026-08-31T00:00:00-03:00'
time_max = '2026-10-19T00:00:00-03:00'

events_result = service.events().list(
    calendarId='primary', timeMin=time_min, timeMax=time_max,
    singleEvents=True, orderBy='startTime', maxResults=2500
).execute()
events = events_result.get('items', [])

print(f'=== AUDITORIA COMPLETA V3 DE 31/08 A 18/10 ({len(events)} eventos) ===\n')

by_day = {}
for ev in events:
    start_raw = ev['start'].get('dateTime', ev['start'].get('date'))
    end_raw = ev['end'].get('dateTime', ev['end'].get('date'))
    d_str = start_raw[:10]
    if d_str not in by_day:
        by_day[d_str] = []
    by_day[d_str].append({
        'summary': ev.get('summary', ''),
        'start': start_raw,
        'end': end_raw,
        'id': ev.get('id', '')
    })

overlaps_count = 0
early_study_count = 0
late_event_count = 0

for d_str in sorted(by_day.keys()):
    day_events = by_day[d_str]
    timed_events = [e for e in day_events if 'T' in e['start']]
    timed_events.sort(key=lambda x: x['start'])
    
    for i in range(len(timed_events)):
        ev1 = timed_events[i]
        dt_start1 = datetime.fromisoformat(ev1['start'])
        dt_end1 = datetime.fromisoformat(ev1['end'])
        
        s_lower = ev1['summary'].lower()
        if any(k in s_lower for k in ['medquest', 'inglês', 'ingles', 'violão', 'violao', 'estudo', 'revisão', 'revisao']):
            if dt_start1.hour < 8:
                print('VIOLACAO ESTUDO CEDO:', d_str, ev1['start'], ev1['summary'])
                early_study_count += 1
                
        if dt_end1.hour > 22 or (dt_end1.hour == 22 and dt_end1.minute > 30):
            print('VIOLACAO CORTE NOTURNO:', d_str, ev1['end'], ev1['summary'])
            late_event_count += 1
            
        for j in range(i + 1, len(timed_events)):
            ev2 = timed_events[j]
            dt_start2 = datetime.fromisoformat(ev2['start'])
            dt_end2 = datetime.fromisoformat(ev2['end'])
            
            if dt_start2 < dt_end1:
                print('SOBREPOSICAO em', d_str, ':')
                print('  [1]', ev1['start'][11:16], '-', ev1['end'][11:16], '|', ev1['summary'])
                print('  [2]', ev2['start'][11:16], '-', ev2['end'][11:16], '|', ev2['summary'])
                overlaps_count += 1

print('\n--- RESULTADO DA AUDITORIA ---')
print('Total de Eventos Auditados:', len(events))
print('Sobreposições detectadas:', overlaps_count)
print('Estudos antes das 08h00:', early_study_count)
print('Eventos após as 22h30:', late_event_count)

if overlaps_count == 0 and early_study_count == 0 and late_event_count == 0:
    print('AUDITORIA 100% APROVADA: 0 FALHAS!')
