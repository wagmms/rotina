### STATUS: REFATORACAO_CONTINUA_E_CODIGO_LISO

# 💎 Ultra Rotina — Refatoração Contínua, Código Liso e Elegância Estrutural

> 📦 **Backup das diretrizes anteriores**: Preservado em [docs/BACKUP_DIRETRIZES_AUTOLOOP.md](docs/BACKUP_DIRETRIZES_AUTOLOOP.md) para restauração sob comando.

**DIRETRIZ ATUAL DO USUÁRIO (FOCO PRIORITÁRIO)**:
1. **Refatoração Estrutural e Código Liso**: Foco total de energias em simplificar funções longas, remover aninhamentos profundos (*early returns*, *guard clauses*), substituir escadas `if/else` por tabelas de despacho (*dispatch tables*) e desobstruir lógicas espaguete, mantendo o código limpo, modular, legível e fluido.
2. **Economia Radical de Tokens**: Inspeção cirúrgica por intervalos estritos de linhas (`StartLine`/`EndLine`) sem leituras cegas de 800 linhas em arquivos gigantes (> 500 linhas). Modularização contínua para baratear permanentemente o consumo de tokens nos próximos ciclos.
3. **CLÁUSULA PÉTREA DE QUALIDADE CLÍNICA (INVIOLÁVEL)**: A busca por código limpo, conciso e elegante NUNCA, SOB HIPÓTESE ALGUMA, PODE REDUZIR, DILUIR OU DEGRADAR A QUALIDADE, O DETALHAMENTO, AS SALVAGUARDAS DE SEGURANÇA OU O RIGOR DO CONTEÚDO MÉDICO. Doses farmacológicas, limites de toxicidade, contraindicações, alertas sentinela, semiologia descritiva e diretrizes canônicas são imutáveis e sagradas.
4. **Validação Rigorosa (Test Sharding & Regressão Zero)**: Durante a refatoração, iterar exclusivamente com os testes direcionados da função/módulo editado (~0.3s a 0.5s); ao concluir, validar com a suíte integral para garantir 100% de estabilidade funcional sem quebras.
5. **Padrão JS Nativo Moderno (Node 20+)**: Zero dependências de pacotes novos; utilizar recursos nativos da plataforma (`?.`, `??`, destructuring).
6. **Documentação de Sugestões para o Futuro**: Registrar quaisquer oportunidades identificadas em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

---

## 🔄 Tarefa Concluída

