# Reanálise das correções — Ultra Rotina — 17/10/2026

## Parecer

**As correções representam avanço real, mas não encerram os 22 achados nem demonstram operação integrada segura.** Classificação conservadora por grupo: **6 resolvidos no escopo local verificado, 9 parcialmente resolvidos e 7 abertos**. “Resolvido” não significa deploy confirmado; C2/C3 estão corrigidos no backend e continuam dependendo da correção da interface descrita em R2.

A reanálise confrontou o relatório anexado pelo usuário, o código atual, o recibo indicado, uma nova bateria completa e reproduções independentes. Nenhum código de produção foi alterado. Foram usados dados sintéticos e testes locais; não foi acessado o Render nem executada inferência clínica real. Reproduções de segurança utilizaram `NODE_ENV=production`, credenciais fictícias e rede bloqueada.

## Matriz dos 22 achados

| ID | Estado | Fundamentação atual |
|---|---|---|
| E1 | Resolvido na fronteira verificada | HTTP rejeita sessões literais; HTML público não injeta token; runtime restringe exceção a testes. Há efeito colateral em REMUME, descrito em R4. |
| E2 | Resolvido | RPC recusa função fora de `_rpcMap`; reprodução com ordem correta dos argumentos. |
| E3 | **Aberto** | Rotina, perfil, telemetria e resumo clínico ainda respondem anonimamente; WebSocket segue sem autenticação comum. |
| E4 | Parcial | Prefixos de rotina preservados, mas `BF_ATUAL` e `PROTOCOLO_SEMANA` ainda são eliminados após reinício real. |
| E5 | **Aberto** | Consulta CNES corrigida; provisionamento reproduzível do banco ainda não consta no build/deploy. Configuração externa de volume/hidratação não foi demonstrada. |
| E6 | Resolvido | Cabeçalho de bypass não contorna limite em produção. |
| E7 | Resolvido | Inline query autorizada atinge handler; remetente não autorizado é ignorado. |
| E8 | **Aberto** | `Atomics.wait` mantém a thread principal aguardando o worker de HTTP. |
| C1 | Parcial | Exemplo com ponto e vírgula corrigido; coordenação com “e” ainda perde alergia positiva. |
| C2 | Resolvido no backend | Alertas críticos agregados afetam `is_safe`; receita do serviço contém pendência/bloqueio. UI ainda perde isso, R2. |
| C3 | Resolvido no backend | Não fabrica mais negativas, via oral ou quantidade quando ausentes nos cenários reproduzidos. |
| C4 | Parcial | IMC infantil deixa de receber classificação adulta; ausência de FR/PAS retorna null. Ausência de consciência ainda gera qSOFA 0/3. |
| C5 | Parcial | Há recuperação TdC injetada no agente e mudança de configuração de modelo; não há avaliação clínica real demonstrando equivalência dos fallbacks e do contexto recuperado. |
| R1 | Parcial | Formulário plano chega ao serviço corretamente; validação dos formatos é desigual e payload misto pode perder alergia/gestação por defaults. |
| R2 | Parcial, P1 persiste | A/P melhoraram, mas S/O, referências, alertas críticos e clipboard ainda usam caminhos incompatíveis com o serviço. |
| R3 | Parcial | SOAP/CNES usam URL base; perfil/presets/importação ainda usam URLs relativas e confirmação sem verificar HTTP. |
| R4 | Parcial | Método/await reparados; REST pode retornar catálogo errado/vazio; rota sem slug usa sessão interna agora recusada em produção. |
| R5 | **Aberto** | RPC REMUME continua com base global; cache offline não é identificado por localidade/versão. |
| R6 | **Aberto** | Criar/editar/excluir/descanso continuam locais, sem nova mutação persistente na fila. |
| R7 | **Aberto** | Fila/envio omitem data e horários; HTTP 200 com `sucesso:false` remove operação da fila. |
| R8 | **Aberto** | Sincronização Google sobrescreve bloco manual e horário local adiado. |
| R9 | Parcial | Sete municípios foram desmarcados como verificados, mas a RENAME clonada de RP continua `verificado:true`; UI não apresenta adequadamente a condição provisória. |

## Robustez das três correções perguntadas

### Fronteiras de segurança

O desenho de separar confiança interna e HTTP é adequado. As reproduções em produção confirmaram bloqueio de `bot/internal/interno`, ausência de token no HTML, fechamento da reflexão RPC e rate limit não contornável pelo header. Não é necessário quebrar testes internos para alcançar esses objetivos.

Entretanto, o conjunto de fronteiras continua incompleto. `server/index.js:929` (`ehRequisicaoConvidado`) ainda admite ausência de identidade; GET/POST de blocos, alteração de perfil e leituras de telemetria/resumo retornaram HTTP 200 sem sessão. Esses resultados impedem encerrar E3. Validar sessão numa rota RPC não protege REST, SSE e WebSocket por consequência.

