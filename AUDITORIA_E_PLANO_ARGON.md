# AUDITORIA TÉCNICA, ARQUITETURA & PLANO MESTRE (GEMINI 4 ARGON)
**Projeto:** Bot de Rotina & Assistente Clínico Hospitalar  
**Motor de Auditoria:** `gemini-4-argon` (Google Cloud AI Platform / My Billing Account)  
**Papel:** Auditor Técnico Principal & Preceptor Chefe de Residência Médica  
**Modo:** READ-ONLY (Diagnóstico Estrutural & Plano de Execução Cirúrgico)  
**Data:** 15 de Outubro de 2026  

---

## 1. DIAGNÓSTICO EXECUTIVO & VISÃO GERAL

O ecossistema do bot médico apresenta alto valor clínico e riqueza de regras, porém sofre de **dois vícios arquiteturais críticos** originados da sua transição do modelo Google Apps Script (GAS) para Node.js/Fastify:
1. **Acoplamento Indevido de LLM em Runtime:** Operações que deveriam ser determinísticas e instantâneas (classificação de intenção, calculadoras clínicas, interpretação de gasometria com fórmulas clássicas de Winter/Copenhague, verificação de interações medicamentosas conhecidas) realizam chamadas externas de IA com timeouts de até 18 segundos, gerando lentidão inaceitável para uso beira-leito e desperdício de tokens.
2. **Resquícios de I/O Síncrono e Persistência Bloqueante:** A camada de persistência (`src/11_entrega_confiavel.js`) ainda simula o fatiamento de strings em blocos de 1.500 caracteres e locks síncronos de 30 segundos, enquanto consultas de receitas e medicamentos (`src/07c_telegram_consultas_e_ia.js`) gravam prematuramente em caches remotos gerando múltiplos round-trips de rede.
3. **Vulnerabilidades Clínicas em Calculadoras:** Foram descobertos bugs de execução (chamadas a funções inexistentes que geram `ReferenceError`), erros de prescrição pediátrica (como Ibuprofeno em gotas com dose dobrada devido à suposição errônea de concentração) e ausência de travas de teto para bloqueadores neuromusculares em obesos mórbidos.

Este documento estabelece o diagnóstico aprofundado nos 3 eixos fundamentais e o plano mestre fatiado em *Vertical Slices* atômicos prontos para execução TDD.

---

## 2. EIXO 1: VELOCIDADE EXTREMA & DESACOPLAMENTO DE IA

### 2.1. Tabela de Gargalos de Latência & Acoplamento de IA

