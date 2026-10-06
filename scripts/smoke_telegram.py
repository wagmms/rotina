"""Teste real restrito ao bot, com mensagens sintéticas e sem escrever em Notion/agenda/leitos."""
import asyncio,os,time,json
from pathlib import Path
from dotenv import load_dotenv
from telethon import TelegramClient
ROOT=Path(__file__).resolve().parent.parent
load_dotenv(ROOT/'.env')
async def main():
 client=TelegramClient(str(ROOT/'user_session'),int(os.environ['TELEGRAM_API_ID']),os.environ['TELEGRAM_API_HASH'])
 await client.connect()
 try:
  if not await client.is_user_authorized():raise RuntimeError('Sessão não autenticada')
  bot=await client.get_entity('wagner_rotina_bot')
  results=[]
  async def send(text,needle):
   sent=await client.send_message(bot,text)
   end=time.monotonic()+70
   while time.monotonic()<end:
    messages=await client.get_messages(bot,limit=6)
    matches=[m for m in messages if m.id>sent.id and not m.out and needle.casefold() in (m.text or '').casefold()]
    if matches:
     m=matches[0];print(json.dumps({'command':text,'ok':True,'message_id':m.id,'buttons':sum(len(r) for r in m.buttons or [])},ensure_ascii=False),flush=True);results.append(True);return m
    await asyncio.sleep(3)
   print(json.dumps({'command':text,'ok':False},ensure_ascii=False),flush=True);results.append(False);return None
  await send('/cancelar','Conversa encerrada')
  await send('/teclado','Ultra Rotina')
  await send('/dva nora abc','Peso inválido')
  await send('/dva nora 70,5','70.5')
  await send('🩺 Novo SOAP','novo caso')
  await send('💊 Prescrever','Receita')
  await send('/cancelar','Conversa encerrada')
  await send('📅 Minha rotina','Minha rotina')
  if not all(results):raise RuntimeError('Um ou mais testes reais falharam')
 finally:await client.disconnect()
if __name__=='__main__':asyncio.run(main())
