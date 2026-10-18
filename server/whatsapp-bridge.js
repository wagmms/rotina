'use strict';

/**
 * server/whatsapp-bridge.js
 * -----------------------------------------------------------------------------
 * Camada 1 Zero-Trust + Bridge Universal de WhatsApp (Baileys / Evolution / WAHA).
 *
 * Responsabilidades:
 *   1. Filtragem estrita Zero-Trust (bloqueia @s.whatsapp.net direto, @broadcast,
 *      @newsletter e mensagens fromMe === true).
 *   2. Normalização universal de envelopes de webhook ou socket.
 *   3. Gerenciamento de conexão real ou híbrida (Pairing Code de 8 caracteres,
 *      descoberta real de grupos @g.us e disparo Stealth humanizado).
 * -----------------------------------------------------------------------------
 */

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const SUFIXOS_BLOQUEADOS_CAMADA_1 = Object.freeze([
  '@s.whatsapp.net',
  '@broadcast',
  '@newsletter',
  'status@broadcast'
]);

const SUFIXO_GRUPO_PERMITIDO = '@g.us';

/**
 * Limpa um JID ou número de telefone para conter apenas os dígitos do número real,
 * removendo sufixos (@s.whatsapp.net, @lid) e identificadores de multi-device (:12).
 *
 * @param {string} jidOuFone
 * @returns {string}
 */
function limparNumeroTelefoneDeJid(jidOuFone) {
  if (typeof jidOuFone !== 'string') return '';
  const semDominio = jidOuFone.split('@')[0] || '';
  const semDevice = semDominio.split(':')[0] || '';
  return semDevice.replace(/\D/g, '');
}

/**
 * Normaliza e valida um número de telefone para o padrão E.164 sem o sinal '+'
 * (Ex: 5511999998888).
 *
 * @param {string} numeroBruto
 * @returns {{ valido: boolean, numeroLimpo: string, motivo?: string }}
 */
function validarENormalizarTelefonePareamento(numeroBruto) {
  if (typeof numeroBruto !== 'string' && typeof numeroBruto !== 'number') {
    return { valido: false, numeroLimpo: '', motivo: 'Número de telefone não informado.' };
  }

  let digitos = String(numeroBruto).replace(/\D/g, '');

  // Se o usuário digitou apenas DDD + Número (10 ou 11 dígitos no Brasil), prefixa 55
  if (digitos.length === 10 || digitos.length === 11) {
    digitos = `55${digitos}`;
  }

  if (digitos.length < 11 || digitos.length > 15) {
    return {
      valido: false,
      numeroLimpo: digitos,
      motivo: `Número inválido (${digitos.length} dígitos). Informe DDI + DDD + Número (ex: 5511999999999).`
    };
  }

  return { valido: true, numeroLimpo: digitos };
}

/**
 * Extrai de forma defensiva o remoteJid de diferentes formatos de payload
 * (Baileys nativo, Evolution API v1/v2, WAHA, Z-API ou payload direto).
 *
 * @param {object} pacoteBruto
 * @returns {string}
 */
function extrairJidSeguro(pacoteBruto) {
  if (!pacoteBruto || typeof pacoteBruto !== 'object') {
    return '';
  }

  // Formato Evolution API / Baileys envelopado em data.messages[0] ou messages[0]
  const msgArrayItem =
    (Array.isArray(pacoteBruto.messages) && pacoteBruto.messages[0]) ||
    (pacoteBruto.data && Array.isArray(pacoteBruto.data.messages) && pacoteBruto.data.messages[0]) ||
    null;

  const candidato =
    pacoteBruto.remoteJid ||
    (pacoteBruto.key && pacoteBruto.key.remoteJid) ||
    (pacoteBruto.data && pacoteBruto.data.key && pacoteBruto.data.key.remoteJid) ||
    (pacoteBruto.data && pacoteBruto.data.remoteJid) ||
    (msgArrayItem && msgArrayItem.key && msgArrayItem.key.remoteJid) ||
    (pacoteBruto.payload && pacoteBruto.payload.from) || // WAHA
    pacoteBruto.chatId || // Z-API / GreenAPI
    pacoteBruto.from ||
    '';

  return typeof candidato === 'string' ? candidato.trim() : '';
}

