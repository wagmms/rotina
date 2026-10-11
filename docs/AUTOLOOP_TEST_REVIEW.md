# Investigação de rigor e retrabalho nos testes — 11/10/2026

A hipótese do usuário é parcialmente confirmada. Há expectativas antigas e
problemas de infraestrutura, além de divergências que ainda precisam de análise.
Falha de teste não prova sozinha defeito do produto, nem autoriza mudar a expectativa.

## Correções demonstradas

| Teste | Evidência | Correção e cobertura preservada |
|---|---|---|
| `test_etapa2_performance_deterministico.cjs` | Exigia literalmente cache `v3.0`; `sw.js` declara `v3.1`. | Valida declaração de cache versionado sem prender a versão. Mantém precache, ícones, RPC e todas as asserções de cálculo. |
| `test_teclado_adaptativo.cjs` | Exigia SOAP/REMUME e ordem antigos; `src/01_utils.js:obterTecladoFixoPrincipal` oferece os quatro hubs atuais. | Atualiza rótulos e posição exatos dos quatro hubs. Mantém três linhas, teclado contextual, limpeza do caso e resposta. O wrapper Python continua executado. |

Essas duas correções aprovaram três suítes antes reprovadas, sem alterar produção:
191/228 para 194/228. Os relatórios `98bffcdf-1613-479e-ab94-6cd9fd3196e3`
(dois processos) e `f25fd00e-af86-4bb9-952b-826a480ef028` (quatro) têm os mesmos
vereditos. Dados ficam em `data/test_reports/`.

## Sete falhas por retirada intencional confirmada no histórico

Os wrappers abaixo chamavam CJS de mesmo nome já retirados de `tests/`:

- `test_analgesia_pca.py`
- `test_auditoria_kaizen_clinico.py`
- `test_auditoria_infusao_uti.py`
- `test_auditoria_y_site.py`
- `test_mecanica_pulmonar_sdra.py`
- `test_suporte_nutricional.py`
- `test_transfusao_sanguinea.py`

O histórico confirmou que `498b4a5e11c1b16f49cd8b7816ed47eb2d8ae3af`
removeu os módulos de produção e os sete CJS juntos, documentando a retirada
intencional e respostas RPC `{ sucesso: false, desativado: true }`. Os wrappers
Python permaneceram por engano. Restaurar esses módulos seria contrariar a decisão.

Os sete wrappers agora executam `test_modulos_desativados.cjs`, que verifica:

- os sete arquivos de produção continuam ausentes;
- cada rota rejeita acesso sem sessão;
- com sessão válida, informa desativação e não retorna resultados clínicos;
- o módulo pediátrico explicitamente preservado continua disponível.

A suíte CJS é executada uma vez na bateria, e os wrappers verificam seus resultados
sem disparar subprocessos idênticos novamente. Nenhum teste ativo de cálculo foi
removido. O inventário aumenta de 228 para 229 suítes. A validação direcionada
inicial passou 3/3 suítes em 1,62 s.

## Divergências que não devem ser relaxadas automaticamente

- `test_auditoria_pediatrica_extremos`, `test_auditoria_pediatrica_schwartz` e
  `test_posologia_deterministica`: valores farmacológicos divergentes. O relatório
  não determina qual lado está correto; requer Pro e fontes identificáveis.
- `test_cockpit_integracao`: exceção de segurança esperada não ocorreu. Investigar
  contrato e preparação antes de concluir que a asserção é excessiva.
- `test_rbac_perfis_clinicos`: sessão ausente/inválida; pode envolver preparação
  incompleta ou mudança de autenticação. Não remover exigência de sessão.
- `test_navegacao_rapida_metricas`: contagem de envios divergente. Pode representar
  duplicação real, e não apenas texto antigo.
- `test_otimizacao_io_e_thinking`: teste e implementação discordam sobre configuração
  de raciocínio. Não foi alterado; requer conferir contrato do provedor e preservar
  qualidade clínica. Comentário no código não é prova de comportamento da API.
- `test_didatica_seguranca_soap_ostensivo`: exige uma frase literal no prompt.
  É candidato a validação semântica do contrato, mas substituir a frase sem conferir
  conteúdo pedagógico e salvaguardas poderia enfraquecer a cobertura.

Não foram excluídos testes, ampliadas tolerâncias clínicas, reduzido raciocínio
ou modificadas doses para obter verde. As falhas clínicas e funcionais ainda não resolvidas seguem bloqueando
publicação; o relatório final identifica o total vigente. Agrupar wrappers ajuda o diagnóstico; não reduz o inventário testado.

## Efeito esperado na velocidade

- Quatro processos: 48,57 → 33,04 s (1,47×), medido no mesmo código.
- Reutilização de reprovação estável: evita uma nova bateria (~33 s no ensaio)
  quando código, ambiente e inventário permanecem idênticos; nunca aprova a falha.
- Fila justa, evidências persistidas e roteamento: benefício esperado na investigação,
  ainda sem multiplicador medido em tarefas reais.

A política de cada ciclo continua exigindo bateria completa para o estado final.
Tentativa pode terminar com pendências explícitas; isso não significa ciclo aprovado.


## Critério para um bloqueio e para um commit

Cada bloqueio deve identificar requisito ou decisão vigente, reprodução e impacto.
Uma preferência do agente não cria requisito. Expectativas históricas contraditas
por decisões documentadas devem ser atualizadas com evidência, mantendo verificação
do comportamento atual. Doses, unidades, contraindicações, autenticação e entrega
sem duplicação continuam exigindo prova de correção; não há liberação automática
por rotular uma falha como antiga ou preexistente.

Um commit local de progresso pode conter correção coerente e registrar pendências.
Ele não autoriza publicação. A publicação permanece condicionada à bateria completa
e à auditoria. Isso permite progresso incremental sem exigir que uma única tentativa
resolva simultaneamente todas as falhas históricas do projeto.
