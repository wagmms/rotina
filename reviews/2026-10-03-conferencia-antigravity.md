# Conferência das correções do Antigravity e proposta de UX

O código melhorou, mas a auditoria **não está encerrada**. A revisão abaixo compara o walkthrough fornecido com os arquivos atuais e verifica cenários de falha e interação.

## Validação realizada

- **55 testes passaram em 2,17 s**, em cópia temporária para evitar alteração dos artefatos pelo teste de build.
- `ultra_rotina_master.js`, `gas_deploy/Code.js` e `automations/google_apps_script_master_assistant.js` são idênticos byte a byte no momento da leitura.
- `reviews/telegram_recheck.cjs` reproduziu **11 comportamentos problemáticos** com mocks e dados sintéticos, sem rede. Execute `node reviews/telegram_recheck.cjs` para conferir. As asserções documentam bugs atuais; não aprovam a implementação.
- Não houve publicação, acesso à conta Telegram, envio de mensagens nem validação clínica de fórmulas. Configuração real, permissões do Drive e rotação de tokens permanecem não verificadas.

## O que foi corrigido e o que ainda falta

| Área | Resultado da conferência |
|---|---|
| Segredos nos fontes ativos | Removidos do ConfigService e dos três artefatos citados. Ainda há padrões de credenciais em arquivos antigos; rotação não verificada. |
| Autenticação | Verifica o segredo se configurado. Ausência de segredo ou chat permitido deixa a proteção aberta. |
| Concorrência | Lock negado impede execução. Porém, a mensagem é descartada sem fila ou resposta HTTP de falha. |
| Deduplicação | Reserva sob lock e remove cache em exceção. Ainda confirma recebimento em falhas; handlers retornando false são marcados como concluídos. |
| PDF | Removida a concessão pública explícita para novos PDFs. Isso não revoga arquivos anteriores nem elimina permissões herdadas da pasta. |
| Peso | Comandos /dva e /sri melhoraram. O caminho de linguagem natural continua extraindo o primeiro número como peso. |
| Enfermaria | Serviço devolve falha de persistência. O handler não apresenta esse erro, e foi introduzido truncamento silencioso. |
| Hábitos | Data original é usada. A confirmação visual ainda ocorre quando o Notion retorna null. |
| HTTP 429 | Evita retry imediato indevido. Esperas maiores que 2 s continuam descartando a resposta. |
| Telethon | Retornos booleanos, stderr e saída não zero foram implementados nos comandos inspecionados. Não testado contra conta real. |
| Build | Valida temporário antes da troca. Sem Node, ainda aprova o build e imprime validação 100% OK. |

## Achados que precisam de correção

### [P1] 1. Configuração ausente desativa a autenticação

`src/08_main.js:28–35,49–59`: `if (webhookSecret)` torna a autenticação opcional. A expressão da autorização também só restringe o chat se `permitidoChatId` existir. Reproduzi execução sem segredo e execução de outro chat quando o ID permitido está ausente. `ConfigService.exigir()` foi criado, mas não é usado no webhook.

**Aceite:** ausência de qualquer configuração obrigatória impede todos os handlers; segredo incorreto e chat não autorizado são rejeitados independentemente. Testar separadamente cada condição. O probe antigo mistura falta de autenticação com lock negado: zero handlers nesse cenário só prova o bloqueio, não a autenticação.

### [P1] 2. “Busy” não é status HTTP; recuperação não funciona como o relatório sugere