| Arquivo / Função | Problema Atual | Solução Determinística | Ganho Estimado |
| :--- | :--- | :--- | :--- |
| **`src/04_motores_ia.js`**<br>`classificarIntencaoMensagem` (Linha 3185) | Chama `_iaExecutar` com LLM (Gemini/Groq) e timeout de até 18s se as regex preliminares falharem, apenas para decidir se o texto é clínica, agenda ou conversa. | **Motor Léxico-Estrutural Determinístico $O(1)/O(K)$:** Árvore de precedência por Hash Sets pré-compilados (`ROUTER_LEXICO`) no boot, com prioridade de segurança (emergência primeiro) e fallback direto em 0ms para `CONVERSA`. | **1.500ms – 18.000ms $\rightarrow$ < 0.5ms** (Redução de 50% no consumo de tokens de texto) |
| **`src/07a_telegram_router.js`**<br>`tratarComandoCalculadora_` (Linha 772)<br>`src/04_motores_ia.js` (Linha 2845) | `processarCalculadoraClinicaComIA` delega cálculos para LLM quando não encontra parser estrito. | **Despacho Direto para `CalculadorasClinicas`:** Interpretação paramétrica direta com validação de tipos em memória. Zero chamada a LLM para contas matemáticas. | **2.000ms – 6.000ms $\rightarrow$ < 5ms** |
| **`src/07a_telegram_router.js`**<br>`tratarComandoGasometria_` (Linhas 5101, 5856)<br>`src/04_motores_ia.js` (Linha 2872) | `gerarAnaliseGasometriaComIA` chama LLM para diagnosticar distúrbios ácido-base básicos. | **Motor Pelo Método Henderson-Hasselbalch / Winter / Boston:** O módulo `02_calculadoras_puras.js` já possui motor de gasometria puro; o roteador deve responder direto dele. | **3.000ms – 7.000ms $\rightarrow$ < 2ms** |
| **`src/04_motores_ia.js`**<br>`verificarInteracaoComIA` (Linha 2855) | Monta prompt de LLM para verificar pares conhecidos de fármacos. | **Matriz Estática de Interações Graves:** Tabela Hash local com pares proibidos (ex: Amiodarona + Claritromicina = QT longo; Sildenafil + Nitrato = Choque; IECA + BRA = Hipercalemia/IRA). | **2.500ms – 5.000ms $\rightarrow$ < 1ms** |
| **`src/04_motores_ia.js`**<br>`gerarGuiaExameFisicoEspecial` (Linha 847) | Aciona `executarRaciocinioClinico` via LLM quando `contexto.length >= 15`. | **Injeção de Template Estático Estruturado:** Retornar imediatamente o modelo normal padronizado + checklist de manobras especiais sem LLM. | **1.800ms – 4.500ms $\rightarrow$ < 1ms** |
| **`src/07c_telegram_consultas_e_ia.js`**<br>`nomesFarmacosParaValidacao` (Linhas 10–32) | Varre planilhas, arrays e regex concatenadas a cada validação de receita (`analisarItensReceita`). | **Set Hash Pré-Aquecido em RAM:** `nomesFarmacosSet.has(termo)` em $O(1)$ carregado no bootstrap do Fastify. | **40ms – 150ms $\rightarrow$ < 0.1ms** |
| **`src/07c_telegram_consultas_e_ia.js`**<br>`montarRascunhoRxESoapAmbulatorial` (Linhas 266–278) | Emite preventivamente duas gravações de rede em cache remoto (`ckRx`, `ckSoap`) para cada `/dose`. | **Geração Lazy Sob Demanda:** Os botões inline passam a transportar o ID compacto ou chave do fármaco; o texto/PDF é montado apenas no clique. | **60ms – 200ms $\rightarrow$ 0ms no `/dose`** |
| **`src/11_entrega_confiavel.js`**<br>`PersistenciaBot` / `LockService` (Linhas 5–164) | Chunks de 1.500 caracteres, loops de cálculo de bytes UTF-8 char-a-char e `waitLock(30000)`. | **Migração para SQLite WAL (`PRAGMA synchronous = NORMAL`):** Fila de mensageria nativa com transações ACID em memória/mmap sem contenção. | **250ms – 800ms $\rightarrow$ < 0.5ms** |
| **`src/07c_telegram_consultas_e_ia.js`**<br>`executarFastAckTelegram_` (Linha 554) | Faz POST HTTP síncrono para o Telegram ("⚡ Analisando...") antes de processar. | **Webhook Direct Response:** Devolver o JSON de resposta diretamente no payload HTTP do webhook (`Content-Type: application/json`). | **150ms – 400ms economizados** (1 RTT a menos) |

### 2.2. Arquitetura de Resposta Sub-50ms no Telegram

```
[ Telegram Webhook POST ]
            │
            ▼
┌─────────────────────────────────────────┐
│ 1. Deduplicação em Memória (LRU Set)    │ ────> Já visto? Retorna HTTP 200 em 0.1ms
└─────────────────────────────────────────┘
            │ Não visto
            ▼
┌─────────────────────────────────────────┐
│ 2. Router Léxico O(1)/O(K) Sem IA       │
│    - Regex compiladas & Sets Hash       │ ────> Comando /calc, /dose, /gaso, /guia?
└─────────────────────────────────────────┘
            │
      ┌─────┴────────────────────────┐
      │ (Determinístico Puro)        │ (Exige LLM: Conversa Aberta)
      ▼                              ▼
┌─────────────────────────┐    ┌───────────────────────────────────┐
│ Resolução Direta em RAM │    │ 1. HTTP Fast-Ack (< 5ms)          │
│ (Calculadoras, Posologias│    │ 2. Queue assíncrona Worker        │
│  e Protocolos Locais)   │    │ 3. Gemini 4 Argon via HTTP        │
└─────────────────────────┘    │    Agent Keep-Alive               │
      │                        │ 4. editMessageText In-Place       │
      ▼                        └───────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Resposta no Corpo do Webhook (< 20ms)   │
│ { "method": "sendMessage", ... }        │
└─────────────────────────────────────────┘
```

---

