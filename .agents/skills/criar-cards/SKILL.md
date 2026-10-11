---
name: criar-cards
description: >-
  Cria, atualiza ou expande flashcards médicos para Anki (Internato e R1-USP),
  com planejamento por objetivos, atlas verificado, autoria em lotes e entrega
  auditada em quatro tempos.
---

# Criador de Cards — execução em quatro tempos

Leia a [diretriz editorial](../../../03_Geradores_e_Scripts/DIRETRIZ_CRIACAO_DE_CARDS.md) antes de gerar notas. Ela é a referência única de conteúdo, formato, limites e exemplos. Esta skill define a sequência operacional; execute comandos a partir da raiz do repositório, substituindo `CHAVE`, caminhos e demais parâmetros pelos valores reais.

A IA executa as operações automatizáveis. Apresente o plano e atualizações sem introduzir pausas de aprovação não solicitadas. Respeite o escopo autorizado de entrega. Não escreva cards antes de concluir a leitura e o planejamento; retorne ao tempo anterior quando surgir uma lacuna, registrando a revisão.

## Tempo 1 — Fontes, setup e planejamento

**Entrada:** pedido, configuração existente e fontes do tema.

1. Identifique `decks.toml`, JSON, mídia e GUIDs existentes. Preserve alterações alheias. Para deck novo, crie o scaffold **antes de extrair imagens**:

   ```bash
   uv run python "03_Geradores_e_Scripts/build_decks.py" --create-deck CHAVE --title "Especialidade::Tema"
   ```

   O scaffold cria o deck inativo e a pasta de mídia. Se já houver artefatos, inspecione e reconcilie a configuração; não apague a pasta para forçar o comando. Use os caminhos efetivos de `decks.toml` nos próximos passos.

2. Leia integralmente os materiais selecionados, registrando hashes, intervalos e falhas. Delimite capítulos pertinentes de obras extensas. Avalie as oito dimensões da diretriz e resolva discrepâncias factuais.
3. Consulte o banco de provas do MedQuest para benchmarking de pegadinhas e distratores de bancas paulistas (USP-SP, USP-RP, UNICAMP, UNIFESP) e ENARE:

   ```bash
   uv run python "03_Geradores_e_Scripts/medquest_benchmark.py" --theme "Nome do Tema" --limit 8
   ```

4. Persista o plano estruturado por objetivos autoritativos conforme o **Padrão Canônico de Cobertura em Dois Níveis** (Nível 1: Core Essencial + Nível 2: Aprofundamento Clínico/Comorbidades/Nuances de Prova do MedQuest, tipicamente ~50–70 cards) e [plano de cobertura](references/plano_de_cobertura.md). Planeje lotes de execução independentemente dos blocos temáticos.
5. Apresente escopo, estimativa e eventuais indisponibilidades. Prossiga automaticamente quando não faltar decisão indispensável.

**Saída:** configuração pronta, registro de leitura e plano persistido antes da autoria. Objetivos não sustentados ficam pendentes, nunca preenchidos por suposição.

## Tempo 2 — Atlas visual e mídias verificadas

**Entrada:** plano e pasta de mídia configurada.

1. Localize figuras e tabelas pertinentes a cada objetivo. Inspecione páginas renderizadas de apostilas e fichas-resumo; a extração automática pura omite tabelas e diagramas vetoriais.
2. Extraia imagens candidatas e **recorte sistematicamente tabelas e fluxogramas**:
   - Escolha o método de extração visual de acordo com a natureza do elemento no PDF:
     - **Extração Local de Imagens e Tabelas (`extract_pdf_images.py`)**: Opera localmente com PyMuPDF e corte determinístico, sem nenhum consumo de API externa.
   ```bash
   uv run python "03_Geradores_e_Scripts/extract_pdf_images.py" "02_Capítulos_PDF/arquivo.pdf" --output "04_Mídias/PASTA" --pages 12
   ```
     - **Inspeção Visual pelo Agente (Antigravity)**: Para diagramas e tabelas compostas, o próprio agente visualiza as páginas do PDF e orienta os recortes exatos.

3. **Mídias de Áudio e Mnemônicos Neurais (Opcional/Alto Rendimento):**
   - Para ausculta real (sopros, estertores) ou mnemônicos, utilize arquivos locais `.mp3` ou `.ogg` embutidos exclusivamente via `<audio controls preload="none" class="med-audio"><source src="arquivo.mp3" type="audio/mpeg"></audio>` (**zero autoplay**; a sintaxe `[sound:...]` é expressamente proibida).
   - Para mnemônicos estruturados ou comentários táticos do preceptor, gere micro-áudios neurais em PT-BR sem custos de API:

   ```bash
   uv run python "03_Geradores_e_Scripts/audio_generator.py" "Texto do mnemônico" --output "04_Mídias/PASTA/audio_mnemonico.mp3"
   ```