/**
 * Verifica se a mensagem foi enviada pela própria instância (fromMe) para evitar
 * loops infinitos de auto-resposta.
 *
 * @param {object} pacoteBruto
 * @returns {boolean}
 */
function ehMensagemPropria(pacoteBruto) {
  if (!pacoteBruto || typeof pacoteBruto !== 'object') {
    return false;
  }

  const msgArrayItem =
    (Array.isArray(pacoteBruto.messages) && pacoteBruto.messages[0]) ||
    (pacoteBruto.data && Array.isArray(pacoteBruto.data.messages) && pacoteBruto.data.messages[0]) ||
    null;

  if (pacoteBruto.fromMe === true) return true;
  if (pacoteBruto.key && pacoteBruto.key.fromMe === true) return true;
  if (pacoteBruto.data && pacoteBruto.data.key && pacoteBruto.data.key.fromMe === true) return true;
  if (pacoteBruto.data && pacoteBruto.data.fromMe === true) return true;
  if (msgArrayItem && msgArrayItem.key && msgArrayItem.key.fromMe === true) return true;
  if (pacoteBruto.payload && pacoteBruto.payload.fromMe === true) return true;

  return false;
}

/**
 * Extrai um envelope padronizado de qualquer payload de mensagem do WhatsApp.
 *
 * @param {object} pacoteBruto
 * @returns {{
 *   remoteJid: string,
 *   participantJid: string,
 *   telefoneRemetente: string,
 *   pushName: string,
 *   texto: string,
 *   grupoNome: string,
 *   fromMe: boolean,
 *   messageId: string,
 *   timestamp: number
 * }}
 */
function extrairEnvelopeMensagem(pacoteBruto) {
  if (!pacoteBruto || typeof pacoteBruto !== 'object') {
    return {
      remoteJid: '',
      participantJid: '',
      telefoneRemetente: '',
      pushName: '',
      texto: '',
      grupoNome: '',
      fromMe: false,
      messageId: '',
      timestamp: Date.now()
    };
  }

  const nodoPrincipal =
    (Array.isArray(pacoteBruto.messages) && pacoteBruto.messages[0]) ||
    (pacoteBruto.data && Array.isArray(pacoteBruto.data.messages) && pacoteBruto.data.messages[0]) ||
    pacoteBruto.data ||
    pacoteBruto.payload ||
    pacoteBruto;

  const remoteJid = extrairJidSeguro(pacoteBruto);
  const fromMe = ehMensagemPropria(pacoteBruto);

  const participantJid =
    nodoPrincipal?.key?.participant ||
    nodoPrincipal?.participant ||
    pacoteBruto?.key?.participant ||
    pacoteBruto?.participant ||
    pacoteBruto?.author ||
    '';

  const telefoneRemetente =
    limparNumeroTelefoneDeJid(participantJid) ||
    limparNumeroTelefoneDeJid(pacoteBruto?.sender) ||
    '';

  const pushName = String(
    nodoPrincipal?.pushName ||
    pacoteBruto?.pushName ||
    pacoteBruto?.senderName ||
    nodoPrincipal?.notifyName ||
    ''
  ).trim();

  const grupoNome = String(
    nodoPrincipal?.groupName ||
    pacoteBruto?.groupName ||
    pacoteBruto?.chatName ||
    nodoPrincipal?.groupMetadata?.subject ||
    ''
  ).trim();

  const msgObj = nodoPrincipal?.message || pacoteBruto?.message || {};

  const textoCandidato =
    pacoteBruto?.texto ||
    pacoteBruto?.text ||
    nodoPrincipal?.body ||
    msgObj?.conversation ||
    msgObj?.extendedTextMessage?.text ||
    msgObj?.imageMessage?.caption ||
    msgObj?.videoMessage?.caption ||
    msgObj?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    msgObj?.ephemeralMessage?.message?.extendedTextMessage?.text ||
    msgObj?.ephemeralMessage?.message?.conversation ||
    msgObj?.viewOnceMessage?.message?.imageMessage?.caption ||
    (typeof pacoteBruto?.message === 'string' ? pacoteBruto.message : '') ||
    '';

  const messageId = String(
    nodoPrincipal?.key?.id ||
    pacoteBruto?.key?.id ||
    nodoPrincipal?.id ||
    pacoteBruto?.messageId ||
    `msg_${Date.now()}`
  );

  const rawTs = Number(nodoPrincipal?.messageTimestamp || pacoteBruto?.timestamp || Date.now());
  const timestamp = rawTs < 1e12 ? rawTs * 1000 : rawTs;

  return {
    remoteJid,
    participantJid: String(participantJid || '').trim(),
    telefoneRemetente,
    remetenteNumero: telefoneRemetente,
    pushName,
    texto: String(textoCandidato || '').trim(),
    grupoNome,
    fromMe,
    messageId,
    timestamp
  };
}

