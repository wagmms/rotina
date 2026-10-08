/**
 * CLI interno para geração síncrona de PDF via subprocesso isolado.
 * Recebe JSON via stdin e emite os bytes binários do PDF no stdout.
 */
const PDFDocument = require('pdfkit');

let inputJson = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  inputJson += chunk;
});

process.stdin.on('end', () => {
  try {
    const dados = JSON.parse(inputJson || '{}');
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `Receituário Médico - ${dados.nomePaciente || 'Paciente'}`,
        Author: 'Ultra Rotina Assistente Clínico',
        Subject: 'Prescrição Médica'
      }
    });

    doc.pipe(process.stdout);

    const leftMargin = 50;
    const rightMargin = doc.page.width - 50;
    const contentWidth = rightMargin - leftMargin;

    // 1. Cabeçalho Oficial
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#1a365d')
      .text('RECEITUÁRIO MÉDICO', { align: 'center', characterSpacing: 1.5 });

    doc.moveDown(0.3);

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor('#c53030')
      .text('DOCUMENTO EM CARÁTER DE RASCUNHO · CONFERÊNCIA MÉDICA OBRIGATÓRIA', { align: 'center', characterSpacing: 0.5 });

    doc.moveDown(0.8);

    // Linha separadora do cabeçalho
    doc
      .strokeColor('#cbd5e0')
      .lineWidth(1)
      .moveTo(leftMargin, doc.y)
      .lineTo(rightMargin, doc.y)
      .stroke();

    doc.moveDown(0.8);

    // 2. Metadados: Paciente e Data
    const yMeta = doc.y;
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#4a5568')
      .text('Paciente: ', leftMargin, yMeta, { continued: true })
      .font('Helvetica-Bold')
      .fillColor('#1a202c')
      .text(dados.nomePaciente || 'Ao Portador');

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#4a5568')
      .text('Data: ', rightMargin - 150, yMeta, { width: 150, align: 'right', continued: true })
      .font('Helvetica-Bold')
      .fillColor('#1a202c')
      .text(dados.dataFormatada || new Date().toLocaleDateString('pt-BR'));

    doc.moveDown(1.2);

    // Linha separadora do paciente
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .moveTo(leftMargin, doc.y)
      .lineTo(rightMargin, doc.y)
      .stroke();

    doc.moveDown(1.2);

    // 3. Medicamentos agrupados por via
    const itens = Array.isArray(dados.itens) ? dados.itens : [];
    const viasMap = {};
    itens.forEach(item => {
      const v = (item.via || 'USO NÃO ESPECIFICADO').toUpperCase();
      if (!viasMap[v]) viasMap[v] = [];
      viasMap[v].push(item);
    });

    let numItem = 1;

    for (const [nomeVia, itensVia] of Object.entries(viasMap)) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor('#2b6cb0')
        .text(nomeVia);

      doc.moveDown(0.3);

      itensVia.forEach(item => {
        const yItem = doc.y;
        const textoNome = `${numItem}. ${item.nome || 'Medicamento'}`;

        doc
          .font('Helvetica-Bold')
          .fontSize(10.5)
          .fillColor('#1a202c')
          .text(textoNome, leftMargin + 10, yItem, { width: contentWidth - 120 });

        if (item.quantidade) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor('#2d3748')
            .text(item.quantidade, rightMargin - 140, yItem, { width: 140, align: 'right' });
        }

        doc.moveDown(0.2);

        if (item.posologia) {
          const posoLimpa = String(item.posologia)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          doc
            .font('Helvetica')
            .fontSize(9.5)
            .fillColor('#4a5568')
            .text(posoLimpa, leftMargin + 25, doc.y, {
              width: contentWidth - 35,
              lineGap: 2
            });
        }

        doc.moveDown(0.8);
        numItem++;
      });

      doc.moveDown(0.5);
    }

    // 4. Orientações ao Paciente
    const orientacoes = Array.isArray(dados.orientacoes) ? dados.orientacoes : [];
    if (orientacoes.length > 0) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#2d3748')
        .text('ORIENTAÇÕES AO PACIENTE');

      doc.moveDown(0.3);

      orientacoes.forEach(ori => {
        const oriLimpa = String(ori)
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#4a5568')
          .text(`•  ${oriLimpa}`, leftMargin + 10, doc.y, {
            width: contentWidth - 15,
            lineGap: 2
          });
        doc.moveDown(0.2);
      });
    }

    // 5. Linha de Assinatura e Carimbo
    const bottomY = Math.max(doc.y + 40, doc.page.height - 110);
    doc
      .strokeColor('#718096')
      .lineWidth(0.8)
      .moveTo(leftMargin + (contentWidth / 4), bottomY)
      .lineTo(rightMargin - (contentWidth / 4), bottomY)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text('Assinatura do(a) Médico(a) / CRM', leftMargin, bottomY + 6, {
        width: contentWidth,
        align: 'center'
      });

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#a0aec0')
      .text('Ultra Rotina · Suporte à Decisão Clínica · FMRP-USP', leftMargin, doc.page.height - 25, {
        width: contentWidth,
        align: 'center'
      });

    doc.end();
  } catch (e) {
    process.stderr.write(e.message || String(e));
    process.exit(1);
  }
});