4. Unifique extração e recortes no catálogo da pasta temática (`catalogo_midias.json`).
5. Confira cada imagem contra a página original. Registre proveniência, hash, legenda (mínimo 6 palavras), finalidade (`feedback` ou `recognition`), objetivos vinculados e resultado da inspeção.
   - **Obrigatoriedade de Cards de Reconhecimento (`recognition`):** Para objetivos diagnósticos (ECG, Rx, TC, USG, lesões clínicas/dermatológicas), é mandatória a criação de cards no modo `recognition` (`type: basic`, `image_mode: "recognition"`), com o recorte cirurgicamente isolado de títulos ou legendas reveladoras na frente e resposta direta no verso.

**Saída:** catálogo e revisão visual persistidos, incluindo tabelas, figuras, traçados e áudios, ou justificativa de ausência de mídia.

## Tempo 3 — Autoria incremental e peer-review clínico

**Entrada:** plano e atlas inspecionado. Consulte [qualidade e execução por lote](references/qualidade_e_tokens.md).

1. Redija no JSON configurado segundo a diretriz. Mantenha ID estável, evidência literal e vínculo objetivo–nota em documento auxiliar. Os metadados de planejamento não entram no JSON final.
2. Aplique atomicidade estrita: exatamente **uma ocorrência de `{{c1::...}}`** com no máximo 5 palavras em notas cloze; em notas basic, pergunta e resposta direta terminada em ponto.
3. Vincule sistematicamente os recortes de tabelas e figuras no `hint` dos cards correspondentes como feedback visual pós-resposta (`<img src="..."><br><i>Legenda descritiva com 6+ palavras</i><br><br><b>Comentário:</b> ...`), garantindo a fonte em `sources[].media`. Tabelas de critérios e escores devem utilizar `<table class="med-table">`. Em tópicos de prova, aplique obrigatoriamente a arquitetura dos **4 Eixos de Excelência Editorial**:
   - **Eixo 1 (MedQuest Benchmarking):** Inserir `<b>🎯 Ponto de Corte de Prova:</b>` contendo estritamente a Banca Examinadora (SEM ANO), Pegadinha da Banca e Gatilho Decisório.
   - **Eixo 2 (Atlas Visual e Multimodalidade):** Imagens semiológicas, traçados de ECG, fluxogramas recortados e áudios de preceptoria sob demanda.
   - **Eixo 3 (Engenharia Cognitiva Reversa e Mnemônicos):** Injetar `<b>🧠 Fisiopatologia em Camadas:</b>` (gatilho celular $\rightarrow$ repercussão hemodinâmica/orgânica) e `<b>💡 Mnemônico Estruturado:</b>` (acrônimo mnemônico validado com letras em negrito).
   - **Eixo 4 (Algoritmos Decisórios Sequenciais):** Em questões de manejo ou conduta escalonada, estruturar `<b>⚡ Algoritmo Decisório Sequencial:</b>` (Passo 1 $\rightarrow$ Bifurcações A/B $\rightarrow$ Passo 2 de Reavaliação/Resgate $\rightarrow$ Ponto de Virada de Prova).
4. Submeta os lotes ao **Peer-Review Clínico do Preceptor Chefe** para filtragem anti-ciclo básico e validação de evidências:

   ```bash
   uv run python "03_Geradores_e_Scripts/clinical_auditor.py" --deck CHAVE
   ```

5. Valide o JSON acumulado, inclusive deck inativo:

   ```bash
   uv run python "03_Geradores_e_Scripts/build_decks.py" --deck CHAVE --include-inactive --check --strict
   ```


6. Corrija erros e avisos e registre o lote concluído. Não use `--ci`, `--skip-source-check` ou `--skip-media-check` como evidência de entrega.

**Saída:** notas persistidas e lotes revisados com conformidade clínica e editorial.

## Tempo 4 — Conciliação, pacote e entrega

Siga [auditoria e fechamento](references/tempo_3_auditoria_fechamento.md); o nome histórico desse arquivo foi mantido para preservar links.

**Entrada:** plano, notas e evidências dos lotes.

1. Reconcilie todos os objetivos com notas efetivamente testadas; examine duplicação entre blocos e registre pendências. Materialize o arquivo de cobertura antes da validação final, conforme o plano. Revise fontes e renderização, não apenas a estrutura.
2. Execute a auditoria final do deck completo:

   ```bash
   uv run python "03_Geradores_e_Scripts/build_decks.py" --deck CHAVE --include-inactive --check --release --report "05_Relatorios/audit-CHAVE.json"
   ```

3. Resolvidas as pendências da entrega, ative o deck em `decks.toml` e empacote com os mesmos critérios:

   ```bash
   uv run python "03_Geradores_e_Scripts/build_decks.py" --deck CHAVE --release --report "05_Relatorios/build-CHAVE.json" --anki-sync
   ```

   Esse comando importa localmente via AnkiConnect; não realiza sincronização AnkiWeb. Se o pedido for somente gerar o pacote, omita `--anki-sync`. `auto_fix.py` não é invocado automaticamente.
4. Confira o status de importação no relatório: o CLI retorna falha se a importação ou a verificação da coleção falhar. Execute `--doctor` como diagnóstico complementar; ele também não prova importação.

**Saída:** `.apkg` verificado, relatórios e estado de importação confirmado ou bloqueio explícito. Entregue contagens de notas/cards/mídias, cobertura real e links aos artefatos; não declare completude com objetivos essenciais pendentes.
