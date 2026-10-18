#!/usr/bin/env bash
# ==============================================================================
# PIPELINE HÍBRIDO: TESTADOR PRIME 2.0 + AUDITORIA COGNITIVA GEMINI 4 ARGON
# ==============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPORT_PATH="data/resultado_prime_2_0.json"

echo "=================================================================="
echo "🚀 [FASE 1/2] Executando Suíte Determinística: Testador Prime 2.0"
echo "=================================================================="

bash scripts/testador_prime.sh "$@"
PRIME_EXIT_CODE=$?

if [[ ! -f "$REPORT_PATH" ]]; then
  echo "❌ Erro crítico: Relatório $REPORT_PATH não foi gerado pelo Testador Prime."
  exit 1
fi

echo ""
echo "=================================================================="
echo "🧠 [FASE 2/2] Invocando Auditoria Cognitiva: Gemini 4 Argon"
echo "=================================================================="

if ! command -v argon >/dev/null 2>&1; then
  echo "⚠️ Binário 'argon' não encontrado no PATH. Exibindo apenas resultado determinístico."
  exit $PRIME_EXIT_CODE
fi

PROMPT_ARGON=$(cat << 'EOF'
Você é o Gemini 4 Argon, Arquiteto Chefe e Auditor Clínico do projeto Rotina.
Analise o relatório JSON gerado pelo Testador Prime 2.0 anexado.

Execute a seguinte auditoria estruturada:
1. **Veredito Clínico e Segurança do Paciente**: Avalie se há qualquer falha em doses, fluxos de emergência (CO/GO/Pediatria/APS), rotas quebradas ou callbacks órfãos.
2. **Triagem de Ergonomia e UX (Filtro de Falsos Positivos)**: Analise os alertas de UX/UI (botões do Telegram, inputs do Cockpit Móvel, densidade de tela) distinguindo problemas reais de usabilidade sob estresse de plantão de falsos positivos estáticos.
3. **Plano de Ação Cirúrgico**: Se houver falhas reais restantes, forneça o patch exato (arquivo, linha e código) para correção imediata. Se o score for 100% limpo, emita a Certificação de Produção.
EOF
)

argon -f "$REPORT_PATH" "$PROMPT_ARGON"
ARGON_EXIT_CODE=$?

if [[ $PRIME_EXIT_CODE -ne 0 || $ARGON_EXIT_CODE -ne 0 ]]; then
  exit 1
fi

exit 0
