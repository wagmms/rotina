import sys
import io
import os
import json
import time
import argparse
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
ICS_PATH = '/home/wagmoraes/Downloads/medquest_cronograma_2026-09-19.ics'
TIMEZONE = 'America/Sao_Paulo'
COLOR_MEDQUEST = '9' # Azul padrão
COLOR_DONE = '8'     # Grafite/Cinza

# Importa as funções originais do seu outro script para não reescrever o parser
from reorganize_medquest_ics import parse_ics, build_schedule_events, audit_against_calendar

ORDEM_TURMA_J = {
    "Ginecologia e Obstetrícia": 1,
    "Cirurgia": 2,
    "Medicina Intensiva": 3,
    "Preventiva": 4,
    "Clínica Médica": 5,
    "Pediatria": 6
}

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, ['https://www.googleapis.com/auth/calendar'])
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def get_prioridade_internato(tema):
    for chave, peso in ORDEM_TURMA_J.items():
        if chave in tema:
            return peso
    return 99

def apply_internato_sort(weeks_data):
    all_topics = []
    for w in sorted(weeks_data.keys()):
        for t in weeks_data[w]:
            t['original_week'] = w
            all_topics.append(t)
    
    all_topics.sort(key=lambda t: (get_prioridade_internato(t.get('especialidade', '') + ' ' + t.get('tema', '')), t['original_week']))
    
    new_weeks_data = {}
    week_keys = sorted(weeks_data.keys())
    idx = 0
    for w in week_keys:
        new_weeks_data[w] = []
        for _ in range(len(weeks_data[w])):
            if idx < len(all_topics):
                new_weeks_data[w].append(all_topics[idx])
                idx += 1
    return new_weeks_data

def sync_calendar_state(service):
    print("\n" + "="*70)
    print("ANALISANDO ESTADO ATUAL (TWO-WAY SYNC)")
    print("="*70)
    
    now_dt = datetime.now().astimezone()
    
    # Busca TODOS os eventos que tem a nossa tag oculta
    events_result = service.events().list(
        calendarId='primary',
        privateExtendedProperty='medquest_sync=true',
        singleEvents=True,
        maxResults=2500
    ).execute()
    
    events = events_result.get('items', [])
    
    concluidos = set()
    para_deletar = []
    
    for ev in events:
        sync_id = ev.get('extendedProperties', {}).get('private', {}).get('sync_id')
        color = ev.get('colorId')
        end_str = ev.get('end', {}).get('dateTime')
        
        if not sync_id or not end_str:
            continue
            
        end_dt = datetime.fromisoformat(end_str)
        
        if color == COLOR_DONE:
            # Venceu a matéria!
            concluidos.add(sync_id)
        else:
            # Azul. Se está no passado, atrasou. Se está no futuro, é normal.
            # Em ambos os casos, vamos deletar da agenda para o EFEITO CASCATA alocar no lugar certo!
            para_deletar.append(ev['id'])
            
    print(f"✅ Matérias concluídas (Cor Grafite): {len(concluidos)}")
    print(f"🗑️ Blocos a serem recriados (Efeito Cascata): {len(para_deletar)}")
    
    # Deleta os não-concluídos para liberar a agenda para o shift
    for ev_id in para_deletar:
        try:
            service.events().delete(calendarId='primary', eventId=ev_id).execute()
        except Exception as e:
            pass

    return concluidos

def filter_completed_from_ics(weeks_data, concluidos):
    """Remove das semanas as aulas que já foram concluídas na agenda"""
    filtered_data = {}
    for w, topics in weeks_data.items():
        filtered_data[w] = []
        for t in topics:
            # O sync_id precisa bater com a forma como vamos salvar (ex: titulo limpo da teoria/questões)
            # Para simplificar, o sync_id base é o TEMA da aula
            sync_id_teoria = f"TEORIA_{t['tema']}"
            sync_id_questoes = f"QUESTOES_{t['tema']}"
            
            # Se já fez teoria e questoes, não repete. (Poderia separar os dois, mas aqui deixamos juntos)
            # Vamos gerar as aulas que AINDA NÃO TEM sync_id nos concluídos.
            if sync_id_teoria not in concluidos or sync_id_questoes not in concluidos:
                filtered_data[w].append(t)
    return filtered_data

def insert_events_advanced(service, schedule, concluidos):
    print("\n" + "="*70)
    print(f"INSERINDO {len(schedule)} BLOCOS ATUALIZADOS NO CALENDÁRIO")
    print("="*70)
    
    inserted = 0
    for item in schedule:
        # Define o sync_id com base no tipo da aula
        if 'Teoria' in item['t']:
            sync_id = f"TEORIA_{item['t'].split(') (Parte')[0].replace('[MedQuest] 📖 ', '').replace('[MedQuest] ✍️ ', '')}"
        else:
            sync_id = f"QUESTOES_{item['t'].split(') (Parte')[0].replace('[MedQuest] 📖 ', '').replace('[MedQuest] ✍️ ', '')}"
            
        if sync_id in concluidos:
            # Se apenas 1 parte foi concluída e a outra não, a build_schedule cria as duas. 
            # Aqui pulamos as metades já feitas!
            continue
            
        start_dt = datetime.strptime(f"{item['d']} {item['s']}", '%Y-%m-%d %H:%M')
        end_dt = start_dt + timedelta(minutes=item['dur'])
        
        body = {
            'summary': item['t'],
            'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'colorId': item.get('c', COLOR_MEDQUEST),
            'description': item.get('desc', ''),
            'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]},
            'extendedProperties': {
                'private': {
                    'medquest_sync': 'true',
                    'sync_id': sync_id
                }
            }
        }
        
        try:
            service.events().insert(calendarId='primary', body=body).execute()
            inserted += 1
            if inserted % 25 == 0:
                print(f"  [{inserted}] Blocos inseridos...")
        except Exception as e:
            print(f"  ⚠️ Erro ao inserir {item['t']}: {e}")
            time.sleep(1)

    print(f"\n✅ Inserção finalizada! {inserted} blocos novos na agenda.")

def main():
    parser = argparse.ArgumentParser(description='Advanced Two-Way Sync MedQuest.')
    parser.add_argument('--mode', choices=['padrao', 'internato'], default='internato')
    args = parser.parse_args()

    service = get_service()
    
    # 1. Parseia o ICS original com TODOS os temas
    weeks_data = parse_ics(ICS_PATH)
    
    # 2. Faz o Scanner na sua Agenda do Google (Pega as cores e salva o que você já fez)
    concluidos = sync_calendar_state(service)
    
    # 3. Filtra da lista do ICS o que você já fez (Evita ficar repetindo o que tá concluído)
    weeks_data = filter_completed_from_ics(weeks_data, concluidos)
    
    # 4. Aplica a Ordem de Prioridade (O Shift/Cascata) nos temas RESTANTES
    if args.mode == 'internato':
        print("🔄 Modo INTERNATO: Organizando os temas restantes para a Turma J...")
        weeks_data = apply_internato_sort(weeks_data)
        
    # 5. Constrói os slots fixos (Sexta, Sabado, Domingo)
    schedule = build_schedule_events(weeks_data)
    
    # 6. Insere na agenda injetando as Etiquetas Secretas
    insert_events_advanced(service, schedule, concluidos)
    
    print("\n" + "="*70)
    print("✨ TWO-WAY SYNC FINALIZADO COM SUCESSO! ✨")
    print("="*70)

if __name__ == '__main__':
    main()
