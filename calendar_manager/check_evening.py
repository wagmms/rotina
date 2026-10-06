import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
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
    events_result = service.events().list(
        calendarId='primary',
        timeMin='2026-08-16T00:00:00-03:00',
        timeMax='2026-08-31T00:00:00-03:00',
        singleEvents=True,
        orderBy='startTime',
        maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date', ''))
        if 'T' not in start:
            continue
        summary = event.get('summary', '')
        # Only print evening/night events starting from 18:00
        time = start.split('T')[1][:5]
        if time >= '18:00':
            print(f"{start.split('T')[0]} {time} - {event['end'].get('dateTime').split('T')[1][:5]} | {summary}")

if __name__ == '__main__':
    main()
