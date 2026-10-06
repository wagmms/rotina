# Terceira rodada — conferência do walkthrough de resolução R01–R20

**Parecer: houve correções substanciais, mas a homologação integral continua sem suporte.** Dos 20 cenários antigos, 19 deixaram de reproduzir o defeito e R11 continua presente. Isso confirma avanço nos exemplos originais; não prova as garantias absolutas do walkthrough. Testes adicionais reproduziram 15 cenários residuais ou de regressão, agrupáveis em menos causas raiz.

O bloqueador mais evidente está no novo parser de CHA₂DS₂-VASc: ele converte fatores ausentes em negativos, reconhece IC dentro da palavra “diabético” e pontua doenças explicitamente negadas. Uma entrada com “sem diabetes” e “sem hipertensão” termina em recomendação forte de anticoagulação.

## Versão e método

- Snapshot: [master_auditado.js](</home/wagmoraes/Projetos IA/Rotina/reviews/terceira_rodada_2026_10_04/master_auditado.js>).
- SHA-256: `f685e3d9a782ab7009427d1d54eeef0be64420fa6f89617bcf293115a6198f4f`.
- O master foi congelado antes dos testes; seu corpo coincide com o build dos módulos na cópia temporária.
- O walkthrough foi tratado como alegação a verificar. Não houve alteração de produção, deploy ou acesso a serviços reais; somente artefatos de revisão e testes com mocks.
- O script anterior foi preservado. Suas asserções procuram defeitos: uma asserção que deixa de passar não constitui, isoladamente, prova de correção. Foram escritos também testes positivos dos comportamentos corrigidos.

| Verificação | Resultado |
|---|---|
| Sintaxe do snapshot | Aprovada |
| pytest em cópia temporária, incluindo build | **101/101 passaram**, 4,37 s |
| Suíte atual `test_auditoria_resolvida.cjs` | **37/37 passaram** |
| Script antigo R01–R20, sem modificações | **R11 reproduzido; 19 não reproduzidos**; exit code 1 é esperado para esse resultado |
| Verificações positivas independentes | **17 grupos aprovados**, cobrindo os exemplos alterados de 19 R; dois grupos agregam pares de R |
| Casos adversos adicionais T01–T15 | **15/15 reproduzidos**, nenhuma falha do harness final |

Os testes usam relógio, armazenamento e serviços simulados. Os locks do harness não demonstram exclusão mútua real no GAS. Avançar o relógio durante um handler simula latência; não é uma medição de tempo real de produção.

## Quadro arquitetural

| Área | Parecer |
|---|---|
| Segurança e autenticação | Esta rodada não certifica controles de acesso nem ACLs do Drive; preserva o escopo anterior e verifica as correções declaradas. |
| Clínica | Melhoraram funções puras e validações específicas. A extração de linguagem natural continua sendo um ponto de erro clínico antes do cálculo. |
| Concorrência | Melhorou o tratamento de `sending` recente. O prazo adicionado não é cancelamento de fetch nem garantia de exclusividade após expiração. |
| Persistência | Contrapressão ASCII e contagem de jobs ativos funcionam nos exemplos. Contagem incorreta de bytes e poda prematura de deduplicação permanecem. |
| UX e documentos | Melhoraram segmentação, banner obrigatório e propagação de falha PDF. Pendências clínicas ainda podem oferecer PDF e a classificação CHA imprime `undefined`. |
| Testabilidade | Build consistente e testes verdes. Faltam gabaritos sobre campos ausentes, negativas, Unicode, ordem real de UUID e interação entre retenção e pressão de armazenamento. |

## Situação individual de R01–R20

“Corrigido no caso” refere-se ao requisito exercitado, sem afirmar ausência de outros defeitos na função.

