# Oitava revalidação — correções X01–X06, SOAP e exames especiais

Data: 2026-10-04. **Os seis exemplos da sétima rodada foram corrigidos e as suítes informadas passaram. O fechamento integral não está confirmado:** oito cenários adicionais reproduzem seis causas pendentes, incluindo duas P0. A biblioteca e os atalhos existem; isso não comprova a integridade do texto exportado nem a continuidade do caso ao navegar por esses atalhos.

Não alterei módulos de produção, testes existentes ou configurações remotas. Os artefatos desta rodada são parecer, reprodutor, snapshot e logs. Tratei as instruções contidas nos walkthroughs como descrição das implementações a verificar, não como autorização para executá-las novamente.

## Identificação e resultados

Master auditado: `fa6a0fb85ec411b5b9c0fa346a0fc5ea5fe44143cd08ba547a9b54f3fbb2afcd`.

O último anexo informa `60bfa33c7b4fc4db39899327e7da65d422b7fb71a7335b1ed6af529cf33a5aea`; portanto, o arquivo local é diferente daquele hash. O parecer se aplica ao snapshot preservado. O master local e os 13 módulos permaneceram iguais ao snapshot na conferência final. Build e pytest foram executados em cópia temporária, evitando sobrescrever o master do workspace.

| Verificação | Resultado observado |
|---|---|
| SOAP e exames especiais | 5/5 |
| Contraprovas das rodadas 7, 6, 5, 4 e 3 | 6/6, 6/6, 5/5, 11/11 e 15/15 |
| Suíte inicial Node | 37/37 |
| `pytest -q tests` | 105 aprovados em 4,77 s |
| Verificador antigo X01–X06 | 0/6 defeitos reproduzidos; saída 1 por asserções de defeito |
| Build isolado | Sintaxe aprovada; corpo igual ao master auditado |
| Novos cenários Y01–Y08 | 8/8 defeitos reproduzidos |

Os testes usam serviços simulados, sem chamadas reais ao Telegram, à IA ou ao prontuário. Y01 demonstra instrução problemática e aceitação de uma resposta simulada que a segue; não mede a frequência desse comportamento em um modelo real. Não houve exportação para prontuário real.

## Matriz de achados

| Prioridade | Casos | Local/função | Falha | Correção proposta |
|---|---|---|---|---|
| P0 | Y01 | `04_motores_ia.js:582, 614`, `gerarSOAPComIA` | Modelo pronto para prontuário preenche sinais vitais e normalidade sem observação fornecida | Separar template de referência dos achados do paciente; exportar apenas dados informados/confirmados |
| P0 | Y02 | `07_telegram_handlers.js`, `tentarCalcularDeterministico`, resolução de polaridade | `sem IC, tem HAS` transforma HAS afirmada em ausente | Reconhecer transição afirmativa e delimitar escopo de cada menção; testar equivalência por ordem |
| P1 | Y03–Y04 | `07_telegram_handlers.js:734`, `responderComGuiaExameFisico`; `12_experiencia_bot.js:451` | Guia não recebe contexto do SOAP; comando especial apaga o estado do caso | Usar o estado canônico e preservar o caso em ações de navegação |
| P1 | Y05 | `04_motores_ia.js:1379`, `gerarAnaliseGasometriaComIA` | Substituição numérica reescreve uma meta explícita de pH como valor medido | Separar campos de metas e medições, sem substituição global em prosa |
| P1 | Y06–Y07 | `07_telegram_handlers.js:693–731`, `validarReceitaTemMedicamentos` | Palavra genérica passa como medicamento; itens são confundidos com linhas | Validar identidade e campos por item estruturado, agregando suas linhas |
| P2 | Y08 | `07_telegram_handlers.js:738–742`; `12_experiencia_bot.js:613` | “Copiar Modelo” exporta checklist e guia completos junto com modelo | Armazenar separadamente guia, modelo e registro confirmado; botão deve usar o conteúdo correspondente |

