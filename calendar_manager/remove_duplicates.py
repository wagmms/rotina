"""
Remove duplicate events from Google Calendar.
- Preserves recurring event instances and styled events (with ColorId).
- Enriches the keeper event with descriptions from duplicate if keeper was missing it.
- Safely deletes duplicate copies.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from collections import defaultdict
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

def decide_keeper(ev_list):
    """
    Given a list of duplicate events:
    Returns (keeper, to_delete, updates_for_keeper)
    """
    # 1. Prefer recurring instances
    recurring = [ev for ev in ev_list if ev.get('recurringEventId')]
    if recurring:
        keeper = recurring[0]
    else:
        # 2. Prefer events with custom colorId
        with_color = [ev for ev in ev_list if ev.get('colorId')]
        if with_color:
            keeper = with_color[0]
        else:
            # 3. Older event first
            keeper = sorted(ev_list, key=lambda x: x.get('created', ''))[0]

    to_delete = [ev for ev in ev_list if ev['id'] != keeper['id']]
    
    updates = {}
    
    # 1. Check if any duplicate has a description while keeper doesn't
    keeper_desc = (keeper.get('description') or '').strip()
    if not keeper_desc:
        for ev in to_delete:
            desc = (ev.get('description') or '').strip()
            if desc:
                updates['description'] = desc
                break
                
    # 2. Check if keeper lacks colorId
    keeper_color = keeper.get('colorId')
    if not keeper_color:
        for ev in to_delete:
            color = ev.get('colorId')
            if color:
                updates['colorId'] = color
                break
                
    # 3. Check summary (keep longer/formatted summary if applicable)
    keeper_sum = keeper.get('summary') or ''
    for ev in to_delete:
        s = ev.get('summary') or ''
        if len(s) > len(keeper_sum):
            updates['summary'] = s
            break

    return keeper, to_delete, updates

def main():
    service = get_service()
    
    print("Obtendo todos os eventos do calendário...")
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin='2025-01-01T00:00:00-03:00',
            timeMax='2027-12-31T23:59:59-03:00',
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    print(f"Total de eventos encontrados: {len(events)}")
    
    groups = defaultdict(list)
    for ev in events:
        summary = (ev.get('summary') or '').strip().lower()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(summary, start, end)].append(ev)
        
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Grupos com eventos duplicados: {len(duplicates)}")
    print(f"Total de eventos duplicados para remover: {sum(len(v) - 1 for v in duplicates.values())}\n")
    
    deleted_count = 0
    updated_count = 0
    errors = 0
    
    for (summary, start, end), ev_list in sorted(duplicates.items(), key=lambda x: x[0][1]):
        keeper, to_delete, updates = decide_keeper(ev_list)
        
        start_fmt = start.split('T')[1][:5] if 'T' in start else 'DIA'
        end_fmt = end.split('T')[1][:5] if 'T' in end else 'INTEIRO'
        date_fmt = start.split('T')[0]
        
        # 1. Update keeper if needed
        if updates:
            try:
                service.events().patch(
                    calendarId='primary',
                    eventId=keeper['id'],
                    body=updates
                ).execute()
                print(f"[ATUALIZADO] [{date_fmt} {start_fmt}-{end_fmt}] {keeper.get('summary')} -> metadados mesclados")
                updated_count += 1
            except Exception as e:
                print(f"[ERRO ATUALIZAÇÃO] {keeper['id']}: {e}")
                errors += 1
                
        # 2. Delete redundant duplicates
        for d in to_delete:
            try:
                service.events().delete(
                    calendarId='primary',
                    eventId=d['id']
                ).execute()
                print(f"[REMOVIDO] [{date_fmt} {start_fmt}-{end_fmt}] {d.get('summary')} (ID: {d['id']})")
                deleted_count += 1
            except Exception as e:
                print(f"[ERRO REMOÇÃO] {d['id']}: {e}")
                errors += 1
                
    print("\n" + "="*60)
    print("RELATÓRIO FINAL DE LIMPEZA")
    print("="*60)
    print(f"Eventos duplicados removidos com sucesso: {deleted_count}")
    print(f"Eventos mantidos e atualizados: {updated_count}")
    print(f"Erros encontrados: {errors}")
    print("="*60)

if __name__ == '__main__':
    main()
