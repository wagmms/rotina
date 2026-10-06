# Revalidação da auditoria — Ultra Rotina — 04/10/2026

**Parecer: a declaração “37 defeitos corrigidos, 100% seguro/pronto para produção” não está demonstrada.** Há melhorias verificáveis, mas 20 cenários de defeito continuam reproduzíveis, incluindo cálculos divergentes, cálculo delegado à IA, mistura de amostras, perda de rastreabilidade de falhas e esgotamento de fila. São 20 cenários, alguns com a mesma causa raiz; não representam uma contagem exaustiva de todos os defeitos do sistema.

## Evidência e escopo

Foram confrontados o walkthrough anexado, a suíte anexada e os módulos atuais com a auditoria anterior. Os textos anexados foram tratados como alegações a verificar. Nenhuma alegação de homologação substituiu inspeção ou teste.

Houve alterações externas nos fontes durante a revisão. A conclusão abaixo refere-se à cópia congelada [master_auditado.js](</home/wagmoraes/Projetos IA/Rotina/reviews/revalidacao_2026_10_04/master_auditado.js>), com 7.645 linhas e SHA-256 `1d25ecc35dc2c6e3e805debb10342bdb1db478f6d90b2a06493bbf67e2173d8b`. As linhas da matriz referem-se a essa cópia. O corpo gerado pelo build na cópia temporária coincide com esse master; o cabeçalho temporal não faz parte da comparação.

| Verificação | Resultado | Limite da conclusão |
|---|---|---|
| Sintaxe JavaScript | Aprovada | Não valida comportamento |
| Suíte anexada `test_auditoria_resolvida.cjs` | 37/37 passaram | Existem asserções insuficientes ou que aprovam o próprio defeito |
| pytest, incluindo build, em cópia temporária | 101/101 passaram, em 7,66 s | Testes com mocks e verificações estruturais; não é homologação de produção |
| Reprodução independente | 20/20 defeitos reproduzidos | Passar aqui significa confirmar defeito, não confirmar correção |

A primeira cópia temporária apresentou 99 aprovados e uma falha estrutural; depois houve mudanças externas, inclusive um catálogo de comandos que satisfaz esse teste. A nova cópia obteve os 101 resultados acima. Não atribuo a falha antiga à versão final.

Nenhum fonte de produção foi modificado por esta revisão. Foram criados somente artefatos em `reviews/` e cópias temporárias. Não foram feitas chamadas reais ao Telegram, Notion, Drive ou provedores de IA, nem deploy.

## Quadro resumo e nota arquitetural

| Lente | Avaliação atual |
|---|---|
| Segurança/autenticação | Validação de segredo e chat permanece no ingresso normal. A ação administrativa `configure` precede a validação do chat; `clean` é uma mutação GET autenticada pelo mesmo segredo. Não foi observado bypass sem segredo, mas permanece a separação inadequada de administração e webhook. ACL real de arquivos Drive e logs em produção não foram homologados. |
| Concorrência e persistência | Parcialmente corrigida. Releitura da outbox sob lock fecha o caso de snapshot antigo. Faltam orçamento global de bytes, retenção coerente, contagem de fila ativa e tratamento consistente de execução em curso. |
| Clínica e determinismo | Reprovada para o requisito de cálculos críticos exclusivamente puros. MELD diverge na rota de comando; gasometria e diversos `/calc` ainda dependem de IA. |
| UX e estado | Melhorou a limpeza de modos, status não confirmado, callbacks e parte da segmentação. Histórico é podado globalmente e outra função ainda corta palavras. |
| Integrações/resiliência | Melhoraram falhas específicas do Notion e o retorno do PDF. O callback do PDF ignora esse retorno e o worker registra conclusão indevida. |
| Qualidade/testabilidade | Build reproduzível e suítes executáveis. A relação entre requisitos, asserções e conclusão de segurança permanece insuficiente. |

**Nota arquitetural:** a persistência prévia do update é útil, mas não torna o processamento assíncrono quando o próprio `doPost` executa o worker. A decisão registrada no walkthrough mantém conscientemente uma violação da restrição de resposta rápida definida no pedido original. O limite de cinco segundos é tratado aqui como requisito do usuário, não como SLA universal documentado do Telegram.

## Matriz de achados prioritários

P0 = bloqueador de segurança clínica; P1 = alto; P2 = médio. Cada R corresponde a uma reprodução no arquivo independente.

