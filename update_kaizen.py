import re
from datetime import datetime

with open('PROGRESS.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Marcar a tarefa 18 como [x] (já está 18. [ ] no arquivo)
content = re.sub(
    r'18\. \[ \] \*\*Módulo de Endocrinologia e Diabetes Mellitus Avançado \(SBD/ADA\)\*\*',
    r'18. [x] **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**',
    content
)

# 2. Atualizar "Próxima Tarefa em Andamento" para a 19
content = re.sub(
    r'## 🔄 Próxima Tarefa em Andamento\n- \[ \] \*\*Módulo de Endocrinologia e Diabetes Mellitus Avançado \(SBD/ADA\)\*\*',
    r'## 🔄 Próxima Tarefa em Andamento\n- [ ] **Suporte Avançado de Vida Pediátrico (PALS / Reanimação Pediátrica)**',
    content
)

# 3. Adicionar tarefa(s) nova(s) no final do Backlog
# Procurar o último número no Backlog (atualmente é 64).
# Inserir as novas tarefas 65 e 66 antes do "## 🔄 Próxima Tarefa em Andamento"
new_tasks = """
65. [ ] **Módulo de Nefrologia: Manejo Conservador da Doença Renal Crônica (DRC)**:
    - Estadiamento determinístico KDIGO e acompanhamento de albuminúria.
    - Metas pressóricas e indicação de iECA/BRA para nefroproteção.
    - Alerta estruturado para restrição proteica e evitar AINEs.

66. [ ] **Cardiologia: Manejo de Hipertensão Arterial Resistente e Secundária**:
    - Algoritmo de identificação e manejo de HAS resistente (falha com 3 drogas em doses otimizadas incluindo diurético).
    - Rastreio de causas secundárias (hiperaldosteronismo primário, feocromocitoma, estenose de artéria renal).
"""
content = re.sub(
    r'(64\. \[ \].*?)\n\n## 🔄 Próxima Tarefa em Andamento',
    r'\1\n' + new_tasks + '\n## 🔄 Próxima Tarefa em Andamento',
    content,
    flags=re.DOTALL
)

# 4. Adicionar a entrada concluída no histórico
hoje = datetime.now().strftime("%Y-%m-%d")
completed_entry = f"""## ✅ Histórico de Melhorias Concluídas
- [x] ({hoje}) **Módulo de Endocrinologia e Diabetes Mellitus Avançado (SBD/ADA)**:
   - Calculadora determinística de dose de insulina basal e bolus prandial para uso ambulatorial (regras 1800/500).
   - Protocolo automatizado e estruturado de correção de hiperglicemia hospitalar para enfermarias (alvos SBD/ADA).
   - Manejo guiado de Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH) com reposição de fluidos, potássio, insulina IV e bicarbonato restritivo.
   - Integração completa via malha Fastify RPC (`cockpitEndocrinologiaDiabetes`) para uso fluído.
   - Suíte determinística em `test_endocrinologia_diabetes.cjs` aprovada com 100% de sucesso.
"""
content = re.sub(r'## ✅ Histórico de Melhorias Concluídas\n', completed_entry, content)

with open('PROGRESS.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("Kaizen update applied to PROGRESS.md")
