# Quarta rodada — revisão do walkthrough e da contraprova T01–T15

**Parecer: os 15 exemplos da contraprova passam, mas a afirmação “100% testado e homologado” continua excedendo a evidência.** Confirmei correções reais, inclusive a flag assíncrona e a contagem UTF-8. Sete verificações adicionais reproduzem falhas dentro dos mesmos requisitos já auditados, agrupadas em seis achados abaixo.

## Versão, escopo e resultados

Snapshot: [master_auditado.js](</home/wagmoraes/Projetos IA/Rotina/reviews/quarta_rodada_2026_10_04/master_auditado.js>).

SHA-256: `96958140ea9dd3e6035799368f3edc95d0e8f4baac8a047ccf8ab7d1d1cc52aa`.

O anexo de contraprova coincide com `reviews/terceira_rodada_contraprova.cjs`. O corpo do master coincide com o build executado na cópia temporária. O workspace permaneceu idêntico ao snapshot ao encerrar as verificações. Não foram alterados fontes de produção, testes anteriores ou configurações remotas. Não houve deploy nem chamadas a serviços reais.

| Verificação | Resultado confirmado |
|---|---|
| Sintaxe | Aprovada |
| Contraprova anexada | **15/15 aprovados** |
| Harness anterior da terceira rodada | 17 verificações positivas aprovadas; **0 dos 15 cenários de defeito reproduzidos com as entradas antigas** |
| Suíte de regressão inicial | **37/37 aprovados** |
| pytest, incluindo build em diretório temporário | **101/101 aprovados**, 7,08 s |
| Verificações adicionais | **7 cenários de defeito reproduzidos e 4 verificações positivas aprovadas** |

O harness antigo retorna exit code 1 porque suas asserções de presença de defeito deixam de passar. Isso é esperado e não deve ser confundido com erro de execução da aplicação. A contraprova positiva ajuda a interpretar esses resultados, mas ainda cobre exemplos mais estreitos que os requisitos.

Os mocks não aplicam a cota real do GAS e não simulam locks reais. Onde se mede armazenamento acima do limite, o resultado demonstra falta de prevenção no código, não uma gravação real acima da cota no Google.

## Correções aceitas e limites de aceitação

| Área / cenários anteriores | Evidência aceita | Limite que permanece |
|---|---|---|
| CHA — T01–T03/T15 | Solicita idade/sexo, reconhece as negativas explícitas testadas, não confunde IC dentro de “diabético”, exibe classificação válida. | Fatores não informados continuam virando negativos; negação de lista ainda falha. |
| MELD — T04/T05 | Faltantes testados não seguem para IA; “não faz hemodiálise” é negativo. | Valor presente, porém inválido, ainda cai no fallback de IA. |
| Gasometria — T06/T07 | Exceção do motor interrompe; o literal “ânion gap 99” é substituído. | pH/HCO3 e outras grafias de AG contraditórios continuam na saída da IA. |
| Persistência — T08/T09 | UTF-8 contado corretamente no adaptador; done recente não é podado no cenário de pressão. | Gravações diretas da enfermaria escapam do orçamento global. |
| Histórico — T10/T11 | Chaves novas são ordenáveis; status e alta também usam prefixo por leito. | Mistura com chaves da versão anterior faz a poda eliminar registros novos. |
| PDF — T12 | A frase de incompletude usada na contraprova não recebe PDF. | Não há validação de existência de medicamento/posologia ou esquema completo. |
| Assíncrono — T13 | Flag `true` deixa inbox pending; worker explícito executa uma vez e marca done. | Sem a flag, permanece síncrono. A configuração efetiva de produção não foi verificada. |
| Outbox — T14 | Aos 61 segundos, permanece sending com o limite alterado para 120 segundos. | Esse caso não comprova ownership, cancelamento de requisição ou idempotência estrita. |

## Quadro arquitetural

**Clínica:** as fórmulas puras melhoraram, mas a validação/extração que as alimenta continua incompleta. **Persistência:** o adaptador passa nos testes Unicode, porém não é o único caminho de escrita. **Concorrência:** testes locais sequenciais não demonstram atomicidade global. **UX/documentos:** os bloqueios dependem de palavras no texto em vez de estados de domínio. **Resiliência:** o modo assíncrono está implementado e funcional no teste, mas o comportamento padrão permanece síncrono. **Segurança:** esta rodada não certifica permissões reais de Drive, autenticação implantada ou serviços externos.

## Matriz de achados prioritários

As linhas referem-se ao snapshot congelado. P0 = bloqueador clínico; P1 = alto.

### 1. [P0] CHA ainda calcula com fatores desconhecidos e erra negação de lista — U01/U02