| ID / prioridade | Módulo, função e linha do snapshot | Cenário comprovado / impacto | Correção concreta |
|---|---|---|---|
| R01 **P1** | 07, `tentarCalcularDeterministico`, 5921 | Chama `meld(bili, inr, crm, ...)`, mas a assinatura é `(bilirrubina, creatinina, inr, ...)`. `bili 2 cr 4 inr 1 na 132` resulta em **MELD 25 / MELD-Na 27** pelo parser; a função pura, com os parâmetros corretos, retorna **22 / 25**. | Passar `meld(bili, crm, inr, na, dial)` e testar comando contra função pura, com valores distintos para Cr/INR. |
| R02 **P1** | 07, mesma função, 5921 | `sódio 132` casa com a alternativa sem grupo de captura; `mNa[1].replace` lança TypeError. | Agrupar as alternativas: `(?:s[oó]dio|na)\s*[:=]?\s*(\d+(?:[.,]\d+)?)`, com fronteiras de palavra e validação de captura. |
| R03 **P1** | 07, mesma função, 5921 | “sem diálise” produz `dialise=true`. Pode substituir Cr pelo valor reservado à diálise e alterar o escore. | Extrair resposta explícita, incluindo negação e critério temporal/frequência; ambiguidade deve pedir esclarecimento. |
| R04 **P1** | 07, mesma função, 5921 | Clearance com Cr, peso e idade, sem sexo, calcula como masculino. | Usar sexo ternário: informado masculino, informado feminino ou ausente. Ausente deve retornar pendência, sem cálculo nem fallback de IA. |
| R05 **P0** | 07, rota `/calc` e parser, 5921 | `/calc CHA2DS2-VASc ...` ainda chama `processarCalculadoraClinicaComIA`. Só foram acrescentados dois desvios locais, não um contrato geral de determinismo. | Mapear todas as calculadoras críticas para funções puras. Para entradas insuficientes, retornar campos faltantes; bloquear cálculo por LLM. |
| R06 **P1** | 04, `gerarAnaliseGasometriaComIA`, 3698 | Enviar apenas `pH 7.20` continua chamando a IA. Contraria a afirmação de interrupção por faltantes. | Validar os três campos essenciais antes de qualquer chamada ao modelo; retornar pendências explícitas. |
| R07 **P0** | 04, mesma função, 3698 | `pH 7.20 pCO2 30 HCO3 12 Atualização: pH 7.40` combina pH novo com pCO2/HCO3 antigos. | Selecionar um único bloco/amostra e proibir fallback de campo para o texto inteiro. Só usar amostra completa identificada. |
| R08 **P0** | 04, mesma função, 3698 | Mesmo com amostra completa, a resposta final é o texto do LLM. Mock devolvendo `pH 6.00` substitui a saída determinística; o resultado puro não é renderizado de forma protegida. | Renderizar cálculos diretamente do objeto puro. Se houver interpretação por IA, separá-la e impedir que substitua os campos calculados. |
| R09 **P1** | 02, `cha2ds2vasc`, 1113 | Mulher com HAS e nenhum outro fator pontua 2 e recebe “fortemente recomendada”. O walkthrough declara limiar ≥3 para mulheres. | No modelo VASc declarado, tratar mulher com 2 como risco intermediário; ou migrar explicitamente a VA, com pontuação, nomenclatura e limiares coerentes. |
| R10 **P1** | 02, `drogasVasoativas`, 1838 | Vasopressina mantém `taxaMlH=12`, enquanto 0,03 UI/min na tabela corresponde a 9 mL/h. A própria suíte exige que o valor divergente continue existindo. | Vincular cada vazão à dose e concentração. Remover/depreciar o campo ambíguo ou derivá-lo da mesma linha da tabela, atualizando consumidores. |
| R11 **P1** | 08, `doPost`, 6275 | Worker executa antes do retorno HTTP, podendo incluir IA, PDF e integrações. | Ingresso limitado a autenticação, persistência e ACK; executar worker por trigger. Se latência de até um minuto for inaceitável, rever infraestrutura/requisito explicitamente. |
| R12 **P1** | 08, `doGet`, 6242 | `clean` elimina `done` após uma hora. Replay aos 61 minutos executa o mesmo update novamente, apesar da promessa de 24 horas. | Política única de retenção entre worker e limpeza; separar tombstone de deduplicação de payloads operacionais. |
| R13 **P1** | 11, `enfileirarUpdate`, 6878 | 150 registros `done` ainda retidos fazem o próximo update falhar com “Fila cheia”, mesmo sem trabalho pendente. | Contar apenas trabalhos ativos na capacidade; armazenar deduplicação separadamente, com orçamento próprio. |
| R14 **P1** | 07, callback PDF, 5717; 11, worker, 6897 | O serviço PDF retorna `{sucesso:false}`, o callback ignora o retorno e o worker marca `done`, removendo o callback original. `/task` foi corrigido, mas o contrato geral não. | Propagar resultado estruturado até o worker, preservar pedido e marcar falha/incerteza conforme os efeitos já realizados. |
| R15 **P1** | 09, `podarHistorico`, 6397 | Dois leitos com 12 evoluções cada deixam somente 10 históricos globais, todos do segundo leito no cenário testado. Não são 10 por leito. | Indexar por leito/paciente, ordenar por timestamp, definir retenção explícita e arquivamento. Não prometer histórico preservado após descarte silencioso. |
| R16 **P1** | 11, `salvar` / ingresso, 6863/6878 | Mock aceita 70 pedidos de 8.000 caracteres, totalizando **589.546 bytes**, sem orçamento compartilhado. Em GAS, a cota pode interromper gravações antes disso. | Reservar bytes sob lock incluindo partes novas, versões antigas, inbox, outbox, leitos e configurações; limitar mensagem e aplicar contrapressão antes de gravar. |
| R17 **P1** | 07, `processarEEntregarIA`, 5481 | `❌ Não foi possível gerar a prescrição.` recebe botão de PDF, pois a palavra “prescrição” anula a detecção de erro. | Usar `{ok, texto, erro, tipo}` em vez de inferir sucesso por regex; habilitar exportação somente em resultado validado. |
| R18 **P1** | 10, parser/HTML do PDF, 6528 | Texto sem a palavra “rascunho” gera PDF sem banner obrigatório. | Status de revisão em metadado independente do texto; carimbo obrigatório para origem IA e liberação formal após revisão, não por substring. |
| R19 **P2** | 11, `processarCaixaSaida`, 6980 | Uma chamada concorrente durante o fetch converte `sending` ativo em `uncertain`, sem verificar dono/prazo. No teste, a conclusão posterior volta a `done`; isso não demonstra duplicação automática. | Registrar dono e lease/startedAt; recuperar apenas execução expirada e finalizar sob verificação da versão/dono. |
| R20 **P2** | 12, `uxDividirTexto`, 7077 | `abc defghij`, limite 7, produz primeiro bloco `abc def`. O corte de palavras permanece nessa rota. | Reutilizar o segmentador com busca por espaço/quebra e proteção de Unicode; testar ambas as funções. |

