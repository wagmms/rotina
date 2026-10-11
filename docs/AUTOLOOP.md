# Autoloop: execução observável e qualidade preservada

Atualização de 11/10/2026. Fonte revisável: `tooling/autoloop/autoloop.py`.
Instalação local: `~/.local/bin/autoloop`; supervisão: `~/.local/lib/autoloop_core/execution.py`.

## Execução e testes

- `npm test`: todas as suítes da antiga lista obrigatória, mais o contrato do executor.
- `npm run test:all`: todas as suítes `test_*.cjs` e `test_*.py`, incluindo scripts Python com `__main__`.
- `npm run test:autoloop`: contratos do executor, supervisão, instalador, roteamento, build e bloqueios de auditoria.
- `npm test -- --jobs=1`: validação sequencial para comparar com dois processos.
- `npm run test:all -- --select=tests/test_sala_vermelha_ux.cjs`: teste direcionado durante edição; não aprova a bateria integral.

O executor cria cópias temporárias do código e dos artefatos públicos do Cockpit.
Cada fila tem seu próprio diretório. Cada suíte começa com dados e logs limpos,
configuração fictícia de Telegram e bases clínicas copiadas de `src/data`.
Não há acesso às propriedades persistidas ou ao `.env` da produção.
As dependências Node são compartilhadas; as suítes não devem modificá-las.

As asserções Python são executadas integralmente. Somente chamadas Node com
argumentos, diretório e opções compatíveis reaproveitam o resultado CJS da mesma
execução. stdout, stderr e código de saída são preservados. Argumentos extras,
`node --test`, ambiente ou entrada diferentes executam o subprocesso real.

Cada suíte tem limite configurável de 120 s; timeout e interrupção são falhas.
O limite da bateria na orquestração é 1800 s. Auditoria e inferência clínica não
recebem redução de esforço ou truncamento de conteúdo por esta atualização.

## Evidência e identidade

Resultados por suíte e logs: `data/test_reports/<execução>/`.
Recibo da bateria completa: `data/.autoloop_test_receipt.json`.
Métricas do orquestrador: `data/autoloop_metrics.jsonl` (sem conteúdo clínico).

Uma aprovação só pode ser reutilizada com o mesmo inventário, conteúdo, versões
Node/Python e resultado integral. Código não commitado e artefatos públicos do
Cockpit entram na identidade. Alterações durante testes ou auditoria invalidam
a aprovação. A conferência de HEAD e checkout limpo permanece obrigatória antes
do push. O recibo de testes nunca substitui a auditoria clínica.

O ciclo acompanha saída e tempo a cada 30 s. Silêncio é diagnosticado; não é
aprovação nem motivo suficiente para cancelar trabalho clínico legítimo.
Cancelamentos encerram o grupo do processo para evitar testes órfãos.

## Modelos e segurança clínica

- Termos são normalizados com acentos, camelCase e underscores e comparados como palavras inteiras.
- `CAD` não é encontrado dentro de `dedicado`; doses e posologias continuam tendo precedência clínica.
- Trabalho clínico exige Gemini Pro. Falta de cota não promove Flash a substituto clínico.
- Cooldown é aplicado quando o CLI informa cota esgotada; sucesso ou erro operacional não impõem 90 minutos de repouso artificial.
- Papéis do squad são capacidades disponíveis, e não afirmação de agentes já iniciados.
- O agente recebe a tarefa exata, trabalha em uma frente concreta e executa a bateria completa uma vez ao finalizar.
- Falhas da bateria completa ganham prioridade no ciclo seguinte. Divergências clínicas precisam de Pro e fontes antes de alterar regras ou expectativas.
- Falta de cota, limitações ou parecer ausente bloqueiam o deploy. `--skip-audit` foi descontinuado.

Modelos e esforço da auditoria cruzada existente não foram reduzidos.
Testes simulados não demonstram equivalência clínica.

## Build

`build_master.py` valida os conteúdos exatos de cada módulo separadamente em uma
engine Node, valida o bundle final e impede promover fontes alteradas durante o
build. Fontes idênticas preservam o arquivo, timestamp e conteúdo do artefato.
Nenhum arquivo legado de GAS é gerado ou modificado.

Ensaio com as mesmas fontes: build antigo de `091b6a4` em 4,164 s; novo em 0,492 s
(aproximadamente 8,5× nessa etapa). O corpo gerado foi comparado e preservado;
fonte inválida bloqueou a promoção. Isso não mede a velocidade do ciclo inteiro.

