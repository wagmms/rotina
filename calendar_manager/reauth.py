import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = os.path.join(os.path.dirname(__file__), 'token.json')
CREDS_PATH = os.path.join(os.path.dirname(__file__), 'credentials.json')

def main():
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            print("Antigo token.json removido com sucesso.", flush=True)
        except Exception as e:
            print(f"Aviso ao remover token: {e}", flush=True)
        
    port = 8080
    flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
    flow.redirect_uri = f'http://localhost:{port}/'
    auth_url, _ = flow.authorization_url(prompt='select_account consent', login_hint='moraes.wagg@gmail.com')
    
    print("\n========================================================", flush=True)
    print("LINK DE AUTORIZACAO (Conta alvo: moraes.wagg@gmail.com):", flush=True)
    print(auth_url, flush=True)
    print("========================================================\n", flush=True)
    print("Iniciando servidor local de autenticação na porta 8080...", flush=True)
    
    creds = flow.run_local_server(
        port=port,
        open_browser=True,
        prompt='select_account consent',
        login_hint='moraes.wagg@gmail.com'
    )
    
    with open(TOKEN_PATH, 'w', encoding='utf-8') as f:
        f.write(creds.to_json())
    
    # Check primary calendar
    service = build('calendar', 'v3', credentials=creds)
    cal = service.calendars().get(calendarId='primary').execute()
    print(f"\nNovo token.json gerado com sucesso para a conta: {cal.get('id')}", flush=True)

if __name__ == '__main__':
    main()
