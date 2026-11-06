#!/usr/bin/env python3
import sys
import io
import os
import json
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']
BACKUP_PATH = os.path.join(os.path.dirname(__file__), 'backup_academia_namorada_events.json')

KEYWORDS = ['academia', 'wellhub', 'treino', 'musculação', 'musculacao', '🏋️', '💪', 'namorada', 'namoro', '❤️']

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
    
    print("1. Buscando eventos de academia e namorada na agenda principal...")
    page_token = None
    target_events = []
    
    while True:
        res = service.events().list(
            calendarId='primary',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        items = res.get('items', [])
        for it in items:
            summ = it.get('summary', '')
            if any(k in summ.lower() for k in KEYWORDS):
                target_events.append(it)
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    total = len(target_events)
    print(f"Total de eventos identificados: {total}")
    
    if total == 0:
        print("Nenhum evento de academia ou namorada encontrado.")
        return
        
    # 2. Backup de segurança
    print(f"2. Salvando backup de segurança em {BACKUP_PATH}...")
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(target_events, f, ensure_ascii=False, indent=2)
    print("Backup concluído com sucesso!")
    
    # 3. Exclusão via batch requests
    print(f"3. Excluindo {total} eventos via batch requests...")
    batch_size = 50
    deleted_count = 0
    errors_count = 0
    
    for i in range(0, total, batch_size):
        chunk = target_events[i:i + batch_size]
        batch = service.new_batch_http_request()
        
        def make_callback():
            def cb(request_id, response, exception):
                nonlocal deleted_count, errors_count
                if exception:
                    errors_count += 1
                else:
                    deleted_count += 1
            return cb
            
        for ev in chunk:
            batch.add(
                service.events().delete(calendarId='primary', eventId=ev['id']),
                callback=make_callback()
            )
            
        batch.execute()
        print(f"Progresso: {deleted_count + errors_count}/{total} processados ({deleted_count} excluídos, {errors_count} falhas)")
        time.sleep(0.3)
        
    print("\n" + "="*50)
    print("Exclusão concluída com sucesso!")
    print(f"Total excluído: {deleted_count}")
    print(f"Total de falhas: {errors_count}")

if __name__ == '__main__':
    main()
