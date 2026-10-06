import os
import sys
import json
import urllib.request
import re
from datetime import datetime, timedelta

# Configuration
NOTION_TOKEN = "REMOVIDO_CONFIGURAR_SCRIPT_PROPERTIES"
NOTION_VERSION = "2022-06-28"
SCHEDULE_DB_ID = "3e21c23c-e74a-402b-9bda-b1b076b0339b"
HABIT_LOG_DB_ID = "f1b41e4b-2d61-43aa-aa6a-81de8d073386"
ICS_DIR = "/home/wagmoraes/Projetos IA/Rotina/"

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION
}

def push_schedule_event(title, date_str, area="Personal", commit_type="Appointment", hours=1.0):
    url = "https://api.notion.com/v1/pages"
    data = {
        "parent": {"database_id": SCHEDULE_DB_ID},
        "properties": {
            "Commitment": {
                "title": [{"text": {"content": title}}]
            },
            "When": {
                "date": {"start": date_str}
            },
            "Area": {
                "select": {"name": area}
            },
            "Type": {
                "select": {"name": commit_type}
            },
            "Planned hours": {
                "number": hours
            },
            "Plan status": {
                "select": {"name": "Suggested"}
            }
        }
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"  [Schedule] ✅ {date_str} - {title}")
    except urllib.error.HTTPError as e:
        print(f"  [Schedule] ❌ Falha em {title}: {e.read().decode('utf-8')}")

def push_habit_log_entry(day_name, date_str):
    url = "https://api.notion.com/v1/pages"
    data = {
        "parent": {"database_id": HABIT_LOG_DB_ID},
        "properties": {
            "Day": {
                "title": [{"text": {"content": f"{day_name} ({date_str[8:10]}/{date_str[5:7]})"}}]
            },
            "Date": {
                "date": {"start": date_str}
            },
            "🏋️ Academia": {"checkbox": False},
            "📚 Inglês": {"checkbox": False},
            "🎸 Violão": {"checkbox": False},
            "📖 Leitura": {"checkbox": False},
            "❤️ Namorada": {"checkbox": False}
        }
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as res:
            print(f"  [Habit Log] ✅ {day_name} ({date_str}) criado.")
    except urllib.error.HTTPError as e:
        print(f"  [Habit Log] ❌ Falha: {e.read().decode('utf-8')}")

def sync_weekly_schedule():
    """Populates the week from Monday through Sunday based on standard rotations and personal routines."""
    print("📅 Sincronizando semana inteira (Segunda a Domingo) no Notion...")
    
    # Calculate upcoming Monday or current week
    today = datetime.now()
    start_monday = today - timedelta(days=today.weekday()) # this week Monday
    
    days_pt = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"]
    gym_splits = [
        "🏋️‍♂️ Treino A (Peito Superior, Deltoide & Tríceps)",
        "🏋️‍♂️ Treino B (Quadríceps, Panturrilha & Abdômen)",
        "🏋️‍♂️ Treino C (Costas, Trapézio & Bíceps)",
        "🏋️‍♂️ Treino D (Posterior, Glúteos & Panturrilha)",
        "🏋️‍♂️ Treino E (Peito Densidade, Ombros & Tríceps)",
        "🏋️‍♂️ Cardio Contínuo & Core (Fechamento de Ciclo)",
        "🧘 Descanso Ativo / Recuperação"
    ]
    english_modules = [
        "📚 Inglês: British Council (Listening) & Busuu (Gramática)",
        "📚 Inglês: Busuu (Feedback de Nativos) & British Council (Fluência)",
        "📚 Inglês: British Council (Grammar Clinic) & Busuu (Escrita Ativa)",
        "📚 Inglês: British Council (Pronúncia/Shadowing) & Busuu (Fala Nativa)",
        "📚 Inglês: British Council (Leitura) & Busuu (Vocab Trainer)",
        "🇬🇧 Inglês: Revisão Semanal / Live Session",
        "🇬🇧 Inglês: Imersão Livre (Podcast / Artigo Médico)"
    ]

    for i in range(7):
        current_date = start_monday + timedelta(days=i)
        date_str = current_date.strftime("%Y-%m-%d")
        day_name = days_pt[i]
        
        print(f"\n--- {day_name} ({date_str}) ---")
        # 1. Habit Log Entry
        push_habit_log_entry(day_name, date_str)
        
        # 2. Academia
        push_schedule_event(gym_splits[i], date_str, area="Personal", commit_type="Appointment", hours=1.0)
        
        # 3. Inglês
        push_schedule_event(english_modules[i], date_str, area="Personal", commit_type="Study block", hours=0.5)
        
        # 4. Violão / Hobbies nos fins de semana e noites livres
        if i in [1, 3, 5]: # Terça, Quinta, Sábado
            push_schedule_event("🎸 Violão: Dedilhado & Repertório", date_str, area="Personal", commit_type="Rest", hours=0.5)
        
        # 5. Tempo com a Namorada
        if i in [4, 5, 6]: # Sexta à noite, Sábado, Domingo
            push_schedule_event("❤️ Tempo de Qualidade com a Namorada", date_str, area="Personal", commit_type="Rest", hours=3.0)

    print("\n✨ Grade semanal sincronizada com sucesso no Notion!")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--week"
    if mode == "--week":
        sync_weekly_schedule()
    else:
        print("Uso: python3 notion_sync_hub.py --week")