As mesmas 41 suítes obrigatórias passaram em 23,38 s com um processo e em 13,47 s
com dois processos (aproximadamente 1,74×). Estes são ensaios locais únicos,
incluindo preparação das cópias, não uma garantia de ganho em todos os ciclos.

## Instalação e recuperação

`python3 tooling/autoloop/install.py` verifica a identidade do executável original,
compila os novos arquivos, preserva backup em `data/autoloop_backups/` e instala
atomicamente cada arquivo. Em caso de falha, restaura arquivos anteriores.

O controle visual pode ser pausado temporariamente durante a atualização.
`python3 tooling/autoloop/install.py --resume` restaura somente uma pausa iniciada
por esta atualização e preserva qualquer escolha posterior do usuário.

Antes de reverter, pausar o runner e restaurar os arquivos registrados no backup.
Mudanças do projeto precisam ser revisadas separadamente; o instalador não faz
commit, push, deploy nem altera contas.


## Segunda revisão: fila e retrabalho (11/10/2026)

O padrão passa a quatro processos, configurável com `--jobs=1`, `--jobs=2` ou
`--jobs=4`. Comparação no mesmo código e 228 suítes: 48,57 s com dois processos
versus 33,04 s com quatro (1,47×; 32% menos tempo). Os 228 vereditos foram
idênticos, com 194 aprovações. Trata-se de ensaio local único; não estima o
ciclo inteiro, a latência dos modelos ou equivalência clínica.

A fila em `data/.autoloop_failure_queue.json` registra tentativas e alterna
investigações pendentes; pares Python/CJS relacionados são uma investigação,
mas todas as suítes continuam sendo executadas. Diagnósticos detalhados ficam
em `data/autoloop_task_notes/`. Falha não desaparece por atingir limite de tentativas.
O ciclo permanece pendente enquanto houver falhas; publicação exige aprovação integral.

`core/queue_policy.json` permite engenharia somente para escopos revisados com
hash dos testes idêntico. Recuperação de referências CJS ausentes tem escopo
restrito: conferir primeiro o histórico de retirada, recuperar original somente
quando ainda fizer parte do escopo ou corrigir caminho, nunca inventar asserções ou valores.
Os sete wrappers obsoletos identificados nesta revisão agora verificam a desativação
documentada em `498b4a5`, incluindo autorização; o inventário atual tem 229 suítes. Demais casos desconhecidos continuam com Pro. Orientações
genéricas de segurança não devem classificar uma tarefa de interface como clínica.

O prompt finaliza código, bundle e documentação antes da bateria completa, evitando
invalidar o resultado com edições administrativas posteriores. `--reuse` também
pode reaproveitar uma **reprovação** completa estável, mantendo saída 1 e bloqueio.
Timeout, interrupção, mudança de ambiente, inventário ou conteúdo não são reutilizados
como reprovação estável. Para repetir o diagnóstico, rodar sem `--reuse`.

O runner visual atualizado recupera somente encerramentos operacionais com código
positivo, até três vezes, com esperas de 30/60/120 s; mudança de alvo e pausa cancelam
a recuperação. Saída normal e sinais não reiniciam automaticamente. O arquivo
`~/.cache/ia-hub/runner_status.json` informa alvo, PID, tentativas e horário, sem
credenciais. A nova lógica do runner é carregada na próxima abertura desse processo;
substituir seu arquivo em disco não atualiza um processo Python já em memória.

Detalhes da investigação dos testes: `docs/AUTOLOOP_TEST_REVIEW.md`.


## Resumo por tarefa e consumo informado pelo CLI

Antes de cada tentativa, `core/task_context.py` prepara um mapa com arquivos,
funções candidatas e linhas, diagnóstico da suíte, links para logs integrais,
última tentativa e sinalização de mudança dos arquivos. O mapa vem de referências
locais explícitas; funções ainda não identificadas ficam indicadas como desconhecidas.
O agente precisa confirmar o alvo antes de editar. O resumo facilita navegação e
não substitui conteúdo clínico, fontes, critérios de aceite ou leitura do código.

Os mapas ficam em `data/autoloop_task_notes/*.brief.json`; as decisões detalhadas
continuam nos arquivos `.md` correspondentes. O prompt recebe o mapa automaticamente,
inclusive para tarefas do PROGRESS.md. A preparação mediana foi 6,7 ms em dez
execuções locais da pendência pediátrica; isso mede o custo do preparo, não o ganho
na execução do modelo. A economia de tempo e tokens depende de medições reais.

