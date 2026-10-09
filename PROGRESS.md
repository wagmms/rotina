# 🚀 Ultra Rotina — Motor de Evolução Perpétua (Kaizen)

### STATUS: EM_EVOLUCAO_CONTINUA

Este projeto opera sob ciclo de melhoria contínua perpétua. O backlog nunca se encerra: ao concluir uma tarefa, o sistema audita o código e adiciona novas oportunidades de alto impacto.

---

## 📋 Backlog de Melhorias Prioritárias

1. [ ] **Enriquecimento do Guia de Interações Medicamentosas**: Expandir validações cruzadas para associações farmacológicas críticas de UTI/Enfermaria.
2. [ ] **Aprimoramento da Interface Cockpit PWA**: Melhorar responsividade de cards de leitos e atalhos rápidos para prescrições no celular.
3. [ ] **Auditoria e Testes Clínicos**: Expandir a suíte de testes em `tests/` para cobrir cenários extremos de dose e conversão pediátrica.
4. [ ] **Resiliência do Webhook Telegram**: Monitoramento de retries e telemetria de respostas de áudio/voz.
5. [ ] **Serialização Rápida com JSON Schema no Cockpit RPC**: Implementar `response` schema no endpoint `/api/cockpit` do Fastify para serialização ~2x mais rápida que `JSON.stringify` nativo, aproveitando `fast-json-stringify`.
6. [ ] **Benchmark Automatizado de Latência End-to-End do Cockpit**: Criar teste de micro-benchmark que dispara 100 chamadas RPC sequenciais e reporta p50/p95/p99 de latência, incluindo overhead de compressão gzip.
7. [ ] **ETag + 304 Not Modified para Endpoints de Leitura do Cockpit**: Implementar ETag baseado em hash dos dados clínicos (REMUME, leitos) para permitir respostas 304 quando o cliente já tem os dados mais recentes — economia de banda e latência zero para dados inalterados.

---

## 🔄 Tarefa em Andamento
- Nenhuma (pronto para o próximo ciclo).

---

## ✅ Histórico de Melhorias Concluídas
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip (-64.5% payload REMUME), cache singleton do dispatch map, Cache-Control headers inteligentes (30s leitura / no-store escrita). 145/145 testes passando.
- [x] Correção da suíte de testes do servidor Render (`tests/test_server_render.cjs`), garantindo 145/145 testes passando com sucesso.
