# Plano de cobertura — Tempo 1

Use os critérios editoriais da [diretriz](../../../../03_Geradores_e_Scripts/DIRETRIZ_CRIACAO_DE_CARDS.md). Este documento define registros de planejamento, não novos campos de card.

## Registro persistente

Crie `05_Relatorios/planejamento/CHAVE.md` antes da autoria. Registre:

- Escopo, população-alvo, fontes selecionadas e estado inicial do deck.
- Inventário de arquivos com SHA-256, capítulos/páginas ou linhas/timestamps lidos, falhas e resolução. Uma extração parcial não demonstra leitura integral.
- Aplicabilidade de cada uma das oito dimensões clínicas, com justificativa para exclusões.
- Objetivos identificados por IDs estáveis, proposição a recuperar, prioridade, fontes exatas, posição na aula, tópico previsto e lote.
- Decisão visual por objetivo: estímulo necessário, feedback útil ou sem benefício relevante; recurso selecionado ou motivo de indisponibilidade.
- Estimativa de notas baseada nas tarefas de recuperação e eventuais subdecks; nenhuma cota exige preenchimento artificial.
- Conflitos de fontes, verificações externas, pendências e revisões do escopo.

Além do registro narrativo, persista antes da autoria o plano estruturado autoritativo em `05_Relatorios/planejamento/CHAVE-plan.json`. Cada objetivo tem ID único e definição completa. Exemplo:

```json
{
  "version": 1,
  "deck": "CHAVE",
  "objectives": [
    {
      "id": "obj-001",
      "objective": "Distinguir o achado-alvo de seu principal diferencial",
      "priority": "core",
      "source_locator": "apostila.pdf:12",
      "visual_role": "stimulus"
    }
  ]
}
```

Os vínculos devem repetir exatamente a definição de cada objetivo deste plano. A narrativa `.md` contextualiza decisões; a lista JSON determina o conjunto auditado. Preserve a história das mudanças legítimas de escopo.

Mantenha `05_Relatorios/planejamento/CHAVE-vinculos.json` como documento auxiliar gerenciado pela IA. Formato ilustrativo consumido com `--require-objectives`; os hashes devem ser calculados sobre os arquivos reais, não copiados do exemplo:

```json
{
  "deck": "CHAVE",
  "plan_sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "objectives": [
    {
      "id": "obj-001",
      "objective": "Distinguir o achado-alvo de seu principal diferencial",
      "priority": "core",
      "status": "planned",
      "note_ids": [],
      "source_locator": "apostila.pdf:12",
      "visual_role": "stimulus",
      "reason": "Ainda não redigido",
      "reviewer": "",
      "reviewed_note_hashes": {}
    }
  ]
}
```

Use estados explícitos: `planned`, `covered`, `pending`, `not_applicable`. Exclusões e pendências exigem motivo. `covered` requer IDs existentes, `reviewer` identificando a IA revisora e `reviewed_note_hashes` com cada ID como string associado a `card_audit.content_fingerprint(nota)`. `plan_sha256` é SHA-256 dos bytes de `CHAVE-plan.json`. O gate compara todos os IDs e as definições do plano com os vínculos; omissões, acréscimos e alterações de prioridade, fonte ou finalidade bloqueiam a entrega. Calcule após revisão efetiva; não gere aprovações automaticamente só porque um script passou. Revise o objetivo realmente testado; menção apenas no hint não basta. Não insira `objectives` ou `fact_ids` no JSON final das notas. Se usar o runner opcional, preserve seu contrato próprio em `authoring.Plan` e os bindings que ele gera, sem substituir seus arquivos por este exemplo.

## Cobertura automatizada antes da entrega

O plano completo existe desde o Tempo 1. Materialize `05_Relatorios/coverage/CHAVE.json` no Tempo 4, **antes** do build final, a partir desse plano. Isso evita que a checagem incremental bloqueie cada lote por tópicos futuros ainda não redigidos. O formato aceito é:

```json
{
  "deck": "CHAVE",
  "name": "Especialidade::Tema",
  "min_notes": 1,
  "topics": ["Tema — Dimensão clínica"]
}
```

Substitua o exemplo pelos tópicos efetivos previstos e pela meta mínima justificada no planejamento. Não derive `min_notes` simplesmente da contagem final para fazer o teste passar; documente mudanças legítimas da estimativa. Não use rótulos como “Bloco 1” se eles não correspondem a tópicos reais das notas.

Em decks existentes, preserve a cobertura publicada durante a autoria; planeje expansões no documento auxiliar e atualize o checklist final antes da entrega. Se uma reorganização tornar o checklist anterior incompatível, registre a transição e use um checklist de trabalho fiel ao estágio atual, preservando o anterior; não declare cobertura final por esse resultado intermediário.

`--require-coverage` confere presença de checklist, tópicos e mínimo de notas. A IA deve também conferir que todos os objetivos core estão cobertos, que os IDs vinculados existem, que cada vínculo testa a proposição e que exclusões/pendências permanecem visíveis. Não reduza retroativamente o escopo para ocultar lacunas.

No Tempo 4, use `--require-objectives` junto ao checklist. O gate rejeita hashes antigos, IDs ausentes, notas sem vínculo, objetivos essenciais pendentes e estímulos visuais sem recognition. A IA continua responsável pela pertinência semântica dos vínculos. Se usar o runner, converta seus bindings para este registro após revisão; não invente aprovação.
