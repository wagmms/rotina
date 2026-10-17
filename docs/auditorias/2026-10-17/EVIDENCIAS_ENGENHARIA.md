# Auditoria de engenharia — 2026-10-17
Cópia isolada de server/, src/ e cockpit_movel.html, sem .env, sem data real, node_modules compartilhado somente leitura.
Execuções com env -i, NODE_ENV=test, TELEGRAM_CHAT_ID=123 e token fictício; fetch principal e UrlFetchApp bloqueados. CNES abre o banco local em modo readOnly pelo caminho absoluto embutido no serviço. Nenhuma mensagem enviada e nenhum dado real alterado.

Resultados observados via Fastify inject:
- POST /api/cockpit, metodo=cockpitConsultar, session=internal: HTTP 200, ok=true e estrutura de consulta clínica.
- POST /api/cockpit, metodo=criarSessaoCockpit_, session=123: HTTP 200 e token ck_* assinado válido para o titular fictício, mesmo fora da allowlist.
- GET / Accept:text/html: HTTP 200; HTML contém window.cockpitSessionRaw = "ck_...".
- POST /api/perfil, chatId=123, municipio=Auditoria, uf=SP, sem sessão: HTTP 200, ok=true.
- GET /api/rotina/blocos?data=2026-10-17, sem sessão: HTTP 200, ok=true.
- POST /api/rotina/blocos, data=2026-10-17, blocos=[], sem sessão: HTTP 200, ok=true.
- RATE_LIMIT_MAX=2, GET /api/perfil sequencial sem bypass: 200, 200, 429, 429. Com x-bypass-ratelimit:true: HTTP 200.
- POST /webhook com segredo correto fictício, inline_query.from.id=123: HTTP 200 {ok:true,ignored:true}.

Persistência: arquivo fictício data/properties.json tinha ROTINA_VER_*, ROTINA_DESCANSO, GCAL_SENTINEL, PESO_ATUAL, atendimento_123, soapview_123 e CONTEXTO_CLINICO_123 antes de require(runtime). Após boot, de todas essas chaves somente CONTEXTO_CLINICO_123 existia em propsStore.

Empacotamento: git ls-files para data/*.db e data/*.sqlite* não retornou nenhum arquivo. data/cnes.db e data/tdc_knowledge.db existem apenas localmente; Dockerfile não copia data/. Nenhuma referência a tdc_knowledge em src/ ou server/.
