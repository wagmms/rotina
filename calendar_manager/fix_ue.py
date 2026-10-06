import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
creds = Credentials.from_authorized_user_file(TOKEN_PATH)
s = build('calendar', 'v3', credentials=creds)

# 1. Update original event with the checkmark and description
s.events().patch(
    calendarId='primary',
    eventId='586a5ff7f02b46859198eb27b5bbbe96',
    body={
        'summary': '✓ UE',
        'description': 'Status: Concluído\nSincronizado pelo Katomart (katomaro.com)'
    }
).execute()
print("Updated 586a5ff7f02b46859198eb27b5bbbe96")

# 2. Delete duplicate event
s.events().delete(
    calendarId='primary',
    eventId='92u7pes79o1jnrdlnb7ilk81jc'
).execute()
print("Deleted 92u7pes79o1jnrdlnb7ilk81jc")