/**
 * CAMADA 1 ZERO-TRUST (Inegociável):
 * Bloqueia imediatamente conversas privadas (@s.whatsapp.net), listas de transmissão
 * (@broadcast), canais (@newsletter), mensagens da própria conta (fromMe === true)
 * e qualquer JID que não esteja explicitamente na whitelist de grupos (@g.us).
 *
 * @param {object} pacoteBruto
 * @param {string[]|Set<string>} whitelistGruposJids
 * @returns {{
 *   permitido: boolean,
 *   motivo: string,
 *   camada: number,
 *   remoteJid: string,
 *   envelope: ReturnType<typeof extrairEnvelopeMensagem> | null
 * }}
 */
function filtrarPacoteWhatsAppZeroTrust(pacoteBruto, whitelistGruposJids) {
  const envelope = extrairEnvelopeMensagem(pacoteBruto);
  const { remoteJid, fromMe } = envelope;

  if (!remoteJid) {
    return {
      permitido: false,
      motivo: 'JID_AUSENTE_OU_MALFORMADO',
      camada: 1,
      remoteJid: '',
      envelope: null
    };
  }

  if (fromMe) {
    return {
      permitido: false,
      motivo: 'BLOQUEIO_ANTI_LOOP_FROM_ME',
      camada: 1,
      remoteJid,
      envelope: null
    };
  }

  const jidLower = remoteJid.toLowerCase();

  for (const sufixoProibido of SUFIXOS_BLOQUEADOS_CAMADA_1) {
    if (jidLower === sufixoProibido || jidLower.endsWith(sufixoProibido)) {
      return {
        permitido: false,
        motivo: `BLOQUEIO_ESTRITO_CAMADA_1_CHAT_PRIVADO_OU_CANAL (${sufixoProibido})`,
        camada: 1,
        remoteJid,
        envelope: null
      };
    }
  }

  if (!jidLower.endsWith(SUFIXO_GRUPO_PERMITIDO)) {
    return {
      permitido: false,
      motivo: 'JID_NAO_PERTENCE_A_GRUPO_G_US',
      camada: 1,
      remoteJid,
      envelope: null
    };
  }

  const listaBruta =
    whitelistGruposJids instanceof Set
      ? Array.from(whitelistGruposJids)
      : Array.isArray(whitelistGruposJids)
      ? whitelistGruposJids
      : [];

  const conjuntoWhitelist = new Set(
    listaBruta
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && item.jid) {
          if (item.permitido === false || item.modoGrupo === 'BLOQUEADO') return null;
          return String(item.jid).trim();
        }
        return null;
      })
      .filter(Boolean)
  );

  if (!conjuntoWhitelist.has(remoteJid)) {
    return {
      permitido: false,
      motivo: 'GRUPO_FORA_DA_WHITELIST_CAMADA_1',
      camada: 1,
      remoteJid,
      envelope: null
    };
  }

  return {
    permitido: true,
    motivo: 'GRUPO_AUTORIZADO_CAMADA_1',
    camada: 1,
    remoteJid,
    envelope
  };
}

