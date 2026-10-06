# Auditoria integral — Ultra Rotina

Data: 04/10/2026. Objeto: `ultra_rotina_master.js`, 7.199 linhas, 13 módulos (00–12).

**Parecer: não liberar esta versão para suporte clínico operacional sem corrigir os bloqueadores.** Há cálculos críticos delegados a LLM, instruções contraditórias de preparo de noradrenalina e transformação destrutiva de prescrições em PDF. A presença de funções puras e de uma fila persistente não assegura que os fluxos reais utilizem essas proteções.

Esta é uma auditoria do código, não uma certificação clínica ou de conformidade. O arquivo auditado e os módulos `src/` foram preservados. Não foram feitos deploy, chamadas a contas reais, alterações de webhook nem operações em pacientes. Os dados de reprodução são sintéticos.

SHA-256 integral do arquivo auditado: `6eaa63ffd918c36addb99d5dd177e69e982abca0a048b2b0257a27817f12198a`. O checksum abreviado no cabeçalho corresponde ao corpo gerado pelo build; é um critério diferente do hash integral acima.

## 1. Quadro resumo e nota arquitetural

Notas de engenharia em escala 0–10, considerando o fluxo operacional completo; não representam probabilidade de segurança.

| Lente | Nota | Evidência favorável | Limitação determinante |
|---|---:|---|---|
| Segurança e autenticação | 5/10 | POST ordinário exige segredo e chat; pasta de receitas verificada como privada | Administração usa o segredo do webhook; GET destrutivo; logs sem sanitização central |
| Concorrência e persistência | 3/10 | Inbox, outbox, manifestação por versão, suspensão de envio incerto | Worker síncrono no webhook; leituras de chunks e consumidores sem exclusão comum; retenção e cotas insuficientes |
| Segurança clínica | 2/10 | Validação numérica defensiva em várias funções puras; distinção kg/mg/mL em parte das saídas | Roteamento ignora funções puras; pressuposição de peso; erros KDIGO, preparo e PDF |
| UX e estado | 4/10 | Escolha explícita de reutilizar caso; alta vinculada à versão; painel paginado | Estados auxiliares sobrevivem à troca de caso; botões antigos agem no novo ocupante; cópia não usa caminho nativo |
| Resiliência e integrações | 3/10 | Fallback de IA; 429 textual adiado com `retry_after` | Laço infinito; sucesso falso; resultados só em cache; operações externas sem diário reconciliável |
| Qualidade e testabilidade | 5/10 | Módulos de origem separados; sintaxe válida; testes locais existentes | Testes não cobrem fluxos adversariais; contratos booleanos ambíguos e transportes divergentes |

**Nota arquitetural global: 3/10 para o uso clínico descrito.** O projeto é recuperável, mas as barreiras precisam ser invariantes do programa, e não frases em prompts.

### Premissas verificadas