## 3. EIXO 2: CONFIABILIDADE E RIGOR DE CONTEÚDO MÉDICO

### 3.1. Achados de Auditoria em `src/02_calculadoras_puras.js`

#### A. Falhas de Engenharia de Software (Bugs em Tempo de Execução)
1. **`ReferenceError: entradaInvalida is not defined` (Linhas 975, 1170, 1179):**  
   Na função `posologiaPediatrica`, o código invoca `entradaInvalida(ID, NOME, ctx)`, mas a função declarada no escopo do módulo chama-se `falhaCtx(id, nome, ctx)` (linha 161). Qualquer parâmetro inválido em dose pediátrica dispara exceção não tratada e cai no `catch` genérico, retornando código opaco `E_POSOLOGIA_PEDIATRICA_ENTRADAINVALIDAISNOTDE` em vez de orientar o médico sobre o dado faltante.
2. **Assinatura Incorreta de `bool()` em `cha2ds2vasc` (Linha 400) e `meld` (Linha 919):**  
   A função `bool(ctx, v, nome)` aceita apenas 3 argumentos (não aceita opções). Ao passar `{ opcional: true }` como 4º parâmetro para campos como `scFeminino` ou `dialiseRecente`, valores nulos são empurrados para `ctx.faltas`, abortando cálculos válidos.
3. **Avaliação Silenciosa de `null` em Comparações JavaScript (Linhas 1255, 1301, 1326):**  
   Em fármacos pediátricos de dose por faixa etária (ex.: Nitazoxanida, Loratadina, Dexclorfeniramina), quando o usuário informa apenas peso e deixa a idade nula, expressões como `var menor4N = idade < 4;` avaliam como `true` (`Number(null) === 0`), classificando adolescentes de 45 kg como lactentes menores de 4 anos.

#### B. Inconsistências Clínicas Face aos Consensos Médicos
1. **Dose Pediátrica de Ibuprofeno 50 mg/mL (Linha 1039):**  
   * **Erro Crítico:** O código assume `2.5 mg/gota` (20 gotas/mL), prescrevendo **4 gotas/kg/dose (20 mg/kg)**.
   * **Consenso Brasileiro (SBP / Bula Oficial Alivium):** A suspensão em gotas de Ibuprofeno 50 mg/mL é viscosa e padronizada em **10 gotas/mL (1 gota = 5 mg)**. A dose correta de 10 mg/kg/dose é de **2 gotas/kg** (ou **1 gota/kg** na apresentação de 100 mg/mL). A fórmula atual prescreve **o dobro da dose recomendada**, com risco agudo de gastrite e nefrotoxicidade.
2. **Teto Prematuro de Amoxicilina e Clavulanato em Dose Dobrada (Linhas 988, 1001):**  
   * O código trava `doseMaximaAdultoMgDia: 1500`. No tratamento de Otite Média Aguda (OMA) e PAC com suspeita de pneumococo resistente (90 mg/kg/dia), essa trava corta a dose aos **16,7 kg**. Uma criança de 25 kg recebe subdose ineficaz de 60 mg/kg/dia. O teto para dose dobrada é de **3.000 mg/dia** (SBP/CDC).
3. **Falta de Teto Hard-Coded na Sequência Rápida de Intubação para Obesos (Linha 889):**  
   * O texto menciona teto de 200 mg para Succinilcolina, porém a função `calcDose` executa `d = farmaco.dose * peso` sem aplicar `Math.min()`. Para um paciente de 160 kg, o sistema orienta aspirar **240 mg (24 mL)** de Succinilcolina e **192 mg** de Rocurônio, doses perigosas que prolongam desnecessariamente o bloqueio neuromuscular.
4. **Fórmula de Parkland Desatualizada em Relação ao ATLS 10ª Edição (Linha 792):**  
   * O código calcula fixo `4 mL * peso * %SCQ`. Desde a 10ª Edição do ATLS e diretrizes da American Burn Association (ABA), a reposição para queimaduras térmicas em adultos foi reduzida para **2 mL/kg/%SCQ** (e **3 mL/kg/%SCQ** em pediatria), restringindo **4 mL/kg/%SCQ** exclusivamente para queimaduras elétricas de alta voltagem, a fim de evitar sobrecarga hídrica e síndrome compartimental abdominal.

---

### 3.2. Padrão "Zero Runtime Hallucination": Schema Determinístico

