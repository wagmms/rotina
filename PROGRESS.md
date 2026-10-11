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

- [x] **Telegram Router - Desacoplamento de Comandos Slash e Tabela de Despacho O(1) (`src/07a_telegram_router.js`)**:
    - **Diagnóstico e Refatoração Estrutural**:
      * Em `src/07a_telegram_router.js`: desacoplados comandos `/rx`, `/rxh`, `/plantao` e `/calc` em handlers modulares (`tratarComandoRx`, `tratarComandoRxh`, `tratarComandoPlantao`, `tratarComandoCalc`).
      * Tabela `rotearComandoSistema` expandida com despacho direto O(1) e early return, eliminando cascatas de `if/else` em `processarMensagemTexto`.
      * Cláusula pétrea de conteúdo médico, doses farmacológicas, links de navegação e atalhos rápidos rigorosamente preservados.
    - **Validação e Resultados**: 100% de aprovação na suíte direcionada (`test_hubs_e_comandos_telegram.cjs`, `test_novos_comandos.py`). Checksum e bundle `ultra_rotina_master.js` 100% sincronizados.

> 📁 Histórico completo arquivado em [CHANGELOG.md](CHANGELOG.md)

---

## 🔄 Próxima Tarefa em Andamento

- [ ] **Prescrição Hospitalar - Decomposição de Validações de Posologia e Ajuste Renal (`src/05_prescricao_hospitalar.js`)**:
    - **Arquivo/Módulo Alvo**: `src/05_prescricao_hospitalar.js`
    - **Função/Componente/Seletor**: Funções de checagem e formatação de itens de prescrição (`validarItemPrescricao`, `aplicarAjusteRenalItem`)
    - **Comportamento Esperado / Critério de Aceite**: Substituir escadas de condições por dicionários de regras e funções puras com early return.

---

## 📋 Backlog Prioritário: Refatoração Estrutural & Código "Liso" (Elegância Arquitetural)

1. [ ] **Telegram Callbacks - Desacoplamento de Roteamento de Callbacks Inline (`src/07d_telegram_callbacks.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07d_telegram_callbacks.js`
    - **Função/Componente/Seletor**: Função principal `processarCallbackBotao`
    - **Comportamento Esperado / Critério de Aceite**: Substituir cascata de regexes e `if/else` por tabela de despacho O(1) por prefixo de callback.

2. [ ] **Telegram Mídia e Leitos - Decomposição de Parsing de Ditados e Round (`src/07e_telegram_midia_e_leitos.js`)**:
    - **Arquivo/Módulo Alvo**: `src/07e_telegram_midia_e_leitos.js`
    - **Função/Componente/Seletor**: Funções de processamento de áudio clínico e extração de leitos para passagem de plantão
    - **Comportamento Esperado / Critério de Aceite**: Desacoplar blocos aninhados de transcrição e pós-processamento clínico em helpers atômicos.

---

## 💡 Sugestões de Melhorias Futuras (Documentação & Planejamento)

> 💡 Catálogo completo e limpo de sugestões arquivado e documentado em [docs/SUGESTOES_FUTURAS.md](docs/SUGESTOES_FUTURAS.md).

- *Sugestão 01 (Sala Vermelha / Hipercalemia Grave)*: Kit prescritivo em 1 toque do tripé da hipercalemia (K+ > 6.0 ou alteração de ECG) combinando Estabilização de Membrana (Gluconato 10%), Shift Intracelular (Glicoinsulina + Beta-2 inalatório) e Eliminação Corpórea (Furosemida / Resinas) com vigilância seriada de ritmo e glicemia.
- *Sugestão 02 (Sala Vermelha / Intubação SRI)*: Alerta sentinela de colapso hemodinâmico bloqueando o uso inadvertido de drogas vasodilatadoras (Propofol ou Midazolam) em pacientes em choque com Noradrenalina, direcionando para Etomidato (0,3 mg/kg) ou Quetamina (1,5-2 mg/kg).
- *Sugestão 03 (Nefrologia & UTI / Hidratação)*: Calculadora integrada de reposição de potássio IV (KCl 19,1%) calculando concentração máxima permitida para acesso periférico (40 mEq/L) vs central (60 mEq/L) e velocidade horária máxima (10-20 mEq/h sob monitorização cardíaca).
- *Sugestão 04 (Farmacologia de UTI / Acessos)*: Matriz esquemática de alocação de fármacos por lúmen de Cateter Venoso Central (CVC de duplo/triplo lúmen) para evitar incompatibilidade físico-química: distal (vasopressores/DVA), medial (NPT/sangue) e proximal (sedoanalgesia/bolus).
- *Sugestão 05 (Emergência Respiratória / Gasometria)*: Alvos de ventilação mecânica protetora na SDRA acoplados à gasometria (VT 6 mL/kg de peso predito pela altura, FR ajustada para PaCO2 alvo e PEEP para PaO2 alvo associados ao cálculo de P/F da classificação de Berlin).

---
