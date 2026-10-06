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
        calendarId='primary', timeMin='2026-08-17T00:00:00-03:00', timeMax='2026-08-31T00:00:00-03:00',
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print(f"Total eventos 17/08 a 30/08: {len(events)}")
    
    all_day_tasks = []
    
    for event in events:
        summary = event.get('summary', '')
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        
        if 'T' not in start_str:
            all_day_tasks.append((start_str, summary, event.get('description', '')))
            
    print("\nNovas tarefas de Dia Inteiro:")
    for t in all_day_tasks:
        if 'Tirar o lixo' not in t[1] and 'Aniversário' not in t[1]:
            print(f"  {t[0]} | {t[1]}")

if __name__ == '__main__':
    main()
