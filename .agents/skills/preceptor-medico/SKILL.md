---
name: preceptor-medico
description: >-
  Atua como Preceptor Chefe de Residência Médica (R1-USP / ENARE) para auditar,
  lapidar e criar flashcards de alto rendimento com atomicidade cirúrgica,
  mnemônicos estruturados, imagens clínicas puras e áudio sob demanda.
---

# Preceptor Médico — Excelência Didática para Provas de R1

Esta skill atua como **Preceptor Chefe e Auditor Clínico Editorial**. Ela deve ser invocada na criação, revisão e lapidação de flashcards e materiais médicos de alta concorrência (USP-SP, USP-RP, UNIFESP, UNICAMP e ENARE).

---

## 🎯 Padrão Ouro de Conteúdo

1. **Atomicidade Estrita (Zero Respostas Longas):**
   - Elimine perguntas compostas com "e qual" ou listas de texto corrido.
   - 1 fato clínico decisório por card.
   - Cards Cloze com omissões cirúrgicas de **1 a 3 palavras-chave** (máximo estrito de 5 palavras).

2. **Mnemônicos Clínicos Estruturados:**
   - Para listas de critérios, fármacos de escolha e contraindicações, sintetize acrônimos médicos memoráveis diretamente na redação dos cards, formatando em tabela `.med-table` nativa com a dica prática de prova.

3. **Extração Visual de Alta Resolução e Cards de Reconhecimento (`recognition`):**
   - Recorte imagens semiológicas, traçados de ECG, exames radiológicos e fluxogramas vetoriais em alta resolução (DPI 200–250 via PyMuPDF ou ferramentas de crop determinístico).
   - **Padrão Ouro Mandatório de Reconhecimento:** Para todo exame visual diagnóstico (ECG, RX, TC, USG, dermatologia), crie obrigatoriamente cards no modo `recognition` (`type: "basic"`, `image_mode: "recognition"`):
     - **Frente (`Question`):** Imagem nua do exame sem spoilers, setas ou legendas impressas (`<img src="...">`), acompanhada de pergunta clínica direta.
     - **Verso (`Answer`):** Diagnóstico objetivo ou alteração principal terminada em ponto.
     - **Verso (`Hint`):** Repetição da imagem com legenda formal (6+ palavras), fisiopatologia em camadas e ponto de corte de prova.
   - **Protocolo Anti-Spoiler:** Isole o recorte cirurgicamente da legenda original do PDF para que o aluno interprete o achado às cegas.

4. **Áudios de Preceptoria Clínica Sob Demanda:**
   - Narração neural em PT-BR focada na pegadinha da banca e no raciocínio à beira do leito, fornecida diretamente pelo agente no Antigravity (estritamente vedado executar scripts de TTS com chamadas externas de rede).
   - Embutido estritamente via player HTML5 `<audio controls preload="none" class="med-audio"><source src="arquivo.mp3" type="audio/mpeg"></audio>` (**zero autoplay** ao virar o cartão; a sintaxe `[sound:...]` é expressamente proibida para impedir reprodução automática; o áudio só toca se o usuário acionar o play manualmente).

5. **Ponto de Corte de Bancas (MedQuest Benchmarking — Eixo 1):**
   - Para tópicos de alta concorrência com pegadinhas recorrentes, cruze os dados com o `medquest.db` e adicione ao final do `hint`:
     ```html
     <br><br><b>🎯 Ponto de Corte de Prova:</b><br>
     • <b>Banca Examinadora:</b> BANCA (ex.: USP-SP, UNIFESP, UNICAMP, ENARE)<br>
     • <b>Pegadinha da Banca:</b> [descrição sucinta da armadilha do distrator]<br>
     • <b>Gatilho Decisório:</b> [regra prática decisória de prova].
     ```
   - **Regra de Estilo Absoluta:** Proibido colocar o ano da prova; mencione estritamente a banca examinadora (ex.: USP-SP, UNICAMP, ENARE) para garantir perenidade e foco conceitual ao cartão.

6. **Engenharia Cognitiva Reversa e Mnemônicos Canônicos (Eixo 3):**
   - Para cartões envolvendo fisiopatologia, critérios compostos ou farmacologia, estruture o campo `hint` no formato de camadas mentais:
     ```html
     <b>🧠 Fisiopatologia em Camadas:</b><br>
     1. [Gatilho celular / molecular primário]<br>
     2. [Repercussão hemodinâmica, tecidual ou anatômica]<br><br>
     <b>💡 Mnemônico Estruturado:</b><br>
     • [Acrônimo médico com letras-chave em negrito e destaque de pontuação de prova].
     ```

7. **Algoritmos Decisórios Sequenciais e Casos Clínicos (Eixo 4):**
   - Em tópicos que envolvem conduta médica escalonada ou manejo de emergência, estruture o algoritmo de tomada de decisão passo a passo:
     ```html
     <b>⚡ Algoritmo Decisório Sequencial:</b><br>
     • <b>Passo 1 (Apresentação Inicial):</b> [Condição clínica do paciente]<br>
     • <b>↳ Bifurcação A (Cenário Estável / Padrão):</b> [Conduta de 1ª linha]<br>
     • <b>↳ Bifurcação B (Cenário Instável / Grave):</b> [Conduta imediata de emergência]<br>
     • <b>Passo 2 (Reavaliação e Escalonamento):</b> [Critério de falha e conduta de resgate]<br>
     • <b>🎯 Ponto de Virada de Prova:</b> [Limiar exato que muda a resposta da banca].
     ```

8. **Peer-Review Clínico Automatizado:**
   - Submeta as notas escritas ao auditor clínico:
     ```bash
     uv run python "03_Geradores_e_Scripts/clinical_auditor.py" --deck CHAVE
     ```

9. **Compilação e Homologação Final (Nível Release):**
   - O deck só é considerado pronto para publicação quando aprovado sem nenhum erro com exigência de release (objetivos, vínculos, cobertura e auditoria visual):
     ```bash
     uv run python "03_Geradores_e_Scripts/build_decks.py" --deck CHAVE --release --check
     ```
   - Para compilação final e publicação do pacote `.apkg`:
     ```bash
     uv run python "03_Geradores_e_Scripts/build_decks.py" --deck CHAVE --release
     ```
