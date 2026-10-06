# Revisão geral do Ultra Rotina — erros e otimizações

## Resultado e escopo

**Seis falhas foram reproduzidas**, além de um custo elevado de leitura medido no worker ocioso. Prioridade: seleção da calculadora, estado de entrega, isolamento do histórico e recuperação de armazenamento.

O master e os 13 módulos JavaScript locais são idênticos aos da última correção nesta conversa. SHA-256: `7950f3519415ab18958af91296cd067941f31ed1ce881a24becbcd14b8c39c15`. Esta é uma revisão mais ampla dessa versão, não uma verificação de mudanças remotas no Apps Script. Não há repositório Git inicializado neste diretório; a comparação foi feita por hashes e snapshots.

Revisei roteamento e contexto, calculadoras, persistência/filas, enfermaria, entrega de mensagens e documentos, agenda, integração Notion e cadeia de IA. Não alterei produção nem executei os scripts de testes ao vivo na raiz. As evidências usam serviços simulados; não houve acesso a credenciais, mensagens reais ou dados de pacientes. Esta revisão de software não é uma validação clínica integral das fórmulas e protocolos.

## Achados priorizados

### R01 · P1 — pedido explícito de CKD-EPI executa outra fórmula

[07_telegram_handlers.js:1418](</home/wagmoraes/Projetos IA/Rotina/src/07_telegram_handlers.js:1418>), `tentarCalcularDeterministico`.

Entrada reproduzida pela rota real de texto:

```text
/calc CKD-EPI homem 60 anos cr 1.2 peso 70 kg
```

A resposta identifica **Cockcroft-Gault**, com `65 mL/min`. A função pura `ckdEpi2021(1.2, 60, false)` existe e retorna `69,2 mL/min/1,73 m²`. Estes são resultados do código, não uma recomendação clínica.

A condição genérica `creatinina + peso` captura o pedido antes de respeitar a identidade da calculadora. Informar dados adicionais muda indevidamente a operação solicitada.

**Correção:** resolver primeiro o identificador no catálogo e só depois extrair seus parâmetros; heurísticas genéricas devem valer apenas na ausência de identificador explícito. Mapear cada calculadora anunciada para parser, função pura e instruções. Testar que dados extras não alteram a função invocada.

### R02 · P1 — entrega incerta marca o pedido como concluído e remove o original

[07_telegram_handlers.js:762](</home/wagmoraes/Projetos IA/Rotina/src/07_telegram_handlers.js:762>), `processarEEntregarIA`; [11_entrega_confiavel.js:138](</home/wagmoraes/Projetos IA/Rotina/src/11_entrega_confiavel.js:138>), `processarFilaTelegram`.

Simulei HTTP 500 na entrega de um SOAP. A outbox terminou em `uncertain`, mas a inbox ficou em `done`, com `update` reduzido a `{update_id:201}`. O texto original deixa de estar disponível para `/pedido 201`. O resultado gerado ainda existe no payload da outbox; portanto, não se trata de perda de todos os dados.

O wrapper descarta o retorno de envio. O worker considera `undefined` sucesso e compacta o pedido mesmo sem confirmação de entrega.

**Correção:** retornar estado explícito dos handlers; distinguir processamento concluído, entrega pendente, entrega confirmada e resultado incerto. Preservar o original enquanto necessário à recuperação e vincular inbox/outbox. Não repetir automaticamente efeitos externos incertos. Testar 200, 429, 500, exceção de rede e mensagens segmentadas.

### R03 · P1 — entregas incertas acumulam até bloquear novos pedidos

[11_entrega_confiavel.js:52](</home/wagmoraes/Projetos IA/Rotina/src/11_entrega_confiavel.js:52>), `podarPersistenciaAntiga`; [11_entrega_confiavel.js:197](</home/wagmoraes/Projetos IA/Rotina/src/11_entrega_confiavel.js:197>), `processarCaixaSaida`; [08_main.js:12](</home/wagmoraes/Projetos IA/Rotina/src/08_main.js:12>), limpeza administrativa.

