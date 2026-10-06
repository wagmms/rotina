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
    stage=sys.argv[1] if len(sys.argv)>1 else 'prepare'
    record=ROOT/'.deploy_state.json'
    if stage=='prepare':
        run([str(ROOT/'.venv/bin/python'),'-m','pytest','tests','-q'])
        run(['python3','build_master.py'])
        # Retrieve the previous defaults locally only to migrate keys absent in Script Properties.
        legacy=Path('/tmp/telegram-review-l3awkghk/src/00_config.js')
        if not legacy.exists():raise RuntimeError('Fonte local de migração não encontrada.')
        js="const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.ConfigService.getDefaults()));"
        r=subprocess.run(['node','-e',js,str(legacy)],capture_output=True,text=True,check=True)
        config=json.loads(r.stdout)
        config['WEBHOOK_SECRET']=secrets.token_hex(32)
        config['WEB_APP_URL']=URL
        bootstrap=secrets.token_hex(32)
        state={'config':config,'bootstrap':bootstrap,'created':time.time()}
        fd=os.open(record,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
        with os.fdopen(fd,'w') as f:json.dump(state,f)
        # Cloud snapshot before modifying remote code.
        backup=Path(tempfile.mkdtemp(prefix='rotina-cloud-rollback-'))
        clasp=json.loads((GAS/'.clasp.json').read_text());clasp['rootDir']=str(backup)
        (backup/'.clasp.json').write_text(json.dumps(clasp))
        run(CLASP+['pull'],backup)
        state['backup']=str(backup);record.write_text(json.dumps(state));os.chmod(record,0o600)
        original=(ROOT/'ultra_rotina_master.js').read_text()
        digest=hashlib.sha256(bootstrap.encode()).hexdigest()
        deadline=int((time.time()+1800)*1000)
        hook='''function provisionarTemporariamente(e) {
          if(Date.now()>DEADLINE)return HtmlService.createHtmlOutput("Expired");
          var supplied=(e.parameter&&e.parameter.provision)||"";
          var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,supplied).map(function(b){return ("0"+((b+256)%256).toString(16)).slice(-2);}).join("");
          if(digest!=="DIGEST")return HtmlService.createHtmlOutput("Unauthorized");
          var input=JSON.parse(e.postData.contents),props=PropertiesService.getScriptProperties();
          var allowed=["TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID","NOTION_TOKEN","NOTION_HABIT_LOG_DB_ID","NOTION_TASKS_DB_ID","PROVEDOR_TEXTO_PADRAO","GROQ_API_KEY","OPENROUTER_API_KEY","ZAI_API_KEY","GEMINI_API_KEYS","SPREADSHEET_ID_REMUME","SPREADSHEET_ID_INTERACOES","TIMEZONE","WEB_APP_URL","WEBHOOK_SECRET"];
          allowed.forEach(function(k){if(input[k] && (!props.getProperty(k)||k==="WEBHOOK_SECRET"||k==="WEB_APP_URL"))props.setProperty(k,String(input[k]));});
          ConfigService.invalidar();configurarWebhookTelegram();configurarMenuTelegram();
          return ContentService.createTextOutput(JSON.stringify({ok:true,configured:allowed.filter(function(k){return !!props.getProperty(k);})})).setMimeType(ContentService.MimeType.JSON);
        }
        '''.replace('DEADLINE',str(deadline)).replace('DIGEST',digest)
        interim=original.replace('function doPost(e) {','function doPost(e) {\n  if(e && e.parameter && e.parameter.provision)return provisionarTemporariamente(e);',1)+hook
        (GAS/'Code.js').write_text(empacotar(interim))
        run(CLASP+['push','-f'],GAS)
        run(CLASP+['deploy','-i',DEPLOY,'-d','Configuração autenticada temporária UX1'],GAS)
        print('Preparação publicada; aguardando provisionamento.',flush=True)
    elif stage=='configure':
        state=json.loads(record.read_text())
        result=request(state['config'],'?provision='+state['bootstrap'])
        print(json.dumps(result,ensure_ascii=False),flush=True)
        if result.get('ok') is not True:raise RuntimeError('Configuração não confirmada')
    elif stage=='finalize':
        state=json.loads(record.read_text())
        original=(ROOT/'ultra_rotina_gas.js').read_text()
        (GAS/'CockpitApp.html').write_text((ROOT/'cockpit_movel.html').read_text())
        (GAS/'ComposicaoCorporal.html').write_text((ROOT/'composicao_corporal.html').read_text())
        (GAS/'Code.js').write_text(original)
        (ROOT/'automations/google_apps_script_master_assistant.js').write_text(original)
        run(CLASP+['push','-f'],GAS)
        run(CLASP+['deploy','-i',DEPLOY,'-d','UX1: fila persistente, modos explícitos e dados preservados'],GAS)
        print('Versão final publicada sem bootstrap.',flush=True)
    elif stage=='verify':
        state=json.loads(record.read_text())
        result=request(query='?secret='+state['config']['WEBHOOK_SECRET'])
        print(json.dumps(result,ensure_ascii=False),flush=True)
        required={'TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','WEB_APP_URL','WEBHOOK_SECRET','SPREADSHEET_ID_REMUME'}
        if (result.get('version')!='2026.10.05-cockpit1' or not result.get('worker')
                or not required.issubset(set(result.get('configured',[])))
                or result.get('gemini_keys_count',0)<1):
            raise RuntimeError('Verificação de versão/configuração/worker falhou')
    else:raise RuntimeError('Etapa desconhecida')

if __name__=='__main__':main()
