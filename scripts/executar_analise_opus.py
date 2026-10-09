#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

ROUTINA_DIR = Path("/home/wagmoraes/Projetos IA/Rotina")

# Carrega os documentos base
inventario_path = ROUTINA_DIR / "docs" / "INVENTARIO_CLINICO_GERAL.md"
mapa_path = ROUTINA_DIR / "docs" / "MAPA_ESTRUTURAL_E_FLUXOGRAMA_BOT.md"
progress_path = ROUTINA_DIR / "PROGRESS.md"

inventario_txt = inventario_path.read_text(encoding="utf-8") if inventario_path.exists() else ""
mapa_txt = mapa_path.read_text(encoding="utf-8") if mapa_path.exists() else ""

top_progress = ""
if progress_path.exists():
    linhas = progress_path.read_text(encoding="utf-8").splitlines()[:60]
    top_progress = "\n".join(linhas)

prompt = f"""Você é o Claude Opus 5.5 atuando como Médico Auditor Chefe, Arquiteto de Software e Especialista em Informática em Saúde.
O projeto é o **Ultra Rotina 2.5** (Assistente Clínico Beira-Leito & Cockpit PWA para Alunos de Internato e Médicos Generalistas no Brasil).

O usuário solicitou:
"Procure um modelo que tenha o OPUS 5.5 e faça uma análise mais aprofundada do que você acabou de fazer, uma que olhe para o programa como um todo e dê sugestões. Crie um artefato com as sugestões detalhadas, será o gemini o executor."

Aqui está o estado atual do sistema, seu inventário e o mapa estrutural recentemente levantado:

--- CONTEXTO DO INVENTÁRIO CLÍNICO GERAL ---
{inventario_txt}

--- CONTEXTO DO MAPA ESTRUTURAL E FLUXOGRAMA ---
{mapa_txt}

--- CONTEXTO DE DIRETIVAS DO USUÁRIO ---
{top_progress}

--- SUA MISSÃO ANALÍTICA (OPUS 5.5) ---
Faça uma análise aprofundada, crítica, rigorosa e holística de TODO o sistema Ultra Rotina, contemplando:

1. **Visão Holística e Avaliação da Arquitetura Geral**:
   - Como o sistema se comporta entre Telegram Bot (beira-leito móvel) e Cockpit PWA (offline-first em hospital sem sinal).
   - Equilíbrio entre motores determinísticos (RAM < 15ms) e inteligência artificial contextual.

2. **Auditoria de Ergonomia e Usabilidade Beira-Leito (Cognitive Load do Médico)**:
   - Análise da densidade de comandos (ainda temos 97 comandos de barra ativos!). Isso é viável para quem está na emergência ou na UBS com fila de pacientes?
   - Onde o uso de botões inline interativos (estilo `/ef`) e linguagem natural deve substituir comandos digitados.

3. **Diagnóstico Rigoroso de Excessos (O que ainda sobra e deve ser enxugado/consolidado)**:
   - Excesso em categorias como Rotina/Produtividade (9 comandos), Enfermaria (8 comandos), Governança/RBAC (5 comandos).
   - Quais comandos são redundantes e devem ser fundidos imediatamente em painéis unificados com botões de 1 toque.

4. **Diagnóstico Epidemiológico de Lacunas (O que REALMENTE falta para o Médico Generalista e Interno no Brasil)**:
   - Doenças de altíssima prevalência e impacto na Atenção Primária (UBS) e na Porta de Emergência (UPA/PS):
     * Arboviroses / Dengue (estadiamento A, B, C, D e reposição volêmica guiada).
     * Infecções Comunitárias de Porta: PAC (CURB-65) e ITU (cistite vs pielonefrite).
     * Crise Hipertensiva vs Pseudocrise (evitar iatrogenia de anti-hipertensivo IV na dor/ansiedade).
     * Cefaleias Agudas (SNOOP / bandeiras vermelhas de HSA e meningite).
     * Trauma leve e pequenas cirurgias (Regras de Ottawa, fios de sutura, Lidocaína com e sem vasoconstritor, profilaxia de tétano/raiva).
     * Declaração de Óbito (DO) e Notificações Compulsórias (SINAN).

5. **Plano Diretor de Ação Detalhado para o Gemini (O Executor)**:
   - Estruture um roteiro técnico passo a passo, cirúrgico e priorizado (Fase 1: Saneamento Imediato de Excessos; Fase 2: Implementação dos Protocolos de Porta Faltantes; Fase 3: Lapidação UI/UX no Cockpit PWA).
   - Forneça diretrizes técnicas exatas para que o Gemini (modelo executor) possa implementar cada item sem dúvidas ou retrabalho.

Seja extremamente analítico, profissional, detalhado e prático. Use formatação Markdown rica e estruturada.
"""

print("Disparando análise profunda com Claude Opus 4.6 (Thinking)...")
res = subprocess.run(
    ["agy", "--dangerously-skip-permissions", "--model", "claude-opus-4-6-thinking", "-p", prompt],
    capture_output=True,
    text=True,
    check=False
)

if res.returncode != 0:
    print(f"Erro ao executar agy: {res.stderr}")
    sys.exit(1)

saida = res.stdout.strip()
print("Análise concluída com sucesso! Salvando arquivo...")

# Salva a análise no repositório
output_file = ROUTINA_DIR / "docs" / "PLANO_DIRETOR_ANALISE_OPUS.md"
output_file.write_text(saida, encoding="utf-8")
print(f"Salvo em: {output_file}")

# Salva no diretório de artefatos
artifact_file = Path("/home/estudos/.gemini/antigravity-cli/brain/5f4f79bd-5b5c-420c-8637-3e8a8fc327c1/plano_diretor_analise_opus.md")
artifact_file.write_text(saida, encoding="utf-8")
print(f"Artefato salvo em: {artifact_file}")

