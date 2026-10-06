# Quinta rodada — conferência das correções U01–U07

**Parecer: os exemplos declarados passaram, mas ainda existem bloqueadores para a conclusão de prontidão clínica.** Cinco cenários adicionais reproduzem quatro causas de falha nos mesmos requisitos: dados desconhecidos e negação no CHA, contradição numérica em gasometria, elegibilidade de PDF e fallback de cálculo inválido para IA.

## Evidência e versão

Snapshot: [master_auditado.js](</home/wagmoraes/Projetos IA/Rotina/reviews/quinta_rodada_2026_10_04/master_auditado.js>).

SHA-256: `44467a773cedcd59e1189138210ba2cb7665ae4573f8e7d3028ec5b21205afd5`.

O build realizado em cópia temporária produz corpo idêntico ao master congelado. Os testes usaram mocks e dados sintéticos, sem acessar Telegram, Drive, Notion ou IA reais. Não foram modificados fontes de produção ou testes anteriores; somente foram criados artefatos de auditoria. A configuração real de implantação não foi consultada.

| Verificação | Resultado |
|---|---|
| Sintaxe | Aprovada |
| Contraprova da quarta rodada | **11/11 passaram** |
| Contraprova da terceira rodada | **15/15 passaram** |
| Suíte inicial | **37/37 passaram** |
| pytest com build em cópia temporária | **101/101 passaram**, 4,79 s |
| Harness anterior U01–U07 | Zero cenários completos reproduzidos; quatro verificações positivas confirmadas |
| Novos casos V01–V05 | **5/5 defeitos reproduzidos** |

O exit code 1 do harness antigo é esperado: as asserções que procuravam os sete defeitos deixam de passar. Isso não prova, isoladamente, que todos os componentes de cada cenário foram corrigidos. O caso de gasometria demonstra concretamente esse limite.

## Correções reconhecidas

- MELD com bilirrubina zero agora retorna erro determinístico, sem IA, no caminho testado.
- A frase de orientação sem itens usada em U05 deixou de receber PDF.
- A inserção sequencial de leitos volumosos passou a sofrer contrapressão antes do excesso observado anteriormente.
- A poda dos históricos legados usados em U07 passou a preservar os registros recentes testados.
- O modo assíncrono, a contagem UTF-8 e a partição de histórico permanecem aprovados nos testes anteriores.

Essas correções são aceitas no escopo exercitado. Não foram demonstradas atomicidade real entre execuções, ausência de todas as falhas de quota ou homologação da implantação. Nenhum desses limites anula os avanços acima.

## Matriz de achados remanescentes

### [P0] CHA exige menção a um tema, não confirmação dos fatores — V01/V02

**Local:** módulo 07, `tentarCalcularDeterministico`; snapshot linhas 6064 e 6082.

**V01:** `CHA2DS2-VASc homem 60 anos antecedentes desconhecidos` retorna **0/9** e “Anticoagulação oral NÃO recomendada”. A palavra “antecedentes” satisfaz `temMencaoFatores`; todos os fatores continuam sendo convertidos em false pela ausência de correspondência positiva. O texto informa explicitamente que o histórico é desconhecido.

**V02:** `CHA2DS2-VASc homem 60 anos sem DM, sem IC, sem AVC, sem doença vascular, mas HAS` também retorna **0/9**. O segmento negativo se estende até ponto, ponto e vírgula ou quebra de linha; ele atravessa “mas” e inclui a HAS afirmada. A nova correção de listas criou um falso negativo para afirmações após a negação.

**Impacto:** recomendação baseada em histórico incompleto ou invertido. Não é erro da fórmula pura, mas erro nos dados fornecidos a ela.

**Correção concreta:** representar cada fator separadamente como presente, ausente ou desconhecido. Não chamar a calculadora enquanto houver fator obrigatório não resolvido. Negação deve ter escopo delimitado; frases adversativas e contraditórias devem provocar confirmação. Para esse escore crítico, um formulário de cinco fatores e idade/sexo é uma solução controlável.

**Critério de aceitação:** desconhecido nunca equivale a negativo; um fator afirmado depois de “mas” não pode ser descartado. Testar a representação intermediária e a resposta final.

A contraprova U02 exige 0/9 para “sem HAS, DM ou AVC”, embora IC e doença vascular não estejam esclarecidas. Esse gabarito ainda aprova a presunção de ausência de fatores omitidos. Deve confirmar apenas os fatores mencionados e exigir os restantes.

### [P1] A contradição de pH permanece no mesmo cenário original — V03

**Local:** módulo 04, `gerarAnaliseGasometriaComIA`; snapshot linha 3713.

Entrada: `pH 7.40 pCO2 40 HCO3 24`.

Saída simulada da IA, igual à usada na contraprova: `pH 6.00; AG = 99; HCO3 = 3`.

