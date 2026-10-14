#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
CALENDAR MANAGER CLI - UTILITÁRIO UNIFICADO DO GOOGLE CALENDAR
==============================================================================
Ponto de entrada consolidado para operações com o Google Calendar:
- status: Exibe status da conexão, conta autenticada e agenda resumida.
- overlaps: Detecta sobreposições de horários de eventos na agenda.
- dedup: Identifica e remove com segurança eventos duplicados (--dry-run padrão).
==============================================================================
"""

import os
import sys
import re
import argparse
from datetime import datetime, timedelta, timezone
from collections import defaultdict

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SCOPES = ['https://www.googleapis.com/auth/calendar']


def get_credentials_path():
    """Retorna o caminho para o credentials.json a partir de env vars ou padrão."""
    return (
        os.environ.get('GOOGLE_CREDENTIALS_PATH')
        or os.environ.get('GOOGLE_CALENDAR_CREDS_PATH')
        or os.path.join(os.path.dirname(__file__), 'credentials.json')
    )


def get_token_path():
    """Retorna o caminho para o token.json a partir de env vars ou padrão."""
    return (
        os.environ.get('GOOGLE_TOKEN_PATH')
        or os.environ.get('GOOGLE_CALENDAR_TOKEN_PATH')
        or os.path.join(os.path.dirname(__file__), 'token.json')
    )


def get_service():
    """
    Retorna o serviço da API Google Calendar autenticado.
    Emite diagnóstico claro sem traceback em caso de credenciais ausentes ou inválidas.
    """
    token_path = get_token_path()
    creds_path = get_credentials_path()

    if not os.path.exists(token_path):
        print(f"❌ [GoogleCalendar CLI] Token de autenticação não encontrado em: {token_path}")
        print("💡 Para autenticar pela primeira vez:")
        if not os.path.exists(creds_path):
            print(f"   1. Copie 'calendar_manager/credentials.example.json' para '{creds_path}' e preencha as credenciais.")
        print("   2. Execute: python calendar_manager/reauth.py para efetuar o login no navegador.")
        sys.exit(1)

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError as e:
        print(f"❌ [GoogleCalendar CLI] Dependência ausente: {e}")
        print("💡 Instale os requisitos executando: pip install -r calendar_manager/requirements.txt")
        sys.exit(1)

    try:
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(token_path, 'w', encoding='utf-8') as f:
                    f.write(creds.to_json())
            else:
                print("❌ [GoogleCalendar CLI] Token de acesso expirado ou sem refresh token.")
                print("💡 Execute: python calendar_manager/reauth.py para renovar o acesso.")
                sys.exit(1)
        return build('calendar', 'v3', credentials=creds, cache_discovery=False)
    except Exception as e:
        print(f"❌ [GoogleCalendar CLI] Erro ao autenticar no Google Calendar: {e}")
        print("💡 Execute: python calendar_manager/reauth.py para reautenticar.")
        sys.exit(1)


def normalizar_titulo(titulo):
    """Remove caracteres especiais e espaços extras para comparação de duplicatas."""
    if not titulo:
        return ''
    t = re.sub(r'[^\w\s]', '', titulo, flags=re.UNICODE)
    return re.sub(r'\s+', ' ', t).strip().lower()


def classificar_evento(sumario):
    """Atribui tag de identificação visual rápida para o resumo."""
    sl = (sumario or '').lower()
    if any(k in sl for k in ['medquest', 'questões', 'questoes', 'estudo', 'estudos de med', 'aula', 'revisão', 'revisao', 'anki']):
        return 'ESTUDO  '
    if any(k in sl for k in ['internato', 'plantão', 'plantao', 'upa', 'samu', 'uti']) or re.search(r'\bue\b', sl):
        return 'PLANTÃO '
    if any(k in sl for k in ['academia', 'treino', 'musculação', 'musculacao', 'aeróbico', 'aerobico', 'corrida']):
        return 'TREINO  '
    if any(k in sl for k in ['namorada', 'date night', 'casal', 'almoço', 'almoco', 'jantar']):
        return 'PESSOAL '
    if any(k in sl for k in ['ingl', 'viol']):
        return 'HABITO  '
    return 'ROTINA  '


def cmd_status(args):
    """Exibe status da conexão e os próximos eventos da agenda."""
    service = get_service()
    token_path = get_token_path()

    try:
        cal = service.calendars().get(calendarId='primary').execute()
        conta = cal.get('id', 'primary')
        tz = cal.get('timeZone', 'UTC')
    except Exception as e:
        print(f"❌ [GoogleCalendar CLI] Erro ao obter dados do calendário primário: {e}")
        return 1

    print("=" * 65)
    print(" 📅 ULTRA ROTINA · STATUS DO GOOGLE CALENDAR")
    print("=" * 65)
    print(f" • Conta Conectada : {conta}")
    print(f" • Fuso Horário     : {tz}")
    print(f" • Arquivo de Token : {token_path} (Válido ✅)")

    dias = max(1, args.days)
    agora = datetime.now().astimezone()
    limite = agora + timedelta(days=dias)

    time_min = agora.isoformat()
    time_max = limite.isoformat()

    try:
        res = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime',
            maxResults=100
        ).execute()
        eventos = res.get('items', [])
    except Exception as e:
        print(f"❌ Erro ao listar eventos: {e}")
        return 1

    print(f"\n Próximos Eventos ({len(eventos)} encontrados nos próximos {dias} dias):")
    print("-" * 65)

    if not eventos:
        print(" (Nenhum evento agendado para o período especificado)")
        print("=" * 65)
        return 0

    data_atual = None
    for ev in eventos:
        st = ev['start'].get('dateTime', ev['start'].get('date', ''))
        et = ev['end'].get('dateTime', ev['end'].get('date', ''))
        sumario = ev.get('summary', '(Sem título)')

        if 'T' in st:
            d_str = st.split('T')[0]
            hora_inicio = st.split('T')[1][:5]
            hora_fim = et.split('T')[1][:5] if 'T' in et else ''
            horario = f"{hora_inicio} - {hora_fim}"
        else:
            d_str = st
            horario = "DIA INTEIRO"

        if d_str != data_atual:
            data_atual = d_str
            try:
                dt_obj = datetime.strptime(d_str, '%Y-%m-%d')
                data_formatada = dt_obj.strftime('%d/%m/%Y (%a)')
            except Exception:
                data_formatada = d_str
            print(f"\n 📆 {data_formatada}:")

        categoria = classificar_evento(sumario)
        print(f"    [{categoria}] {horario:13s} | {sumario}")

    print("\n" + "=" * 65)
    return 0


def cmd_overlaps(args):
    """Detecta sobreposições de horários de eventos no calendário."""
    service = get_service()

    agora = datetime.now().astimezone()
    if args.start:
        time_min = args.start if 'T' in args.start else f"{args.start}T00:00:00-03:00"
    else:
        time_min = agora.isoformat()

    if args.end:
        time_max = args.end if 'T' in args.end else f"{args.end}T23:59:59-03:00"
    else:
        dias = max(1, args.days)
        time_max = (agora + timedelta(days=dias)).isoformat()

    print("=" * 65)
    print(" 🔍 AUDITORIA DE SOBREPOSIÇÕES DE HORÁRIO")
    print(f" Intervalo: {time_min[:10]} até {time_max[:10]}")
    if args.medquest_only:
        print(" Filtro: Apenas sobreposições envolvendo MedQuest")
    print("=" * 65)

    eventos = []
    page_token = None
    while True:
        try:
            res = service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime',
                pageToken=page_token,
                maxResults=2500
            ).execute()
            eventos.extend(res.get('items', []))
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        except Exception as e:
            print(f"❌ Erro ao consultar eventos: {e}")
            return 1

    by_day = defaultdict(list)
    for ev in eventos:
        st = ev['start'].get('dateTime')
        et = ev['end'].get('dateTime')
        if st and et:
            d_str = st.split('T')[0]
            by_day[d_str].append((st, et, ev))

    total_conflitos = 0
    dias_afetados = 0

    for d_str, ev_list in sorted(by_day.items()):
        conflitos_dia = []
        for i in range(len(ev_list)):
            for j in range(i + 1, len(ev_list)):
                st1, et1, ev1 = ev_list[i]
                st2, et2, ev2 = ev_list[j]

                # Sobreposição de intervalo: max(st1, st2) < min(et1, et2)
                if st1 < et2 and st2 < et1:
                    s1 = ev1.get('summary', '')
                    s2 = ev2.get('summary', '')
                    if args.medquest_only:
                        if not ('medquest' in s1.lower() or 'medquest' in s2.lower()):
                            continue
                    conflitos_dia.append((ev1, ev2))

        if conflitos_dia:
            dias_afetados += 1
            print(f"\n 📅 Data: {d_str}")
            for ev1, ev2 in conflitos_dia:
                total_conflitos += 1
                t1 = f"{ev1['start']['dateTime'].split('T')[1][:5]}-{ev1['end']['dateTime'].split('T')[1][:5]}"
                t2 = f"{ev2['start']['dateTime'].split('T')[1][:5]}-{ev2['end']['dateTime'].split('T')[1][:5]}"
                print(f"    ❌ Conflito #{total_conflitos}:")
                print(f"       [A] {t1} | {ev1.get('summary')}")
                print(f"       [B] {t2} | {ev2.get('summary')}")

    print("\n" + "=" * 65)
    print(f" Total de Eventos Analisados : {len(eventos)}")
    print(f" Conflitos Detectados        : {total_conflitos}")
    print(f" Dias com Sobreposição       : {dias_afetados}")
    print("=" * 65)
    if total_conflitos == 0:
        print(" ✅ Agenda 100% livre de sobreposições de horários!")
    return 0


def cmd_dedup(args):
    """Deduplicação de eventos idênticos no Google Calendar."""
    service = get_service()

    agora = datetime.now().astimezone()
    dias = max(1, args.days)
    time_min = agora.isoformat()
    time_max = (agora + timedelta(days=dias)).isoformat()

    modo_dry_run = not args.apply

    print("=" * 65)
    print(" 🧹 DEDUPLICAÇÃO DE EVENTOS DO GOOGLE CALENDAR")
    print(f" Janela: Próximos {dias} dias ({time_min[:10]} até {time_max[:10]})")
    print(f" Modo  : {'SIMULAÇÃO (--dry-run ativo)' if modo_dry_run else 'APLICAÇÃO REAL (--apply ativo)'}")
    print("=" * 65)

    eventos = []
    page_token = None
    while True:
        try:
            res = service.events().list(
                calendarId='primary',
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime',
                pageToken=page_token,
                maxResults=2500
            ).execute()
            eventos.extend(res.get('items', []))
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        except Exception as e:
            print(f"❌ Erro ao listar eventos: {e}")
            return 1

    grupos = defaultdict(list)
    for ev in eventos:
        sum_norm = normalizar_titulo(ev.get('summary', ''))
        st = ev['start'].get('dateTime', ev['start'].get('date', ''))
        et = ev['end'].get('dateTime', ev['end'].get('date', ''))
        grupos[(sum_norm, st, et)].append(ev)

    duplicatas = {k: v for k, v in grupos.items() if len(v) > 1}

    print(f" Eventos auditados        : {len(eventos)}")
    print(f" Grupos com duplicatas   : {len(duplicatas)}")
    total_descartar = sum(len(v) - 1 for v in duplicatas.values())
    print(f" Eventos redundantes     : {total_descartar}\n")

    if not duplicatas:
        print(" ✅ Nenhuma duplicata encontrada no período.")
        print("=" * 65)
        return 0

    removidos = 0
    atualizados = 0

    for (sum_norm, st, et), ev_list in sorted(duplicatas.items(), key=lambda x: x[0][1]):
        # Seleção do keeper (preserva recorrentes, com cor ou mais antigos)
        recorrentes = [e for e in ev_list if e.get('recurringEventId')]
        com_cor = [e for e in ev_list if e.get('colorId')]

        if recorrentes:
            keeper = recorrentes[0]
        elif com_cor:
            keeper = com_cor[0]
        else:
            keeper = sorted(ev_list, key=lambda x: x.get('created', ''))[0]

        descartaveis = [e for e in ev_list if e['id'] != keeper['id']]

        # Enriquecimento do keeper se os descartáveis tiverem descrição ou cor
        updates = {}
        if not (keeper.get('description') or '').strip():
            for d in descartaveis:
                desc = (d.get('description') or '').strip()
                if desc:
                    updates['description'] = desc
                    break
        if not keeper.get('colorId'):
            for d in descartaveis:
                if d.get('colorId'):
                    updates['colorId'] = d['colorId']
                    break

        horario = st.split('T')[1][:5] if 'T' in st else 'DIA INTEIRO'
        data_fmt = st.split('T')[0]
        titulo = keeper.get('summary', sum_norm)

        print(f" 🔹 [{data_fmt} {horario}] \"{titulo}\"")
        print(f"    Keeper ID : {keeper['id']}")
        for d in descartaveis:
            print(f"    Remover   : {d['id']}")

        if not modo_dry_run:
            if updates:
                try:
                    service.events().patch(
                        calendarId='primary',
                        eventId=keeper['id'],
                        body=updates
                    ).execute()
                    atualizados += 1
                except Exception as e:
                    print(f"    ⚠️ Falha ao atualizar metadados do keeper: {e}")

            for d in descartaveis:
                try:
                    service.events().delete(
                        calendarId='primary',
                        eventId=d['id']
                    ).execute()
                    removidos += 1
                except Exception as e:
                    print(f"    ⚠️ Falha ao remover duplicata {d['id']}: {e}")

    print("\n" + "=" * 65)
    if modo_dry_run:
        print(f" Simulação concluída: {total_descartar} duplicatas prontas para remoção.")
        print(" 💡 Para executar as exclusões reais no Google Calendar, use: --apply")
    else:
        print(f" Sucesso: {removidos} duplicatas removidas e {atualizados} keepers enriquecidos.")
    print("=" * 65)
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Utilitário unificado de gerenciamento do Google Calendar (Ultra Rotina).",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest='command', help='Subcomandos disponíveis')

    # Subcomando: status
    parser_status = subparsers.add_parser('status', help='Exibe status da conexão e resumo dos próximos eventos.')
    parser_status.add_argument('--days', type=int, default=7, help='Número de dias futuros a listar (padrão: 7).')
    parser_status.set_defaults(func=cmd_status)

    # Subcomando: overlaps
    parser_overlaps = subparsers.add_parser('overlaps', help='Detecta conflitos e sobreposições de horários.')
    parser_overlaps.add_argument('--days', type=int, default=30, help='Número de dias a auditar a partir de hoje (padrão: 30).')
    parser_overlaps.add_argument('--start', type=str, help='Data inicial ISO (ex: 2026-10-15).')
    parser_overlaps.add_argument('--end', type=str, help='Data final ISO (ex: 2026-11-15).')
    parser_overlaps.add_argument('--medquest-only', action='store_true', help='Filtra apenas conflitos envolvendo MedQuest.')
    parser_overlaps.set_defaults(func=cmd_overlaps)

    # Subcomando: dedup
    parser_dedup = subparsers.add_parser('dedup', help='Detecta e remove eventos duplicados com segurança.')
    parser_dedup.add_argument('--days', type=int, default=60, help='Janela de dias para auditoria (padrão: 60).')
    grupo_acao = parser_dedup.add_mutually_exclusive_group()
    grupo_acao.add_argument('--dry-run', action='store_true', default=True, help='Apenas simula a deduplicação sem alterar o calendário (padrão).')
    grupo_acao.add_argument('--apply', action='store_true', default=False, help='Aplica a remoção real dos eventos duplicados no Google Calendar.')
    parser_dedup.set_defaults(func=cmd_dedup)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    try:
        sys.exit(args.func(args))
    except KeyboardInterrupt:
        print("\nOperação cancelada pelo usuário.")
        sys.exit(130)


if __name__ == '__main__':
    main()
