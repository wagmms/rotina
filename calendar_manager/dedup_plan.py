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
    # Prefer preserving recurring events or older original events
    # Check if any is a recurring instance
    recurring = [ev for ev in ev_list if ev.get('recurringEventId')]
    if recurring:
        keeper = recurring[0]
    else:
        # Check if any has a colorId or was an original created event
        with_color = [ev for ev in ev_list if ev.get('colorId')]
        if with_color:
            keeper = with_color[0]
        else:
            # Sort by creation date (older first)
            keeper = sorted(ev_list, key=lambda x: x.get('created', ''))[0]

    to_delete = [ev for ev in ev_list if ev['id'] != keeper['id']]
    
    # Check if any deleted event had a description, colorId, summary formatting that keeper lacks
    updates = {}
    
    # 1. Description
    keeper_desc = keeper.get('description', '').strip()
    if not keeper_desc:
        for ev in to_delete:
            desc = ev.get('description', '').strip()
            if desc:
                updates['description'] = desc
                break
                
    # 2. ColorId
    keeper_color = keeper.get('colorId')
    if not keeper_color:
        for ev in to_delete:
            color = ev.get('colorId')
            if color:
                updates['colorId'] = color
                break
                
    # 3. Summary (prefer the one with emojis if one has and other doesn't)
    keeper_sum = keeper.get('summary', '')
    for ev in to_delete:
        s = ev.get('summary', '')
        if len(s) > len(keeper_sum): # e.g. has emoji
            updates['summary'] = s
            break

    return keeper, to_delete, updates

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
            
    groups = defaultdict(list)
    for ev in events:
        summary = (ev.get('summary') or '').strip().lower()
        start = ev['start'].get('dateTime', ev['start'].get('date', ''))
        end = ev['end'].get('dateTime', ev['end'].get('date', ''))
        groups[(summary, start, end)].append(ev)
        
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    
    print(f"Total duplicate groups: {len(duplicates)}")
    total_deletions = 0
    total_updates = 0
    
    for (summary, start, end), ev_list in sorted(duplicates.items(), key=lambda x: x[0][1]):
        keeper, to_delete, updates = decide_keeper(ev_list)
        total_deletions += len(to_delete)
        if updates:
            total_updates += 1
        
        st_str = start.split('T')[1][:5] if 'T' in start else 'DIA'
        et_str = end.split('T')[1][:5] if 'T' in end else 'INTEIRO'
        date_str = start.split('T')[0]
        
        print(f"[{date_str} {st_str}-{et_str}] {keeper.get('summary')}")
        print(f"  KEEP: id={keeper['id']} (color={keeper.get('colorId')}, desc={repr(keeper.get('description',''))[:30]})")
        if updates:
            print(f"  UPDATE KEEPER WITH: {updates}")
        for d in to_delete:
            print(f"  DELETE: id={d['id']} (color={d.get('colorId')}, desc={repr(d.get('description',''))[:30]})")
        print()
        
    print(f"SUMMARY:")
    print(f"Total events to DELETE: {total_deletions}")
    print(f"Total keepers to UPDATE with enriched metadata: {total_updates}")

if __name__ == '__main__':
    main()
