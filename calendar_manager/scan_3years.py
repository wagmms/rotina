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
    
    # Check 2025-01-01 to 2027-12-31
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
            
    print(f"Total events in 3-year window: {len(events)}")
    
    groups = defaultdict(list)
    for ev in events:
        summary = (ev.get('summary') or '').strip().lower()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(summary, start, end)].append(ev)
        
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Total duplicate groups: {len(dups)}")
    print(f"Total redundant events to delete: {sum(len(v) - 1 for v in dups.values())}")
    
    for (s, st, et), ev_list in sorted(dups.items(), key=lambda x: x[0][1]):
        print(f"[{st} -> {et}] {s} (Count: {len(ev_list)})")

if __name__ == '__main__':
    main()
