### STATUS: BASE_CNES_NACIONAL_COMPLETA_INGESTAO_CONCLUIDA

# 📅 Ultra Rotina — Ecossistema Clínico & Cockpit PWA

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZ ESTRATÉGICA ATUAL DO USUÁRIO**:
1. **BASE CNES INTEGRAL DO BRASIL (~574.000 ESTABELECIDOS) & CABEÇALHO OFICIAL**:
   - *Cobertura 100% Nacional*: 574.006 estabelecimentos de saúde ativos e 5.571 municípios do IBGE indexados em SQLite (`data/cnes.db`) com busca textual FTS5.
   - *Busca Ultra-Rápida (< 1ms)*: Resposta instantânea via `node:sqlite` nativo (sem dependências externas) e fallback em memória resiliente.
   - *Alternância em 1 Toque*: Chips de "Meus Locais Frequentes" e opção de "Consultório Particular / Personalizado" persistidos no IndexedDB (`RotinaClinicalDB`) e LocalStorage.
   - *Cabeçalho Automático*: Injeção imediata de Nome da Unidade, Razão Social, CNES oficial, Endereço Completo, Bairro, CEP e Telefone nos documentos (.docx) e no visualizador de PDF editável.

---

## 🔄 Tarefa Concluída
 
- [x] **Pipeline Determinístico de Busca Oficial de REMUME (.gov.br) com Extrator de PDF e Gatekeeper Clínico (`src/data/remumes/index.js`, `tests/test_remume_busca_gatekeeper_argon.cjs`)**:
    - **Arquivo/Módulo Alvo**: `src/data/remumes/index.js` e `tests/test_remume_busca_gatekeeper_argon.cjs`.
    - **Função/Componente/Seletor**: `_buscarUrlsCandidatasGovBr`, `_ehUrlOficialConfiavel`, `_httpGetBufferSeguro`, `_extrairTextoDeBuffer`, `_extrairTextoDePdfBuffer`, `validarSanidadeClinicaRemume`.
    - **Comportamento Esperado / Critério de Aceite**: Implementação do mecanismo determinístico de busca restrito a domínios governamentais brasileiros (`.gov.br`), transporte binário resiliente com streaming, parser nativo de PDF via `zlib` FlateDecode e operadores de texto, e Gatekeeper Clínico de Sanidade Farmacológica (Zero Invenção) exigindo vínculo territorial do município, mínimo de 5 de 10 medicamentos âncora da Atenção Primária do SUS e densidade de 15+ medicamentos válidos com dosagem. Suíte dedicada aprovada com 5/5 testes em 0.05s.
 
> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Aba Rotina: Pomodoro Inteligente com Persistência no IndexedDB e Sincronização Automática de Conclusão (`rotina_timeline.js`, `gh_cockpit_deploy/rotina_timeline.js`, `tests/test_aba_rotina_cockpit.cjs`)**:
    - **Arquivo/Módulo Alvo**: `rotina_timeline.js` e `gh_cockpit_deploy/rotina_timeline.js`
    - **Função/Componente/Seletor**: Funções `iniciarPomodoroBloco`, `atualizarDisplayPomodoroCard`, `resetarPomodoroBloco` e integração com `UltraRotinaDB`
    - **Comportamento Esperado / Critério de Aceite**: Garantir que o timer Pomodoro dos blocos de estudo ativo (MedQuest e Anki) persista o tempo restante no IndexedDB/LocalStorage (sobrevivendo a recarregamentos de página ou troca de abas), dispare feedback háptico e sonoro beira-leito ao término do bloco, e ofereça botão de 1 toque para auto-concluir e sincronizar bidirecionalmente via Fastify e Telegram.

---

## 📋 Backlog Prioritário

1. [ ] **Integração Bidirecional Telegram da Estação SOAP**: Comando `/soap` no bot consumindo o mesmo serviço de `src/clinical/soap_service.js` para transcrição de áudios e geração instantânea de prontuário e prescrição de bolso.
2. [ ] **Aba Rotina: Notificações Push Locais e Alertas de Transição de Bloco** (`sw.js`, `gh_cockpit_deploy/sw.js`, `rotina_timeline.js`).
3. [ ] **Aba Rotina: Timeline Horizontal Mobile-First e Zoom de Alta Densidade** (`gh_cockpit_deploy/index.html`, `cockpit_movel.html`).

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Estação SOAP / Impressão Direta)*: Gerador de PDF direto da receita médica estilizada para impressão ou assinatura digital ICP-Brasil.
- *Sugestão 02 (Estação SOAP / Integração Prontuário)*: Extensão de navegador (WebExtension) para colar o SOAP e a receita no e-SUS PEC/Tasy/MV com um único atalho de teclado global.
- *Sugestão 03 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 04 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 05 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.

## Auditoria integral — 17/10/2026

- [x] **Auditoria do snapshot completo, sem alterações de produção**.
  - **Arquivo/Módulo Alvo**: `server/`, `src/`, `src/clinical/`, `src/data/remumes/`, `gh_cockpit_deploy/`, `scripts/run_tests.cjs`, Dockerfile e render.yaml.
  - **Função/Componente/Seletor**: `cockpitAutorizar_`, despachante `cockpitRpc`, `ehRequisicaoConvidado`, inicialização de `propsStore`, `processClinicalSoap`, `validateSafety`, `runAllCalculations`, `enviarParaEstacaoSoap`, `renderizarResultadoSoap`, fila/sincronização da timeline e `ConfigService.obterCatalogoRemume`.
  - **Comportamento Esperado / Critério de Aceite da auditoria**: relatório com evidências, impacto, limitações e critérios verificáveis por achado; reproduções sintéticas persistidas; recibo completo preservado. Entregue em `docs/auditorias/2026-10-17/RELATORIO.md`.
  - **Resultado de validação**: 9/9 suítes novas; bateria única ampliada 254/281 (27 falhas, com wrappers e expectativas antigas), incluindo baseline 57/57. `stable:false` por alteração concorrente do código: sem recibo de estabilidade do diretório atual. Correções de produção não fazem parte desta entrega.
