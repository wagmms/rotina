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

- [x] **Telegram Mini App (WebApp) & Inline Mode - Resposta Instantânea Inline e Sincronização Bidirecional PWA (`src/07h_telegram_inline_e_webapp.js`, `src/08_main.js`, `src/11_entrega_confiavel.js`, `tests/test_telegram_inline_e_webapp.cjs`)**:
    - **Diagnóstico e Refatoração Estrutural**:
      * Implementado suporte oficial a **Inline Mode** (`@UltraRotinaBot [busca]`), com geração dinâmica de cards clínicos formatados (`InlineQueryResultArticle`): DVA com cálculo por peso (Nora, Vaso, Dobuta), SRI com doses exatas em mg e mL, escores de emergência (CURB-65, Wells TEP, HAS-BLED, CHA₂DS₂-VASc, Gasometria com Winter, Glasgow-P com pupilas) e consulta farmacológica local (HSL / REMUME).
      * Despacho via `responderInlineQueryTelegram` com fast-path de resposta em tempo real (< 50ms) no `doPost` de `src/08_main.js` e autorização segura do remetente.
      * Suporte bidirecional a **Telegram Mini App**: tratamento de `message.web_app_data` (`processarWebAppData`) para dados enviados do Cockpit PWA para o chat com botões de prontuário (PEP).
      * Configuração nativa de Chat Menu Button (`configurarMenuButtonTelegram` via `setChatMenuButton`) com tipo `web_app`, abrindo o Cockpit em tela cheia com 1 toque ao lado do teclado.
      * Cláusula pétrea de conteúdo médico, doses farmacológicas e salvaguardas de toxicidade rigorosamente preservadas.
    - **Validação e Resultados**: 100% de aprovação na suíte dedicada `tests/test_telegram_inline_e_webapp.cjs` (0.42s) e 100% de sucesso na bateria completa de 49 suítes (`npm test` em 8.98s com zero regressões). Checksum e bundle `ultra_rotina_master.js` 100% sincronizados.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Telegram Callbacks - Desacoplamento de Roteamento de Callbacks Inline (`src/07d_telegram_callbacks.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07d_telegram_callbacks.js`
    - **Função/Componente/Seletor**: Função principal `processarCallbackBotao(cb)`
    - **Comportamento Esperado / Critério de Aceite**: Decompor cascata monolítica de 900 linhas em mapa de despacho O(1) por prefixo de ação (`ux:`, `pcr_`, `dhe_`, `go_`, `rotina_`, `ef_`, `calc_`), validando com `tests/test_hubs_e_comandos_telegram.cjs` e `tests/test_runtime_bot.py`.

---

## 📋 Backlog Prioritário: Refatoração Estrutural & Código "Liso" (Elegância Arquitetural)

1. [ ] **Telegram Mídia e Leitos - Decomposição de Parsing de Ditados e Round (`src/07e_telegram_midia_e_leitos.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07e_telegram_midia_e_leitos.js`
    - **Função/Componente/Seletor**: Funções de processamento de áudio clínico e extração de leitos para passagem de plantão
    - **Comportamento Esperado / Critério de Aceite**: Desacoplar blocos aninhados de transcrição e pós-processamento clínico em helpers atômicos.

2. [ ] **Prescrição Hospitalar & IA - Modularização de Validações e Prompts de Internação (`src/04_motores_ia.js`)**:
    - **Arquivo/Módulo Alvo**: `src/04_motores_ia.js`
    - **Função/Componente/Seletor**: Função geradora `gerarPrescricaoHospitalarComIA`
    - **Comportamento Esperado / Critério de Aceite**: Extrair regras de validação de ajuste renal e contraindicações em funções puras antes da montagem do prompt.

3. [ ] **Telegram Calculadoras Parser - Decomposição de Regexes de Scores Clínicos (`src/07f_telegram_calculadoras_parser.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07f_telegram_calculadoras_parser.js`
    - **Função/Componente/Seletor**: Funções de parsing de texto livre para calculadoras
    - **Comportamento Esperado / Critério de Aceite**: Decompor regexes repetitivas em tabela de extratores modulares.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Sala Vermelha / Hipercalemia Grave)*: Kit prescritivo em 1 toque do tripé da hipercalemia (K+ > 6.0 ou alteração de ECG) combinando Estabilização de Membrana (Gluconato 10%), Shift Intracelular (Glicoinsulina + Beta-2 inalatório) e Eliminação Corpórea (Furosemida / Resinas) com vigilância seriada de ritmo e glicemia.
- *Sugestão 02 (Sala Vermelha / Intubação SRI)*: Alerta sentinela de colapso hemodinâmico bloqueando o uso inadvertido de drogas vasodilatadoras (Propofol ou Midazolam) em pacientes em choque com Noradrenalina, direcionando para Etomidato (0,3 mg/kg) ou Quetamina (1,5-2 mg/kg).
- *Sugestão 03 (Nefrologia & UTI / Hidratação)*: Calculadora integrada de reposição de potássio IV (KCl 19,1%) calculando concentração máxima permitida para acesso periférico (40 mEq/L) vs central (60 mEq/L) e velocidade horária máxima (10-20 mEq/h sob monitorização cardíaca).
- *Sugestão 04 (Farmacologia de UTI / Acessos)*: Matriz esquemática de alocação de fármacos por lúmen de Cateter Venoso Central (CVC de duplo/triplo lúmen) para evitar incompatibilidade físico-química: distal (vasopressores/DVA), medial (NPT/sangue) e proximal (sedoanalgesia/bolus).
- *Sugestão 05 (Emergência Respiratória / Gasometria)*: Alvos de ventilação mecânica protetora na SDRA acoplados à gasometria (VT 6 mL/kg de peso predito pela altura, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin).

---
