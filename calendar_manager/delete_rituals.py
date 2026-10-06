import os
import sys
import io
import json
from datetime import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
BACKUP_PATH = os.path.join(os.path.dirname(__file__), f"rituals_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
        else:
            raise Exception("Token inválido. Re-autenticação necessária.")
    return build('calendar', 'v3', credentials=creds)

def find_all_ritual_events(service):
    calendar_list = service.calendarList().list().execute()
    calendars = calendar_list.get('items', [])
    
    events_to_delete = []
    seen_ids = set()
    keywords = ['Ritual Matinal', 'Ritual Noturno', '☀️ Ritual', '🌙 Ritual']
    
    for cal in calendars:
        cal_id = cal['id']
        cal_name = cal.get('summary', 'Sem nome')
        
        # Search via API query for Ritual
        page_token = None
        while True:
            res = service.events().list(
                calendarId=cal_id,
                q='Ritual',
                pageToken=page_token,
                maxResults=2500
            ).execute()
            
            for ev in res.get('items', []):
                ev_id = ev.get('id')
                summary = ev.get('summary') or ''
                
                if any(k in summary for k in keywords):
                    if (cal_id, ev_id) not in seen_ids:
                        seen_ids.add((cal_id, ev_id))
                        events_to_delete.append({
                            'calendarId': cal_id,
                            'calendarName': cal_name,
                            'eventId': ev_id,
                            'summary': summary,
                            'start': ev.get('start', {}),
                            'end': ev.get('end', {}),
                            'recurrence': ev.get('recurrence', []),
                            'raw': ev
                        })
            page_token = res.get('nextPageToken')
            if not page_token:
                break

    return events_to_delete

def main():
    service = get_service()
    
    print("=== BUSCA DE EVENTOS DE RITUAL MATINAL E NOTURNO ===")
    events = find_all_ritual_events(service)
    print(f"Total de eventos encontrados: {len(events)}")
    
    if not events:
        print("Nenhum evento de Ritual encontrado.")
        return
        
    with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"Backup de segurança salvo em: {BACKUP_PATH}")
    
    print("\nIniciando exclusão dos eventos...")
    deleted_count = 0
    error_count = 0
    
    for idx, item in enumerate(events, 1):
        cal_id = item['calendarId']
        ev_id = item['eventId']
        summary = item['summary']
        start = item['start'].get('dateTime', item['start'].get('date', ''))
        
        try:
            service.events().delete(calendarId=cal_id, eventId=ev_id).execute()
            deleted_count += 1
            print(f"[{idx}/{len(events)}] Deletado: '{summary}' ({start})")
        except Exception as e:
            error_count += 1
            print(f"[{idx}/{len(events)}] ⚠️ Erro ao deletar '{summary}': {e}")
            
    print("\n" + "="*60)
    print(f"RESULTADO: {deleted_count} eventos deletados com sucesso. ({error_count} erros)")
    print("="*60)

if __name__ == '__main__':
    main()
