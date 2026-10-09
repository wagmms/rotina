const fs = require('fs');
let content = fs.readFileSync('src/07_telegram_handlers.js', 'utf8');

content = content.replace(/"🧠 \*ENDOCRINOLOGIA — HIPERPROLACTINEMIA\*[\s\S]*?"• \\\/hiperprolactinemia PRL 250 tamanho 15mm alteracao visual\\`"\);/g, 
  '"🧠 *ENDOCRINOLOGIA — HIPERPROLACTINEMIA*\\n\\n" +\n' +
  '        "Envie os dados para investigação e manejo de prolactinomas:\\n" +\n' +
  '        "• *PRL:* `PRL 150` ou `prolactina 85`\\n" +\n' +
  '        "• *Tamanho (RM):* `tamanho 12` ou `adenoma 8mm`\\n" +\n' +
  '        "• *Dose:* `dose 2.5` (Cabergolina mg/sem)\\n" +\n' +
  '        "• *Outros:* `gestante`, `assintomatica`, `alteracao visual`, `uso de antipsicotico`, `tsh alterado`, `macroprolactina pesquisada`, `macroprolactina positiva`\\n\\n" +\n' +
  '        "*Exemplos:*\\n" +\n' +
  '        "• `/prolactina PRL 85 assintomatica`\\n" +\n' +
  '        "• `/hiperprolactinemia PRL 250 tamanho 15mm alteracao visual`");'
);

fs.writeFileSync('src/07_telegram_handlers.js', content, 'utf8');
