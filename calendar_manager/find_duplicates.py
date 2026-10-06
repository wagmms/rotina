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
    
    time_min = '2026-08-01T00:00:00-03:00'
    time_max = '2026-10-01T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime',
        maxResults=1000
    ).execute()
    
    events = events_result.get('items', [])
    
    groups = defaultdict(list)
    for ev in events:
        summary = ev.get('summary', '').strip()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        key = (summary.lower(), start, end)
        groups[key].append(ev)
        
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    
    with open('calendar_manager/duplicates_report.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total events found: {len(events)}\n")
        f.write(f"Total duplicate groups: {len(duplicates)}\n")
        f.write(f"Total duplicate instances to remove: {sum(len(v) - 1 for v in duplicates.values())}\n\n")
        
        for (summary, start, end), ev_list in sorted(duplicates.items(), key=lambda x: x[0][1]):
            f.write(f"====================================================\n")
            f.write(f"[{start} -> {end}] {summary} (Total copies: {len(ev_list)})\n")
            for ev in ev_list:
                f.write(f"  - ID: {ev['id']}\n")
                f.write(f"    Summary: {ev.get('summary')}\n")
                f.write(f"    Description: {ev.get('description', '')}\n")
                f.write(f"    Created: {ev.get('created', '')} | Updated: {ev.get('updated', '')}\n")
                f.write(f"    ColorId: {ev.get('colorId', '(none)')}\n")
                f.write(f"    RecurringEventId: {ev.get('recurringEventId', '(none)')}\n")

if __name__ == '__main__':
    main()
