# Auditoria do bot clínico — 8 de outubro de 2026

O maior ganho imediato está em corrigir a seleção de medicamentos, a recuperação de protocolos e a fidelidade do prontuário. A infraestrutura também permite melhorar a responsividade sem reduzir o raciocínio clínico. Não recomendo reduzir modelo, contexto ou revisão de segurança como primeira intervenção.

## Escopo e limites

Inspeção do checkout local, HEAD `6383bd9`, com alterações e exclusões preexistentes. Foco em `src/`, runtime Node.js, servidor Fastify, bases locais e testes. Nenhum arquivo de produção foi alterado, nenhum deploy foi realizado e nenhum dado de paciente ou credencial foi usado. Os arquivos criados estão apenas nesta pasta de auditoria.

Executei dez reproduções isoladas dos módulos atuais e três suítes existentes. Não fiz avaliação clínica prospectiva, chamadas reais aos modelos, medição de latência no Render nem conferência integral das 976 fichas HSL. As falhas determinísticas abaixo são comprovadas localmente; não significam que observamos todas elas numa resposta final enviada pelo bot em produção. Um modelo pode contrariar a entrada errada, mas essa possibilidade não constitui uma proteção confiável.

Reprodução: `node auditorias/2026-10-08/reproduzir.cjs`, a partir da raiz do projeto. As asserções desse script documentam defeitos atuais; sucesso do script significa reprodução, não aprovação clínica. Resultados em `evidencias.json` nesta pasta.

## Achados prioritários

### 1. P1 — A calculadora pode escolher outro medicamento ou criar uma indicação

Evidências A01–A03. `calcularPosologiaPorTextoLivre('paracetamol para febre criança 20kg')` retorna dipirona. `hidratação criança 20kg` retorna amoxicilina por dez dias. `loratadina`, sem idade nem peso, retorna uma dose e registra peso de 20 kg.

A ordem dos testes por palavras dá precedência a “febre” sobre paracetamol; o caso não reconhecido cai em amoxicilina. Há pesos substitutos fixos. O problema é ampliado por `gerarPrescricaoComIA`, que incorpora o resultado como “trava” e ordena copiar os números sem recalcular.

Código: [seleção de fármacos](</home/wagmoraes/Projetos IA/Rotina/src/02_calculadoras_puras.js:1674>), [fallback para amoxicilina](</home/wagmoraes/Projetos IA/Rotina/src/02_calculadoras_puras.js:1708>), [extração e pesos substitutos](</home/wagmoraes/Projetos IA/Rotina/src/02_calculadoras_puras.js:2003>), [inserção obrigatória no prompt](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1451>).

Correção: separar identificação do fármaco, decisão clínica e aritmética; priorizar nome explícito; retornar “não reconhecido” sem eleger antibiótico; exigir apenas os dados realmente necessários para cada indicação; nunca preencher peso como dado do paciente. Dose fixa por idade deve ser representada sem peso fictício. Um cálculo correto não valida indicação, apresentação ou segurança.

Aceite: pedidos sem medicamento identificado não geram antibiótico; sintomas não substituem fármaco explícito; ausência de dado obrigatório interrompe apenas o cálculo dependente daquele dado; idade, peso, concentração e indicação têm testes de fronteira.

### 2. P1 — Recuperação de protocolo ignora negação e tipo de choque

Evidências A04–A05: “choque anafilático” e “sem sepse, crise de asma” retornam Sepse e Choque Séptico. A busca usa substrings e mapeia qualquer “choque” para sepse. O resultado é apresentado ao modelo como protocolo oficial de referência.

Código: [roteamento](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:777>), [injeção no contexto](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1843>).

Correção: considerar negação, hipóteses concorrentes, limites de palavras e subtipo de choque; não forçar protocolo quando a correspondência for ambígua; criar percursos separados para anafilaxia, choque hemorrágico, cardiogênico e séptico. Testar “descartar”, “nega”, antecedentes e casos com múltiplos problemas.

### 3. P1 — SOAP pode converter ausência de informação em fato clínico

Ambas as fases instruem “alergias relatadas ou ‘Nega alergias medicamentosas conhecidas’” e fazem o mesmo para medicamentos de uso contínuo. Isso contradiz a regra geral de não inventar dados. Na fase 2, o Objetivo recebido do modelo entra diretamente no registro; na fase 1, a proteção é uma comparação textual parcial de algumas medidas.

