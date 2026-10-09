# 🚀 Ultra Rotina — Motor de Evolução Perpétua (Kaizen)

### STATUS: EM_EVOLUCAO_CONTINUA

Este projeto opera sob ciclo de melhoria contínua perpétua. O backlog nunca se encerra: ao concluir uma tarefa, o sistema audita o código e adiciona novas oportunidades de alto impacto.

---

## 📋 Backlog de Melhorias Prioritárias (Foco Clínico: SOAP Ambulatorial & Ginecologia e Obstetrícia)

1. [ ] **Módulo SOAP Ambulatorial Ágil (Clínica e Atenção Primária)**:
   - Estruturação otimizada para consulta rápida de consultório/posto:
     * S (Subjetivo): Queixa principal, tempo de evolução, HDA cronológica e medicações em uso habitual.
     * O (Objetivo): Exame físico direcionado por queixa (com valores de normalidade e atalhos rápidos).
     * A (Avaliação): Hipóteses diagnósticas com autocompleção de CID-10 e estratificação de risco (HAS, DM, dislipidemia).
     * P (Plano): Prescrição ambulatorial separada em medicamentos da REMUME/Farmácia Popular com posologia clara (unidades, horários, duração), orientações não medicamentosas de estilo de vida, sinais de alarme claros para procura de PS e prazo de retorno.
   - Exportação limpa de Receita e Atestado Médico em texto puro para colar direto em qualquer prontuário.

2. [ ] **Calculadora e Painel de Pré-Natal (Obstetrícia Ambulatorial)**:
   - Cálculo automático instantâneo de Idade Gestacional (IG) e Data Provável do Parto (DPP):
     * Por DUM (Regra de Naegele: dia + 7, mês - 3 ou + 9).
     * Por 1º Ultrassom (CCN precoce ou DBP/CC/fêmur), com regra de concordância da FEBRASGO para fixar a data definitiva.
     * Cálculo de ganho de peso ideal baseado no IMC pré-gestacional (critérios IOM/Ministério da Saúde).
   - Rastreio de Pré-Natal por Cronologia e IG:
     * 1º Trimestre: Bateria de sorologias (HIV, VDRL, Toxoplasmose, HBsAg), tipagem e Rh com Coombs indireto, urina 1 e urocultura, glicemia de jejum.
     * 2º Trimestre: TOTG 75g (24-28s com pontos de corte 92/180/153), rastreio de pré-eclâmpsia com indicação de AAS 100-150mg + Cálcio se alto risco, vacinação dTpa a partir de 20s.
     * 3º Trimestre: Repetição de sorologias, swab de Streptococcus agalactiae (GBS) na 35-37 semanas.
   - Validador Farmacológico na Gestação & Lactação: Classificação de risco em gravidez com alertas imediatos para drogas proibidas (IECA, BRA, Estatinas, Tetraciclinas, AINEs no 3º tri) e alternativas seguras (Metildopa, Nifedipino, Hidralazina, Paracetamol, Cefalexina).

3. [ ] **Protocolos de Emergência e Centro Obstétrico (Pré-Parto & Sala de Parto)**:
   - Diagnóstico e Monitoramento de Trabalho de Parto: critérios de fase ativa (>=4 cm e 2-3 contrações regulares em 10 min), plano de De Lee e evolução dinâmica.
   - Manejo de Pré-Eclâmpsia com Sinais de Gravidade e Eclâmpsia:
     * Esquema de Sulfato de Magnésio (Zuspan: Ataque 4g IV lento em 20 min + Manutenção 1g/h IV contínua em bomba; ou Pritchard: 4g IV + 10g IM profundo).
     * Vigilância estrita de intoxicação: reflexo patelar presente, FR > 12 rpm e diurese > 25 ml/h. Antídoto pronto: Gluconato de Cálcio 10% 10 ml IV lento.
     * Controle pressórico de resgate para crise hipertensiva (PAS >= 160 ou PAD >= 110): Hidralazina 5mg IV a cada 20 min ou Nifedipino 10-20mg VO.
   - Protocolo de Hemorragia Pós-Parto (HPP - Regra dos 4 Ts):
     * Sequenciamento rápido de uterotônicos: Ocitocina (20-40 UI em 500ml SF a 250ml/h) -> Metilergometrina 0,2mg IM (contraindicado se HAS!) -> Misoprostol 800mcg retal/sublingual -> Ácido Tranexâmico 1g IV precoce em até 3h do parto.
   - Profilaxia para Sepse Neonatal por GBS Intraparto: indicações formais e esquemas (Penicilina Cristalina 5M UI ataque + 2,5M UI a cada 4h até o parto, ou Ampicilina 2g ataque + 1g a cada 4h).
   - Prematuridade e RPMO: Corticoterapia para maturação pulmonar (Betametasona 12mg IM 2 doses a cada 24h) e neuroproteção fetal com Sulfato de Magnésio se <32 semanas.

