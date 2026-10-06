import re

with open("/home/wagmoraes/Projetos IA/Rotina/automations/bot_medicina_amiga.js", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """function baixarMidiaTelegram(arquivoBase) {
  var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + arquivoBase.file_id, {"muteHttpExceptions": true});
  var json = JSON.parse(res.getContentText());
  var caminhoArquivo = json.result.file_path;
  var blob = UrlFetchApp.fetch("https://api.telegram.org/file/bot" + TELEGRAM_BOT_TOKEN + "/" + caminhoArquivo).getBlob();
  
  var mime = blob.getContentType();
  
  // Se o Telegram não mandar o formato, nós forçamos pela extensão do arquivo!
  if (!mime || mime === "application/octet-stream") {
    var ext = caminhoArquivo.split('.').pop().toLowerCase();
    if (ext === "oga" || ext === "ogg") mime = "audio/ogg";
    else if (ext === "mp3") mime = "audio/mp3";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "png") mime = "image/png";
    else mime = "image/jpeg"; // Fallback mais seguro
  }
  
  return { 
    data: Utilities.base64Encode(blob.getBytes()), 
    mime: mime 
  };
}"""

# Find the old function and replace it
content = re.sub(r'function baixarMidiaTelegram\(arquivoBase\) \{.*?return \{ data: Utilities\.base64Encode\(blob\.getBytes\(\)\), mime: blob\.getContentType\(\) \|\| "application/octet-stream" \};\n\}', replacement, content, flags=re.DOTALL)

with open("/home/wagmoraes/Projetos IA/Rotina/automations/bot_medicina_amiga.js", "w", encoding="utf-8") as f:
    f.write(content)
