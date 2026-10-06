# Método e limites da comparação

Foram congeladas duas versões locais: baseline reconstruída com os seis módulos anteriores e os demais módulos inalterados; candidata correspondente ao master testado. Os hashes por módulo estão no manifesto. Não é uma comparação com uma cópia recém-extraída da produção.

Oito casos inteiramente fictícios foram definidos antes das respostas, com referências primárias e critérios de aceitação. Duas rodadas por versão, com ordem alternada, totalizam 32 execuções planejadas. O avaliador é o próprio assistente; a revisão não é cega nem substitui revisão por médico. Dois ensaios por caso são insuficientes para demonstrar não inferioridade clínica ou significância estatística de latência.

As credenciais foram lidas do snapshot local apenas para autenticação. O padrão de provedor foi fixado em GEMINI nas duas versões, conforme default atual do código. O snapshot antigo indicava GROQ; não foi possível confirmar a configuração remota atual. Modelos, temperatura, tokens e raciocínio das versões congeladas foram preservados, incluindo sua cascata de fallback. Os modelos efetivamente reportados pelas respostas foram registrados a partir de P02 da primeira rodada; no primeiro par P01 há apenas o alias solicitado.

As chamadas a modelos são reais. Sheets, CacheService, PropertiesService e UUID são adaptados localmente. A REMUME é uma cópia fixa do CSV local; a pequena base de interações é uma fixture explícita, não uma cópia da planilha remota. Não há dados de pacientes, Telegram, Notion, Calendar, geração real de PDF ou deploy.

Cada execução começa com cache isolado e frio, e o cache é preservado entre geração e auditoria dentro da mesma execução. Isso permite isolamento, mas não reproduz o cache compartilhado entre atendimentos no Apps Script. Em produção, o bloqueio de modelos com 404 pode ser reutilizado por uma hora. Portanto, os totais de erros e a latência observada não podem ser extrapolados para o regime de cache aquecido.

O cronômetro envolve a função clínica inteira, incluindo auditoria quando aplicável. Também são registrados tempos HTTP e overhead da ponte local. O tempo do Telegram, fila e serviços reais do Apps Script não foi medido. Há limite experimental de 45 segundos por chamada HTTP, 180 segundos por processo e 12 chamadas HTTP por execução. Execuções cortadas pelo limite são censuradas; não provam que a produção falharia. Não houve retentativa seletiva para substituir resultados desfavoráveis.

Erros de disponibilidade, quota, alias e fallback contaminam a comparação de tempos. O resumo é descritivo e separa perfis reportados pelas chamadas bem-sucedidas. Mesmo com o mesmo perfil, tamanho da resposta, tokens de raciocínio, retries e carga do provedor variam. Uma mediana menor não demonstra ganho causado pela otimização.

Após as chamadas reais, respostas foram reapresentadas offline ao código do bot para conferir a disponibilidade do botão PDF. Falhas da auditoria também foram injetadas offline usando um dos rascunhos reais. Esses ensaios adicionais são testes de software, não novas avaliações clínicas por modelos.

A liberação exige ausência de falha clínica relevante nos casos, fontes funcionais e avaliação de latência confiável. Uma falha presente nas duas versões continua impedindo liberação; similaridade com o comportamento antigo não torna o resultado aceitável.
