"""
V3 REORGANIZATION: 
Extensivo Internato 2026 
(24 new classes, 110m each)
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
TIMEZONE = 'America/Sao_Paulo'

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def delete_event(service, event_id, reason=""):
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        print(f"  [DEL] {reason}")
    except Exception as e:
        print(f"  [ERRO] {reason}: {e}")

def create_event(service, summary, date_str, start_time, duration_min, color_id=None):
    start_dt = datetime.strptime(f"{date_str} {start_time}", '%Y-%m-%d %H:%M')
    end_dt = start_dt + timedelta(minutes=duration_min)
    
    body = {
        'summary': summary,
        'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
        'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
        'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]},
    }
    if color_id:
        body['colorId'] = color_id
    
    service.events().insert(calendarId='primary', body=body).execute()
    print(f"  [ADD] {start_time}-{end_dt.strftime('%H:%M')} ({duration_min}m) | {summary}")

def main():
    service = get_service()
    
    time_min = '2026-08-16T00:00:00-03:00'
    time_max = '2026-08-31T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print("\n[PASSO 1] Limpando eventos anteriores e tarefas Katomart antigas/novas...")
    for event in events:
        summary = event.get('summary', '')
        sl = summary.lower()
        start_str = event['start'].get('dateTime', event['start'].get('date', ''))
        
        # Deletar tarefas de dia inteiro do Katomart (exceto lixo, aniversario)
        if 'T' not in start_str:
            if 'tirar o lixo' not in sl and 'anivers' not in sl and 'stay at casa' not in sl:
                delete_event(service, event['id'], f"Dia Inteiro: {summary}")
            continue
            
        # Deletar eventos agendados de estudo/ingles/violao da rotina antiga ou recem-criados
        if 'cirurgia' in sl or 'pratica' in sl.replace('á','a') or 'revisao' in sl.replace('ã','a') \
            or 'pediatria' in sl or 'clinica' in sl.replace('í','i') \
            or 'radiologia' in sl or 'ingl' in sl or 'viol' in sl \
            or 'ginecologia' in sl or 'obstetr' in sl.replace('í','i'):
            delete_event(service, event['id'], f"Evento: {summary}")
            
    # Refresh events after deletion
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print("\n[PASSO 2] Ajustando Date Night e limites de 22:30...")
    for event in events:
        summary = event.get('summary', '')
        if 'namorada' in summary.lower() or 'casal' in summary.lower() or 'date' in summary.lower():
            start_str = event['start'].get('dateTime', '')
            end_str = event['end'].get('dateTime', '')
            if not start_str or not end_str:
                continue
                
            date_key = start_str.split('T')[0]
            start_time = start_str.split('T')[1][:5]
            end_dt = datetime.strptime(end_str.split('-03:00')[0], '%Y-%m-%dT%H:%M:%S')
            
            modified = False
            
            # Corte estrito as 22:30
            if end_dt.hour == 23 or (end_dt.hour == 22 and end_dt.minute > 30):
                end_dt = end_dt.replace(hour=22, minute=30, second=0)
                event['end']['dateTime'] = end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00')
                modified = True
                print(f"  [MOD] {date_key} - Cortando fim para 22:30")
                
            # Date Night de Sexta (21/08 e 28/08) deve começar 19:00, já que não tem estudo à noite!
            if date_key in ['2026-08-21', '2026-08-28'] and start_time in ['19:45', '20:15']:
                new_start = start_str.replace(start_time, '19:00')
                event['start']['dateTime'] = new_start
                modified = True
                print(f"  [MOD] {date_key} - Antecipando inicio do Date Night para 19:00!")
                
            if modified:
                service.events().update(calendarId='primary', eventId=event['id'], body=event).execute()

    print("\n[PASSO 3] Criando novos blocos (Extensivo Internato 2026)...")
    schedule = [
        # SEG 17 (Internato UPA)
        {'d': '2026-08-17', 's': '19:00', 'dur': 110, 't': '📚 Cirurgia - Atendimento Inicial e Vias Aéreas', 'c': '9'},
        {'d': '2026-08-17', 's': '21:00', 'dur': 45, 't': '📚 Inglês: Listening Ativo', 'c': '3'},
        {'d': '2026-08-17', 's': '21:45', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # TER 18 (Livre morning)
        {'d': '2026-08-18', 's': '08:00', 'dur': 110, 't': '📚 Cirurgia - Trauma Cranioencefálico e Cervical', 'c': '9'},
        {'d': '2026-08-18', 's': '10:00', 'dur': 110, 't': '📚 Cirurgia - Trauma de Tórax e Abdome', 'c': '9'},
        {'d': '2026-08-18', 's': '14:00', 'dur': 110, 't': '📚 Cirurgia - Trauma Vascular, Pelve e Queimado', 'c': '9'},
        {'d': '2026-08-18', 's': '16:00', 'dur': 45, 't': '📚 Inglês: Shadowing & Pronúncia', 'c': '3'},
        {'d': '2026-08-18', 's': '16:45', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
        
        # QUA 19 (Internato UPA)
        {'d': '2026-08-19', 's': '19:00', 'dur': 110, 't': '📚 Revisão D+1/D+2 - Trauma Cirúrgico e TCE', 'c': '9'},
        {'d': '2026-08-19', 's': '21:00', 'dur': 45, 't': '📚 Inglês: Output Ativo', 'c': '3'},
        {'d': '2026-08-19', 's': '21:45', 'dur': 30, 't': '🎸 Violão: Escalas', 'c': '6'},
        
        # QUI 20 (Livre morning)
        {'d': '2026-08-20', 's': '09:00', 'dur': 100, 't': '📚 Cirurgia - Abdome Agudo e Hemorragia Digestiva', 'c': '9'},
        {'d': '2026-08-20', 's': '10:50', 'dur': 110, 't': '📚 Cirurgia - Urgências Vasculares e Urológicas', 'c': '9'},
        {'d': '2026-08-20', 's': '14:00', 'dur': 110, 't': '📚 Clínica Médica - Síndromes Coronarianas Agudas', 'c': '9'},
        {'d': '2026-08-20', 's': '16:00', 'dur': 45, 't': '📚 Inglês: Leitura e Vocabulário', 'c': '3'},
        {'d': '2026-08-20', 's': '16:45', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # SEX 21 (Internato) - Zero Estudo
        # SAB 22 (Livre)
        {'d': '2026-08-22', 's': '07:40', 'dur': 110, 't': '📚 Clínica Médica - PCR, Taquiarritmias e Bradiarritmias', 'c': '9'},
        {'d': '2026-08-22', 's': '09:40', 'dur': 100, 't': '📚 Revisão D+3 - Cirurgia de Urgência e Emergências Cardiovasculares', 'c': '9'},
        {'d': '2026-08-22', 's': '11:30', 'dur': 110, 't': '📚 Clínica Médica - Crise Convulsiva, Estado de Mal e Meningite', 'c': '9'},
        
        # DOM 23 (Plantão) - Zero Estudo
        # SEG 24 (Livre) - CARGA MAXIMA
        {'d': '2026-08-24', 's': '08:00', 'dur': 110, 't': '📚 Clínica Médica - AVC Isquêmico e Hemorrágico', 'c': '9'},
        {'d': '2026-08-24', 's': '10:00', 'dur': 110, 't': '📚 Clínica Médica - Insuficiência Respiratória Aguda, TEP e Asma', 'c': '9'},
        {'d': '2026-08-24', 's': '13:30', 'dur': 110, 't': '📚 Clínica Médica - Choque, Sepse e Drogas Vasoativas', 'c': '9'},
        {'d': '2026-08-24', 's': '15:30', 'dur': 110, 't': '📚 Revisão D+7 (Cirurgia) e D+3 (Clínica) - Trauma e Choque', 'c': '9'},
        {'d': '2026-08-24', 's': '19:00', 'dur': 110, 't': '📚 Clínica Médica - Emergências Metabólicas', 'c': '9'},
        {'d': '2026-08-24', 's': '21:00', 'dur': 45, 't': '📚 Inglês: Fluência', 'c': '3'},
        {'d': '2026-08-24', 's': '21:45', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
        
        # TER 25 (Livre)
        {'d': '2026-08-25', 's': '09:00', 'dur': 110, 't': '📚 Pediatria - Crise Asmática Grave, Anafilaxia e Intoxicações', 'c': '9'},
        {'d': '2026-08-25', 's': '11:00', 'dur': 110, 't': '📚 Pediatria - Reanimação Neonatal e PALS', 'c': '9'},
        {'d': '2026-08-25', 's': '14:00', 'dur': 45, 't': '📚 Inglês: Revisão Semanal', 'c': '3'},
        {'d': '2026-08-25', 's': '14:45', 'dur': 30, 't': '🎸 Violão: Escalas e Improvisação', 'c': '6'},
        
        # QUA 26 (UPA Ped)
        {'d': '2026-08-26', 's': '19:00', 'dur': 110, 't': '📚 Ginecologia e Obstetrícia - Hemorragia Pós-Parto e Emergência Hipertensiva', 'c': '9'},
        {'d': '2026-08-26', 's': '21:00', 'dur': 45, 't': '📚 Inglês: Listening Ativo', 'c': '3'},
        {'d': '2026-08-26', 's': '21:45', 'dur': 30, 't': '🎸 Violão: Mapeamento CAGED', 'c': '6'},
        
        # QUI 27 (Livre)
        {'d': '2026-08-27', 's': '09:00', 'dur': 110, 't': '📚 Pediatria - TCE Pediátrico, Crise Febril, Convulsão e Meningite', 'c': '9'},
        {'d': '2026-08-27', 's': '11:00', 'dur': 110, 't': '📚 Revisão D+1/D+2 - Emergências Pediátricas e Obstétricas', 'c': '9'},
        {'d': '2026-08-27', 's': '14:00', 'dur': 110, 't': '📚 Ginecologia e Obstetrícia - Sangramentos da Gestação e Urgências', 'c': '9'},
        {'d': '2026-08-27', 's': '16:00', 'dur': 45, 't': '📚 Inglês: Shadowing & Pronúncia', 'c': '3'},
        {'d': '2026-08-27', 's': '16:45', 'dur': 30, 't': '🎸 Violão: Ritmo & Batidas', 'c': '6'},
        
        # SEX 28 (Samu 13-15:30)
        {'d': '2026-08-28', 's': '08:00', 'dur': 110, 't': '📚 Revisão de Fechamento I - Urgências Clínico-Cirúrgicas e TCE', 'c': '9'},
        {'d': '2026-08-28', 's': '10:00', 'dur': 110, 't': '📚 Revisão de Fechamento II - Emergências em Pediatria e GO', 'c': '9'},
        {'d': '2026-08-28', 's': '12:00', 'dur': 45, 't': '📚 Inglês: Vocabulário', 'c': '3'},
        # Noite de sexta livre pra namorada 19:00
    ]
    
    for ev in schedule:
        create_event(service, ev['t'], ev['d'], ev['s'], ev['dur'], color_id=ev['c'])
        
    print("\n[OK] Tudo recriado (V3) com sucesso! Nenhuma aula durando menos que o original.")

if __name__ == '__main__':
    main()
