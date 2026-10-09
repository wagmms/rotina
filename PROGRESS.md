# 🚀 Ultra Rotina — Motor de Evolução Perpétua (Kaizen)

### STATUS: EM_EVOLUCAO_CONTINUA

Este projeto opera sob ciclo de melhoria contínua perpétua. O backlog nunca se encerra: ao concluir uma tarefa, o sistema audita o código e adiciona novas oportunidades de alto impacto.

---

## 📋 Backlog de Melhorias Prioritárias

1. [ ] **Auditoria e Testes Clínicos**: Expandir a suíte de testes em `tests/` para cobrir cenários extremos de dose e conversão pediátrica.
2. [ ] **Resiliência do Webhook Telegram**: Monitoramento de retries e telemetria de respostas de áudio/voz.
3. [ ] **Serialização Rápida com JSON Schema no Cockpit RPC**: Implementar `response` schema no endpoint `/api/cockpit` do Fastify para serialização ~2x mais rápida que `JSON.stringify` nativo, aproveitando `fast-json-stringify`.
4. [ ] **Benchmark Automatizado de Latência End-to-End do Cockpit**: Criar teste de micro-benchmark que dispara 100 chamadas RPC sequenciais e reporta p50/p95/p99 de latência, incluindo overhead de compressão gzip.
5. [ ] **ETag + 304 Not Modified para Endpoints de Leitura do Cockpit**: Implementar ETag baseado em hash dos dados clínicos (REMUME, leitos) para permitir respostas 304 quando o cliente já tem os dados mais recentes — economia de banda e latência zero para dados inalterados.
6. [ ] **Índice Invertido em Memória para Busca de Interações**: Otimizar a busca de interações em `src/04_motores_ia.js` com tokenização e indexação de pares em RAM para pesquisa O(1) sem iteração linear nas 285 regras.
7. [ ] **Alerta Visual de Interações Farmacológicas no Cockpit PWA**: Exibir badge e modal de alerta imediato (contraindicações em vermelho, interações graves em amarelo) ao prescrever medicamentos concomitantes na enfermaria/UTI.
8. [ ] **Matriz de Compatibilidade Físico-Química em Y para Sala Vermelha**: Estruturar base determinística de compatibilidade de infusão contínua em Y para aminas vasoativas, sedativos e eletrólitos concentrados.
9. [ ] **Histórico Offline de Prescrições e SBAR por Leito**: Armazenar no IndexedDB (Dexie) o log histórico de passagens de plantão e prescrições emitidas por leito com visualização em linha do tempo beira-leito.
10. [ ] **Calculadora Pediátrica de Holliday-Segar & Hidratação Venosa**: Implementar na aba de calculadoras módulo determinístico de expansão volêmica e manutenção hidroeletrolítica por peso com taxa hídrica e eletrólitos (Na+/K+).
11. [ ] **Autocompleção de CID-10 e Diagnósticos Clínicos no SOAP**: Índice em RAM para busca rápida de hipóteses diagnósticas e códigos CID-10 no preenchimento do campo A (Avaliação) do prontuário móvel.

---

## 🔄 Próxima Tarefa em Andamento
- [ ] **Auditoria e Testes Clínicos**: Expandir a suíte de testes em `tests/` para cobrir cenários extremos de dose e conversão pediátrica.

---

## ✅ Histórico de Melhorias Concluídas
- [x] **Aprimoramento da Interface Cockpit PWA: Cards de Leito & Prescrição Rápida** (2026-10-08):
  * **Painel e Cards de Leitos da Enfermaria (`tab-leitos`)**: Triagem visual com borda de gravidade lateral (`border-l-4`), badges canônicos e censo hospitalar em tempo real (ocupados, instáveis, vigilância, estáveis, alta). Segmented control em grade de 4 chips para alternar status com 1 toque no mobile. Barra de busca instantânea e chips de filtro por gravidade. Ações beira-leito: Copiar SBAR individual, Prescrever direto para o leito, Cálculos/DVA e Evoluir SOAP.
  * **Bandeja de Prescrição Rápida do Plantão (`tab-remume`)**: Construtor beira-leito com persistência local no LocalStorage/IndexedDB. Kits hospitalares de 1 toque (Sintomáticos Básicos, Profilaxia Hospitalar, Hidratação SF 0.9%, Analgesia Forte Tramadol+Dipirona). Copiar Prescrição Hospitalar na ordem canônica de 7 blocos.
  * **Guia REMUME com Categorias Farmacológicas**: Filtro em tempo real por 8 classes clínicas (Antibióticos, Analgesia/AINE, Cardio/HAS, Gastro/IBP, Psico/Sedação, Insulinas/DM, Respiratório). Ações rápidas por item: "Copiar" e "+ Prescrever".
  * **Sincronização de Deploy**: Espelhamento 100% de paridade em `gh_cockpit_deploy/index.html`.
  * **Testes Automatizados**: Novos testes dedicados em `tests/test_cockpit_mini_app.py`. Total de 149/149 testes aprovados (100% de sucesso).
- [x] **Enriquecimento do Guia de Interações Medicamentosas de UTI/Enfermaria** (2026-10-08): 66 novas interações críticas adicionadas (total de 285 regras farmacológicas em RAM). Cobertura estrita para sedação (Propofol, Midazolam, Dexmedetomidina), bloqueadores neuromusculares (Rocurônio, Cisatracúrio), inodilatadores (Milrinona, Levosimendan), DOACs (Apixabana, Dabigatrana), antifúngicos (Voriconazol, Caspofungina), psicotrópicos e antimicrobianos críticos (Ácido Valproico + Meropenem, Clozapina + Ciprofloxacino, Venlafaxina + Linezolida). Integração do runner de teste em `tests/test_interacoes_locais.py`, com 146/146 testes aprovados no pytest (100% de sucesso).
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip (-64.5% payload REMUME), cache singleton do dispatch map, Cache-Control headers inteligentes (30s leitura / no-store escrita). 145/145 testes passando.
- [x] **Correção da Suíte de Testes do Servidor Render** (2026-10-08): Correção e estabilização de `tests/test_server_render.cjs`.
