const fs = require('fs');
const path = require('path');

// 1. Carrega o ficheiro .env automaticamente
function carregarEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ ERRO: Ficheiro .env não encontrado na pasta raiz do projeto.');
    process.exit(1);
  }
  const linhas = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) continue;
    const idx = limpa.indexOf('=');
    if (idx !== -1) {
      const chave = limpa.slice(0, idx).trim();
      const valor = limpa.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[chave]) process.env[chave] = valor;
    }
  }
}

carregarEnv();

const ARQUIVOS_ALVO = [
  'src/02_calculadoras_puras.js',
  'src/02_emergencia_choque_septico_circi.js',
  'src/02_compatibilidade_y_dva.js',
  'src/02_nefrologia_dhe.js',
  'src/07f_telegram_calculadoras_parser.js'
];

async function descobrirModelos(ai) {
  const encontrados = [];
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (m && m.name) {
        const id = m.name.replace(/^models\//, '');
        if (!id.includes('embedding') && !id.includes('imagen') && !id.includes('veo') && !id.includes('aqa')) {
          encontrados.push(id);
        }
      }
    }
  } catch (err) {
    // Se a listagem não for suportada pela chave, segue para a tentativa direta
  }
  return encontrados;
}

async function executarAuditoria() {
  console.log('==============================================================');
  console.log('🏥 INICIANDO JUNTA MÉDICA DE IA - EMERGÊNCIA, UTI E DVA');
  console.log('==============================================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ ERRO: GEMINI_API_KEY não encontrada dentro do seu ficheiro .env!');
    process.exit(1);
  }

  let dossieCodigo = '';

  for (const relPath of ARQUIVOS_ALVO) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Aviso: Ficheiro ${relPath} não encontrado.`);
      continue;
    }
    const conteudo = fs.readFileSync(fullPath, 'utf8');
    console.log(`✅ Lido: ${relPath} (${conteudo.length} caracteres)`);
    dossieCodigo += `\n\n--- INÍCIO DO FICHEIRO: ${relPath} ---\n${conteudo}\n--- FIM DO FICHEIRO: ${relPath} ---\n`;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log('\n🔍 A verificar os modelos de topo disponíveis na sua chave Google...');
  const modelosNaConta = await descobrirModelos(ai);

  if (modelosNaConta.length > 0) {
    console.log('📋 Modelos detetados na sua conta:', modelosNaConta.slice(0, 12).join(', '));
  }

  // Filtra se existe algum modelo com "argon" na conta ou cria a fila de prioridade máxima
  const modelosArgon = modelosNaConta.filter(m => m.toLowerCase().includes('argon'));
  const modelosProDaConta = modelosNaConta
    .filter(m => m.includes('pro') && !m.includes('vision'))
    .sort()
    .reverse();

  const filaDeTentativa = [
    ...new Set([
      ...modelosArgon,
      'google-4-argon',
      'gemini-4-argon',
      ...modelosProDaConta,
      'gemini-2.5-pro',
      'gemini-2.5-flash'
    ])
  ];

  const promptAuditoria = `
Você é um Médico Intensivista Sênior (AMIB), Farmacêutico Clínico Hospitalar (padrão Hospital Sírio-Libanês) e Engenheiro de Software Médico de Alta Confiabilidade.

Seu diretor clínico NÃO é programador. Ele precisa de um diagnóstico cristalino, rigoroso e acionável sobre os 5 módulos de Emergência/UTI do bot de Telegram dele (listados abaixo).

Analise minuciosamente todo o código-fonte abaixo e produza um relatório dividido EXATAMENTE nestas 5 seções:

### 1. 🚨 ERROS CRÍTICOS DE FÓRMULA, DILUIÇÃO OU POSOLOGIA (RISCO AO PACIENTE)
Verifique todas as fórmulas em \`02_calculadoras_puras.js\`, \`02_emergencia_choque_septico_circi.js\` e \`02_nefrologia_dhe.js\`:
- Conversões de mcg/kg/min para mL/h e vice-versa (Noradrenalina, Dobutamina, Adrenalina, Vasopressina, Nitroprussiato, Nitroglicerina, Fentanil, Midazolam, Propofol, Dexmedetomidina, Cetamina).
- Sequência Rápida de Intubação (SRI): doses de indução e bloqueadores neuromusculares (Etomidato, Cetamina, Propofol, Fentanil, Midazolam, Succinilcolina, Rocurônio) e alertas de contraindicação (ex: Succinilcolina na hipercalemia/rabdomiólise).
- Distúrbios Hidroeletrolíticos (Sódio e Potássio): Fórmula de Adrogué-Madias, velocidade máxima segura de correção de Na+ (risco de mielinólise pontina se > 8-10 mEq/L/24h), concentração máxima de K+ em acesso periférico vs central, velocidade máxima de reposição de K+ e manejo de hipercalemia com alteração de ECG.
- Liste cada falha ou confirmação de acerto explicando em linguagem médica clara.

### 2. 🛡️ FALTA DE TRAVAS DE SEGURANÇA (LIMITES FISIOLÓGICOS E EXTREMOS)
O que acontece no código atual se o médico na pressa digitar:
- Peso impossível (0, negativo, texto, ou peso em gramas como 800 achando que é kg, ou obesidade mórbida > 180 kg sem teto de dose)?
- Criança grande (> 40-50 kg) ultrapassando dose teto de adulto?
- Sódio ou Potássio incompatíveis com a vida (ex: Na 500, K 0, K 25) ou vazão de bomba absurda?
Aponte exatamente onde o código aceita valores perigosos sem bloquear ou alertar.

### 3. 💉 AUDITORIA DE COMPATIBILIDADE EM Y (DVA E SEDAÇÃO)
Avalie \`02_compatibilidade_y_dva.js\`:
- As incompatibilidades graves clássicas de UTI estão cobertas (ex: Bicarbonato com Catecolaminas/Cálcio, Furosemida com Midazolam/Dobutamina, Fenitoína, Piperacilina-Tazobactam com Vancomicina/Aminoglicosídeos, Anfotericina B, Diazepam)?
- O que está faltando ou pode induzir erro na beira do leito?

### 4. ⚡ POR QUE O BOT PODE FALHAR OU DEMORAR NO TELEGRAM (PARSER DE COMANDOS)
Avalie \`07f_telegram_calculadoras_parser.js\`:
- Como o médico digita na vida real na emergência (ex: "nora 70kg 12ml/h", "nora 80 0.2", "k 6.8", "na 114 65kg", "sri 85kg", "choque 70kg", "y nora fenta") versus o que o código realmente entende hoje.
- Liste todos os "pontos cegos" onde o bot não entende o texto do médico.

### 5. 🛠️ PLANO DE CORREÇÃO IMEDIATA (ESPECIFICAÇÃO TÉCNICA PARA O ENGENHEIRO)
Liste de forma técnica e exata (nome da função, linha/lógica atual e lógica corrigida) todas as alterações que devem ser aplicadas nos 5 arquivos para atingir 100% de segurança clínica.

AQUI ESTÁ O CÓDIGO-FONTE ATUAL DOS 5 ARQUIVOS:
${dossieCodigo}
`;

  let response = null;
  let modeloUtilizado = '';

  for (const candidato of filaDeTentativa) {
    try {
      console.log(`🧠 A tentar iniciar auditoria com o modelo: [${candidato}]...`);
      response = await ai.models.generateContent({
        model: candidato,
        contents: promptAuditoria,
        config: {
          temperature: 0.1
        }
      });
      if (response && response.text) {
        modeloUtilizado = candidato;
        break;
      }
    } catch (err) {
      const msg = (err && err.message) ? err.message.split('\n')[0] : String(err);
      console.log(`   ↪ Modelo [${candidato}] indisponível diretamente na API (${msg.slice(0, 90)}...). A passar para o próximo da fila...`);
    }
  }

  if (!response || !response.text) {
    console.error('\n❌ Nenhum modelo conseguiu responder. Verifique se a sua GEMINI_API_KEY está ativa.');
    process.exit(1);
  }

  const cabecalho = `> **Modelo Auditor Utilizado:** \`${modeloUtilizado}\`\n> **Data da Perícia:** ${new Date().toISOString()}\n\n`;
  const relatorioTexto = cabecalho + response.text;

  const pastaAuditorias = path.join(process.cwd(), 'auditorias');
  if (!fs.existsSync(pastaAuditorias)) {
    fs.mkdirSync(pastaAuditorias, { recursive: true });
  }

  const caminhoRelatorio = path.join(pastaAuditorias, 'JUNTA_MEDICA_UTI_DVA.md');
  fs.writeFileSync(caminhoRelatorio, relatorioTexto, 'utf8');

  console.log('\n==============================================================');
  console.log(`✅ AUDITORIA CONCLUÍDA COM SUCESSO PELO MODELO: ${modeloUtilizado}`);
  console.log(`📄 Relatório guardado em: ${caminhoRelatorio}`);
  console.log('==============================================================\n');
  console.log(relatorioTexto);
}

executarAuditoria().catch((err) => {
  console.error('\n❌ Ocorreu um erro ao executar a auditoria:', err.message || err);
  process.exit(1);
});