| R | Resultado desta rodada |
|---|---|
| R01 | **Corrigido no caso:** MELD usa Cr/INR na ordem certa e retorna 22 / MELD-Na 25. |
| R02 | **Corrigido no caso:** “Na 132” e “sódio 132” funcionam. |
| R03 | **Parcial:** “sem diálise” funciona; “não faz hemodiálise” ainda ativa diálise, T05. |
| R04 | **Corrigido no caso:** clearance sem sexo pede esclarecimento sem calcular. Não certifica todas as ambiguidades possíveis do parser. |
| R05 | **Parcial:** CHA sai da rota de IA, porém o novo extrator erra faltantes e negações, T01–T03; MELD incompleto ainda cai na IA, T04. |
| R06 | **Corrigido no caso:** gasometria incompleta interrompe antes do cálculo/IA. |
| R07 | **Corrigido no caso:** último bloco incompleto não herda pCO2/HCO3 do anterior. |
| R08 | **Parcial:** resultado puro agora permanece no texto; IA ainda pode contradizê-lo, e exceção do motor remove essa proteção, T06–T07. |
| R09 | **Corrigido na função pura:** mulher com 2 pontos recebe risco intermediário/ícone laranja. Isso não corrige a entrada errada construída pelo parser. |
| R10 | **Corrigido no caso:** vasopressina 9 mL/h no legado e na tabela. |
| R11 | **Aberto:** webhook ainda chama worker; flag anunciada não existe no snapshot, T13. A justificativa é um trade-off, não atendimento ao requisito de resposta rápida. |
| R12 | **Parcial:** `GET clean` respeita 24 h para done, mas a poda por pressão remove deduplicação recente, T09. |
| R13 | **Corrigido no caso:** 150 done não bloqueiam novo pedido. O código atual limita a **50 ativos**, não aos 150 anunciados. |
| R14 | **Corrigido no caso:** callback PDF com `sucesso:false` é preservado em job failed. |
| R15 | **Parcial:** evoluções normais são particionadas por leito; ordem de UUID e caminhos de status/alta não cumprem a promessa de dez registros mais recentes por leito, T10–T11. |
| R16 | **Parcial:** há rejeição de excesso ASCII; não há proteção global demonstrada para Unicode, concorrência e gravações fora desse adaptador, T08. |
| R17 | **Parcial:** erro explícito original deixa de oferecer PDF; texto de prescrição incompleta ainda oferece, T12. |
| R18 | **Corrigido no caso:** banner estrutural é incondicional. Um banner não demonstra, por si só, conformidade clínica ou jurídica. |
| R19 | **Parcial:** sending recente permanece; após 61 s pode ser classificado incerto enquanto o fetch segue ativo, T14. Não foi demonstrado envio duplicado automático. |
| R20 | **Corrigido no caso:** quebra em espaço preserva a palavra no exemplo auditado. |

## Achados prioritários e correções propostas

As linhas abaixo apontam para o snapshot, para que futuras edições não alterem as referências. P0 significa bloqueador clínico; P1 alto; P2 médio.

### [P0] Extração CHA gera pontuação e recomendação com dados inexistentes ou negados — T01–T03

**Local:** módulo 07, `tentarCalcularDeterministico`, snapshot linha 5935.

Reproduções:

1. `CHA2DS2-VASc paciente` calcula **0/9** e recomenda não anticoagular, embora não tenha idade, sexo ou confirmação dos fatores.
2. `CHA2DS2-VASc mulher 60 anos sem IC, sem diabetes, sem AVC, sem doença vascular, sem hipertensão` produz **3/9** e recomendação forte. As regex negativas só cobrem variantes como “sem DM” e “sem HAS”, deixando positivas as menções por extenso.
3. `CHA2DS2-VASc homem 60 anos diabético` passa `ic=true` porque `/ic/` também casa dentro de “diabético”.

A função pura não alucina, mas recebe uma representação falsa do caso. Determinismo não garante correção da entrada.

**Correção:** representar cada fator como presente/ausente/desconhecido; reconhecer termos inteiros, associar negação à expressão reconhecida e pedir confirmação dos desconhecidos. Preferir formulário de fatores explícitos para escore crítico. Não inferir idade/sexo/faixas ausentes como zero. Adicionar gabaritos negativos e incompletos pelo comando público.

### [P1] MELD ainda aceita negação como diálise e encaminha faltantes à IA — T04–T05

**Local:** módulo 07, mesmo parser e fallback `/calc`.

`MELD bili 2 cr 1 inr 1 não faz hemodiálise` passa `dialise=true`; a alternativa positiva com “hemodiálise” executa antes do fallback que poderia reconhecer a negação. `/calc MELD bili 2 inr 1` aciona `processarEEntregarIA` porque o parser devolve null.

