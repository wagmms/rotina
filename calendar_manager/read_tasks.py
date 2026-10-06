"""
Read all-day task descriptions to understand time requirements,
then convert them into timed events and delete generic Medicina + Inglês events.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from datetime import datetime
from collections import defaultdict
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
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime',
        maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print("=" * 70)
    print("TAREFAS DE DIA INTEIRO — DESCRICOES COMPLETAS")
    print("=" * 70)
    
    for event in events:
        summary = event.get('summary', '')
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        
        # Only all-day events that are study tasks
        if 'T' in start_str:
            continue
        
        # Skip non-study tasks
        sl = summary.lower()
        if not any(k in sl for k in ['estudo', 'pratica', 'prática', 'revisao', 'revisão']):
            continue
        
        desc = event.get('description', '(sem descricao)')
        event_id = event['id']
        
        print(f"\n{'─'*70}")
        print(f"DATA: {start_str}")
        print(f"TITULO: {summary}")
        print(f"ID: {event_id}")
        print(f"DESCRICAO:")
        print(desc)

if __name__ == '__main__':
    main()
