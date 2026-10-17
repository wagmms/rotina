/**
 * ==============================================================================
 * ULTRA ROTINA · WHATSAPP ZERO-TRUST BRIDGE (CAMADA 1 DE ISOLAMENTO NA BORDA)
 * ==============================================================================
 * Conector / Filtro de Borda para eventos Multi-Device do WhatsApp (Baileys / WAHA / Evolution).
 *
 * GARANTIAS DE PRIVACIDADE INEGOCIÁVEIS (CAMADA 1 HARD-CODED):
 * 1. Bloqueio absoluto de conversas privadas (`@s.whatsapp.net`) — namorada, família, pacientes.
 * 2. Bloqueio absoluto de Status (`status@broadcast`) e Canais (`@newsletter`).
 * 3. Bloqueio absoluto de mensagens enviadas pelo próprio médico (`fromMe === true`).
 * 4. Validação de JID de grupo (`@g.us`) contra a Allowlist ativa antes de ler texto.
 * ==============================================================================
 */

'use strict';

function extrairJidSeguro(eventoBruto) {
  if (!eventoBruto || typeof eventoBruto !== 'object') return '';
  return String(
    eventoBruto.remoteJid ||
    eventoBruto.groupJid ||
    eventoBruto.key?.remoteJid ||
    eventoBruto.data?.key?.remoteJid ||
    ''
  ).trim();
}

function ehMensagemPropria(eventoBruto) {
  if (!eventoBruto || typeof eventoBruto !== 'object') return false;
  return Boolean(
    eventoBruto.fromMe === true ||
    eventoBruto.key?.fromMe === true ||
    eventoBruto.data?.key?.fromMe === true
  );
}

/**
 * Filtra na borda qualquer pacote do WhatsApp ANTES de extrair ou encaminhar ao Bot Rotina.
 */
function filtrarPacoteWhatsAppZeroTrust(eventoBruto, allowlistAtiva) {
  if (ehMensagemPropria(eventoBruto)) {
    return {
      permitido: false,
      camada: 1,
      codigo: 'MENSAGEM_PROPRIA_IGNORADA',
      motivo: 'Ignorado na Camada 1: mensagem enviada pelo próprio titular.'
    };
  }

  const remoteJid = extrairJidSeguro(eventoBruto);
  if (!remoteJid) {
    return {
      permitido: false,
      camada: 1,
      codigo: 'JID_AUSENTE',
      motivo: 'Ignorado na Camada 1: evento sem JID identificável.'
    };
  }

  // Bloqueio 100% hard-coded de chats privados, status e canais
  if (
    !remoteJid.endsWith('@g.us') ||
    remoteJid.includes('@s.whatsapp.net') ||
    remoteJid === 'status@broadcast' ||
    remoteJid.includes('@broadcast') ||
    remoteJid.includes('@newsletter')
  ) {
    return {
      permitido: false,
      camada: 1,
      codigo: 'CHAT_PRIVADO_OU_STATUS_BLOQUEADO',
      remoteJid,
      motivo: 'Bloqueio Hard-Coded Camada 1: conversas privadas e status nunca são lidos.'
    };
  }

  // Checagem da Allowlist de Grupos
  const lista = Array.isArray(allowlistAtiva) ? allowlistAtiva : [];
  const grupoAutorizado = lista.find(
    (g) => g && g.jid === remoteJid && g.permitido === true && g.modoGrupo !== 'BLOQUEADO'
  );

  if (!grupoAutorizado) {
    return {
      permitido: false,
      camada: 2,
      codigo: 'GRUPO_NAO_AUTORIZADO_ALLOWLIST',
      remoteJid,
      motivo: 'Bloqueio Zero-Trust Camada 2: grupo não consta como permitido na Allowlist.'
    };
  }

  return {
    permitido: true,
    camada: 2,
    codigo: 'GRUPO_AUTORIZADO_ALLOWLIST',
    remoteJid: grupoAutorizado.jid,
    nomeGrupo: grupoAutorizado.nome,
    modoGrupo: grupoAutorizado.modoGrupo || 'RADAR_ONLY'
  };
}

module.exports = {
  extrairJidSeguro,
  ehMensagemPropria,
  filtrarPacoteWhatsAppZeroTrust
};
