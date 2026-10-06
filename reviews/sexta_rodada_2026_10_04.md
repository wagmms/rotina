# Sexta rodada — revisão das correções V01–V05

**Parecer: as correções passaram nos cinco exemplos anteriores, mas quatro causas de falha permanecem demonstráveis.** Reproduzi seis cenários nos mesmos requisitos auditados: suficiência/negação de fatores CHA, coerência da gasometria, completude da receita e ausência de fallback de cálculos para IA.

## Versão e evidências

Snapshot: [master_auditado.js](</home/wagmoraes/Projetos IA/Rotina/reviews/sexta_rodada_2026_10_04/master_auditado.js>).

SHA-256: `fda46b80e19fdcab86df3e77d9939c968119c3cc46df927e6a37a777fe11e1b8`.

| Verificação | Resultado |
|---|---|
| Sintaxe e consistência do corpo com build temporário | Aprovadas |
| Contraprova da quinta rodada | **5/5 passaram** |
| Contraprova da quarta rodada | **11/11 passaram** |
| Contraprova da terceira rodada | **15/15 passaram** |
| Suíte inicial | **37/37 passaram** |
| pytest, incluindo build em cópia temporária | **101/101 passaram**, 4,51 s |
| Harness da quinta rodada | Nenhum dos cinco defeitos completos reproduzido com as entradas anteriores |
| Verificação adicional desta rodada | **6/6 cenários residuais reproduzidos** |

Foram usados dados sintéticos e mocks, sem chamadas reais a serviços. Os fontes de produção e testes anteriores foram preservados. Build e testes Python ocorreram em cópia temporária. O workspace permaneceu idêntico ao snapshot durante a conferência. Não houve deploy nem verificação da configuração remota.

O harness anterior retorna exit code 1 porque suas asserções de presença de defeito deixaram de passar. Isso é esperado. A aprovação da contraprova confirma o comportamento nas entradas escolhidas, não as garantias gerais do walkthrough.

## Correções aceitas no escopo testado

- “Antecedentes desconhecidos” agora interrompe o CHA; o exemplo anterior com “mas HAS” pontua 1/9.
- O literal `pH 6.00` do exemplo anterior é substituído pelo valor da amostra.
- “1. Revisar exames.” não recebe mais PDF; a receita completa usada na contraprova recebe.
- Clearance com Cr zero agora devolve erro determinístico.
- Existe um bloqueio adicional de fallback para nomes de calculadora que constam de `ehCalculadoraReconhecida`.

Esses avanços são confirmados. A última garantia depende da completude do cadastro, e as demais ainda não satisfazem todos os estados possíveis dos dados.

## Achados prioritários

### [P0] CHA continua presumindo ausência e transforma negativas após “mas” em positivas — W01/W02

**Módulo 07; snapshot linhas 6140 e 6177, `temMencaoFatores` e tratamento pós-adversativo.**

**W01:** `CHA2DS2-VASc homem 60 anos sem HAS` gera **0/9** e recomendação de não anticoagular. IC, DM, AVC/AIT e doença vascular não foram informados. Detectar expressões específicas de desconhecimento não substitui a representação de campos desconhecidos: ausência de menção continua sendo convertida em false.

**W02:** `CHA2DS2-VASc homem 60 anos HAS, mas sem DM, sem IC, sem AVC, sem doença vascular` gera **6/9** e recomendação forte, apesar de apenas HAS estar afirmada. A nova lógica procura qualquer menção ao fator em `textoAdversativo`, atribui `*Adv=true` e faz esse resultado prevalecer sobre a negação. O trecho “mas sem” é tratado como afirmativo.

**Correção estrutural:** extrair cada fator com estado presente/ausente/desconhecido e respectiva evidência textual. Aplicar negação dentro de cada oração, inclusive depois de adversativas. Conflito ou campo obrigatório ausente deve pedir confirmação. Um formulário de fatores explícitos oferece um caminho controlável para este escore crítico.

**Aceitação:** fornecer apenas um dos cinco fatores não encerra o escore; “mas sem DM” nunca produz DM=true; “mas HAS” pode produzir HAS=true sem alterar as negativas dos demais fatores. Verificar o objeto extraído e o resultado final.

### [P1] A substituição numérica da gasometria deixa contradições e altera alvos — W03/W04

**Módulo 04; `gerarAnaliseGasometriaComIA`, snapshot linha 3713.**

Com amostra `pH 7.40 pCO2 40 HCO3 24`:

- **W03:** a resposta simulada `O pH é 6.00` permanece no texto final junto ao pH real 7.40. A regex aceita apenas número imediatamente após pH, espaços e pontuação opcional.
- **W04:** `Alvo ventilatório: pCO2 35 mmHg.` é reescrito como `Alvo ventilatório: pCO2 conforme amostra (40 mmHg) mmHg.`. O filtro troca um objetivo descrito pela IA pelo valor medido. Este teste não avalia se o alvo de 35 seria clinicamente adequado; demonstra alteração arbitrária do significado da frase.

