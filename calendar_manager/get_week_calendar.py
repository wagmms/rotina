from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import datetime

creds = Credentials.from_authorized_user_file('token.json', ['https://www.googleapis.com/auth/calendar'])
service = build('calendar', 'v3', credentials=creds)

now = datetime.datetime.utcnow().isoformat() + 'Z'
in_7_days = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat() + 'Z'

events_result = service.events().list(calendarId='primary', timeMin=now, timeMax=in_7_days, singleEvents=True, orderBy='startTime').execute()
events = events_result.get('items', [])

for event in events:
    start = event['start'].get('dateTime', event['start'].get('date'))
    print(f"{start} - {event['summary']}")