- [x] **Autoloop - Roteamento Preciso de Modelos Codex (`gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `gpt-5.6-terra`) e Blindagem Antitransbordamento de Backend/Infraestrutura (`tooling/autoloop/core/scoped_audit.py`, `tooling/autoloop/core/model_router.py`, `tooling/autoloop/install.py` e `tooling/autoloop/tests/test_model_routing_accuracy.py`)**:
    - **Diagnóstico e Correção**:
      * Identificado desperdício massivo de tokens do Astra onde controladores Fastify (como `server/controllers/calculadora.controller.js`) eram classificados como clínicos devido à substring `calculador` no caminho do arquivo e tinham arquivos de utilitários/controllers inteiros arrastados para o Astra por chamadas de funções compartilhadas, inflando o diff em 3 fatias de particionamento e esgotando a cota semanal.
      * Refatorados `model_router.py` (filtragem em `arquivos_busca_clinica` expurgando pastas de backend/testes da detecção clínica, e roteamento otimizado de CSS para Terra, docs/lockfiles para Luna, concorrência para Sol e termos clínicos reais para Astra com bloqueio fatal de residência a 0 tokens) e `scoped_audit.py` (`eh_infra_ou_backend` blindando backend/controllers contra transbordamento para o escopo do Astra).
      * Integrado `model_router.py` em `install.py` e desenvolvida suíte automatizada `test_model_routing_accuracy.py` com 13 testes cobrindo a matriz completa de 10 perfis e isolamento total de escopos.
    - **Validação e Resultados**: 100% de aprovação na suíte de testes do autoloop (160/160 testes) e na bateria completa de regressão do ecossistema (244/244 testes em 38.17s com zero regressões).

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Telegram Bot - Tratamento de Comandos de Voz / Áudio Clínico e Resiliência de Transcrição (`src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07e_telegram_midia_e_leitos.js`, `src/04_motores_ia.js` e `server/index.js`
    - **Função/Componente/Seletor**: Funções `processarAudioMensagemTelegram`, `processarAudioClinicoMultimodal` e rota `/api/chat` com `audioBase64`
    - **Comportamento Esperado / Critério de Aceite**: Garantir que áudios clínicos (ditado de corredor, passagem de leito) com ruído, falha de rede ou codecs webm/ogg/mp3 recebam processamento resiliente com fallback transparente para transcrição e estruturação SOAP sem perda de termos médicos nem falha de processo.

---

## 📋 Backlog Prioritário: Refatoração Estrutural & Código "Liso" (Elegância Arquitetural)

1. [ ] **Telegram Router - Despacho Modular e Eliminação de If/Else Gigantes (`src/07a_telegram_router.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07a_telegram_router.js`
    - **Função/Componente/Seletor**: Função `rotearMensagemTelegram` / `rotearComandoTexto`
    - **Comportamento Esperado / Critério de Aceite**: Decompor o encadeamento de condicionais de 5.300 linhas em tabela de despacho (dispatch table/handlers modulares), eliminando aninhamentos profundos e tornando a navegação de comandos limpa, legível e rápida, com 100% de aprovação nos testes do roteador.

2. [ ] **Experiência do Bot - Simplificação de Menus e Teclados Redundantes (`src/12_experiencia_bot.js`)**:
    - **Arquivo/Módulo Alvo**: `src/12_experiencia_bot.js`
    - **Função/Componente/Seletor**: Helpers de construção de teclados `criarTecladoInline` e funções montadoras de hubs
    - **Comportamento Esperado / Critério de Aceite**: Extrair fábrica modular de teclados para eliminar centenas de linhas de arrays de botões repetidos manualmente, aplicando guard clauses e padronização concisa sem quebrar callbacks existentes.

3. [ ] **Motores de IA - Refatoração do Pipeline de Fallback e Resiliência (`src/04_motores_ia.js`)**:
    - **Arquivo/Módulo Alvo**: `src/04_motores_ia.js`
    - **Função/Componente/Seletor**: Funções `chamarMotorIaComFallback` e `executarTentativaProvedor`
    - **Comportamento Esperado / Critério de Aceite**: Decompor fluxo espaguete de retries e fallbacks de provedores (Gemini, Groq, local) em pipeline linear e desacoplado com early returns, preservando integralmente as salvaguardas clínicas.

4. [ ] **Cockpit Integração - Modularização de Handlers de Sincronização (`src/13_cockpit_integracao.js`)**:
    - **Arquivo/Módulo Alvo**: `src/13_cockpit_integracao.js`
    - **Função/Componente/Seletor**: Funções de sincronização e parsing de eventos de plantão
    - **Comportamento Esperado / Critério de Aceite**: Decompor funções extensas com acoplamento misto de parsing e estado em funções puras de transformação de dados, reduzindo a complexidade ciclomática.

5. [ ] **Servidor Fastify - Decomposição de Handlers Inline de Rotas (`server/index.js`)**:
    - **Arquivo/Módulo Alvo**: `server/index.js`
    - **Função/Componente/Seletor**: Rotas `/api/chat`, `/api/calc`, `/api/prescricao`
    - **Comportamento Esperado / Critério de Aceite**: Extrair lógica de negócios embutida inline nas rotas para controladores desacoplados, deixando o arquivo de rotas enxuto, liso e focado em transporte HTTP e validação de schema.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Sala Vermelha / Hipercalemia Grave)*: Kit prescritivo em 1 toque do tripé da hipercalemia (K+ > 6.0 ou alteração de ECG) combinando Estabilização de Membrana (Gluconato 10%), Shift Intracelular (Glicoinsulina + Beta-2 inalatório) e Eliminação Corpórea (Furosemida / Resinas) com vigilância seriada de ritmo e glicemia.
- *Sugestão 02 (Sala Vermelha / Intubação SRI)*: Alerta sentinela de colapso hemodinâmico bloqueando o uso inadvertido de drogas vasodilatadoras (Propofol ou Midazolam) em pacientes em choque com Noradrenalina, direcionando para Etomidato (0,3 mg/kg) ou Quetamina (1,5-2 mg/kg).
- *Sugestão 03 (Nefrologia & UTI / Hidratação)*: Calculadora integrada de reposição de potássio IV (KCl 19,1%) calculando concentração máxima permitida para acesso periférico (40 mEq/L) vs central (60 mEq/L) e velocidade horária máxima (10-20 mEq/h sob monitorização cardíaca).
- *Sugestão 04 (Farmacologia de UTI / Acessos)*: Matriz esquemática de alocação de fármacos por lúmen de Cateter Venoso Central (CVC de duplo/triplo lúmen) para evitar incompatibilidade físico-química: distal (vasopressores/DVA), medial (NPT/sangue) e proximal (sedoanalgesia/bolus).
- *Sugestão 05 (Emergência Respiratória / Gasometria)*: Alvos de ventilação mecânica protetora na SDRA acoplados à gasometria (VT 6 mL/kg de peso predito pela altura, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin).

---