A função não distingue medição, hipótese, alvo, limiar e comparação. Logo, substituir todo número após o nome da grandeza não garante coerência clínica e pode introduzir informação diferente da recebida.

**Correção estrutural:** resultado puro renderizado diretamente; interpretação separada com contrato que identifique referências à amostra, hipóteses e objetivos. Rejeitar/sinalizar conflito em vez de fazer substituição cega. Se não for possível validar a interpretação, entregar o laudo puro com falha explícita dessa etapa.

**Aceitação:** nenhuma grafia em prosa permite contradizer a amostra; um alvo não é silenciosamente substituído pela medição. Testes devem verificar significado e campos estruturados, além de literais.

### [P1] Receita sem posologia e sem via ainda habilita PDF — W05

**Módulo 07; `validarReceitaTemMedicamentos`, snapshot linha 5507.**

`1. Paracetamol 500 mg` é considerado válido e recebe botão PDF. O texto contém apresentação do produto, mas não instrução de administração, frequência ou via.

A condição real é `temDosagemComUnidade && (temPosologiaOuVia || linhaNumerada)`. Assim, a numeração substitui a exigência de posologia/via. Isso contradiz a descrição de validação estrita apresentada no walkthrough.

**Correção estrutural:** validar os campos de cada item de receita, com pendências explícitas. A mera existência de uma linha com nome e apresentação não deve liberar impressão como prescrição completa. A validação deve considerar todos os itens, não apenas encontrar um candidato.

**Aceitação:** apresentação isolada falha por falta de instrução; a receita completa usada na contraprova continua aprovada. Não exigir unidades incompatíveis com a forma farmacêutica: os campos devem ser definidos por esquema, não por uma regex universal de linhas.

### [P1] A lista de calculadoras reconhecidas não cobre calculadoras já suportadas — W06

**Módulo 07; `ehCalculadoraReconhecida`, snapshot linha 6007, e guarda do `/calc`, linha 5275.**

`CalculadorasClinicas.hasbled` existe, mas `ehCalculadoraReconhecida('HAS-BLED hipertensão')` retorna false. A chamada `/calc HAS-BLED hipertensão` segue para `processarCalculadoraClinicaComIA`, em vez de pedir os fatores faltantes deterministicamente.

O bloqueio corrigiu o caso de clearance e os nomes explicitamente cadastrados. Não demonstra a garantia anunciada de “calculadoras suportadas com parâmetros inválidos ou insuficientes, zero chamadas de IA”.

**Correção estrutural:** registro único de calculadoras e aliases compartilhado pelo menu, instruções, reconhecimento, validação e execução. O resultado de roteamento deve distinguir nome desconhecido, dados incompletos, dados inválidos e cálculo concluído. Para um nome suportado, incompletude nunca autoriza IA.

**Aceitação:** percorrer todos os nomes e aliases expostos pela aplicação, verificar sua resolução para a função pura e exigir zero chamadas de IA para cada conjunto incompleto/inválido. Testar somente clearance não comprova o contrato global.

## Quadro arquitetural e fechamento

| Área | Resultado desta rodada |
|---|---|
| Clínica | Bloqueador no parser de fatores e riscos na interpretação numérica livre. |
| Roteamento | Proteção ampliada, porém baseada em lista paralela incompleta. |
| Documentos | Detector melhorou, mas apresentação de medicamento ainda é aceita como receita completa. |
| Persistência e concorrência | Testes históricos continuam aprovados; esta rodada não realizou homologação real de concorrência/quotas. |
| Segurança operacional | Não foram consultadas ACLs, credenciais ou configuração remota. Nenhuma certificação de implantação é inferida dos mocks. |

O próximo fechamento deve se apoiar em quatro regras verificáveis: **fator desconhecido não é negativo; texto de IA não altera medições nem alvos por substituição cega; receita incompleta não imprime; calculadora suportada nunca delega cálculo inválido/incompleto à IA.** Esses requisitos já estavam nas auditorias anteriores.

Ajustes de expressões específicas corrigiram os exemplos, mas criaram novas situações erradas no mesmo fluxo. Os testes positivos precisam cobrir também inversão da ordem das orações, negativas depois de adversativas, presença parcial dos fatores, receita parcial e todos os aliases expostos. Manter os casos históricos como regressões sem usá-los como única definição do requisito.

O walkthrough pode afirmar que as cinco contraprovas passaram. As afirmações de coerência numérica absoluta, posologia obrigatória e zero IA para todas as calculadoras suportadas não estão sustentadas pelo código atual.

## Artefatos

[Verificação da sexta rodada](</home/wagmoraes/Projetos IA/Rotina/reviews/sexta_rodada_2026_10_04_verificacao.cjs>) · [Evidências completas](</home/wagmoraes/Projetos IA/Rotina/reviews/sexta_rodada_2026_10_04/evidencias.json>)

```sh
node reviews/sexta_rodada_2026_10_04_verificacao.cjs reviews/sexta_rodada_2026_10_04/master_auditado.js
```

O script confirma defeitos: exit code zero significa que os seis cenários foram reproduzidos, não homologação. Os arquivos das rodadas anteriores permanecem preservados.