Para assegurar que nenhum valor clínico seja inventado ou alucinado em tempo de execução, todas as respostas de conduta, dosagem e escores devem originar-se de estruturas estáticas tipadas e validadas:

```typescript
/**
 * Schema Canônico de Blindagem Clínica (ZRH - Zero Runtime Hallucination)
 * Toda saída deve respeitar este envelope rígido.
 */
export interface PrescricaoSeguraZRH {
  readonly farmacoId: string;
  readonly principioAtivo: string;
  readonly indicacaoClinica: string;
  readonly apresentacaoPadrao: string;
  readonly formaFarmaceutica: 'comprimido' | 'gotas' | 'suspensao' | 'ampola_ev' | 'ampola_im';
  
  // Parâmetros Fisiológicos Auditados
  readonly pesoMinimoKg?: number;
  readonly pesoMaximoKg?: number;
  readonly idadeMinimaMeses?: number;
  
  // Regras de Dose e Diluição
  readonly dosePorKg?: number;
  readonly unidadeDose: 'mg/kg/dia' | 'mg/kg/dose' | 'mcg/kg/min' | 'dose_fixa';
  readonly doseMaximaPorTomada: number;
  readonly doseMaximaDiaria: number;
  readonly intervaloHoras: 6 | 8 | 12 | 24;
  
  // Diluição e Acesso EV (se aplicável)
  readonly diluente?: 'SF0.9%' | 'SG5%' | 'Puro';
  readonly volumeDiluenteMl?: number;
  readonly tempoInfusaoMin?: number;
  readonly acessoPermitido: 'PERIFERICO' | 'CENTRAL_EXCLUSIVO';
  
  // Alertas e Bloqueios Mandatórios
  readonly contraindicacoesAbsolutas: readonly string[];
  readonly ajusteRenalObrigatorio: boolean;
  readonly diretrizReferencia: string; // Ex: "PNSO / SBP 2024 / AHA 2025"
}
```

---

## 4. EIXO 3: ROADMAP FUNCIONAL & EXPANSÃO DE SERVIÇOS

Com base na estrutura desacoplada em `src/07d_telegram_callbacks.js` e `src/12_experiencia_bot.js`, propõe-se um catálogo cirúrgico de **4 novas funcionalidades determinísticas de alto impacto**, projetadas para operação em 2 toques e com separação estrita entre Domínio Puro e Apresentação.

### 4.1. Catálogo de Novas Funções

#### 1. Guia Rápido de Diluição & Compatibilidade em Y Beira-Leito (2 Toques)
* **Objetivo:** Fornecer preparo exato de drogas críticas na Sala Vermelha e UTI sem cálculo mental.
* **Toque 1:** `[💉 Diluição Rápida]` no Hub da Sala Vermelha (`ux:dil:menu`).
* **Toque 2:** Seleção da droga (`[Amiodarona Ataque]`, `[Fenitoína 20mg/kg]`, `[Sulfato Mg Pré-Eclâmpsia]`, `[Nitroprussiato]`).
* **Entrega:** Diluente correto (ex: Amiodarona apenas em SG 5%, Fenitoína apenas em SF 0,9%), concentração final, tempo mínimo de infusão, via de acesso e alerta de incompatibilidade em Y.

#### 2. Pacotes de Prescrição Rápida por Síndrome (APS e Pronto Atendimento em 2 Toques)
* **Objetivo:** Agilizar o atendimento ambulatorial e de pronto-socorro com kits completos prontos para cópia no Prontuário Eletrônico (PEP).
* **Toque 1:** `[📦 Kits Síndromes]` no Hub Ambulatorial (`ux:kit:menu`).
* **Toque 2:** Seleção do quadro clínico (`[Cólica Nefrética]`, `[Amigdalite Bacteriana]`, `[Crise de Asma Leve/Moderada]`, `[Dengue com Alarme - Grupo C]`, `[Gastroenterite com Desidratação]`).
* **Entrega:** Prescrição medicamentosa canônica da REMUME com posologia completa, orientações de estilo de vida obrigatórias, sinais de alarme para retorno e texto formatado pronto para cópia.

