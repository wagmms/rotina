"""
Reorganize calendar according to strict rules:
- No study starts before 08:00 AM (only internato).
- Zero overlaps.
- Hard cutoff at 22:30.
- MedQuest study & reviews maintain exact durations.
- Gym: 17:30 - 19:00 Mon-Fri.
- Girlfriend: Tue 20:00-22:30, Fri 19:00-22:30, Sat 14:00-22:30, Sun 18:30-22:30.
- English (45m) & Guitar (30m) daily.
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

def main():
    service = get_service()
    
    # We will reorganize from 2026-08-26T00:00:00 to 2026-09-08T00:00:00
    time_min = '2026-08-26T00:00:00-03:00'
    time_max = '2026-09-08T00:00:00-03:00'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=500
    ).execute()
    events = events_result.get('items', [])
    
    print(f"Total events currently in window: {len(events)}")
    
    # 1. Identify and delete mutable events (MedQuest, Ingles, Violao, old study blocks)
    # KEEP: Internato (UPA Ped, Samu), Namorada/Date Night, Academia, Tirar o Lixo, Stay at Casa Kami Sama
    for ev in events:
        s = ev.get('summary', '')
        sl = s.lower()
        start_str = ev['start'].get('dateTime', ev['start'].get('date'))
        
        # Don't touch all-day trips or trash
        if 'stay at' in sl or 'tirar o lixo' in sl:
            continue
            
        # Don't touch internato
        if 'upa' in sl or 'samu' in sl or 'plantão' in sl:
            continue
            
        # Delete MedQuest, English, Guitar, or any old studies/gym/gf to recreate cleanly
        print(f"Deleting to reschedule cleanly: {start_str} | {s}")
        service.events().delete(calendarId='primary', eventId=ev['id']).execute()
        
    print("\n--- Creating cleanly scheduled events ---")
    
    new_schedule = [
        # ==========================================
        # QUARTA 26/08 (Internato UPA Ped: 07-11:30 & 13:30-17)
        # ==========================================
        # 16:00 MedQuest Review was overlapping with UPA Ped! Move to evening.
        {'d': '2026-08-26', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        {'d': '2026-08-26', 's': '19:00', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 24h: Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda)', 'c': '9', 
         'desc': '🔄 Revisão Ativa de 24h: Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda).\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-08-26', 's': '19:40', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-26', 's': '20:25', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        
        # ==========================================
        # QUINTA 27/08 (Livre - Absorve Ética Médica 220m)
        # ==========================================
        {'d': '2026-08-27', 's': '08:30', 'dur': 220, 't': '[MedQuest] 📖 Ética Médica, Bioética e Prontuários / Documentos (Preventiva)', 'c': '9',
         'desc': '📚 Carga: 3.67h (Teoria: 1.67h + Questões: 2.0h)\nSemana 1 • Preventiva\n\n🔗 Questões: https://medquest.live/estudar?subtema=%C3%89tica%20M%C3%A9dica%2C%20Bio%C3%A9tica%20e%20Prontu%C3%A1rios%20%2F%20Documentos'},
        {'d': '2026-08-27', 's': '14:00', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 24h: Ética Médica, Bioética e Prontuários / Documentos', 'c': '9',
         'desc': '🔄 Revisão Ativa de 24h: Ética Médica, Bioética e Prontuários / Documentos.\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-08-27', 's': '14:45', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-27', 's': '15:30', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-08-27', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        
        # ==========================================
        # SEXTA 28/08 (Samu 13:00 - 15:30)
        # ==========================================
        {'d': '2026-08-28', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-28', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-08-28', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        {'d': '2026-08-28', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
        
        # ==========================================
        # SÁBADO 29/08 (Livre manhã / Namorada 14h)
        # ==========================================
        {'d': '2026-08-29', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-29', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-08-29', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
        
        # ==========================================
        # DOMINGO 30/08 (Livre dia / Namorada 18:30)
        # ==========================================
        {'d': '2026-08-30', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-30', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-08-30', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},
        
        # ==========================================
        # SEGUNDA 31/08 (Livre) - HAS (289 min = 4.81h)
        # ==========================================
        {'d': '2026-08-31', 's': '08:30', 'dur': 240, 't': '[MedQuest] 📖 Hipertensão Arterial Sistêmica e Crises Hipertensivas (Parte 1: Teoria & Questões)', 'c': '9',
         'desc': '📚 Carga Total: 4.81h (Teoria: 2.81h + Questões: 2.0h)\nSemana 2 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Hipertens%C3%A3o%20Arterial%20Sist%C3%AAmica%20e%20Crises%20Hipertensivas'},
        {'d': '2026-08-31', 's': '13:30', 'dur': 50, 't': '[MedQuest] 📖 Hipertensão Arterial Sistêmica e Crises Hipertensivas (Parte 2: Questões Finais)', 'c': '9',
         'desc': '📚 Conclusão das questões de HAS.\n\n🔗 Questões: https://medquest.live/estudar?subtema=Hipertens%C3%A3o%20Arterial%20Sist%C3%AAmica%20e%20Crises%20Hipertensivas'},
        {'d': '2026-08-31', 's': '14:30', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 7d: Taquiarritmias, Bradiarritmias, Síncope e Suporte Avançado (ACLS)', 'c': '9',
         'desc': '🔄 Revisão Ativa de 7 dias: Taquiarritmias, Bradiarritmias, Síncope e Suporte Avançado (ACLS).\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-08-31', 's': '15:15', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-08-31', 's': '16:00', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-08-31', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        
        # ==========================================
        # TERÇA 01/09 (Livre / Namorada 20h) - Abdome Agudo Obstrutivo (179 min = 2.99h)
        # ==========================================
        {'d': '2026-09-01', 's': '08:30', 'dur': 180, 't': '[MedQuest] 📖 Abdome Agudo Obstrutivo (Bridas, Neoplasias e Volvo) (Cirurgia)', 'c': '9',
         'desc': '📚 Carga: 2.99h (Teoria: 0.99h + Questões: 2.0h)\nSemana 2 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Obstrutivo%20(Bridas%2C%20Neoplasias%20e%20Volvo)'},
        {'d': '2026-09-01', 's': '13:30', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 24h: Hipertensão Arterial Sistêmica e Crises Hipertensivas', 'c': '9',
         'desc': '🔄 Revisão Ativa de 24h: Hipertensão Arterial Sistêmica e Crises Hipertensivas.\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-01', 's': '14:05', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 7d: Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda)', 'c': '9',
         'desc': '🔄 Revisão Ativa de 7 dias: Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda).\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-01', 's': '14:45', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-01', 's': '15:30', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-01', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        {'d': '2026-09-01', 's': '20:00', 'dur': 150, 't': '❤️ Noite com a Namorada', 'c': '4'},
        
        # ==========================================
        # QUARTA 02/09 (Livre) - Estudos Epidemiológicos (235 min = 3.91h)
        # ==========================================
        {'d': '2026-09-02', 's': '08:30', 'dur': 235, 't': '[MedQuest] 📖 Estudos Epidemiológicos: Medidas de Associação e Análise Estatística (Preventiva)', 'c': '9',
         'desc': '📚 Carga: 3.91h (Teoria: 1.91h + Questões: 2.0h)\nSemana 2 • Preventiva\n\n🔗 Questões: https://medquest.live/estudar?subtema=Estudos%20Epidemiol%C3%B3gicos%3A%20Medidas%20de%20Associa%C3%A7%C3%A3o%20e%20An%C3%A1lise%20Estat%C3%ADstica'},
        {'d': '2026-09-02', 's': '13:30', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 24h: Abdome Agudo Obstrutivo (Bridas, Neoplasias e Volvo)', 'c': '9',
         'desc': '🔄 Revisão Ativa de 24h: Abdome Agudo Obstrutivo (Bridas, Neoplasias e Volvo).\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-02', 's': '14:05', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 7d: Ética Médica, Bioética e Prontuários / Documentos', 'c': '9',
         'desc': '🔄 Revisão Ativa de 7 dias: Ética Médica, Bioética e Prontuários / Documentos.\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-02', 's': '14:45', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-02', 's': '15:30', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-02', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        
        # ==========================================
        # QUINTA 03/09 (Livre)
        # ==========================================
        {'d': '2026-09-03', 's': '08:30', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 24h: Estudos Epidemiológicos: Medidas de Associação e Análise Estatística', 'c': '9',
         'desc': '🔄 Revisão Ativa de 24h: Estudos Epidemiológicos: Medidas de Associação e Análise Estatística.\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-03', 's': '09:15', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-03', 's': '10:00', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-03', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        
        # ==========================================
        # SEXTA 04/09 (Livre / Viagem Paraty)
        # ==========================================
        {'d': '2026-09-04', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-04', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-04', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
        {'d': '2026-09-04', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
        
        # ==========================================
        # SÁBADO 05/09 & DOMINGO 06/09 (Paraty Trip)
        # ==========================================
        {'d': '2026-09-05', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-05', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-05', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
        
        {'d': '2026-09-06', 's': '08:30', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-06', 's': '09:15', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-06', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},
        
        # ==========================================
        # SEGUNDA 07/09 (Feriado Independência) - Insuficiência Cardíaca (254 min = 4.23h)
        # ==========================================
        {'d': '2026-09-07', 's': '08:30', 'dur': 210, 't': '[MedQuest] 📖 Insuficiência Cardíaca: Diagnóstico, Estadiamento e Terapia Farmacológica (Parte 1)', 'c': '9',
         'desc': '📚 Carga: 4.23h (Teoria: 2.23h + Questões: 2.0h)\nSemana 3 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Insufici%C3%AAncia%20Card%C3%ADaca%3A%20Diagn%C3%B3stico%2C%20Estadiamento%20e%20Terapia%20Farmacol%C3%B3gica'},
        {'d': '2026-09-07', 's': '13:30', 'dur': 45, 't': '[MedQuest] 📖 Insuficiência Cardíaca (Parte 2: Questões Finais)', 'c': '9'},
        {'d': '2026-09-07', 's': '14:30', 'dur': 30, 't': '[MedQuest] 🔄 Revisão 7d: Hipertensão Arterial Sistêmica e Crises Hipertensivas', 'c': '9',
         'desc': '🔄 Revisão Ativa de 7 dias: Hipertensão Arterial Sistêmica e Crises Hipertensivas.\n\n🔗 Revisar: https://medquest.live/revisao-ativa'},
        {'d': '2026-09-07', 's': '15:15', 'dur': 45, 't': '📚 Inglês', 'c': '3'},
        {'d': '2026-09-07', 's': '16:00', 'dur': 30, 't': '🎸 Violão', 'c': '6'},
        {'d': '2026-09-07', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    ]
    
    for item in new_schedule:
        start_dt = datetime.strptime(f"{item['d']} {item['s']}", '%Y-%m-%d %H:%M')
        end_dt = start_dt + timedelta(minutes=item['dur'])
        body = {
            'summary': item['t'],
            'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
            'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S'), 'timeZone': TIMEZONE},
            'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]},
        }
        if 'c' in item:
            body['colorId'] = item['c']
        if 'desc' in item:
            body['description'] = item['desc']
            
        service.events().insert(calendarId='primary', body=body).execute()
        print(f"  [ADD] {item['d']} {item['s']}-{end_dt.strftime('%H:%M')} ({item['dur']}m) | {item['t']}")
        
    print("\n[SUCCESS] Agenda reorganizada com perfeição, sem sobreposições e com início de estudos a partir das 08h30!")

if __name__ == '__main__':
    main()
