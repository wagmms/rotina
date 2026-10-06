# Modernização — continuidade do atendimento e ações versionadas

Implementação local em 05/10/2026, sem publicação, chamadas a modelos ou mensagens reais ao Telegram.

## Comportamento

- O atendimento atual é persistido por chat no mecanismo existente PersistenciaBot, com identificador do caso e revisão opaca. Cache passa a servir apenas à compatibilidade; a leitura persistente é autoritativa.
- Pausas superiores a 15 minutos e perda de cache não encerram o caso. /novo, /cancelar e Novo Caso continuam definindo explicitamente seu ciclo de vida.
- Encerramento grava marcador sem dados clínicos na chave do atendimento, impedindo recuperação de cache antigo. Isso não representa exclusão de registros da fila ou mensagens já enviadas.
- Estado legado ainda válido é migrado; legado expirado não é recuperado.
- Mudança de modo mantém identidade do caso e altera a revisão. Atualizações idênticas não geram gravação redundante. Novo Caso cria outra identidade.
- Outros comandos suspendem o modo de entrada livre sem apagar os dados persistidos.
- Gerar Avaliação e Plano, Atualizar SOAP e EF Normal recebem a revisão que originou a resposta. Botões antigos ou sem revisão são recusados. Confirmações de exame normal mantêm a proteção implementada na etapa anterior.
- Falha de persistência não substitui silenciosamente o atendimento por estado vazio nem limpa auxiliares antes de concluir a gravação.

## Validação

Build dos 13 módulos e sintaxe aprovados. Comando `.venv/bin/python -m pytest tests -q --ignore=tests/test_central_hub.py`: 140 testes aprovados em 10,79 s. A suíte Central Hub foi excluída por não fazer parte da alteração e por seu bloqueio previamente documentado; não se afirma aprovação de toda a suíte do projeto.

O novo teste de persistência executa 12 cenários Node, incluídos no total pytest por um teste agregador: cache ausente, pausa, versões, encerramento com cache obsoleto, migração, expiração legada, falhas de leitura/escrita, callbacks antigos, limite de bytes, revisão capturada antes da geração, suspensão de modo e isolamento entre chats.

Prompts e motores de IA inalterados: SHA256 de src/04_motores_ia.js permanece 361050b2c12838c3ac7b6e0549d96ee4bd0ddbdd9cc0faa10f0a583011013949.

## Limites e próximos passos

Esta etapa mantém somente o estado atual, não um histórico de todas as versões. O limite de entrada e os limites do armazenamento existente permanecem. Ler a fonte persistente tem custo de I/O; não há evidência de redução da latência nesta etapa.

A vinculação de ações à revisão cobre os três botões citados, não todos os callbacks de exames, imagens, prescrição e navegação. Botões anteriores à atualização desses três tipos serão recusados, exigindo gerar uma resposta atualizada.

Permanecem pendentes instrumentação detalhada de tempos, navegação independente da fila de IA, integração real do Cockpit, vinculação dos demais callbacks e eventual migração de infraestrutura. A serialização do worker existente foi mantida.

Backups dos módulos modificados em antes/. Master reconstruído em ultra_rotina_master.js. Não houve deploy.