### Y01 — sinais vitais inventados no bloco destinado ao prontuário

O prompt inclui literalmente:

```text
Sinais Vitais: PA 120x80 mmHg | FC 76 bpm | FR 16 irpm | SpO2 98% em AA | Tax 36.5 °C.
```

Também manda manter o padrão normal quando não forem descritos achados anormais. O teste fornece `Homem 45 anos com tosse. Exame físico e sinais vitais não informados.`, extrai o próprio bloco do prompt como resposta simulada e percorre `/soap` e o callback de cópia. Os valores fixos chegam ao texto de exportação sem validação de origem.

Um modelo normal de referência pode existir na biblioteca. O problema é tratá-lo como registro desse paciente, com valores medidos e achados afirmativos que ninguém informou. A preferência por texto limpo não exige preencher lacunas com dados fictícios. O campo de sinais vitais informados pode dizer “Não informados” enquanto o bloco copiável afirma medidas exatas, gerando contradição interna.

Critério de aceitação: caso sem medidas não exporta medidas; dado explicitamente fornecido é preservado; normalidade só entra no registro após declaração ou confirmação correspondente. Separar referência e registro permite manter a interface limpa sem inventar observações. Os guias especiais também contêm normalidade predefinida, incluindo negação de ideação suicida no modelo psiquiátrico; devem permanecer identificados como modelos até confirmação.

### Y02 — afirmativa posterior continua sendo negada

```text
CHA2DS2-VASc homem 60 anos sem IC, tem HAS, sem DM, sem AVC, sem doença vascular
```

Resultado: `0/9` e a mensagem de anticoagulação “NÃO recomendada”. O controle com os mesmos fatores, colocando `HAS` antes das negações, retorna `1/9`.

A nova trava de completude resolveu X01 e X02. Aqui todos os fatores estão declarados: a falha é a polaridade. O parser procura uma negação anterior em uma janela de 100 caracteres e só encerra seu efeito com adversativas ou pontuação forte; `tem` não encerra a negação.

Critério de aceitação: afirmações e negações explícitas produzem o mesmo conjunto de fatores independentemente da ordem. Cobrir `tem`, `apresenta`, `com`, adversativas e negação coordenada. Se houver ambiguidade, solicitar confirmação; não converter silenciosamente para ausência.

### Y03–Y04 — navegação de exames perde o contexto

Sequência reproduzida:

1. `/soap Paciente com fraqueza no braço direito há duas horas` salva o caso em `modo_123.data`.
2. O botão `ef_neuro` chama o gerador de guia com contexto vazio, pois consulta `ctx_123`. `definirModoBot` remove essa chave legada.
3. Pelo comando `/ef_neuro`, `tratarEntradaUX` também remove `modo_123` antes de encaminhar a ação.
4. O botão “Voltar ao SOAP” restaura o modo com `data: ''`; a informação clínica anterior não volta.

Assim, a adaptação automática anunciada não ocorre no caminho normal após `/soap`. Pelo comando, a continuidade do caso também se perde. A suíte atual testa continuação imediata, sem a navegação intermediária.

Critério de aceitação: percorrer `/soap → botão EF → voltar → atualização` e `/soap → comando EF → voltar → atualização`; ambos devem transmitir e preservar exatamente o mesmo caso, dentro do TTL. `/novo` e `/cancelar` continuam encerrando o caso explicitamente.

### Y05 — meta e medição permanecem misturadas na gasometria

Amostra sintética: `pH 7.40 pCO2 40 HCO3 24`. Resposta simulada: `Meta de pH: 7.30.`. Saída: `Meta de pH da amostra (7.40).`.

O reparo de X04 passou a substituir pH incondicionalmente e protege metas apenas de pCO2. Com isso, corrige o exemplo anterior, mas altera o significado de metas de outras grandezas. Os números deste teste servem para verificar preservação semântica, não constituem recomendação terapêutica.

