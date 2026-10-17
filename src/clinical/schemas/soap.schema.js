/**
 * @fileoverview Schemas de validação clínica (SOAP) para o motor Rotina (Gemini 4 Argon).
 * Define o contrato de entrada para o Fastify (Ajv) e o contrato de saída estruturada
 * para a API do Google Vertex AI (responseSchema).
 * 
 * @module clinical/schemas/soap.schema
 * @author Lead Software Architect - Projeto Rotina
 */

'use strict';

/**
 * Schema de validação do payload de entrada para geração de evolução SOAP.
 * Utilizado pelo Fastify para validar o corpo da requisição HTTP (POST).
 * 
 * @type {Object}
 */
const SoapInputSchema = {
  type: 'object',
  required: ['brain_dump'],
  additionalProperties: true,
  properties: {
    brain_dump: {
      type: 'string',
      minLength: 3,
      description: 'Relato livre, anotações rápidas ou transcrição da consulta médica.'
    },
    patient_context: {
      type: 'object',
      additionalProperties: true,
      description: 'Contexto demográfico e basal do paciente.',
      properties: {
        idade: {
          type: 'number',
          minimum: 0,
          maximum: 150,
          description: 'Idade do paciente em anos.'
        },
        sexo: {
          type: 'string',
          enum: ['M', 'F', 'I'],
          description: 'Sexo biológico ou administrativo (Masculino, Feminino, Indeterminado).'
        },
        gestante: {
          type: 'boolean',
          default: false,
          description: 'Indicador de gestação atual.'
        },
        alergias: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: [],
          description: 'Lista de alergias medicamentosas ou alimentares conhecidas.'
        }
      }
    },
    vitals: {
      type: 'object',
      additionalProperties: true,
      description: 'Sinais vitais e dados antropométricos coletados na triagem ou consulta.',
      properties: {
        pas: {
          type: 'number',
          minimum: 20,
          maximum: 350,
          description: 'Pressão Arterial Sistólica (mmHg).'
        },
        pad: {
          type: 'number',
          minimum: 10,
          maximum: 250,
          description: 'Pressão Arterial Diastólica (mmHg).'
        },
        fc: {
          type: 'number',
          minimum: 10,
          maximum: 300,
          description: 'Frequência Cardíaca (bpm).'
        },
        fr: {
          type: 'number',
          minimum: 0,
          maximum: 120,
          description: 'Frequência Respiratória (irpm).'
        },
        tax: {
          type: 'number',
          minimum: 25.0,
          maximum: 45.0,
          description: 'Temperatura Axilar (°C).'
        },
        spo2: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Saturação Periférica de Oxigênio (%).'
        },
        hgt: {
          type: 'number',
          minimum: 0,
          maximum: 1500,
          description: 'Hemoglicoteste / Glicemia Capilar (mg/dL).'
        },
        peso: {
          type: 'number',
          minimum: 0.1,
          maximum: 500.0,
          description: 'Peso corporal (kg).'
        },
        altura: {
          type: 'number',
          minimum: 10,
          maximum: 300,
          description: 'Estatura (cm ou m, normalizado pelo core).'
        },
        glasgow: {
          type: 'integer',
          minimum: 3,
          maximum: 15,
          description: 'Escala de Coma de Glasgow (3 a 15).'
        }
      }
    },
    // Compatibilidade resiliente com payloads planos enviados por formulários legados ou clientes simplificados
    idade: { type: ['number', 'string'] },
    sexo: { type: 'string' },
    gestante: { type: ['boolean', 'string', 'number'] },
    alergias: { type: ['array', 'string'] },
    sinais_vitais: { type: 'object', additionalProperties: true },
    pas: { type: ['number', 'string'] },
    pad: { type: ['number', 'string'] },
    fc: { type: ['number', 'string'] },
    fr: { type: ['number', 'string'] },
    tax: { type: ['number', 'string'] },
    spo2: { type: ['number', 'string'] },
    hgt: { type: ['number', 'string'] },
    peso: { type: ['number', 'string'] },
    altura: { type: ['number', 'string'] },
    glasgow: { type: ['number', 'string'] },
    model_override: { type: 'string' },
    options: { type: 'object', additionalProperties: true }
  }
};

