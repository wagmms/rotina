# 🚀 Ultra Rotina — Motor de Evolução Perpétua (Kaizen)

### STATUS: EM_EVOLUCAO_CONTINUA

Este projeto opera sob ciclo de melhoria contínua perpétua. O backlog nunca se encerra: ao concluir uma tarefa, o sistema audita o código e adiciona novas oportunidades de alto impacto.

---

## 📋 Backlog de Melhorias Prioritárias

1. [ ] **Aprimoramento da Interface Cockpit PWA**: Melhorar responsividade de cards de leitos e atalhos rápidos para prescrições no celular.
2. [ ] **Auditoria e Testes Clínicos**: Expandir a suíte de testes em `tests/` para cobrir cenários extremos de dose e conversão pediátrica.
3. [ ] **Resiliência do Webhook Telegram**: Monitoramento de retries e telemetria de respostas de áudio/voz.
4. [ ] **Serialização Rápida com JSON Schema no Cockpit RPC**: Implementar `response` schema no endpoint `/api/cockpit` do Fastify para serialização ~2x mais rápida que `JSON.stringify` nativo, aproveitando `fast-json-stringify`.
5. [ ] **Benchmark Automatizado de Latência End-to-End do Cockpit**: Criar teste de micro-benchmark que dispara 100 chamadas RPC sequenciais e reporta p50/p95/p99 de latência, incluindo overhead de compressão gzip.
6. [ ] **ETag + 304 Not Modified para Endpoints de Leitura do Cockpit**: Implementar ETag baseado em hash dos dados clínicos (REMUME, leitos) para permitir respostas 304 quando o cliente já tem os dados mais recentes — economia de banda e latência zero para dados inalterados.
7. [ ] **Índice Invertido em Memória para Busca de Interações**: Otimizar a busca de interações em `src/04_motores_ia.js` com tokenização e indexação de pares em RAM para pesquisa O(1) sem iteração linear nas 285 regras.
8. [ ] **Alerta Visual de Interações Farmacológicas no Cockpit PWA**: Exibir badge e modal de alerta imediato (contraindicações em vermelho, interações graves em amarelo) ao prescrever medicamentos concomitantes na enfermaria/UTI.
9. [ ] **Matriz de Compatibilidade Físico-Química em Y para Sala Vermelha**: Estruturar base determinística de compatibilidade de infusão contínua em Y para aminas vasoativas, sedativos e eletrólitos concentrados.

---

## 🔄 Próxima Tarefa em Andamento
- [ ] **Aprimoramento da Interface Cockpit PWA**: Melhorar responsividade de cards de leitos e atalhos rápidos para prescrições no celular.

---

## ✅ Histórico de Melhorias Concluídas
- [x] **Enriquecimento do Guia de Interações Medicamentosas de UTI/Enfermaria** (2026-10-08): 66 novas interações críticas adicionadas (total de 285 regras farmacológicas em RAM). Cobertura estrita para sedação (Propofol, Midazolam, Dexmedetomidina), bloqueadores neuromusculares (Rocurônio, Cisatracúrio), inodilatadores (Milrinona, Levosimendan), DOACs (Apixabana, Dabigatrana), antifúngicos (Voriconazol, Caspofungina), psicotrópicos e antimicrobianos críticos (Ácido Valproico + Meropenem, Clozapina + Ciprofloxacino, Venlafaxina + Linezolida). Integração do runner de teste em `tests/test_interacoes_locais.py`, com 146/146 testes aprovados no pytest (100% de sucesso).
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip (-64.5% payload REMUME), cache singleton do dispatch map, Cache-Control headers inteligentes (30s leitura / no-store escrita). 145/145 testes passando.
- [x] **Correção da Suíte de Testes do Servidor Render** (2026-10-08): Correção e estabilização de `tests/test_server_render.cjs`.
