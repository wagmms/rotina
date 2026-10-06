"""Valida navegação inline real sem IA, Notion, agenda nem mutações de leitos."""
import asyncio,os,time,json
from pathlib import Path
from dotenv import load_dotenv
from telethon import TelegramClient
R=Path(__file__).resolve().parent.parent
load_dotenv(R/'.env')
async def main():
 c=TelegramClient(str(R/'user_session'),int(os.environ['TELEGRAM_API_ID']),os.environ['TELEGRAM_API_HASH']);await c.connect()
 try:
  bot=await c.get_entity('wagner_rotina_bot')
  async def wait(after,needle):
   end=time.monotonic()+65
   while time.monotonic()<end:
    for m in await c.get_messages(bot,limit=6):
     if m.id>after and not m.out and needle.casefold() in (m.text or '').casefold():return m
    await asyncio.sleep(2)
   raise RuntimeError('Resposta esperada não recebida: '+needle)
  async def send(text,needle):
   m=await c.send_message(bot,text);return await wait(m.id,needle)
  async def click(m,label,needle):
   await m.click(text=label);return await wait(m.id,needle)
  await send('/cancelar','Conversa encerrada')
  m=await send('📐 Calculadoras','Calculadoras')
  m=await click(m,'Drogas vasoativas','Qual medicamento')
  m=await click(m,'Noradrenalina','peso em kg')
  m=await send('70,5','diluição')
  m=await click(m,'Padrão','70.5')
  print(json.dumps({'fluxo':'Calculadoras → DVA → Noradrenalina → 70,5 → Padrão','ok':True,'message_id':m.id},ensure_ascii=False),flush=True)
  await send('/cancelar','Conversa encerrada')
  await send('/soap','Envie os dados')
  # No patient or model call: /soap without content only requests inputs.
  m=await send('💊 Prescrever','Receita')
  print(json.dumps({'fluxo':'SOAP vazio → Receita','ok':True,'message_id':m.id},ensure_ascii=False),flush=True)
  await send('/cancelar','Conversa encerrada')
 finally:await c.disconnect()
if __name__=='__main__':asyncio.run(main())