4. [ ] **Ginecologia Ambulatorial de Consultório**:
   - Rastreio de Câncer de Colo Uterino: Condutas baseadas nas Diretrizes Brasileiras para rastreamento (INCA/MS) por laudo citopatológico (ASC-US, LSIL, ASC-H, HSIL, AGC) e faixa etária.
   - Sangramento Uterino Anormal (SUA): Algoritmo de investigação e mnemônico PALM-COEIN com condutas hormonais de urgência (anticoncepcionais orais combinados, progestagênios, ácido tranexâmico).
   - Critérios de Elegibilidade de Anticoncepção da OMS (Categorias 1 a 4): Filtro rápido por comorbidades (enxaqueca com aura, trombose prévia, HAS não controlada, tabagismo >35a, amamentação pós-parto).

5. [ ] **Auditoria de Toxicidade em Infusões Contínuas de UTI**:
   - Validação e testes determinísticos de limites de taxa de infusão (mcg/kg/min) para aminas vasoativas (Noradrenalina, Vasopressina, Adrenalina, Dobutamina) prevenindo erros por ordem de grandeza e dose letal beira-leito.

6. [ ] **Calculadora de Desmame de Sedação e Rotação de Opioides**:
   - Módulo determinístico de equivalência analgésica para rotação de opioides (Morfina IV/VO, Fentanil, Metadona, Oxicodona) e escala de desmame de sedação contínua (RASS/CAM-ICU).

---

## 🔄 Próxima Tarefa em Andamento
- [ ] **Módulo SOAP Ambulatorial Ágil (Clínica e Atenção Primária)**: Implementar gerador de SOAP focado em consulta rápida ambulatorial com prescrição REMUME e sinais de alarme.

---

## ✅ Histórico de Melhorias Concluídas
- [x] **Auditoria e Testes Clínicos: Cenários Extremos de Dose e Conversão Pediátrica** (2026-10-08):
  * **Tetos de Dose Máxima de Adulto (Safety Ceiling Clamping)**: Testes automatizados rigorosos garantindo que crianças de peso elevado (>30-60 kg) nunca recebam doses supraterapêuticas ou tóxicas. Amoxicilina limitada a 1500 mg/dia (500 mg 8/8h = 10 mL), Amoxicilina+Clavulanato limitada a 1500 mg/dia (dispensa calculada de frascos de 75 mL), Azitromicina limitada a 500 mg/dia (12,5 mL de 40 mg/mL com cálculo de múltiplos frascos), Cefalexina limitada a 2000 mg/dia (10 mL de 6/6h), Prednisolona limitada a 40 mg/dia (13,3 mL de 3 mg/mL), SMX-TMP limitado a 320 mg TMP/dia (20 mL de 12/12h), Dipirona limitada a 500 mg/dose (20 gotas), Paracetamol limitado a 500 mg/dose (50 gotas) e Ibuprofeno limitado a 400 mg/dose (160 gotas).
  * **Limites Inferiores e Proteção Neonatal/Lactente**: Gota mínima de segurança (mínimo de 1 gota para Dipirona e Paracetamol em lactentes <2 kg), volume mínimo seguro (0,5 mL em suspensões) e rejeição estrita para pesos fora da faixa pediátrica (< 1 kg ou > 80 kg).
  * **Restrições Etárias de Bula e Contraindicações Clínicas**: Bloqueio obrigatório de Albendazol e Mebendazol em < 2 anos; bloqueio de Nitazoxanida em < 1 ano e faixas de 1-3a (100 mg), 4-11a (200 mg), >=12a (500 mg); faixas etárias e peso para Loratadina (5 mg se <=30 kg; 10 mg se >30 kg ou >12a) e Dexclorfeniramina (2-6a: 1,25 mL; 6-12a: 2,5 mL; >12a: 5,0 mL).
  * **Cálculo de Frascos para Tratamentos Prolongados**: Cursos de 14 dias para otite complicada (3 frascos de 150 mL de Amoxicilina 90 mg/kg), frascos de 75 mL para Amoxi+Clav (4 frascos), Azitromicina 3 dias vs 5 dias e Cefalexina para 10 dias.
  * **Linguagem Natural e Sinônimos Pediátricos**: Mapeamento inteligente de sinônimos em `src/03_bases_locais.js` (`laringite`, `crupe`, `bva`, `oma`, `itu`, `drge`, `geca`), suporte a separadores decimais (vírgula e ponto) e bloqueio contra prescrição cega em textos com alergia ou negação.
  * **Integração de Testes Automatizados**: Criação de `tests/test_auditoria_pediatrica_extremos.cjs` (27 casos clínicos), runners pytest `tests/test_auditoria_pediatrica_extremos.py`, `tests/test_posologia_deterministica.py` e `tests/test_guia_pediatrico_pedb.py`. Total de testes automatizados subiu para 152 testes no pytest, com 100% de sucesso.