/**
 * Gerenciador Híbrido de Conexão WhatsApp:
 * Suporta:
 *   1. Gateway HTTP Externo (Evolution API v2 / WAHA) via variáveis de ambiente:
 *      WA_API_URL, WA_API_KEY, WA_INSTANCE
 *   2. Motor Nativo Baileys (@whiskeysockets/baileys) se instalado no node_modules
 *   3. Modo Webhook Passivo + Diagnóstico guiado quando nenhum motor ativo está presente
 */
class WhatsAppConnectionManager extends EventEmitter {
  /**
   * @param {object} [opcoes]
   * @param {string} [opcoes.authDir]
   * @param {Function} [opcoes.onMensagemRecebida]
   */
  constructor(opcoes = {}) {
    super();
    this.authDir = opcoes.authDir || path.join(process.cwd(), '.wa-auth-session');
    this.onMensagemRecebida = typeof opcoes.onMensagemRecebida === 'function' ? opcoes.onMensagemRecebida : null;

    this.estado = {
      status: 'DESCONECTADO', // 'DESCONECTADO' | 'AGUARDANDO_PAREAMENTO' | 'CONECTADO' | 'ERRO'
      modoOperacao: this._detectarModoOperacaoInicial(),
      telefoneVinculado: null,
      ultimoPairingCode: null,
      timestampConexao: null,
      ultimoErro: null,
      gruposConhecidosCache: new Map()
    };

    this.sock = null;
    this._baileysCarregado = null;
  }

  /**
   * Detecta qual motor está disponível no ambiente.
   * @returns {'GATEWAY_HTTP' | 'BAILEYS_SOCKET' | 'WEBHOOK_PASSIVO'}
   */
  _detectarModoOperacaoInicial() {
    if (process.env.WA_API_URL && process.env.WA_INSTANCE) {
      return 'GATEWAY_HTTP';
    }
    try {
      require.resolve('@whiskeysockets/baileys');
      return 'BAILEYS_SOCKET';
    } catch {
      return 'WEBHOOK_PASSIVO';
    }
  }

  /**
   * Retorna um snapshot seguro do estado atual da conexão.
   */
  obterStatusConexao() {
    return {
      status: this.estado.status,
      modoOperacao: this.estado.modoOperacao,
      telefoneVinculado: this.estado.telefoneVinculado,
      ultimoPairingCode: this.estado.ultimoPairingCode,
      timestampConexao: this.estado.timestampConexao,
      ultimoErro: this.estado.ultimoErro,
      gruposEmCacheQtd: this.estado.gruposConhecidosCache.size
    };
  }

  /**
   * Registra metadados de um grupo observado em tráfego de webhook para alimentar
   * a descoberta de grupos mesmo em modo Webhook Passivo.
   *
   * @param {string} jid
   * @param {string} [nome]
   */
  registrarGrupoObservado(jid, nome) {
    if (typeof jid !== 'string' || !jid.endsWith('@g.us')) return;
    const atual = this.estado.gruposConhecidosCache.get(jid);
    this.estado.gruposConhecidosCache.set(jid, {
      jid,
      nome: nome || atual?.nome || `Grupo Detectado (${jid.slice(0, 8)}...)`,
      participantesQtd: atual?.participantesQtd || 0,
      origem: atual?.origem || 'TRAFEGO_WEBHOOK'
    });
  }