O coletor automático remove outbox `done`, mas não `failed`/`uncertain`. A limpeza administrativa também não resolve `uncertain`. A poda por pressão de espaço só considera inbox concluída.

No teste, **59 entregas incertas**, com texto de 3.250 caracteres multibyte cada, ocuparam **398.591 bytes**, incluindo chaves e valores. Após avançar oito dias, executar o coletor e a limpeza autenticada, os 59 registros continuaram presentes. Um novo pedido de 4.000 caracteres foi recusado pelo orçamento local de 400.000 bytes.

O mock não aplica a cota do GAS: a recusa demonstrada é do próprio código. Manter efeitos incertos para conferência é correto; deixá-los ocupar indefinidamente o armazenamento operacional não oferece recuperação sustentável.

**Correção:** criar fluxo explícito de consulta e resolução dessas pendências, reservar espaço operacional e arquivar payloads fora do armazenamento de fila antes de compactá-los. Preservar metadados mínimos de deduplicação. Definir retenção e testar recuperação sob pressão sem descarte silencioso nem reenvio automático.

### R04 · P1 — poda de um leito remove o histórico de outro

[09_enfermaria.js:83](</home/wagmoraes/Projetos IA/Rotina/src/09_enfermaria.js:83>), `podarHistorico`.

O identificador `A_B` é aceito pela validação. Seu histórico começa por `LEITO_HIST_A_B_`, que também corresponde ao prefixo de busca do leito `A`: `LEITO_HIST_A_`.

Reprodução: criar oito históricos de `A_B` e depois atualizar `A` doze vezes. Os históricos de `A_B` caem de **8 para 0**. O registro ativo de `A_B` permanece, mas seu histórico é perdido. A extração de timestamp por posição de `_` também interpreta esse identificador incorretamente.

**Correção:** usar fronteiras inequívocas nas chaves e propriedade explícita de identificação do leito; selecionar por igualdade, não por prefixo ambíguo. Migrar/interpretar o histórico legado antes de podar. Acrescentar testes com `A`, `A_B` e IDs semelhantes.

### R05 · P2 — resposta por áudio não recebe o caso SOAP ativo

[07_telegram_handlers.js:1126](</home/wagmoraes/Projetos IA/Rotina/src/07_telegram_handlers.js:1126>), `processarMensagemVoz`.

Com `modo_123.data` contendo um caso, a transcrição simulada `Me responda em áudio` chama o preceptor com essa própria frase, sem o caso. A rotina consulta a chave legada `ctx_123`, removida quando o estado canônico é definido.

**Correção:** unificar a obtenção do contexto de texto, áudio, imagem e guias em uma função que respeite modo, expiração e paciente atual. Testar pedido de áudio sem novo relato, atualização por áudio e contexto expirado. A correção anterior dos guias resolveu aquele caminho, mas não esta ramificação de voz.

### R06 · P2 — “Psicoterapia” é classificada como plantão

[06_rotina_agenda.js:148](</home/wagmoraes/Projetos IA/Rotina/src/06_rotina_agenda.js:148>), `detectarPlantaoStatus`.

Um evento chamado `Psicoterapia`, começando em uma hora, retorna `ehPlantaoHoje:true`. A busca usa substrings curtas, incluindo `ps`, `uti` e `cti`. O resultado pode alterar o briefing e silenciar o check-in como se houvesse um plantão.

**Correção:** preferir marcador explícito, calendário/categoria dedicada ou regras configuráveis. Se mantiver reconhecimento por título, usar palavras completas e contexto; testar falsos positivos como psicoterapia e títulos com fragmentos semelhantes.

## Otimizações

### 1. Evitar reler toda a inbox concluída a cada minuto

Medição com fila sem pedidos pendentes, sem chamadas de rede:

| Pedidos concluídos retidos | `getProperty` por execução | `getProperties` por execução |
|---:|---:|---:|
| 0 | 0 | 2 |
| 10 | 20 | 2 |
| 100 | 200 | 2 |
| 300 | 600 | 2 |

