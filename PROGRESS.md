### STATUS: DESENVOLVIMENTO_ABA_ROTINA

# 📅 Ultra Rotina — Desenvolvimento Integral da Aba Rotina

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração e consulta sob comando.

**DIRETRIZ ESTRATÉGICA ATUAL DO USUÁRIO (FOCO 100% NA ABA ROTINA)**:
1. **OBJETIVO ABSOLUTO: DESENVOLVIMENTO INTEGRAL DA ABA ROTINA**:
   - *Foco Total & Sem Conservadorismo*: O autoloop concentra 100% de sua capacidade em refatorar, expandir e integrar a **Aba Rotina** em todo o ecossistema (Cockpit PWA, rotas Fastify e Telegram Bot).
   - *Reestruturação Visual no Cockpit PWA*: Substituir a interface legada de `#tab-rotina` por uma timeline de time-blocking moderna, rica e responsiva, com cards dinâmicos do dia (horários, atividades, tags, status e notas).
   - *Erradicação de Conteúdo Genérico e Mocks*: Remover textos fixos ("Turma J", "Semana Ativa", blocos de estudo congelados), conectando a rotina viva do médico (escala de plantão, MedQuest, Anki, treino e recuperação).
   - *Integração Real com Google Calendar no Backend Fastify*: Descontinuar definitivamente dependências órfãs de GAS `CalendarApp` e integrar via Node.js nativo (iCal / Google Calendar API / Service Account).
   - *Sincronização Bidirecional & Offline-First*: Comunicação fluida entre Telegram e Cockpit PWA com persistência local em IndexedDB para uso beira-leito sem latência.
2. **Validação Rigorosa (Test Sharding)**: Iterar exclusivamente com o teste do módulo alterado (~0.3s a 0.5s); ao concluir a tarefa, certificar zero regressões com `npm test`.

---

## 🔄 Tarefa Concluída

- [x] **Revisão e Modernização de Protocolos Médicos (Onda 5) com Gemini 4 Argon: Hemorragia Pós-Parto (HPP) com Índice de Choque Obstétrico (ICO) e Bundle E-MOTIVE (FIGO 2024 / FEBRASGO 2024), Pré-Eclâmpsia com Sinais de Gravidade (ACOG / FEBRASGO 2024 - Zuspan e Pritchard) e RCF Doppler com Estádios de Barcelona/ISUOG (`src/02_centro_obstetrico.js`, `tests/test_revisao_protocolos_onda5.cjs`)**:
    - **Diagnóstico e Atualização de Consensos (Auditoria Clínica com Gemini 4 Argon)**:
      * *Hemorragia Pós-Parto e Bundle E-MOTIVE (FIGO 2024)*: Índice de Choque Obstétrico ($\text{ICO} = \text{FC} / \text{PAS}$) com corte $\ge 0.9$ (alerta precoce) e $\ge 1.4$ (choque grave e transfusão maciça 1:1:1); Ácido Tranexâmico 1g IV precoce $\le 3\text{h}$; bloqueio formal de Metilergometrina na hipertensão; escalonamento para Balão de Bakri (300-500 mL) e B-Lynch.
      * *Pré-Eclâmpsia e Eclâmpsia (FEBRASGO 2024 / ACOG)*: Critérios estritos de gravidade, esquemas Zuspan (IV em BIC) e Pritchard (IM), contraindicação de IM se plaquetas $< 50\text{k}$, vigilância com Gluconato de Cálcio 10% e crise hipertensiva com Hidralazina 5 mg IV / Nifedipino 10-20 mg VO (meta: PAS 140-150 / PAD 90-100).
      * *Restrição de Crescimento Fetal (RCF / CIUR)*: Estadiamento Barcelona/ISUOG (Estádio I: 37s; Estádio II: 34s; Estádio III: 30s; Estádio IV: $\ge 26\text{s}$) e indicações de neuroproteção com MgSO4 e corticoterapia.
    - **Implementação e Entregáveis**:
      1. *Bundle E-MOTIVE e ICO (`src/02_centro_obstetrico.js`)*: Função `avaliarHemorragiaPosParto` com detecção de choque e travas de segurança.
      2. *Pré-Eclâmpsia e Eclâmpsia (`src/02_centro_obstetrico.js`)*: Função `manejarPreEclampsiaGraveEclampsia`.
      3. *Integração com RCF Doppler (`src/02_centro_obstetrico.js`)*: Função `avaliarRcfDopplerCentroObstetrico`.
      4. *Suíte de Testes Cirúrgica (`tests/test_revisao_protocolos_onda5.cjs`)*: Aprovada em 0.062s.
    - **Recibo de Estabilidade**: **57/57 suítes aprovadas com 100% de sucesso em 17.07s** via `npm test`. Checksum master atualizado.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Consolidação Final da Revisão de Protocolos Médicos nos Handlers e Parsers do Telegram (`src/07f_telegram_calculadoras_parser.js`, `src/07b_telegram_preceptor.js`, `tests/test_calculadoras_ux.cjs`)**:
    - **Arquivo/Módulo Alvo**: `src/07f_telegram_calculadoras_parser.js`, `src/07b_telegram_preceptor.js` e `tests/test_calculadoras_ux.cjs`
    - **Função/Componente/Seletor**: Parsers de comandos rápidos beira-leito (`/parkland`, `/cha2ds2va`, `/phoenix`, `/fib4`, `/dengue`, `/hpp`, `/preeclampsia`), conectando-os diretamente às novas funções determinísticas auditadas pelas 5 Ondas Clínicas.
    - **Comportamento Esperado / Critério de Aceite**: Garantir que as chamadas de texto livre e comandos estruturados no Telegram processem os parâmetros novos (ex: Parkland com perfis térmico/pediátrico/elétrico, CHA2DS2-VA unissex, FIB-4 com cortes etários, ICO na HPP e dengue 60 mL/kg), retornando respostas formatadas em Markdown rico com zero falhas.

---

## 📋 Backlog Prioritário: Revisão de Protocolos & Desenvolvimento

1. [ ] **Consolidação Final da Revisão de Protocolos Médicos e Verificação dos Handlers do Telegram** (`src/07f_telegram_calculadoras_parser.js`, `src/07b_telegram_preceptor.js`).
2. [ ] **Aba Rotina — Sincronização Bidirecional Telegram ↔ Cockpit PWA** (`src/07g_telegram_ajuda_e_protocolos.js`, `gh_cockpit_deploy/rotina_timeline.js`).
3. [ ] **Aba Rotina — Pomodoro Integrado no Card de Estudo** (`gh_cockpit_deploy/index.html`, `rotina_timeline.js`).

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Aba Rotina / Integração Wearables)*: Consumo de métricas de sono e prontidão biológica (Apple Health / Garmin) para sugestão automática de "modo descanso" nos blocos da rotina.
- *Sugestão 02 (Aba Rotina / Gamificação & Streaks)*: Contador visual de consistência semanal de blocos cumpridos no topo da aba rotina.
- *Sugestão 03 (Aba Rotina / Modo Plantão 24h)*: Alternância automática de layout para alto contraste noturno com acesso rápido e prioritário a DVA e SRI durante horas de plantão ativo.
- *Sugestão 04 (Aba Rotina / Pomodoro Integrado)*: Timer embutido no card de bloco de estudo com sincronização de conclusão direta no Telegram.
- *Sugestão 05 (Aba Rotina / Notificações Nativas do Calendário)*: Alinhamento das descrições de alertas nativos do Google Calendar com links diretos para condutas da Sala Vermelha.

---
