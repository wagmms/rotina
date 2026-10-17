#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
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
    cal_id = 'moraes.wagg@gmail.com'

    updates = [
        # 1. SÁBADO 17/10: Hemorragias da 1ª Metade (Teoria + Questões)
        {
            'id': 'teo4f0i2dhviclbfn3t1dubb8g',
            'summary': '[MedQuest] 📖✍️ Hemorragias da Primeira Metade: Abortamento, Ectópica e Mola (Ginecologia e Obstetrícia)',
            'start': {'dateTime': '2026-10-17T09:30:00-03:00'},
            'end': {'dateTime': '2026-10-17T12:30:00-03:00'},
            'description': '🚨 ALVO DE BANCA & PRÉ-PARTO: Hemorragias da 1ª Metade (Triagem e Admissão no Pronto-Socorro Obstétrico)\n• Abortamento: Diferenciação clínica (Ameaça, Completo, Incompleto, Inevitável, Infectado, Retido), condutas de esvaziamento (AMIU se < 12 sem e colo aberto vs Curetagem) e profilaxia com imunoglobulina Anti-D em Rh(-).\n• Gravidez Ectópica: Tríade clínica, critérios para Metotrexate sistêmico (saco gestacional < 3,5 cm, sem BCF, beta-hCG < 5.000 mUI/ml) vs Cirurgia de Emergência (Laparoscopia/Salpingectomia no abdome agudo hemorrágico/choque).\n• Doença Trofoblástica Gestacional (Mola): Esvaziamento por aspiração a vácuo e rastreamento rigoroso de beta-hCG semanal.'
        },
        # 2. SÁBADO 17/10 -> TERÇA 20/10: Mastologia Benigna (Ambulatorial)
        {
            'id': '544sk777q68m4a98n8q9tpk10k',
            'summary': 'Estudo GO: Mastologia Benigna (Fibroadenoma, Cistos e Mastites)',
            'start': {'dateTime': '2026-10-20T19:30:00-03:00'},
            'end': {'dateTime': '2026-10-20T20:30:00-03:00'},
            'description': '🏥 Ginecologia Ambulatorial: Fibroadenoma (nódulo móvel, fibroelástico em jovens), Cistos mamários e Mastites (puerperais vs não puerperais).'
        },
        # 3. SÁBADO 17/10 -> TERÇA 20/10: SOP e Amenorreias (Ambulatorial)
        {
            'id': 'chf9pqf28qddi1vk8tfrevt0do',
            'summary': 'Estudo GO: SOP e Investigação das Amenorreias',
            'start': {'dateTime': '2026-10-20T20:30:00-03:00'},
            'end': {'dateTime': '2026-10-20T21:45:00-03:00'},
            'description': '🏥 Ginecologia Ambulatorial: Síndrome dos Ovários Policísticos (Critérios de Rotterdam, hirsutismo, manejo com ACO e metformina) e fluxograma diagnóstico das amenorreias.'
        },
        # 4. SÁBADO 17/10: Assistência ao Parto FULL (Mantido 13:30 - 15:45, descrição calibrada)
        {
            'id': '5nu1p3a63qh7vai55bcab18rh0',
            'summary': 'Estudo GO: Assistência ao Parto, Mecanismo do Parto e Partograma FULL',
            'start': {'dateTime': '2026-10-17T13:30:00-03:00'},
            'end': {'dateTime': '2026-10-17T15:45:00-03:00'},
            'description': '🚨 CORAÇÃO DO PRÉ-PARTO: Trabalho de Parto e Partograma\n• Períodos clínicos do parto: Dilatação, Expulsivo, Secundamento (Dequitação - Ocitocina 10 UI IM profilática pós-saída do polo cefálico/fetal) e 4º período (Greenhill - hemostasia miotamponamento e trombotamponamento).\n• Mecanismo do parto em apresentação cefálica fletida (6 tempos cardinais: Insinuação, Descida com flexão, Rotação interna da cabeça, Desprendimento cefálico por deflexão, Rotação externa, Desprendimento dos ombros).\n• Partograma e Distocias: Fase ativa prolongada, parada secundária da dilatação, parada secundária da descida e período pélvico prolongado.'
        },
        # 5. DOMINGO 18/10: Puerpério e Hemorragia Pós-Parto (Teoria)
        {
            'id': 'auv3di17ojfph67v1ri6uh929c',
            'summary': '[MedQuest] 📖 Puerpério Fisiológico, Patológico e Hemorragia Pós-Parto (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-18T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-18T10:30:00-03:00'},
            'description': '🚨 MÁXIMA EMERGÊNCIA DO PRÉ-PARTO: Hemorragia Pós-Parto (HPP) e Puerpério\n• Manejo ativo do 3º período: Ocitocina 10 UI IM + tração controlada do cordão.\n• Protocolo dos 4 Ts:\n  1. Tônus (Atonia Uterina - 70-80%): Massagem bimanual de Hamilton, Ocitocina IV concentrada, Ácido Tranexâmico 1g IV precoce, Misoprostol 800mcg retal, Metilergometrina (se normotensa). Balão de Bakri -> B-Lynch -> Histerectomia.\n  2. Trauma: Revisão sistemática de trajeto (lacerações vaginais e de colo).\n  3. Tecido: Restos placentários e acretismo (accreta, increta, percreta).\n  4. Trombo: Coagulopatias maternas.\n• Puerpério patológico: Endometrite puerperal (Clindamicina + Gentamicina).'
        },
        # 6. DOMINGO 18/10: Puerpério e Hemorragia Pós-Parto (Questões)
        {
            'id': '741splpornubueof2gc6q1ous4',
            'summary': '[MedQuest] ✍️ Puerpério Fisiológico, Patológico e Hemorragia Pós-Parto (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-18T10:45:00-03:00'},
            'end': {'dateTime': '2026-10-18T12:45:00-03:00'},
            'description': '📚 Carga: Questões MedQuest / R1-USP / ENARE sobre HPP, conduta em atonia uterina, índice de choque e complicações puerperais.'
        },
        # 7. DOMINGO 18/10: ANTECIPADO: Vitalidade Fetal e CTG (Teoria)
        {
            'id': 'kfm0udmeu8o94sbor1tqldvhb4',
            'summary': '[MedQuest] 📖 Avaliação da Vitalidade Fetal, Cardiotocografia e Sofrimento Fetal (Parte 1: Teoria - Kit Pré-Parto)',
            'start': {'dateTime': '2026-10-18T14:00:00-03:00'},
            'end': {'dateTime': '2026-10-18T16:30:00-03:00'},
            'description': '🚨 INSTRUMENTO CENTRAL DO PRÉ-PARTO: Cardiotocografia (CTG) e Vitalidade Fetal\n• Parâmetros basais: FCF basal (110-160 bpm), Variabilidade (6-25 bpm normal), Acelerações transitórias.\n• Desacelerações intraparto:\n  - DIP 1 (Precoce / Cefálico): Fisiológico por compressão da cabeça fetal, coincide com o pico da contração.\n  - DIP 2 (Tardio): Patológico por hipóxia / insuficiência uteroplacentária, nadir após o pico da contração. Risco de asfixia grave.\n  - DIP 3 (Variável / Umbilical): Compressão de cordão umbilical (formato em V ou U).\n• Categorias I, II e III do ACOG/FIGO e condutas imediatas de reanimação intrauterina.'
        },
        # 8. DOMINGO 18/10: Anki
        {
            'id': '6666sioa2hm6cuv6j6i1c4k2cg',
            'summary': 'Revisão Espaçada: Zerar Anki (Foco Obstetrícia e Pré-Parto)',
            'start': {'dateTime': '2026-10-18T17:00:00-03:00'},
            'end': {'dateTime': '2026-10-18T18:30:00-03:00'},
            'description': 'Revisão ativa no Anki dos cartões cirúrgicos de Obstetrícia: Partograma, Mecanismo do Parto, 4 Ts da HPP, Doses de Ocitocina e Cardiotocografia.'
        },
        # 9. DOMINGO 18/10 -> SÁBADO 24/10: SUA Teoria
        {
            'id': 'vd0tu7hbm37ifgutfjidoflofk',
            'summary': '[MedQuest] 📖 Sangramento Uterino Anormal (SUA) e Classificação PALM-COEIN / Miomatose (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-24T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-24T10:30:00-03:00'},
            'description': '📚 Ginecologia Ambulatorial: Sangramento Uterino Anormal, classificação PALM-COEIN e manejo clínico/cirúrgico da Miomatose Uterina.'
        },
        # 10. DOMINGO 18/10 -> SÁBADO 24/10: SUA Questões
        {
            'id': 'g7u2gs2bmt6vt7n8ildppehruk',
            'summary': '[MedQuest] ✍️ Sangramento Uterino Anormal (SUA) e Classificação PALM-COEIN / Miomatose (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-24T10:45:00-03:00'},
            'end': {'dateTime': '2026-10-24T12:45:00-03:00'},
            'description': '📚 Carga: 2h de questões MedQuest sobre SUA, pólipos, adenomiose e miomas.'
        },
        # 11. QUINTA 22/10 -> DOMINGO 25/10: Uroginecologia Teoria (Liberando a noite de aniversário!)
        {
            'id': 'o0om3c3h0stneb2e3eb85es0cc',
            'summary': '[MedQuest] 📖 Uroginecologia: Incontinência Urinária e Prolapso Genital (Parte 1: Teoria)',
            'start': {'dateTime': '2026-10-25T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-25T10:15:00-03:00'},
            'description': '📚 Ginecologia Ambulatorial: Incontinência urinária de esforço (hipermobilidade do colo vs deficiência esfincteriana intrínseca), bexiga hiperativa e estadiamento POP-Q de prolapsos.'
        },
        # 12. SEXTA 23/10: Ajustar horário das questões de Vitalidade Fetal (pós 1ª semana de pré-parto)
        {
            'id': 'c7vq59vbs1v69bs63m936t4mfk',
            'summary': '[MedQuest] ✍️ Avaliação da Vitalidade Fetal, Cardiotocografia e Sofrimento Fetal (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-23T08:30:00-03:00'},
            'end': {'dateTime': '2026-10-23T10:30:00-03:00'},
            'description': '📚 Consolidação prática de questões de CTG e Vitalidade Fetal após os primeiros plantões no Pré-Parto.'
        },
        # 13. DOMINGO 25/10: Uroginecologia Questões
        {
            'id': 'iskjvbu47t4klh3veg3elu7hic',
            'summary': '[MedQuest] ✍️ Uroginecologia: Incontinência Urinária e Prolapso Genital (Parte 2: Questões)',
            'start': {'dateTime': '2026-10-25T10:30:00-03:00'},
            'end': {'dateTime': '2026-10-25T12:30:00-03:00'},
            'description': '📚 Questões sobre uroginecologia, estudo urodinâmico, slings e cirurgias de suspensão pélvica.'
        }
    ]

    print("Iniciando atualização cirúrgica da agenda...")
    for item in updates:
        event_id = item['id']
        patch_body = {
            'summary': item['summary'],
            'start': item['start'],
            'end': item['end'],
            'description': item['description']
        }
        res = service.events().patch(calendarId=cal_id, eventId=event_id, body=patch_body).execute()
        print(f"✅ Atualizado: {res.get('summary')} [{res['start'].get('dateTime', res['start'].get('date'))}]")

    print("\nReorganização concluída com sucesso no Google Calendar!")

if __name__ == '__main__':
    main()
