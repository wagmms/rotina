# Correções implementadas — oitava rodada

As seis causas apontadas no parecer foram tratadas nos módulos-fonte e o master foi recompilado. Os oito exemplos anteriores não se reproduzem. A validação principal é a nova suíte afirmativa, que verifica os comportamentos esperados, e não apenas a falha das antigas asserções de defeito.

## Mudanças

- **SOAP:** retirados os sinais vitais fixos e a instrução de presumir normalidade. O complemento de IA agora usa JSON. Achados objetivos precisam ser frases completas presentes no relato, preservando negações; achados inventados são descartados. Respostas livres ou malformadas não são usadas como registro de fatos. Hipóteses e condutas aparecem identificadas como sugestões para revisão.
- **CHA₂DS₂-VASc:** a resolução de polaridade reconhece operadores afirmativos como `tem`, `apresenta`, `possui` e `com`, sem perder as negações compostas (`não tem`) ou listas coordenadas. A trava de fatores desconhecidos permanece.
- **Memória clínica:** comandos e botões de exame especial consultam o estado canônico do SOAP; abrir um guia preserva o caso. Retornar e acrescentar informações mantém o relato anterior. Expiração, `/novo` e `/cancelar` continuam encerrando o contexto.
- **Gasometria:** removida a substituição global de números em prosa. O motor puro emite as medições; o complemento estruturado possui metas separadas. Texto livre misturando medições e condutas é recusado. Há compatibilidade restrita para uma meta isolada, convertida para o mesmo formato de campos.
- **Receitas:** linhas de posologia compõem o respectivo item. Cada item exige identificação no catálogo local ou REMUME em cache, dose, via e frequência/instrução de uso condicional. Palavras genéricas ou nomes não identificados não liberam PDF. O serviço de PDF revalida também os callbacks antigos.
- **Cópia dos exames:** o botão copia apenas o bloco correspondente, excluindo o checklist. Modelos estáticos continuam identificados como referência, a confirmar antes do registro; guias dirigidos só incluem como achados frases verificadas no relato.

## Verificação

| Suíte | Resultado |
|---|---|
| Nova regressão funcional | 23/23 |
| SOAP e exames especiais | 5/5 |
| Contraprovas das rodadas 7, 6, 5, 4 e 3 | 6/6, 6/6, 5/5, 11/11 e 15/15 |
| Auditoria inicial Node | 37/37 |
| Pytest, incluindo a nova regressão funcional | 106 aprovados em 4,58 s |
| Build e sintaxe dos módulos/master | Aprovados |
| Reprodutor antigo Y01–Y08 | 0/8 defeitos reproduzidos |

O teste antigo de SOAP foi ajustado para verificar preservação de dados fornecidos e rejeição de sinais vitais inventados. O teste de falha de entrega do PDF passou a usar uma receita completa, para continuar exercitando a entrega após a nova validação. O harness Python de PDF carrega o validador real, suas bases locais e um cache simulado.

Os 23 testes novos também são executados por `pytest`, por meio de `tests/test_correcao_oitava_rodada.py`. Todos os serviços externos foram simulados; não houve deploy nem envio real de mensagens, documentos ou dados clínicos.

## Comportamentos conservadores

Medicamentos fora do catálogo local precisam constar na REMUME carregada para permitir PDF. Isso valida identificação e completude documental, não indicação, interações ou adequação clínica da dose. Respostas de IA fora do contrato estruturado deixam pendências visíveis em vez de produzir texto clínico presumido. A transcrição objetiva preserva a origem no relato; não certifica a veracidade do que foi informado.

Master final SHA-256: `7950f3519415ab18958af91296cd067941f31ed1ce881a24becbcd14b8c39c15`.

- [Master recompilado](</home/wagmoraes/Projetos IA/Rotina/ultra_rotina_master.js>)
- [Regressão funcional](</home/wagmoraes/Projetos IA/Rotina/tests/test_correcao_oitava_rodada.cjs>)
- [Logs e hashes](</home/wagmoraes/Projetos IA/Rotina/reviews/correcao_oitava_rodada_2026_10_04/evidencias.json>)
