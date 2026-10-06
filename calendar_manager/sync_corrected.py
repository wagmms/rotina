# coding: utf-8
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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

time_min = '2026-08-31T00:00:00-03:00'
time_max = '2026-10-19T00:00:00-03:00'

events_result = service.events().list(
    calendarId='primary', timeMin=time_min, timeMax=time_max,
    singleEvents=True, orderBy='startTime', maxResults=2500
).execute()
events = events_result.get('items', [])

print('Total events found before clean:', len(events))

deleted = 0
for ev in events:
    s = ev.get('summary', '')
    sl = s.lower()
    
    # Keep trips and trash
    if 'stay at' in sl or 'tirar o lixo' in sl or 'paraty' in sl:
        continue
        
    # Keep internato / hospital ambulatory
    if any(k in sl for k in ['internato', 'upa', 'samu', 'plantão', 'plantao', 'ambulatório', 'ambulatorio', 'cse sumarezinho', 'hospital estadual', 'usf paulo gomes']):
        if 'medquest' not in sl:
            continue
            
    service.events().delete(calendarId='primary', eventId=ev['id']).execute()
    deleted += 1

print('Deleted', deleted, 'mutable events.')

with open('corrected_full_schedule.json', 'r', encoding='utf-8') as f:
    new_schedule = json.load(f)

print('Inserting', len(new_schedule), 'new events...')
count = 0
for item in new_schedule:
    start_dt = datetime.strptime(item['d'] + ' ' + item['s'], '%Y-%m-%d %H:%M')
    end_dt = start_dt + timedelta(minutes=item['dur'])
    
    body = {
        'summary': item['t'],
        'start': {'dateTime': start_dt.isoformat() + '-03:00', 'timeZone': TIMEZONE},
        'end': {'dateTime': end_dt.isoformat() + '-03:00', 'timeZone': TIMEZONE},
        'colorId': item.get('c', '1')
    }
    if 'desc' in item:
        body['description'] = item['desc']
        
    service.events().insert(calendarId='primary', body=body).execute()
    count += 1
    if count % 20 == 0 or count == len(new_schedule):
        print(f'[{count}/{len(new_schedule)}] Inserted...')

print('All 155 events successfully synchronized!')
