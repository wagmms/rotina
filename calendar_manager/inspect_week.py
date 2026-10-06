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

def main():
    service = get_service()
    time_min = '2026-08-28T00:00:00-03:00'
    time_max = '2026-10-05T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=1000
    ).execute()
    events = events_result.get('items', [])
    
    print(f"Total events found (28/08 a 05/10): {len(events)}")
    days = {}
    for ev in events:
        start = ev['start'].get('dateTime', ev['start'].get('date'))
        end = ev['end'].get('dateTime', ev['end'].get('date'))
        summary = ev.get('summary', '(No title)')
        if 'T' in start:
            d = start.split('T')[0]
            st = start.split('T')[1][:5]
            et = end.split('T')[1][:5] if 'T' in end else ''
            if d not in days:
                days[d] = []
            days[d].append({'s': st, 'e': et, 't': summary})
            
    for d in sorted(days.keys())[:14]:
        print(f"\n--- {d} ---")
        for ev in days[d]:
            print(f"  {ev['s']} - {ev['e']} | {ev['t']}")

if __name__ == '__main__':
    main()
