#!/usr/bin/env python3
import sys
import io
import os
import json
import time
from datetime import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']
BACKUP_PATH = os.path.join(os.path.dirname(__file__), 'backup_medquest_events.json')

def get_service():
    if not os.path.exists(TOKEN_PATH):
        raise FileNotFoundError(f"Arquivo de token não encontrado em {TOKEN_PATH}")
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def find_or_create_medquest_calendar(service):
    cals = service.calendarList().list().execute().get('items', [])
    for cal in cals:
        if cal.get('summary', '').strip().lower() == 'medquest':
            print(f"Agenda 'MedQuest' já existente encontrada: ID={cal['id']}")
            return cal['id']
            
    print("Criando nova agenda dedicada 'MedQuest'...")
    new_cal = service.calendars().insert(body={
        'summary': 'MedQuest',
        'description': 'Cronograma de estudos e resolução de questões do MedQuest',
        'timeZone': 'America/Sao_Paulo'
    }).execute()
    cal_id = new_cal['id']
    print(f"Agenda criada com sucesso! ID={cal_id}")
    
    # Configurar como oculta (selected=False) por padrão no Google Calendar
    try:
        service.calendarList().patch(calendarId=cal_id, body={'selected': False}).execute()
        print("Agenda configurada como desmarcada/oculta por padrão (selected=False).")
    except Exception as e:
        print(f"Aviso ao ajustar visibilidade: {e}")
        
    return cal_id

def get_all_medquest_events(service):
    print("Buscando todos os eventos do MedQuest na agenda primária...")
    events = []
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
                events.append(it)
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    print(f"Total de eventos MedQuest encontrados na agenda primária: {len(events)}")
    return events

def move_event_with_retry(service, event_id, target_cal_id, max_retries=5):
    for attempt in range(max_retries):
        try:
            return service.events().move(
                calendarId='primary',
                eventId=event_id,
                destination=target_cal_id
            ).execute()
        except HttpError as e:
            if e.resp.status in [403, 429, 500, 503] and attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 0.5
                print(f"\n[Aviso HTTP {e.resp.status}] Tentativa {attempt + 1}/{max_retries}. Aguardando {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                raise

def main():
    service = get_service()
    
    # 1. Buscar todos os eventos
    events = get_all_medquest_events(service)
    if not events:
        print("Nenhum evento do MedQuest encontrado na agenda primária.")
        return
        
    # 2. Backup de segurança
    print(f"Salvando backup de segurança em {BACKUP_PATH}...")
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print("Backup concluído com sucesso!")
    
    # 3. Obter ou criar a agenda MedQuest
    medquest_cal_id = find_or_create_medquest_calendar(service)
    
    # 4. Mover eventos
    total = len(events)
    print(f"\nIniciando transferência de {total} eventos para a agenda 'MedQuest'...")
    success = 0
    errors = 0
    
    for idx, ev in enumerate(events, 1):
        ev_id = ev['id']
        summ = ev.get('summary', 'Sem título')
        start_dt = ev['start'].get('dateTime', ev['start'].get('date', ''))
        
        try:
            move_event_with_retry(service, ev_id, medquest_cal_id)
            success += 1
            if idx % 10 == 0 or idx == total:
                print(f"[{idx}/{total}] ({success} transferidos com sucesso)")
            time.sleep(0.08) # Intervalo defensivo para evitar rate limit da API
        except Exception as e:
            errors += 1
            print(f"\n[Erro ao mover evento {ev_id}] ({summ}): {e}")
            
    print("\n" + "="*50)
    print(f"Processamento concluído!")
    print(f"Total transferidos: {success}")
    print(f"Total de falhas: {errors}")
    
    # 5. Garantir que a agenda permaneça desmarcada (oculta)
    try:
        service.calendarList().patch(calendarId=medquest_cal_id, body={'selected': False}).execute()
        print("Visibilidade da agenda 'MedQuest' confirmada como Oculta (selected=False).")
    except Exception as e:
        print(f"Aviso ao ajustar visibilidade final: {e}")

if __name__ == '__main__':
    main()
