# Modernização — Cockpit conectado ao atendimento

Implementação local em 05/10/2026. Não houve deploy nem chamadas reais a Telegram, modelos clínicos ou dados de pacientes.

## Mudanças

- Leitos do Cockpit vêm de EnfermariaService, sem pacientes de demonstração ou leitura/gravação de cockpit_leitos no localStorage.
- Alteração de status usa o serviço do bot e exige a versão completa do leito. A execução compartilha a trava do worker clínico, recusando operação enquanto outro pedido está em processamento.
- Passagem SBAR usa os leitos reais e o gerador existente. Preceptor usa gerarCriticaSocraticaPreceptor com dados canônicos, exigindo a revisão do caso.
- SOAP exibe e copia integralmente a resposta gerada no chat. O formulário paralelo S/O/A/P foi substituído pela visualização integral, evitando reconstrução ou perda de pendências. Atualizações do conteúdo continuam pelo chat; Atualizar atendimento recarrega o painel.
- A cópia para visualização é persistida separadamente por revisão. Se o caso muda, o resultado anterior deixa de ser exibido. Falha em preservar essa cópia não impede a entrega do SOAP no Telegram.
- Acesso exige initData assinado pelo Telegram, usuário autorizado correspondente ao chat privado configurado e auth_date de até uma hora (tolerância de 30 s para relógio futuro). Sem sessão válida, a página não consulta dados clínicos. Quando o botão de teclado não fornecer initData, a orientação é abrir o botão inline do /menu.
- Dados do servidor são renderizados por textContent, sem interpretação de HTML.

## Encapsulamento para publicação

O build agora também gera ultra_rotina_gas.js, com módulos internos encapsulados. Esse é o artefato de publicação: ultra_rotina_master.js continua servindo aos testes locais e NÃO deve ser publicado diretamente com o Cockpit autenticado.

Somente doGet/doPost, quatro endpoints autenticados do Cockpit, três acionadores com validação de triggerUid e quatro rotinas administrativas protegidas por WEBHOOK_SECRET ficam no nível global. Helpers internos não podem ser chamados diretamente por google.script.run. Rotinas administrativas globais agora exigem o segredo como argumento; acionadores manuais sem evento são recusados.

Os dois caminhos de deploy foram adaptados para o empacotamento. O bootstrap temporário do deploy verificado também fica encapsulado; a finalização usa o artefato protegido e copia os HTMLs atuais. Nenhum deles foi executado.

Referências de implementação:
- https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
- https://developers.google.com/apps-script/guides/html/communication#private_functions

## Validação

- Build dos 14 módulos, sintaxe dos dois artefatos e compilação Python das rotinas de build/deploy aprovados.
- `.venv/bin/python -m pytest tests -q --ignore=tests/test_central_hub.py`: 142 testes aprovados em 9,33 s. Inclui seis cenários novos de integração/autorização em Node por um wrapper pytest.
- Testes cobrem assinatura válida, adulteração, expiração, outro usuário, parâmetros duplicados, SOAP integral, revisão obsoleta, worker ocupado, status versionado, SBAR compartilhado e isolamento das funções no artefato GAS.
- Chromium em 390x844, com sessão e dados fictícios: telas SOAP/leitos inspecionadas, zero erros JavaScript, texto com marcação maliciosa exibido literalmente e nenhuma imagem injetada. Capturas cockpit_soap.png e cockpit_leitos.png nesta pasta (antes do ajuste cosmético do ícone de atualizar).
- Motores clínicos intactos: SHA256 de src/04_motores_ia.js = 361050b2c12838c3ac7b6e0549d96ee4bd0ddbdd9cc0faa10f0a583011013949.

## Limites

Não houve validação de RPC/acionadores no Apps Script publicado ou sessão real de Mini App. Esse teste integrado é necessário após publicação. Central Hub foi excluída pelos motivos das etapas anteriores.

A integração desta etapa cobre leitos, status, passagem, SOAP e preceptor. REMUME, calculadoras, rotina e composição corporal do Cockpit ainda possuem implementações locais e precisam de unificação futura. Não se afirma que todo o Cockpit está integrado.

A cópia SOAP continua sujeita ao limite de 25 KB por registro de PersistenciaBot; se indisponível, não há corte do conteúdo clínico enviado no chat. Resultados persistidos em soapview são substituídos pela geração seguinte e a revisão impede exibição em outro atendimento; não constituem histórico completo.

A renderização visual e os testes utilizaram simulações, não demonstram equivalência clínica nem latência de produção. Prompts, modelos e limites de raciocínio não foram modificados.