Também surgiu um efeito colateral: `server/index.js:525` chama `cockpitRemume` com `'internal'`. O bloqueio de produção agora recusa essa chamada; o catch transforma a falha em lista vazia. Com CSV carregado, GET `/api/remume` retornou HTTP 200 e total zero. O reparo deve separar explicitamente o serviço interno da autenticação de transporte, sem reabrir o bypass público.

### Esquemas Fastify e normalização

A perda original do payload plano foi corrigida no percurso principal: formulário real → schema → controller → serviço → argumentos do provedor preservou idade, sexo, gestação, alergia, vitais e override. Isso é mais forte que testar somente um endpoint echo.

Mas `additionalProperties:true` e tipos amplos não bastam para robustez. Em `src/clinical/schemas/soap.schema.js:126`, os aliases planos não têm os mesmos limites do objeto canônico; `normalizeSoapInputPayload` só roda depois da validação HTTP e não revalida a forma canônica.

Reproduções com Fastify/schema reais:

| Entrada | Resultado |
|---|---|
| `vitals:{peso:-2,pas:800}` | HTTP 400 |
| `sinais_vitais:{peso:-2,pas:800}` | HTTP 200; os mesmos valores chegam à normalização |
| `patient_context:{}`, `gestante:true`, `alergias:"amoxicilina"` na raiz | HTTP 200; defaults do schema introduzem `gestante:false/alergias:[]` e a normalização ignora os campos planos |
| `idade:"abc",gestante:1` | HTTP 200; idade desaparece e gestação vira false |

Critério de fechamento: normalizar aliases antes de validar um contrato canônico estrito, definir conflitos explicitamente e preservar desconhecido como desconhecido. O mesmo dado inválido deve ter o mesmo resultado em todos os formatos aceitos.

### Parsing clínico de alergias

A divisão por ponto e vírgula/adversativas corrige o exemplo original, mas o parser ainda testa negação antes de dividir a coordenação com “e”, em `src/clinical/safety_guard.js:219–242`.

| Texto, com prescrição de amoxicilina | Resultado observado |
|---|---|
| Alergia à amoxicilina; nega alergia à dipirona | `is_safe:false`, colisão detectada |
| Alergia à amoxicilina e nega alergia à dipirona | `is_safe:true`, nenhuma alergia extraída |
| Nega alergia à dipirona e refere alergia à amoxicilina | `is_safe:true`, nenhuma alergia extraída |

Portanto, considero a correção **parcial**, não robusta para linguagem clínica livre. O aceite cobre um separador, não o domínio da negação. A implementação também não contém família de betabloqueadores: a combinação sintética atenolol/propranolol não gera alerta, apesar desse exemplo constar no relatório de resolução. Isso demonstra divergência de cobertura declarada, sem afirmar que toda combinação de uma família deva ser bloqueada automaticamente.

## Falhas integradas ainda reproduzíveis

- **SOAP UI:** `estacao_soap.js:598–612` procura S/O em caminhos errados e alertas em `data.safety_analysis.alerts`, enquanto a resposta possui `result.clinical_alerts`. Com três alertas críticos no serviço, a área de alertas da UI ficou vazia, S/O ficaram `-` e a receita reconstruída pelo frontend perdeu o banner de revisão e o bloqueio alérgico presentes no clipboard do servidor. `:664/:672` também procuram nomes/caminhos errados de clipboard.
- **qSOFA:** `calculateQSOFA(fr,pas,glasgow=15)` ainda introduz 15 quando o chamador passa `undefined`. `runAllCalculations({pas:120,fr:16},{idade:40})` devolveu `qsofa:0` e resumo `0/3`, sem pendência. O retorno intermediário de completude não chega ao resumo. O IMC infantil agora apenas orienta avaliar por percentil/escore-Z; **não calcula percentis**.
- **REMUME REST:** consulta direta ao serviço para RP retorna 255 itens; handler com slug RP devolveu `rename_nacional`, zero itens. `server/index.js:548` espera `medicamentos`, mas o serviço entrega `itens`; o resolver também prioriza `farmacopeia.remume_id` sobre o slug aplicado na raiz.
- **Rotina:** criar bloco gera zero HTTP e não acrescenta operação à fila; adiamento de Amanhã envia apenas ID/status/nota; HTTP 200 com falha de domínio apaga a fila. Sync de um dia com bloco manual e evento Google adiado devolveu apenas evento Google, com horário anterior.
- **Procedência:** a RENAME permanece marcada como verificada e idêntica aos 255 itens de RP. Desmarcar outros municípios é uma mitigação honesta, mas não valida essas bases e não encerra a alegação nacional.

## CNES, TdC e esclarecimentos sobre a primeira auditoria

**CNES:** reconheço a lacuna: a primeira auditoria contou registros, mas não exercitou a busca FTS. Isso deveria ter sido investigado. O relatório anterior não afirmava que todas as consultas estavam funcionais; essa distinção não elimina a lacuna de cobertura. No snapshot preservado, a consulta antiga usava `_search LIKE ?`, e não `_search MATCH ?` como descrito no parecer recebido; o problema de referenciar a coluna removida continua pertinente.

