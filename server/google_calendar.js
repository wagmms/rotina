/**
 * ==============================================================================
 * ULTRA ROTINA · GOOGLE CALENDAR NATIVE SERVICE (NODE.JS)
 * ==============================================================================
 * Conector nativo e moderno em Node.js para a Google Calendar API v3.
 * Elimina totalmente dependências de GAS (Google Apps Script) e mantém conexão viva
 * com a agenda real do médico (moraes.wagg@gmail.com).
 * 
 * Funcionalidades:
 * - Renovação automática de access token via OAuth2 Refresh Token (sem deslogar).
 * - Leitura e criação de eventos com suporte síncrono (para runtime VM) e assíncrono (Fastify).
 * - Cache em memória com TTL configurável para evitar rate-limits.
 * - Suporte a fallback seguro quando offline ou sem credenciais.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const syncFetch = require('sync-fetch');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_TOKEN_PATH = path.join(ROOT_DIR, 'calendar_manager', 'token.json');
const DEFAULT_CREDS_PATH = path.join(ROOT_DIR, 'calendar_manager', 'credentials.json');

class GoogleCalendarService {
  constructor(options = {}) {
    this.tokenPath = options.tokenPath || process.env.GOOGLE_CALENDAR_TOKEN_PATH || DEFAULT_TOKEN_PATH;
    this.credsPath = options.credsPath || process.env.GOOGLE_CALENDAR_CREDS_PATH || DEFAULT_CREDS_PATH;
    this.account = options.account || process.env.GOOGLE_CALENDAR_ACCOUNT || 'moraes.wagg@gmail.com';
    this.timezone = options.timezone || process.env.TIMEZONE || 'America/Sao_Paulo';
    
    this._cacheEventos = new Map();
    this._cacheTTL = options.cacheTTL || (20 * 1000); // 20 segundos de cache para sincronização contínua e automática
    this._tokenMemoria = null;
    this._credsMemoria = null;
    this._propsGetter = null;
    this._propsSetter = null;
  }

  /**
   * Conecta ponte de persistência com PropertiesService / propsStore
   */
  setPropsBridge(getter, setter) {
    this._propsGetter = getter;
    this._propsSetter = setter;
  }

  _buscarPropriedade(chave) {
    if (typeof this._propsGetter === 'function') {
      try {
        const val = this._propsGetter(chave);
        if (val) return String(val).trim();
      } catch (_) {}
    }
    return null;
  }

  _salvarPropriedade(chave, valor) {
    if (typeof this._propsSetter === 'function') {
      try {
        this._propsSetter(chave, valor);
      } catch (_) {}
    }
  }

  /**
   * Lê as credenciais instaladas do aplicativo (Client ID e Secret)
   */
  obterClientCredentials() {
    if (this._credsMemoria) return this._credsMemoria;

    // Prioridade 1: Variáveis de ambiente diretas
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    if (clientId && clientSecret) {
      this._credsMemoria = {
        client_id: clientId.trim(),
        client_secret: clientSecret.trim()
      };
      return this._credsMemoria;
    }

    // Prioridade 2: JSON completo nas variáveis de ambiente ou properties
    const credsJsonRaw = process.env.GOOGLE_CALENDAR_CREDS_JSON || this._buscarPropriedade('GOOGLE_CALENDAR_CREDS_JSON');
    if (credsJsonRaw) {
      try {
        const parsed = JSON.parse(credsJsonRaw);
        const info = parsed.installed || parsed.web || parsed;
        if (info.client_id && info.client_secret) {
          this._credsMemoria = {
            client_id: info.client_id.trim(),
            client_secret: info.client_secret.trim()
          };
          return this._credsMemoria;
        }
      } catch (e) {
        console.warn('[GoogleCalendar] Falha ao ler GOOGLE_CALENDAR_CREDS_JSON:', e.message);
      }
    }

    // Prioridade 3: Chaves separadas nas properties persistidas
    const propClientId = this._buscarPropriedade('GOOGLE_CALENDAR_CLIENT_ID') || this._buscarPropriedade('GOOGLE_CLIENT_ID');
    const propClientSecret = this._buscarPropriedade('GOOGLE_CALENDAR_CLIENT_SECRET') || this._buscarPropriedade('GOOGLE_CLIENT_SECRET');
    if (propClientId && propClientSecret) {
      this._credsMemoria = {
        client_id: propClientId.trim(),
        client_secret: propClientSecret.trim()
      };
      return this._credsMemoria;
    }

    // Prioridade 4: Arquivo credentials.json no caminho padrão ou data/
    const possiveisCaminhos = [
      this.credsPath,
      path.join(ROOT_DIR, 'data', 'credentials.json'),
      path.join(ROOT_DIR, 'credentials.json')
    ];

    for (const cPath of possiveisCaminhos) {
      if (cPath && fs.existsSync(cPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(cPath, 'utf8'));
          const info = raw.installed || raw.web || raw;
          if (info.client_id && info.client_secret) {
            this._credsMemoria = {
              client_id: info.client_id.trim(),
              client_secret: info.client_secret.trim()
            };
            return this._credsMemoria;
          }
        } catch (e) {
          console.warn(`[GoogleCalendar] Falha ao ler ${cPath}:`, e.message);
        }
      }
    }

    return null;
  }

  /**
   * Lê os dados do token (access token, refresh token, expiração)
   */
  obterTokenData() {
    if (this._tokenMemoria) return this._tokenMemoria;

    // Prioridade 1: Arquivo token.json no caminho padrão ou data/
    const possiveisCaminhos = [
      this.tokenPath,
      path.join(ROOT_DIR, 'data', 'token.json'),
      path.join(ROOT_DIR, 'data', 'calendar_token.json'),
      path.join(ROOT_DIR, 'token.json')
    ];

    for (const tPath of possiveisCaminhos) {
      if (tPath && fs.existsSync(tPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(tPath, 'utf8'));
          if (raw && (raw.refresh_token || raw.token)) {
            this._tokenMemoria = raw;
            return this._tokenMemoria;
          }
        } catch (e) {
          console.warn(`[GoogleCalendar] Falha ao ler ${tPath}:`, e.message);
        }
      }
    }

    // Prioridade 2: JSON completo de token via env ou properties
    const tokenJsonRaw = process.env.GOOGLE_CALENDAR_TOKEN_JSON || this._buscarPropriedade('GOOGLE_CALENDAR_TOKEN_JSON');
    if (tokenJsonRaw) {
      try {
        const raw = JSON.parse(tokenJsonRaw);
        if (raw && (raw.refresh_token || raw.token)) {
          this._tokenMemoria = raw;
          return this._tokenMemoria;
        }
      } catch (e) {
        console.warn('[GoogleCalendar] Falha ao ler GOOGLE_CALENDAR_TOKEN_JSON:', e.message);
      }
    }

    // Prioridade 3: Refresh token nas variáveis de ambiente ou properties
    const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN ||
      process.env.GOOGLE_REFRESH_TOKEN ||
      this._buscarPropriedade('GOOGLE_CALENDAR_REFRESH_TOKEN') ||
      this._buscarPropriedade('GOOGLE_REFRESH_TOKEN');

    if (refreshToken) {
      const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ||
        process.env.GOOGLE_ACCESS_TOKEN ||
        this._buscarPropriedade('GOOGLE_CALENDAR_ACCESS_TOKEN') ||
        '';

      this._tokenMemoria = {
        token: accessToken,
        refresh_token: refreshToken.trim(),
        account: this.account
      };
      return this._tokenMemoria;
    }

    return null;
  }

  /**
   * Salva o token atualizado em disco e em memória
   */
  salvarTokenData(novoTokenData) {
    this._tokenMemoria = { ...this._tokenMemoria, ...novoTokenData };

    // 1. Tenta salvar no caminho padrão
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.tokenPath, JSON.stringify(this._tokenMemoria, null, 2), 'utf8');
    } catch (e) {
      // Ignora erro em ambientes com filesystem somente-leitura
    }

    // 2. Tenta salvar na pasta data/ se existir
    try {
      const dataTokenPath = path.join(ROOT_DIR, 'data', 'calendar_token.json');
      fs.writeFileSync(dataTokenPath, JSON.stringify(this._tokenMemoria, null, 2), 'utf8');
    } catch (_) {}

    // 3. Persiste via bridge de propriedades
    try {
      this._salvarPropriedade('GOOGLE_CALENDAR_TOKEN_JSON', JSON.stringify(this._tokenMemoria));
      if (this._tokenMemoria.refresh_token) {
        this._salvarPropriedade('GOOGLE_CALENDAR_REFRESH_TOKEN', this._tokenMemoria.refresh_token);
      }
    } catch (_) {}
  }

  /**
   * Renova o access token caso esteja expirado ou prestes a expirar (síncrono via syncFetch)
   */
  garantirAccessTokenSync(forcar = false) {
    const tokenData = this.obterTokenData();
    const creds = this.obterClientCredentials();

    if (!tokenData || !tokenData.refresh_token || !creds) {
      return tokenData ? tokenData.token : null;
    }

    // Verifica validade
    const agora = Date.now();
    let expirado = false;
    if (tokenData.expiry) {
      const expMs = new Date(tokenData.expiry).getTime();
      if (!isNaN(expMs) && expMs - agora < 60000) {
        expirado = true;
      }
    }

    if (!expirado && !forcar && tokenData.token) {
      return tokenData.token;
    }

    try {
      const body = new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token'
      }).toString();

      const res = syncFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro HTTP ao renovar token: ${res.status}`);
        return tokenData.token || null;
      }

      const json = res.json();
      if (json.access_token) {
        const expiresInSec = json.expires_in || 3600;
        const expiryDate = new Date(agora + (expiresInSec * 1000)).toISOString();
        
        tokenData.token = json.access_token;
        tokenData.expiry = expiryDate;
        this.salvarTokenData(tokenData);
        return json.access_token;
      }
    } catch (e) {
      console.warn('[GoogleCalendar] Exceção ao renovar token síncrono:', e.message);
    }

    return tokenData.token || null;
  }

  /**
   * Renova o access token caso esteja expirado (assíncrono via fetch nativo)
   */
  async garantirAccessTokenAsync(forcar = false) {
    const tokenData = this.obterTokenData();
    const creds = this.obterClientCredentials();

    if (!tokenData || !tokenData.refresh_token || !creds) {
      return tokenData ? tokenData.token : null;
    }

    const agora = Date.now();
    let expirado = false;
    if (tokenData.expiry) {
      const expMs = new Date(tokenData.expiry).getTime();
      if (!isNaN(expMs) && expMs - agora < 60000) {
        expirado = true;
      }
    }

    if (!expirado && !forcar && tokenData.token) {
      return tokenData.token;
    }

    try {
      const body = new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token'
      }).toString();

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro HTTP ao renovar token async: ${res.status}`);
        return tokenData.token || null;
      }

      const json = await res.json();
      if (json.access_token) {
        const expiresInSec = json.expires_in || 3600;
        const expiryDate = new Date(agora + (expiresInSec * 1000)).toISOString();
        
        tokenData.token = json.access_token;
        tokenData.expiry = expiryDate;
        this.salvarTokenData(tokenData);
        return json.access_token;
      }
    } catch (e) {
      console.warn('[GoogleCalendar] Exceção ao renovar token async:', e.message);
    }

    return tokenData.token || null;
  }

  /**
   * Converte um item da API do Google Calendar em um objeto com métodos compatíveis com GAS e JSON
   */
  _formatarEvento(item) {
    const id = item.id || '';
    const title = item.summary || 'Compromisso';
    const isAllDay = !item.start?.dateTime && !!item.start?.date;
    
    let inicio;
    if (item.start?.dateTime) {
      inicio = new Date(item.start.dateTime);
    } else if (item.start?.date) {
      inicio = new Date(item.start.date + 'T00:00:00');
    } else {
      inicio = new Date();
    }

    let fim;
    if (item.end?.dateTime) {
      fim = new Date(item.end.dateTime);
    } else if (item.end?.date) {
      fim = new Date(item.end.date + 'T23:59:59');
    } else {
      fim = new Date(inicio.getTime() + 3600000);
    }

    const location = item.location || '';
    const description = item.description || '';

    return {
      id: id,
      title: title,
      start: inicio,
      end: fim,
      location: location,
      description: description,
      isAllDay: isAllDay,
      
      // Interface compatível com GAS CalendarApp Event
      getId: () => id,
      getTitle: () => title,
      getStartTime: () => inicio,
      getEndTime: () => fim,
      getLocation: () => location,
      getDescription: () => description,
      isAllDayEvent: () => isAllDay
    };
  }

  /**
   * Lista eventos entre duas datas de forma síncrona (usado pelo CalendarApp no runtime)
   */
  listarEventosSync(inicio, fim, calendarId = 'primary') {
    const dInicio = inicio instanceof Date ? inicio : new Date(inicio);
    const dFim = fim instanceof Date ? fim : new Date(fim);
    
    const cacheKey = `${calendarId}_${dInicio.getTime()}_${dFim.getTime()}`;
    const hit = this._cacheEventos.get(cacheKey);
    if (hit && (Date.now() - hit.timestamp) < this._cacheTTL) {
      return hit.eventos;
    }

    const token = this.garantirAccessTokenSync();
    if (!token) return [];

    try {
      const timeMin = dInicio.toISOString();
      const timeMax = dFim.toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

      let res = syncFetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        // Tenta renovar o token e tentar de novo
        const novoToken = this.garantirAccessTokenSync(true);
        if (novoToken) {
          res = syncFetch(url, {
            headers: { 'Authorization': `Bearer ${novoToken}` }
          });
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro ao listar eventos: HTTP ${res.status}`);
        return [];
      }

      const data = res.json();
      const items = (data && data.items) ? data.items : [];
      const eventos = items.map(it => this._formatarEvento(it));

      this._cacheEventos.set(cacheKey, { timestamp: Date.now(), eventos });
      return eventos;
    } catch (e) {
      console.warn('[GoogleCalendar] Erro na requisição síncrona de eventos:', e.message);
      return [];
    }
  }

  /**
   * Lista eventos entre duas datas de forma assíncrona (para rotas Fastify)
   */
  async listarEventosAsync(inicio, fim, calendarId = 'primary') {
    const dInicio = inicio instanceof Date ? inicio : new Date(inicio);
    const dFim = fim instanceof Date ? fim : new Date(fim);
    
    const cacheKey = `${calendarId}_${dInicio.getTime()}_${dFim.getTime()}`;
    const hit = this._cacheEventos.get(cacheKey);
    if (hit && (Date.now() - hit.timestamp) < this._cacheTTL) {
      return hit.eventos;
    }

    const token = await this.garantirAccessTokenAsync();
    if (!token) return [];

    try {
      const timeMin = dInicio.toISOString();
      const timeMax = dFim.toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

      let res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401) {
        const novoToken = await this.garantirAccessTokenAsync(true);
        if (novoToken) {
          res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${novoToken}` }
          });
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro ao listar eventos async: HTTP ${res.status}`);
        return [];
      }

      const data = await res.json();
      const items = (data && data.items) ? data.items : [];
      const eventos = items.map(it => this._formatarEvento(it));

      this._cacheEventos.set(cacheKey, { timestamp: Date.now(), eventos });
      return eventos;
    } catch (e) {
      console.warn('[GoogleCalendar] Erro na requisição assíncrona de eventos:', e.message);
      return [];
    }
  }

  /**
   * Cria um evento na Google Calendar API (síncrono)
   */
  criarEventoSync(titulo, inicio, fim, opts = {}, calendarId = 'primary') {
    const token = this.garantirAccessTokenSync();
    if (!token) return null;

    try {
      const dInicio = inicio instanceof Date ? inicio : new Date(inicio);
      const dFim = fim instanceof Date ? fim : new Date(fim);

      const payload = {
        summary: titulo,
        description: opts.description || '',
        location: opts.location || '',
        start: { dateTime: dInicio.toISOString() },
        end: { dateTime: dFim.toISOString() }
      };

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      let res = syncFetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        const novoToken = this.garantirAccessTokenSync(true);
        if (novoToken) {
          res = syncFetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${novoToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro ao criar evento: HTTP ${res.status}`);
        return null;
      }

      this._cacheEventos.clear();
      const created = res.json();
      return this._formatarEvento(created);
    } catch (e) {
      console.warn('[GoogleCalendar] Erro ao criar evento sync:', e.message);
      return null;
    }
  }

  /**
   * Converte data/hora para objeto RFC3339 com timezone explícito America/Sao_Paulo (-03:00)
   */
  _formatarDateTimeTimeZone(valor, tzPadrao = 'America/Sao_Paulo') {
    if (!valor) return null;
    if (typeof valor === 'object' && valor.dateTime) {
      return {
        dateTime: valor.dateTime,
        timeZone: valor.timeZone || tzPadrao
      };
    }
    if (typeof valor === 'string') {
      if (valor.includes('T')) {
        const hasOffset = /[+-]\d{2}:\d{2}$|Z$/.test(valor);
        const dtStr = hasOffset ? valor : `${valor}-03:00`;
        return {
          dateTime: dtStr,
          timeZone: tzPadrao
        };
      }
    }
    const d = valor instanceof Date ? valor : new Date(valor);
    if (isNaN(d.getTime())) return null;
    return {
      dateTime: d.toISOString(),
      timeZone: tzPadrao
    };
  }

  /**
   * Atualiza parcialmente um evento existente na Google Calendar API (síncrono via syncFetch)
   */
  atualizarEventoSync(eventId, alteracoes = {}, calendarId = 'primary') {
    if (!eventId) return null;
    const token = this.garantirAccessTokenSync();
    if (!token) return null;

    try {
      const payload = {};
      if (alteracoes.summary !== undefined) payload.summary = alteracoes.summary;
      if (alteracoes.description !== undefined) payload.description = alteracoes.description;
      if (alteracoes.location !== undefined) payload.location = alteracoes.location;

      if (alteracoes.start) {
        const st = this._formatarDateTimeTimeZone(alteracoes.start, this.timezone);
        if (st) payload.start = st;
      }
      if (alteracoes.end) {
        const en = this._formatarDateTimeTimeZone(alteracoes.end, this.timezone);
        if (en) payload.end = en;
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
      let res = syncFetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        const novoToken = this.garantirAccessTokenSync(true);
        if (novoToken) {
          res = syncFetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${novoToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro ao atualizar evento (${eventId}): HTTP ${res.status}`);
        return null;
      }

      this._cacheEventos.clear();
      const updated = res.json();
      return this._formatarEvento(updated);
    } catch (e) {
      console.warn(`[GoogleCalendar] Erro ao atualizar evento sync (${eventId}):`, e.message);
      return null;
    }
  }

  /**
   * Atualiza parcialmente um evento existente na Google Calendar API (assíncrono via fetch)
   */
  async atualizarEventoAsync(eventId, alteracoes = {}, calendarId = 'primary') {
    if (!eventId) return null;
    const token = await this.garantirAccessTokenAsync();
    if (!token) return null;

    try {
      const payload = {};
      if (alteracoes.summary !== undefined) payload.summary = alteracoes.summary;
      if (alteracoes.description !== undefined) payload.description = alteracoes.description;
      if (alteracoes.location !== undefined) payload.location = alteracoes.location;

      if (alteracoes.start) {
        const st = this._formatarDateTimeTimeZone(alteracoes.start, this.timezone);
        if (st) payload.start = st;
      }
      if (alteracoes.end) {
        const en = this._formatarDateTimeTimeZone(alteracoes.end, this.timezone);
        if (en) payload.end = en;
      }

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
      let res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        const novoToken = await this.garantirAccessTokenAsync(true);
        if (novoToken) {
          res = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${novoToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
      }

      if (!res.ok) {
        console.warn(`[GoogleCalendar] Erro ao atualizar evento async (${eventId}): HTTP ${res.status}`);
        return null;
      }

      this._cacheEventos.clear();
      const updated = await res.json();
      return this._formatarEvento(updated);
    } catch (e) {
      console.warn(`[GoogleCalendar] Erro ao atualizar evento async (${eventId}):`, e.message);
      return null;
    }
  }

  /**
   * Limpa cache de eventos
   */
  limparCache() {
    this._cacheEventos.clear();
  }

  /**
   * Retorna o status detalhado da conexão com o Google Calendar
   */
  obterStatus() {
    const tokenData = this.obterTokenData();
    const creds = this.obterClientCredentials();
    const temToken = !!(tokenData && (tokenData.token || tokenData.refresh_token));
    const temCreds = !!(creds && creds.client_id);

    return {
      conectado: temToken && temCreds,
      conta: (tokenData && tokenData.account) || this.account,
      tokenValido: temToken,
      expiracaoToken: tokenData ? tokenData.expiry : null,
      timezone: this.timezone
    };
  }
}

// Instância singleton global
const googleCalendarInstance = new GoogleCalendarService();

module.exports = {
  GoogleCalendarService,
  googleCalendarInstance
};
