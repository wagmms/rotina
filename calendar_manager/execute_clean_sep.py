import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# Execution script for September
import sys, io, os, json
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
    return build('calendar', 'v3', credentials=creds)

service = get_service()
time_min = '2026-09-01T00:00:00-03:00'
time_max = '2026-10-01T00:00:00-03:00'

events_result = service.events().list(
    calendarId='primary', timeMin=time_min, timeMax=time_max,
    singleEvents=True, orderBy='startTime', maxResults=1000
).execute()
events = events_result.get('items', [])

print(f'Total existing events in September: {len(events)}')

# Delete non-internato, non-trip mutable events
for ev in events:
    s = ev.get('summary', '')
    sl = s.lower()
    start_str = ev['start'].get('dateTime', ev['start'].get('date'))
    
    # Preserve trips and trash tasks
    if 'stay at' in sl or 'tirar o lixo' in sl:
        continue
    
    # Preserve internato and hospital ambulatory shifts
    if any(k in sl for k in ['internato', 'upa', 'samu', 'plantão', 'ambulatório', 'cse sumarezinho', 'hospital estadual', 'usf paulo gomes']):
        continue
    
    print(f'Deleting mutable event: {start_str} | {s}')
    service.events().delete(calendarId='primary', eventId=ev['id']).execute()

print('Cleanup completed.')
