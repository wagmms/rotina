# Errors Log

Command failures, exceptions, and unexpected behaviors.

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
