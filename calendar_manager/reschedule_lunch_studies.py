# coding: utf-8
"""
Reschedules all lunch study events (Inglês and Violão) between 2026-09-21 and 2026-10-31:
- Frees the 12:00-14:00 lunch window completely (for lunch & nap).
- Moves Monday, Wednesday, Thursday, Friday study to evening slots (max 23:00).
- Moves Tuesday Violão to 19:45-20:30 (before Namorada).
- Moves Saturday Violão to 15:00-15:45 (afternoon, before Namorada).
"""
import sys
import io
import os
import json
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
SCOPES = ['https://www.googleapis.com/auth/calendar']
TIMEZONE = 'America/Sao_Paulo'

def get_service():
    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_PATH, 'w') as f:
                f.write(creds.to_json())
        else:
            raise Exception("Invalid token. Re-authentication required.")
    return build('calendar', 'v3', credentials=creds)

def compute_new_slot(day_str, summary, dur, existing_evening_events):
    dt = datetime.strptime(day_str, '%Y-%m-%d')
    wd = dt.weekday() # 0: Mon, 1: Tue, 2: Wed, 3: Thu, 4: Fri, 5: Sat, 6: Sun
    
    if wd == 0: # Monday: MedQuest Teoria
        med_ends = [e[1] for e in existing_evening_events if 'medquest' in e[2].lower()]
        last_end = max(med_ends) if med_ends else '21:30'
        if last_end >= '22:00':
            new_st = '22:15'
        elif last_end >= '21:30':
            new_st = '21:45'
        else:
            new_st = '21:30'
            
    elif wd == 1: # Tuesday: Namorada 20:45-22:15
        new_st = '19:45'
        
    elif wd == 2: # Wednesday: MedQuest Questões 20:00-22:00
        new_st = '22:00'
        
    elif wd == 3: # Thursday: MedQuest Teoria
        med_ends = [e[1] for e in existing_evening_events if 'medquest' in e[2].lower()]
        last_end = max(med_ends) if med_ends else '21:30'
        if last_end >= '22:00':
            new_st = '22:15'
        elif last_end >= '21:45':
            new_st = '21:55'
        else:
            new_st = '21:30'
            
    elif wd == 4: # Friday: Date Night 19:00-22:15
        new_st = '22:15'
        
    elif wd == 5: # Saturday: Free afternoon before Namorada 16:30
        new_st = '15:00'
        
    else:
        new_st = '15:00'

    start_dt = datetime.strptime(f'{day_str} {new_st}', '%Y-%m-%d %H:%M')
    end_dt = start_dt + timedelta(minutes=dur)
    new_et = end_dt.strftime('%H:%M')
    return new_st, new_et

def main(dry_run=False):
    service = get_service()
    
    time_min = '2026-09-21T00:00:00-03:00'
    time_max = '2026-11-01T00:00:00-03:00'
    
    res = service.events().list(
        calendarId='primary',
        timeMin=time_min,
        timeMax=time_max,
        singleEvents=True,
        orderBy='startTime',
        maxResults=2500
    ).execute()
    
    events = res.get('items', [])
    lunch_targets = []
    other_by_day = {}
    
    for ev in events:
        s = ev['start'].get('dateTime')
        e = ev['end'].get('dateTime')
        if not s:
            continue
        day = s[:10]
        st = s[11:16]
        et = e[11:16]
        summary = ev.get('summary', '')
        
        # Target: Inglês or Violão scheduled between 11:30 and 13:30 (lunch window)
        is_study = any(k in summary.lower() for k in ['inglês', 'ingles', 'violão', 'violao'])
        if is_study and ('11:30' <= st <= '13:30'):
            dur = int((datetime.strptime(et, '%H:%M') - datetime.strptime(st, '%H:%M')).total_seconds() // 60)
            lunch_targets.append({
                'id': ev['id'],
                'day': day,
                'summary': summary,
                'old_st': st,
                'old_et': et,
                'dur': dur,
                'raw': ev
            })
        else:
            if day not in other_by_day:
                other_by_day[day] = []
            other_by_day[day].append((st, et, summary))
            
    print(f"Total events found in window: {len(events)}")
    print(f"Lunch study events to reschedule: {len(lunch_targets)}")
    
    # Backup
    backup_filename = f"lunch_study_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    backup_path = os.path.join(os.path.dirname(__file__), backup_filename)
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(lunch_targets, f, ensure_ascii=False, indent=2)
    print(f"✅ Safety backup saved to: {backup_path}")
    
    # Audit proposed slots
    reallocations = []
    overlaps = 0
    over_23h = 0
    
    for t in lunch_targets:
        day = t['day']
        existing = other_by_day.get(day, [])
        new_st, new_et = compute_new_slot(day, t['summary'], t['dur'], existing)
        
        for ev in existing:
            if not (new_et <= ev[0] or new_st >= ev[1]):
                print(f"⚠️ CONFLICT on {day}: {new_st}-{new_et} overlaps with {ev[0]}-{ev[1]} ({ev[2]})")
                overlaps += 1
                
        if new_et > '23:00':
            print(f"⚠️ EXCEEDS 23:00 on {day}: {new_st}-{new_et}")
            over_23h += 1
            
        reallocations.append({
            'target': t,
            'new_st': new_st,
            'new_et': new_et
        })
        
    print(f"\nAudit complete: {overlaps} overlaps, {over_23h} exceeding 23:00.")
    if overlaps > 0 or over_23h > 0:
        print("❌ Cannot proceed due to audit failures.")
        return
        
    if dry_run:
        print("\n[DRY RUN] Simulation only:")
        for r in reallocations:
            t = r['target']
            print(f"  {t['day']} | {t['old_st']}-{t['old_et']} ➔ {r['new_st']}-{r['new_et']} | {t['summary']}")
        return

    print("\nApplying updates to Google Calendar...")
    updated_count = 0
    for idx, r in enumerate(reallocations, 1):
        t = r['target']
        new_start_iso = f"{t['day']}T{r['new_st']}:00-03:00"
        new_end_iso = f"{t['day']}T{r['new_et']}:00-03:00"
        
        patch_body = {
            'start': {'dateTime': new_start_iso, 'timeZone': TIMEZONE},
            'end': {'dateTime': new_end_iso, 'timeZone': TIMEZONE}
        }
        
        try:
            service.events().patch(calendarId='primary', eventId=t['id'], body=patch_body).execute()
            updated_count += 1
            print(f"[{idx}/{len(reallocations)}] Updated: {t['day']} ({r['new_st']}-{r['new_et']}) - {t['summary']}")
        except Exception as ex:
            print(f"❌ Error updating event {t['id']} on {t['day']}: {ex}")
            
    print(f"\n🎉 Successfully updated {updated_count}/{len(reallocations)} events in Google Calendar!")

if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    main(dry_run=dry)
