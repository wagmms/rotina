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
    time_min = '2026-08-25T00:00:00-03:00'
    time_max = '2026-09-08T00:00:00-03:00'
    
    cal_list = service.calendarList().list().execute().get('items', [])
    for cal in cal_list:
        print(f"=== CALENDAR: {cal.get('summary')} (ID: {cal['id']}) ===")
        events = service.events().list(
            calendarId=cal['id'], timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy='startTime'
        ).execute().get('items', [])
        for ev in events:
            start = ev['start'].get('dateTime', ev['start'].get('date'))
            end = ev['end'].get('dateTime', ev['end'].get('date'))
            print(f"  [{start} -> {end}] {ev.get('summary')}")

if __name__ == '__main__':
    main()