**Correção:** retornar envelope distinto para calculadora desconhecida e calculadora conhecida incompleta/inválida; o segundo nunca deve cair em IA. Reconhecer negação antes dos padrões positivos e validar o critério de diálise informado, sem reduzir tudo a presença de palavra.

### [P1] Proteção da gasometria não cobre falha do motor nem contradição da IA — T06–T07

**Local:** módulo 04, `gerarAnaliseGasometriaComIA`, snapshot linha 3704.

O cabeçalho puro é uma melhoria concreta. Entretanto, a saída da IA é concatenada livremente: um mock retornando “pH 6.00; ânion gap 99” aparece junto ao pH real 7.40. Se a função pura lançar exceção, o catch apenas registra o erro e continua para a IA; nesse caso não aparece nem o laudo puro nem o resumo bruto prometido como incondicional.

**Correção:** falha do motor deve interromper a análise; separar resultado puro de interpretação, com contrato explícito que não permita ao campo interpretativo substituir ou inventar resultados calculados. Tratar contradições antes da entrega. Não anunciar “blindagem total” baseada em instrução de prompt.

### [P1] Orçamento conta caracteres e a própria poda viola a deduplicação — T08–T09

**Local:** módulo 11, `totalBytes`, linha 6982; `podarPersistenciaAntiga`, linha 6990.

`totalBytes()` usa `.length`, isto é, unidades UTF-16, não bytes UTF-8. Quarenta pedidos sintéticos com caracteres multibyte totalizam **613.466 bytes UTF-8** no mock e são aceitos. Cada parte individual permanece pequena; é o orçamento total que falha. Este teste demonstra o erro da contagem local; não afirma que o GAS aceitou esse conteúdo real.

A partir da pressão de 350 mil unidades, a poda apaga até 20 inbox `done` **sem verificar idade**. No teste, um pedido recém-concluído perde a identidade de deduplicação e o mesmo update executa novamente, sem esperar sequer uma hora. A correção R16 reintroduz uma variante de R12.

**Correção:** contabilizar bytes na codificação adotada, reservar margem para manifesto/partes simultâneas e aplicar orçamento compartilhado sob lock, incluindo gravações de leitos. Não podar tombstones válidos; separar deduplicação compacta de conteúdo descartável e rejeitar ingresso quando não houver espaço seguro.