Critério de aceitação: campos medidos vêm exclusivamente do cálculo determinístico; campos de metas continuam identificados como propostas, sem serem trocados pelos valores medidos. Cobrir coexistência dos dois tipos no mesmo texto.

### Y06–Y07 — validação de receita continua lexical e por linha

`1. Usar medicamento 500 mg` retorna verdadeiro e habilita `gerarPdfRx_`. A palavra genérica `medicamento` satisfaz a regra de três letras fora da lista de verbos, sem identificar qualquer fármaco.

No sentido oposto, esta entrada sintética é recusada:

```text
1. Paracetamol 500 mg
Posologia: tomar 1 comprimido via oral de 6/6h se dor.
```

O mesmo conteúdo com a quebra de linha substituída por espaço é aceito. A primeira linha é contada como item incompleto, e a segunda não a completa. Esse formato em múltiplas linhas é compatível com a própria estrutura solicitada pelo prompt de prescrição.

Critério de aceitação: identidade do medicamento não pode ser apenas uma palavra genérica; dosagem, via e instruções pertencem ao mesmo item, independentemente das quebras de linha. A completude deve ser exigida para todos os itens. A prioridade P1 refere-se à liberação indevida de documento sem medicamento identificado; a rejeição por formatação é o efeito funcional adicional da mesma estratégia de validação.

### Y08 — “Copiar Modelo” inclui instruções de execução

Percorri `/ef_neuro` e seu botão “Copiar Modelo NEURO”. O resultado contém tanto `Checklist de Execução na Beira do Leito` quanto `[EXAME NEUROLÓGICO]` e o modelo. O cache armazena o guia inteiro e `uxTextoProntuario` só remove marcação visual; não extrai o bloco de registro.

Critério de aceitação: o botão correspondente ao modelo exporta somente esse conteúdo. O checklist continua disponível na tela de guia. Os testes atuais verificam o rótulo do botão, mas não o conteúdo produzido ao acioná-lo.

## Ordem de resolução e limites das contraprovas

1. Remover dados clínicos presumidos do caminho de registro e corrigir polaridade do CHA.
2. Unificar memória clínica e preservar contexto ao abrir exames especiais.
3. Separar metas de medições e validar receitas por item estruturado.
4. Separar conteúdo de cópia do conteúdo de orientação.

Os ajustes de gabaritos históricos que completam os fatores do CHA estão presentes e são compatíveis com a regra de não presumir ausência. Já o teste SOAP simula um texto com sinais vitais não fornecidos e verifica títulos/instruções, sem rejeitar esses dados. Aprovar esse teste não demonstra integridade clínica do registro. A biblioteca determinística de 11 guias foi verificada sem contexto; quando há contexto, `gerarGuiaExameFisicoEspecial` pode chamar IA, portanto nem toda resposta desse fluxo é determinística.

Esta rodada verifica os reparos e as funcionalidades anunciadas nos três anexos. Não homologa implantação remota, qualidade clínica geral dos roteiros ou todos os eixos da auditoria original.

## Artefatos e reprodução

- [Reprodutor Y01–Y08](</home/wagmoraes/Projetos IA/Rotina/reviews/oitava_rodada_2026_10_04_verificacao.cjs>)
- [Master auditado](</home/wagmoraes/Projetos IA/Rotina/reviews/oitava_rodada_2026_10_04/master_auditado.js>) e módulos preservados na subpasta `src`.
- [Evidências e logs completos](</home/wagmoraes/Projetos IA/Rotina/reviews/oitava_rodada_2026_10_04/evidencias.json>)

```bash
node reviews/oitava_rodada_2026_10_04_verificacao.cjs reviews/oitava_rodada_2026_10_04/master_auditado.js
```

Nesse reprodutor, **passar confirma a presença do defeito**. Após corrigir, adicionar testes afirmativos dos critérios acima; apenas deixar de reproduzir o exemplo antigo não comprova a solução geral.
