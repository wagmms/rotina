/**
 * CLI interno para geração síncrona de PDF via subprocesso isolado.
 * Recebe JSON via stdin e emite os bytes binários do PDF no stdout.
 * Layout 100% monocromático em preto puro (#000000).
 */
const PDFDocument = require('pdfkit');
const { spawnSync } = require('child_process');
const path = require('path');

function decodificarTexto(valor) {
  if (!valor) return '';
  return String(valor)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function limparSeGenerico(valor, genericos = []) {
  const limpo = decodificarTexto(valor);
  if (!limpo) return '';
  const upper = limpo.toUpperCase();
  for (const g of genericos) {
    if (upper === g.toUpperCase()) return '';
  }
  return limpo;
}

function gerarReceitaPDFBuffer(dados = {}) {
  return new Promise((resolve, reject) => {
    try {
      const payload = Object.assign({}, dados, {
        nomePaciente: dados.nomePaciente || dados.paciente || 'Ao Portador',
        instituicao: dados.instituicao || dados.unidadeSaude || dados.nomeUnidade || '',
        cidade: dados.cidade || dados.cidadeUf || dados.municipio || ''
      });
      const res = spawnSync(process.execPath, [path.resolve(__filename)], {
        input: JSON.stringify(payload),
        maxBuffer: 15 * 1024 * 1024
      });
      if (res.error) return reject(res.error);
      if (res.status !== 0) {
        return reject(new Error(res.stderr ? res.stderr.toString('utf8') : 'Erro ao gerar PDF'));
      }
      resolve(Buffer.from(res.stdout));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { gerarReceitaPDFBuffer };

if (require.main === module) {
  let inputJson = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    inputJson += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const dados = JSON.parse(inputJson || '{}');

      const nomePaciente = decodificarTexto(dados.nomePaciente) || 'Ao Portador';
      const dataFormatada = decodificarTexto(dados.dataFormatada) || new Date().toLocaleDateString('pt-BR');

    const tipoReceitaUpper = String(dados.tipoReceita || '').toUpperCase().trim();
    const ehControleEspecial =
      dados.controleEspecial === true ||
      tipoReceitaUpper === 'CONTROLE_ESPECIAL' ||
      tipoReceitaUpper === 'ESPECIAL';

    const papelUpper = String(dados.papel || dados.perfil || '').toUpperCase().trim();
    const ehInterno =
      dados.ehInterno === true ||
      papelUpper === 'INTERNO_ACADEMICO' ||
      papelUpper === 'INTERNO' ||
      papelUpper === 'ACADEMICO';

    const instituicao = limparSeGenerico(
      dados.instituicao || dados.nomeUnidade || dados.unidade || '',
      ['Serviço de Saúde — Unidade de Atendimento', 'Serviço de Saúde', 'Unidade de Atendimento']
    );

    const enderecoUnidade = limparSeGenerico(
      dados.enderecoUnidade || dados.subtituloUnidade || '',
      ['Endereço / Município - UF']
    );

    const cidade = limparSeGenerico(
      dados.cidade || dados.municipio || '',
      ['Cidade - UF', 'Município - UF']
    );

    const medicoNome = limparSeGenerico(
      dados.medicoNome || dados.nomeMedico || dados.nomeCarimbo || '',
      ['Médico(a) Prescritor(a)', 'Médico Prescritor', 'Nome do Médico']
    );

    const medicoCrm = limparSeGenerico(
      dados.medicoCrm || dados.crm || dados.crmCarimbo || '',
      ['CRM-UF 000000', 'CRM 000000', 'CRM-UF']
    );

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `${ehControleEspecial ? 'Receituário de Controle Especial' : 'Receituário Médico'} - ${nomePaciente}`,
        Author: instituicao || 'Prescrição Médica',
        Subject: 'Prescrição Médica'
      }
    });

    doc.pipe(process.stdout);

    const BLACK = '#000000';
    const leftMargin = 50;
    const rightMargin = doc.page.width - 50;
    const contentWidth = rightMargin - leftMargin;

    doc.fillColor(BLACK).strokeColor(BLACK);

    // 1. Cabeçalho Institucional e Título
    if (instituicao) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(BLACK)
        .text(instituicao.toUpperCase(), leftMargin, doc.y, {
          width: contentWidth,
          align: 'center'
        });

      if (enderecoUnidade) {
        doc.moveDown(0.15);
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(BLACK)
          .text(enderecoUnidade, leftMargin, doc.y, {
            width: contentWidth,
            align: 'center'
          });
      }
      doc.moveDown(0.5);
    }

    const tituloReceita = ehControleEspecial
      ? 'RECEITUÁRIO DE CONTROLE ESPECIAL'
      : 'RECEITUÁRIO MÉDICO';

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(BLACK)
      .text(tituloReceita, leftMargin, doc.y, {
        width: contentWidth,
        align: 'center',
        characterSpacing: 1.2
      });

    if (ehControleEspecial) {
      doc.moveDown(0.25);
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(BLACK)
        .text('1ª VIA - RETENÇÃO DA FARMÁCIA   |   2ª VIA - ORIENTAÇÃO AO PACIENTE', leftMargin, doc.y, {
          width: contentWidth,
          align: 'center',
          characterSpacing: 0.4
        });
    }

    doc.moveDown(0.7);

    // Filete superior preto puro
    doc
      .strokeColor(BLACK)
      .lineWidth(1)
      .moveTo(leftMargin, doc.y)
      .lineTo(rightMargin, doc.y)
      .stroke();

    doc.moveDown(0.6);

    // 2. Identificação do Paciente e Data
    const yMeta = doc.y;
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(BLACK)
      .text('Paciente: ', leftMargin, yMeta, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(BLACK)
      .text(nomePaciente, { width: contentWidth - 145 });

    const afterPacienteY = doc.y;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(BLACK)
      .text('Data: ', rightMargin - 140, yMeta, { width: 140, align: 'right', continued: true })
      .font('Helvetica-Bold')
      .fillColor(BLACK)
      .text(dataFormatada);

    doc.y = Math.max(afterPacienteY, doc.y);

    if (dados.enderecoPaciente) {
      doc.moveDown(0.25);
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(BLACK)
        .text('Endereço: ', leftMargin, doc.y, { continued: true })
        .font('Helvetica')
        .text(decodificarTexto(dados.enderecoPaciente), { width: contentWidth });
    }

    doc.moveDown(0.6);

    // Filete inferior do bloco de identificação
    doc
      .strokeColor(BLACK)
      .lineWidth(0.6)
      .moveTo(leftMargin, doc.y)
      .lineTo(rightMargin, doc.y)
      .stroke();

    doc.moveDown(1.0);

    // 3. Prescrição agrupada por Via de Administração
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    const viasMap = {};
    itens.forEach(item => {
      const v = decodificarTexto(item.via || 'USO INTERNO').toUpperCase();
      if (!viasMap[v]) viasMap[v] = [];
      viasMap[v].push(item);
    });

    let numItem = 1;

    for (const [nomeVia, itensVia] of Object.entries(viasMap)) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(BLACK)
        .text(nomeVia, leftMargin, doc.y, { underline: true });

      doc.moveDown(0.45);

      itensVia.forEach(item => {
        const yItem = doc.y;
        const nomeMed = decodificarTexto(item.nome) || 'Medicamento';
        const qtdMed = decodificarTexto(item.quantidade);
        const textoNome = `${numItem}. ${nomeMed}`;

        const maxNameWidth = qtdMed ? contentWidth - 145 : contentWidth - 10;

        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor(BLACK)
          .text(textoNome, leftMargin, yItem, { width: maxNameWidth });

        const afterNameY = doc.y;

        if (qtdMed) {
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(BLACK)
            .text(qtdMed, rightMargin - 135, yItem, { width: 135, align: 'right' });

          // Linha pontilhada elegante ligando nome à quantidade quando cabe em 1 linha
          const nameWidth = doc.font('Helvetica-Bold').fontSize(10.5).widthOfString(textoNome);
          const qtdWidth = doc.font('Helvetica-Bold').fontSize(10).widthOfString(qtdMed);
          const startDotsX = leftMargin + nameWidth + 8;
          const endDotsX = rightMargin - qtdWidth - 8;

          if (afterNameY - yItem <= 16 && endDotsX - startDotsX > 20) {
            const dotsY = yItem + 8.5;
            doc
              .save()
              .strokeColor(BLACK)
              .lineWidth(0.6)
              .dash(1, { space: 3 })
              .moveTo(startDotsX, dotsY)
              .lineTo(endDotsX, dotsY)
              .stroke()
              .undash()
              .restore();
          }
        }

        doc.y = Math.max(afterNameY, doc.y);
        doc.moveDown(0.2);

        if (item.posologia) {
          const posoLimpa = decodificarTexto(item.posologia);
          doc
            .font('Helvetica')
            .fontSize(9.5)
            .fillColor(BLACK)
            .text(posoLimpa, leftMargin + 18, doc.y, {
              width: contentWidth - 18,
              lineGap: 2
            });
        }

        doc.moveDown(0.75);
        numItem++;
      });

      doc.moveDown(0.35);
    }

    // 4. Orientações ao Paciente
    const orientacoes = Array.isArray(dados.orientacoes)
      ? dados.orientacoes.map(decodificarTexto).filter(Boolean)
      : [];

    if (orientacoes.length > 0) {
      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(BLACK)
        .text('ORIENTAÇÕES AO PACIENTE', leftMargin, doc.y, { underline: true });

      doc.moveDown(0.35);

      orientacoes.forEach(ori => {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(BLACK)
          .text(`•  ${ori}`, leftMargin + 6, doc.y, {
            width: contentWidth - 6,
            lineGap: 1.5
          });
        doc.moveDown(0.2);
      });
    }

    // 5. Local e Data (se cidade estiver configurada)
    if (cidade) {
      doc.moveDown(0.6);
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(BLACK)
        .text(`${cidade}, ${dataFormatada}.`, leftMargin, doc.y, {
          width: contentWidth,
          align: 'right'
        });
    }

    // 6. Cálculo de coordenadas do Rodapé, Assinatura e Quadros de Controle Especial
    const boxHeight = 112;
    const footerBoxTopY = doc.page.height - 40 - boxHeight;

    const minSignatureY = ehControleEspecial
      ? footerBoxTopY - 48
      : doc.page.height - 95;

    // Se o conteúdo ultrapassar o espaço reservado para assinatura/rodapé, cria nova página
    if (doc.y + 45 > minSignatureY) {
      doc.addPage();
      doc.fillColor(BLACK).strokeColor(BLACK);
    }

    const signatureLineY = Math.max(doc.y + 40, minSignatureY);
    const sigLineStartX = leftMargin + contentWidth * 0.22;
    const sigLineEndX = rightMargin - contentWidth * 0.22;

    // Linha física de assinatura em preto puro (#000000)
    doc
      .strokeColor(BLACK)
      .lineWidth(0.8)
      .moveTo(sigLineStartX, signatureLineY)
      .lineTo(sigLineEndX, signatureLineY)
      .stroke();

    // Regra Estrita: Interno Acadêmico NÃO imprime nome nem CRM abaixo da linha
    if (!ehInterno) {
      let currentSigTextY = signatureLineY + 6;

      if (medicoNome || medicoCrm) {
        if (medicoNome) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(BLACK)
            .text(medicoNome, leftMargin, currentSigTextY, {
              width: contentWidth,
              align: 'center'
            });
          currentSigTextY = doc.y + 1;
        }
        if (medicoCrm) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(BLACK)
            .text(medicoCrm, leftMargin, currentSigTextY, {
              width: contentWidth,
              align: 'center'
            });
        }
      } else {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(BLACK)
          .text('Assinatura e Carimbo Médico (CRM)', leftMargin, currentSigTextY, {
            width: contentWidth,
            align: 'center'
          });
      }
    }

    // 7. Quadros Inferiores Obrigatórios para Receituário de Controle Especial
    if (ehControleEspecial) {
      const gap = 12;
      const boxWidth = (contentWidth - gap) / 2;
      const leftBoxX = leftMargin;
      const rightBoxX = leftMargin + boxWidth + gap;
      const topY = footerBoxTopY;

      // Quadro Esquerdo: IDENTIFICAÇÃO DO COMPRADOR
      doc
        .strokeColor(BLACK)
        .lineWidth(0.8)
        .rect(leftBoxX, topY, boxWidth, boxHeight)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(BLACK)
        .text('IDENTIFICAÇÃO DO COMPRADOR', leftBoxX, topY + 5, {
          width: boxWidth,
          align: 'center'
        });

      doc
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .moveTo(leftBoxX, topY + 16)
        .lineTo(leftBoxX + boxWidth, topY + 16)
        .stroke();

      const innerLeftX = leftBoxX + 6;
      const innerWidth = boxWidth - 12;

      doc.font('Helvetica').fontSize(7.5).fillColor(BLACK);
      doc.text('Nome: _____________________________________________', innerLeftX, topY + 22, { width: innerWidth, lineBreak: false });
      doc.text('___________________________________________________', innerLeftX, topY + 35, { width: innerWidth, lineBreak: false });
      doc.text('Ident.: ______________________  Órg. Emissor: __________', innerLeftX, topY + 49, { width: innerWidth, lineBreak: false });
      doc.text('End.: ______________________________________________', innerLeftX, topY + 63, { width: innerWidth, lineBreak: false });
      doc.text('Cidade: ___________________________  UF: ____________', innerLeftX, topY + 77, { width: innerWidth, lineBreak: false });
      doc.text('Telefone: (____) _____________________________________', innerLeftX, topY + 91, { width: innerWidth, lineBreak: false });

      // Quadro Direito: IDENTIFICAÇÃO DO FORNECEDOR
      doc
        .strokeColor(BLACK)
        .lineWidth(0.8)
        .rect(rightBoxX, topY, boxWidth, boxHeight)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(BLACK)
        .text('IDENTIFICAÇÃO DO FORNECEDOR', rightBoxX, topY + 5, {
          width: boxWidth,
          align: 'center'
        });

      doc
        .strokeColor(BLACK)
        .lineWidth(0.5)
        .moveTo(rightBoxX, topY + 16)
        .lineTo(rightBoxX + boxWidth, topY + 16)
        .stroke();

      const pharmLineY = topY + 68;
      doc
        .strokeColor(BLACK)
        .lineWidth(0.6)
        .moveTo(rightBoxX + 20, pharmLineY)
        .lineTo(rightBoxX + boxWidth - 20, pharmLineY)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(BLACK)
        .text('Assinatura do Farmacêutico', rightBoxX, pharmLineY + 4, {
          width: boxWidth,
          align: 'center'
        });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(BLACK)
        .text('Data: _____ / _____ / __________', rightBoxX, topY + 92, {
          width: boxWidth,
          align: 'center'
        });
    }

    doc.end();
  } catch (e) {
    process.stderr.write(e.message || String(e));
    process.exit(1);
  }
  });
}
