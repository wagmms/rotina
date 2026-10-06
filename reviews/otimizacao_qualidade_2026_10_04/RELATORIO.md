# Primeira etapa: desempenho com preservação do conteúdo médico

Alterações locais em 04/10/2026. O master foi reconstruído; nenhuma publicação, mensagem real ao Telegram ou chamada real a modelos foi realizada.

## Implementação

- REMUME integral reutilizada na memória da execução durante a validação. Em outra execução, a leitura é feita por manifesto e lote, sem abrir Sheets. Saídas de outros modos deixam de fazer a validação farmacológica destinada ao botão de receita.
- Aquecimento passa a ler as duas fontes mesmo quando o cache está válido. Novos fragmentos têm identificadores exclusivos; o manifesto só é publicado após as escritas. Fragmentos ausentes ou tamanho divergente causam recarga integral. A identidade da fonte evita reutilizar outra planilha, e bases vazias substituem corretamente dados antigos. Cache indisponível não impede usar a fonte recém-lida. Falha no aquecimento de uma base não impede tentar a outra, e a execução registra falha quando não consegue atualizar.
- Compatibilidade de leitura com o cache antigo preservada. Partes novas são limitadas a 16.000 unidades UTF-16, sem separar pares substitutos, abaixo do limite de bytes do serviço. Versões anteriores expiram naturalmente.
- Removidos os cortes arbitrários de 40 correspondências na REMUME e nas interações. Sem correspondência, a REMUME inteira é preservada, em vez das primeiras 50 linhas. O fallback do gerador também deixa de truncar a base em 12.000 caracteres.
- A segunda auditoria recebe a mesma lista de apresentações que o gerador. Falhas, respostas ambíguas e truncamento são diferenciados de `SEM ALERTAS`. Todos os problemas identificados são solicitados ao auditor, sem o antigo limite de cinco linhas. Alertas, auditoria incompleta ou indisponível impedem a exportação da receita em PDF, inclusive por callbacks anteriores.
- Metadados de grounding são aproveitados na mesma resposta da API. Referências são ligadas somente a trechos exatos e únicos presentes no texto. Fontes inválidas não são renderizadas, e ausência de referências é informada. URLs são preservadas durante a limpeza de Markdown. A associação retornada pelo provedor não é apresentada como validação clínica.
- A prioridade permanente de qualidade médica foi registrada no AGENTS.md do projeto.

## Evidência e limites

- Build dos 13 módulos e validação de sintaxe aprovados.
- `node tests/test_otimizacao_qualidade.cjs`: 24/24 cenários aprovados.
- `.venv/bin/python -m pytest tests -q --ignore=tests/test_central_hub.py`: 122 testes aprovados em 5,16 segundos. Um desses testes executa os 24 cenários Node; os totais não são independentes.
- Cenários novos cobrem falha parcial de publicação, leitura durante atualização, expiração de fragmentos, Unicode, mudança de fonte, base vazia, cache indisponível, compatibilidade legada, registros após os antigos cortes, revisão indisponível e referências.
- Validação com a REMUME já carregada: zero operações remotas no teste instrumentado. Em execução nova: um `get` do manifesto e um `getAll` dos fragmentos, sem Sheets. Grounding: uma requisição ao modelo, com referências preservadas.
- Modelos padrão, persona, bloco de segurança medicamentosa, configuração de raciocínio e limites de saída dos provedores foram preservados. Hash e verificações em `evidencias.json`; versões anteriores dos arquivos em `antes/`.
- A suíte geral não concluiu na Central Hub. A execução isolada confirmou os cinco testes do scanner e ficou pendente em `test_api_status_endpoint`; foi limitada a 20 segundos. A Central Hub não foi alterada. Isso impede afirmar que toda a suíte do projeto passou.
- Não há medição em produção nem avaliação clínica de respostas reais nesta etapa. Preservar registros antes cortados e fornecer a lista ao auditor pode aumentar tokens em alguns casos; não se promete redução universal de latência. A prioridade é não omitir informação para acelerar.

## Continuação dependente de dados de produção

O tratamento de cotas por projeto não foi alterado: é necessário identificar quais chaves compartilham um projeto, sem inferir isso pela ordem do pool. Também permanece para uma etapa posterior o feedback de progresso por etapas e a instrumentação de tempos reais. Não houve troca de modelos, redução do raciocínio, desativação de auditoria ou publicação de conteúdo médico parcial.