Evidências A06–A07: com saída simulada contendo PA não informada, a fase 2 preserva esse valor. Isso demonstra ausência de barreira, não frequência real de alucinação. A normalidade não numérica também não recebe validação factual robusta na fase 1.

Código: [prompt da fase 2](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:965>), [Objetivo sem conferência](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1002>), [prompt da fase 1](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1039>), [sanitização parcial](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1067>).

Correção: estado explícito “informado / negado explicitamente / desconhecido”, com origem no relato e confirmação humana. Separar achado observado, hipótese e sugestão de investigação no objeto clínico. Exame normal genérico não deve expandir automaticamente manobras específicas não confirmadas.

### 4. P1 — Plano clínico pode perder itens silenciosamente

`formatarListaTopicos` aplica `slice(0, 8)` a listas, inclusive ao plano consolidado. A08 comprova que um plano com dez itens perde o nono e o décimo sem aviso. Itens finais podem conter retorno, monitorização ou contraindicações.

Código: [corte](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:940>).

Correção: preservar a lista integral e segmentar a entrega no Telegram. Brevidade deve reorganizar a apresentação, sem excluir conteúdo clínico relevante.

### 5. P1 — Protocolos fixos misturam versões e cenários terapêuticos

O protocolo de sepse mantém SSC 2021, apesar da publicação da SSC 2026 em 23/03/2026. O prompt resume expansão volêmica por “lactato elevado”, enquanto a base local explicita outro limiar. É necessário reconciliar critérios, força de recomendação, reavaliação e versão, não apenas trocar o ano. [Fonte: SCCM, SSC 2026](https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026).

