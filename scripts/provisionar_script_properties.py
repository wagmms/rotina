#!/usr/bin/env python3
"""Migra configuração local para ScriptProperties sem incluí-la no código publicado."""
import hashlib
import json
import secrets
import subprocess
import time
import urllib.request
from pathlib import Path

from empacotar_gas import empacotar

ROOT = Path(__file__).resolve().parent.parent
GAS = ROOT / 'gas_deploy'
DEPLOY = 'AKfycbwo6GqTmc0_8fl9peKlw5d5jpfL5nqsc-ozLrqHiVk2RHD4h968EZAG4P75i2qSBlw9EQ'
URL = 'https://script.google.com/macros/s/' + DEPLOY + '/exec'
CLASP = ['npx', '--yes', '@google/clasp@3.4.1']
ALLOWED = {'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'NOTION_TOKEN',
           'NOTION_HABIT_LOG_DB_ID', 'NOTION_TASKS_DB_ID', 'PROVEDOR_TEXTO_PADRAO',
           'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'ZAI_API_KEY', 'GEMINI_API_KEYS',
           'SPREADSHEET_ID_REMUME', 'SPREADSHEET_ID_INTERACOES', 'TIMEZONE',
           'WEB_APP_URL', 'WEBHOOK_SECRET', 'IA_MODELOS_CLINICOS_GEMINI',
           'IA_MODELOS_GEMINI', 'IA_MODELOS_GEMINI_GROUNDING'}


def clasp(*args):
    p = subprocess.run(CLASP + list(args), cwd=GAS, capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError('Falha no clasp: ' + ' '.join(args[:2]) + ' (código ' + str(p.returncode) + ')')
    print(p.stdout.strip(), flush=True)


def fetch(query='', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(URL + query, data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=45) as res:
        return json.loads(res.read())


def main():
    cfg = json.loads((ROOT / '.deploy_state.json').read_text())['config']
    cfg = {k: str(v) for k, v in cfg.items() if k in ALLOWED and v}
    cfg['WEB_APP_URL'] = URL
    bootstrap = secrets.token_hex(32)
    digest = hashlib.sha256(bootstrap.encode()).hexdigest()
    deadline = int((time.time() + 600) * 1000)
    master = (ROOT / 'ultra_rotina_master.js').read_text()
    marker = 'function doPost(e) {'
    if master.count(marker) != 1:
        raise RuntimeError('Entrada do webhook não encontrada de forma única')
    hook = '''function provisionarTemporariamente(e) {
      if (Date.now() > DEADLINE) throw new Error('Provisionamento expirado');
      var supplied = String(e.parameter.provision || '');
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, supplied)
        .map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
      if (digest !== 'DIGEST') throw new Error('Não autorizado');
      var input = JSON.parse(e.postData.contents || '{}');
      var allowed = ALLOWED;
      var props = PropertiesService.getScriptProperties();
      allowed.forEach(function(k) {
        if (input[k] && !props.getProperty(k)) props.setProperty(k, String(input[k]));
      });
      ConfigService.invalidar();
      return ContentService.createTextOutput(JSON.stringify({ok:true,
        configured:allowed.filter(function(k){return !!props.getProperty(k);})
      })).setMimeType(ContentService.MimeType.JSON);
    }
    '''.replace('DEADLINE', str(deadline)).replace('DIGEST', digest).replace('ALLOWED', json.dumps(sorted(ALLOWED)))
    temporary = master.replace(marker, marker + '\n  if(e && e.parameter && e.parameter.provision) return provisionarTemporariamente(e);', 1) + '\n' + hook
    clean = (ROOT / 'ultra_rotina_gas.js').read_text()
    path = GAS / 'Code.js'
    try:
        path.write_text(empacotar(temporary))
        clasp('push', '-f')
        clasp('deploy', '-i', DEPLOY, '-d', 'Provisionamento temporário de ScriptProperties sem segredos no código')
        result = fetch('?provision=' + bootstrap, cfg)
        required = {'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'WEB_APP_URL',
                    'WEBHOOK_SECRET', 'GEMINI_API_KEYS'}
        if not result.get('ok') or not required.issubset(set(result.get('configured', []))):
            raise RuntimeError('ScriptProperties essenciais não confirmadas')
        print('ScriptProperties essenciais confirmadas.', flush=True)
        health = fetch('?secret=' + cfg['WEBHOOK_SECRET'])
        if not health.get('worker') or health.get('gemini_keys_count', 0) < 1:
            raise RuntimeError('Leitura remota da configuração falhou')
        print('Worker e chaves de IA confirmados sem segredos embutidos.', flush=True)
    finally:
        path.write_text(clean)
    clasp('push', '-f')
    clasp('deploy', '-i', DEPLOY, '-d', 'Cockpit autenticado e configuração em ScriptProperties')
    final = fetch('?secret=' + cfg['WEBHOOK_SECRET'])
    if final.get('version') != '2026.10.05-cockpit1' or not final.get('worker'):
        raise RuntimeError('Versão final não respondeu à verificação')
    print('Versão final verificada: ' + final['version'], flush=True)


if __name__ == '__main__':
    main()
