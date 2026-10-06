"""
Read all Google Calendar events for the next 2 weeks.
Shows existing events to understand the internato schedule and current state.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import os
from datetime import datetime, timedelta, timezone
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
CREDS_PATH = os.path.join(os.path.dirname(__file__), 'credentials.json')

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
        else:
            raise Exception("Token invalid and no refresh token available. Re-authenticate.")
    return creds

def main():
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    
    # Time range: today to 2 weeks from now
    now = datetime(2026, 8, 16, 0, 0, 0)
    time_min = now.isoformat() + '-03:00'
    time_max = (now + timedelta(days=15)).isoformat() + '-03:00'  # Through Aug 30
    
    print(f"=== GOOGLE CALENDAR EVENTS: {now.strftime('%d/%m')} - {(now + timedelta(days=14)).strftime('%d/%m/%Y')} ===\n")
    
    # List all calendars first
    calendar_list = service.calendarList().list().execute()
    print("--- Calendários disponíveis ---")
    for cal in calendar_list.get('items', []):
        print(f"  [{cal['id'][:30]}...] {cal.get('summary', 'Sem nome')} (primary={cal.get('primary', False)})")
    print()
    
    # Get events from primary calendar
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime',
        maxResults=200
    ).execute()
    
    events = events_result.get('items', [])
    
    if not events:
        print("Nenhum evento encontrado no período.")
        return
    
    current_date = None
    for event in events:
        start = event['start'].get('dateTime', event['start'].get('date'))
        end = event['end'].get('dateTime', event['end'].get('date'))
        summary = event.get('summary', '(Sem título)')
        description = event.get('description', '')
        event_id = event.get('id', '')
        
        # Parse date for grouping
        if 'T' in start:
            event_date = start.split('T')[0]
            start_time = start.split('T')[1][:5]
            end_time = end.split('T')[1][:5] if 'T' in end else ''
            time_str = f"{start_time} - {end_time}"
        else:
            event_date = start
            time_str = "Dia inteiro"
        
        # Print date header
        if event_date != current_date:
            current_date = event_date
            # Parse and format nicely
            dt = datetime.strptime(event_date, '%Y-%m-%d')
            weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
            weekday = weekdays[dt.weekday()]
            print(f"\n{'='*60}")
            print(f"📅 {weekday}, {dt.strftime('%d/%m/%Y')}")
            print(f"{'='*60}")
        
        # Classify event type
        summary_lower = summary.lower()
        if any(kw in summary_lower for kw in ['internato', 'plantão', 'estágio', 'rodízio', 'ambulatório', 'cirurgia', 'clínica', 'hospital']):
            icon = "🏥"
        elif any(kw in summary_lower for kw in ['academia', 'treino', 'gym']):
            icon = "🏋️"
        elif any(kw in summary_lower for kw in ['estudo', 'medicina', 'prova', 'revisão']):
            icon = "📚"
        elif any(kw in summary_lower for kw in ['namorada', 'date', 'casal']):
            icon = "❤️"
        elif any(kw in summary_lower for kw in ['inglês', 'english']):
            icon = "🇬🇧"
        elif any(kw in summary_lower for kw in ['violão', 'guitar']):
            icon = "🎸"
        else:
            icon = "📌"
        
        desc_preview = description[:80].replace('\n', ' ') if description else ''
        print(f"  {icon} [{time_str}] {summary}")
        if desc_preview:
            print(f"     └─ {desc_preview}")
        print(f"     ID: {event_id}")
    
    # Also check other calendars for internato events
    print(f"\n\n{'='*60}")
    print("🔍 Verificando TODOS os calendários por eventos de internato...")
    print(f"{'='*60}")
    
    for cal in calendar_list.get('items', []):
        cal_id = cal['id']
        cal_name = cal.get('summary', 'Sem nome')
        if cal.get('primary'):
            continue  # Already checked
        
        try:
            events_result = service.events().list(
                calendarId=cal_id,
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime',
                maxResults=100
            ).execute()
            
            cal_events = events_result.get('items', [])
            if cal_events:
                print(f"\n📋 Calendário: {cal_name}")
                for event in cal_events:
                    start = event['start'].get('dateTime', event['start'].get('date'))
                    end = event['end'].get('dateTime', event['end'].get('date'))
                    summary = event.get('summary', '(Sem título)')
                    
                    if 'T' in start:
                        start_time = start.split('T')[1][:5]
                        end_time = end.split('T')[1][:5] if 'T' in end else ''
                        time_str = f"{start_time} - {end_time}"
                    else:
                        time_str = "Dia inteiro"
                    
                    print(f"  [{time_str}] {summary}")
        except Exception as e:
            print(f"  ⚠️ Erro ao ler {cal_name}: {e}")

if __name__ == '__main__':
    main()