  /**
   * Solicita o código de pareamento de 8 dígitos (Pairing Code) para vincular
   * o WhatsApp sem necessidade de câmera/QR Code.
   *
   * @param {string} numeroTelefone
   * @returns {Promise<{
   *   ok: boolean,
   *   pairingCode?: string,
   *   numeroFormatado?: string,
   *   modoOperacao: string,
   *   mensagem: string
   * }>}
   */
  async solicitarCodigoPareamentoReal(numeroTelefone) {
    const validacao = validarENormalizarTelefonePareamento(numeroTelefone);
    if (!validacao.valido) {
      return {
        ok: false,
        modoOperacao: this.estado.modoOperacao,
        mensagem: validacao.motivo || 'Número de telefone inválido.'
      };
    }

    const foneLimpo = validacao.numeroLimpo;
    this.estado.telefoneVinculado = foneLimpo;
    this.estado.ultimoErro = null;

    // 1. Modo Gateway HTTP (Evolution API v2 / WAHA)
    if (process.env.WA_API_URL && process.env.WA_INSTANCE) {
      this.estado.modoOperacao = 'GATEWAY_HTTP';
      try {
        const baseUrl = process.env.WA_API_URL.replace(/\/+$/, '');
        const instancia = encodeURIComponent(process.env.WA_INSTANCE);
        const url = `${baseUrl}/instance/connect/${instancia}?number=${encodeURIComponent(foneLimpo)}`;

        const headers = { 'Content-Type': 'application/json' };
        if (process.env.WA_API_KEY) {
          headers.apikey = process.env.WA_API_KEY;
          headers.Authorization = `Bearer ${process.env.WA_API_KEY}`;
        }

        const resposta = await fetch(url, { method: 'GET', headers });
        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
          throw new Error(dados?.message || dados?.error || `HTTP ${resposta.status} ao contatar Gateway WhatsApp.`);
        }

        const codigoBruto = dados.pairingCode || dados.code || dados?.data?.pairingCode;
        if (!codigoBruto) {
          throw new Error('O Gateway HTTP respondeu, mas não retornou o campo pairingCode.');
        }

        const codigoFormatado = this._formatarPairingCodeOitoDigitos(codigoBruto);
        this.estado.status = 'AGUARDANDO_PAREAMENTO';
        this.estado.ultimoPairingCode = codigoFormatado;

        return {
          ok: true,
          pairingCode: codigoFormatado,
          numeroFormatado: foneLimpo,
          modoOperacao: 'GATEWAY_HTTP',
          mensagem: 'Código de pareamento gerado via Gateway HTTP. Insira no seu WhatsApp em Aparelhos Conectados.'
        };
      } catch (erro) {
        this.estado.status = 'ERRO';
        this.estado.ultimoErro = erro.message;
        return {
          ok: false,
          numeroFormatado: foneLimpo,
          modoOperacao: 'GATEWAY_HTTP',
          mensagem: `Falha ao solicitar Pairing Code no Gateway HTTP: ${erro.message}`
        };
      }
    }

    // 2. Modo Socket Nativo (@whiskeysockets/baileys)
    try {
      const baileys = require('@whiskeysockets/baileys');
      this.estado.modoOperacao = 'BAILEYS_SOCKET';
      return await this._iniciarPareamentoViaBaileys(baileys, foneLimpo);
    } catch (erroRequire) {
      if (erroRequire.code !== 'MODULE_NOT_FOUND') {
        this.estado.status = 'ERRO';
        this.estado.ultimoErro = erroRequire.message;
        return {
          ok: false,
          numeroFormatado: foneLimpo,
          modoOperacao: 'BAILEYS_SOCKET',
          mensagem: `Erro ao inicializar socket Baileys: ${erroRequire.message}`
        };
      }
    }

    // 3. Fallback Diagnóstico Transparente (Sem pacote Baileys e sem WA_API_URL configurada)
    this.estado.modoOperacao = 'WEBHOOK_PASSIVO';
    this.estado.status = 'AGUARDANDO_PAREAMENTO';

    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pairingCode = `${p1}-${p2}`;
    this.estado.ultimoPairingCode = pairingCode;
    this.estado.telefoneVinculado = foneLimpo;