A indicação clínica de R09 foi confrontada com a diretriz primária ACC/AHA/ACCP/HRS 2023: mulher com VASc 2 corresponde à faixa intermediária, com anticoagulação considerada razoável, e não à mesma classe de recomendação da faixa ≥3. Isso não significa contraindicar anticoagulação nesse cenário. [Diretriz AHA](https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193).

A cota do GAS usada em R16 é 500 KB por armazenamento de propriedades e 9 KB por valor; o runtime documentado é de seis minutos por execução. O mock não aplica essas cotas: a reprodução demonstra a ausência de prevenção local, não uma gravação real bem-sucedida de 589 KB no GAS. [Cotas oficiais](https://developers.google.com/apps-script/guides/services/quotas).

## O que melhorou e o que os testes realmente demonstram

São melhorias confirmadas nos casos exercitados: expansão REMUME sem autorreferência infinita; preparo concentrado de noradrenalina coerente no código; critérios de diurese KDIGO nos casos apresentados e ausência de basal/diurese sinalizada; Glasgow-P sem inventar pupilas; cartão principal de SRI restringindo drogas selecionadas; clearance completo desviando da IA; solução concentrada reconhecida; tratamento específico de falhas de tarefas/hábitos Notion; limpeza de modo ao iniciar SOAP; status não confirmado distinguido; posologia PDF multilinha e retirada do padrão oral; escape dos campos medicamentosos testados; retorno falso do serviço PDF em falha total; HTML no fluxo testado; cópia nativa curta; limite de callback de objetos; proteção de surrogate; fallback de edição com HTTP 400. O cache de planilha agora verifica todas as partes antes de aceitar conteúdo, embora isso tenha saído dos 37 casos anexados.

Essas melhorias não demonstram os enunciados mais amplos do walkthrough:

- O teste 35, rotulado “MELD exato”, só exige `ok` e a presença da palavra MELD. Não compara um único valor esperado nem executa o parser do comando.
- O teste 7 aprova a recomendação forte para uma mulher com 2 pontos. A descrição no walkthrough chama equivocadamente o caso original de masculino.
- O teste 3 exige `taxaMlH === 12`, preservando a divergência reconhecida.
- O teste 11 permite passar qualquer resposta que não contenha `undefined`; não exige zero chamadas à IA.
- O teste 12 usa atualização completa; não testa combinação de blocos nem proteção da saída final contra alteração pela IA.
- O teste 15 verifica 31 minutos sem a limpeza GET; não exercita a política conflitante de uma hora.
- O teste 18 só atualiza um leito; não simula outras propriedades, fila, cota real nem retenção por paciente.
- O teste 17 é útil para snapshots antigos, mas os locks do harness são no-op. Não demonstra exclusão mútua real no GAS ou recuperação por lease.
- O teste 24 usa callback legado sem versão; falta cobrir a versão emitida pela interface e uma versão nova válida. A rejeição do callback legado é uma melhoria, mas não esgota o requisito.
- O teste 27 fornece a palavra “rascunho” e só verifica escape em um medicamento; não estabelece carimbo incondicional nem escape de todas as entradas possíveis.
- Os testes 36 e 37 verificam presença de strings em protocolos. Isso não homologa indicação, exclusões clínicas ou comportamento completo do roteador.
- A suite nova tem 37 testes, mas não mantém os mesmos 37 cenários anteriores: saíram webhook síncrono, `configure` e cache parcial; entraram MELD, CAD e asma. Contagem igual não prova fechamento um a um.

Há também divergências factuais no walkthrough: o código da noradrenalina concentrada descreve **8 ampolas de 4 mg em 218 mL de diluente, volume final 250 mL**, não “4 ampolas em 160 mL”; a releitura de chunks não implementa o backoff declarado; `podarHistorico` conta comprimentos de strings e remove históricos globais, sem orçamento atômico ou limpeza geral de efêmeros. Não usar o texto do walkthrough como instrução de preparo.

## Plano de refatoração recomendado

1. **Fechar determinismo clínico antes de homologar.** Corrigir R01–R09, separar extração/validação/cálculo/renderização, exigir dados explícitos e remover fallback de cálculo para IA. Toda calculadora deve ter casos numéricos conhecidos e testes pela rota pública, além da função pura.
2. **Unificar resultados de operação.** Retornar estado explícito de sucesso, falha recuperável, falha definitiva ou resultado incerto; propagar do PDF/Notion/Telegram até inbox e UI. Mensagem de erro nunca pode virar receita por conter determinada palavra.
3. **Reorganizar armazenamento.** Separar tombstones de deduplicação da fila ativa; política única de TTL; orçamento em bytes e reserva durante escrita; retenção histórica por leito/paciente com arquivo durável quando necessário. Testar estouro realista e falha em cada etapa de publicação das partes.
4. **Separar ACK e worker; finalizar concorrência.** Remover trabalho pesado do ingresso e adotar lease com proprietário. Não recuperar toda entrada `sending` como se estivesse abandonada. Testar interleavings controlados, inclusive concorrência entre limpeza, ingresso, envio e conclusão.
5. **Tornar revisão de receita uma etapa do domínio.** Validar campos estruturados e origem/status, aplicar banner por regra e verificar resultado de entrega. Revisar também restrições das pastas reais do Drive antes de qualquer homologação de produção.
6. **Reescrever a matriz de aceitação e o walkthrough.** Relacionar cada achado original ao teste que demonstra a correção, com valor esperado, cenário negativo e limite de cobertura. A suíte deve falhar quando o defeito reaparece; rótulos “seguro/exato/100%” não substituem asserções.

## Como reproduzir

Usar a cópia congelada evita que novas alterações externas mudem o resultado:

```sh
node reviews/revalidacao_2026_10_04_repro.cjs reviews/revalidacao_2026_10_04/master_auditado.js
```

Sem argumento, o script verifica o `ultra_rotina_master.js` atual. O exit code zero significa que os 20 defeitos esperados foram reproduzidos. Este arquivo é evidência de auditoria, não uma suíte de aceitação que deva continuar verde após as correções.

[Reproduções](</home/wagmoraes/Projetos IA/Rotina/reviews/revalidacao_2026_10_04_repro.cjs>) · [Resultados capturados](</home/wagmoraes/Projetos IA/Rotina/reviews/revalidacao_2026_10_04/evidencias.json>)