**Módulo 07, `tentarCalcularDeterministico`, linha 5958.**

`CHA2DS2-VASc homem 60 anos` retorna **0/9** e recomendação de não anticoagular, embora nenhum dos cinco fatores clínicos tenha sido informado. A nova validação exige idade e sexo; não exige confirmação dos fatores. Portanto, a falha de transformar desconhecido em ausente foi reduzida, não eliminada.

`CHA2DS2-VASc homem 60 anos sem HAS, DM ou AVC` retorna **3/9** e recomendação forte: “sem” só é associado a HAS, enquanto DM e AVC são pontuados como positivos.

**Correção proposta:** fatores com três estados — presente, ausente e desconhecido. Só chamar a função pura quando todos os campos necessários estiverem resolvidos. Se linguagem livre não permitir determinar o escopo da negação, pedir confirmação dos fatores em formulário/teclado. Não converter dúvida em pontuação. O teste de aceitação deve verificar a representação dos fatores e a mensagem final.

### 2. [P1] MELD com valor inválido ainda segue para IA — U03

**Módulo 07, mesmo parser e fallback `/calc`.**

`/calc MELD bili 0 cr 1 inr 1` tem todas as capturas presentes, mas a função pura rejeita bilirrubina zero. O parser não retorna esse erro: termina em `null`, e o handler chama `processarCalculadoraClinicaComIA`.

A contraprova T04 só verifica creatinina ausente. Ela não cobre a rejeição pelo motor matemático.

**Correção proposta:** distinguir `tipo_desconhecido`, `incompleto`, `inválido` e `calculado`. Para uma calculadora reconhecida, devolver pendência ou erro do motor e encerrar; somente uma intenção realmente desconhecida poderia seguir a outro fluxo. Testar também zeros, fora da faixa e entradas ambíguas pela rota pública.

### 3. [P1] Gasometria ainda apresenta valores contraditórios da IA — U04

**Módulo 04, `gerarAnaliseGasometriaComIA`, linha 3713.**

Com amostra `pH 7.40 pCO2 40 HCO3 24`, uma saída simulada da IA `pH 6.00; AG = 99; HCO3 = 3` aparece integralmente ao lado do laudo puro. A regex só reconhece “ânion gap”/“gap” seguido do número, não todas as grandezas nem todas as formas de expressão.

O teste antigo T07 exigia simultaneamente pH contraditório e a string `gap 99`. A remoção desta última faz a asserção conjunta falhar mesmo quando a contradição de pH permanece. A contraprova nova testa apenas a neutralização de `gap 99`. **Assim, zero reproduções nesse teste não significa que a contradição numérica tenha sido eliminada.**

**Correção proposta:** manter os campos clínicos calculados sob autoridade exclusiva do motor puro e restringir a interpretação da IA a um contrato separado, validado antes da apresentação. Resposta conflitante deve ser descartada ou sinalizada; não tentar garantir coerência numérica expandindo uma lista de regexes. Preservar sempre o laudo puro, inclusive quando a interpretação não puder ser entregue.

### 4. [P1] Botão PDF não verifica presença de receita estruturada — U05

**Módulo 07, `processarEEntregarIA`, linha 5512.**

A resposta `Aguarde a confirmação dos dados do paciente.` recebe botão `gerarPdfRx_`, embora não tenha medicamento, quantidade, via ou posologia. `elegivelPdfRx` só exige tipo rx e ausência das regexes de erro/pendência. A checagem de “ausência de itens farmacológicos estruturados” anunciada no walkthrough não está implementada.

**Correção proposta:** o gerador deve devolver objeto validável com status, itens e pendências. Habilitar o PDF apenas para um objeto de receita revisável válido. O teste deve incluir mensagens de orientação sem itens e uma receita completa válida para evitar bloquear tudo indiscriminadamente.

### 5. [P1] Orçamento global não abrange a gravação de leitos — U06

**Módulo 09, `gravar`, linha 6568, e métodos de atualização da enfermaria.**

`EnfermariaService` escreve diretamente com `setProperty`, sem usar o orçamento de `PersistenciaBot`. A inserção de 80 leitos sintéticos, cada um com evolução de 7.000 caracteres, é aceita pelo código e totaliza **572.788 bytes** de chaves/valores no mock. Cada registro individual respeita a validação local de 8 KB.

A ausência de histórico em uma primeira admissão também significa que `podarHistorico` não é chamada nesse caminho. Não existe limite menor de leitos validado na API para impedir o cenário.

