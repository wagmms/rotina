import os
import sys
import io
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

events_to_create = [
    # ==========================================
    # SEMANA 1: 31/08/2026 a 04/09/2026 (TURMA A)
    # ==========================================
    # Segunda 31/08
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-08-31T07:00:00-03:00"},
        "end": {"dateTime": "2026-08-31T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-08-31T13:00:00-03:00"},
        "end": {"dateTime": "2026-08-31T17:00:00-03:00"}
    },
    # Terça 01/09
    {
        "summary": "Ambulatório de Oftalmologia",
        "location": "CSE Sumarezinho (Corredor 1) - Rua Gonçalves Dias, 790",
        "description": "Dra. Roberta - Ambulatório de Oftalmologia (CSE Sumarezinho, Corredor 1)\nHorário: 08:00 às 12:00",
        "start": {"dateTime": "2026-09-01T08:00:00-03:00"},
        "end": {"dateTime": "2026-09-01T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-01T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-01T17:00:00-03:00"}
    },
    # Quarta 02/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-02T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-02T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-02T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-02T17:00:00-03:00"}
    },
    # Quinta 03/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-03T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-03T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-03T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-03T17:00:00-03:00"}
    },
    # Sexta 04/09 (Manhã Livre)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-04T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-04T17:00:00-03:00"}
    },

    # ==========================================
    # SEMANA 2: 07/09/2026 a 11/09/2026 (TURMA A)
    # ==========================================
    # Segunda 07/09 (Feriado Independência do Brasil)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\n(Obs: Feriado Nacional da Independência do Brasil)\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-07T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-07T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\n(Obs: Feriado Nacional da Independência do Brasil)\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-07T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-07T17:00:00-03:00"}
    },
    # Terça 08/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-08T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-08T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-08T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-08T17:00:00-03:00"}
    },
    # Quarta 09/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-09T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-09T12:00:00-03:00"}
    },
    {
        "summary": "Ambulatório de Otorrinolaringologia",
        "location": "Hospital Estadual de Ribeirão Preto (HERP) - Av. Independência, 4750",
        "description": "Dra. Victoria Leme e Dr. Lucas Carenzi - Ambulatório de Otorrinolaringologia no Hospital Estadual\nHorário: 13:30 (favor chegar no horário - atrasos serão contados como falta)",
        "start": {"dateTime": "2026-09-09T13:30:00-03:00"},
        "end": {"dateTime": "2026-09-09T17:30:00-03:00"}
    },
    # Quinta 10/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-10T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-10T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-10T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-10T17:00:00-03:00"}
    },
    # Sexta 11/09 (Manhã Livre)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-11T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-11T17:00:00-03:00"}
    },

    # ==========================================
    # SEMANA 3: 14/09/2026 a 18/09/2026 (TURMA A)
    # ==========================================
    # Segunda 14/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-14T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-14T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-14T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-14T17:00:00-03:00"}
    },
    # Terça 15/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-15T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-15T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-15T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-15T17:00:00-03:00"}
    },
    # Quarta 16/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-16T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-16T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-16T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-16T17:00:00-03:00"}
    },
    # Quinta 17/09
    {
        "summary": "Ambulatório de Otorrinolaringologia",
        "location": "CSE Sumarezinho - Rua Gonçalves Dias, 790",
        "description": "Profa. Camila - Ambulatório de Otorrinolaringologia no CSE Sumarezinho\nHorário: 08:00 às 12:00",
        "start": {"dateTime": "2026-09-17T08:00:00-03:00"},
        "end": {"dateTime": "2026-09-17T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-17T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-17T17:00:00-03:00"}
    },
    # Sexta 18/09 (Manhã Livre)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma A\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-18T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-18T17:00:00-03:00"}
    },

    # ==========================================
    # SEMANA 4: 21/09/2026 a 25/09/2026 (TURMA B)
    # ==========================================
    # Segunda 21/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-21T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-21T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-21T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-21T17:00:00-03:00"}
    },
    # Terça 22/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-22T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-22T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-22T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-22T17:00:00-03:00"}
    },
    # Quarta 23/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-23T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-23T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-23T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-23T17:00:00-03:00"}
    },
    # Quinta 24/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-24T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-24T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-24T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-24T17:00:00-03:00"}
    },
    # Sexta 25/09 (Manhã Livre)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-25T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-25T17:00:00-03:00"}
    },

    # ==========================================
    # SEMANA 5: 28/09/2026 a 02/10/2026 (TURMA B)
    # ==========================================
    # Segunda 28/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-28T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-28T12:00:00-03:00"}
    },
    {
        "summary": "Ambulatório de Dermatologia",
        "location": "CSE Sumarezinho (Corredor 1) - Rua Gonçalves Dias, 790",
        "description": "Prof. Dr. Marco Andrey e Dra. Mariane - Ambulatório de Dermatologia no CSE Sumarezinho (Corredor 1)\nHorário: 13:30 às 17:30",
        "start": {"dateTime": "2026-09-28T13:30:00-03:00"},
        "end": {"dateTime": "2026-09-28T17:30:00-03:00"}
    },
    # Terça 29/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-29T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-29T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-29T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-29T17:00:00-03:00"}
    },
    # Quarta 30/09
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-09-30T07:00:00-03:00"},
        "end": {"dateTime": "2026-09-30T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-09-30T13:00:00-03:00"},
        "end": {"dateTime": "2026-09-30T17:00:00-03:00"}
    },
    # Quinta 01/10
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-10-01T07:00:00-03:00"},
        "end": {"dateTime": "2026-10-01T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-01T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-01T17:00:00-03:00"}
    },
    # Sexta 02/10 (Manhã Livre)
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-02T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-02T17:00:00-03:00"}
    },

    # ==========================================
    # SEMANA 6: 05/10/2026 a 09/10/2026 (TURMA B)
    # ==========================================
    # Segunda 05/10
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-10-05T07:00:00-03:00"},
        "end": {"dateTime": "2026-10-05T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-05T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-05T17:00:00-03:00"}
    },
    # Terça 06/10
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-10-06T07:00:00-03:00"},
        "end": {"dateTime": "2026-10-06T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-06T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-06T17:00:00-03:00"}
    },
    # Quarta 07/10
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-10-07T07:00:00-03:00"},
        "end": {"dateTime": "2026-10-07T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-07T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-07T17:00:00-03:00"}
    },
    # Quinta 08/10
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 07:00 às 12:00",
        "start": {"dateTime": "2026-10-08T07:00:00-03:00"},
        "end": {"dateTime": "2026-10-08T12:00:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-08T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-08T17:00:00-03:00"}
    },
    # Sexta 09/10 (Prova Final de manhã + USF à tarde + Entrega do Relatório)
    {
        "summary": "📝 Prova Escrita Final - Medicina Social",
        "location": "Sala de Aula do Depto de Medicina Social (2º andar do HCFMRP-USP, ao lado da neurofisiologia e da UCO)",
        "description": "Prova Escrita Final do Estágio Integrado em Centros de Saúde e Medicina Comunitária\nPeso na nota: 2\nHorário de início: 09:00",
        "start": {"dateTime": "2026-10-09T09:00:00-03:00"},
        "end": {"dateTime": "2026-10-09T11:30:00-03:00"}
    },
    {
        "summary": "Internato - USF Paulo Gomes Romeu",
        "location": "USF Paulo Gomes Romeu - Rua Victor João Castania, 960",
        "description": "Estágio Integrado em Centros de Saúde e Medicina Comunitária - Turma B\n⚠️ Entrega do relatório descritivo do NSF e acompanhamento familiar pela dupla.\nHorário: 13:00 às 17:00",
        "start": {"dateTime": "2026-10-09T13:00:00-03:00"},
        "end": {"dateTime": "2026-10-09T17:00:00-03:00"}
    }
]

def main():
    service = get_service()
    print(f"Inserindo {len(events_to_create)} eventos de internato no Google Agenda...\n")
    
    created_count = 0
    for i, event in enumerate(events_to_create, 1):
        st = event['start']['dateTime']
        et = event['end']['dateTime']
        summary = event['summary']
        
        created = service.events().insert(calendarId='primary', body=event).execute()
        print(f"[{i:02d}/{len(events_to_create)}] Criado: {st[0:10]} {st[11:16]}-{et[11:16]} | {summary} (ID: {created['id']})")
        created_count += 1
        
    print(f"\n✅ Concluído com sucesso! {created_count} eventos inseridos.")

if __name__ == '__main__':
    main()
