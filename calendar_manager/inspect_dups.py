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

def main():
    service = get_service()
    
    # Let's fetch all events from 2026-08-01 onwards (singleEvents=True to get instances)
    # Also let's check without singleEvents=True to see recurring event definitions!
    
    print("=== SINGLE EVENTS (instances) ===")
    res = service.events().list(
        calendarId='primary',
        timeMin='2026-08-01T00:00:00-03:00',
        timeMax='2026-10-01T00:00:00-03:00',
        singleEvents=True,
        orderBy='startTime',
        maxResults=2500
    ).execute()
    events = res.get('items', [])
    print(f"Total single event instances in window: {len(events)}")
    
    # Check duplicates
    groups = defaultdict(list)
    for ev in events:
        summary = (ev.get('summary') or '').strip().lower()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(summary, start, end)].append(ev)
        
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Exact duplicate groups: {len(dups)}")
    
    for (s, st, et), ev_list in sorted(dups.items(), key=lambda x: x[0][1]):
        print(f"\nDuplicate: [{st} -> {et}] '{s}' (Count: {len(ev_list)})")
        for ev in ev_list:
            print(f"  - id={ev['id']} | colorId={ev.get('colorId')} | recId={ev.get('recurringEventId')} | desc={repr(ev.get('description', '')[:50])}")

if __name__ == '__main__':
    main()