#### 3. Checklists Clínicos Rápidos com Estado Bitmask Stateless (2 Toques)
* **Objetivo:** Prevenir omissões críticas em momentos de alta carga cognitiva.
* **Toque 1:** `[✅ Checklists]` na Enfermaria ou Sala Vermelha (`ux:chk:open:adm`).
* **Toque 2:** Alternância de checagens em tempo real sem persistência em banco (`ux:chk:tog:adm:255:128`).
* **Tipos de Checklist:**
  - *Admissão em Enfermaria:* FAST-HUG SB (Feeding, Analgesia, Sedation, Thromboembolism, Head of bed, Ulcer, Glucose, Spontaneous breathing, Bowel).
  - *Passagem de Plantão SBAR:* Situação, Breve histórico, Avaliação atual, Recomendações/Pendências.
  - *Checklist de Alta Segura:* Reconciliação medicamentosa, agendamento de retorno, receitas dispensadas e sinais de alerta entregues por escrito.

#### 4. Otimizador de Timeline com Time-Blocking Dinâmico (2 Toques)
* **Objetivo:** Recalcular os blocos do dia do médico residente (MedQuest, Flashcards, Treino, Descanso) quando o plantão atrasa ou a energia cai.
* **Toque 1:** `[⚡ Recalcular Dia]` na Central de Rotina (`ux:tb:menu`).
* **Toque 2:** Seleção do contexto do momento (`[🏥 Pós-Plantão (Recuperação + 20 cards)]`, `[⏱️ Atraso 2h (Compactar)]`, `[🔥 Foco Total (MedQuest Profundo)]`).
* **Entrega:** Cronograma recalculado do minuto atual até as 22:30, redistribuindo prioridades com base no tempo disponível.

---

### 4.2. Matriz de Separação: Domínio Puro vs. Apresentação

| Funcionalidade | Módulo de Domínio Puro (`src/domain/`) | Camada de Apresentação (`src/12_experiencia_bot.js`) | Padrão Callback (`callback_data`) | Bytes (Orçamento $\le 64$) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Diluição & Via Y** | `DiluicaoInjetaveisDomain.consultarFarmaco(id, pesoKg)` | `enviarTelaDiluicaoFarmaco(chat, id, peso, msgId)` | `ux:dil:f:<id>:<peso>` | 18 – 22 bytes |
| **2. Kits por Síndrome** | `PacotesSindromicosDomain.gerarKit(id, dados)` | `enviarTelaKitSindromico(chat, id, msgId)` | `ux:kit:s:<id>` | 12 – 16 bytes |
| **3. Checklists Bitmask** | `ChecklistClinicoDomain.avaliar(tipo, mascaraBit)` | `enviarTelaChecklist(chat, tipo, mask, msgId)` | `ux:chk:tog:<tipo>:<mask\>:<bit>` | 20 – 24 bytes |
| **4. Time-Blocking** | `TimeBlockingOptimizerDomain.otimizar(minutoAgora, perfil)` | `enviarTelaTimeBlocking(chat, perfil, msgId)` | `ux:tb:run:<perfil>` | 18 – 22 bytes |

---

## 5. PLANO MESTRE DE EXECUÇÃO FATIADO (VERTICAL SLICES TDD)

O plano está estruturado em **Vertical Slices atômicos**, com critérios de aceite verificáveis e especificação cirúrgica em 3 partes, prontos para execução em turnos únicos independentes.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FASE 1: BLINDAGEM CLÍNICA & CORREÇÃO DE BUGS CRÍTICOS (Fast-Fail)        │
│ [Slice 1.1: Correção de Bugs de Execução e Assinatura em Calculadoras]   │
│ [Slice 1.2: Correção Posológica do Ibuprofeno e Tetos de SRI/Amoxicilina]│
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FASE 2: DESACOPLAMENTO DE IA & LATÊNCIA SUB-50MS                         │
│ [Slice 2.1: Router Léxico-Estrutural Determinístico O(1)]                │
│ [Slice 2.2: Desacoplamento de Gasometria, Calculadoras e Interações]     │
│ [Slice 2.3: Otimização de I/O em Consultas de Fármacos e Receitas]       │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FASE 3: EXPANSÃO FUNCIONAL DETERMINÍSTICA BEIRA-LEITO                    │
│ [Slice 3.1: Módulo Puro de Diluições Críticas & Incompatibilidade em Y]  │
│ [Slice 3.2: Kits de Prescrição Sindrômica na APS & Pronto Atendimento]   │
│ [Slice 3.3: Checklists Clínicos com Estado Bitmask Stateless]            │
│ [Slice 3.4: Otimizador de Timeline de Rotina com Time-Blocking Dinâmico] │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### FASE 1: Blindagem Clínica & Correção de Bugs Críticos

