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
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    for ev in events:
        s = ev.get('summary', '').lower()
        if 'academia' in s or 'gym' in s:
            start_str = ev['start'].get('dateTime')
            if start_str:
                # O inicio ja e 17:30. Precisamos colocar o fim para +90min.
                start_dt = datetime.strptime(start_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
                end_dt = start_dt + timedelta(minutes=90)
                
                ev['end']['dateTime'] = end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00')
                service.events().update(calendarId='primary', eventId=ev['id'], body=ev).execute()
                print(f"  [MOD] {start_dt.strftime('%Y-%m-%d')} - Academia alterada para 17:30 as 19:00 (1h30min)")

if __name__ == '__main__':
    main()
