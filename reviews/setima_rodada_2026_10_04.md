# Sétima revalidação — 2026-10-04

Os seis exemplos W01–W06 foram corrigidos na versão local examinada. Isso não confirma a declaração de que todas as causas foram sanadas: seis contraprovas adicionais reproduziram quatro causas pendentes, duas delas P0 no CHA₂DS₂-VASc. Não alterei os módulos de produção nem realizei deploy.

## Versão e execução

- SHA-256 auditado: `2815c62b9438513da2d213633805a7155dcc72d7fb4af34c5f8e90c522743b49`.
- SHA-256 declarado no anexo: `07fcb88fa62e78c1a6df230cd417c1b2ded07b4b6f46212235bc6149fb7fe3e5`. São artefatos diferentes; não é possível atribuir a diferença apenas ao cabeçalho sem acesso àquela versão.
- Preservei o master e os 13 módulos-fonte em [snapshot](</home/wagmoraes/Projetos IA/Rotina/reviews/setima_rodada_2026_10_04/master_auditado.js>). Durante o trabalho, o cabeçalho do master local foi regenerado externamente: hash final `b58348e6059521a07dba4a77a4dca4215b33185a5715b16697a42efc8eb564ca`. Os 13 módulos e o corpo do master permaneceram idênticos ao snapshot; confirmei os seis defeitos também nesse arquivo final.
- Executei build e pytest em cópia temporária. O build passou e seu corpo coincide com o master auditado, desconsiderando o cabeçalho gerado.
- Testes offline com serviços simulados; não comprovam comportamento de serviços remotos ou implantação ativa. A classificação abaixo trata da integridade do software, não de recomendações terapêuticas.

| Verificação executada | Resultado |
|---|---|
| Contraprova da sexta rodada | 6/6 |
| Contraprova da quinta rodada | 5/5 |
| Contraprova da quarta rodada | 11/11 |
| Contraprova da terceira rodada | 15/15 |
| Suíte inicial Node | 37/37 |
| `pytest -q tests` | 105 aprovados, 4,64 s |
| Reprodutor antigo W01–W06 | 0/6 defeitos reproduzidos; saída 1 pelas asserções de defeito |
| Novos casos X01–X06 | 6/6 defeitos reproduzidos |

Logs completos, comandos e metadados estão em [evidencias.json](</home/wagmoraes/Projetos IA/Rotina/reviews/setima_rodada_2026_10_04/evidencias.json>). Aprovação das suítes existentes é um resultado real, mas limitado às respectivas asserções.

## Achados

| Prioridade | Casos | Local/função | Causa e consequência | Correção proposta |
|---|---|---|---|---|
| P0 | X01–X02 | `07_telegram_handlers.js:1509`, `tentarCalcularDeterministico` | Completude bloqueada apenas quando nenhum fator é positivo e faltam pelo menos quatro; outras entradas parciais emitem escore e recomendação definitivos | Manter estado desconhecido por fator e bloquear o fechamento enquanto houver qualquer pendência |
| P0 | X03 | `07_telegram_handlers.js:1460–1475`, mesma função | Uma negação em qualquer posição do bloco nega todos os fatores nele, inclusive HAS afirmada antes | Atribuir polaridade a cada menção; recusar ambiguidades em vez de zerar fatores |
| P1 | X04 | `04_motores_ia.js:933–936`, `gerarAnaliseGasometriaComIA` | Palavra de conduta isenta a linha inteira da validação, inclusive uma medição contraditória | Separar medições, interpretações e metas por campos; renderizar medições exclusivamente do motor puro |
| P1 | X05–X06 | `07_telegram_handlers.js:649–678`, `validarReceitaTemMedicamentos` | Unidade e verbo bastam, sem nome do medicamento; primeiro item elegível encerra a validação da receita | Validar estrutura e completude de cada medicamento antes de habilitar exportação |

### X01–X02 — fatores não informados continuam virando ausência

Entrada `CHA2DS2-VASc homem 60 anos sem HAS, sem DM` retorna `0/9` e a frase `Anticoagulação oral NÃO recomendada`, embora IC, AVC/AIT e doença vascular não tenham sido informados. Entrada `CHA2DS2-VASc homem 60 anos HAS` retorna `1/9` com recomendação, sem conhecer os outros quatro fatores.

O teste W01 cobre somente um fator negado. A regra atual não atende à exigência geral de não presumir dados ausentes. A função pura também é chamada antes da verificação de completude, com booleanos já convertidos de desconhecido para falso.

Critério de aceitação: para cada um dos cinco fatores, testar ausência de informação tanto com outros fatores positivos quanto negativos. Exigir pendências e ausência de escore final. Dados integralmente declarados devem continuar calculando. Declarações gerais e exceções precisam ter semântica explícita.

