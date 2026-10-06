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

print(f'Total events to insert: {len(new_schedule)}')
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
        
    created = service.events().insert(calendarId='primary', body=body).execute()
    count += 1
    t_name = item['t']
    d_str = item['d']
    s_str = item['s']
    e_str = end_dt.strftime('%H:%M')
    print(f'[{count}/{len(new_schedule)}] Created: {d_str} {s_str} - {e_str} | {t_name}')

print('All September events successfully inserted!')