AG e HCO3 são substituídos; **pH 6.00 continua na mensagem junto ao pH real 7.40**. A contraprova U04 verifica presença do pH real e ausência dos dois outros valores, mas não verifica ausência do pH contraditório.

O harness antigo parou na asserção referente a AG. Por isso ele contabiliza zero defeitos completos, mesmo com a contradição de pH ainda presente. Não é necessário inventar uma nova grafia para demonstrar a pendência.

**Correção concreta:** renderizar grandezas calculadas exclusivamente a partir do objeto puro e validar a interpretação como saída separada. Conteúdo contraditório deve ser rejeitado/sinalizado. Evitar uma sequência de substituições de literais como mecanismo de garantia clínica.

**Critério de aceitação:** analisar a coerência de todas as grandezas da resposta inteira, incluindo o caso exato acima. Preservar o laudo puro mesmo quando a interpretação é rejeitada.

### [P1] “Revisar exames” é aceito como item farmacológico — V04

**Local:** módulo 07, `processarEEntregarIA`; snapshot linha 5516.

`1. Revisar exames.` recebe botão de PDF, sem qualquer medicamento, dose ou posologia. A primeira regex reconhece uma linha numerada. A segunda contém alternativas curtas como `ev`, sem fronteira de palavra; `ev` aparece dentro de “Revisar”. Assim, duas correspondências superficiais são tratadas como prova de prescrição.

**Correção concreta:** validar um objeto de receita com itens e campos obrigatórios, em vez de inferir existência de fármaco por qualquer palavra numerada e siglas soltas. O botão depende do resultado dessa validação e do estado de conferência.

**Critério de aceitação:** uma orientação numerada sem medicamento não habilita PDF; uma receita estruturada válida habilita. Não basta testar apenas uma frase sem numeração.

### [P1] Bloqueio de fallback inválido foi aplicado ao MELD, não às calculadoras em geral — V05

**Local:** módulo 07, `tentarCalcularDeterministico`; snapshot linha 5965, ramo de clearance e fallback `/calc`.

`/calc clearance Cr 0 peso 70 idade 60 masculino` é rejeitado por `CalculadorasClinicas.cockcroftGault`, mas o parser não devolve o erro. Ele termina com null e o handler chama `processarCalculadoraClinicaComIA`.

O walkthrough afirma que qualquer comando explícito com validação pura inválida interrompe sem IA. A evidência confirma essa correção para MELD; clearance ainda viola a regra.

**Correção concreta:** contrato único de resultado de roteamento: calculadora desconhecida, calculadora incompleta, parâmetros inválidos ou resultado válido. Apenas intenção desconhecida pode seguir para outro fluxo; calculadora reconhecida e inválida retorna erro determinístico.

**Critério de aceitação:** executar entradas válidas, incompletas e inválidas em todas as calculadoras críticas pela interface pública, verificando tanto a mensagem quanto zero chamadas de IA nos erros.

## Quadro arquitetural e plano de fechamento

| Área | Situação |
|---|---|
| Clínica | Persistem bloqueadores na extração de fatores e na coerência da saída da IA. |
| Documentos/UX | Elegibilidade de PDF ainda depende de regexes permissivas. |
| Persistência | Os casos sequenciais de orçamento e migração apresentados foram corrigidos. Garantias de concorrência não foram homologadas por mocks sem locks reais. |
| Execução | Modo assíncrono implementado e testado; a escolha operacional depende da configuração implantada, não consultada nesta rodada. |
| Testes | Todas as suítes declaradas passam nos exemplos. Alguns gabaritos não representam o requisito completo. |

Prioridade imediata: corrigir o modelo de fatores desconhecidos e o escopo de negação; depois unificar o contrato de cálculo inválido, a saída clínica estruturada e o esquema de receita. Reescrever os testes em torno desses quatro requisitos, preservando os exemplos históricos como regressões.

Para fechamento, a matriz deve dizer “passou nos exemplos X” onde essa é a evidência disponível. A frase “pronto para implantação” não está sustentada enquanto os cinco cenários acima forem reproduzíveis. Não foram adicionados requisitos novos: todos derivam de validação explícita de dados, determinismo e integridade documental já pedidos.

## Reprodução e evidências

[Script desta rodada](</home/wagmoraes/Projetos IA/Rotina/reviews/quinta_rodada_2026_10_04_verificacao.cjs>) · [Saídas capturadas](</home/wagmoraes/Projetos IA/Rotina/reviews/quinta_rodada_2026_10_04/evidencias.json>)

```sh
node reviews/quinta_rodada_2026_10_04_verificacao.cjs reviews/quinta_rodada_2026_10_04/master_auditado.js
```

O script é evidência de defeitos: exit code zero confirma que os cinco foram reproduzidos, não aprovação de produção. Relatórios, contraprovas e reproduções anteriores foram preservados.
