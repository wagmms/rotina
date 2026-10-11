# Auditoria e fechamento — Tempo 4

O nome do arquivo é histórico. Esta é a referência do quarto tempo da [skill](../SKILL.md); os comandos de auditoria e build ficam centralizados nela.

## 1. Conciliação antes de empacotar

Confira objetivo por objetivo no plano persistido, vinculando IDs reais. Verifique separadamente cobertura do núcleo, aprofundamentos, extras e objetivos visuais pendentes. Revise duplicatas semânticas entre todos os tópicos. Não remova discriminações clínicas úteis apenas por semelhança textual.

Materialize o checklist de cobertura conforme [plano de cobertura](plano_de_cobertura.md) antes da auditoria final. Compare com a estimativa original; alterações de escopo precisam de motivo, não ajuste automático ao que já foi produzido.

## 2. Conferência de fontes e renderização

Confira excertos nas páginas/trechos originais e a sustentação do alvo e comentário. Confirme o significado clínico; ocorrência literal não prova suporte. Revise numerais, unidades, contexto e conflitos registrados.

Gere a galeria:

```bash
uv run python "03_Geradores_e_Scripts/visualize_deck_media.py" CHAVE --include-inactive --output-dir "05_Relatorios/visual_review/"
```

A IA abre e inspeciona o HTML produzido, cada mídia única e sua correspondência com a fonte. Gere também a prévia dos templates com `uv run python "03_Geradores_e_Scripts/render_deck_preview.py" CHAVE --output "05_Relatorios/visual_review/CHAVE-preview.html"`. Examine frente e verso em tamanho de tela de estudo; a galeria isolada não comprova a apresentação exata no Anki. Registre limitações de renderização quando não houver ferramenta adequada, sem afirmar inspeção que não ocorreu.

Verifique legibilidade, recortes, legenda, ordem imagem–legenda–comentário, ausência de spoilers na frente e mídias ausentes. Compare hashes com a revisão anterior e reinspecione mudanças. Mídia não utilizada não deve ser incluída por obrigação nem apagada sem verificar seu uso por outros decks.

## 3. Validação e pacote

Execute os comandos finais da skill com `--release` (ativa rigor estrito, cobertura, objetivos e revisão visual), sem flags que pulem fontes ou mídia. Revise erros e avisos, inclusive falsos positivos: corrija o conteúdo ou documente e resolva a causa técnica, sem desativar o gate para obter um pacote verde.

A auditoria estrutural, revisão clínica, revisão visual e cobertura são resultados separados. Após qualquer alteração de nota ou mídia, repita as verificações afetadas antes do build. O build já verifica estrutura e contagens do pacote exportado; leia `package_verification` no relatório. Preserve IDs/GUIDs e não reinicialize o registro para eliminar divergências.

## 4. Importação local confirmada

`--anki-sync` chama `importPackage` no AnkiConnect local. Isso não significa sincronização AnkiWeb. O CLI propaga falhas e `anki_delivery.py` consulta a coleção após a operação para verificar campos, tags esperadas, cartões/deck e mídias. Confira `import.status` no relatório; somente `confirmed` comprova esse conjunto de verificações.

Procedimento automatizável pela IA:

1. Antes da importação, consulte a API local para identificar disponibilidade, deck e notas existentes; registre apenas os metadados necessários à comparação.
2. Use timeout nas chamadas. Registre sucesso/erro efetivo de `importPackage`; não use somente o exit code do build como prova.
3. Consulte as notas do deck com `findNotes` e `notesInfo`, e cartões quando necessário. Compare campos normalizados e contagens esperadas; não espere que uma atualização aumente a contagem. Para mídias utilizadas, confirme disponibilidade e conteúdo pela API quando suportado.
4. Se a resposta da importação for incerta, consulte o estado antes de repetir; o módulo já faz essa verificação e limita a nova tentativa ao ajuste concreto de caminho Flatpak. Verifique identidade persistente antes de nova tentativa; não use exclusão/reimportação como correção padrão.
5. Se houver falha de conexão ou acesso, investigue e corrija automaticamente dentro do escopo autorizado. Faça no máximo uma nova tentativa após uma correção concreta. Se continuar indisponível, entregue o APKG verificado e informe importação bloqueada, sem anunciar sucesso nem exigir que o usuário execute scripts.

O diagnóstico `--doctor` é complementar: pode identificar problemas de pacote, configuração ou GUIDs, mas não substitui a confirmação na coleção e pode trazer problemas de outros decks fora do escopo.

## 5. Relato de entrega

Registre em `05_Relatorios/entrega-CHAVE.json`, como relatório da IA: hashes de entradas e pacote, contagens, objetivos cobertos/pendentes/excluídos com motivos, auditoria estrutural, revisão das fontes, revisão visual, verificação do pacote e importação (`confirmed`, `failed`, `unverified` ou `not_requested`). Não marque uma etapa executada somente por outra ter passado.

Na resposta, forneça links ao pacote e relatórios, contagens e estado real da entrega. Informe limitações ou lacunas relevantes. Não altere modelos, configurações FSRS ou histórico da coleção para facilitar a publicação.