Cada pedido concluído ainda exige leitura de manifesto e conteúdo. Se 100 registros forem mantidos durante um dia inteiro e o gatilho executar a cada minuto, são **288.000 chamadas individuais de leitura/dia**, além das listagens. É uma projeção do cenário medido, não consumo observado da conta.

A documentação informa 50.000 operações diárias de leitura/escrita em Properties para contas pessoais e 500.000 para Workspace; também limita o armazenamento a 500 KB e a execução a seis minutos. Esses limites tornam relevante reduzir leituras e reservar espaço para recuperação. [Cotas oficiais do Apps Script](https://developers.google.com/apps-script/guides/services/quotas).

**Proposta:** índice pequeno de IDs ativos e marcadores compactos para deduplicação; limpeza por lotes fora do caminho crítico; leitura em lote dos metadados. Meta: worker sem trabalho não carregar payloads de pedidos concluídos.

### 2. Evitar consultas de serviço dentro de ordenações e varreduras

`processarCaixaSaida` chama `PersistenciaBot.ler` dentro do comparador de ordenação. `entregarTelegramPersistente` percorre outras entregas antes de cada envio. `PersistenciaBot.salvar` lê todas as propriedades para recalcular bytes em cada transição.

**Proposta:** carregar uma visão dos registros uma vez por passagem, ordenar em memória e manter um orçamento de bytes atualizado sob a mesma disciplina de concorrência das escritas. Não usar um contador sem proteção: isso trocaria custo alto por inconsistência. Medir chamadas de serviço, não apenas milissegundos no mock local.

### 3. Consolidar contratos para reduzir duplicação e regressões

Há múltiplos roteadores de calculadoras, duas formas de contexto (`modo_`/`ctx_`) e handlers com retornos booleanos, objetos ou ausência de retorno. R01, R02 e R05 são consequências concretas dessas divergências.

**Proposta:** catálogo com função/parser por calculadora; um serviço de contexto; contrato único de resultado do handler. Manter fluxos de cópia e persistência explícitos, em vez de inferir sucesso pelo texto ou por retorno ausente.

### 4. Usar o modo JSON da infraestrutura nas respostas estruturadas

SOAP, guia dirigido e gasometria solicitam JSON, mas entram por `executarRaciocinioClinico`, que chama `_iaExecutar` sem `json:true`. A infraestrutura já distingue JSON no tratamento de truncamento e pós-processamento.

**Proposta:** expor uma chamada estruturada e validá-la por schema antes de renderizar. É uma oportunidade de robustez; não foi contada como um sétimo defeito reproduzido. Manter o fallback conservador já implementado.

## Testes e evidências

- `pytest -q tests`: **106 aprovados em 5,15 s**, incluindo os 23 testes da correção anterior.
- Auditoria inicial Node: **37/37**; SOAP e exames especiais: **5/5**.
- Build executado na cópia temporária: corpo gerado igual ao master auditado.
- Nova reprodução independente: **6/6 falhas confirmadas**.
- Master e fontes do workspace permaneceram inalterados.

As suítes existentes continuam passando porque não exercitam esses seis cenários. Recomendo corrigir R01/R02/R04 primeiro, depois R03 junto com o índice de filas, e por fim unificar contexto e reconhecimento da agenda.

- [Reprodutor e medição de custo](</home/wagmoraes/Projetos IA/Rotina/reviews/revisao_geral_2026_10_04_repro.cjs>)
- [Logs completos e identificação](</home/wagmoraes/Projetos IA/Rotina/reviews/revisao_geral_2026_10_04/evidencias.json>)
- [Master auditado preservado](</home/wagmoraes/Projetos IA/Rotina/reviews/revisao_geral_2026_10_04/master_auditado.js>)

```bash
node reviews/revisao_geral_2026_10_04_repro.cjs reviews/revisao_geral_2026_10_04/master_auditado.js
```

Neste reprodutor, passar confirma a presença do defeito. A execução é offline; resultados não demonstram a configuração ou o comportamento da implantação remota.