#### Vertical Slice 1.1: Correção dos Erros de Execução em `CalculadorasClinicas`
- **Arquivo/Módulo Alvo:** `src/02_calculadoras_puras.js`
- **Função/Componente/Seletor:** Funções `posologiaPediatrica` (linhas 975, 1170, 1179), `cha2ds2vasc` (linha 400), `meld` (linha 919) e comparadores de idade nula (linhas 1255, 1301, 1326).
- **Comportamento Esperado / Critério de Aceite:**
  1. Substituir chamadas inválidas `entradaInvalida` por `falhaCtx`, garantindo que parâmetros pediátricos inválidos retornem mensagem clara de correção.
  2. Ajustar `bool(ctx, v, nome, opt)` para suportar campos opcionais sem abortar cálculos de CHA2DS2-VASc e MELD.
  3. Proteger avaliações numéricas de idade para que `idade === null` não seja interpretado como zero anos.
  4. Suíte direcionada `tests/test_calculadoras_puras_audit.cjs` passando com 100% de sucesso.

#### Vertical Slice 1.2: Correção de Fórmulas e Tetos de Segurança Toxicológica
- **Arquivo/Módulo Alvo:** `src/02_calculadoras_puras.js`
- **Função/Componente/Seletor:** Tabela posológica de `ibuprofeno` (linha 1039), `amoxicilina` (linha 988), `amoxicilina_clavulanato` (linha 1001), `sequenciaRapidaIntubacao` (linha 889) e `parkland` (linha 792).
- **Comportamento Esperado / Critério de Aceite:**
  1. Corrigir concentração de Ibuprofeno gotas para 10 gotas/mL (1 gota = 5 mg), prescrevendo 2 gotas/kg/dose (máximo 40 gotas).
  2. Elevar teto diário de Amoxicilina e Amoxicilina/Clavulanato para 3.000 mg/dia para viabilizar tratamento de OMA em crianças > 17 kg.
  3. Impor `Math.min()` com teto absoluto de 200 mg para Succinilcolina e 100 mg para Rocurônio na SRI, independentemente do peso do paciente.
  4. Atualizar fórmula de Parkland para 2 mL/kg/%SCQ para queimaduras térmicas em adultos (ATLS 10ª Ed.), mantendo 4 mL para alta voltagem.

---

### FASE 2: Desacoplamento de IA & Latência Sub-50ms

#### Vertical Slice 2.1: Router Léxico-Estrutural Determinístico O(1)
- **Arquivo/Módulo Alvo:** `src/04_motores_ia.js` e `src/07a_telegram_router.js`
- **Função/Componente/Seletor:** Função `classificarIntencaoMensagem` (linha 3067) e despachante central do roteador.
- **Comportamento Esperado / Critério de Aceite:**
  1. Eliminar a chamada a `_iaExecutar` no final de `classificarIntencaoMensagem`.
  2. Implementar a tabela léxica pré-compilada `ROUTER_LEXICO` com categorização instantânea por Hash Sets e prioridade máxima para bandeiras vermelhas de emergência.
  3. Fallback determinístico direto em 0ms para `CONVERSA`.
  4. Tempo de roteamento medido < 1ms para qualquer mensagem de texto livre.

#### Vertical Slice 2.2: Desacoplamento de Gasometria, Calculadoras e Interações
- **Arquivo/Módulo Alvo:** `src/07a_telegram_router.js` e `src/04_motores_ia.js`
- **Função/Componente/Seletor:** Handlers `tratarComandoGasometria_`, `tratarComandoCalculadora_` e função `verificarInteracaoComIA`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Redirecionar comandos `/gaso` e textos gasométricos diretamente para o motor matemático `CalculadorasClinicas.gasometria` sem acionar LLM.
  2. Remover despacho de calculadoras para `processarCalculadoraClinicaComIA`.
  3. Implementar checagem local de interações medicamentosas graves via matriz estática de pares de alto risco.

