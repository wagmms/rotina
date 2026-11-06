#!/usr/bin/env python3
import sys
import io
import os
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def main():
    service = get_service()
    
    # 1. Excluir a agenda secundária MedQuest se existir
    print("1. Verificando se existe agenda secundária 'MedQuest'...")
    cals = service.calendarList().list().execute().get('items', [])
    for cal in cals:
        if cal.get('summary', '').strip().lower() == 'medquest':
            cal_id = cal['id']
            print(f"Excluindo agenda 'MedQuest' ({cal_id}) e todos os eventos dentro dela...")
            service.calendars().delete(calendarId=cal_id).execute()
            print("Agenda 'MedQuest' excluída com sucesso!")
            
    # 2. Localizar todos os eventos remanescentes do MedQuest na agenda primária
    print("\n2. Buscando eventos remanescentes do MedQuest na agenda primária...")
    events_to_delete = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            q='MedQuest',
            singleEvents=True,
            pageToken=page_token,
            maxResults=2500
        ).execute()
        items = res.get('items', [])
        for it in items:
            summ = it.get('summary', '')
            if 'medquest' in summ.lower():
                events_to_delete.append(it['id'])
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    total = len(events_to_delete)
    print(f"Total de eventos a excluir na agenda primária: {total}")
    
    if total == 0:
        print("Nenhum evento do MedQuest restante na agenda primária.")
        return
        
    # 3. Excluir em lotes de 50 via batch request
    print(f"\n3. Excluindo {total} eventos da agenda primária via batch requests...")
    batch_size = 50
    deleted_count = 0
    errors_count = 0
    
    for i in range(0, total, batch_size):
        chunk = events_to_delete[i:i + batch_size]
        batch = service.new_batch_http_request()
        
        def make_callback():
            def cb(request_id, response, exception):
                nonlocal deleted_count, errors_count
                if exception:
                    errors_count += 1
                else:
                    deleted_count += 1
            return cb
            
        for ev_id in chunk:
            batch.add(
                service.events().delete(calendarId='primary', eventId=ev_id),
                callback=make_callback()
            )
            
        batch.execute()
        print(f"Progresso: {deleted_count + errors_count}/{total} eventos processados ({deleted_count} excluídos, {errors_count} falhas)")
        time.sleep(0.3)
        
    print("\n" + "="*50)
    print(f"Exclusão concluída!")
    print(f"Eventos excluídos: {deleted_count}")
    print(f"Falhas: {errors_count}")

if __name__ == '__main__':
    main()
