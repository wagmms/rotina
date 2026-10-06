import sys
import io
import os
import json
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
    return creds

def get_service():
    creds = get_credentials()
    return build('calendar', 'v3', credentials=creds)

def main():
    service = get_service()
    time_min = '2026-08-30T00:00:00-03:00'
    time_max = '2026-12-31T23:59:59-03:00'
    
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    mq_events = [e for e in events if 'MedQuest' in e.get('summary', '') or '[MedQuest]' in e.get('summary', '')]
    print(f"Total MedQuest events found (30/08 a 31/12): {len(mq_events)}")
    for i, e in enumerate(mq_events, 1):
        st = e['start'].get('dateTime', e['start'].get('date', ''))
        et = e['end'].get('dateTime', e['end'].get('date', ''))
        summ = e.get('summary', '')
        desc = e.get('description', '')
        cid = e.get('id', '')
        d_str = st.split('T')[0] if 'T' in st else st
        t1 = st.split('T')[1][:5] if 'T' in st else ''
        t2 = et.split('T')[1][:5] if 'T' in et else ''
        print(f"{i:02d}. [{d_str} {t1}-{t2}] {summ}")
        if desc:
            first_line = desc.strip().split('\n')[0]
            print(f"    {first_line}")

if __name__ == '__main__':
    main()
