"""Isola funções internas das chamadas públicas google.script.run."""
PUBLICAS = ['doGet', 'doPost', 'cockpitConsultar', 'cockpitPreceptor',
            'cockpitStatusLeito', 'cockpitPassagem', 'cockpitCalcular', 'cockpitRemume',
            'cockpitConversar', 'cockpitPerfil', 'cockpitRegistrarPeso']
TRIGGERS = ['processarFilaTelegram', 'aquecerCachePlanilhas', 'executarCicloRotina5Min']
ADMIN = ['setupScriptProperties', 'configurarWebhookTelegram', 'configurarMenuTelegram',
         'instalarTodosOsAcionadores']


def empacotar(codigo):
    exports = ','.join(f'{nome}:{nome}' for nome in PUBLICAS)
    trigger_map = ','.join(f'{nome}:{nome}' for nome in TRIGGERS)
    admin_map = ','.join(f'{nome}:{nome}' for nome in ADMIN)
    guards = '''
    return {publicas:{EXPORTS},
      trigger:function(nome,e) {
        if(!e || !e.triggerUid || !ScriptApp.getProjectTriggers().some(function(t) {
          return String(t.getUniqueId())===String(e.triggerUid) && t.getHandlerFunction()===nome;
        })) throw new Error('Acionador não autorizado.');
        return ({TRIGGERS})[nome]();
      },
      admin:function(nome,secret) {
        if(!secret || secret!==ConfigService.exigir('WEBHOOK_SECRET')) throw new Error('Não autorizado.');
        return ({ADMIN})[nome]();
      }
    };
})();
'''.replace('EXPORTS', exports).replace('TRIGGERS', trigger_map).replace('ADMIN', admin_map)
    wrappers = '\n'.join(f'function {n}() {{ return rotinaPrivada_.publicas.{n}.apply(null, arguments); }}' for n in PUBLICAS)
    wrappers += '\n' + '\n'.join(f'function {n}(e) {{ return rotinaPrivada_.trigger("{n}", e); }}' for n in TRIGGERS)
    wrappers += '\n' + '\n'.join(f'function {n}(secret) {{ return rotinaPrivada_.admin("{n}", secret); }}' for n in ADMIN)
    # Os shims de teste declaram var com estes nomes. Passá-los como parâmetros
    # impede que o hoisting esconda os serviços nativos do Apps Script.
    natives = ('Logger', 'PropertiesService', 'Utilities', 'CalendarApp')
    parameters = ', '.join(natives)
    arguments = ', '.join('typeof {0} !== "undefined" ? {0} : undefined'.format(n) for n in natives)
    return ('var rotinaPrivada_ = (function(' + parameters + ') {\n' + codigo
            + guards.replace('})();', '})(' + arguments + ');') + wrappers + '\n')
