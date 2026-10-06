import sys, io, os, json
from datetime import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
service = build('calendar', 'v3', credentials=creds)

time_min = '2026-08-31T00:00:00-03:00'
time_max = '2026-11-01T00:00:00-03:00'

events_result = service.events().list(
    calendarId='primary', timeMin=time_min, timeMax=time_max,
    singleEvents=True, orderBy='startTime', maxResults=2500
).execute()
events = events_result.get('items', [])

print('Total events found:', len(events))

internato_events = []
medquest_events = []

for ev in events:
    s = ev.get('summary', '')
    start = ev['start'].get('dateTime', ev['start'].get('date'))
    end = ev['end'].get('dateTime', ev['end'].get('date'))
    sl = s.lower()
    if any(k in sl for k in ['internato', 'usf', 'ambulatório', 'ambulatorio', 'cse', 'hospital', 'upa', 'samu', 'plantão', 'plantao', 'oftalmo', 'otorrino']):
        internato_events.append({'s': s, 'start': start, 'end': end})
    if 'medquest' in sl:
        medquest_events.append({'s': s, 'start': start, 'end': end})

print('\n=== INTERNATO EVENTS ===')
for ev in internato_events:
    print(ev['start'], '-', ev['end'], '|', ev['s'])

print('\n=== OVERLAPS CHECK ===')
overlaps = 0
for m in medquest_events:
    m_start = datetime.fromisoformat(m['start']) if 'T' in m['start'] else None
    m_end = datetime.fromisoformat(m['end']) if 'T' in m['end'] else None
    if not m_start: continue
    for i in internato_events:
        i_start = datetime.fromisoformat(i['start']) if 'T' in i['start'] else None
        i_end = datetime.fromisoformat(i['end']) if 'T' in i['end'] else None
        if not i_start: continue
        if (m_start < i_end) and (m_end > i_start):
            print('OVERLAP DETECTED:')
            print('  MedQuest: ', m['start'], '-', m['end'], '|', m['s'])
            print('  Internato:', i['start'], '-', i['end'], '|', i['s'])
            overlaps += 1

print('\nTotal overlaps between MedQuest and Internato:', overlaps)