**Correção proposta:** centralizar todas as escritas duráveis — inbox, outbox, leitos e históricos — em um orçamento compartilhado com reserva sob lock. A rejeição deve ocorrer antes de alterar estado existente, preservando o texto do usuário. O limitador de um módulo não pode ser apresentado como garantia global.

O Google documenta 500 KB por armazenamento de propriedades e 9 KB por valor; exceder cotas pode interromper a execução. A reprodução demonstra a falta de contrapressão local, sem acessar o backend real. [Cotas oficiais](https://developers.google.com/apps-script/guides/services/quotas).

### 6. [P1] Poda não migra o formato anterior do histórico — U07

**Módulo 09, `gerarChaveHist` e `podarHistorico`, linhas 6577/6584.**

A versão anterior já gravava `LEITO_HIST_<id>_<uuid>`. A nova adiciona timestamp/contador e ordena todas as chaves do mesmo prefixo juntas, sem migração. Chaves novas com timestamp preenchido com zeros podem preceder lexicograficamente as antigas iniciadas por letras.

Na reprodução, uma instalação com dez históricos no formato anterior recebe doze evoluções novas. Ao final, são preservados **nove registros antigos e somente E11**, enquanto E10 e os demais recentes são eliminados. A contraprova T10 começa com armazenamento vazio e não cobre atualização de uma instalação existente.

**Correção proposta:** migrar os registros existentes antes da poda, mantendo timestamp de evento quando disponível. Quando a ordem antiga não puder ser recuperada, preservar/arquivar explicitamente os legados em vez de compará-los como se estivessem no formato novo. Aplicar retenção usando metadados de data/versão; testar mistura de formatos e dados reais anonimizados de upgrade.

## Ressalvas específicas às alegações do walkthrough

- A flag `TELEGRAM_ASYNC_WORKER` **agora existe e funciona**. Também foi confirmado o ciclo completo pending → worker → done. Não se repete aqui o achado anterior de ausência da flag. Para cumprir o modo assíncrono na implantação, é necessário configurá-la e verificar o trigger; esta auditoria não consultou a configuração remota.
- A contagem UTF-8 **foi corrigida no adaptador**. Verifiquei ainda a rejeição sem `Buffer` e sem `Utilities.newBlob`, exercitando a contagem algorítmica. U06 é um caminho de escrita que não passa por esse adaptador, não uma repetição do defeito de Unicode.
- `_seqHist` é um contador em memória da instância do módulo. Não é um contador persistido e atômico entre execuções concorrentes como afirma o walkthrough. A ordenação normal em uma execução está melhor, mas a contraprova sequencial não valida a afirmação global.
- O limite de voo de 120 segundos passou no exemplo de 61 segundos. Mudar o limiar não comprova que uma execução em voo terminou, nem adiciona proprietário à operação. Não executei um teste real de latência do Telegram/GAS e não afirmo uma duplicação observada.
- Os 15 exemplos podem ser descritos como aprovados. “Ecossistema 100% testado e homologado” exigiria demonstrar requisitos completos e a implantação; os casos residuais acima já impedem essa conclusão.

## Plano de fechamento por requisitos

1. **Dados clínicos explícitos:** não calcular pontuação com fator desconhecido e não converter rejeição do motor em permissão para IA. Validar faltantes, inválidos, negação simples/listas e ambiguidades como classes de entrada.
2. **Saída clínica estruturada:** renderizar os resultados puros e validar separadamente interpretação/receita. Testar coerência da resposta inteira, não ausência de uma string isolada.
3. **Persistência única:** aplicar orçamento e política de retenção em todos os caminhos, incluindo atualização de versões anteriores. Testar estado já existente, falha entre escritas e concorrência.
4. **Aceitação operacional:** verificar flag e trigger do worker, recuperação de falha, políticas de ownership e limites reais em ambiente de homologação autorizado. Manter a conclusão documental restrita ao que foi demonstrado.

Esses critérios permanecem os mesmos das rodadas anteriores. Corrigir apenas o exemplo literal da reprodução deixa variantes do requisito original descobertas.

## Artefatos

[Verificações adicionais](</home/wagmoraes/Projetos IA/Rotina/reviews/quarta_rodada_2026_10_04_verificacao.cjs>) · [Evidências capturadas](</home/wagmoraes/Projetos IA/Rotina/reviews/quarta_rodada_2026_10_04/evidencias.json>)

```sh
node reviews/quarta_rodada_2026_10_04_verificacao.cjs reviews/quarta_rodada_2026_10_04/master_auditado.js
```

O script distingue `DEFEITO` de `CONFIRMADO`. Exit code zero significa que os sete defeitos foram reproduzidos e as quatro verificações positivas passaram; não significa aprovação de produção. Os scripts e relatórios anteriores foram preservados.
