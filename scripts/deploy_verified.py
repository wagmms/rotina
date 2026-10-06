#!/usr/bin/env python3
"""Publicação verificada. Bootstrap temporário com digest, validade e chave fora dos fontes.
Não imprime segredos. Publica o código final sem o bootstrap após configurar o webhook.
"""
import hashlib,json,os,secrets,subprocess,sys,tempfile,time
from pathlib import Path
import urllib.request,urllib.error
from empacotar_gas import empacotar
ROOT=Path(__file__).resolve().parent.parent
GAS=ROOT/'gas_deploy'
DEPLOY='AKfycbwo6GqTmc0_8fl9peKlw5d5jpfL5nqsc-ozLrqHiVk2RHD4h968EZAG4P75i2qSBlw9EQ'
URL='https://script.google.com/macros/s/'+DEPLOY+'/exec'
CLASP=['npx','--yes','@google/clasp@3.4.1']

def run(cmd,cwd=ROOT):
    r=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True)
    if r.returncode:
        print('Comando falhou:',cmd[:3],file=sys.stderr)
        # Clasp and test outputs should never include secret values.
        print((r.stderr or r.stdout)[-1800:],file=sys.stderr)
        raise RuntimeError('Falha na publicação')
    print(r.stdout.strip(),flush=True)
    return r.stdout

def request(data=None,query=''):
    body=json.dumps(data).encode() if data is not None else None
    req=urllib.request.Request(URL+query,data=body,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=150) as res:return json.loads(res.read())
    except Exception as exc:
        raise RuntimeError('Falha ao verificar resposta remota: '+type(exc).__name__) from None

def main():
    print("❌ ERRO FATAL: O Google Apps Script foi permanentemente descontinuado pelo usuário.")
    print("O Ultra Rotina opera exclusivamente no backend Node.js/Docker no Render via Git.")
    sys.exit(1)

if __name__ == '__main__':
    main()