- [x] **Aprimoramento da Interface Cockpit PWA: Cards de Leito & Prescrição Rápida** (2026-10-08):
  * **Painel e Cards de Leitos da Enfermaria (`tab-leitos`)**: Triagem visual com borda de gravidade lateral (`border-l-4`), badges canônicos e censo hospitalar em tempo real (ocupados, instáveis, vigilância, estáveis, alta). Segmented control em grade de 4 chips para alternar status com 1 toque no mobile. Barra de busca instantânea e chips de filtro por gravidade. Ações beira-leito: Copiar SBAR individual, Prescrever direto para o leito, Cálculos/DVA e Evoluir SOAP.
  * **Bandeja de Prescrição Rápida do Plantão (`tab-remume`)**: Construtor beira-leito com persistência local no LocalStorage/IndexedDB. Kits hospitalares de 1 toque (Sintomáticos Básicos, Profilaxia Hospitalar, Hidratação SF 0.9%, Analgesia Forte Tramadol+Dipirona). Copiar Prescrição Hospitalar na ordem canônica de 7 blocos.
  * **Guia REMUME com Categorias Farmacológicas**: Filtro em tempo real por 8 classes clínicas (Antibióticos, Analgesia/AINE, Cardio/HAS, Gastro/IBP, Psico/Sedação, Insulinas/DM, Respiratório). Ações rápidas por item: "Copiar" e "+ Prescrever".
  * **Sincronização de Deploy**: Espelhamento 100% de paridade em `gh_cockpit_deploy/index.html`.
  * **Testes Automatizados**: Novos testes dedicados em `tests/test_cockpit_mini_app.py`. Total de 149/149 testes aprovados (100% de sucesso).
- [x] **Enriquecimento do Guia de Interações Medicamentosas de UTI/Enfermaria** (2026-10-08): 66 novas interações críticas adicionadas (total de 285 regras farmacológicas em RAM). Cobertura estrita para sedação (Propofol, Midazolam, Dexmedetomidina), bloqueadores neuromusculares (Rocurônio, Cisatracúrio), inodilatadores (Milrinona, Levosimendan), DOACs (Apixabana, Dabigatrana), antifúngicos (Voriconazol, Caspofungina), psicotrópicos e antimicrobianos críticos (Ácido Valproico + Meropenem, Clozapina + Ciprofloxacino, Venlafaxina + Linezolida). Integração do runner de teste em `tests/test_interacoes_locais.py`, com 146/146 testes aprovados no pytest (100% de sucesso).
- [x] **Otimização de Latência do Cockpit RPC** (2026-10-08): Compressão gzip (-64.5% payload REMUME), cache singleton do dispatch map, Cache-Control headers inteligentes (30s leitura / no-store escrita). 145/145 testes passando.
- [x] **Correção da Suíte de Testes do Servidor Render** (2026-10-08): Correção e estabilização de `tests/test_server_render.cjs`.
