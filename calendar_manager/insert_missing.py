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

SKINCARE_TREATMENTS = {
    0: ("Hidratação & Reparação profunda", "Sem ácidos hoje. Foco em restaurar a barreira cutânea."),
    1: ("Ácido Salicílico", "Controle de sebo, desobstrução de poros e prevenção de cravos/espinhas."),
    2: ("Adapaleno ou Retinol", "Renovação celular acelerada e estímulo de colágeno."),
    3: ("Ácido Salicílico + Argila Verde (Opcional)", "Limpeza profunda dos poros e controle de oleosidade pós-plantão."),
    4: ("Adapaleno ou Retinol", "Melhora de textura e uniformização da pele."),
    5: ("Ácido Salicílico", "Combate à oleosidade acumulada da semana."),
    6: ("Adapaleno ou Retinol + Argila Verde", "Spa Day / Renovação da pele e fechamento dos poros.")
}

HAIR_CYCLE = [
    # Semana 1
    {"day": 1, "type": "H", "title": "Hidratação (H)", "desc": "Lavar com shampoo neutro, aplicar máscara de babosa/pantenol por 10 min e condicionar."},
    {"day": 2, "type": "off", "title": "Descanso", "desc": "Evitar lavar os fios."},
    {"day": 3, "type": "N", "title": "Nutrição (N)", "desc": "Lavar com shampoo hidratante, aplicar máscara nutritiva (óleos/manteigas) por 15 min."},
    {"day": 4, "type": "off", "title": "Descanso", "desc": "Deixe os óleos naturais agirem."},
    {"day": 5, "type": "H", "title": "Hidratação (H)", "desc": "Lavar com shampoo neutro, máscara hidratante leve e selar com condicionador."},
    {"day": 6, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 7, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    # Semana 2
    {"day": 8, "type": "N", "title": "Nutrição (N)", "desc": "Lavar e aplicar máscara nutritiva para repor os lipídeos."},
    {"day": 9, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 10, "type": "H", "title": "Hidratação (H)", "desc": "Foco em reposição hídrica profunda para combater o frizz."},
    {"day": 11, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 12, "type": "U", "title": "Umectação (U)", "desc": "Aplicar óleo vegetal (coco/argan) nos fios secos à noite, lavar na manhã seguinte."},
    {"day": 13, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 14, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    # Semana 3
    {"day": 15, "type": "H", "title": "Hidratação (H)", "desc": "Reposição de água nos fios. Use touca térmica se tiver."},
    {"day": 16, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 17, "type": "N", "title": "Nutrição (N)", "desc": "Nutrição rica em óleo vegetal/manteiga de karité para dar brilho."},
    {"day": 18, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 19, "type": "H", "title": "Hidratação (H)", "desc": "Lavar normalmente e hidratar para maciez."},
    {"day": 20, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 21, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    # Semana 4
    {"day": 22, "type": "N", "title": "Nutrição (N)", "desc": "Combate ao frizz e ressecamento persistente."},
    {"day": 23, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 24, "type": "H", "title": "Hidratação (H)", "desc": "Preparação dos fios para a reconstrução."},
    {"day": 25, "type": "off", "title": "Descanso", "desc": "Descanso capilar."},
    {"day": 26, "type": "R", "title": "Reconstrução (R)", "desc": "Lavar, aplicar queratina líquida ou máscara reconstrutora por 10 min. Enxaguar e selar."},
    {"day": 27, "type": "off", "title": "Descanso", "desc": "Descanso capilar pós-reconstrução."},
    {"day": 28, "type": "off", "title": "Descanso", "desc": "Final do ciclo capilar de 4 semanas."}
]

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def format_morning_description():
    return (
        "☀️ PROTOCOLO MATINAL — DESPERTAR & PROTEÇÃO\n\n"
        "1. 💧 (02 min) Hidratação: Beber 400–500ml de água logo ao acordar.\n"
        "2. 🛏️ (03 min) Quarto: Arrumar a cama e abrir janelas/cortinas (luz natural para despertar o ritmo circadiano).\n"
        "3. 🚿 (15 min) Banho & Higiene:\n"
        "   • Banho rápido e revigorante\n"
        "   • Fio dental + escovação dental\n"
        "   • Skincare matinal:\n"
        "     - Gel de limpeza facial suave\n"
        "     - Hidratante facial Oil-Free\n"
        "     - 🛡️ Protetor Solar Facial FPS 50+ (essencial!)\n"
        "4. 🍳 (15 min) Combustível: Café da manhã hiperproteico + Café preto.\n"
        "5. 🎒 (05 min) Check-out: Pegar mochila conferida (esteto, carimbo, crachá), marmitas e garrafa de água.\n"
        "6. 🚗 Saída tranquila e pontual no horário!"
    )

def format_night_description(day_of_week, hair_info):
    skin_treatment, skin_desc = SKINCARE_TREATMENTS[day_of_week]
    
    hair_text = f"• Ação Capilar de Hoje: {hair_info['title']}\n   - Detalhe: {hair_info['desc']}"
    
    return (
        f"🌙 PROTOCOLO NOTURNO — DESCOMPRESSÃO, CUIDADOS & ATRITO ZERO\n\n"
        f"1. 📝 (05 min) Fechamento Mental:\n"
        f"   • Anotar pendências para esvaziar a mente (Inbox Zero)\n"
        f"   • Eleger as Top 3 prioridades de amanhã\n\n"
        f"2. 💆‍♂️ (20 min) Cuidados Pessoais & Banho Noturno:\n"
        f"   • Banho morno relaxante\n"
        f"   {hair_text}\n"
        f"   • Skincare Noturno:\n"
        f"     - Double Cleansing (remover protetor solar e impurezas)\n"
        f"     - Tratamento Ativo: {skin_treatment} ({skin_desc})\n"
        f"     - Hidratante reparador de barreira cutânea\n\n"
        f"3. 👔 (10 min) Preparação do Amanhã (Princípio do Atrito Zero):\n"
        f"   • Separar roupa completa de amanhã (internato + academia no cabide)\n"
        f"   • Deixar marmitas organizadas e garrafa de água abastecida na geladeira\n"
        f"   • Conferir itens da mochila (estetoscópio, crachá, carimbo, jaleco)\n\n"
        f"4. 📵 (10 min) Higiene do Sono & Desconexão:\n"
        f"   • Luzes baixas e quentes / Celular no modo 'Não Perturbe'\n"
        f"   • Desconectar de telas 30 min antes de deitar\n"
        f"   • 😴 23:00: Dormir para garantir 7h+ de sono reparador e regenerativo!"
    )

def main():
    service = get_service()
    
    # Range: from tomorrow 2026-08-28 until 2026-10-04 (end of scheduled block)
    start_date = datetime(2026, 8, 28)
    end_date = datetime(2026, 10, 4)
    
    time_min = start_date.strftime('%Y-%m-%dT00:00:00-03:00')
    time_max = (end_date + timedelta(days=1)).strftime('%Y-%m-%dT00:00:00-03:00')
    
    print(f"Buscando eventos existentes entre {start_date.strftime('%d/%m/%Y')} e {end_date.strftime('%d/%m/%Y')}...")
    events_result = service.events().list(
        calendarId='primary', timeMin=time_min, timeMax=time_max,
        singleEvents=True, orderBy='startTime', maxResults=2000
    ).execute()
    existing_events = events_result.get('items', [])
    
    # Map events by date
    days_events = {}
    current = start_date
    while current <= end_date:
        days_events[current.strftime('%Y-%m-%d')] = []
        current += timedelta(days=1)
        
    for ev in existing_events:
        st = ev['start'].get('dateTime', ev['start'].get('date', ''))
        if 'T' in st:
            d = st.split('T')[0]
            if d in days_events:
                days_events[d].append(ev)
                
    # Calculate rituals to insert
    rituals_to_insert = []
    
    current = start_date
    hair_day_idx = 0  # Start on cycle day 1
    
    while current <= end_date:
        d_str = current.strftime('%Y-%m-%d')
        dow = current.weekday() # 0 = Seg, 6 = Dom
        py_dow = (dow + 1) % 7   # 0 = Dom, 1 = Seg, ..., 6 = Sab
        
        hair_info = HAIR_CYCLE[hair_day_idx % len(HAIR_CYCLE)]
        hair_day_idx += 1
        
        # Check earliest timed event of this day
        evs = days_events[d_str]
        earliest_time = None
        latest_end_time = None
        
        for ev in evs:
            st = ev['start'].get('dateTime', '')
            et = ev['end'].get('dateTime', '')
            if st and 'T' in st:
                t_str = st.split('T')[1][:5]
                if earliest_time is None or t_str < earliest_time:
                    earliest_time = t_str
            if et and 'T' in et:
                t_str = et.split('T')[1][:5]
                if latest_end_time is None or t_str > latest_end_time:
                    latest_end_time = t_str
                    
        # 1. MORNING RITUAL TIMING
        if earliest_time:
            if earliest_time <= "07:00":
                m_start = "06:15"
                m_dur = 40
            elif earliest_time <= "07:30":
                m_start = "06:45"
                m_dur = 40
            elif earliest_time <= "08:00":
                m_start = "07:00"
                m_dur = 45
            else:
                m_start = "07:30"
                m_dur = 45
        else:
            # Weekend / No morning event
            m_start = "07:30" if dow in [5, 6] else "07:00"
            m_dur = 45
            
        m_title = "☀️ Ritual Matinal (Cama, Skincare, Café & Saída)"
        m_desc = format_morning_description()
        
        rituals_to_insert.append({
            'd': d_str,
            's': m_start,
            'dur': m_dur,
            't': m_title,
            'desc': m_desc,
            'c': '5' # Banana / Yellow
        })
        
        # 2. NIGHT RITUAL TIMING
        if latest_end_time and latest_end_time >= "22:15":
            n_start = "22:30"
            n_dur = 30
        else:
            n_start = "22:15"
            n_dur = 45
            
        n_title = f"🌙 Ritual Noturno ({hair_info['type']}: {hair_info['title']})" if hair_info['type'] != 'off' else "🌙 Ritual Noturno (Skincare & Preparação)"
        n_desc = format_night_description(py_dow, hair_info)
        
        rituals_to_insert.append({
            'd': d_str,
            's': n_start,
            'dur': n_dur,
            't': n_title,
            'desc': n_desc,
            'c': '1' # Lavender / Soft Blue
        })
        
        current += timedelta(days=1)
        
    print(f"\nTotal de rituais calculados: {len(rituals_to_insert)} ({len(rituals_to_insert)//2} dias)")
    
    # Check if existing ritual events exist to delete/avoid duplicate
    print("Verificando se já existem rituais anteriores para evitar duplicatas...")
    existing_rituals = [
        ev for ev in existing_events 
        if any(k in ev.get('summary', '') for k in ['Ritual Matinal', 'Ritual Noturno', '☀️ Ritual', '🌙 Ritual'])
    ]
    if existing_rituals:
        print(f"Removendo {len(existing_rituals)} rituais antigos...")
        for ev in existing_rituals:
            service.events().delete(calendarId='primary', eventId=ev['id']).execute()
            
    print("\nInserindo novos rituais no Google Agenda...")
    count = 0
    for r in rituals_to_insert:
        start_dt = datetime.strptime(f"{r['d']} {r['s']}", '%Y-%m-%d %H:%M')
        end_dt = start_dt + timedelta(minutes=r['dur'])
        
        body = {
            'summary': r['t'],
            'description': r['desc'],
            'start': {'dateTime': start_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'end': {'dateTime': end_dt.strftime('%Y-%m-%dT%H:%M:%S-03:00'), 'timeZone': TIMEZONE},
            'colorId': r['c'],
            'reminders': {'useDefault': False, 'overrides': [{'method': 'popup', 'minutes': 10}]}
        }
        
        service.events().insert(calendarId='primary', body=body).execute()
        count += 1
        print(f"  [{count}/{len(rituals_to_insert)}] Inserido: {r['d']} {r['s']}-{end_dt.strftime('%H:%M')} | {r['t']}")
        
    print(f"\n🎉 Sucesso absoluto! {count} eventos de Rituais Matinais e Noturnos inseridos no Google Agenda com sono de 7h+ blindado!")

if __name__ == '__main__':
    main()
