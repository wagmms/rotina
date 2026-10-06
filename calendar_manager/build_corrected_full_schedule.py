# coding: utf-8
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from datetime import datetime, timedelta

with open(os.path.join(os.path.dirname(__file__), 'templates.json'), 'r', encoding='utf-8') as f:
    templates = json.load(f)

ingles_tpl = templates['ingles']
violao_tpl = templates['violao']

def get_ingles(d_str, s_str, dur=45):
    dt = datetime.strptime(d_str, '%Y-%m-%d')
    wd = str(dt.weekday())
    item = ingles_tpl[wd]
    return {
        'd': d_str, 's': s_str, 'dur': dur,
        't': item['summary'], 'c': '3', 'desc': item['desc']
    }

def get_violao(d_str, s_str, dur=35):
    dt = datetime.strptime(d_str, '%Y-%m-%d')
    if dt < datetime(2026, 9, 7):
        w = '1'
    elif dt < datetime(2026, 9, 14):
        w = '2'
    elif dt < datetime(2026, 9, 21):
        w = '3'
    elif dt < datetime(2026, 9, 28):
        w = '4'
    else:
        w = '5'
    item = violao_tpl[w]
    return {
        'd': d_str, 's': s_str, 'dur': dur,
        't': item['summary'], 'c': '6', 'desc': item['desc']
    }

