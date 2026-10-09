const fs = require('fs');

let content = fs.readFileSync('PROGRESS.md', 'utf8');

// The block to remove from backlog
const dipTextOriginal = `12. [ ] **Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT Ministério da Saúde / CDC)**:
    - Critérios Diagnósticos Escalonados: 3 Critérios Maiores (Dor à palpação do hipogástrio/baixo ventre, dor à palpação anexial uni ou bilateral, dor à mobilização do colo uterino) associados a pelo menos 1 Critério Menor (Febre >= 38,3°C, leucocitose, VHS/PCR elevados, corrimento endocervical anormal purulento, isolamento de *Chlamydia trachomatis* ou *Neisseria gonorrhoeae*).
    - Critérios Elaborados de Gravidade: Biópsia com endometrite, USG pélvico evidenciando espessamento tubário/abscesso tubo-ovariano ou laparoscopia com peritonite pélvica.
    - Manejo Ambulatorial vs Hospitalar: Critérios formais de internação imediata (gestação, ausência de resposta oral após 72h, intolerância oral, abscesso tubo-ovariano, peritonite difusa ou impossibilidade de excluir emergência cirúrgica como apendicite).
    - Esquemas Antimicrobianos Oficiais REMUME/MS: Tratamento ambulatorial (Ceftriaxona 500mg IM dose única + Doxiciclina 100mg VO 12/12h por 14 dias + Metronidazol 500mg VO 12/12h por 14 dias) e tratamento hospitalar IV (Ceftriaxona 1g IV + Doxiciclina 100mg VO + Metronidazol 400mg IV ou Clindamicina + Gentamicina). Tratamento e testagem mandatórios de todos os parceiros sexuais dos últimos 60 dias.`;

// Replace it in backlog (just remove it)
content = content.replace(dipTextOriginal, '');

// Update task in progress
const oldProgress = `- [ ] **Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT Ministério da Saúde / CDC)**`;
const newProgress = `- [ ] **Integração de IA Generativa Local (Llama 3 / Mistral) para Alta Disponibilidade Offline**`;
content = content.replace(oldProgress, newProgress);

// Add to Historico
const dateStr = new Date().toISOString().split('T')[0];
const historyText = `- [x] (${dateStr}) **Doença Inflamatória Pélvica (DIP) e Abscesso Tubo-Ovariano (PCDT MS / CDC)**:
   - Implementação de motor determinístico com estadiamento clínico de Monif (Estágios I a IV) e critérios diagnósticos de Hager/PCDT (3 maiores + 1 menor).
   - Auditoria de critérios absolutos de internação (gestação, falha ambulatorial em 72h, abscesso >= 8cm, peritonite difusa).
   - Manejo seguro do DIU: manutenção inicial em casos não complicados e remoção obrigatória após cobertura antibiótica em falha de tratamento (72h) ou abscesso tubo-ovariano.
   - Posologia ambulatorial e hospitalar ponderada por peso e ajustada para função renal (ClCr < 50 mL/min).
   - Protocolo estrito de convocação, rastreamento e tratamento empírico obrigatório de todos os parceiros sexuais dos últimos 60 dias.
   - Integração Fastify RPC completa e suíte de testes (15 cenários) cobrindo todas as variantes de DIP e ATO.
`;

const historyMarker = '## ✅ Histórico de Melhorias Concluídas';
content = content.replace(historyMarker, historyMarker + '\n' + historyText);

// Append 2 new tasks at the end of the backlog. 
// Before the end of backlog (before the '---' that precedes 'Próxima Tarefa em Andamento')
// Wait, the easiest way is to append right before '--- \n\n## 🔄 Próxima Tarefa'

const appendText = `
46. [ ] **Cardiologia - Rastreio e Manejo de Insuficiência Cardíaca Crônica (Diretrizes SBC/ESC)**:
    - Motor determinístico para diagnóstico (Critérios de Framingham).
    - Classificação funcional da NYHA e estadiamento ACC/AHA (A a D).
    - Prescrição sequencial escalonada do Quarteto Fantástico (iSGLT2, ARNI/IECA, Beta-bloqueador e ARM) com checagem rigorosa de contraindicações (ex: bloqueio de espironolactona e sacubitril/valsartana em hipercalemia ou piora de ClCr).

47. [ ] **Oftalmologia e Emergência - Rastreio e Conduta Inicial no Trauma Ocular e Glaucoma Agudo**:
    - Algoritmo de triagem visual (Tabela de Snellen) no Pronto Atendimento.
    - Conduta de urgência em glaucoma de ângulo fechado (Acetazolamida sistêmica, Timolol e Pilocarpina após alívio pressórico).
    - Escalonamento de queimaduras químicas oculares (irrigação profusa com ringer lactato IMEDIATA).
`;

content = content.replace('## 🔄 Próxima Tarefa', appendText + '\n\n## 🔄 Próxima Tarefa');

fs.writeFileSync('PROGRESS.md', content);
console.log('PROGRESS.md atualizado com sucesso.');