/**
 * Schema de saída estruturada (Structured Outputs) compatível com Google Vertex AI (OpenAPI 3.0 / JSON Schema Draft-07).
 * Garante determinismo na geração do prontuário SOAP pelo modelo Gemini.
 * 
 * @type {Object}
 */
const VertexSoapOutputSchema = {
  type: 'object',
  required: [
    'subjetivo_formatado',
    'objetivo_formatado',
    'avaliacao',
    'plano',
    'referencias_bibliograficas'
  ],
  properties: {
    subjetivo_formatado: {
      type: 'object',
      description: 'Bloco Subjetivo (S) estruturado com termos técnicos médicos.',
      required: [
        'qp',
        'hda',
        'hpp_medicacoes',
        'alergias',
        'texto_unificado'
      ],
      properties: {
        qp: {
          type: 'string',
          description: 'Queixa Principal (QP) concisa.'
        },
        hda: {
          type: 'string',
          description: 'História da Doença Atual (HDA) detalhada, cronológica e tecnicamente redigida.'
        },
        hpp_medicacoes: {
          type: 'string',
          description: 'História Patológica Pregressa (HPP), comorbidades e medicações de uso contínuo.'
        },
        alergias: {
          type: 'string',
          description: 'Registro formal de alergias ou negação explícita (ex: "Nega alergias medicamentosas conhecidas").'
        },
        texto_unificado: {
          type: 'string',
          description: 'Parágrafo único consolidando todo o bloco Subjetivo, pronto para cópia em prontuário eletrônico.'
        }
      }
    },
    objetivo_formatado: {
      type: 'object',
      description: 'Bloco Objetivo (O) contendo exame físico, sinais vitais e escores clínicos.',
      required: [
        'sinais_vitais_formatados',
        'exame_fisico_sistemas',
        'escores_calculados',
        'texto_unificado'
      ],
      properties: {
        sinais_vitais_formatados: {
          type: 'string',
          description: 'Sinais vitais formatados em linha padrão (ex: "PA: 120x80 mmHg | FC: 80 bpm...").'
        },
        exame_fisico_sistemas: {
          type: 'string',
          description: 'Descrição do exame físico segmentado por aparelhos/sistemas (Geral, ACV, AR, Abdome, Neurológico, etc.).'
        },
        escores_calculados: {
          type: 'string',
          description: 'Escores clínicos aplicáveis calculados ou inferidos (ex: IMC, CURB-65, CHA2DS2-VASc, Wells, qSOFA).'
        },
        texto_unificado: {
          type: 'string',
          description: 'Texto consolidado de todo o bloco Objetivo para cópia rápida.'
        }
      }
    },
    avaliacao: {
      type: 'object',
      description: 'Bloco de Avaliação (A) com raciocínio clínico, diagnósticos e sinais de alarme.',
      required: [
        'hipoteses_diagnosticas',
        'red_flags',
        'raciocinio_clinico'
      ],
      properties: {
        hipoteses_diagnosticas: {
          type: 'array',
          description: 'Lista ordenada de hipóteses diagnósticas codificadas na CID-10.',
          items: {
            type: 'object',
            required: [
              'cid10',
              'descricao',
              'probabilidade',
              'justificativa'
            ],
            properties: {
              cid10: {
                type: 'string',
                description: 'Código CID-10 oficial (ex: "J01.9", "I10").'
              },
              descricao: {
                type: 'string',
                description: 'Nomenclatura oficial ou clínica da patologia.'
              },
              probabilidade: {
                type: 'string',
                enum: ['ALTA', 'MODERADA', 'DIAGNOSTICO_DIFERENCIAL'],
                description: 'Grau de certeza clínica da hipótese.'
              },
              justificativa: {
                type: 'string',
                description: 'Correlação fisiopatológica e clínica que sustenta a hipótese com base na anamnese e exame físico.'
              }
            }
          }
        },
        red_flags: {
          type: 'array',
          description: 'Sinais de alarme (Red Flags) pesquisados, presentes ou que exigem atenção imediata.',
          items: {
            type: 'string'
          }
        },
        raciocinio_clinico: {
          type: 'string',
          description: 'Síntese analítica do caso (impressão diagnóstica global, gravidade e justificativa de conduta).'
        }
      }
    },
    plano: {
      type: 'object',
      description: 'Bloco de Plano Terapêutico e Propedêutico (P).',
      required: [
        'prescricao',
        'exames_solicitados',
        'orientacoes_paciente',
        'criterios_retorno_encaminhamento'
      ],
      properties: {
        prescricao: {
          type: 'array',
          description: 'Lista estruturada de medicamentos prescritos (DCB/Denominação Comum Brasileira).',
          items: {
            type: 'object',
            required: [
              'via',
              'medicamento',
              'concentracao',
              'posologia',
              'duracao',
              'quantidade_dispensacao',
              'orientacao_uso'
            ],
            properties: {
              via: {
                type: 'string',
                description: 'Via de administração (ex: "Uso Oral", "Uso Tópico", "Uso Intramuscular", "Uso Endovenoso").'
              },
              medicamento: {
                type: 'string',
                description: 'Nome genérico (DCB) do princípio ativo.'
              },
              concentracao: {
                type: 'string',
                description: 'Concentração e forma farmacêutica (ex: "500mg comprimido", "50mg/mL solução injetável").'
              },
              posologia: {
                type: 'string',
                description: 'Instrução clara de tomada e intervalo (ex: "Tomar 1 comprimido de 8 em 8 horas").'
              },
              duracao: {
                type: 'string',
                description: 'Tempo total de tratamento (ex: "por 7 dias", "uso contínuo", "se dor ou febre").'
              },
              quantidade_dispensacao: {
                type: 'string',
                description: 'Total de unidades/frascos/caixas para dispensação farmacêutica (ex: "1 caixa", "21 comprimidos").'
              },
              orientacao_uso: {
                type: 'string',
                description: 'Recomendações específicas de administração (ex: "Tomar após as refeições", "Pode causar sonolência").'
              }
            }
          }
        },
        exames_solicitados: {
          type: 'array',
          description: 'Exames laboratoriais, de imagem ou complementares solicitados.',
          items: {
            type: 'string'
          }
        },
        orientacoes_paciente: {
          type: 'array',
          description: 'Medidas não farmacológicas, repouso, hidratação e orientações gerais ao paciente.',
          items: {
            type: 'string'
          }
        },
        criterios_retorno_encaminhamento: {
          type: 'string',
          description: 'Prazos de reavaliação, sinais de alerta para retorno imediato ao pronto-socorro e encaminhamentos a especialistas.'
        }
      }
    },
    referencias_bibliograficas: {
      type: 'array',
      description: 'Diretrizes médicas e protocolos oficiais que embasam a conduta (Medicina Baseada em Evidências).',
      items: {
        type: 'object',
        required: [
          'orgao',
          'diretriz',
          'ano'
        ],
        properties: {
          orgao: {
            type: 'string',
            description: 'Sociedade médica ou instituição (ex: "Ministério da Saúde", "SBC", "SBPT", "IDSA", "GINA").'
          },
          diretriz: {
            type: 'string',
            description: 'Título oficial do protocolo, PCDT ou guideline utilizado.'
          },
          ano: {
            type: 'string',
            description: 'Ano de publicação ou última atualização da diretriz.'
          }
        }
      }
    }
  }
};

module.exports = {
  SoapInputSchema,
  VertexSoapOutputSchema
};