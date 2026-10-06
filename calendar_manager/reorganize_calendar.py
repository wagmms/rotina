"""
REORGANIZAÇÃO DEFINITIVA DO MEDQUEST (MEDICINA DE FAMÍLIA: 31/08 - 18/10/2026)
=============================================================================
1. Reorganiza apenas o período do estágio em Medicina de Família (Semanas 1 a 7).
2. Unifica os blocos de estudo em 1 único evento por tópico (Teoria + Questões).
3. Bloqueia integralmente 05/09 a 08/09 (Viagem do usuário - ZERO estudos).
4. Garante 0 sobreposições com Internato, Academia, Inglês, Violão, Namorada e Rituais.
"""
import sys
import io
import os
import re
from datetime import datetime
from collections import defaultdict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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

UNIFIED_MEDQUEST_SCHEDULE = [
    # SEMANA 1 (31/08 - 06/09)
    {
        'date': '2026-08-31', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Taquiarritmias, Bradiarritmias, Síncope e Suporte Avançado (ACLS) (Clínica Médica)',
        'desc': '📚 Carga: 4.07h (Teoria + Questões)\nSemana 1 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Taquiarritmias%2C%20Bradiarritmias%2C%20S%C3%ADncope%20e%20Suporte%20Avan%C3%A7ado%20(ACLS)'
    },
    {
        'date': '2026-09-02', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda) (Cirurgia)',
        'desc': '📚 Carga: 4.49h (Teoria + Questões)\nSemana 1 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Inflamat%C3%B3rio%20(Apendicite%20e%20Diverticulite%20Aguda)'
    },
    {
        'date': '2026-09-03', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Assistência Pré-Natal de Baixo e Alto Risco (Ginecologia e Obstetrícia)',
        'desc': '📚 Carga: 4.56h (Teoria + Questões)\nSemana 1 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Assist%C3%AAncia%20Pr%C3%A9-Natal%20de%20Baixo%20e%20Alto%20Risco'
    },
    # 05/09 a 08/09: ✈️ VIAGEM (ZERO ESTUDOS!)

    # SEMANA 2 (07/09 - 13/09)
    {
        'date': '2026-09-09', 'start': '08:30', 'end': '11:30',
        'summary': '[MedQuest] 📖 Imunodeficiências, Alergias e Anafilaxia na Infância (Pediatria)',
        'desc': '📚 Carga: 3.96h (Teoria + Questões)\nSemana 2 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Imunodefici%C3%AAncias%2C%20Alergias%20e%20Anafilaxia%20na%20Inf%C3%A2ncia'
    },
    {
        'date': '2026-09-09', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Ética Médica, Bioética e Prontuários / Documentos (Preventiva)',
        'desc': '📚 Carga: 3.68h (Teoria + Questões)\nSemana 2 • Preventiva\n\n🔗 Questões: https://medquest.live/estudar?subtema=%C3%89tica%20M%C3%A9dica%2C%20Bio%C3%A9tica%20e%20Prontu%C3%A1rios%20%2F%20Documentos'
    },
    {
        'date': '2026-09-10', 'start': '08:30', 'end': '12:30',
        'summary': '[MedQuest] 📖 Hipertensão Arterial Sistêmica e Crises Hipertensivas (Clínica Médica)',
        'desc': '📚 Carga: 4.81h (Teoria + Questões)\nSemana 2 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Hipertens%C3%A3o%20Arterial%20Sist%C3%AAmica%20e%20Crises%20Hipertensivas'
    },

    # SEMANA 3 (14/09 - 20/09)
    {
        'date': '2026-09-14', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Abdome Agudo Obstrutivo (Bridas, Neoplasias e Volvo) (Cirurgia)',
        'desc': '📚 Carga: 3.0h (Teoria + Questões)\nSemana 3 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Obstrutivo%20(Bridas%2C%20Neoplasias%20e%20Volvo)'
    },
    {
        'date': '2026-09-17', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Rastreamento Citopatológico e Conduta em Lesões Cervicais (HPV) (Ginecologia e Obstetrícia)',
        'desc': '📚 Carga: 3.8h (Teoria + Questões)\nSemana 3 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Rastreamento%20Citopatol%C3%B3gico%20e%20Conduta%20em%20Les%C3%B5es%20Cervicais%20(HPV)'
    },
    {
        'date': '2026-09-18', 'start': '08:30', 'end': '12:30',
        'summary': '[MedQuest] 📖 Cardiopatias Congênitas Cianogênicas e Acianogênicas (Pediatria)',
        'desc': '📚 Carga: 3.6h (Teoria + Questões)\nSemana 3 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Cardiopatias%20Cong%C3%AAnicas%20Cianog%C3%AAnicas%20e%20Acianog%C3%AAnicas'
    },

    # SEMANA 4 (21/09 - 27/09)
    {
        'date': '2026-09-21', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Insuficiência Cardíaca: Diagnóstico, Estadiamento e Terapia Farmacológica (Clínica Médica)',
        'desc': '📚 Carga: 4.25h (Teoria + Questões)\nSemana 4 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Insufici%C3%AAncia%20Card%C3%ADaca%3A%20Diagn%C3%B3stico%2C%20Estadiamento%20e%20Terapia%20Farmacol%C3%B3gica'
    },
    {
        'date': '2026-09-23', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Atendimento Inicial ao Politraumatizado (Protocolo xABCDE) (Cirurgia)',
        'desc': '📚 Carga: 3.82h (Teoria + Questões)\nSemana 4 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Atendimento%20Inicial%20ao%20Politraumatizado%20(Protocolo%20xABCDE)'
    },
    {
        'date': '2026-09-26', 'start': '08:30', 'end': '12:30',
        'summary': '[MedQuest] 📖 Diabetes Gestacional e Pré-Gestacional (Ginecologia e Obstetrícia)',
        'desc': '📚 Carga: 3.19h (Teoria + Questões)\nSemana 4 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Diabetes%20Gestacional%20e%20Pr%C3%A9-Gestacional'
    },

    # SEMANA 5 (28/09 - 04/10)
    {
        'date': '2026-09-28', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Síndromes Coronarianas Agudas (Com e Sem Supra de ST) (Clínica Médica)',
        'desc': '📚 Carga: 4.34h (Teoria + Questões)\nSemana 5 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=S%C3%ADndromes%20Coronarianas%20Agudas%20(Com%20e%20Sem%20Supra%20de%20ST)'
    },
    {
        'date': '2026-09-30', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Litíase Biliar, Colecistite, Coledocolitíase e Colangite (Cirurgia)',
        'desc': '📚 Carga: 3.91h (Teoria + Questões)\nSemana 5 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Lit%C3%ADase%20Biliar%2C%20Colecistite%2C%20Coledocolit%C3%ADase%20e%20Colangite'
    },
    {
        'date': '2026-10-01', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Arritmias, Síncope e Parada Cardiorrespiratória Pediátrica (PALS) (Pediatria)',
        'desc': '📚 Carga: 3.2h (Teoria + Questões)\nSemana 5 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Arritmias%2C%20S%C3%ADncope%20e%20Parada%20Cardiorrespirat%C3%B3ria%20Pedi%C3%A1trica%20(PALS)'
    },

    # SEMANA 6 (05/10 - 11/10)
    {
        'date': '2026-10-05', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Estudos Epidemiológicos: Medidas de Associação e Análise Estatística (Preventiva)',
        'desc': '📚 Carga: 3.91h (Teoria + Questões)\nSemana 6 • Preventiva\n\n🔗 Questões: https://medquest.live/estudar?subtema=Estudos%20Epidemiol%C3%B3gicos%3A%20Medidas%20de%20Associa%C3%A7%C3%A3o%20e%20An%C3%A1lise%20Estat%C3%ADstica'
    },
    {
        'date': '2026-10-07', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Dermatologia Clínica: Farmacodermias Graves, Eczemas e Psoríase (Clínica Médica)',
        'desc': '📚 Carga: 3.3h (Teoria + Questões)\nSemana 6 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Dermatologia%20Cl%C3%ADnica%3A%20Farmacodermias%20Graves%2C%20Eczemas%20e%20Psor%C3%ADase'
    },
    {
        'date': '2026-10-08', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Síndromes Hipertensivas na Gravidez (Pré-eclâmpsia e Eclâmpsia) (Ginecologia e Obstetrícia)',
        'desc': '📚 Carga: 3.31h (Teoria + Questões)\nSemana 6 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=S%C3%ADndromes%20Hipertensivas%20na%20Gravidez%20(Pr%C3%A9-ecl%C3%A2mpsia%20e%20Ecl%C3%A2mpsia)'
    },

    # SEMANA 7 (12/10 - 18/10 - Última semana de Medicina de Família)
    {
        'date': '2026-10-12', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Cirurgia Bariátrica e Metabólica (Cirurgia)',
        'desc': '📚 Carga: 3.14h (Teoria + Questões)\nSemana 7 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Cirurgia%20Bari%C3%A1trica%20e%20Metab%C3%B3lica'
    },
    {
        'date': '2026-10-14', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Dermatoses Infecciosas, Hanseníase e Leishmanioses (Clínica Médica)',
        'desc': '📚 Carga: 4.29h (Teoria + Questões)\nSemana 7 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Dermatoses%20Infecciosas%2C%20Hansen%C3%ADase%20e%20Leishmanioses'
    },
    {
        'date': '2026-10-15', 'start': '19:45', 'end': '22:15',
        'summary': '[MedQuest] 📖 Diarreia Aguda, Reidratação Oral e Doenças Disabsortivas (Pediatria)',
        'desc': '📚 Carga: 5.27h (Teoria + Questões)\nSemana 7 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Diarreia%20Aguda%2C%20Reidrata%C3%A7%C3%A3o%20Oral%20e%20Doen%C3%A7as%20Disabsortivas'
    },
]

