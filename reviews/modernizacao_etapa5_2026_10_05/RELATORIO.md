# Modernização — calculadoras e REMUME compartilhadas

Implementação local em 05/10/2026. Sem deploy ou chamadas reais a modelos, Telegram ou planilhas.

## Mudanças

- DVA, SRI, Cockcroft-Gault e gasometria do Cockpit usam diretamente CalculadorasClinicas por endpoint autenticado. Não há mais fórmulas ou interpretações paralelas dessas quatro funções no HTML.
- Resultados completos, erros, pendências e avisos vêm do módulo existente. A renderização transforma apenas o HTML de formatação em texto; não resume o conteúdo.
- Campos numéricos iniciam vazios; sexo não vem selecionado. Ausência de peso, creatinina ou gasometria não é substituída por dados de exemplo. Unidades estão indicadas nos campos.
- Cálculo ocorre após 350 ms sem nova edição. Respostas anteriores são descartadas quando os parâmetros mudam. Não são disparadas quatro consultas ao abrir o painel.
- REMUME usa obterPlanilha com a mesma chave remume e o mesmo SPREADSHEET_ID_REMUME do bot. A base integral é carregada ao abrir a aba e a busca acontece em memória, sem requisição por tecla.
- Catálogo estático com sete medicamentos e posologias foi removido. O painel passa a mostrar as apresentações efetivamente cadastradas. Filtros por classes do catálogo antigo foram retirados porque a fonte compartilhada não fornece essa classificação; busca por nome/apresentação permanece. A interface aponta a prescrição para a função já existente no chat.
- Conteúdo da REMUME é inserido como texto, nunca HTML. Busca ignora acentos e maiúsculas. Há atualização explícita do catálogo.
- Endpoints novos estão incluídos na lista pública autenticada do artefato ultra_rotina_gas.js.

## Validação

Build e sintaxe dos 14 módulos e dois artefatos aprovados.

A execução ampla `.venv/bin/python -m pytest tests -q --ignore=tests/test_central_hub.py` passou 141 testes e apontou uma falha no teste novo: a fixture alterava a configuração após o carregamento do cache de configuração. Corrigida a fixture para invalidar esse cache após a alteração, o teste restante passou isoladamente. Assim, os 142 testes passaram nas execuções combinadas; não se afirma uma nova execução integral após o ajuste da fixture.

O agregador test_cockpit_integracao agora contém nove cenários Node. Os novos verificam igualdade exata dos objetos completos das calculadoras (incluindo avisos), entradas ausentes/fora do intervalo, autenticação e catálogo completo com 181 registros, fonte configurada e erro de leitura.

Chromium a 390x844, sessão/RPC fictícios: zero erros JavaScript; parâmetros inicialmente vazios; nenhuma chamada de cálculo inicial; resposta lenta para peso 60 não sobrescreve peso 80; campo apagado é enviado vazio; busca sem acentos; marcação HTML da base não é executada. Capturas calculadoras.png e remume.png nesta pasta. As telas foram inspecionadas visualmente.

Nenhuma mudança em src/02_calculadoras_puras.js, src/03_bases_locais.js ou src/04_motores_ia.js nesta etapa. SHA256:
- calculadoras: fc435457ddd792a9f5049193ec83b2b0474fa54ddafb74625bdff26d4958cb7f
- bases: ebfa844f5f19185e3b6458d6eb1abf526d181068d961e51c513574851f68418e
- motores/prompts: 361050b2c12838c3ac7b6e0549d96ee4bd0ddbdd9cc0faa10f0a583011013949

## Limites e continuidade

Os cálculos agora dependem da sessão autenticada e da comunicação com Apps Script; não há demonstração de ganho de velocidade em produção. O agrupamento de alterações reduz chamadas por digitação, sem reduzir qualidade clínica. A busca da REMUME é local após carregar a fonte e reutiliza o cache compartilhado do bot no servidor.

A gasometria do painel usa o motor determinístico existente. Esta etapa não acrescenta a geração de complemento por IA da função /gaso. Os testes de igualdade demonstram reutilização do motor, não validação clínica independente.

Rotina e composição corporal do Cockpit continuam pendentes de unificação. Publicação e teste integrado em sessão real do Telegram permanecem pendentes. A Central Hub não foi testada nesta rodada.
