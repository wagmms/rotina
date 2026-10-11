# Autoria e atlas — Tempos 2 e 3

A [diretriz](../../../../03_Geradores_e_Scripts/DIRETRIZ_CRIACAO_DE_CARDS.md) contém o contrato editorial e os exemplos JSON. Use esta referência para persistência de mídia e execução incremental.

## Atlas consistente

`04_Mídias/PASTA/catalogo_midias.json` é uma lista de entradas por nome de arquivo. Preserve as entradas existentes. Para cada nova figura ou recorte, mantenha pelo menos os campos usados pelo extrator:

```json
[
  {
    "file": "figura_unica.png",
    "page": 12,
    "caption": "Legenda conferida no documento de origem",
    "context": "Objetivo para o qual a figura é pertinente",
    "dimensions": "1200x800",
    "suggested_anki_tag": "<img src=\"figura_unica.png\"><br><i>Legenda conferida no documento de origem</i>"
  }
]
```

Os valores são ilustrativos. Leia dimensões e hashes dos arquivos reais. O registro de aprovação verificado por `--require-visual-review` fica em `05_Relatorios/visual_review/CHAVE-assets.json`, gerenciado pela IA, com uma entrada por mídia: arquivo, caminho da fonte, hash da fonte, página física, região PDF, hash da imagem, legenda original, legenda usada, objetivos, finalidade, status e observações da inspeção. Somente a inspeção realizada autoriza status de aprovado. Use um objeto com `deck` e `assets` (lista). Cada entrada deve usar os nomes `file`, `source_file` (relativo à pasta de fontes), `source_sha256`, `page`, `media_sha256`, `caption`, `status` (`approved` após inspeção) e `reviewer`. Preserve ainda `rect`, `original_caption`, objetivos e observações quando aplicáveis. O gate valida tipos, hashes, origem e igualdade da legenda publicada com `caption` (normalizando entidades HTML, Unicode e espaços). Não interpreta pixels. Campos obrigatórios nulos, página não inteira e caminhos inválidos bloqueiam a entrega.

Recortes geram sidecars `.source.json`, manifests e entradas no catálogo automaticamente. Ao renomear um recorte, preserve o sidecar, atualize seu campo `output` e registre a proveniência no catálogo e no relatório visual. Não dependa apenas de `source_pdf` com nome base para distinguir livros; mantenha caminho relativo e hash no relatório. Registre uma origem inequívoca em `sources[].media` nas notas.

O módulo opcional `figure_catalog.py` usa os manifests normais e de recorte para obter identidades. Preserve-os junto ao catálogo; o runner permite reconhecimento com o mesmo placeholder na question e no hint. A autoria direta pode vincular filenames verificados sem passar por esse runner.

## Lotes e checkpoints

Use o tamanho recomendado pela diretriz, ajustando a autoria direta à complexidade e ao orçamento de saída. Não há garantia universal de qualidade baseada numa estimativa fixa de tokens por card. Se houver truncamento, reduza o lote e regenere somente a parte inválida; não publique JSON parcial.

O runner opcional usa `authoring.Plan`: seus blocos são lotes de execução com até 25 notas, e somente o último aceita meta abaixo de 15. Se precisar de lotes menores intermediários, use autoria direta; não forneça um plano incompatível nem acrescente notas supérfluas. Os `fact_ids` do runner ficam no envelope de geração e nos bindings, não no card final.

Antes de salvar um lote:

1. Confira suporte do alvo e comentário, condições clínicas, unidade e uma única tarefa.
2. Conte as ocorrências cloze completas; exija exatamente uma e ordinal 1. Confira também alvo não vazio e ausência de sintaxe residual.
3. Inspecione toda a frente, incluindo dica e tópico, para spoilers semânticos.
4. Confirme filenames, fontes e legendas de mídia; não confunda feedback visual com estímulo de reconhecimento.
5. Preserve IDs e GUIDs publicados; aloque novos IDs acima dos já utilizados, incluindo registros históricos. Uma mudança do objetivo pode exigir nota nova, não reaproveitamento de identidade.
6. Salve atomicamente o JSON e atualize os vínculos; execute a auditoria incremental da skill. Registre hashes e resultado do lote.

## Correção automática opcional

A IA pode corrigir diretamente a redação. `auto_fix.py` requer modelo explícito e credenciais configuradas; ele oferece prévia e `--apply` com backup. Não imprima credenciais nem suponha que o build o invoca. Se usado, inspecione o diff e a qualidade da lacuna e repita as verificações. Preservar o texto revelado não garante preservar a dificuldade ou a ausência de spoilers.

## Publicação recuperável de recortes

O extrator publica imagem, sidecar, manifest e catálogo sob lock e journal `.media-transaction`. Falhas durante a publicação restauram o estado anterior; após término abrupto, a próxima extração recupera o journal antes de continuar. O build bloqueia mídia com transação pendente. A IA deve repetir a extração para recuperar; não apagar o journal manualmente. A extração geral transaciona manifest e catálogo; esta garantia de quatro arquivos aplica-se ao recorte.
