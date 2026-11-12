### STATUS: AUDITORIA_PROFUNDA_E_4_ONDAS_CONCLUIDAS

# 📅 Ultra Rotina — Ecossistema Clínico & Cockpit PWA

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZ ESTRATÉGICA ATUAL DO USUÁRIO**:
1. **AUDITORIA ABSOLUTA DO MEDBOT (4 ONDAS CONCLUÍDAS COM 100% DE SUCESSO)**:
   - *Onda 1 (Segurança Clínica & Fórmulas Críticas)*: Incompatibilidades em Y (Vasopressina/Fenitoína/Diazepam), Salina 3% corrigida (445 mL SF + 55 mL NaCl 20%), SRI com tetos e redução no choque, SOS/Pré-Eclâmpsia corrigido, Dengue MS 2024 pediátrica, PNI atualizado para VIP injetável.
   - *Onda 2 (Runtime & Auth)*: Vazamento de sessão fechado em `/api/cockpit-url` via timing-safe check; timing attack mitigado em `/api/admin/config`; buffer D1 protegido contra loop infinito; cache em RAM de 1.2 MB de `cockpit_movel.html` com ETag/304; expurgo de chamadas síncronas de Vertex AI esgotado.
   - *Onda 3 (Telegram UX & Cockpit)*: Fast-Ack em botões inline (`answerCallbackQuery`), eliminação de callbacks órfãos (`cmd_dhe:`, `calc_cat_nefro`, `calc_Mero`, `calc_Vanco`, `ux:soap:copiar`), correção de `IDB_STORE` no IndexedDB do mobile cockpit e saneamento de regex duplicador no `#soap-brain-dump`.
   - *Onda 4 (Roteamento em RAM & REMUME)*: Atalhos determinísticos em RAM para calculadoras e interações medicamentosas (0ms de latência), saneamento de linhas truncadas e exclusão de legendas no índice de `REMUME_RP.csv`, e conformidade estrita de schema no preset `manifest.json`.
   - *Validação Final*: 57/57 suítes aprovadas com 100% de sucesso em 15.21s. Zero regressões.

---

## 🎯 Última Tarefa Concluída

- [x] **Execução Integral da Auditoria Absoluta em 4 Ondas (`src/`, `server/`, `cockpit_movel.html`, `estacao_soap.js`, `REMUME_RP.csv`)**:
    - **Arquivo/Módulo Alvo**: `src/02_*`, `src/04_motores_ia.js`, `src/07d_telegram_callbacks.js`, `src/07f_telegram_calculadoras_parser.js`, `src/09_enfermaria.js`, `src/12_experiencia_bot.js`, `server/index.js`, `server/runtime.js`, `cockpit_movel.html`, `estacao_soap.js`, `REMUME_RP.csv` e `src/data/remumes/presets/manifest.json`.
    - **Função/Componente/Seletor**: Matriz em Y, fórmulas de SRI e DHE, escore SOS, hidratação da dengue, rotas `/api/cockpit-url` e `/api/admin/config`, `renderCockpitHtml` em RAM, `tratarCallbackHabitoEEnergia_`, `tratarCallbackDhe_`, `tratarCallbackCalculadoras_`, `escapeRegExpCockpit`, `formatarPainelBordo`, `verificarInteracaoComIA` e indexação da REMUME.
    - **Comportamento Esperado / Critério de Aceite**: Bloqueio total de riscos farmacotécnicos e clínicos críticos; proteção contra timing attacks e vazamento de tokens de sessão; eliminação do travamento de spinner no Telegram com Fast-Ack; histórico offline IndexedDB restaurado; consultas farmacológicas em 0ms no event loop; 57/57 suítes de teste aprovadas com 100% de sucesso.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Monitoramento Operacional e Suporte a Novas Diretrizes Clínicas**:
    - **Arquivo/Módulo Alvo**: `server/index.js` e `src/07a_telegram_router.js`.
    - **Função/Componente/Seletor**: Telemetria do bot e rotinas de plantão.
    - **Comportamento Esperado / Critério de Aceite**: Manter taxa de resposta do bot < 500ms e 100% de estabilidade nos testes.

---

## 📋 Backlog Prioritário

1. [ ] **Integração de WebExtension para PEP Municipal**: Injeção de evolução SOAP e prescrição no e-SUS PEC/Tasy com 1 clique (`gh_cockpit_deploy/`).
2. [ ] **Assinatura Digital ICP-Brasil no Receituário PDF**: Emissão de receita A4 com QR Code verificável do CFM (`src/10_pdf_receita.js`).

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Estação SOAP / Impressão Direta)*: Gerador de PDF direto da receita médica estilizada para impressão ou assinatura digital ICP-Brasil.
- *Sugestão 02 (Estação SOAP / Integração Prontuário)*: Extensão de navegador (WebExtension) para colar o SOAP e a receita no e-SUS PEC/Tasy/MV com um único atalho de teclado global.
- *Sugestão 03 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 04 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 05 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