### X03 — negação posterior elimina um fator positivo explícito

Entrada completa:

```text
CHA2DS2-VASc homem 60 anos HAS, sem DM, sem IC, sem AVC, sem doença vascular
```

Retorna `0/9`, com HAS apagada. Inserir apenas `mas` após a primeira vírgula faz a mesma lista retornar `1/9`. O defeito decorre de aplicar `temNegacao` ao bloco inteiro. A divisão por adversativas resolveu W02, mas não a lista usual de afirmação seguida de negações.

Critério de aceitação: preservar a mesma pontuação e os mesmos fatores em listas equivalentes com vírgula, ponto, adversativa e ordens diferentes. Não basta dividir indiscriminadamente por vírgulas: a negação coordenada em `sem HAS, DM ou AVC` também precisa ser preservada.

### X04 — proteção da gasometria depende de uma palavra na linha

Com amostra `pH 7.40 pCO2 40 HCO3 24`, simulei resposta da IA:

```text
O pH é 6.00; conduta: reavaliar a amostra.
```

A saída entrega simultaneamente o pH determinístico 7,40 e a afirmação de pH 6,00. `conduta` desativa a higienização de toda a linha. O aviso de rascunho permanece, mas não elimina a contradição.

Há ainda um limite na própria W03: sua resposta simulada diz `O pH é 6.00 com acidose grave e choque.`; o teste só exige remoção do valor falso. A saída passa a dizer `pH da amostra (7.40) com acidose grave e choque.`. Trocar números não valida o raciocínio que os acompanha. Essa observação não foi contada como causa adicional.

Critério de aceitação: dados medidos não podem ser reintroduzidos pela IA; metas devem ocupar campos distintos e continuar identificadas como propostas. Cobrir medições e metas na mesma linha e divergências de interpretação. Uma lista maior de palavras não estabelece essa separação.

### X05–X06 — PDF ainda não exige receita completa

`1. Usar 500 mg` retorna `true` no validador e habilita efetivamente o callback `gerarPdfRx_`, mesmo sem identificar o medicamento.

Também habilita PDF:

```text
1. Paracetamol 500 mg VO 1 comprimido de 6/6h se dor.
2. Amoxicilina 500 mg
```

O primeiro item satisfaz o predicado e o `break` impede avaliar o segundo. A segunda linha isolada é justamente o tipo de apresentação incompleta que W05 passou a bloquear.

Critério de aceitação: extrair itens farmacológicos estruturados, validar os campos obrigatórios de cada item e bloquear a exportação quando qualquer um estiver incompleto. Testar invariância à ordem dos itens e instruções distribuídas em várias linhas. Os exemplos acima são entradas sintéticas de teste, não prescrições recomendadas.

## Limites das alegações e da suíte

O catálogo compartilhado corrigiu o fallback indevido demonstrado em W06. Entretanto, o ramo HAS-BLED atual, nas linhas 1365–1367, retorna incondicionalmente “Parâmetros Insuficientes ou Inválidos”; não extrai fatores nem chama `CalculadorasClinicas.hasbled`. Portanto, confirmou-se o bloqueio seguro de IA, não uma implementação funcional do cálculo nesse roteador. Não contei essa limitação entre os seis defeitos acima.

Alguns testes existentes precisam de revisão de gabarito. U02 da quarta contraprova exige `0/9` para `sem HAS, DM ou AVC`, sem declarar IC e doença vascular. Isso conflita com o requisito de não presumir ausência. T15 da terceira contraprova também espera uma classificação final com apenas HAS informada. Esses testes podem continuar avaliando polaridade e formatação, desde que recebam dados completos; não devem exigir que entradas parciais produzam recomendações finais.

## Ordem de resolução

1. Resolver completude e polaridade do CHA conjuntamente; ajustar os gabaritos que exigem resultados com dados parciais.
2. Definir contrato estruturado para a contribuição da IA na gasometria, preservando autoridade exclusiva dos dados determinísticos.
3. Validar todos os itens de receita antes de habilitar PDF.
4. Descrever HAS-BLED como bloqueado/instruções até implementar e testar a chamada ao motor puro com fatores completos.

Reprodução dos seis casos, sem rede:

```bash
node reviews/setima_rodada_2026_10_04_verificacao.cjs reviews/setima_rodada_2026_10_04/master_auditado.js
```

Nesse script, **passar confirma o defeito**. Após correções, devem existir testes afirmativos do comportamento esperado; falhas das asserções antigas, isoladamente, não demonstram conformidade. Esta revalidação se concentra nas alegações do fechamento da sexta rodada e não substitui homologação integral dos demais eixos da auditoria.