`src/08_main.js:72–74,112–139`: `createHtmlOutput("Busy")` muda o corpo da resposta, não o transforma em HTTP 503. O catch termina devolvendo `OK`. Remover uma chave do cache permite uma chamada manual posterior, mas não solicita retry ao Telegram. O Telegram documenta retries em respostas HTTP fora de 2xx. [Bot API](https://core.telegram.org/bots/api#setwebhook), [HtmlOutput](https://developers.google.com/apps-script/reference/html/html-output).

O lock continua mantido durante toda a chamada de IA. Uma segunda mensagem pode esperar 3 s, receber “Busy” e não ficar armazenada em lugar algum. Para `429` com espera de 5 s, reproduzi perda da resposta e `upd_1 = done`.

**Aceite:** persistir o trabalho antes de confirmar recebimento, processá-lo com recuperação/retentativas e efeitos idempotentes. Alternativamente, usar um receptor que controle os códigos HTTP. Não basta trocar “Busy” por “503” no texto, nem simular uma segunda chamada ao `doPost` no teste.

### [P1] 3. Linguagem natural ainda confunde idade com peso

`src/07_telegram_handlers.js:466–470`: em “nora paciente 65 anos, peso 80 kg”, o caminho `CLINICO_EMERGENCIA` passou **65** à calculadora. O parser usa o primeiro número, sem associá-lo à unidade.

**Aceite:** compartilhar um parser de peso entre todos os pontos de entrada; só aceitar peso identificado explicitamente e solicitar esclarecimento quando ausente ou ambíguo. A validação numérica isolada não distingue uma idade válida de um peso válido.

### [P1] 4. Novos problemas de integridade e apresentação na enfermaria

`src/09_enfermaria.js:89–93`: texto acima de 800 caracteres é cortado e salvo com sucesso, sem consentimento ou aviso. Uma observação relevante no final desaparece. Esse limite por leito não garante a cota total; `jsonStr.length` mede unidades UTF-16, não bytes, e o limite de 8500 só gera log.

`src/07_telegram_handlers.js:293–294`: o serviço retorna `{ sucesso:false, erro:... }`, mas o handler usa `.mensagem`, que está ausente. Reproduzi falha de gravação sem qualquer resposta e com update concluído.

`src/09_enfermaria.js`, métodos `formatarPainelBordo` e `obterTextoConsolidadoParaPassagem`: a nova possibilidade de `carregarLeitos()` retornar null não foi tratada antes de `Object.keys`. A consulta de leito também confunde falha de leitura com leito vago.

**Aceite:** preservar o texto completo ou rejeitar antes de alterar dados; distinguir indisponível/vazio; unificar o formato dos erros e exibi-los. Usar armazenamento adequado ao volume e verificar bytes reais.

### [P2] 5. Notion indisponível ainda produz “✅ Registrado”

`src/07_telegram_handlers.js:580,606`: `gravouComSucesso !== false` aceita null, que é justamente o retorno de falha de `chamarNotionAPI`. Reproduzi atualização visual com marcação de sucesso após retorno null.

**Aceite:** confirmar uma resposta válida antes de marcar o botão. Testar resposta de sucesso, null, false e exceção, além da data original do check-in.

### [P1] 6. Troca visual de ação não troca o contexto clínico

`src/07_telegram_handlers.js:42–44,98–104`: “Prescrever” apenas manda instruções, sem limpar nem substituir `ctx_`. Com SOAP anterior ativo, a próxima mensagem segue para SOAP e recebe os dados do caso anterior. Reproduzi esse fluxo. “Gaso” e “Preceptor Voz” têm o mesmo padrão de instruções sem seleção explícita de modo. “Novo SOAP” limpa o contexto, mas não fixa o modo SOAP.

**Aceite:** separar `modo`, `caso`, `etapa` e dados. Ao trocar de ação, mostrar se vai continuar o mesmo caso ou iniciar outro; nunca anexar dados anteriores implicitamente após uma troca de modo. `/cancelar` deve cancelar a etapa pendente de modo previsível.

## Ressalvas ao walkthrough

- Há padrões de segredos remanescentes em `changes.diff`, `combined_automations.js`, `automations/notion_sync_hub.py`, `automations/bot_medicina_amiga.js`, `automations/parte_1_principal.js` e três scripts em `archive/`. Foram contabilizados sem imprimir valores. Não é comprovação de credenciais válidas nem de acesso por terceiros.
- Remover `setSharing` é correto, mas não garante “exclusivamente ao proprietário”: permissões da pasta podem ser herdadas. Arquivos antigos mantêm suas permissões até revisão. [Drive: propagação de permissões](https://developers.google.com/workspace/drive/api/guides/manage-sharing#how_permissions_propagate).
- Os cinco testes novos não cobrem todas as nove áreas anunciadas na docstring. Não há neles validação real de rejeição por segredo, data/erro dos hábitos, permissões de PDF ou saída do cliente Python.
- `configurarWebhookTelegram()` ainda usa `drop_pending_updates=true`; reconfigurar descarta a fila pendente. Também ignora falha ao salvar o novo segredo. Isso precisa ser uma decisão explícita de manutenção, e a configuração deve falhar se não puder persistir.
- O guia de configuração omite `WEB_APP_URL` e IDs das planilhas, agora sem valores de fallback. A presença de `deploy.py` e artefatos locais sincronizados não comprova publicação nem Script Properties corretas.

## Proposta de UI/UX

### Prioridade 1 — Tornar o estado da conversa previsível

Menu inicial de seis ações: **Novo SOAP · Prescrever · Enfermaria · Calculadoras · Minha rotina · Ajuda**. “Minha rotina” agrupa agenda, tarefas e hábitos. Mantenha todos os comandos atuais como atalhos para usuários frequentes.

Cada seleção abre um fluxo e informa o modo: “Receita · novo caso — envie os dados”. Havendo caso em andamento, oferecer “Usar este caso” e “Novo caso”. Para comandos incompletos, pedir somente o campo faltante: após escolher noradrenalina, perguntar peso; depois apresentar diluição com unidade explícita. Não presumir dados.

Critério: em teste sequencial SOAP → Prescrever → mensagem livre, o destino é receita e os dados usados são os escolhidos pelo usuário.

### Prioridade 2 — Respostas organizadas para leitura rápida

Usar título curto, resumo primeiro, dados utilizados, pendências e ações. Menos caixa alta, slogans (“radical”, “oficial”, “100%”) e separadores longos. Um emoji por seção é suficiente. Detalhes ficam acessíveis por botão; informações necessárias à interpretação do resultado continuam visíveis.

Para IA: **“Rascunho para revisão”**, com dados não informados identificados. Para cálculo: exibir entradas, unidades e diluição junto ao resultado, além de “Ver cálculo”. Não misturar a condição “cálculo determinístico” com “texto gerado por IA”. Essa distinção é de produto e origem da resposta, sem atestar validade clínica.

Exemplo de estrutura, sem conteúdo clínico real:

```text
SOAP · rascunho
Caso 04 · atualizado hoje às 14:10

Resumo
[Uma síntese do caso informado]

Pendências
[Campos não informados]

[Ver completo] [Complementar]
[Texto para copiar] [Salvar no Notion]
```

### Prioridade 3 — Ações contextuais que não desaparecem

Hoje, salvar no Notion remove todo o teclado e apaga o cache (`src/07_telegram_handlers.js:672–673`), inutilizando também PDF, áudio e round. Após salvar, alterar somente a ação “Salvar” para “Salvo” e conservar as outras opções e o conteúdo necessário. Ações independentes precisam de estados independentes.

Para texto longo, disponibilizar uma versão limpa para copiar. O botão nativo de cópia serve para trechos curtos; não prometer cópia integral de documentos grandes. Para navegação e atualização, editar a mensagem existente em vez de empilhar cópias. [Telegram: botões](https://core.telegram.org/bots/api#inlinekeyboardbutton), [cópia](https://core.telegram.org/bots/api#copytextbutton), [edição](https://core.telegram.org/bots/api#editmessagetext).

### Prioridade 4 — Enfermaria útil no celular

Painel resumido com leito, status confirmado pelo usuário, data/hora e pendências; botões por leito e paginação. Abrir um leito mostra o texto completo e ações Atualizar / Passagem / Alta. “Atualizar painel” deve editar o painel atual. Exibir a data, não apenas a hora, para não fazer uma evolução de ontem parecer atual.

Não rotular gravidade automaticamente por substring. O código atual pode interpretar “sem choque” como crítico e palavras contendo “uti” como referência à UTI. Tratar o status como informação explícita, com origem e horário. Antes da alta, mostrar qual leito será alterado; manter histórico para recuperação.

### Prioridade 5 — Espera e falha com recuperação

Exibir um recibo de processamento vinculado ao pedido; substituir pelo resultado ou por erro compreensível. Só oferecer “Tentar novamente” se o trabalho estiver salvo e a repetição não duplicar efeitos. Um indicador visual de digitação não resolve a perda de mensagens nem substitui a fila.

Formato de erro: “Não consegui salvar no Notion. Seu texto está preservado.” A afirmação de preservação deve corresponder a persistência real. Oferecer ações “Tentar novamente” / “Ver texto”, sem exibir detalhes internos da exceção.

### Implementação sugerida

1. Fechar P1 de autenticação, entrega, peso e integridade antes de ampliar funcionalidades.
2. Introduzir estado de conversa estruturado com versão, modo, caso, etapa e validade; testar transições reais.
3. Centralizar renderização das respostas e geração dos botões; separar dados clínicos do texto decorativo.
4. Migrar teclado/menu e ações por resultado, preservando atalhos.
5. Validar no Telegram real com casos sintéticos: toques repetidos, contexto expirado, resposta longa, rede indisponível e recuperação. Registrar os resultados sem dados clínicos nem credenciais.

O protótipo apresentado na conversa demonstra modos e navegação propostos. Não altera a interface real nem executa suas ações. Aparência de botões e mensagens no Telegram depende do cliente; o estado ativo deve aparecer no texto do bot, não exigir uma barra personalizada da aplicação.
