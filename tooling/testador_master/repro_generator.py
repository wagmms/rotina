"""
Ultra Rotina · Testador Master: Gerador Automático de Scripts de Reprodução
Gera scripts autônomos em Node.js (.cjs) para reprodução cirúrgica de bugs,
vazamentos técnicos, dead-ends e quebras de markdown encontrados durante os testes.
"""

import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
REPRO_DIR = ROOT_DIR / "tests" / "repros"


class BugReproGenerator:
    """Gera scripts de reprodução CJS 100% autônomos para qualquer bug detectado."""

    def __init__(self, repro_dir: Optional[Path] = None):
        self.repro_dir = repro_dir or REPRO_DIR
        self.repro_dir.mkdir(parents=True, exist_ok=True)

    def gerar_script_reproducao(
        self,
        problema: Dict[str, Any],
        acao: Dict[str, Any],
        resposta: Dict[str, Any]
    ) -> Optional[Dict[str, str]]:
        """
        Cria um arquivo .cjs em tests/repros/ pronto para execução isolada.
        Retorna metadados com caminhos e comando de execução.
        """
        issue_id = problema.get("id", "ISSUE-999").lower().replace("-", "_")
        categoria = problema.get("categoria", "")
        alvo = str(acao.get("alvo_desc") or acao.get("rotulo") or acao.get("texto") or "acao")
        tipo_acao = acao.get("tipo", "comando")

        # Gera slug legível para o arquivo
        slug = re.sub(r"[^a-zA-Z0-9_]", "_", alvo.lower()).strip("_")[:22]
        slug = slug or "bug"
        nome_arquivo = f"repro_{issue_id}_{slug}.cjs"
        caminho_arquivo = self.repro_dir / nome_arquivo

        conteudo = self._construir_conteudo_script(
            problema=problema,
            acao=acao,
            resposta=resposta,
            issue_id=problema.get("id", "ISSUE-999"),
            nome_arquivo=nome_arquivo
        )

        with open(caminho_arquivo, "w", encoding="utf-8") as f:
            f.write(conteudo)

        caminho_relativo = caminho_arquivo.relative_to(ROOT_DIR)
        return {
            "arquivo": str(caminho_arquivo),
            "relativo": str(caminho_relativo),
            "comando": f"node {caminho_relativo}"
        }

    def _construir_conteudo_script(
        self,
        problema: Dict[str, Any],
        acao: Dict[str, Any],
        resposta: Dict[str, Any],
        issue_id: str,
        nome_arquivo: str = "repro.cjs"
    ) -> str:
        alvo = acao.get("alvo_desc") or acao.get("rotulo") or acao.get("texto") or ""
        tipo_acao = acao.get("tipo", "comando")
        texto_cmd = acao.get("texto", alvo)
        callback_data = acao.get("callback_data", "")
        categoria = problema.get("categoria", "")
        descricao = problema.get("descricao", "")

        # Monta a chamada de despacho de acordo com o tipo de ação
        if tipo_acao in ["clique", "backtrack"] or callback_data:
            bloco_despacho = f"""  // 1. Simula clique de botão inline no Telegram
  console.log('👉 [DISPARO] Clicando no botão inline com callback: "{callback_data}"');
  ctx.processarCallbackBotao({{
    id: 'cb_repro_test',
    from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
    message: {{ chat: {{ id: chatId }}, message_id: 100 }},
    data: {repr(callback_data)}
  }});"""
        elif tipo_acao == "audio":
            caption = acao.get("caption", "Áudio clínico de teste")
            bloco_despacho = f"""  // 1. Simula recebimento de nota de voz/áudio
  console.log('👉 [DISPARO] Enviando nota de voz clínica com caption: "{caption}"');
  if (typeof ctx.processarMensagemAudio === 'function') {{
    ctx.processarMensagemAudio({{
      message_id: 1,
      chat: {{ id: chatId }},
      from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
      voice: {{ file_id: 'mock_repro_voice', duration: 8 }},
      caption: {repr(caption)}
    }});
  }} else {{
    // Fallback para comando equivalente
    ctx.processarMensagemTexto({{
      message_id: 1,
      chat: {{ id: chatId }},
      from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
      text: '/voz {caption}'
    }});
  }}"""
        elif tipo_acao == "imagem":
            caption = acao.get("caption", "Exame clínico de teste")
            bloco_despacho = f"""  // 1. Simula recebimento de imagem/exame
  console.log('👉 [DISPARO] Enviando imagem de exame clínico com caption: "{caption}"');
  if (typeof ctx.processarMensagemFoto === 'function') {{
    ctx.processarMensagemFoto({{
      message_id: 1,
      chat: {{ id: chatId }},
      from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
      photo: [{{ file_id: 'mock_repro_photo', width: 700, height: 240 }}],
      caption: {repr(caption)}
    }});
  }} else {{
    ctx.processarMensagemTexto({{
      message_id: 1,
      chat: {{ id: chatId }},
      from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
      text: {repr(alvo)}
    }});
  }}"""
        else:
            # Comando de texto ou fuzzing
            bloco_despacho = f"""  // 1. Simula envio de comando de texto ou fuzzing
  console.log('👉 [DISPARO] Enviando comando/texto: "{texto_cmd}"');
  ctx.processarMensagemTexto({{
    message_id: 1,
    chat: {{ id: chatId }},
    from: {{ id: chatId, first_name: 'Dr. Testador (Repro)' }},
    text: {repr(texto_cmd)}
  }});"""

        # Constrói asserções especializadas que falham se o bug se manifestar
        if "VAZAMENTO TÉCNICO" in categoria:
            bloco_assercao = """  // Validação: a resposta NÃO pode vazar termos técnicos como 'undefined' ou 'NaN'
  const termosVazamento = ['undefined', '[object object]', 'referenceerror', 'typeerror'];
  for (const termo of termosVazamento) {
    if (textoResposta.toLowerCase().includes(termo)) {
      throw new Error(`VAZAMENTO DETECTADO: A resposta contém '${termo}':\\n"${textoResposta.substring(0, 300)}..."`);
    }
  }
  if (/\\b(?:nan|null)\\b/i.test(textoResposta)) {
    throw new Error(`VAZAMENTO DETECTADO: A resposta contém 'NaN' ou 'null':\\n"${textoResposta.substring(0, 300)}..."`);
  }
  console.log('  ✓ Nenhuma variável undefined ou termo técnico encontrado.');"""

        elif "SEGURANÇA CLÍNICA" in categoria:
            bloco_assercao = """  // Validação: valores zerados ou negativos NÃO podem produzir vazão/dose sem aviso de bloqueio
  const contemDosePositiva = /doses?\\s+calculada|ml\\/h|\\bmg\\b/i.test(textoResposta);
  const contemAlertaBloqueio = /inválid|erro|atenção|bloque|positiv|alerta/i.test(textoResposta);
  if (contemDosePositiva && !contemAlertaBloqueio) {
    throw new Error(`FALHA DE SEGURANÇA CLÍNICA: Dose foi calculada sem alerta de bloqueio para valor inválido:\\n"${textoResposta.substring(0, 300)}"`);
  }
  console.log('  ✓ Salvaguarda clínica respeitada (bloqueio ou alerta exibido).');"""

        elif "UX DEAD-END" in categoria:
            bloco_assercao = """  // Validação: a tela deve possuir teclado inline ou instrução explícita de retorno
  const temTeclado = (msg.kb && msg.kb.inline_keyboard && msg.kb.inline_keyboard.length > 0);
  const temDicaRetorno = /voltar|menu|início|ajuda|\\/menu|\\/novo/i.test(textoResposta);
  if (!temTeclado && !temDicaRetorno) {
    throw new Error(`DEAD-END DETECTADO: Tela sem teclado inline e sem instruções de como retornar.`);
  }
  console.log('  ✓ Navegabilidade garantida (teclado inline ou dicas presentes).');"""

        elif "FORMATAÇÃO MARKDOWN" in categoria:
            bloco_assercao = r"""  // Validação: entidades markdown devem estar balanceadas em pares
  const asteriscos = (textoResposta.match(/\*/g) || []).length;
  const crases = (textoResposta.match(/`/g) || []).length;
  if (asteriscos % 2 !== 0) {
    throw new Error(`MARKDOWN QUEBRADO: Quantidade ímpar de asteriscos (*) encontrada (${asteriscos}).`);
  }
  if (crases % 2 !== 0) {
    throw new Error(`MARKDOWN QUEBRADO: Quantidade ímpar de crases ('\`') encontrada (${crases}).`);
  }
  console.log('  ✓ Entidades Markdown balanceadas com sucesso.');"""

        else:
            bloco_assercao = """  // Validação geral de resposta e integridade
  if (!mensagensEnviadas || mensagensEnviadas.length === 0) {
    throw new Error('FALHA DE PROCESSAMENTO: Nenhuma mensagem retornada pelo bot.');
  }
  console.log('  ✓ Resposta recebida e processada com sucesso.');"""

        script = f"""/**
 * ==============================================================================
 * SCRIPT DE REPRODUÇÃO AUTOMATIZADO · ULTRA ROTINA (BUG REPRO-GENERATOR)
 * ==============================================================================
 * Issue ID:   {issue_id.upper()}
 * Categoria:  {categoria}
 * Alvo:       {alvo}
 * Descrição:  {descricao}
 * Gerado em:  {problema.get('timestamp', '')}
 *
 * Como executar este teste isolado:
 *   node tests/repros/{nome_arquivo}
 * ==============================================================================
 */

const assert = require('assert');
const path = require('path');
const runtime = require('../../server/runtime.js');

async function executarReproducao() {{
  console.log('\\n' + '='.repeat(70));
  console.log('🧪 TESTE DE REPRODUÇÃO: {issue_id.upper()} ({categoria})');
  console.log('='.repeat(70));

  const ctx = runtime.ctx;
  const chatId = '123456789';

  // Configura ambiente e permissões do titular
  if (typeof ctx.ehUsuarioTitular === 'function') {{
    ctx.ehUsuarioTitular = () => true;
  }}

  let mensagensEnviadas = [];
  let callbacksRespondidos = [];

  // Mocks dos despachadores Telegram
  ctx.enviarMensagemParaChat = (id, texto) => {{
    mensagensEnviadas.push({{ tipo: 'texto', id, texto: String(texto || '') }});
    return true;
  }};

  ctx.enviarMensagemComTecladoParaChat = (id, texto, kb) => {{
    mensagensEnviadas.push({{ tipo: 'teclado', id, texto: String(texto || ''), kb }});
    return true;
  }};

  ctx.enviarTelaBot = (id, texto, kb, msgId) => {{
    mensagensEnviadas.push({{ tipo: 'tela', id, texto: String(texto || ''), kb, msgId }});
    return true;
  }};

  ctx.responderCallbackTelegram = (cbId, texto) => {{
    callbacksRespondidos.push({{ id: cbId, texto: String(texto || '') }});
    return true;
  }};

  ctx.executarPostTelegram = (url, payload) => {{
    if (payload && payload.text) {{
      mensagensEnviadas.push({{ tipo: 'edit', id: payload.chat_id, texto: String(payload.text), kb: payload.reply_markup }});
    }}
    return true;
  }};

{bloco_despacho}

  // 2. Valida se o bot gerou alguma resposta
  assert.ok(mensagensEnviadas.length > 0, 'O bot deve responder à interação.');
  const msg = mensagensEnviadas[0];
  const textoResposta = msg.texto || '';

  console.log('\\n📋 [RESPOSTA RECEBIDA DO BOT]:');
  console.log('----------------------------------------------------------------------');
  console.log(textoResposta.length > 400 ? textoResposta.substring(0, 400) + '\\n[... truncado ...]' : textoResposta);
  console.log('----------------------------------------------------------------------\\n');

  console.log('🔍 [AUDITORIA DA REPRODUÇÃO]:');
{bloco_assercao}

  console.log('\\n🎉 [SUCESSO]: O comportamento esperado foi verificado e o bug NÃO ocorreu (ou foi corrigido)!\\n');
}}

executarReproducao().catch(err => {{
  console.error('\\n💥 [BUG CONFIRMADO NA REPRODUÇÃO]:');
  console.error(err.message);
  console.error('\\n💡 O script reproduziu a falha com sucesso. Corrija o código-fonte e rode novamente este teste.\\n');
  process.exit(1);
}});
"""
        return script
