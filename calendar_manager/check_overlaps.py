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

def clean_title(title):
    # strip emojis, spaces, punctuation, case
    t = re.sub(r'[^\w\s]', '', title, flags=re.UNICODE)
    t = re.sub(r'\s+', ' ', t).strip().lower()
    return t

def main():
    service = get_service()
    
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin='2026-08-30T00:00:00-03:00',
            timeMax='2026-12-31T23:59:59-03:00',
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    print(f"Total events from 30/08 to 31/12: {len(events)}")
    
    by_day = defaultdict(list)
    medquest_events = []
    for ev in events:
        start = ev['start'].get('dateTime')
        end = ev['end'].get('dateTime')
        summary = ev.get('summary', '')
        if start and end:
            day = start.split('T')[0]
            by_day[day].append((start, end, ev))
            if 'MedQuest' in summary or '[MedQuest]' in summary:
                medquest_events.append((day, start, end, ev))
                
    print(f"Total MedQuest events: {len(medquest_events)}")
    
    print("\n" + "="*70)
    print("DETECÇÃO DE SOBREPOSIÇÕES ENVOLVENDO MEDQUEST:")
    print("="*70)
    conflict_count = 0
    for day, ev_list in sorted(by_day.items()):
        # Check all pairs in this day
        day_conflicts = []
        for i in range(len(ev_list)):
            for j in range(i + 1, len(ev_list)):
                st1, et1, ev1 = ev_list[i]
                st2, et2, ev2 = ev_list[j]
                
                # Check overlap
                if st1 < et2 and st2 < et1:
                    s1 = ev1.get('summary', '')
                    s2 = ev2.get('summary', '')
                    if 'MedQuest' in s1 or 'MedQuest' in s2 or '[MedQuest]' in s1 or '[MedQuest]' in s2:
                        day_conflicts.append((ev1, ev2))
                        
        if day_conflicts:
            print(f"\n📅 Data: {day}")
            for ev1, ev2 in day_conflicts:
                conflict_count += 1
                t1 = ev1['start']['dateTime'].split('T')[1][:5] + '-' + ev1['end']['dateTime'].split('T')[1][:5]
                t2 = ev2['start']['dateTime'].split('T')[1][:5] + '-' + ev2['end']['dateTime'].split('T')[1][:5]
                print(f"  ❌ CONFLITO #{conflict_count}:")
                print(f"     [A] {t1} | {ev1.get('summary')}")
                print(f"     [B] {t2} | {ev2.get('summary')}")
                
    print(f"\nTotal de conflitos encontrados: {conflict_count}")
    
    print("\n" + "="*70)
    print("LISTA DE TODOS OS EVENTOS DO DIA COM MEDQUEST (Primeiros 15 dias):")
    print("="*70)
    for day, ev_list in sorted(by_day.items())[:15]:
        has_mq = any('MedQuest' in ev.get('summary','') for _,_,ev in ev_list)
        if has_mq:
            print(f"\n📅 {day}:")
            for st, et, ev in sorted(ev_list, key=lambda x: x[0]):
                t_str = st.split('T')[1][:5] + ' - ' + et.split('T')[1][:5]
                print(f"   {t_str} | {ev.get('summary')}")

if __name__ == '__main__':
    main()
