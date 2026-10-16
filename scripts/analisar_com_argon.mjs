import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isVertex = args.includes('--vertex') || args.includes('--cloud') || process.env.USE_VERTEX === 'true';
const targetArgs = args.filter(a => !a.startsWith('--') && !a.startsWith('-'));
const alvo = isHelp ? 'help' : (targetArgs[0] ? targetArgs[0].toLowerCase() : 'velocidade');

const project = process.env.GCP_PROJECT_ID || 'gen-lang-client-0798056953';
const location = process.env.GCP_LOCATION || 'us-central1';
const apiKey = process.env.GEMINI_API_KEY;

let ai;
let modelName;
let backendLabel;

if (isVertex) {
  modelName = process.env.VERTEX_MODEL || 'gemini-2.5-pro';
  backendLabel = `Google Cloud Vertex AI (${modelName}) [Consumindo Créditos GCP]`;
  ai = new GoogleGenAI({
    vertexai: true,
    project,
    location
  });
} else {
  modelName = process.env.GEMINI_MODEL || 'gemini-4-argon';
  backendLabel = `Google AI Studio (${modelName}) [API Key]`;
  if (!apiKey) {
    console.error('❌ ERRO: GEMINI_API_KEY não encontrada no arquivo .env');
    process.exit(1);
  }
  ai = new GoogleGenAI({ apiKey });
}

const MODULOS = {
  velocidade: {
    nome: 'Velocidade e Roteador do Bot (Latência < 30ms)',
    arquivos: [
      'src/07a_telegram_router.js',
      'src/07f_telegram_calculadoras_parser.js',
      'server/index.js'
    ],
    foco: `
Você é um Especialista em Performance Extrema Node.js e Telegram Bot API.
Analise os arquivos anexados e identifique:
1. Onde ocorrem avaliações sequenciais desnecessárias de Regex e gargalos de CPU no roteamento de mensagens.
2. Como transformar o roteamento atual em despacho O(1) por Hash Map sem quebrar comandos existentes.
3. Como flexibilizar o parser para o médico digitar livremente no plantão (ex: "nora 70kg 15ml/h", "k 6.8", "crcl 65a 1.4 f 70kg") e o bot entender de primeira.
4. Forneça o código cirúrgico da nova arquitetura de roteamento O(1).
`
  },
  condutas: {
    nome: 'Confiabilidade Médica e Condutas do Dia a Dia (5 Tempos)',
    arquivos: [
      'src/02_pneumologia_pac.js',
      'src/02_emergencia_crise_hipertensiva.js',
      'src/02_emergencia_choque_septico_circi.js',
      'src/02_nefrologia_dhe.js'
    ],
    foco: `
Você é um Preceptor Chefe de Pronto-Socorro e Emergência Médica (R1-USP / HCFMUSP).
Analise os arquivos anexados e identifique:
1. Erros de conduta, doses ou orientações desatualizadas frente aos consensos brasileiros atuais (SBC, SBPT, SBD, AMIB, FEBRASGO, MS).
2. Como padronizar todas as respostas de conduta na "Estrutura em 5 Tempos":
   - ⚡ 1. Conduta Imediata (minuto 0 ao 5)
   - 📋 2. Exames Indispensáveis
   - 💊 3. Prescrição Pronta (Drogas, doses, diluição ISMP, via e frequência)
   - 🏥 4. Critérios de Decisão (Internar / UTI vs Alta Segura)
   - ⚠️ 5. Sinais de Alarme & Armadilhas ("O que NÃO fazer")
3. Casos de borda graves: ajuste de antibióticos por TFG renal, alergias cruzadas e teratógenos na gestação.
4. Forneça a especificação ou código de implementação das condutas que faltam.
`
  },
  funcoes: {
    nome: 'Novas Funções Beira-Leito (Voz STT, SRI 1 Toque, Leitos SBAR)',
    arquivos: [
      'src/07d_telegram_callbacks.js',
      'src/07e_telegram_midia_e_leitos.js',
      'src/09_enfermaria.js',
      'src/10_pdf_receita.js'
    ],
    foco: `
Você é um Engenheiro de Produto e Médico Assistente.
Analise os arquivos anexados e desenhe:
1. Pipeline de entrada por voz: como receber áudio de voz do Telegram, transcrever via Google Cloud Speech-to-Text v2 em pt-BR e alimentar os parsers de conduta e gasometria.
2. Calculadora de SRI (Sequência Rápida de Intubação) em 1 toque com botões inline de peso (50kg a 100kg) no Telegram.
3. Gestão e passagem de plantão de leitos SBAR (/leitos, /passagem) com exportação rápida para texto/PDF.
4. Forneça o código dos novos handlers e callbacks prontos para produção.
`
  }
};

