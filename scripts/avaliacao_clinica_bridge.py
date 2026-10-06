#!/usr/bin/env python3
"""Transporte restrito para avaliações fictícias. Segredos entram por stdin e nunca são registrados."""
import json, re, sys, time, urllib.request, urllib.error
from urllib.parse import urlsplit

ALLOWED = {
    'generativelanguage.googleapis.com': r'/v1beta/models(?:/[-a-zA-Z0-9.]+:generateContent)?',
    'api.groq.com': r'/openai/v1/chat/completions',
    'openrouter.ai': r'/api/v1/chat/completions',
    'api.z.ai': r'/api/paas/v4/chat/completions',
}
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def main():
    inp=json.load(sys.stdin)
    u=urlsplit(inp['url'])
    if u.scheme!='https' or u.port not in (None,443) or u.username or u.password or not re.fullmatch(ALLOWED.get(u.hostname,''),u.path):
        raise ValueError('Destino fora da avaliação')
    method=inp.get('method','POST').upper()
    if method not in ('POST','GET') or (method=='GET' and u.path!='/v1beta/models'):
        raise ValueError('Método não permitido')
    payload=inp.get('payload')
    secrets=[str(v).removeprefix('Bearer ') for k,v in inp.get('headers',{}).items() if k.lower() in ('authorization','x-goog-api-key')]
    def clean(text):
        for secret in secrets:
            if secret:text=text.replace(secret,'[REDACTED]')
        return text
    req=urllib.request.Request(inp['url'], data=payload.encode() if payload else None, headers=inp.get('headers',{}), method=method)
    start=time.monotonic()
    try:
        with urllib.request.build_opener(NoRedirect).open(req,timeout=45) as res:
            out={'status':res.status,'body':clean(res.read().decode()),'headers':dict(res.headers)}
    except urllib.error.HTTPError as e:
        out={'status':e.code,'body':clean(e.read().decode()),'headers':dict(e.headers)}
    except Exception as e:
        out={'status':0,'body':'','headers':{},'error':type(e).__name__}
    out['http_ms']=round((time.monotonic()-start)*1000)
    print(json.dumps(out))

if __name__=='__main__':
    main()
