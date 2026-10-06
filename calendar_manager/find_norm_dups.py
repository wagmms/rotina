import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import re
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

def normalize_title(title):
    # Remove checkmarks, emojis, punctuation, extra spaces
    t = re.sub(r'^[✓✔☑️xX\s\-]+', '', title)
    t = re.sub(r'[^\w\s]', '', t)
    t = re.sub(r'\s+', ' ', t).strip().lower()
    return t

def main():
    service = get_service()
    
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
            
    # Group by (normalized_title, start_time, end_time)
    groups = defaultdict(list)
    for ev in events:
        s = ev.get('summary') or ''
        norm_s = normalize_title(s)
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(norm_s, start, end)].append(ev)
        
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Normalized duplicate groups found: {len(dups)}")
    for (norm_s, st, et), ev_list in dups.items():
        print(f"\nGroup: [{st} -> {et}] '{norm_s}' (Count: {len(ev_list)})")
        for e in ev_list:
            print(f"  - id={e['id']} | summary='{e.get('summary')}' | desc={repr(e.get('description',''))[:30]}")

if __name__ == '__main__':
    main()
