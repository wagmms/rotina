# Ultra Rotina — Arquitetura e Módulos do Sistema

Este repositório está estruturado em 3 módulos principais:

---

## 1. 🤖 Bot do Telegram & Backend Clínico (Ultra Rotina)
Aplicação oficial de assistência médica e rotina clínica beira-leito, operando em tempo real com alta disponibilidade e baixa latência para internos e médicos generalistas.

- **`server/` e `server.js`**: Servidor Node.js 20+ (Fastify) com webhook resiliente, fila durável D1 e telemetria HTTP.
- **`src/`**: Núcleo clínico e inteligência médica (calculadoras puras, motores de IA, prescrições, enfermaria SBAR e handlers do Telegram).
- **`data/`**: Bases locais de alta velocidade (`guia_farmaceutico_hsl.json`, `interacoes.json`, `properties.json`) e `REMUME_RP.csv`.
- **`cockpit_movel.html` & `gh_cockpit_deploy/`**: Interface WebApp PWA complementar para acompanhamento de leitos, aulas flash e calculadoras.
- **`scripts/`**: Utilitários clínicos, avaliadores de qualidade de resposta e testes de fumaça da API do Telegram.
- **`build_master.py` & `ultra_rotina_master.js`**: Pipeline de compilação do bundle de produção.

---

## 2. 📅 Google Calendar (`calendar_manager/`)
Sistema de gestão, sincronização e auditoria da agenda médica e de estudos.

- **`calendar_manager/`**: Scripts de sincronização (`sync_avancado_medquest.py`, `reorganize_calendar.py`), deduplicação, auditoria de conflitos e gerenciamento de tokens OAuth.
- **`calendar_manager/calendarios/`**: Exportações canônicas em formato iCalendar (`.ics`) da rotina, academia e estudos.

---

## 3. 📊 Composição Corporal (`composicao_corporal/`)
Plataforma de acompanhamento antropométrico, evolução biométrica e projeções nutricionais beira-leito.

- **`composicao_corporal/composicao_corporal.html`**: Painel visual com histórico InBody e fórmulas antropométricas (Jackson & Pollock 3 Dobras, Siri e US Navy).
- **`composicao_corporal/bio_composicao_hub.py`**: CLI interativo para cálculo de densidade corporal, percentual de gordura e demanda nutricional.

---

## 🧪 Testes Automatizados (`tests/`)
Suíte com testes automatizados integrados (Node.js e Pytest) cobrindo os módulos do sistema.

```bash
# Executar todos os testes
npm test

# Compilar o bundle de produção do bot
npm run build
```
