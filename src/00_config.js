/**
 * ==============================================================================
 * MÓDULO 00: CONFIGURAÇÕES, SEGREDOS E AMBIENTE (ConfigService)
 * ==============================================================================
 * Arquitetura de Gestão de Chaves e Propriedades:
 * Lê prioritariamente de PropertiesService.getScriptProperties().
 * ==============================================================================
 */

var ConfigService = (function() {
  var propsCache = null;

  // Snapshot único por execução: getProperties() custa 1 operação da cota diária,
  // enquanto getProperty por chave custava uma operação a cada leitura.
  function carregarPropriedades() {
    if (propsCache) return propsCache;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        propsCache = PropertiesService.getScriptProperties().getProperties() || {};
        return propsCache;
      }
    } catch (e) {}
    return {}; // Serviço ainda indisponível: não fixa um cache vazio.
  }

  // Valores padrão estruturais não-sensíveis.
  // Todos os segredos e credenciais devem ser definidos exclusivamente em ScriptProperties.
  var DEFAULTS = {
    PROVEDOR_TEXTO_PADRAO: "GEMINI",
    IA_MODELOS_CLINICOS_GEMINI: "gemini-3.5-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-flash-latest",
    IA_MODELOS_GEMINI: "gemini-3.5-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-flash-latest",
    IA_MODELOS_TTS_GEMINI: "gemini-2.5-flash-preview-tts,gemini-3.8-flash-tts",
    IA_MODELOS_LOCAL: "llama3.1:latest,llama3.2:latest,mistral:latest,llama3:8b,mistral:7b",
    LOCAL_LLM_URL: "http://127.0.0.1:11434/v1/chat/completions",
    LOCAL_LLM_API_KEY: "ollama",
    LOCAL_LLM_TIMEOUT_MS: "30000",
    LOCAL_LLM_ATIVO: "auto",
    IA_VOZ_PRECEPTOR: "Fenrir",
    TIMEZONE: "America/Sao_Paulo",
    SPREADSHEET_ID_REMUME: "",
    SPREADSHEET_ID_INTERACOES: "",
    WEB_APP_URL: "",
    IA_LOCAL_ENDPOINT: "http://127.0.0.1:11434/v1/chat/completions",
    IA_MODELOS_LOCAL: "llama3.1:latest,llama3:8b,mistral:latest,llama3:latest,mistral:7b",
    IA_LOCAL_TIMEOUT_MS: "12000",
    IA_FALLBACK_OFFLINE_HABILITADO: "true"
  };

  return {
    get: function(chave, valorPadrao) {
      var p = carregarPropriedades();
      if (p[chave] !== undefined && p[chave] !== null && p[chave] !== "") {
        return p[chave];
      }
      if (DEFAULTS[chave] !== undefined) {
        return DEFAULTS[chave];
      }
      return valorPadrao;
    },
    getArray: function(chave) {
      var val = this.get(chave, "[]");
      try {
        var parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
      if (typeof val === "string" && val.indexOf(",") !== -1) {
        return val.split(",").map(function(s) { return s.trim(); });
      }
      return val ? [val] : [];
    },
    getPrimary: function(chave, valorPadrao) {
      var arr = this.getArray(chave);
      if (arr && arr.length > 0 && arr[0]) return String(arr[0]).trim();
      return valorPadrao !== undefined ? valorPadrao : "";
    },
    invalidar: function() { propsCache=null; },
    exigir: function(chave) {
      var val = this.get(chave);
      if (!val) {
        throw new Error("Configuração obrigatória ausente em ScriptProperties: " + chave);
      }
      return val;
    },
    getDefaults: function() {
      return DEFAULTS;
    }
  };
})();

// Variáveis globais de compatibilidade
var TELEGRAM_BOT_TOKEN = ConfigService.get("TELEGRAM_BOT_TOKEN");
var TELEGRAM_CHAT_ID = ConfigService.get("TELEGRAM_CHAT_ID");
var NOTION_TOKEN = ConfigService.get("NOTION_TOKEN");
var NOTION_HABIT_LOG_DB_ID = ConfigService.get("NOTION_HABIT_LOG_DB_ID");
var NOTION_TASKS_DB_ID = ConfigService.get("NOTION_TASKS_DB_ID");
var PROVEDOR_TEXTO_PADRAO = ConfigService.get("PROVEDOR_TEXTO_PADRAO", "GROQ");
var GROQ_API_KEY = ConfigService.get("GROQ_API_KEY");
var OPENROUTER_API_KEY = ConfigService.get("OPENROUTER_API_KEY");
var ZAI_API_KEY = ConfigService.get("ZAI_API_KEY");
var GEMINI_API_KEYS = ConfigService.getArray("GEMINI_API_KEYS");
var LOCAL_LLM_URL = ConfigService.get("LOCAL_LLM_URL", "http://127.0.0.1:11434/v1/chat/completions");
var LOCAL_LLM_API_KEY = ConfigService.get("LOCAL_LLM_API_KEY", "ollama");
var IA_MODELOS_LOCAL = ConfigService.getArray("IA_MODELOS_LOCAL");
var TIMEZONE = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
var SPREADSHEET_ID_REMUME = ConfigService.get("SPREADSHEET_ID_REMUME");
var SPREADSHEET_ID_INTERACOES = ConfigService.get("SPREADSHEET_ID_INTERACOES");
var WEB_APP_URL = ConfigService.get("WEB_APP_URL");
var IA_LOCAL_ENDPOINT = ConfigService.get("IA_LOCAL_ENDPOINT");
var IA_MODELOS_LOCAL = ConfigService.get("IA_MODELOS_LOCAL");
