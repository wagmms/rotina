# Modernização do bot — primeira etapa

Implementação local em 05/10/2026. Sem deploy, mensagens reais ou chamadas a modelos.

## Alterações

- Entrega SOAP preserva a resposta integral e remove somente o título externo redundante “SOAP · Resumo Clínico”.
- Especialidades do exame físico ficam no catálogo existente, acessível por um botão. A geração de Avaliação e Plano, cópia e demais ações permanecem disponíveis.
- Registrar exame físico totalmente normal exige confirmação explícita. A confirmação tem identificador próprio, expira em cinco minutos, verifica os dados e estado de origem e é invalidada em troca ou encerramento de caso. Repetição e cancelamento não alteram o caso.
- Master reconstruído com validação de sintaxe dos 13 módulos.

## Verificação

35 testes pytest aprovados nos arquivos test_ui_ux_bot.py, test_soap_dois_tempos.py, test_didatica_seguranca_soap_ostensivo.py e test_runtime_bot.py. Mais sete cenários do test_soap_exame_fisico.cjs passaram. Testes de software com simulações; não representam avaliação clínica ou de latência em produção.

src/04_motores_ia.js permaneceu inalterado, SHA256 antes/depois: 361050b2c12838c3ac7b6e0549d96ee4bd0ddbdd9cc0faa10f0a583011013949.

Cópias dos dois módulos modificados estão em antes/. Git não estava acessível neste ambiente.

## Continuação

Esta etapa não implementa ainda persistência e versionamento geral do atendimento, instrumentação de latência, separação da fila de navegação, integração real do Cockpit ou migração de infraestrutura. A proteção contra ações antigas foi aplicada à confirmação de exame normal; os outros callbacks ainda precisam de vinculação geral ao caso. A segmentação de mensagens mantém o comportamento anterior.
