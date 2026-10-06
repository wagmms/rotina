import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
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

def main():
    service = get_service()
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    found_gf = []
    found_gym = []
    for ev in events:
        s = ev.get('summary', '').lower()
        if 'namorada' in s or 'casal' in s or 'date' in s:
            found_gf.append(ev)
        if 'academia' in s or 'gym' in s:
            found_gym.append(ev)
            
    print(f"Namorada/Date Night encontrados: {len(found_gf)}")
    for ev in found_gf:
        print(f" - {ev['start'].get('dateTime', 'ALL DAY')} | {ev.get('summary')}")
        
    print(f"\nAcademia encontrados: {len(found_gym)}")
    for ev in found_gym:
        print(f" - {ev['start'].get('dateTime', 'ALL DAY')} | {ev.get('summary')}")

if __name__ == '__main__':
    main()
