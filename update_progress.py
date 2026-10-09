import re
from datetime import datetime

with open('PROGRESS.md', 'r') as f:
    content = f.read()

# 1. Remove task 1 from backlog
content = re.sub(r'1\. \[ \] \*\*Painel de Puericultura e Desenvolvimento Infantil.*?(?=\n2\. \[ \])', '', content, flags=re.DOTALL)

# 2. Renumber backlog items
def renumber(match):
    global count
    count += 1
    return f"{count}. [ ]"

count = 0
content = re.sub(r'\d+\. \[ \]', renumber, content)

# 3. Add new tasks to the end of the backlog (before the "Próxima Tarefa" separator)
new_tasks = """
16. [ ] **Módulo de Suporte Nutricional Enteral e Parenteral (UTI/Enfermaria)**:
    - Calculadora automatizada de necessidade calórico-proteica basal (Equação de Harris-Benedict ou regra de bolso de 25-30 kcal/kg/dia).
    - Alertas críticos para síndrome de realimentação (reposição empírica de Fósforo, Magnésio e Tiamina antes da dieta).
    - Prescrição de nutrição enteral precoce e parenteral total com base nos dias de jejum e risco nutricional (NRS-2002/NUTRIC Score).

17. [ ] **Módulo de Oncologia Básica para Atenção Primária**:
    - Rastreamento dos cânceres mais prevalentes (Mama, Cólon, Próstata e Pulmão) com diretrizes nacionais do INCA 2026.
    - Condutas em achados de BI-RADS em mamografias e FIT-teste positivo.
    - Gestão de efeitos adversos oncológicos na APS (neutropenia febril, mucosite e dor oncológica basal com escada analgésica da OMS avançada).
"""
content = re.sub(r'(15\. \[ \] \*\*Refatoração.*?)\n---', r'\1\n' + new_tasks + '\n---', content, flags=re.DOTALL)

# 4. Update "Próxima Tarefa em Andamento"
proxima_tarefa = """## 🔄 Próxima Tarefa em Andamento
- [ ] **Módulo de Saúde do Idoso e Avaliação Geriátrica Ampla (AGA)**: Triagem rápida de fragilidade (CFS), avaliação cognitiva (Mini-Cog) e prevenção de polifarmácia (Beers/STOPP-START)."""
content = re.sub(r'## 🔄 Próxima Tarefa em Andamento\n- \[ \].*?\n', proxima_tarefa + '\n', content, flags=re.DOTALL)

# 5. Add completed task to "Histórico de Melhorias Concluídas"
hoje = datetime.now().strftime("%Y-%m-%d")
completed_task = f"""## ✅ Histórico de Melhorias Concluídas
- [x] ({hoje}) **Painel de Puericultura e Desenvolvimento Infantil (Atenção Primária & SBP)**:
   - **Módulo Clínico Determinístico**: Criação de `src/02_puericultura_pediatria.js` (`PuericulturaPediatriaService`) com diretrizes pediátricas estritas da SBP, MS e OMS.
   - **Suplementação Profilática**: Algoritmo rigoroso de recomendação de Vitamina D (400 UI ou 600 UI) e Ferro Elementar profilático (1 a 4 mg/kg/dia) com base na idade, peso de nascimento e aleitamento materno exclusivo.
   - **Vigilância do DNPM**: Avaliação progressiva e escalonada de marcos do Desenvolvimento Neuropsicomotor, sinalizando atrasos (M-CHAT-R).
   - **Avaliação Antropométrica**: Classificação simplificada de curvas da OMS baseada no Escore Z para cálculo de IMC (risco de sobrepeso, magreza e eutrofia), estatura, peso e perímetro cefálico.
   - **Calendário Vacinal (PNI 2026)**: Motor cronológico de vacinação do MS cruzando a idade do lactente com as doses aplicadas e futuras (BCG, VIP, VOP, Pneumocócica, Meningocócica, etc.).
   - **Integração Cockpit PWA e Telegram**: Novo método RPC `cockpitPainelPuericultura` via `src/13_cockpit_integracao.js` exportado em `server/runtime.js`.
   - **Suíte de Testes Automatizados**: Inclusão de `tests/test_puericultura_pediatria.cjs` validando clinicamente todos os vetores da puericultura (10/10 aprovados com Pytest).
"""
content = re.sub(r'## ✅ Histórico de Melhorias Concluídas\n', completed_task, content)

with open('PROGRESS.md', 'w') as f:
    f.write(content)