As cotas documentadas são 9 KB por valor e 500 KB por armazenamento de propriedades; a documentação também informa que excedê-las interrompe a execução. [Cotas oficiais do Apps Script](https://developers.google.com/apps-script/guides/services/quotas).

### [P1] Histórico não conserva os dez registros cronologicamente mais recentes — T10–T11

**Local:** módulo 09, `podarHistorico`, snapshot linha 6507, e métodos de status/alta.

Ordenar chaves contendo UUID ordena identificadores, não datas. Com UUIDs em ordem lexicográfica inversa à cronologia, a poda preserva E0 e elimina E9. Além disso, `atualizarStatusLeito` e `desocuparLeito` ainda chamam a poda sem ID e escrevem chaves antigas sem o ID do leito. Esses caminhos continuam sujeitos a retenção global.

**Correção:** centralizar gravação de histórico de evolução/status/alta, indexar por paciente/episódio/leito e ordenar por timestamp mais sequência. Aplicar a mesma política em todos os caminhos; não usar UUID como relógio.

### [P1] Elegibilidade do PDF ainda depende de regex de texto — T12

**Local:** módulo 07, `processarEEntregarIA`, snapshot linha 5490.

`⚠️ Prescrição incompleta: informe peso e alergias.` recebe botão de gerar PDF. A afirmação do walkthrough de que o detector rejeita o marcador ⚠️ não corresponde ao código. Bloquear indiscriminadamente esse emoji também seria inadequado, pois o aviso normal de rascunho o utiliza.

**Correção:** saída estruturada `{ok, pendencias, receita, erro}`; PDF habilitado apenas com dados obrigatórios validados e etapa de conferência. Preservar aviso normal de rascunho sem confundi-lo com erro.

### [P1] R11 permanece sem deadline e sem a flag anunciada — T13

**Local:** módulo 08, `doPost`, snapshot linha 6378; worker do módulo 11.

A busca nos fontes e master não encontra `TELEGRAM_ASYNC_WORKER`. Mesmo configurando essa propriedade como `true`, `doPost` executa o handler antes de retornar. Um handler simulado que consome 20 segundos não é interrompido. O limite de 180 segundos é verificado **entre** jobs; ele não cancela uma chamada externa já iniciada. Os campos `startedAt` controlam classificação posterior, não duração do webhook.

A limitação citada sobre `everyMinutes(1)` é real para esse método: seus intervalos aceitos começam em um minuto. Isso explica o trade-off de latência, mas não cria uma garantia de timeout no desenho atual. [ClockTriggerBuilder oficial](https://developers.google.com/apps-script/reference/script/clock-trigger-builder).

O alvo de cinco segundos vem do pedido original; não o trato como SLA universal documentado do Telegram. Para preservá-lo, separar ingresso/ACK do trabalho pesado. Se houver exigência de resposta imediata, estudar caminho restrito para cálculos rápidos ou infraestrutura de worker adequada; não executar arbitrariamente IA/PDF sob alegação de timeout inexistente.

Os testes R12/R14 chamarem `doPost` apenas reproduziam a arquitetura existente. Eles podem enfileirar, invocar o worker explicitamente e só então conferir o estado. Não constituem requisito para manter processamento síncrono.

### [P2] Prazo de envio não prova idempotência estrita — T14

**Local:** módulo 11, `processarCaixaSaida`, snapshot linha 7139.

O caso imediato de R19 foi corrigido. Com fetch ainda ativo após 61 segundos, outra passagem converte sending em uncertain. O teste não observa reenvio automático: não há base para repetir a alegação do walkthrough de que esse estado, sozinho, induziria retransmissão prematura. Tampouco há base para anunciar idempotência estrita apenas pelo prazo.

**Correção:** ownership e lease ligados à execução, recuperação só após abandono comprovável e conclusão condicionada à versão/dono. Documentar a incerteza inevitável quando um envio externo pode ter ocorrido sem confirmação persistida.

### [P2] Classificação CHA aparece como `undefined` — T15

**Local:** módulo 07, parser CHA dentro de `tentarCalcularDeterministico`.

O parser lê `rCha.rotulo`, mas `sucesso()` expõe a classificação em `estado`. A mensagem observada contém `Classificação: undefined`.

**Correção:** usar o contrato público correto ou renderizar o cartão puro diretamente; validar o texto final, não só o escore numérico.

## Plano de fechamento

1. Corrigir primeiro os falsos fatores de CHA, o fallback de MELD e o comportamento de gasometria em falha. Testar linguagem negativa e campos desconhecidos pela interface pública.
2. Resolver conjuntamente orçamento e deduplicação: uma correção não deve invalidar a outra sob pressão. Incluir Unicode, concorrência e falhas de escrita nos testes.
3. Unificar histórico e validação de receita em contratos estruturados, com retenção cronológica e estado explícito de pendência.
4. Implementar ou retirar do walkthrough a flag async; definir explicitamente a arquitetura aceita para latência e timeout. Melhorar ownership da outbox sem prometer entrega exatamente uma vez não demonstrada.
5. Atualizar a matriz de aceitação: cada requisito deve ter exemplos positivos, negativos, incompletos e de falha. Corrigir as declarações de “proteção absoluta”, “100% de precisão” e “perfeita adesão”, que excedem a evidência.

## Artefatos reproduzíveis

[Verificação da terceira rodada](</home/wagmoraes/Projetos IA/Rotina/reviews/terceira_rodada_2026_10_04_verificacao.cjs>) · [Evidências e saídas capturadas](</home/wagmoraes/Projetos IA/Rotina/reviews/terceira_rodada_2026_10_04/evidencias.json>)

```sh
node reviews/terceira_rodada_2026_10_04_verificacao.cjs reviews/terceira_rodada_2026_10_04/master_auditado.js
```

O script distingue `CORREÇÃO` de `DEFEITO`: exit code zero confirma que todas as verificações, inclusive as que reproduzem falhas, ocorreram como documentado. Ele não é um selo de aprovação de produção. As auditorias e reproduções anteriores foram mantidas.
