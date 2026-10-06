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

  function carregarPropriedades() {
    if (propsCache) return propsCache;
    try {
      if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
        propsCache = PropertiesService.getScriptProperties().getProperties() || {};
      } else {
        propsCache = {};
      }
    } catch (e) {
      propsCache = {};
    }
    return propsCache;
  }

  // Valores padrão estruturais não-sensíveis.
  // Todos os segredos e credenciais devem ser definidos exclusivamente em ScriptProperties.
  var DEFAULTS = {
    PROVEDOR_TEXTO_PADRAO: "GROQ",
    TIMEZONE: "America/Sao_Paulo",
    SPREADSHEET_ID_REMUME: "",
    SPREADSHEET_ID_INTERACOES: "",
    WEB_APP_URL: ""
  };

  return {
    get: function(chave, valorPadrao) {
      try {
        if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
          var valDireto = PropertiesService.getScriptProperties().getProperty(chave);
          if (valDireto !== undefined && valDireto !== null && valDireto !== "") {
            return valDireto;
          }
        }
      } catch (e) {}
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
var TIMEZONE = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
var SPREADSHEET_ID_REMUME = ConfigService.get("SPREADSHEET_ID_REMUME");
var SPREADSHEET_ID_INTERACOES = ConfigService.get("SPREADSHEET_ID_INTERACOES");
var WEB_APP_URL = ConfigService.get("WEB_APP_URL");
