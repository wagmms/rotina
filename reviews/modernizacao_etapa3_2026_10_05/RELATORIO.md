# Modernização — navegação independente e tempos por etapa

Implementação local em 05/10/2026. Sem deploy, mensagens reais ou chamadas a modelos.

## Comportamento implementado

Após autenticar e persistir o update, o webhook pode executar uma lista fechada de telas estáticas: menu principal, Sala Vermelha, calculadoras, menus DVA e SRI. Isso independe da trava do worker clínico e da configuração TELEGRAM_ASYNC_WORKER. As telas continuam utilizando as funções existentes.

As ações que geram conteúdo ou modificam atendimento permanecem na fila serial. Exemplos: SOAP, confirmação de exame, novo caso, cancelamento, prescrição, escolha de caso e alteração de leito. Enfermaria, agenda e integrações externas não entraram no caminho rápido nesta etapa.

A reserva do pedido pendente é feita sob ScriptLock, com releitura do registro. Webhook e worker não podem reservar o mesmo pedido duas vezes; chamadas externas ocorrem fora dessa trava. O worker recupera também menus persistidos que o webhook não chegou a executar.

A caixa de saída identifica o canal de navegação. Um menu pode ultrapassar uma entrega comum pendente, mantendo a ordem dentro de cada canal. Bloqueios temporais de entrega, como retry_after de 429, continuam adiando novos envios. Entregas incertas não são repetidas automaticamente.

## Métricas

Cada inbox processada registra metricas.esperaMs, metricas.processamentoMs, metricas.canal e metricas.etapas. As etapas instrumentadas são geracao_clinica (caminhos de processarEEntregarIA), download_midia (áudio/foto) e processamento_audio (primeira chamada multimodal). Cada etapa tem ms, chamadas e falhas por exceção.

Cada outbox registra envioMs acumulado e completedAt quando concluída. Os tempos de envio incluem tentativas e pequenas esperas executadas dentro da função de envio. O processamento total inclui etapas e entrega imediata: não se deve somar esses tempos sobrepostos. Entregas adiadas podem terminar depois do processamento do pedido; sua conclusão é observada na outbox vinculada.

Campos métricos contêm apenas durações, contagens e nomes fixos; não contêm prompts, transcrições ou dados clínicos. Os registros originais seguem a persistência e retenção já existentes. Não foi criada interface nova de métricas.

## Validação

- Build e sintaxe dos 13 módulos aprovados.
- `.venv/bin/python -m pytest tests -q --ignore=tests/test_central_hub.py`: 140 testes aprovados em 14,17 s, antes da inclusão do novo arquivo de teste.
- `node tests/test_navegacao_rapida_metricas.cjs`: 11 novos cenários aprovados. Há wrapper pytest para execuções futuras.
- Cenários incluem worker ocupado, modo assíncrono, reserva disputada, duplicidade, autenticação, lista fechada, espera 429, timeout incerto, recuperação pelo worker, métricas exatas por relógio simulado, exceções e ordem clínica FIFO.
- Central Hub não foi executada: área não alterada e bloqueio de sua suíte previamente documentado.
- Motores e prompts clínicos intactos: SHA256 de src/04_motores_ia.js = 361050b2c12838c3ac7b6e0549d96ee4bd0ddbdd9cc0faa10f0a583011013949.

## Limites e continuidade

Não há medição de latência em produção nem promessa de redução do tempo de geração da IA. A navegação ainda depende da disponibilidade e cotas do Apps Script e Telegram. A fila clínica, infraestrutura e contratos clínicos foram preservados.

Ainda faltam integração real do Cockpit, proteção de revisão nos demais callbacks, acompanhamento visual por etapas e detalhamento de tempos de provedores/auditoria/fallbacks. O caminho rápido não é um worker externo nem uma migração de infraestrutura.

Backups dos três módulos alterados em antes/. Master reconstruído em ultra_rotina_master.js.