Na versão atual, confirmei banco aberto, busca por código e consulta FTS com quatro resultados em aproximadamente 3,3 ms numa execução local; o revisor independente também confirmou. Isso valida a reparação local, não um SLA de produção. O catch atual registra aviso fora de testes, mas continua podendo usar fallback após erro.

**TdC:** confirmei três resultados da consulta local e injeção de `tdc_evidences` no agente. É uma implementação nova e útil que supera a ausência de consumidor registrada antes. A bifurcação entre runtime VM e SOAP CommonJS já estava explicitada no relatório anterior. Como o pedido anterior era auditoria, não implementação, não criar o conector naquele momento não foi erro de diagnóstico.

**Sessões internas:** a solução adotada de segregação é válida. O critério anterior era separar chamada interna de autenticação externa; não havia necessidade de remover indiscriminadamente auxiliares de teste.

**Banco de 180 MB:** volume/hidratação são soluções compatíveis com a recomendação original de provisionamento com versão/checksum. A auditoria não propôs commitar o banco; apontou que clone/deploy não demonstrava entrega da base. Acrescentar HTML/assets ao Dockerfile não provisiona CNES/TdC. Sem configuração externa ou restauração demonstrada, E5 permanece aberto.

## O recibo e os testes de aceite

O recibo fornecido (`fe5eede1-3ccd-45a5-8b4b-af82d482f84c`) é válido para sua seleção: 57 resultados aprovados, `stable:true`, **`scope:"partial"`**. O JSON não contém `test_auditoria_correcoes_aceite.cjs`, `test_cnes_service.cjs` ou `test_soap_api.cjs`; portanto, as linhas adicionais coladas pelo usuário não pertencem à lista desse recibo específico. Não afirmo que não tenham sido executadas separadamente.

Nova execução única `npm test -- --all`, após as correções:

- **255/283 suítes aprovadas; 28 falharam; 49,51 s.**
- **`stable:true`, `scope:"all"`, `passed:false`.**
- Baseline de 57: **57/57 passaram** dentro dessa execução.
- Fingerprint: `0dbd8749dbfe7c3b718a5ddf172d45d1de62337ffc342f2acec4d02b5ee4b119`.
- Recibo original: `data/test_reports/df899894-b16b-480a-9212-ed1c0a0c9dd8/summary.json`; cópia preservada junto deste relatório.

As 28 falhas não são 28 bugs clínicos distintos: incluem wrappers Python, expectativas antigas e problemas de integração. Não se deve modificar conduta clínica ou relaxar segurança para satisfazer asserções obsoletas. Contudo, não há aprovação integral.

A suíte de aceite também contém lacunas de especificação:

1. **E4:** escreve e relê propriedades no mesmo processo; não reinicia, portanto não testa o filtro de boot.
2. **E2:** passa argumentos invertidos em `runtime.cockpitRpc('sessao_mock','criarSessaoCockpit_',[])`; rejeitar método inexistente `sessao_mock` não prova recusa da função interna. A correção real foi confirmada por reprodução independente com a ordem correta.
3. **CNES:** exige somente resultado não vazio e tempo <50 ms; na cópia sem banco aceitou um estabelecimento do fallback e imprimiu “FTS5 real”. Não verifica backend efetivo.
4. **TdC:** falhou na cópia isolada por ausência do banco. A consulta funciona no host com o arquivo, mas o teste não é reproduzível sem provisionamento/fixture explícitos.
5. **R4:** consulta serviço diretamente, não o handler REST que devolve catálogo vazio.
6. **R9:** exclui explicitamente `rename_nacional` da checagem de catálogos não verificados.
7. Não cobre os fluxos completos de R2/R3/R5/R6/R7/R8 nem E3/E8. Dez grupos de asserções não equivalem a 22 critérios de fechamento.

## Evidências preservadas

- `REANALISE_TESTES.json`: recibo integral novo.
- `REANALISE_CLINICA.json` e `reanalise_clinica.cjs`: alergias, formatos do schema, qSOFA, IMC, formatadores e cobertura de duplicidade.
- `REANALISE_REQUISITOS.json`: payload completo, retorno/clipboard, catálogo e timeline.
- `REANALISE_ENGENHARIA.json`: autorização/estado em produção simulada.
- `REANALISE_FTS.json` e `REANALISE_REMUME_PRODUCAO.json`: consulta de bancos locais e efeito colateral da sessão interna.

Antes de encerrar os achados, os critérios prioritários são: autenticação comum para REST/SSE/WS; contrato canônico validado antes da IA; UI consumindo os alertas reais; negação de alergia por entidade; preservação de estado após reinício; mutações de rotina com data/horário e confirmação de domínio; procedência e provisionamento demonstráveis das bases. As correções já verificadas devem ser mantidas enquanto essas lacunas são fechadas.