O protocolo de CAD rotulado ADA 2024 mantém critério de resolução com ânion gap e bicarbonato ≥15, compatível com o consenso antigo. O consenso de 2024 define resolução por cetonemia e pH/bicarbonato e desaconselha usar ânion gap como critério de resolução. Portanto, a referência nominal não demonstra que o conteúdo foi atualizado. [Fonte: consenso ADA/EASD 2024](https://link.springer.com/article/10.1007/s00125-024-06183-8).

O protocolo único de IAM “com e sem supra” apresenta bolus EV de enoxaparina sem separar adequadamente os cenários. A bula distingue o esquema de angina instável/IAM sem onda Q do esquema para STEMI. Essa distinção precisa existir antes da geração da resposta. [Fonte: bula de enoxaparina, DailyMed](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=45a66675-b159-42b8-9f18-ff80f28e1503).

Código: [protocolos](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:665>), [diretrizes no prompt](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:80>).

Correção: revisar prioritariamente sepse, SCA e CAD/EHH; cada regra deve ter população, cenário, exceções, trecho de origem, URL específica, versão e data de revisão clínica. Divergências com protocolos brasileiros/institucionais precisam de justificativa documentada.

### 6. P1 — Extração HSL e seleção de contexto podem transmitir uma base incompleta

A09 encontrou 257 registros com campo pediátrico vazio e menção a pediatria no campo adulto. Esse número indica necessidade de revisão da extração; não significa que os 257 tenham dose pediátrica aplicável. Por exemplo, o registro de abatacepte contém restrição pediátrica dentro do campo adulto.

Mesmo assim, o formatador transforma campo pediátrico vazio em afirmação de ausência de padronização na fonte. Ausência na extração não permite concluir ausência na fonte. Além disso, o contexto enviado à prescrição omite campos existentes como contraindicações, dose máxima, gestação e preparo/diluição. A escolha de até oito medicamentos é ordenada por REMUME e alfabeto, sem garantir prioridade ao medicamento explicitamente solicitado.

Código: [rótulo de ausência](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:495>), [ordenação e contexto](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:623>), [base local](</home/wagmoraes/Projetos IA/Rotina/src/data/guia_farmaceutico_hsl.json:1>).

Correção: preservar texto original e origem por ficha; diferenciar “não extraído”, “não localizado” e “uso não recomendado”; auditar amostra estratificada de medicamentos de maior risco; recuperar todas as condições de segurança pertinentes e medir cobertura antes de compactar. Cadastro na REMUME deve ser apresentado como padronização, sem prometer estoque atual.

### 7. P1 — Prescrição dentro do SOAP não recebe o mesmo circuito de segurança de `/rx`

A fase 2 pede prescrição detalhada baseada em REMUME/SUS, mas sua chamada recebe apenas o caso: não busca a mesma base HSL/REMUME nem passa pela segunda auditoria aplicada em `gerarPrescricaoComIA`. O auditor de `/rx`, por sua vez, recebe a lista REMUME, mas não o mesmo contexto HSL integral do gerador. Trocar de interface muda as proteções.

Código: [SOAP](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:996>), [auditoria](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:888>), [prescrição](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:1542>).

Correção: usar um único serviço de proposta medicamentosa, com o mesmo caso estruturado, fontes e validações em SOAP, áudio, emergência e `/rx`. Distinguir pendência que impede uma dose de dado que apenas melhora o raciocínio. A revisão por outro passe do mesmo modelo é complementar, não certificação independente.

### 8. P2 — Worker HTTP não libera o servidor durante a inferência

O Fastify chama `runtime.doPost` de forma síncrona. Embora a requisição HTTP externa seja executada por worker, a thread que atende o servidor espera com `Atomics.wait`. A fila global processa um update por vez. Logo, healthcheck, cockpit e novos pedidos podem esperar durante a chamada em curso; responder cedo ao webhook não elimina esse bloqueio.

Código: [execução no servidor](</home/wagmoraes/Projetos IA/Rotina/server/index.js:182>), [espera bloqueante](</home/wagmoraes/Projetos IA/Rotina/server/runtime.js:430>).

Melhoria: transferir a execução completa do bot para worker/processo dedicado, deixando ingresso, healthcheck e cockpit responsivos. Depois migrar transporte para `fetch` assíncrono. Manter ordenação por atendimento, versionamento e idempotência; não habilitar concorrência sobre o estado global atual sem isolamento. Isso melhora disponibilidade e espera em fila; não promete reduzir o tempo intrínseco do modelo.

### 9. P2 — Orçamento temporal não é um prazo total real

A cascata verifica 50 segundos entre tentativas, mas chamadas externas usam timeout padrão de 60 segundos. Auditoria, nova chamada e fallback multimodal podem iniciar novos contextos de orçamento. O total pode ultrapassar consideravelmente o valor configurado.

Código: [orçamento](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:122>), [fetch sem prazo restante](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:425>), [timeout padrão](</home/wagmoraes/Projetos IA/Rotina/server/runtime.js:419>).

Melhoria: prazo absoluto por job, timeouts por etapa e reserva explícita para revisão/entrega. Se o tempo se esgotar, manter estado pendente com recuperação; não enviar rascunho como concluído. Medir antes de escolher os limites.

### 10. P2 — Fallback clínico não tem uma barreira de homologação executável

A lista clínica contém aliases mutáveis e modelos leves; a cascata inclui `openrouter/free`. `clinico: true` não restringe todos os provedores e o fallback multimodal escolhe modelos leves. O comentário “homologado” não corresponde, por si só, a uma verificação de evidências por tarefa/modelo/versão.

Código: [configuração](</home/wagmoraes/Projetos IA/Rotina/src/00_config.js:29>), [cascata](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:530>), [fallback multimodal](</home/wagmoraes/Projetos IA/Rotina/src/04_motores_ia.js:685>).

Não foi demonstrada inferioridade de um modelo específico nesta auditoria. O achado é ausência de garantia técnica de que a troca preserva desempenho clínico. Exigir matriz de aprovação por tarefa e registrar modelo efetivamente resolvido; falhar de forma explícita quando nenhum modelo aprovado estiver disponível.

### 11. P2 — `/evidencia` entrega bibliografia, sem avaliação de aplicabilidade

A função retorna até três resultados recentes, usa PubMed apenas como fallback e mostra título/autores/PMID. Não lê o conteúdo para avaliar população, comparador, desfecho, tamanho do efeito, limitações ou impacto no caso. É útil como localizador, mas insuficiente como apoio científico à decisão.

Código: [busca](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:804>), [formatação](</home/wagmoraes/Projetos IA/Rotina/src/03_bases_locais.js:883>).

Melhoria: pergunta PICO quando pertinente, busca por relevância e tipo de estudo, leitura de resumo/texto disponível, identificação de retratação/correção e síntese “o que muda neste paciente”. Nunca inferir resultado de artigo a partir do título. Para condutas usuais, priorizar uma biblioteca de diretrizes revisadas; busca web complementa dúvidas e atualização.

### 12. P2 — Testes e telemetria não demonstram qualidade clínica real

As suítes executadas `test_auditoria_qualidade_clinica.cjs` e `test_soap_dois_tempos.cjs` passaram, com 8/8 cenários cada. Ambas simulam respostas de IA e leem o bundle `ultra_rotina_master.js`; o runtime de produção carrega `src/`. O teste de telemetria também passou. Esses resultados validam comportamentos específicos, não equivalência científica nem desempenho real.

A10 mostra que uma resposta HTTP 429 é contada como zero erros quando não lança exceção. Isso subestima falhas de API. O script antigo de comparação clínica depende de fixtures em uma pasta marcada como excluída no checkout atual; não o executei nem restaurei essas exclusões.

Código: [métricas](</home/wagmoraes/Projetos IA/Rotina/server/telemetry.js:34>), [teste com saída simulada](</home/wagmoraes/Projetos IA/Rotina/tests/test_auditoria_qualidade_clinica.cjs:75>), [comparação antiga](</home/wagmoraes/Projetos IA/Rotina/scripts/comparar_bot_clinico.cjs:3>).

Melhoria: testes sobre a mesma origem carregada em produção; status HTTP, modelo resolvido, tokens, tentativas e duração por etapa sem conteúdo identificável; conjunto clínico independente com referência e revisão humana.

## Produto mais útil à beira-leito

Preservar as boas bases existentes: persistência por atendimento com revisão, confirmação de exame normal, calculadoras puras, catálogo local de medicamentos, segunda revisão de prescrições, checkpoint de entrega e associação de trechos a fontes na busca.

Evoluir a resposta em camadas: primeiro decisão/prioridade e pendências críticas; depois conduta operacional e reavaliação; por fim justificativa e fontes acessíveis por botão. Manter conteúdo integral acessível, com separação explícita entre rascunho e registro confirmado.

Para APS: lista de problemas, conciliação medicamentosa, sinais de alarme, retorno com prazo e orientação copiável ao paciente. Para pronto-socorro: síndrome, estabilidade, ações imediatas, contraindicações e escalonamento. Para enfermaria: evolução temporal, pendências com responsável/prazo, monitorização e passagem de plantão. Para estudo: justificativa e perguntas didáticas sob demanda, preservando a objetividade do fluxo assistencial.

O estado do atendimento já tem `caseId` e `revision`; deve evoluir de texto livre para fatos estruturados com origem, unidade, horário e confirmação. Antes de concluir uma prescrição, mostrar os dados relevantes efetivamente usados. Correção de um fato precisa invalidar sugestões dependentes dele.

## Sequência recomendada e critérios de sucesso

| Etapa | Entrega | Critério de aceite |
|---|---|---|
| 1 — Integridade clínica | Corrigir seleção de fármaco/protocolo, pesos fictícios, negativas automáticas e corte de listas | Os casos adversariais deixam de reproduzir falhas; sem perda de dados confirmados |
| 2 — Fontes e prescrição | Revisar protocolos críticos, corrigir extração HSL e unificar validações de medicamentos | Toda recomendação crítica rastreável; mesma proteção em qualquer interface |
| 3 — Responsividade | Isolar execução clínica, medir e controlar prazos/retries | Healthcheck e cockpit responsivos sob carga; zero duplicação e preservação de ordem |
| 4 — Uso diário | Fatos estruturados, respostas em camadas, retorno e pendências | Menos correções manuais e tempo até decisão revisável, sem omissões relevantes |
| 5 — Homologação contínua | Avaliação clínica de modelos, prompts e fontes versionados | Mudanças aprovadas por comparação clínica e métricas operacionais |

Como conjunto inicial de avaliação, proponho pelo menos 60 casos sintéticos revisados: 20 APS, 15 emergência, 15 enfermaria e 10 situações especiais/adversariais. Incluir pediatria, gestação, insuficiência renal, polifarmácia, negação, múltiplos medicamentos, dados ausentes, áudio ambíguo, troca de paciente e correções seriadas. É um ponto de partida, não tamanho amostral que prove segurança.

Executar respostas reais dos modelos candidatos, inclusive seus fallbacks, com repetição e revisão cega por clínicos. Separar erros de alta gravidade, dose/unidade, fidelidade ao relato, evidência e utilidade. Qualquer erro grave encontrado exige análise antes da liberação; zero erros numa amostra pequena não certifica segurança. Medir p50/p95 de fila, geração, revisão, entrega e tempo até uma resposta utilizável. Não há base nesta auditoria para prometer ganho percentual de velocidade ou precisão.

**Recomendação final:** começar pelos achados 1–7 e pelo isolamento do servidor. Eles tratam riscos concretos e melhoram a experiência sem depender de reduzir a qualidade do raciocínio.