async function executarAnalise(alvo) {
  const moduloEscolhido = MODULOS[alvo] || MODULOS.velocidade;
  console.log(`\n==============================================================`);
  console.log(`🔬 ANÁLISE DE CÓDIGO: ${moduloEscolhido.nome}`);
  console.log(`🌐 Backend: ${backendLabel}`);
  console.log(`==============================================================\n`);

  let dossie = '';
  for (const relPath of moduloEscolhido.arquivos) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Arquivo não encontrado: ${relPath}`);
      continue;
    }
    const conteudo = fs.readFileSync(fullPath, 'utf8');
    console.log(`📄 Carregado: ${relPath} (${conteudo.length} chars)`);
    dossie += `\n\n--- INÍCIO: ${relPath} ---\n${conteudo}\n--- FIM: ${relPath} ---\n`;
  }

  const promptFinal = `
${moduloEscolhido.foco}

REGRAS:
- Responda em Português do Brasil.
- Seja técnico, objetivo e prático.
- Não faça divagações teóricas; apresente diagnósticos de código e propostas acionáveis.
- Forneça blocos de código prontos para copiar e colar quando sugerir refatorações.

CÓDIGO-FONTE PARA ANÁLISE:
${dossie}
`;

  console.log(`\n🚀 Enviando solicitação para o ${modelName}... Aguarde alguns segundos...`);
  const inicio = Date.now();

  try {
    const resposta = await ai.models.generateContent({
      model: modelName,
      contents: promptFinal,
      config: {
        temperature: 0.2
      }
    });

    const tempoMs = Date.now() - inicio;
    console.log(`✅ Análise concluída em ${(tempoMs / 1000).toFixed(2)}s!\n`);

    const pastaAuditorias = path.join(ROOT_DIR, 'auditorias');
    if (!fs.existsSync(pastaAuditorias)) fs.mkdirSync(pastaAuditorias, { recursive: true });

    const nomeArquivo = path.join(pastaAuditorias, `analise_argon_${alvo || 'velocidade'}_${new Date().toISOString().slice(0, 10)}.md`);
    fs.writeFileSync(nomeArquivo, resposta.text, 'utf8');

    console.log(`📁 Relatório de sugestões e correções salvo em:`);
    console.log(`   ${nomeArquivo}\n`);

    console.log('--- PRÉVIA DA ANÁLISE ---');
    console.log(resposta.text.slice(0, 800) + '...\n-------------------------\n');
  } catch (err) {
    console.error('❌ Erro na chamada com o Argon:', err.message);
  }
}

if (!MODULOS[alvo]) {
  console.log(`Módulos disponíveis para análise:`);
  Object.keys(MODULOS).forEach(k => console.log(` - ${k}: ${MODULOS[k].nome}`));
  console.log(`\nUso: node scripts/analisar_com_argon.mjs [velocidade|condutas|funcoes] [--vertex]`);
  console.log(`  --vertex : Executa via Google Cloud Vertex AI (consome créditos GCP R$ 1.700)`);
  process.exit(0);
}

executarAnalise(alvo);