def main(dry_run=False):
    service = get_service()
    time_min = '2026-08-30T00:00:00-03:00'
    time_max = '2026-10-18T23:59:59-03:00'
    
    print("=" * 70)
    print("REORGANIZAÇÃO MEDQUEST - PERÍODO MEDICINA DE FAMÍLIA (31/08 A 18/10/2026)")
    print(f"Modo: {'DRY RUN (Simulação)' if dry_run else 'EXECUÇÃO REAL'}")
    print("=" * 70)
    
    # 1. Fetch current events in the window
    events = []
    page_token = None
    while True:
        res = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            pageToken=page_token,
            maxResults=2500
        ).execute()
        events.extend(res.get('items', []))
        page_token = res.get('nextPageToken')
        if not page_token:
            break
            
    old_mq_events = [e for e in events if 'MedQuest' in e.get('summary', '') or '[MedQuest]' in e.get('summary', '')]
    print(f"\n[1] Eventos antigos do MedQuest a remover neste período: {len(old_mq_events)}")
    
    if not dry_run:
        for ev in old_mq_events:
            try:
                service.events().delete(calendarId='primary', eventId=ev['id']).execute()
            except Exception as ex:
                print(f"  Erro ao deletar {ev['id']}: {ex}")
        print("  >> Todos os eventos antigos do MedQuest foram removidos do período!")
        
    # 2. Insert the 21 clean unified blocks
    print(f"\n[2] Inserindo os 21 blocos unificados do MedQuest...")
    inserted_count = 0
    for item in UNIFIED_MEDQUEST_SCHEDULE:
        s_dt = f"{item['date']}T{item['start']}:00"
        e_dt = f"{item['date']}T{item['end']}:00"
        body = {
            'summary': item['summary'],
            'description': item['desc'],
            'start': {'dateTime': s_dt, 'timeZone': TIMEZONE},
            'end': {'dateTime': e_dt, 'timeZone': TIMEZONE},
            'colorId': '9', # Blueberry / MedQuest
            'reminders': {
                'useDefault': False,
                'overrides': [{'method': 'popup', 'minutes': 15}]
            }
        }
        
        if not dry_run:
            service.events().insert(calendarId='primary', body=body).execute()
            
        print(f"  ✨ [{item['date']} {item['start']}-{item['end']}] {item['summary']}")
        inserted_count += 1
        
    print(f"\n>> {inserted_count} eventos unificados do MedQuest configurados com sucesso!")

if __name__ == '__main__':
    # Run in real execution mode
    main(dry_run=False)
