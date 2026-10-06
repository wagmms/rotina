import re

with open("/home/wagmoraes/Projetos IA/Rotina/automations/bot_medicina_amiga.js", "r", encoding="utf-8") as f:
    content = f.read()

# Remove Section 6 Notion API entirely up to Section 7 Utilitarios
content = re.sub(r'// ==============================================================================\n// 6\. NOTION API.*?// ==============================================================================\n// 7\. UTILITÁRIOS', '// ==============================================================================\n// 7. UTILITÁRIOS', content, flags=re.DOTALL)

# Remove processarCallbackBotao (if it's still there somehow)
content = re.sub(r'function processarCallbackBotao\(cb\) \{.*?function removerBotaoInline', 'function removerBotaoInline', content, flags=re.DOTALL)
content = re.sub(r'function removerBotaoInline.*?function processarMensagemTexto', 'function processarMensagemTexto', content, flags=re.DOTALL)

# Ensure "ROTINA E NOTION" is removed from help menu
content = re.sub(r'📚 \*ROTINA E NOTION:\*.*?(?=\n\n|\Z)', '', content, flags=re.DOTALL)

with open("/home/wagmoraes/Projetos IA/Rotina/automations/bot_medicina_amiga.js", "w", encoding="utf-8") as f:
    f.write(content)