- Apps Script documenta 6 minutos por execução, 9 KB por valor e 500 KB por repositório de propriedades, além de limites diários. A fila precisa respeitar todos eles, não somente o limite por item. [Cotas oficiais](https://developers.google.com/apps-script/guides/services/quotas).
- Trato os 5 segundos como requisito de aceitação informado na solicitação. A documentação consultada do Telegram descreve sucesso HTTP `2XY` e retentativas, sem estabelecer nessa seção um prazo universal de exatamente 5 segundos. Não seria correto transformar esse número em uma garantia oficial. [Webhook](https://core.telegram.org/bots/api#setwebhook).
- Configurar `secret_token` faz o Telegram enviar um cabeçalho; este código autentica pelo parâmetro da URL. O evento documentado de web app GAS não expõe cabeçalhos arbitrários. Não se corrige isso simplesmente inventando `e.headers`. [Evento GAS](https://developers.google.com/apps-script/guides/web).
- CacheService permite expulsão antes do TTL; não oferece armazenamento durável. [Contrato do cache](https://developers.google.com/apps-script/reference/cache/cache).

## 2. Matriz de achados prioritários

Todas as linhas abaixo são do arquivo master auditado. A coluna “correção” é uma proposta, não uma alteração já aplicada.

| ID / prioridade | Módulo, função e linha | Cenário de falha | Correção concreta |
|---|---|---|---|
| A01 — **P0 · Crítico** | 04/07: `processarCalculadoraClinicaComIA` L3386, `gerarAnaliseGasometriaComIA` L3490, `processarMensagemTexto` L4988; prompts L2705/L3573 | `/calc` calcula via LLM; MELD não existe no motor puro; gasometria permite cálculo por IA e ignora `ok:false`; emergência autoriza assumir 70 kg | Roteador de calculadoras puras, schema de entradas, bloqueio de dados ausentes e de ferramentas não implementadas; renderização determinística intocável |
| A02 — **P0 · Crítico** | 02: `DVA` L1656 e `drogasVasoativas` L1702; 07 L5132 | Nora concentrada usa 128 mcg/mL, mas descreve preparo padrão de 64; linguagem natural ignora “concentrada” | Um objeto de preparo por solução; calcular quantidade, volume, concentração e instrução desse mesmo objeto; exigir seleção inequívoca |
| A03 — **P0 · Crítico** | 10: `extrairItensReceitaLimpos` L6169; `gerarHtmlReceituario` L6315 | PDF presume via oral, sobrescreve linhas de posologia e elimina a marca de rascunho; não exige revisão da versão | Receita estruturada e versionada, campos obrigatórios, aprovação explícita da versão, escape HTML; não reconstituir prescrição de prosa |
| A04 — **P1 · Alto** | 02: `estadiamentoKDIGO` L1433 | Anúria 12h → estágio 2; DU 0,4 mL/kg/h por 24h → estágio 3; sem basal/DU → “sem IRA” | Corrigir limiares, exigir janela temporal e critérios suficientes, representar resultado incompleto |
| A05 — **P1 · Alto** | 12: `definirModoBot` L6771, `iniciarModoBot` L6806, `tratarEntradaUX` L6990 | “Novo SOAP” preserva `leito_` e `dvaw_`; texto do novo paciente pode atualizar leito anterior | Estado único com `caseId` e `revision`; limpar subfluxos na troca de caso e validar vínculo de toda ação |
| A06 — **P1 · Alto** | 03: `DICIONARIO_FARMACO` L2235 e `filtrarMedicamentosRelevantes` L2339 | Com base >35 linhas, omeprazol/pantoprazol são adicionados repetidamente ao array percorrido | Iterar snapshot dos termos originais e deduplicar; limite de expansão |
| A07 — **P1 · Alto** | 08: `doPost` L5951; 11: `enfileirarUpdate` L6505 | Worker roda antes do ACK; lock de ingresso espera até 30s; IA/PDF podem ocupar minutos | Webhook exclusivamente autentica, valida e persiste; worker por acionador; lock curto e falha observável |
| A08 — **P1 · Alto** | 11: `PersistenciaBot.ler/salvar/remover` L6476 | Leitor obtém manifesto antigo; escritor remove chunks antigos; leitor recebe dados incompletos. Falha dura deixa órfãos | Exclusão curta comum para snapshot/commit/remoção ou versões imutáveis com coleta diferida; validação de manifesto e integridade |
| A09 — **P1 · Alto** | 09 L6088/L6104/L6112; 11 L6509/L6594 | Histórico ilimitado, outbox failed/uncertain sem expiração e limite de fila por contagem esgotam 500 KB | Orçamento global em bytes com reserva para commit, arquivamento privado e retenção explícita; controle de admissão |
| A10 — **P1 · Alto** | 11 L6542; 07: `salvarNotion_` L5412, `gerarPdfRx_` L5456; 06 L4473 | Deduplicação some em 30 min; dois cliques de PDF são dois updates; Notion usa marca só em cache; Calendar não guarda identidade da operação | Diário durável por operação/versão, IDs de destino, reconciliação; nunca prometer exactly-once sem suporte do destino |
| A11 — **P1 · Alto** | 11: `tentarEntregaTelegram` L6575, `processarCaixaSaida` L6594; 06 L4176 | Rotina e worker consomem mesma outbox sem claim comum; snapshot antigo envia duas vezes; `sending` ativo vira `uncertain` | Claim sob lock, token de proprietário e lease; somente dono conclui; produtores apenas enfileiram |
| A12 — **P1 · Alto** | 11 L6549; 07 L5208; 12 L6994 | Handler retorna false sem lançar; inbox fica done e perde texto. Resultado existe só em cache e `/pedido` não recupera saídas | Resultado estruturado de execução; persistir pedido/resultado até encerramento; recuperação por ID; separar falha de negócio e de entrega |
| A13 — **P1 · Alto** | 05: `marcarHabitoProativoHoje` L4129; `listarTarefasHojeNotion` L4091; `obterOuCriarPaginaHabitLog` L3950 | PATCH falho vira hábito confirmado; indisponibilidade vira “Tudo zerado”; falha na consulta provoca criação de página | Checar retorno de cada escrita; distinguir erro de lista vazia; não criar após leitura inconclusiva |
| A14 — **P1 · Alto** | 04: `gerarAnaliseGasometriaComIA` L3492; 12 L7055 | Contexto concatena exames; `match` usa primeira ocorrência. Atualização pode misturar medições de horários diferentes | Objetos por amostra e horário; substituir campos explicitamente, rejeitar ambiguidade; apresentar dados efetivamente usados |
| A15 — **P1 · Alto** | 03: protocolos L2436/L2473 e `obterProtocoloClinico` L2498; 02: cálcio L1358 | Asma é encaminhada ao protocolo DPOC com alvo 88–92%; CAD diverge da referência de 2024 citada; hipercalcemia sugere furosemida sem condicionante volêmico | Protocolos separados por população, indicação e versão; revisão clínica documentada e testes de regras |
| A16 — **P1 · Alto** | 08: `doGet` L5926, `doPost` L5942 | GET com segredo apaga pending >10 min; configure usa só segredo e dispensa chat/update; limpeza concorre com worker | Remover administração do endpoint público; GET somente leitura; administração no editor; nunca apagar pendência por idade |
| A17 — **P1 · Alto** | 01 L439/L510/L596; 04 L2940; 07 L5583/L5614; 12 L7170 | Logs recebem exceções/corpos brutos, que podem conter URLs com token e conteúdo; TTS fallback envia texto em query string | Logs estruturados por allowlist, sem corpo/URL/stack bruto; envio mínimo a provedores autorizados, sem identificadores desnecessários |
| A18 — **P1 · Alto** | 12: `uxTelaLeito` L6935, `tratarCallbackUX` L7137; 09 L6123 | Botão antigo muda status de novo ocupante; paciente sem status confirmado entra como estável no censo | Botões vinculados à internação/versão; comparação antes da alteração; categoria “não confirmado” separada |
| A19 — **P1 · Alto** | 02: `sequenciaRapidaIntubacao` L1800 | Seleções de indutor/BNM/adjuvante são validadas e ignoradas; “nenhum” ainda exibe fentanil; contexto ausente vira estável; dose/kg não aparece no cartão | Separar cartão de referência de regime selecionado; contexto desconhecido explícito; exibir dose/kg, apresentação e cálculo |
| A20 — **P1 · Alto** | 04: `_iaFinalizarTexto` L2843; 07: `processarEEntregarIA` L5245, `processarMensagemFoto` L5588 | Marca de rascunho depende da obediência do modelo; foto e outras respostas podem sair como laudo/resultado final | Envelope aplicado pelo programa: “Rascunho para conferência médica”; erro não pode virar documento exportável |
| A21 — **P1 · Alto** | 02: `cha2ds2vasc` L1120 | Soma sexo em `dados`, mas mantém texto, ícone e critérios renderizados do VA; resultado 2/9 e tela 1/8 | Implementações/identidades separadas de VA e VASc, renderização única após cálculo final e validação de todos os argumentos |
| A22 — **P2 · Médio** | 02: `glasgowP` L1231 | Pupilas ausentes viram 0 não reagentes, publicando exame não informado | Retornar GCS simples com pupilas pendentes; bloquear GCS-P até dado explícito |
| A23 — **P2 · Médio** | 01 L330; 02 L821; 12 L6963/L6980/L7158 | HTML clínico enviado como Markdown; cópia mantém `<b>`/entidades; helper de `copy_text` não é chamado no fluxo | Contrato único de rich text, renderer Telegram adequado e renderer plain; ligar `uxLinhaCopiar` ao fluxo |
| A24 — **P2 · Médio** | 02: `btn` L808; 12: `botoesBot` L6709 | Guard de 64 bytes só trata arrays; objeto nativo passa sem validar; `.slice(0,64)` conta UTF-16 | Validador final de todo teclado por UTF-8; ID opaco curto; não truncar callback semântico |
| A25 — **P2 · Médio** | 01: `fragmentarTexto` L279; 12: `uxDividirTexto` L6691 | Mensagem longa sem quebra recente corta palavra; cópia pode dividir par substituto | Único segmentador por parágrafo/espaço/ponto de código; preservar integralidade e entidades |
| A26 — **P2 · Médio** | 04: `_iaNovoCtx` L2752 e provedores L2890–3175 | 50s é orçamento cooperativo entre chamadas, não timeout do fetch; cada etapa reinicia prazo. OpenAI direto não existe | Deadline único por job, etapas retomáveis e circuit breaker; não inventar opção `timeout` no UrlFetchApp; alinhar cascata documentada |
| A27 — **P2 · Médio** | 10: `processarEEnviarPdf` L6420; 01 L486/L516/L622; 12 L6726 | PDF retorna sucesso sem entrega/Drive; mídia não entra na outbox; 429 sem retomada; conversão sem recuperação; fallback de edição recebe booleano | Retornos tipados e IDs persistidos de arquivo; outbox de mídia por referência; validar conversão/caption/MIME; propagar código/descrição |
| A28 — **P2 · Médio** | 03: `obterPlanilha` L2274 e `filtrarMedicamentosRelevantes` L2330 | Cache parcial é aceito; manifesto publicado primeiro; chunks por caracteres; fallback para primeiras 50 linhas pode excluir o item pedido | Chave por fonte/versão, checksum e todos os chunks obrigatórios; publicar manifesto por último; busca explícita sem truncamento arbitrário |
| A29 — **P2 · Médio** | 04: `extrairDadosEventoCalendario` L3800; 06: `criarEventoAgendaGoogle` L4473 | Regex aceita data impossível; não exige fim>início; ISO sem offset depende do fuso runtime; erro retorna à conversa genérica | Validar calendário/data real/intervalo/fuso e intenção; preservar pedido; contrato explícito de falha |
| A30 — **P3 · Melhoria** | 00–12; mocks L116; handlers 07/12; exports L2188/L3865/L7180 | Dois roteadores, helpers mortos, exports sobrescritos no Node, claims de validação sem lastro de release | Domínio puro, aplicação, adapters e renderers separados; mocks só em testes; registry único de comandos e calculadoras |

### A01 — Determinismo precisa existir no caminho executado

As funções puras de clearance, CKD-EPI, CURB-65, CHA, Wells etc. têm validações úteis. Porém o comando `/calc` com dados chama `processarCalculadoraClinicaComIA`, cujo prompt manda efetuar a conta quando necessário. O menu anuncia MELD, FRAX, APACHE, NIHSS e outros sem respectivas implementações no objeto público. O nome “determinístico” na interface é, portanto, inexato.

Na gasometria, até um objeto `{ok:false, erro:...}` é verdadeiro em `if(resCalc)`. O código monta “resultados determinísticos” com `undefined` e chama o modelo. Entradas não reconhecidas por regex autorizam explicitamente o modelo a calcular. Mesmo quando a conta pura foi correta, a resposta apresentada é uma nova geração livre. Não há comparação/garantia de preservação dos números.

Além disso, dois prompts permitem assumir adulto de 70 kg. Isso contradiz diretamente a restrição solicitada. A proteção que exige peso explícito em kg está presente no atalho natural de noradrenalina, mas não é universal: dobutamina, SRI e emergências gerais podem chegar a LLM.

Diff conceitual:

```js
// Extração produz somente candidatos; ainda exige schema e confirmação de ambiguidade.
const entrada = extrairEValidarCampos(texto, calculadoraId);
if (!entrada.ok) return responderPendencias(entrada.faltas, entrada.erros);
const calcular = REGISTRO_CALCULADORAS[calculadoraId];
if (!calcular) return responderFerramentaIndisponivel(calculadoraId);
const resultado = calcular(entrada.valores);
if (!resultado.ok) return enviarErroCalculadora(resultado);
persistirResultadoDoCaso(resultado);
enviarResultadoDeterministico(resultado); // Não passa pela reescrita do modelo.
// Comentário opcional da IA separado, rotulado e sem substituir o resultado.
```

As funções do exemplo são propostas de fronteiras arquiteturais; não foram adicionadas ao aplicativo. MELD exige especificar a variante pretendida e seus critérios antes de implementar; não usar LLM como contingência numérica.

### A02 — Concentração e preparo contraditórios

Para 70 kg e 0,1 mcg/kg/min, o preparo interno padrão produz aproximadamente 6,6 mL/h; a opção concentrada produz aproximadamente 3,3 mL/h. A segunda ainda imprime a instrução de quatro ampolas em 234 mL e 64 mcg/mL. Seguir esse preparo com a vazão concentrada entrega metade da dose nominal. Esses números reproduzem as premissas internas do software, não validam apresentações comerciais.

```js
// Estrutura conceitual: homologar apresentação/base ativa antes do uso.
const preparos = {
  padrao: { quantidadeMg: 16, volumeFarmacoMl: 16, volumeFinalMl: 250 },
  concentrada: { quantidadeMg: 32, volumeFarmacoMl: 32, volumeFinalMl: 250 }
};
const p = preparos[solucaoConfirmada];
const concentracaoMcgMl = p.quantidadeMg * 1000 / p.volumeFinalMl;
const diluenteMl = p.volumeFinalMl - p.volumeFarmacoMl;
// Texto do preparo e vazão derivados de p, sem d.ref compartilhado.
```

Deve ficar explícito se a quantidade corresponde ao princípio ativo/base ou ao sal da apresentação disponível. A escolha não deve ser inferida pelo modelo.

A aritmética de dobutamina e nitroprussiato é coerente com as concentrações internas de 1.000 e 200 mcg/mL. A interface, porém, oferece “Concentrada” para ambos, embora o motor rejeite essa opção. Para vasopressina, a tabela associa 0,03 UI/min a 9 mL/h, mas o campo legado `taxaMlH` vale 12; o manual antigo também cita 12. Remover duplicação de constantes e derivar todos os campos da mesma dose de referência.

### A03/A20/A27 — Prescrição não pode ser reinterpretada ao exportar

Reprodução sintética: `1. Medicamento TESTE`, seguido de “Tomar 1 comprimido pela manhã” e “Tomar 2 comprimidos à noite”. O HTML final conserva somente a segunda instrução. Sem via, imprime USO ORAL. Texto e nome do paciente são interpolados sem escape, permitindo marcação que oculte ou distorça conteúdo. Isso prova risco de integridade visual; não foi demonstrada execução de JavaScript ou exfiltração pelo conversor.

O PDF elimina identificação de rascunho e mostra “RECEITUÁRIO MÉDICO”/“pronto para impressão”. O clique “Gerar PDF” não registra confirmação dos itens, pendências ou versão. Uma mensagem de erro da REMUME também é truthy e recebe botão de PDF.

Proposta: armazenar `{caseId, revision, paciente, itens:[{farmaco, apresentacao, dose, unidade, via, frequencia, duracao, quantidade}], pendencias, origem, revisao}`. Dados pendentes impedem exportação como documento revisado. Antes da aprovação, PDF com rótulo de rascunho persistente. Renderizar campos escapados, sem regex de reconstrução. Retornar estados distintos `gerado`, `armazenado`, `enviado`, `incerto`, `falhou`; `sucesso:true` exige um destino de recuperação efetivo.

Não há uso de template externo do Google Docs neste módulo: o caminho real é HTML → Blob → PDF. Portanto o risco observado é falha de conversão, HTML inadequado e extração destrutiva; “template Docs corrompido” não é o mecanismo implementado. O código tenta manter a pasta privada e checa editores/visualizadores, o que é um controle positivo. Não encontrei `ANYONE_WITH_LINK`. As permissões efetivas de arquivos/pastas em produção não foram consultadas.

### A04/A14/A21/A22 — Resultados clínicos inconsistentes

KDIGO: estágio 3 por débito utiliza <0,3 mL/kg/h por pelo menos 24h ou anúria por pelo menos 12h; o código usa <0,5 em 24h e exige 24h para anúria. É necessário também modelar as janelas da creatinina, a presença de TRS e a suficiência dos dados. A chamada `(5, null, null, null)` não pode concluir “função renal estável”. [KDIGO AKI, tabela 2 e definição 2.1.1](https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf).

```js
// Trecho ilustrativo apenas do componente urinário, após validação de dados.
if ((debito === 0 && horas >= 12) || (debito < 0.3 && horas >= 24)) estagioDU = 3;
else if (debito < 0.5 && horas >= 12) estagioDU = 2;
else if (debito < 0.5 && horas >= 6) estagioDU = 1;
// Ausência de dado não equivale a estagioDU = 0 confirmado.
```

Gasometria: a mensagem inicial com pH 7,20 seguida de atualização com pH 7,40 continua calculada sobre 7,20. A concatenação de textos também permite usar pH antigo com PaO2 nova. O modelo de dados precisa distinguir amostras. O próprio motor classifica automaticamente combinações de pH normal como distúrbio misto sem uma avaliação completa de compensação respiratória crônica; merece revisão clínica adicional antes de declarar cobertura validada. Uma classificação de SDRA não deve ser definitiva apenas pelo P/F; há aviso de pré-requisitos, mas o rótulo principal continua afirmativo.

CHA2DS2-VASc: no caso sintético com HAS e sexo feminino, dados e recomendação passam a 2 pontos, enquanto texto e ícone continuam os de 1 ponto do CHA2DS2-VA. São modelos diferentes; não se deve reutilizar automaticamente o limiar de um para o outro. O oitavo argumento também não passa pela validação booleana, e `"sim"` se comporta de forma diferente de `true`.

Glasgow-P: sem avaliação pupilar, o software inventa ausência de pupilas não reagentes. É possível entregar somente o GCS e explicitar a pendência, sem concluir GCS-P.

### A05/A18 — Estado de conversa e identidade de paciente

Sequência reproduzida: clicar “Evoluir leito 4” → clicar “Novo SOAP” → enviar dados do novo paciente. O novo modo remove apenas `ctx_` e `pending_`; a chave `leito_` permanece e tem precedência sobre o modo. O texto atualiza o leito 4.

A alta já possui proteção por versão, mas status e evolução não. Um botão de uma internação anterior pode marcar o novo paciente do mesmo número como estável. O número do leito é localização, não identidade da internação.

Contrato sugerido: `ConversationState = {caseId, revision, mode, stage, pendingAction, encounterId, fields}`. Toda transição passa por uma única função; iniciar caso invalida todos os subfluxos. Callback curto referencia ação persistida contendo `caseId`, `encounterId` e versão esperada. Divergência requer reabrir a tela. O censo precisa manter “não confirmado” fora da contagem de estáveis.

### A06 — Laço infinito reproduzido

```diff
- for (var i = 0; i < termosBusca.length; i++) {
-   if (DICIONARIO_FARMACO[termosBusca[i]]) {
-     termosBusca.push(DICIONARIO_FARMACO[termosBusca[i]]);
-   }
- }
+ var originais = termosBusca.slice();
+ var vistos = new Set(termosBusca);
+ originais.forEach(function (termo) {
+   var sinonimo = DICIONARIO_FARMACO[termo];
+   if (sinonimo && !vistos.has(sinonimo)) {
+     vistos.add(sinonimo);
+     termosBusca.push(sinonimo);
+   }
+ });
```

O teste usa interrupção do VM local após 150 ms. Não deixou um job real rodar até o teto do GAS. O problema é demonstrável porque `omeprazol → omeprazol` e `pantoprazol → pantoprazol` ampliam indefinidamente o array percorrido. O código de interações já usa quantidade inicial de termos; o filtro REMUME não.

### A07–A12/A16 — Fila, concorrência e recuperação

**ACK:** retirar `processarFilaTelegram()` do `doPost`. O acionador de 1 minuto já é instalado por `configurarWebhookTelegram`, mas deve ter verificação operacional. `instalarTodosOsAcionadores` sozinho não instala esse worker. Há um trade-off explícito: desacoplar o webhook evita bloqueio, mas a resposta pesada pode esperar a próxima execução do acionador. GAS puro com esse acionador não garante resposta clínica em poucos segundos. Se houver SLA rígido de resposta emergencial, a restrição de infraestrutura deve ser revista; não se deve simular assincronia com Promise, sleep ou Node.

**Cotas:** chunks de 1.500 unidades UTF-16 são conservadores para o limite individual de propriedades. Isso é positivo e não foi marcado como estouro de 9 KB. O defeito está no total, na cópia temporária e na retenção. O teste sintético com 80 versões de aproximadamente 7 KB excede 500 KB; o mock permite medir o crescimento, enquanto no GAS uma escrita falharia antes de completar esse volume. A cota é compartilhada com configurações, fila, outbox e demais leitos.

**Atomicidade:** publicar um manifesto por último reduz a exposição a escrita parcial, mas não implementa uma transação. Exclusão imediata da versão anterior quebra leitores concorrentes; interrupção antes do manifesto pode deixar chunks órfãos; interrupção na limpeza não desfaz automaticamente o commit. `ConfigService` e `chaves` ainda copiam todas as propriedades; a ordenação da outbox faz muitas leituras repetidas. Indexar metadados e evitar varrer blobs repetidamente reduz consumo de cota.

**Locks:** o lock de ingresso é de script; o worker usa lock de usuário. Sob execução como proprietário, este pode serializar workers daquele usuário. Isso não protege automaticamente produtores dos acionadores de rotina ou endpoints administrativos. Locks GAS são liberados ao término da execução; os 120 segundos do código são apenas um limiar lógico do job, não “expiração” configurada do lock. Um `running` recente abandonado pode ser pulado enquanto pedidos posteriores são processados, comprometendo a ordem da conversa.

**Outbox:** um claim precisa ser lido e gravado sob lock compartilhado, com proprietário/lease. Depois se libera o lock, realiza-se o fetch e grava-se o resultado somente se o token ainda pertence ao consumidor. Expirar o lease de envio sem saber o resultado deve produzir `uncertain`, não novo envio automático. Nunca manter o lock de ingresso durante a chamada externa.

**Idempotência:** `uncertain` impede a repetição automática de certos envios ambíguos; esse benefício existe. Entretanto, não cobre criação de PDF, Notion e Calendar como operações de negócio. O callback PDF cria novo arquivo em cada clique; o marcador Notion é volátil; a deduplicação da inbox desaparece depois de 30 minutos. Uma nova tentativa com o mesmo update após a limpeza executa novamente, como reproduzido. A documentação informa retenção de updates não entregues no Telegram por até 24h; uma janela local de 30 min não é um desenho conservador. [Recebimento de updates](https://core.telegram.org/bots/api#getting-updates).

Diário proposto: `{operationId, caseRevision, kind, state, startedAt, externalId, artifactId}`. Chave de negócio diferencia “exportar esta versão” de um novo update. Depois de timeout, consultar/reconciliar o destino quando possível; em caso contrário, sinalizar incerteza e preservar a decisão humana. Não existe exactly-once garantido apenas escrevendo um status em PropertiesService.

**Perda de pedidos:** `/task` com Notion falho devolve mensagem de erro, mas o roteador retorna normalmente; o worker grava done e reduz o pedido a `{update_id}`. `failed` e `uncertain` também são removidos após 30 minutos. A afirmação “pedido preservado” e a recuperação `/pedido` não são garantias duráveis. Conteúdo de resultado em cache pode desaparecer antes das seis horas, enquanto a outbox done já apagou seu payload.

**429:** mensagens textuais persistidas respeitam `retry_after` e interrompem a drenagem enquanto a primeira entrega está pendente. Isso está correto no caso sequencial e foi coberto pela suíte existente. O retorno booleano true significa tanto entregue quanto apenas enfileirado. Não deve servir como confirmação visual de entrega. `sendDocument`, `sendVoice` e auxiliares seguem outro caminho; não recebem a mesma recuperação. Erros 5xx de envio são conservadoramente tratados como incertos, mas falta uma política de reconciliação visível.

### A13 — Notion: erro não é ausência e tentativa não é sucesso

```diff
- atualizarCheckboxNotion(pageId, nome, true);
- habitosMarcados.push(nome);
+ var r = atualizarCheckboxNotion(pageId, nome, true);
+ if (r) habitosMarcados.push(nome);
+ else falhas.push(nome);

- if (!res || !res.results || res.results.length === 0) return tudoZerado();
+ if (!res || !Array.isArray(res.results)) return mostrarFalhaConsulta();
+ if (res.results.length === 0) return nenhumaPendencia();
```

A consulta de HabitLog só pode criar página se a busca tiver sido bem-sucedida e vazia. Em timeout de escrita, o retorno precisa manter o estado incerto em vez de instruir simplesmente “tente novamente”. A listagem de tarefas limita-se a 15, não pagina e não exclui explicitamente tarefas concluídas com vencimento antigo; é uma limitação adicional de correção funcional.

### A15 — Conteúdo fixo também exige auditoria clínica

O fato de um protocolo estar em um objeto JavaScript não o torna validado ou atualizado.

- **Asma/DPOC:** `/protocolo asma` usa o objeto DPOC e seu alvo 88–92%. A referência GINA 2026 consultada descreve alvo de oxigenação 92–95% no contexto de exacerbação tratado nessa seção. Separar diagnóstico e população; não compartilhar o alvo apenas por “broncoespasmo”. [GINA 2026](https://ginasthma.org/wp-content/uploads/2026/05/GINA-2026-Strategy-Report-WMS.pdf).
- **CAD:** o código rotula ADA 2024, mas libera insulina a partir de 3,3 mEq/L de potássio. O consenso de 2024 recomenda adiar até potássio >3,5 mmol/L quando baixo. Também é necessário revisar os critérios de resolução e a orientação de bicarbonato do bloco antigo. [Consenso ADA/EASD de 2024](https://doi.org/10.2337/dci24-0032).
- **Hipercalcemia:** a recomendação fixa une hidratação e furosemida sem condicionar o diurético à avaliação volêmica. A orientação consultada reserva diurético de alça para situações como sobrecarga; não deve aparecer como rotina indiscriminada. [Society for Endocrinology](https://www.endocrinology.org/media/4277/emergency-guidance_acute-hypercalcaemia-in-adults.pdf).

Esses exemplos comprovam divergências, mas não equivalem a homologação de todas as condutas farmacológicas do arquivo. O bloco de SCA também agrupa cenários com e sem supra em um único tratamento: deve ser separado por estratégia e validado pelo responsável clínico. `obterProtocoloClinico` faz busca por substring e trata qualquer “choque” como sepse; exigir síndrome confirmada e permitir “não identificado”.

### A16/A17 — Segurança e privacidade

Não foi encontrado bypass anônimo de execução no POST normal: segredo ausente/errado ou chat divergente são recusados antes do enqueue. `Unauthorized`/`Forbidden` são textos de resposta, não configuração explícita de status HTTP. Não atribuo a eles garantia de HTTP 401/403.

O problema administrativo requer conhecer o segredo: GET clean não verifica chat e modifica dados; POST configure valida a existência de `TELEGRAM_CHAT_ID`, mas não a identidade de um remetente. O segredo da URL funciona como credencial bearer e deve ter alta entropia/rotação; não prova criptograficamente que o corpo veio do Telegram. Se o chat permitido for grupo, o código não valida `from.id`: todos os remetentes desse grupo compartilham autorização e contexto. Restringir a chat privado se esse é o modelo pretendido, ou definir allowlist de usuários e isolamento por pessoa.

Nenhuma chave real foi necessária para esta auditoria. A configuração usa ScriptProperties e o caminho Gemini textual já manda a chave em header. Existem, contudo, fetches com token na URL e logs de `e.message`, corpos Telegram e stack bruta. O teste não consultou logs reais; o achado é ausência de barreira de sanitização, não prova de vazamento ocorrido.

O fallback TTS do Translate coloca trecho de texto clínico na query string. Os provedores recebem o texto clínico bruto, inclusive no classificador e nos fallbacks, sem política de minimização ou remoção de identificadores. Restringir destinos a configuração explícita e tratar identificadores antes do envio. Não é possível concluir conformidade LGPD/HIPAA a partir do arquivo: contratos, base de tratamento, acesso operacional, retenção e configuração das contas não foram examinados.

### A19 — SRI

Aritmeticamente, usando as premissas internas e 70 kg, a função produz etomidato 21 mg/10,5 mL, quetamina 105 mg/2,1 mL, succinilcolina 105 mg/10,5 mL e rocurônio 84 mg/8,4 mL. Isso verifica a multiplicação/conversão implementada, não a adequação de uma prescrição para um paciente.

`SRI_FARMACOS.txt` contém dose por kg, mas não é utilizado no cartão. `ind`, `blq`, `adj` são resolvidos, porém não controlam quais fármacos aparecem. Mesmo adjuvante “nenhum” mantém fentanil como pré-tratamento. O contexto default afirma estabilidade hemodinâmica não informada. A apresentação e o tipo de peso apropriado precisam ser confirmados e visíveis; os limites de peso não substituem validação de população/indicação. Separar calculadora aritmética de seleção clínica do regime.

### A23–A29 — Telegram, cache e integrações

**Formatação:** o renderer puro gera HTML escapado, mas `enviarMensagemSegmentada` sempre envia Markdown. O Telegram pode aceitar a mensagem e mostrar tags literais, sem acionar o fallback de parse. O exportador de texto remove asteriscos/emojis, mas não HTML nem entidades. Um texto destinado ao prontuário deve usar transporte plain sem `parse_mode` e preservar símbolos clínicos relevantes.

**Cópia:** o limite nativo `copy_text` é 1–256 caracteres, não 4.096. `uxLinhaCopiar` já implementa uma escolha adequada por tamanho, mas só é declarado/exportado; não participa do caminho principal. Para textos maiores, oferecer partes curtas com cópia ou texto/arquivo integral claramente identificado, sem truncar a evolução. [CopyTextButton](https://core.telegram.org/bots/api#copytextbutton).

**Callbacks:** não encontrei callback efetivamente gerado acima de 64 bytes nos caminhos atuais com UUID normal e IDs de leito validados. Os IDs são predominantemente ASCII e curtos. O defeito A24 é uma validação incompleta, reproduzida com entrada Unicode em objeto nativo; não uma afirmação de que todos os botões atuais estão inválidos.

**Edição:** `enviarTelaBot` tenta interpretar descrição de erro de um booleano devolvido por `executarPostTelegram`. No erro “message can't be edited”, recebe false e nunca envia a nova tela. Propagar `{state, code, description}` resolve também a ambiguidade de mensagem apenas enfileirada.

**Provedores:** a ordem implementada é Groq → OpenRouter → Z.ai → Gemini, ajustada pelo provedor padrão. `_iaProvOpenAICompat` descreve o protocolo compatível, não uma integração direta com OpenAI; não existe `OPENAI_API_KEY` nesse arquivo. Falhas 401/403, 404, 429 e respostas vazias possuem tratamento, mas o deadline é local a cada chamada e não interrompe fetch já em andamento. A API UrlFetchApp documentada não fornece timeout arbitrário configurável. [UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app).

**Mídia:** voz/documento não têm entrega persistida nem a política textual de 429. Captions são passadas sem orçamento específico. O TTS Gemini cria Blob `audio/wav` sem interpretar o MIME retornado ou encapsular PCM, caso esse seja o formato recebido; validar o formato real antes de enviar. Não foram consultados modelos ativos ou quotas reais dos provedores; não há afirmação de que um nome de modelo configurado está disponível.

**Base local:** cache fragmentado deve ser tudo ou nada. A implementação concatena as partes que sobraram e aceita o resultado. No filtro, quando só há um ou dois medicamentos relevantes, eles são descartados em favor das primeiras 50 linhas. Isso pode excluir exatamente o fármaco pedido. Além do laço A06, é preciso preservar matches e informar cobertura da base, sem transformar lista filtrada em alegação de estoque/disponibilidade.

**Calendar:** validar data real, ordem temporal e fuso de script/calendário. O extrator aceita formato ISO sem offset, mas a conversão posterior usa `new Date`. Incluir idempotência no mesmo diário de operações e impedir criação a partir de trechos gerados por IA que não expressem intenção confirmada de agendamento.

## 3. Plano de refatoração recomendado

### Etapa imediata — remover os bloqueadores de segurança clínica

1. Bloquear execução via LLM de `/calc`, gasometria sem resultado válido e doses dependentes de peso ausente; suspender ferramentas anunciadas sem implementação determinística.
2. Corrigir preparo da noradrenalina concentrada, divergência da vasopressina e KDIGO; conferir as saídas exibidas, não só os números internos.
3. Impedir PDF final a partir de prosa arbitrária; manter rascunho até conferência explícita da versão e impedir exportação de erros/pendências.
4. Limpar estados auxiliares ao iniciar caso; vincular botões ao caso/internação; separar status desconhecido de estável.
5. Corrigir o laço de expansão da REMUME. É uma alteração pequena com impacto direto na disponibilidade.

Critério de saída: cenários A01–A06, A14, A18–A22 convertidos em testes que esperem comportamento seguro; revisão clínica das regras e apresentações afetadas. Não basta o teste “resultado contém texto”.

### Etapa seguinte — tornar a operação recuperável

1. `doPost` somente autentica e persiste; retirar endpoints administrativos mutáveis da URL pública.
2. Implementar repositório com orçamento global de bytes, metadados leves, operações curtas sob lock e coleta de versões órfãs segura.
3. Adotar estados explícitos para execução de negócio e entrega; preservar pedidos/resultados não resolvidos; oferecer recuperação de texto e artefato.
4. Consumidor único da outbox ou claims com dono/lease; expandir para mídia por referência durável de arquivo.
5. Diário idempotente para Notion, PDF e Calendar, com tratamento visível de resultado incerto.
6. Corrigir sucessos falsos do Notion/PDF e sanitizar logs de todos os adapters.

Critério de saída: injeção de falha antes/depois de cada escrita e chamada externa, concorrência entre webhook/worker/rotina/limpeza, cache expulso, quota próxima do limite e replay tardio. Para política de retorno HTTP/latência, validar em implantação de teste sem pacientes; Node não reproduz GAS nem o comportamento HTTP da plataforma.

### Etapa posterior — consolidar as fronteiras dos módulos

| Camada proposta | Responsabilidade |
|---|---|
| Domínio clínico puro | Schemas, unidades, cálculos, regras clínicas versionadas; retorna dados, sem Telegram/HTML |
| Aplicação | Estado do caso/internação, roteamento e diário das operações; decide o que pode ser executado |
| Persistência | Cotas, índices, versões, locks, retenção e recuperação |
| Adapters | Telegram, Notion, Calendar, Drive e IA com retornos tipados e erros sanitizados |
| Renderização | Telegram HTML/entidades, texto de prontuário e PDF derivados dos mesmos dados |

Os módulos 02, 09, 10 e 11 já usam IIFEs, o que reduz escopo global. Não encontrei funções de topo declaradas duas vezes nem atribuição implícita global demonstrada nesta revisão. O problema principal é acoplamento: 02 calcula, recomenda e renderiza; 04 mistura transporte, prompts e roteamento; 07 e 12 disputam estado/rotas; 01 altera implicitamente a semântica de envio quando 11 está carregado.

Código morto ou redundante identificado: `fmtMl`, `NOME_PASTA_DRIVE`, `maxRate` sem consumo, seleções SRI não usadas, vários ramos interceptados pelo UX antes do handler legado, `SEGUNDA_MENTE` fora da lista de intenções válidas e helper `uxLinhaCopiar` sem integração operacional. Os múltiplos `module.exports = ...` não são problema no GAS, mas o último sobrescreve os anteriores ao importar o master em Node. Mocks de Calendar/Properties/Utilities devem sair do artefato de produção e entrar no harness de testes.

Unificar registry de comandos, IDs de calculadoras e ações dos botões. Exemplo: Wells produz ID `wells`, mas o ramo específico de critérios espera `wells_tep`; diversos botões terminam em resposta genérica, sem executar a ação anunciada. Uma suíte de cobertura do grafo de navegação deve detectar ações sem handler real.

## 4. Evidências e limites da validação

- Comparação automatizada: todos os 13 blocos do master são iguais aos respectivos módulos `src/`, ignorando apenas espaços externos.
- `node --check ultra_rotina_master.js`: aprovado.
- `.venv/bin/python -m pytest tests --ignore=tests/test_build_pipeline.py -q`: **97 passed**, em 10,30s. O teste de build foi excluído porque reescreve o arquivo objeto da auditoria. Os scripts `test_live_*`/testes de produção não foram executados.
- `node reviews/auditoria_2026_10_04_repro.cjs`: **37 cenários reproduzidos** usando o master real em VM e serviços falsos. As assertions confirmam a presença dos defeitos; não devem ser confundidas com testes que aprovam segurança. Ao corrigir, inverter as expectativas relevantes e incorporá-las à suíte oficial.
- Os testes de concorrência forçam interleavings/snapshots locais. Demonstram a ausência dos guards no código; não medem probabilidade ou frequência de corrida em produção.
- Permissões reais de Drive, configuração “executar como”, acionadores instalados, cotas consumidas, logs reais, contratos e disponibilidade de provedores não foram consultados. Nenhuma conclusão de conformidade legal ou validação de todos os protocolos decorre deste relatório.

**Os 97 testes verdes coexistem com os defeitos reproduzidos.** O próximo critério de aceitação deve testar invariantes clínicas e de recuperação no caminho completo até Telegram/PDF, com revisão independente dos gabaritos médicos.