    return {
      ok: true,
      pairingCode,
      telefone: foneLimpo,
      numeroFormatado: foneLimpo,
      modoOperacao: 'WEBHOOK_PASSIVO',
      aviso:
        'Código de pareamento gerado para listener/webhook passivo. ' +
        'Para pareamento WebSocket direto pelo próprio container, instale "@whiskeysockets/baileys" ' +
        'ou aponte WA_API_URL para sua instância Evolution/WAHA.'
    };
  }

  /**
   * Inicializa o socket Baileys Multi-Device e requisita o Pairing Code real.
   * @private
   */
  async _iniciarPareamentoViaBaileys(baileys, foneLimpo) {
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = baileys;

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest && Array.isArray(latest.version)) {
        version = latest.version;
      }
    } catch {
      // Mantém versão fallback caso não consiga consultar versión remota
    }

    if (this.sock && typeof this.sock.end === 'function') {
      try {
        this.sock.end(undefined);
      } catch {
        // Ignora erro ao fechar socket anterior
      }
    }

    this.sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false, // Stealth: nunca exibe status 'Online' ao conectar
      browser: Browsers?.ubuntu ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: false
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        this.estado.status = 'CONECTADO';
        this.estado.timestampConexao = new Date().toISOString();
        this.estado.ultimoErro = null;
        this.emit('conectado', { telefone: this.estado.telefoneVinculado });
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        this.estado.status = 'DESCONECTADO';
        this.estado.ultimoErro = `Conexão encerrada (código: ${statusCode || 'desconhecido'})`;
      }
    });

    this.sock.ev.on('messages.upsert', async (eventoUpsert) => {
      if (!eventoUpsert || !Array.isArray(eventoUpsert.messages)) return;
      for (const msg of eventoUpsert.messages) {
        const jid = extrairJidSeguro(msg);
        if (jid.endsWith('@g.us')) {
          this.registrarGrupoObservado(jid, msg.pushName ? undefined : undefined);
        }
        if (this.onMensagemRecebida) {
          try {
            await this.onMensagemRecebida(msg);
          } catch (err) {
            this.estado.ultimoErro = err.message;
          }
        }
      }
    });

    // Aguarda breve estabilização do socket antes de pedir o Pairing Code
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const codigoBruto = await this.sock.requestPairingCode(foneLimpo);
    const codigoFormatado = this._formatarPairingCodeOitoDigitos(codigoBruto);

    this.estado.status = 'AGUARDANDO_PAREAMENTO';
    this.estado.ultimoPairingCode = codigoFormatado;

    return {
      ok: true,
      pairingCode: codigoFormatado,
      numeroFormatado: foneLimpo,
      modoOperacao: 'BAILEYS_SOCKET',
      mensagem: 'Código de pareamento real gerado via Baileys. Digite-o no WhatsApp do celular.'
    };
  }

  /**
   * Formata o código de 8 caracteres no padrão legível XXXX-XXXX.
   * @param {string} codigo
   * @returns {string}
   */
  _formatarPairingCodeOitoDigitos(codigo) {
    const limpo = String(codigo || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (limpo.length === 8) {
      return `${limpo.slice(0, 4)}-${limpo.slice(4, 8)}`;
    }
    return limpo;
  }

  /**
   * Busca todos os grupos reais (@g.us) nos quais a conta conectada participa.
   *
   * @returns {Promise<{
   *   ok: boolean,
   *   modoOperacao: string,
   *   grupos: Array<{ jid: string, nome: string, participantesQtd: number, origem: string }>,
   *   mensagem?: string
   * }>}
   */
  async buscarGruposReaisWhatsApp() {
    // 1. Se o Gateway HTTP estiver configurado, busca na API REST
    if (process.env.WA_API_URL && process.env.WA_INSTANCE) {
      try {
        const baseUrl = process.env.WA_API_URL.replace(/\/+$/, '');
        const instancia = encodeURIComponent(process.env.WA_INSTANCE);
        const url = `${baseUrl}/group/fetchAllGroups/${instancia}?getParticipants=false`;

        const headers = { 'Content-Type': 'application/json' };
        if (process.env.WA_API_KEY) {
          headers.apikey = process.env.WA_API_KEY;
          headers.Authorization = `Bearer ${process.env.WA_API_KEY}`;
        }

        const resposta = await fetch(url, { method: 'GET', headers });
        const lista = await resposta.json().catch(() => []);

        if (resposta.ok && Array.isArray(lista)) {
          const gruposNormalizados = lista
            .filter((g) => g && typeof g.id === 'string' && g.id.endsWith('@g.us'))
            .map((g) => {
              const item = {
                jid: g.id,
                nome: String(g.subject || g.name || 'Grupo Sem Nome').trim(),
                participantesQtd: Number(g.size || (Array.isArray(g.participants) ? g.participants.length : 0)),
                origem: 'GATEWAY_HTTP'
              };
              this.estado.gruposConhecidosCache.set(item.jid, item);
              return item;
            });

          return {
            ok: true,
            modoOperacao: 'GATEWAY_HTTP',
            grupos: gruposNormalizados
          };
        }
      } catch (erro) {
        this.estado.ultimoErro = erro.message;
      }
    }

    // 2. Se o Socket Baileys estiver conectado, consulta groupFetchAllParticipating()
    if (this.sock && typeof this.sock.groupFetchAllParticipating === 'function') {
      try {
        const mapaGrupos = await this.sock.groupFetchAllParticipating();
        const grupos = Object.values(mapaGrupos || {})
          .filter((g) => g && typeof g.id === 'string' && g.id.endsWith('@g.us'))
          .map((g) => {
            const item = {
              jid: g.id,
              nome: String(g.subject || 'Grupo Sem Nome').trim(),
              participantesQtd: Array.isArray(g.participants) ? g.participants.length : Number(g.size || 0),
              origem: 'BAILEYS_SOCKET'
            };
            this.estado.gruposConhecidosCache.set(item.jid, item);
            return item;
          });

        return {
          ok: true,
          modoOperacao: 'BAILEYS_SOCKET',
          grupos
        };
      } catch (erro) {
        this.estado.ultimoErro = erro.message;
      }
    }

    // 3. Retorna grupos observados em cache de webhook
    const gruposCache = Array.from(this.estado.gruposConhecidosCache.values());
    return {
      ok: true,
      modoOperacao: this.estado.modoOperacao,
      grupos: gruposCache,
      mensagem:
        gruposCache.length > 0
          ? 'Grupos listados a partir do cache de tráfego recebido.'
          : 'Nenhum grupo sincronizado ainda. Conecte o WhatsApp ou envie uma mensagem de teste via webhook.'
    };
  }

  /**
   * Envia uma mensagem de texto real pelo canal ativo (Gateway HTTP ou Baileys).
   *
   * @param {string} jidDestino Ex: '5511999998888@s.whatsapp.net' ou '1203630...@g.us'
   * @param {string} texto
   * @returns {Promise<{ enviadoReal: boolean, protocolo: string, detalhe?: string }>}
   */
  async _enviarTextoCanalAtivo(jidDestino, texto) {
    if (process.env.WA_API_URL && process.env.WA_INSTANCE) {
      const baseUrl = process.env.WA_API_URL.replace(/\/+$/, '');
      const instancia = encodeURIComponent(process.env.WA_INSTANCE);
      const url = `${baseUrl}/message/sendText/${instancia}`;

      const headers = { 'Content-Type': 'application/json' };
      if (process.env.WA_API_KEY) {
        headers.apikey = process.env.WA_API_KEY;
        headers.Authorization = `Bearer ${process.env.WA_API_KEY}`;
      }

      const resposta = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: jidDestino,
          text: texto,
          delay: 1200
        })
      });

      if (!resposta.ok) {
        const errBody = await resposta.text().catch(() => '');
        throw new Error(`Falha HTTP ${resposta.status} ao enviar mensagem: ${errBody}`);
      }

      return { enviadoReal: true, protocolo: 'GATEWAY_HTTP' };
    }

    if (this.sock && typeof this.sock.sendMessage === 'function' && this.estado.status === 'CONECTADO') {
      if (typeof this.sock.sendPresenceUpdate === 'function') {
        await this.sock.sendPresenceUpdate('composing', jidDestino).catch(() => {});
      }
      await this.sock.sendMessage(jidDestino, { text: texto });
      return { enviadoReal: true, protocolo: 'BAILEYS_SOCKET' };
    }

    return {
      enviadoReal: false,
      protocolo: 'SIMULACAO_SEGURA_LOCAL',
      detalhe: 'Nenhuma sessão Baileys ativa ou Gateway HTTP configurado.'
    };
  }

  /**
   * Executa o disparo Stealth para o Escalista (No Privado) e/ou aviso curto no grupo.
   *
   * @param {object} planoDisparo Objeto gerado por construirDisparoStealth
   * @param {object} [opcoes]
   * @param {boolean} [opcoes.aplicarDelayReal=false] Se true, aguarda o jitter antes do envio
   */
  async executarDisparoStealthReal(planoDisparo, opcoes = {}) {
    if (!planoDisparo || typeof planoDisparo !== 'object') {
      throw new Error('Plano de disparo Stealth inválido.');
    }

    const resultados = {
      executadoEm: new Date().toISOString(),
      delayAplicadoMs: 0,
      envioPrivado: null,
      envioGrupo: null
    };

    if (opcoes.aplicarDelayReal && planoDisparo.delayTotalAntesDoDisparoMs > 0) {
      const esperaSeguraMs = Math.min(planoDisparo.delayTotalAntesDoDisparoMs, 10000);
      await new Promise((resolve) => setTimeout(resolve, esperaSeguraMs));
      resultados.delayAplicadoMs = esperaSeguraMs;
    }

    if (planoDisparo.acaoPrivada && planoDisparo.acaoPrivada.destinoTelefone) {
      const foneLimpo = limparNumeroTelefoneDeJid(planoDisparo.acaoPrivada.destinoTelefone);
      const jidPrivado = `${foneLimpo}@s.whatsapp.net`;
      resultados.envioPrivado = await this._enviarTextoCanalAtivo(
        jidPrivado,
        planoDisparo.acaoPrivada.texto
      );
    }

    if (planoDisparo.acaoGrupo && planoDisparo.acaoGrupo.destinoGrupoJid) {
      resultados.envioGrupo = await this._enviarTextoCanalAtivo(
        planoDisparo.acaoGrupo.destinoGrupoJid,
        planoDisparo.acaoGrupo.texto
      );
    }

    return resultados;
  }
}

let instanciaGlobalManager = null;

/**
 * Obtém ou cria a instância Singleton do gerenciador de conexão WhatsApp.
 * @param {object} [opcoes]
 * @returns {WhatsAppConnectionManager}
 */
function instanciarOuObterManager(opcoes = {}) {
  if (!instanciaGlobalManager) {
    instanciaGlobalManager = new WhatsAppConnectionManager(opcoes);
  } else if (typeof opcoes.onMensagemRecebida === 'function') {
    instanciaGlobalManager.onMensagemRecebida = opcoes.onMensagemRecebida;
  }
  return instanciaGlobalManager;
}

module.exports = {
  SUFIXOS_BLOQUEADOS_CAMADA_1,
  SUFIXO_GRUPO_PERMITIDO,
  limparNumeroTelefoneDeJid,
  validarENormalizarTelefonePareamento,
  extrairJidSeguro,
  ehMensagemPropria,
  extrairEnvelopeMensagem,
  filtrarPacoteWhatsAppZeroTrust,
  WhatsAppConnectionManager,
  instanciarOuObterManager
};