O CLI instalado suporta `--output-format stream-json`. O consumo é registrado
quando um evento terminal informa contadores explícitos em `usage`; dados ausentes
ficam como `null`, sem estimativa por caracteres. Eventos repetidos não somam duas
vezes. Modelos, esforço e conteúdo clínico não foram reduzidos.

`python3 tooling/autoloop/metrics_report.py` produz relatório por tarefa/modelo:
tentativas finalizadas, ciclos aprovados, duração, contadores informados e registros
sem informação de consumo. Ciclo pendente não conta como aprovado. Contadores de
cache são mantidos separadamente; o relatório não inventa totais nem custo financeiro.
A disponibilidade efetiva de tokens dependerá do formato emitido pelo CLI em uso.


## Correção de recusas de auditoria

`core/audit_repairs.py` guarda cada recusa em `data/audit_repairs/<sha>/<id>/`:
parecer integral, diff, escopo, identidade, grupos por arquivo e ligação com pacote
anterior. Pareceres parciais ou inválidos são preservados byte a byte em `raw/`.
Não são promovidos como aprovação. Um diff de commit sem base é marcado como
contexto parcial: não substitui o range completo exigido na auditoria de publicação.

O próximo ciclo prioriza achados associados a um commit ancestral do HEAD atual,
com identidade correspondente e diff disponível. Achados no mesmo arquivo são
agrupados. A execução pode usar até duas frentes via `invoke_subagent` somente
após confirmar independência de arquivos, funções, contratos e dependências.
Os agentes recebem contexto completo, fazem testes direcionados e entregam evidências;
o principal integra e executa uma única bateria completa, após todas as edições.
Conteúdo clínico ou risco desconhecido continua com Pro e fontes identificáveis.

Cada apontamento exige investigação: defeito demonstrado, expectativa antiga com
contrato vigente demonstrável ou evidência incompleta. `response.md` registra a
reprodução, alteração ou contestação fundamentada e testes. Essa resposta não
aprova publicação. A nova auditoria independente verifica o candidato atualizado
e revisita as recusas anteriores; a política de modelos/esforço permanece.

Recusas sem achados utilizáveis não geram defeitos inventados. Após timeout, há
uma tentativa ampliada para 600 s do mesmo candidato; uma segunda expiração bloqueia
novas chamadas repetidas até diagnóstico/mudança de candidato. Duas tentativas de
correção por pacote sem resolução dão espaço às demais pendências, mantendo a recusa.
Não há fallback que dispense auditoria por falta de cota.

As métricas `recusa_auditoria` e `correcao_recusa` registram a recusa e o tempo até
nova aprovação de auditoria, separadamente da publicação. Estimativa inicial:
1,3× a 2× para várias correções independentes; ainda sem medição de casos reais.
Paralelismo, maior orçamento de tempo e leitura de evidências podem consumir mais tokens.


Uma correção já commitada pode solicitar reauditoria imediatamente, antecipando a
espera de 30 minutos/intervalo de deploy, desde que exista resposta por escrito,
checkout limpo e bateria completa aprovada para o conteúdo atual. Isso antecipa a
verificação, não sua aprovação. Recusa do mesmo HEAD conserva o backoff; testes,
build, auditoria e identidade do candidato são conferidos normalmente no pipeline.

## Documento de observação durante 24 horas

Execute `python3 tooling/autoloop/observe.py --hours 24`. O coletor trabalha em
segundo plano, atualiza `data/autoloop_observacao.md` a cada 30 segundos e termina
no prazo. Esse é o único documento a anexar ao chat para análise posterior.
Consulta: `python3 tooling/autoloop/observe.py --status`.

Não reinicia/interrompe o autoloop nem chama modelos. Repetir o comando durante
uma coleta ativa preserva seu prazo. Se o computador for reiniciado, execute o
comando novamente: retoma a janela original, recuperando eventos ainda existentes.
Se já terminou, o comando inicia outra janela e substitui o documento; os eventos
sanitizados anteriores permanecem em `data/autoloop_observations/`.

O documento contém agregados de todas as etapas, repetições e consumo explícito,
20 testes lentos, 20 falhas recorrentes e 40 eventos recentes. Nunca copia prompts,
saída dos agentes, respostas clínicas, credenciais ou contas. Contadores ausentes
não viram zero. Etapas sobrepostas não devem ser somadas. Silêncio não prova
ociosidade. Um processo anterior à instrumentação pode fornecer menos dados;
novas métricas de espera/correlação entram quando o autoloop iniciar novamente.
Ausência de eventos é registrada como cobertura insuficiente, sem inventar duração
de tarefas nem multiplicador de velocidade.
