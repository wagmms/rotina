const fs = require('fs');
let content = fs.readFileSync('src/07_telegram_handlers.js', 'utf8');

const newHandler = `
  // ENDOCRINOLOGIA: HIPERPROLACTINEMIA
  // ───────────────────────────────────────────────────────────────────────────
  if (comando === "/hiperprolactinemia" || comando === "/prolactina" || comando === "/cabergolina") {
    var dadosProlactina = texto.replace(/^\\/\\w+\\s*/, "").trim();
    if (typeof EndocrinologiaHiperprolactinemiaService === "undefined") {
      return enviarMensagemParaChat(chatId, "⚠️ Módulo EndocrinologiaHiperprolactinemiaService indisponível temporariamente.");
    }

    if (!dadosProlactina) {
      return enviarMensagemParaChat(chatId, "🧠 *ENDOCRINOLOGIA — HIPERPROLACTINEMIA*\n\n" +
        "Envie os dados para investigação e manejo de prolactinomas:\n" +
        "• *PRL:* \`PRL 150\` ou \`prolactina 85\`\n" +
        "• *Tamanho (RM):* \`tamanho 12\` ou \`adenoma 8mm\`\n" +
        "• *Dose:* \`dose 2.5\` (Cabergolina mg/sem)\n" +
        "• *Outros:* \`gestante\`, \`assintomatica\`, \`alteracao visual\`, \`uso de antipsicotico\`, \`tsh alterado\`, \`macroprolactina pesquisada\`, \`macroprolactina positiva\`\n\n" +
        "*Exemplos:*\n" +
        "• \`/prolactina PRL 85 assintomatica\`\n" +
        "• \`/hiperprolactinemia PRL 250 tamanho 15mm alteracao visual\`");
    }

    try {
      var respostaProlactina = EndocrinologiaHiperprolactinemiaService.processarComandoTelegram(texto);
      return enviarMensagemParaChat(chatId, respostaProlactina);
    } catch (eProlactina) {
      return enviarMensagemParaChat(chatId, "⚠️ Erro ao avaliar Hiperprolactinemia: " + eProlactina.message);
    }
  }
`;

content = content.replace('// UROLOGIA & NEFROLOGIA: CÓLICA NEFRÉTICA E LITÍASE URINÁRIA', newHandler + '\n  // UROLOGIA & NEFROLOGIA: CÓLICA NEFRÉTICA E LITÍASE URINÁRIA');

fs.writeFileSync('src/07_telegram_handlers.js', content, 'utf8');