schedule = [
    # ==========================================
    # SEMANA 1: 31/08 a 06/09
    # Temas: Taquiarritmias (ACLS), Abdome Agudo Inflamatório, Assistência Pré-Natal
    # ==========================================
    # Seg 31/08 (USF 07-11 & 13-17)
    get_ingles('2026-08-31', '11:35', 45),
    get_violao('2026-08-31', '12:20', 35),
    {'d': '2026-08-31', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-08-31', 's': '20:00', 'dur': 125, 't': '[MedQuest] 📖 Taquiarritmias, Bradiarritmias, Síncope e Suporte Avançado (ACLS) (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (2.07h = 124 min)\nSemana 1 • Clínica Médica\n\n🔗 Teoria: https://medquest.live/estudar?subtema=Taquiarritmias%2C%20Bradiarritmias%2C%20S%C3%ADncope%20e%20Suporte%20Avan%C3%A7ado%20%28ACLS%29'},
    
    # Ter 01/09 (Oftalmo 08-12, USF 13-17)
    get_ingles('2026-09-01', '12:10', 45),
    {'d': '2026-09-01', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-01', 's': '19:45', 'dur': 120, 't': '[MedQuest] 📖 Taquiarritmias, Bradiarritmias, Síncope e Suporte Avançado (ACLS) (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 1 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Taquiarritmias%2C%20Bradiarritmias%2C%20S%C3%ADncope%20e%20Suporte%20Avan%C3%A7ado%20%28ACLS%29'},
    {'d': '2026-09-01', 's': '21:45', 'dur': 45, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 02/09 (USF 07-11, USF 13-17)
    get_ingles('2026-09-02', '11:35', 45),
    get_violao('2026-09-02', '12:20', 35),
    {'d': '2026-09-02', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-02', 's': '19:45', 'dur': 150, 't': '[MedQuest] 📖 Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda) (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (2.49h = 149 min)\nSemana 1 • Cirurgia\n\n🔗 Teoria: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Inflamat%C3%B3rio%20%28Apendicite%20e%20Diverticulite%20Aguda%29'},
    
    # Qui 03/09 (USF 07-11, USF 13-17)
    get_ingles('2026-09-03', '11:35', 45),
    get_violao('2026-09-03', '12:20', 35),
    {'d': '2026-09-03', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-03', 's': '20:00', 'dur': 120, 't': '[MedQuest] 📖 Abdome Agudo Inflamatório (Apendicite e Diverticulite Aguda) (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 1 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Inflamat%C3%B3rio%20%28Apendicite%20e%20Diverticulite%20Aguda%29'},
    
    # Sex 04/09 (Manhã livre, USF 13-17)
    {'d': '2026-09-04', 's': '08:00', 'dur': 275, 't': '[MedQuest] 📖 Assistência Pré-Natal de Baixo e Alto Risco (Ginecologia e Obstetrícia)', 'c': '9',
     'desc': '📚 Carga: 4.55h (Teoria: 2.55h + Questões: 2.0h)\nSemana 1 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Assist%C3%AAncia%20Pr%C3%A9-Natal%20de%20Baixo%20e%20Alto%20Risco'},
    {'d': '2026-09-04', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-04', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # 05/09 e 06/09: Viagem Paraty (Livre)
    
    # ==========================================
    # SEMANA 2: 07/09 a 13/09 (Semana Livre de Internato)
    # Temas: Abdome Agudo Obstrutivo, Rastreamento Citopatológico HPV, Cardiopatias Congênitas
    # ==========================================
    # Qua 09/09
    {'d': '2026-09-09', 's': '08:30', 'dur': 180, 't': '[MedQuest] 📖 Abdome Agudo Obstrutivo (Bridas, Neoplasias e Volvo) (Cirurgia)', 'c': '9',
     'desc': '📚 Carga: 2.99h (Teoria: 0.99h + Questões: 2.0h)\nSemana 2 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Abdome%20Agudo%20Obstrutivo%20%28Bridas%2C%20Neoplasias%20e%20Volvo%29'},
    get_ingles('2026-09-09', '11:45', 45),
    get_violao('2026-09-09', '14:00', 45),
    {'d': '2026-09-09', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Qui 10/09
    {'d': '2026-09-10', 's': '08:30', 'dur': 225, 't': '[MedQuest] 📖 Rastreamento Citopatológico e Conduta em Lesões Cervicais (HPV) (Ginecologia e Obstetrícia)', 'c': '9',
     'desc': '📚 Carga: 3.78h (Teoria: 1.78h + Questões: 2.0h)\nSemana 2 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Rastreamento%20Citopatol%C3%B3gico%20e%20Conduta%20em%20Les%C3%B5es%20Cervicais%20%28HPV%29'},
    get_ingles('2026-09-10', '14:00', 45),
    get_violao('2026-09-10', '15:00', 45),
    {'d': '2026-09-10', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Sex 11/09
    {'d': '2026-09-11', 's': '08:30', 'dur': 215, 't': '[MedQuest] 📖 Cardiopatias Congênitas Cianogênicas e Acianogênicas (Pediatria)', 'c': '9',
     'desc': '📚 Carga: 3.6h (Teoria: 1.6h + Questões: 2.0h)\nSemana 2 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Cardiopatias%20Cong%C3%AAnicas%20Cianog%C3%AAnicas%20e%20Acianog%C3%AAnicas'},
    get_ingles('2026-09-11', '14:00', 45),
    get_violao('2026-09-11', '15:00', 45),
    {'d': '2026-09-11', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-11', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 12/09
    get_ingles('2026-09-12', '08:30', 45),
    get_violao('2026-09-12', '09:30', 45),
    {'d': '2026-09-12', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 13/09
    get_ingles('2026-09-13', '08:30', 45),
    get_violao('2026-09-13', '09:30', 45),
    {'d': '2026-09-13', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},

    # ==========================================
    # SEMANA 3: 14/09 a 20/09
    # Temas: Atendimento Inicial ao Politraumatizado, Insuficiência Cardíaca, Diabetes Gestacional
    # ==========================================
    # Seg 14/09
    get_ingles('2026-09-14', '11:35', 45),
    get_violao('2026-09-14', '12:20', 35),
    {'d': '2026-09-14', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-14', 's': '20:15', 'dur': 80, 't': '[MedQuest] 📖 Diabetes Gestacional e Pré-Gestacional (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (1.19h = 71 min)\nSemana 3 • Ginecologia e Obstetrícia\n\n🔗 Teoria: https://medquest.live/estudar?subtema=Diabetes%20Gestacional%20e%20Pr%C3%A9-Gestacional'},
     
    # Ter 15/09
    get_ingles('2026-09-15', '11:35', 45),
    get_violao('2026-09-15', '12:20', 35),
    {'d': '2026-09-15', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-15', 's': '20:00', 'dur': 150, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 16/09 (Otorrino 13:30-17:30)
    get_ingles('2026-09-16', '11:35', 45),
    get_violao('2026-09-16', '12:20', 35),
    {'d': '2026-09-16', 's': '17:45', 'dur': 75, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-16', 's': '20:00', 'dur': 120, 't': '[MedQuest] 📖 Diabetes Gestacional e Pré-Gestacional (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 3 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Diabetes%20Gestacional%20e%20Pr%C3%A9-Gestacional'},
     
    # Qui 17/09
    get_ingles('2026-09-17', '11:35', 45),
    get_violao('2026-09-17', '12:20', 35),
    {'d': '2026-09-17', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Sex 18/09
    {'d': '2026-09-18', 's': '08:00', 'dur': 230, 't': '[MedQuest] 📖 Atendimento Inicial ao Politraumatizado (Protocolo xABCDE) (Cirurgia)', 'c': '9',
     'desc': '📚 Carga: 3.82h (Teoria: 1.82h + Questões: 2.0h)\nSemana 3 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Atendimento%20Inicial%20ao%20Politraumatizado%20%28Protocolo%20xABCDE%29'},
    {'d': '2026-09-18', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-18', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 19/09
    {'d': '2026-09-19', 's': '08:00', 'dur': 255, 't': '[MedQuest] 📖 Insuficiência Cardíaca: Diagnóstico, Estadiamento e Terapia Farmacológica (Clínica Médica)', 'c': '9',
     'desc': '📚 Carga: 4.24h (Teoria: 2.24h + Questões: 2.0h)\nSemana 3 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Insufici%C3%AAncia%20Card%C3%ADaca%3A%20Diagn%C3%B3stico%2C%20Estadiamento%20e%20Terapia%20Farmacol%C3%B3gica'},
    get_ingles('2026-09-19', '12:30', 45),
    {'d': '2026-09-19', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 20/09 (Domingo livre)
    get_ingles('2026-09-20', '08:30', 45),
    get_violao('2026-09-20', '09:30', 45),
    {'d': '2026-09-20', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},

    # ==========================================
    # SEMANA 4: 21/09 a 27/09
    # Temas: Litíase Biliar, Síndromes Coronarianas Agudas (SCA), Arritmias PALS
    # ==========================================
    # Seg 21/09
    get_ingles('2026-09-21', '11:35', 45),
    get_violao('2026-09-21', '12:20', 35),
    {'d': '2026-09-21', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-21', 's': '20:15', 'dur': 80, 't': '[MedQuest] 📖 Arritmias, Síncope e Parada Cardiorrespiratória Pediátrica (PALS) (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (1.2h = 72 min)\nSemana 4 • Pediatria\n\n🔗 Teoria: https://medquest.live/estudar?subtema=Arritmias%2C%20S%C3%ADncope%20e%20Parada%20Cardiorrespirat%C3%B3ria%20Pedi%C3%A1trica%20%28PALS%29'},
     
    # Ter 22/09
    get_ingles('2026-09-22', '11:35', 45),
    get_violao('2026-09-22', '12:20', 35),
    {'d': '2026-09-22', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-22', 's': '20:00', 'dur': 150, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 23/09
    get_ingles('2026-09-23', '11:35', 45),
    get_violao('2026-09-23', '12:20', 35),
    {'d': '2026-09-23', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-23', 's': '20:00', 'dur': 120, 't': '[MedQuest] 📖 Arritmias, Síncope e Parada Cardiorrespiratória Pediátrica (PALS) (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 4 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Arritmias%2C%20S%C3%ADncope%20e%20Parada%20Cardiorrespirat%C3%B3ria%20Pedi%C3%A1trica%20%28PALS%29'},
     
    # Qui 24/09 (Otorrino 08-12, USF 13-17)
    get_ingles('2026-09-24', '12:10', 45),
    {'d': '2026-09-24', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    get_violao('2026-09-24', '19:15', 35),
    
    # Sex 25/09
    {'d': '2026-09-25', 's': '08:00', 'dur': 235, 't': '[MedQuest] 📖 Litíase Biliar, Colecistite, Coledocolitíase e Colangite (Cirurgia)', 'c': '9',
     'desc': '📚 Carga: 3.91h (Teoria: 1.91h + Questões: 2.0h)\nSemana 4 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Lit%C3%ADase%20Biliar%2C%20Colecistite%2C%20Coledocolit%C3%ADase%20e%20Colangite'},
    {'d': '2026-09-25', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-25', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 26/09
    {'d': '2026-09-26', 's': '08:00', 'dur': 260, 't': '[MedQuest] 📖 Síndromes Coronarianas Agudas (Com e Sem Supra de ST) (Clínica Médica)', 'c': '9',
     'desc': '📚 Carga: 4.34h (Teoria: 2.34h + Questões: 2.0h)\nSemana 4 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=S%C3%ADndromes%20Coronarianas%20Agudas%20%28Com%20e%20Sem%20Supra%20de%20ST%29'},
    get_ingles('2026-09-26', '12:30', 45),
    {'d': '2026-09-26', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 27/09
    get_ingles('2026-09-27', '08:30', 45),
    get_violao('2026-09-27', '09:30', 45),
    {'d': '2026-09-27', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},

    # ==========================================
    # SEMANA 5: 28/09 a 04/10
    # Temas: Estudos Epidemiológicos, Dermatologia Clínica, Síndromes Hipertensivas na Gravidez
    # ==========================================
    # Seg 28/09
    get_ingles('2026-09-28', '11:35', 45),
    get_violao('2026-09-28', '12:20', 35),
    {'d': '2026-09-28', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-28', 's': '20:15', 'dur': 80, 't': '[MedQuest] 📖 Síndromes Hipertensivas na Gravidez (Pré-eclâmpsia e Eclâmpsia) (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (1.31h = 79 min)\nSemana 5 • Ginecologia e Obstetrícia\n\n🔗 Teoria: https://medquest.live/estudar?subtema=S%C3%ADndromes%20Hipertensivas%20na%20Gravidez%20%28Pr%C3%A9-ecl%C3%A2mpsia%20e%20Ecl%C3%A2mpsia%29'},
     
    # Ter 29/09
    get_ingles('2026-09-29', '11:35', 45),
    get_violao('2026-09-29', '12:20', 35),
    {'d': '2026-09-29', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-29', 's': '20:00', 'dur': 150, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 30/09
    get_ingles('2026-09-30', '11:35', 45),
    get_violao('2026-09-30', '12:20', 35),
    {'d': '2026-09-30', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-09-30', 's': '20:00', 'dur': 120, 't': '[MedQuest] 📖 Síndromes Hipertensivas na Gravidez (Pré-eclâmpsia e Eclâmpsia) (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 5 • Ginecologia e Obstetrícia\n\n🔗 Questões: https://medquest.live/estudar?subtema=S%C3%ADndromes%20Hipertensivas%20na%20Gravidez%20%28Pr%C3%A9-ecl%C3%A2mpsia%20e%20Ecl%C3%A2mpsia%29'},
     
    # Qui 01/10
    get_ingles('2026-10-01', '11:35', 45),
    get_violao('2026-10-01', '12:20', 35),
    {'d': '2026-10-01', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Sex 02/10
    {'d': '2026-10-02', 's': '08:00', 'dur': 220, 't': '[MedQuest] 📖 Delineamentos e Classificação dos Estudos Epidemiológicos (Preventiva)', 'c': '9',
     'desc': '📚 Carga: 3.6h (Teoria: 1.6h + Questões: 2.0h)\nSemana 5 • Preventiva\n\n🔗 Questões: https://medquest.live/estudar?subtema=Delineamentos%20e%20Classifica%C3%A7%C3%A3o%20dos%20Estudos%20Epidemiol%C3%B3gicos'},
    {'d': '2026-10-02', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-02', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 03/10
    {'d': '2026-10-03', 's': '08:00', 'dur': 200, 't': '[MedQuest] 📖 Dermatologia Clínica: Farmacodermias Graves, Eczemas e Psoríase (Clínica Médica)', 'c': '9',
     'desc': '📚 Carga: 3.3h (Teoria: 1.3h + Questões: 2.0h)\nSemana 5 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Dermatologia%20Cl%C3%ADnica%3A%20Farmacodermias%20Graves%2C%20Eczemas%20e%20Psor%C3%ADase'},
    get_ingles('2026-10-03', '11:30', 45),
    {'d': '2026-10-03', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 04/10
    get_ingles('2026-10-04', '08:30', 45),
    get_violao('2026-10-04', '09:30', 45),
    {'d': '2026-10-04', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},

    # ==========================================
    # SEMANA 6: 05/10 a 11/10
    # Temas: Cirurgia Bariátrica, Dermatoses Infecciosas, Diarreia Aguda
    # ==========================================
    # Seg 05/10 (USF 07-11, Dermato 13:30-17:30)
    get_ingles('2026-10-05', '11:35', 45),
    get_violao('2026-10-05', '12:20', 35),
    {'d': '2026-10-05', 's': '17:45', 'dur': 75, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-05', 's': '20:15', 'dur': 75, 't': '[MedQuest] 📖 Cirurgia Bariátrica e Metabólica (Parte 1: Teoria)', 'c': '9',
     'desc': '📚 Carga: Teoria (1.14h = 68 min)\nSemana 6 • Cirurgia\n\n🔗 Teoria: https://medquest.live/estudar?subtema=Cirurgia%20Bari%C3%A1trica%20e%20Metab%C3%B3lica'},
     
    # Ter 06/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-06', '11:35', 45),
    get_violao('2026-10-06', '12:20', 35),
    {'d': '2026-10-06', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-06', 's': '20:00', 'dur': 150, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 07/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-07', '11:35', 45),
    get_violao('2026-10-07', '12:20', 35),
    {'d': '2026-10-07', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-07', 's': '20:00', 'dur': 120, 't': '[MedQuest] 📖 Cirurgia Bariátrica e Metabólica (Parte 2: Questões)', 'c': '9',
     'desc': '📚 Carga: Questões (2.0h = 120 min)\nSemana 6 • Cirurgia\n\n🔗 Questões: https://medquest.live/estudar?subtema=Cirurgia%20Bari%C3%A1trica%20e%20Metab%C3%B3lica'},
     
    # Qui 08/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-08', '11:35', 45),
    get_violao('2026-10-08', '12:20', 35),
    {'d': '2026-10-08', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Sex 09/10
    {'d': '2026-10-09', 's': '08:00', 'dur': 260, 't': '[MedQuest] 📖 Dermatoses Infecciosas, Hanseníase e Leishmanioses (Clínica Médica)', 'c': '9',
     'desc': '📚 Carga: 4.29h (Teoria: 2.29h + Questões: 2.0h)\nSemana 6 • Clínica Médica\n\n🔗 Questões: https://medquest.live/estudar?subtema=Dermatoses%20Infecciosas%2C%20Hansen%C3%ADase%20e%20Leishmanioses'},
    {'d': '2026-10-09', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-09', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 10/10
    {'d': '2026-10-10', 's': '08:00', 'dur': 200, 't': '[MedQuest] 📖 Diarreia Aguda, Reidratação Oral e Doenças Disabsortivas (Pediatria)', 'c': '9',
     'desc': '📚 Carga: 5.27h (Teoria: 3.27h + Questões: 2.0h)\nSemana 6 • Pediatria\n\n🔗 Questões: https://medquest.live/estudar?subtema=Diarreia%20Aguda%2C%20Reidrata%C3%A7%C3%A3o%20Oral%20e%20Doen%C3%A7as%20Disabsortivas'},
    get_ingles('2026-10-10', '11:30', 45),
    {'d': '2026-10-10', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 11/10
    get_ingles('2026-10-11', '08:30', 45),
    get_violao('2026-10-11', '09:30', 45),
    {'d': '2026-10-11', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},

    # ==========================================
    # SEMANA 7: 12/10 a 18/10 (Última Semana de USF)
    # ==========================================
    # Seg 12/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-12', '11:35', 45),
    get_violao('2026-10-12', '12:20', 35),
    {'d': '2026-10-12', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Ter 13/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-13', '11:35', 45),
    get_violao('2026-10-13', '12:20', 35),
    {'d': '2026-10-13', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-13', 's': '20:00', 'dur': 150, 't': '❤️ Namorada', 'c': '4'},
    
    # Qua 14/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-14', '11:35', 45),
    get_violao('2026-10-14', '12:20', 35),
    {'d': '2026-10-14', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Qui 15/10 (USF 07-11, USF 13-17)
    get_ingles('2026-10-15', '11:35', 45),
    get_violao('2026-10-15', '12:20', 35),
    {'d': '2026-10-15', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    
    # Sex 16/10 (Último dia USF 13-17)
    {'d': '2026-10-16', 's': '17:30', 'dur': 90, 't': '🏋️ Academia', 'c': '8'},
    {'d': '2026-10-16', 's': '19:00', 'dur': 210, 't': '❤️ Date Night!', 'c': '4'},
    
    # Sáb 17/10
    get_ingles('2026-10-17', '08:30', 45),
    get_violao('2026-10-17', '09:30', 45),
    {'d': '2026-10-17', 's': '14:00', 'dur': 510, 't': '❤️ Namorada', 'c': '4'},
    
    # Dom 18/10
    get_ingles('2026-10-18', '08:30', 45),
    get_violao('2026-10-18', '09:30', 45),
    {'d': '2026-10-18', 's': '18:30', 'dur': 240, 't': '❤️ Namorada', 'c': '4'},
]

with open('corrected_full_schedule.json', 'w', encoding='utf-8') as f:
    json.dump(schedule, f, ensure_ascii=False, indent=2)

print('Generated corrected_full_schedule.json with', len(schedule), 'events.')
