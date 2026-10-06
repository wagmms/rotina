import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
creds = Credentials.from_authorized_user_file(TOKEN_PATH)
s = build('calendar', 'v3', credentials=creds)
evs = s.events().list(
    calendarId='primary',
    timeMin='2026-08-16T00:00:00-03:00',
    timeMax='2026-08-17T00:00:00-03:00',
    singleEvents=True
).execute().get('items', [])

for e in evs:
    print(f"Summary: {e.get('summary')}")
    print(f"ID: {e.get('id')}")
    print(f"Created: {e.get('created')} | Updated: {e.get('updated')}")
    print(f"Description: {e.get('description')}")
    print("-" * 40)
