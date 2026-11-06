#!/usr/bin/env python3
import sys
import io
import os
import json
import time
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w', encoding='utf-8') as f:
                f.write(creds.to_json())
    return build('calendar', 'v3', credentials=creds)

def categorize(summary):
    s = summary.strip().lower()
    
    # 1. Folga pós-plantão (deve vir antes de plantão)
    if any(k in s for k in ['folga', 'fp -', 'pós-plantão', 'pos-plantao']):
        return 'Folga Pós-Plantão (FP)', '2'  # Sálvia / Verde menta (#7ae7bf)
        
    # 2. Plantões (Centro Obstétrico / Urgência)
    if any(k in s for k in ['plantão', 'plantao', 'co - plantão', 'co - plantao']):
        return 'Plantão (CO)', '11'  # Tomate / Vermelho vivo (#dc2127)
        
    # 3. Provas, Congressos e Avaliações
    if any(k in s for k in ['prova', 'congresso', 'avaliação', 'avaliacao']):
        return 'Prova / Evento Acadêmico', '4'  # Flamingo / Coral (#ff887c)
        
    # 4. Simulados e PE (Período de Estudo)
    if any(k in s for k in ['simulado', 'pe -', 'período de estudo', 'periodo de estudo']):
        return 'Estudo / PE / Simulado', '3'  # Uva / Roxo (#dbadff)
        
    # 5. Discussão de Casos Clínicos (DCCs) e Aulas
    if any(k in s for k in ['dcc', 'aula']):
        return 'Aula Teórica / DCC', '5'  # Banana / Amarelo (#fbd75b)
        
    # 6. Ambulatórios e Estágios Práticos de Internato
    if any(k in s for k in ['ambulat', 'amb-', 'vl -', 'cse -', 'cc -', 'centro cirúrgico', 'centro cirurgico', 'mater', 'usf', 'enfermaria']):
        return 'Ambulatório / Prática', '7'  # Pavão / Turquesa (#46d6db)
        
    # 7. Tarefas e Rotina Doméstica
    if 'lixo' in s:
        return 'Rotina / Tarefa', '8'  # Grafite / Cinza (#e1e1e1)
        
    # 8. Aniversários e Celebrações Pessoais
    if any(k in s for k in ['aniversário', 'aniversario', 'birthday']):
        return 'Aniversário', '1'  # Lavanda / Azul suave (#a4bdfc)
        
    return 'Outros', None

def patch_event_with_retry(service, event_id, target_color, max_retries=5):
    for attempt in range(max_retries):
        try:
            return service.events().patch(
                calendarId='primary',
                eventId=event_id,
                body={'colorId': target_color}
            ).execute()
        except HttpError as e:
            if e.resp.status in [403, 429, 500, 503] and attempt < max_retries - 1:
                wait_time = (2 ** attempt) * 0.75
                time.sleep(wait_time)
            else:
                raise

def main():
    service = get_service()
    
    print("Buscando eventos do Bloco de GO (19/10/2026 a 30/11/2026)...")
    block_events = service.events().list(
        calendarId='primary',
        timeMin='2026-10-19T00:00:00-03:00',
        timeMax='2026-11-30T23:59:59-03:00',
        singleEvents=True,
        orderBy='startTime'
    ).execute().get('items', [])
    
    updates = []
    for ev in block_events:
        summ = ev.get('summary', '')
        cat, target_color = categorize(summ)
        if target_color and ev.get('colorId') != target_color:
            updates.append((ev['id'], summ, cat, target_color))
            
    total = len(updates)
    print(f"Total de eventos pendentes de atualização de cor: {total}")
    
    success = 0
    errors = 0
    
    for idx, (ev_id, summ, cat, target_color) in enumerate(updates, 1):
        try:
            patch_event_with_retry(service, ev_id, target_color)
            success += 1
            print(f"[{idx}/{total}] Atualizado: {cat} (Cor {target_color}) -> {summ}")
            time.sleep(0.18)  # Rate limit defensivo
        except Exception as e:
            errors += 1
            print(f"[{idx}/{total}] Erro ao atualizar {summ}: {e}")
            
    print("\n" + "="*50)
    print("Atualização concluída!")
    print(f"Eventos coloridos com sucesso: {success}")
    print(f"Falhas: {errors}")

if __name__ == '__main__':
    main()
