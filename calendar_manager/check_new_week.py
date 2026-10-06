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
    
    events_result = service.events().list(
        calendarId='primary', timeMin='2026-08-24T00:00:00-03:00', timeMax='2026-09-08T00:00:00-03:00',
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print(f"Total eventos encontrados: {len(events)}")
    
    all_day_tasks = []
    
    for event in events:
        summary = event.get('summary', '')
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        
        if 'T' not in start_str:
            if 'Tirar o lixo' not in summary and 'Aniversário' not in summary and 'Stay at Casa' not in summary:
                desc = event.get('description', '')
                all_day_tasks.append((start_str, summary, desc))
            
    print("\nNovas tarefas de Dia Inteiro:")
    for t in all_day_tasks:
        print(f"  {t[0]} | {t[1]}")

if __name__ == '__main__':
    main()
