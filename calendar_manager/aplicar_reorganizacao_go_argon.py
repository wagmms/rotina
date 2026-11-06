#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Sincronização Cirúrgica do Google Calendar - Bloco GO RCG0504
Gerado a partir do Parecer de Alta Performance do Gemini 4 Argon.
"""
import os
import sys
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def main():
    service = get_service()
    cal_id = 'primary'

    # 1. ATUALIZAÇÕES DE EVENTOS EXISTENTES (PATCH)
    patches = [
        # --- SEMANA 1 (24/10 a 01/11) ---
        # Sáb 24/10: Vitalidade Fetal Teoria
        {
            'id': 'kfm0udmeu8o94sbor1tqldvhb4',
            'summary': '[MedQuest] 📖 Avaliação da Vitalidade Fetal, Cardiotocografia e Sofrimento Fetal (Parte 1: Teoria - Kit Pré-Parto)',
            'start': {'dateTime': '2026-10-24T13:30:00-03:00'},
            'end': {'dateTime': '2026-10-24T15:45:00-03:00'}
        },
        # Sáb 24/10: Condições Clínicas e Urgências Hipertensivas Teoria
        {
            'id': '7qqq9e4j9p6998cgnr0vean0ec',
            'summary': '[MedQuest] 📖 Condições Clínicas Intercorrentes e Urgências Hipertensivas na Gravidez (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-24T16:00:00-03:00'},
            'end': {'dateTime': '2026-10-24T17:15:00-03:00'}
        },
        # Dom 25/10: Academia #2 (ajuste para 08:30 - 09:30)
        {
            'id': '3j2m46dj6pbiseun8bsr92ms98',
            'summary': '💪 Academia #2',
            'start': {'dateTime': '2026-10-25T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-25T09:30:00-03:00'}
        },
        # Dom 25/10: Condições Clínicas + Vitalidade Questões
        {
            'id': 'i55nf6q8f657nnqq38icfnsq6o',
            'summary': '[MedQuest] ✍️ Condições Clínicas, Urgências Hipertensivas e Vitalidade Fetal (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-25T10:00:00-03:00'},
            'end': {'dateTime': '2026-10-25T12:00:00-03:00'}
        },
        # Dom 25/10: Amenorreias, SOP e Contracepção Teoria
        {
            'id': 'l3p686110usg5f868j5h2rk3k4',
            'summary': '[MedQuest] 📖 Investigação das Amenorreias, SOP e Contracepção/LARC (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-25T13:30:00-03:00'},
            'end': {'dateTime': '2026-10-25T15:45:00-03:00'}
        },
        # Ter 27/10: Academia #3
        {
            'id': '71lnmu0qnmjfvj72sc119j5p88',
            'summary': '💪 Academia #3',
            'start': {'dateTime': '2026-10-27T18:15:00-03:00'},
            'end': {'dateTime': '2026-10-27T19:15:00-03:00'}
        },
        # Ter 27/10: Ciclo Menstrual, Eixo HHO, SOP e Contracepção Questões
        {
            'id': 'hhd02tgom5qied875l3pidrnes',
            'summary': '[MedQuest] ✍️ Ciclo Menstrual, Eixo HHO, SOP e Contracepção (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-27T20:00:00-03:00'},
            'end': {'dateTime': '2026-10-27T21:45:00-03:00'}
        },
        # Qua 28/10: Bacia Obstétrica Teoria (PE)
        {
            'id': '3kqp3rvq145dfcujdauqe39dik',
            'summary': '[MedQuest] 📖 Bacia Obstétrica, Estática Fetal e Mecanismo do Parto (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-28T13:30:00-03:00'},
            'end': {'dateTime': '2026-10-28T15:05:00-03:00'}
        },
        # Qua 28/10: Bacia Obstétrica Questões (PE)
        {
            'id': '8er0mdq6homff01842f9om7in0',
            'summary': '[MedQuest] ✍️ Bacia Obstétrica, Estática Fetal e Mecanismo do Parto (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-28T15:15:00-03:00'},
            'end': {'dateTime': '2026-10-28T16:45:00-03:00'}
        },
        # Sex 30/10: TPP e Tocólise Teoria
        {
            'id': 'mj94cncp8njp1mh6mo9329begs',
            'summary': '[MedQuest] 📖 Trabalho de Parto Prematuro e Tocólise (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-30T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-30T09:45:00-03:00'}
        },
        # Sex 30/10: TPP Questões
        {
            'id': '0746odqmsf12touo56r13gsog8',
            'summary': '[MedQuest] ✍️ Trabalho de Parto Prematuro e Tocólise (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-30T13:30:00-03:00'},
            'end': {'dateTime': '2026-10-30T15:30:00-03:00'}
        },
        # Sex 30/10: RPMO Teoria
        {
            'id': 'qr1bvh3dcgkieeakn0a4r4o478',
            'summary': '[MedQuest] 📖 Amniorrexe Prematura (RPMO) e Corioamnionite (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-30T15:45:00-03:00'},
            'end': {'dateTime': '2026-10-30T16:35:00-03:00'}
        },
        # Sáb 31/10: RPMO Questões (Tarde)
        {
            'id': 'jt88qtm9ll2sutfqjcgdi4sc24',
            'summary': '[MedQuest] ✍️ Amniorrexe Prematura (RPMO) e Corioamnionite (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-31T14:30:00-03:00'},
            'end': {'dateTime': '2026-10-31T16:30:00-03:00'}
        },
        # Dom 01/11: Infecções Perinatais Teoria
        {
            'id': 'qviggklf0ukj2e1e7umb5hiq6o',
            'summary': '[MedQuest] 📖 Infecções Perinatais e Transmissão Vertical (HIV, Sífilis, Hepatites, EGB) (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-01T09:00:00-03:00'},
            'end': {'dateTime': '2026-11-01T11:00:00-03:00'}
        },
        # Dom 01/11: Infecções Perinatais Questões
        {
            'id': 'm2k7o9punq98mh4ltq0mmufh98',
            'summary': '[MedQuest] ✍️ Infecções Perinatais e Transmissão Vertical (HIV, Sífilis, Hepatites, EGB) (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-01T11:15:00-03:00'},
            'end': {'dateTime': '2026-11-01T13:00:00-03:00'}
        },

        # --- SEMANA 2 (02/11 a 08/11) ---
        # Seg 02/11 (Feriado): Hemorragias Teoria
        {
            'id': 't6hfp3tip0gb1t23ekudhnagl0',
            'summary': '[MedQuest] 📖 Hemorragias da Primeira e Segunda Metade (Placenta Prévia, DPP) e HPP (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-02T08:30:00-03:00'},
            'end': {'dateTime': '2026-11-02T09:50:00-03:00'}
        },
        # Seg 02/11 (Feriado): Hemorragias Questões
        {
            'id': 'ncb8gph956crd5bg3ufgi9dnl0',
            'summary': '[MedQuest] ✍️ Hemorragias da Gestação e Puerperais (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-02T13:30:00-03:00'},
            'end': {'dateTime': '2026-11-02T15:30:00-03:00'}
        },
        # Ter 03/11: Medicina Fetal Teoria
        {
            'id': 'vcdou1arnd6b2bnfutkef95to4',
            'summary': '[MedQuest] 📖 Medicina Fetal: RCIU, Isoimunização Rh e Gemelaridade (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-03T20:00:00-03:00'},
            'end': {'dateTime': '2026-11-03T21:15:00-03:00'}
        },
        # Qua 04/11: Câncer de Colo Teoria (PE Manhã)
        {
            'id': 'g19toq3ofuitaujpkp5kra077o',
            'summary': '[MedQuest] 📖 Câncer de Colo Uterino e Lesões Precursoras / PTGI (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-04T08:00:00-03:00'},
            'end': {'dateTime': '2026-11-04T09:00:00-03:00'}
        },
        # Qua 04/11: Câncer de Colo Questões (PE Manhã)
        {
            'id': 'khob2haon98qda2m269rr74kd8',
            'summary': '[MedQuest] ✍️ Câncer de Colo Uterino e Lesões Precursoras / PTGI (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-04T09:15:00-03:00'},
            'end': {'dateTime': '2026-11-04T11:15:00-03:00'}
        },
        # Sáb 07/11: Afecções do Corpo Uterino Teoria
        {
            'id': 'c8c5jmot5v3cgij9pf6q5id40o',
            'summary': '[MedQuest] 📖 Afecções do Corpo Uterino, Endométrio, SUA (PALM-COEIN) e SPM (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-07T08:30:00-03:00'},
            'end': {'dateTime': '2026-11-07T09:45:00-03:00'}
        },
        # Sáb 07/11: Afecções do Corpo Uterino Questões
        {
            'id': 'su6o71jcerdev5kom50p7jdt0c',
            'summary': '[MedQuest] ✍️ Afecções do Corpo Uterino, Endométrio e SUA (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-07T10:00:00-03:00'},
            'end': {'dateTime': '2026-11-07T12:00:00-03:00'}
        },
        # Sáb 07/11: Medicina Fetal Questões
        {
            'id': 'f7ci10i6rbnikualv4sff122lg',
            'summary': '[MedQuest] ✍️ Medicina Fetal: RCIU, Isoimunização Rh e Gemelaridade (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-07T13:30:00-03:00'},
            'end': {'dateTime': '2026-11-07T15:30:00-03:00'}
        },
        # Dom 08/11: Vulvovaginites Teoria
        {
            'id': 'pqbbur7a1q0onj5n5pt976ctr4',
            'summary': '[MedQuest] 📖 Vulvovaginites e Diagnóstico Diferencial dos Corrimentos Vaginais (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-08T11:00:00-03:00'},
            'end': {'dateTime': '2026-11-08T12:00:00-03:00'}
        },
        # Dom 08/11: Vulvovaginites Questões
        {
            'id': 'q6okiibqb7cbkv3tlpjj27f1jo',
            'summary': '[MedQuest] ✍️ Vulvovaginites e Diagnóstico Diferencial dos Corrimentos Vaginais (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-08T13:30:00-03:00'},
            'end': {'dateTime': '2026-11-08T15:30:00-03:00'}
        },

        # --- SEMANA 3 (09/11 a 15/11) ---
        # Seg 09/11: DIP Teoria
        {
            'id': 'p64oifcgcb50jl6lpd3s2r0t28',
            'summary': '[MedQuest] 📖 Doença Inflamatória Pélvica (DIP) e Atendimento à Violência Sexual (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-09T19:45:00-03:00'},
            'end': {'dateTime': '2026-11-09T21:25:00-03:00'}
        },
        # Ter 10/11: DIP Questões (DCC 6)
        {
            'id': 'qae4natm7h1vo7vl4hhnn7q2fc',
            'summary': '[MedQuest] ✍️ Doença Inflamatória Pélvica (DIP) e Atendimento à Violência Sexual (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-10T14:30:00-03:00'},
            'end': {'dateTime': '2026-11-10T16:30:00-03:00'}
        },
        # Qua 11/11: Úlceras Genitais Teoria
        {
            'id': 'p9pm24c0naqc1rqdq1mucqer1o',
            'summary': '[MedQuest] 📖 Úlceras Genitais e ISTs na Mulher (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-11T14:30:00-03:00'},
            'end': {'dateTime': '2026-11-11T16:15:00-03:00'}
        },
        # Qua 11/11: Úlceras Genitais Questões
        {
            'id': 'ppj1n2sf8ua2n00h5aelvk7pl8',
            'summary': '[MedQuest] ✍️ Úlceras Genitais e ISTs na Mulher (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-11T19:00:00-03:00'},
            'end': {'dateTime': '2026-11-11T21:00:00-03:00'}
        },
        # Qui 12/11: Patologias da Vulva e Vagina Teoria
        {
            'id': 't6tv12gfj96cs5a63ko8sq76cg',
            'summary': '[MedQuest] 📖 Patologias Benignas e Neoplásicas da Vulva e Vagina (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-12T19:45:00-03:00'},
            'end': {'dateTime': '2026-11-12T21:00:00-03:00'}
        },
        # Sáb 14/11: Patologias da Vulva Questões
        {
            'id': '83ddqvh6tbj2q4v85nvtps5u00',
            'summary': '[MedQuest] ✍️ Patologias Benignas e Neoplásicas da Vulva e Vagina (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-14T10:30:00-03:00'},
            'end': {'dateTime': '2026-11-14T12:30:00-03:00'}
        },
        # Dom 15/11: Infertilidade Teoria
        {
            'id': 'v503i0s4ip4v2bo1vbftck3ebo',
            'summary': '[MedQuest] 📖 Investigação e Propedêutica da Infertilidade Conjugal (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-15T09:00:00-03:00'},
            'end': {'dateTime': '2026-11-15T10:25:00-03:00'}
        },
        # Dom 15/11: Infertilidade Questões
        {
            'id': 'b5nlfadtgs059a3q96ee5ftsfs',
            'summary': '[MedQuest] ✍️ Investigação e Propedêutica da Infertilidade Conjugal (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-15T10:40:00-03:00'},
            'end': {'dateTime': '2026-11-15T12:40:00-03:00'}
        },

        # --- SEMANA 4 (16/11 a 22/11) ---
        # Seg 16/11: Anatomia Cirúrgica Teoria (PE Manhã)
        {
            'id': 'l1mgranfaskrabea4p6mtc3jgg',
            'summary': '[MedQuest] 📖 Anatomia Cirúrgica e Estruturas Pélvicas Femininas (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-16T08:00:00-03:00'},
            'end': {'dateTime': '2026-11-16T09:05:00-03:00'}
        },
        # Seg 16/11: Anatomia Cirúrgica Questões (PE Manhã)
        {
            'id': 'ogdngegdsvebmmqbshpio62258',
            'summary': '[MedQuest] ✍️ Anatomia Cirúrgica e Estruturas Pélvicas Femininas (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-16T09:15:00-03:00'},
            'end': {'dateTime': '2026-11-16T10:45:00-03:00'}
        },
        # Ter 17/11: Endometriose Teoria (Noite)
        {
            'id': 'dpq3h59l2tc1keo47j61rprh18',
            'summary': '[MedQuest] 📖 Endometriose, Adenomiose e Dor Pélvica Crônica (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-17T19:00:00-03:00'},
            'end': {'dateTime': '2026-11-17T20:45:00-03:00'}
        },
        # Sex 20/11: Massas Anexiais Teoria
        {
            'id': 'ls3e141parqsngjkppeh0ahcdk',
            'summary': '[MedQuest] 📖 Massas Anexiais e Neoplasias Ovarianas (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-20T08:30:00-03:00'},
            'end': {'dateTime': '2026-11-20T09:20:00-03:00'}
        },
        # Sex 20/11: Massas Anexiais Questões
        {
            'id': '7j04655cc2qraqsfe9dj0pvirs',
            'summary': '[MedQuest] ✍️ Massas Anexiais e Neoplasias Ovarianas (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-20T11:00:00-03:00'},
            'end': {'dateTime': '2026-11-20T12:30:00-03:00'}
        },
        # Sex 20/11: Endometriose Questões
        {
            'id': 'rcujahdevtbuv249ar31supc4s',
            'summary': '[MedQuest] ✍️ Endometriose, Adenomiose e Dor Pélvica Crônica (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-20T13:30:00-03:00'},
            'end': {'dateTime': '2026-11-20T15:30:00-03:00'}
        },
        # Sáb 21/11: Câncer de Mama Teoria
        {
            'id': 'urfr74nu8rvr6vga41c5ctr79o',
            'summary': '[MedQuest] 📖 Câncer de Mama e Doenças Benignas: Rastreamento, Diagnóstico e Estadiamento (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-21T08:30:00-03:00'},
            'end': {'dateTime': '2026-11-21T10:35:00-03:00'}
        },
        # Sáb 21/11: Câncer de Mama Questões
        {
            'id': 'ojhp9ra2k7fmn40dkg3avdu298',
            'summary': '[MedQuest] ✍️ Câncer de Mama e Doenças Benignas (Parte 2: Questões)',
            'start': {'dateTime': '2026-11-21T10:50:00-03:00'},
            'end': {'dateTime': '2026-11-21T12:50:00-03:00'}
        },
        # Sáb 21/11: Uroginecologia Teoria
        {
            'id': 'o0om3c3h0stneb2e3eb85es0cc',
            'summary': '[MedQuest] 📖 Uroginecologia: Incontinência Urinária e Prolapso Genital (Parte 1: Teoria)',
            'start': {'dateTime': '2026-11-21T14:00:00-03:00'},
            'end': {'dateTime': '2026-11-21T15:45:00-03:00'}
        },
        # Dom 22/11: Uroginecologia Questões
        {
            'id': 'iskjvbu47t4klh3veg3elu7hic',
            'summary': '[MedQuest] ✍️ Uroginecologia: Incontinência Urinária e Prolapso Genital (Parte 2: Questões) - [100% EDITAL CONCLUÍDO]',
            'start': {'dateTime': '2026-11-22T11:00:00-03:00'},
            'end': {'dateTime': '2026-11-22T13:00:00-03:00'}
        }
    ]

    print(f"Executando PATCH de {len(patches)} eventos existentes...")
    for idx, item in enumerate(patches, 1):
        try:
            event_id = item['id']
            body = {
                'summary': item['summary'],
                'start': item['start'],
                'end': item['end']
            }
            res = service.events().patch(calendarId=cal_id, eventId=event_id, body=body).execute()
            print(f"[{idx}/{len(patches)}] ✅ PATCH: {res.get('summary')} -> {res['start'].get('dateTime')}")
        except Exception as e:
            print(f"[{idx}/{len(patches)}] ⚠️ Erro no evento {item['id']}: {e}")
        time.sleep(0.3)

    # 2. INSERÇÕES DE NOVOS EVENTOS (ACADEMIA, VIDA PESSOAL E SIMULADO FINAL)
    new_events = [
        # --- ACADEMIA ---
        {'summary': '💪 Academia #1', 'start': {'dateTime': '2026-10-24T17:30:00-03:00'}, 'end': {'dateTime': '2026-10-24T18:30:00-03:00'}, 'description': 'Treino de Força e Condicionamento'},
        {'summary': '💪 Academia #4', 'start': {'dateTime': '2026-10-30T10:30:00-03:00'}, 'end': {'dateTime': '2026-10-30T11:30:00-03:00'}, 'description': 'Treino pré-plantão moderado'},
        {'summary': '💪 Academia #1', 'start': {'dateTime': '2026-11-02T10:00:00-03:00'}, 'end': {'dateTime': '2026-11-02T11:00:00-03:00'}, 'description': 'Treino de Força (Feriado)'},
        {'summary': '💪 Academia #2', 'start': {'dateTime': '2026-11-03T18:15:00-03:00'}, 'end': {'dateTime': '2026-11-03T19:15:00-03:00'}, 'description': 'Treino pós-DCC 5a'},
        {'summary': '💪 Academia #3', 'start': {'dateTime': '2026-11-06T18:00:00-03:00'}, 'end': {'dateTime': '2026-11-06T19:00:00-03:00'}, 'description': 'Treino pós-CSE Cuiabá'},
        {'summary': '💪 Academia #4', 'start': {'dateTime': '2026-11-08T09:30:00-03:00'}, 'end': {'dateTime': '2026-11-08T10:30:00-03:00'}, 'description': 'Treino de Domingo'},
        {'summary': '💪 Academia #1', 'start': {'dateTime': '2026-11-09T18:00:00-03:00'}, 'end': {'dateTime': '2026-11-09T19:00:00-03:00'}, 'description': 'Treino pós-Vila Lobato'},
        {'summary': '💪 Academia #2', 'start': {'dateTime': '2026-11-11T16:30:00-03:00'}, 'end': {'dateTime': '2026-11-11T17:30:00-03:00'}, 'description': 'Treino após sono pós-plantão'},
        {'summary': '💪 Academia #3', 'start': {'dateTime': '2026-11-12T18:15:00-03:00'}, 'end': {'dateTime': '2026-11-12T19:15:00-03:00'}, 'description': 'Treino pós-DCC 7'},
        {'summary': '💪 Academia #4', 'start': {'dateTime': '2026-11-14T09:00:00-03:00'}, 'end': {'dateTime': '2026-11-14T10:00:00-03:00'}, 'description': 'Treino de Sábado'},
        {'summary': '💪 Academia #1', 'start': {'dateTime': '2026-11-16T11:00:00-03:00'}, 'end': {'dateTime': '2026-11-16T12:00:00-03:00'}, 'description': 'Treino no PE da Manhã'},
        {'summary': '💪 Academia #2', 'start': {'dateTime': '2026-11-19T18:15:00-03:00'}, 'end': {'dateTime': '2026-11-19T19:15:00-03:00'}, 'description': 'Treino regenerativo pós-DCC 9'},
        {'summary': '💪 Academia #3', 'start': {'dateTime': '2026-11-20T09:30:00-03:00'}, 'end': {'dateTime': '2026-11-20T10:30:00-03:00'}, 'description': 'Treino na Sexta Livre'},
        {'summary': '💪 Academia #4', 'start': {'dateTime': '2026-11-22T09:30:00-03:00'}, 'end': {'dateTime': '2026-11-22T10:30:00-03:00'}, 'description': 'Treino de Domingo'},
        {'summary': '💪 Academia #1', 'start': {'dateTime': '2026-11-23T17:30:00-03:00'}, 'end': {'dateTime': '2026-11-23T18:30:00-03:00'}, 'description': 'Treino pós-Simulado Geral'},
        {'summary': '💪 Academia #2', 'start': {'dateTime': '2026-11-24T18:15:00-03:00'}, 'end': {'dateTime': '2026-11-24T19:15:00-03:00'}, 'description': 'Treino pré-viagem SP'},
        {'summary': '💪 Academia #3', 'start': {'dateTime': '2026-11-27T18:00:00-03:00'}, 'end': {'dateTime': '2026-11-27T19:00:00-03:00'}, 'description': 'Treino comemorativo de encerramento do bloco'},

        # --- TEMPO COM A NAMORADA / VIDA PESSOAL ---
        {'summary': '❤️ Noite com a Namorada', 'start': {'dateTime': '2026-10-24T19:00:00-03:00'}, 'end': {'dateTime': '2026-10-24T23:00:00-03:00'}, 'description': 'Descanso e lazer blindados'},
        {'summary': '❤️ Tarde e Noite com a Namorada', 'start': {'dateTime': '2026-10-25T16:00:00-03:00'}, 'end': {'dateTime': '2026-10-25T21:30:00-03:00'}, 'description': 'Lazer e recarga antes da semana de CO'},
        {'summary': '❤️ Jantar e Noite com a Namorada', 'start': {'dateTime': '2026-10-29T19:30:00-03:00'}, 'end': {'dateTime': '2026-10-29T23:00:00-03:00'}, 'description': 'Compensação da sexta de plantão noturno'},
        {'summary': '❤️ Noite com a Namorada', 'start': {'dateTime': '2026-10-31T17:00:00-03:00'}, 'end': {'dateTime': '2026-10-31T23:00:00-03:00'}, 'description': 'Lazer pós-recuperação do CO'},
        {'summary': '❤️ Tarde e Noite LIVRES com a Namorada', 'start': {'dateTime': '2026-11-01T13:30:00-03:00'}, 'end': {'dateTime': '2026-11-01T21:30:00-03:00'}, 'description': 'Domingo livre'},
        {'summary': '❤️ Feriado com a Namorada', 'start': {'dateTime': '2026-11-02T16:00:00-03:00'}, 'end': {'dateTime': '2026-11-02T22:00:00-03:00'}, 'description': 'Descanso de Finados'},
        {'summary': '❤️ SEXTA BLINDADA COM A NAMORADA', 'start': {'dateTime': '2026-11-06T19:30:00-03:00'}, 'end': {'dateTime': '2026-11-06T23:30:00-03:00'}, 'description': 'Jantar e noite a dois'},
        {'summary': '❤️ Noite com a Namorada', 'start': {'dateTime': '2026-11-07T16:00:00-03:00'}, 'end': {'dateTime': '2026-11-07T23:00:00-03:00'}, 'description': 'Lazer de sábado'},
        {'summary': '❤️ Tarde/Noite LIVRE com a Namorada', 'start': {'dateTime': '2026-11-08T15:30:00-03:00'}, 'end': {'dateTime': '2026-11-08T22:00:00-03:00'}, 'description': 'Domingo de descanso'},
        {'summary': '❤️ SEXTA BLINDADA COM A NAMORADA', 'start': {'dateTime': '2026-11-13T19:00:00-03:00'}, 'end': {'dateTime': '2026-11-13T23:30:00-03:00'}, 'description': 'Noite especial a dois'},
        {'summary': '❤️ Tarde e Noite LIVRES com a Namorada', 'start': {'dateTime': '2026-11-15T13:00:00-03:00'}, 'end': {'dateTime': '2026-11-15T22:00:00-03:00'}, 'description': 'Domingo livre'},
        {'summary': '❤️ TARDE E NOITE BLINDADAS COM A NAMORADA', 'start': {'dateTime': '2026-11-20T16:00:00-03:00'}, 'end': {'dateTime': '2026-11-20T23:30:00-03:00'}, 'description': 'Sexta livre de estágio - cinema, jantar e romance'},
        {'summary': '❤️ Noite com a Namorada', 'start': {'dateTime': '2026-11-21T16:00:00-03:00'}, 'end': {'dateTime': '2026-11-21T23:00:00-03:00'}, 'description': 'Sábado à noite a dois'},
        {'summary': '❤️ Tarde e Noite LIVRES com a Namorada', 'start': {'dateTime': '2026-11-22T13:30:00-03:00'}, 'end': {'dateTime': '2026-11-22T22:00:00-03:00'}, 'description': 'Domingo livre com o edital 100% batido!'},
        {'summary': '❤️ SEXTA COM A NAMORADA (Comemoração Oficial)', 'start': {'dateTime': '2026-11-27T19:30:00-03:00'}, 'end': {'dateTime': '2026-11-27T23:59:00-03:00'}, 'description': 'Comemoração oficial do encerramento do bloco RCG0504'},

        # --- REVISÃO FINAL / SIMULADO ---
        {'summary': '🎯 Simulado Geral GO e Revisão Final dos 10 DCCs (FMRP-USP)', 'start': {'dateTime': '2026-11-23T13:30:00-03:00'}, 'end': {'dateTime': '2026-11-23T17:00:00-03:00'}, 'description': 'Foco cirúrgico nos temas de corte da banca: Partograma, Hipertensão, Hemorragias, LARC, CA Colo/Mama e SUA.'}
    ]

    print(f"\nInserindo {len(new_events)} novos eventos de Academia, Namorada e Simulado...")
    for idx, item in enumerate(new_events, 1):
        try:
            body = {
                'summary': item['summary'],
                'start': item['start'],
                'end': item['end'],
                'description': item.get('description', '')
            }
            res = service.events().insert(calendarId=cal_id, body=body).execute()
            print(f"[{idx}/{len(new_events)}] ✨ INSERT: {res.get('summary')} -> {res['start'].get('dateTime')}")
        except Exception as e:
            print(f"[{idx}/{len(new_events)}] ⚠️ Erro ao inserir {item['summary']}: {e}")
        time.sleep(0.3)

    print("\n🎉 Sincronização cirúrgica com o Google Calendar concluída com absoluto sucesso!")

if __name__ == '__main__':
    main()