#### Vertical Slice 2.3: Otimização de I/O em Consultas de Fármacos e Receitas
- **Arquivo/Módulo Alvo:** `src/07c_telegram_consultas_e_ia.js`
- **Função/Componente/Seletor:** Funções `nomesFarmacosParaValidacao`, `montarRascunhoRxESoapAmbulatorial` e `responderConsultaPosologiaHSL`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Inicializar `nomesFarmacosSet` uma única vez no boot em memória RAM.
  2. Eliminar gravações prematuras de cache com `safePutCache` nas consultas de rotina do `/dose`.
  3. Adotar parâmetros compactos nos botões inline, gerando rascunhos de PDF e SOAP sob demanda apenas no toque.

---

### FASE 3: Expansão Funcional Determinística Beira-Leito

#### Vertical Slice 3.1: Guia Rápido de Diluição & Incompatibilidade em Y
- **Arquivo/Módulo Alvo:** `src/domain/diluicao_injetaveis_domain.js` (Novo) e `src/12_experiencia_bot.js`
- **Função/Componente/Seletor:** Domínio `DiluicaoInjetaveisDomain` e handler `enviarTelaDiluicaoFarmaco` com prefixo `ux:dil:`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Catálogo determinístico contendo Amiodarona, Fenitoína, Sulfato de Magnésio, Nitroprussiato, Noradrenalina e Fentanil.
  2. Retorno imediato de diluente obrigatório, concentração máxima por via periférica vs. central e velocidade máxima de infusão.
  3. Navegação fluida em 2 toques com botões inline $\le 30$ bytes.

#### Vertical Slice 3.2: Kits de Prescrição Sindrômica na APS & Pronto Atendimento
- **Arquivo/Módulo Alvo:** `src/domain/pacotes_sindromicos_domain.js` (Novo) e `src/12_experiencia_bot.js`
- **Função/Componente/Seletor:** Domínio `PacotesSindromicosDomain` e handler `enviarTelaKitSindromico` com prefixo `ux:kit:`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Pacotes estruturados para Cólica Nefrética, Amigdalite Bacteriana, Asma na Emergência, Dengue Grupo C e GECA.
  2. Prescrição pronta em texto formatado com botão "Copiar para PEP" via `copy_text`.
  3. Compatibilidade estrita com medicamentos padronizados na REMUME.

#### Vertical Slice 3.3: Checklists Clínicos com Estado Bitmask Stateless
- **Arquivo/Módulo Alvo:** `src/domain/checklist_clinico_domain.js` (Novo) e `src/12_experiencia_bot.js`
- **Função/Componente/Seletor:** Domínio `ChecklistClinicoDomain` e handler `enviarTelaChecklistClinico` com prefixo `ux:chk:`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Checklists de Admissão (FAST-HUG SB), Passagem SBAR e Alta Hospitalar.
  2. Alternância de status dos itens transportada exclusivamente no bitmask do `callback_data` sem nenhuma gravação em disco ou cache.
  3. Edição de mensagem in-place sem flicker no Telegram.

#### Vertical Slice 3.4: Otimizador de Timeline de Rotina com Time-Blocking Dinâmico
- **Arquivo/Módulo Alvo:** `src/domain/time_blocking_optimizer_domain.js` (Novo) e `src/12_experiencia_bot.js`
- **Função/Componente/Seletor:** Domínio `TimeBlockingOptimizerDomain` e handler `enviarTelaTimeBlockingDinamico` com prefixo `ux:tb:`.
- **Comportamento Esperado / Critério de Aceite:**
  1. Recálculo instantâneo a partir da hora real atual até as 22:30.
  2. Perfis adaptativos: `pos_plantao`, `compacto` (-2h de atraso) e `foco_total`.
  3. Integração com o Hub de Rotina (`ux:hub:rotina`) permitindo reprogramação do dia em 2 toques.

---

## 6. CONCLUSÃO & PRÓXIMOS PASSOS

Esta auditoria pelo motor **Gemini 4 Argon** consolida o diagnóstico técnico completo da infraestrutura e conteúdo médico do bot. A transição para processamento determinístico nas rotinas de cálculo, classificação de mensagens e consultas de enfermagem eliminará a latência beira-leito, reduzirá custos de token em mais de 50% e blindará a prática médica contra alucinações de modelos generativos.

**Próxima Etapa Recomendada:** Executar o **Vertical Slice 1.1** (Correção de bugs críticos e assinaturas em `src/02_calculadoras_puras.js`) sob metodologia TDD rigorosa, garantindo a solidez matemática e estabilidade antes das otimizações de roteamento.
