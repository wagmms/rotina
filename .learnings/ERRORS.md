# Errors Log

Command failures, exceptions, and unexpected behaviors.

---

## [ERR-20261014-001] testes SOAP concorrentes e asserção desatualizada

**Logged**: 2026-10-14
**Status**: resolved
**Area**: tests

### Summary
`test_soap_modo_e_receita_ux.cjs` falhou ao gravar `data/properties.json` quando executado em paralelo com outra suíte que usa o mesmo runtime; passou isoladamente. `test_soap_dois_tempos.cjs` esperava um rótulo de pendências antigo e também falhava no código-base anterior; a asserção foi alinhada ao rótulo atual. Para testes que persistem propriedades, executar as suítes em sequência.

---

## [ERR-20261013-001] telegram_bot_token_leak_hijacking

**Logged**: 2026-10-13T00:15:00-03:00
**Priority**: critical
**Status**: resolved
**Area**: infra

### Summary
Token do Telegram Bot foi vazado em arquivo legado versionado no GitHub público (`radar_voos/Code.js`), permitindo que bot farm externa (`A-TOOLS X`) sequestrasse o bot via `getUpdates` e respondesse spam aos usuários.

### Error
```
🚀 To use this bot, you must join our channel: https://t.me/A_TOOLSx2
Telegram A-TOOLS X
Programming & Development Tools • Resources • Services
```

### Context
- Arquivo: `radar_voos/Code.js` continha `TELEGRAM_BOT_TOKEN = "8648806451:..."` hardcoded.
- Repositório `https://github.com/wagmms/rotina` é público.
- Webhook oficial não estava ativado com `secret_token` exclusivo, permitindo que o processo invasor usasse long-polling (`getUpdates`).

### Suggested Fix
1. Forçar registro imediato do Webhook oficial apontando para o Render com `secret_token` (o que corta o long polling do invasor com HTTP 409 Conflict).
2. Expurgar pastas legadas com chaves (`radar_voos/`), adicionar ao `.gitignore` e comitar/push.
3. Revogar token comprometido via `@BotFather` (`/revoke`) e atualizar variáveis de ambiente no Render e locais.

### Metadata
- Reproducible: yes
- Related Files: `radar_voos/Code.js`, `.gitignore`, `server/index.js`
- See Also: LRN-20261013-001
- Pattern-Key: infra.telegram_token_leak_hijacking
- Recurrence-Count: 1
- First-Seen: 2026-10-13
- Last-Seen: 2026-10-13

---

## [ERR-20261012-001] run_tests_fingerprint_concurrency

**Logged**: 2026-10-12T10:15:00-03:00
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
`run_tests.cjs` reportava "código ALTERADO" devido à criação concorrente de repros pelo Testador Master em janela visível.

### Error
```
[FALHA] código ALTERADO durante os testes
Diff detectado: tests/repros/repro_issue_213_atb_meropenem_34.cjs, docs/RELATORIO_TESTADOR_MASTER.md
```

### Context
- Operação: `node scripts/run_tests.cjs` ou `npm test`
- Ambiente: Processo contínuo do Testador Master (`testador_master.py`) rodando ativamente no terminal visível do usuário (`pts/0`) e gerando arquivos de reprodução dinamicamente enquanto a suíte rodava.

### Suggested Fix
Excluir expressamente diretórios de artefatos dinâmicos (`tests/repros`, `docs/RELATORIO_TESTADOR_MASTER.md` e `tooling/testador_master/dashboard_grafo.html`) do cômputo do fingerprint do repositório em `scripts/run_tests.cjs`.

### Metadata
- Reproducible: yes
- Related Files: `scripts/run_tests.cjs`, `tooling/testador_master/testador_master.py`
- See Also: LRN-20261012-001
- Pattern-Key: tests.fingerprint_untracked_race
- Recurrence-Count: 1
- First-Seen: 2026-10-12
- Last-Seen: 2026-10-12

### Maintenance
- Claim: Runner de testes com checagem de integridade de working tree deve ignorar pastas de logs e relatórios gerados por daemons de teste ativos.
- Scope: `scripts/run_tests.cjs`
- Authority: `scripts/run_tests.cjs`
- Decay: project / build tool
- Revalidate: when test runner fingerprint logic changes
- Validation: validated
- Evidence: `npm test` passou a executar com sucesso mesmo com o Testador Master em execução concorrente.
- Disposition: retain
- Guidance: Manter filtros de exclusão no fingerprint para artefatos gerados em tempo de execução.

---
