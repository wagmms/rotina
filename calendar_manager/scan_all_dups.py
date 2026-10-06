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
    
    # Check all events from 2026-01-01 to 2027-01-01
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin='2026-01-01T00:00:00-03:00',
            timeMax='2027-01-01T00:00:00-03:00',
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    print(f"Total events found in 2026: {len(events)}")
    
    groups = defaultdict(list)
    for ev in events:
        summary = (ev.get('summary') or '').strip().lower()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(summary, start, end)].append(ev)
        
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Total duplicate groups: {len(dups)}")
    print(f"Total redundant events: {sum(len(v) - 1 for v in dups.values())}")
    
    # Breakdown of dups by date
    by_month = defaultdict(int)
    for (s, st, et), ev_list in dups.items():
        month_key = st[:7]
        by_month[month_key] += len(ev_list) - 1
        
    print("\nDuplicates by month:")
    for m, count in sorted(by_month.items()):
        print(f"  {m}: {count} duplicates")

if __name__ == '__main__':
    main()
