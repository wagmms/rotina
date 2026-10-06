/**
 * ==============================================================================
 * MÓDULO 10: GERADOR DE RECEITUÁRIO A4 EM PDF (Google Drive & Telegram)
 * ==============================================================================
 * Converte prescrições em PDF oficial A4 pronto para impressão com carimbo/assinatura,
 * salva em pasta dedicada no Google Drive e envia o arquivo via Telegram.
 * ==============================================================================
 */

var ReceitaPdfService = (function() {
  var NOME_PASTA_DRIVE = "Receitas Médicas - Ultra Rotina";

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function extrairNomePaciente(textoPrescricao) {
    var str = textoPrescricao || "";
    var m = str.match(/paciente\s*[:=]?\s*([^\n,\(\)]+)/i);
    if (m && m[1]) {
      var limpo = m[1].replace(/[*_#]/g, "").trim();
      if (limpo && limpo.toLowerCase() !== "não informado" && limpo.toLowerCase() !== "nao informado") {
        return escHtml(limpo);
      }
    }
    return "Ao Portador";
  }

  /**
   * Parser inteligente que extrai EXCLUSIVAMENTE os medicamentos, quantidades e modo de tomar,
   * descartando notas de prontuário, memórias de cálculo, justificativas e avisos de IA.
   */
  function extrairItensReceitaLimpos(textoPrescricao) {
    var texto = String(textoPrescricao || "");
    var ehRascunho = /rascunho/i.test(texto);

    // 1. Se contiver a seção de notas clínicas ou prontuário, corta o texto para ignorar completamente
    var marcadoresCorte = [
      "NOTAS CLÍNICAS", "NOTAS CLINICAS", "MEMÓRIA DE CÁLCULO", "MEMORIA DE CALCULO",
      "PARA CONFERÊNCIA", "PARA CONFERENCIA", "PRONTUÁRIO", "PRONTUARIO",
      "JUSTIFICATIVA", "INDICAÇÃO CLÍNICA", "INDICACAO CLINICA", "ATENÇÃO:", "ATENCAO:"
    ];

    var indiceCorte = texto.length;
    for (var i = 0; i < marcadoresCorte.length; i++) {
      var pos = texto.toUpperCase().indexOf(marcadoresCorte[i]);
      if (pos !== -1 && pos > 80 && pos < indiceCorte) {
        indiceCorte = pos;
      }
    }
    var textoUtil = texto.substring(0, indiceCorte);

    var linhas = textoUtil.split("\n");
    var itens = [];
    var orientacoes = [];
    var viaAtual = "";
    var emOrientacoes = false;
    var itemAtual = null;

    var regexVia = /\[?(USO\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+)\]?/i;
    var regexIgnorar = /^(📋|⚖️|⚠️|💡|🔬|•\s*memória|•\s*indicação|•\s*dados|•\s*alergia|•\s*estoque|indicação|dados do paciente|peso:|atenção|raciocínio)/i;

    for (var j = 0; j < linhas.length; j++) {
      var l = linhas[j].trim();
      if (!l || l === "━━━━━━━━━━━━━━━━━━━━━━━━━" || l === "-------------------------") continue;

      var lSemMd = l.replace(/[*_#`]/g, "").trim();

      // Checa início da seção de orientações ao paciente
      if (lSemMd.match(/orientaç(ão|ões)\s+ao\s+paciente/i) || lSemMd.match(/^orientaç(ão|ões):/i)) {
        emOrientacoes = true;
        continue;
      }

      if (emOrientacoes) {
        if (lSemMd.length > 5 && !regexIgnorar.test(lSemMd)) {
          orientacoes.push(escHtml(lSemMd.replace(/^[-•*]\s*/, "")));
        }
        continue;
      }

      // Detecção de Via de Administração (ex: USO ORAL, USO TÓPICO)
      var matchVia = lSemMd.match(regexVia);
      if (matchVia && matchVia[1] && matchVia[1].length < 35 && matchVia[1].indexOf(":") === -1) {
        viaAtual = matchVia[1].toUpperCase().replace(/[\[\]]/g, "").trim();
        continue;
      }

      // Ignora linhas que sejam puramente cabeçalhos do chat ou dados técnicos
      if (regexIgnorar.test(lSemMd)) continue;
      if (lSemMd.indexOf("PRESCRIÇÃO AMBULATORIAL") !== -1 || lSemMd.indexOf("RECEITUÁRIO") !== -1) {
        continue;
      }

      // Início de novo medicamento (ex: "1. Amoxicilina...", "1) Dipirona...", "• Salbutamol...")
      var matchNovoItem = lSemMd.match(/^(\d+[\)\.]|\•|\-)\s+(.+)$/);
      if (matchNovoItem) {
        var conteudoLinha = matchNovoItem[2].trim();

        // Se for linha de posologia indentada ("Posologia: Tomar 1 cp...")
        if (conteudoLinha.match(/^posologia\s*[:=]?/i) || conteudoLinha.match(/^(tomar|aplicar|ingerir|inalar|instilar|usar)/i)) {
          if (itemAtual) {
            var pSeg = escHtml(conteudoLinha.replace(/^posologia\s*[:=]?\s*/i, "").trim());
            itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pSeg : pSeg;
          }
          continue;
        }

        // Se for quantidade a dispensar ("Quantidade: 1 caixa...")
        if (conteudoLinha.match(/^(quantidade|qtd|total)\s*[:=]?/i)) {
          if (itemAtual) {
            itemAtual.quantidade = escHtml(conteudoLinha.replace(/^(quantidade|qtd|total)\s*[:=]?\s*/i, "").trim());
          }
          continue;
        }

        // Novo medicamento
        if (itemAtual) {
          itens.push(itemAtual);
        }

        var nomeMedicamento = conteudoLinha;
        var qtdMedicamento = "";
        var partesDivisao = conteudoLinha.split(/\s+[-—–➔>]+\s+/);
        if (partesDivisao.length > 1) {
          nomeMedicamento = partesDivisao[0].trim();
          qtdMedicamento = partesDivisao.slice(1).join(" - ").trim();
        }

        itemAtual = {
          via: viaAtual,
          nome: escHtml(nomeMedicamento),
          quantidade: escHtml(qtdMedicamento),
          posologia: ""
        };
        continue;
      }

      // Linhas seguintes que complementam o medicamento atual
      if (itemAtual) {
        if (lSemMd.match(/^posologia\s*[:=]?/i) || lSemMd.match(/^(tomar|aplicar|ingerir|inalar|instilar|usar)/i)) {
          var pLinha = escHtml(lSemMd.replace(/^posologia\s*[:=]?\s*/i, "").trim());
          itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pLinha : pLinha;
        } else if (lSemMd.match(/^(quantidade|qtd|total)\s*[:=]?/i)) {
          itemAtual.quantidade = escHtml(lSemMd.replace(/^(quantidade|qtd|total)\s*[:=]?\s*/i, "").trim());
        } else if (lSemMd.length > 5 && !regexIgnorar.test(lSemMd)) {
          var pExtra = escHtml(lSemMd);
          itemAtual.posologia = itemAtual.posologia ? itemAtual.posologia + "<br>" + pExtra : pExtra;
        }
      }
    }

    if (itemAtual) {
      itens.push(itemAtual);
    }

    // Fallback se nenhum item estruturado foi encontrado
    if (itens.length === 0) {
      var linhasPuras = textoUtil.split("\n");
      var blocoLimpo = [];
      for (var k = 0; k < linhasPuras.length; k++) {
        var lp = linhasPuras[k].replace(/[*_#`]/g, "").trim();
        if (lp && !regexIgnorar.test(lp) && lp.indexOf("PRESCRIÇÃO") === -1 && lp.indexOf("RECEITUÁRIO") === -1) {
          blocoLimpo.push(escHtml(lp));
        }
      }
      if (blocoLimpo.length > 0) {
        itens.push({
          via: viaAtual,
          nome: blocoLimpo[0],
          quantidade: "",
          posologia: blocoLimpo.slice(1).join("<br>")
        });
      }
    }

    return {
      itens: itens,
      orientacoes: orientacoes,
      ehRascunho: ehRascunho
    };
  }

  function gerarHtmlReceituario(textoPrescricao, dataFormatada, nomePaciente) {
    var dados = extrairItensReceitaLimpos(textoPrescricao);

    // Agrupa itens por via de administração
    var viasMap = {};
    for (var i = 0; i < dados.itens.length; i++) {
      var item = dados.itens[i];
      var v = item.via || "";
      if (!viasMap[v]) viasMap[v] = [];
      viasMap[v].push(item);
    }

    var htmlCorpo = "";
    var contadorGeral = 1;

    for (var nomeVia in viasMap) {
      if (nomeVia) {
        htmlCorpo += "<div style='margin-top: 14px; margin-bottom: 6px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 2px;'>";
        htmlCorpo += escHtml(nomeVia);
        htmlCorpo += "</div>";
      }
      htmlCorpo += "<table width='100%' cellpadding='0' cellspacing='0' style='width: 100%; margin-bottom: 10px;'>";

      var lista = viasMap[nomeVia];
      for (var j = 0; j < lista.length; j++) {
        var m = lista[j];
        htmlCorpo += "<tr>";
        htmlCorpo += "  <td align='left' style='font-weight: bold; padding-top: 6px; padding-bottom: 3px; vertical-align: top;'>";
        htmlCorpo += "    " + contadorGeral + ". " + m.nome;
        htmlCorpo += "  </td>";
        htmlCorpo += "  <td align='right' style='font-weight: normal; white-space: nowrap; padding-top: 6px; vertical-align: top;'>";
        if (m.quantidade) {
          htmlCorpo += "    ----------------- " + m.quantidade;
        }
        htmlCorpo += "  </td>";
        htmlCorpo += "</tr>";
        if (m.posologia) {
          htmlCorpo += "<tr>";
          htmlCorpo += "  <td colspan='2' align='left' style='padding-left: 20px; line-height: 1.45; padding-bottom: 8px;'>";
          htmlCorpo += "    " + m.posologia;
          htmlCorpo += "  </td>";
          htmlCorpo += "</tr>";
        }
        contadorGeral++;
      }
      htmlCorpo += "</table>";
    }

    var htmlOrientacoes = "";
    if (dados.orientacoes && dados.orientacoes.length > 0) {
      htmlOrientacoes = "<div style='margin-top: 18px; border-top: 1px solid #000000; padding-top: 8px;'>" +
        "<div style='font-weight: bold; text-transform: uppercase; margin-bottom: 4px;'>Orientações:</div>" +
        "<div style='line-height: 1.4; padding-left: 8px;'>" +
        dados.orientacoes.map(function(o) { return "• " + o + "<br>"; }).join("") +
        "</div>" +
        "</div>";
    }

    return "<!DOCTYPE html>" +
      "<html><head><meta charset='utf-8'>" +
      "<style>" +
      "  @page { size: A4 portrait; margin: 18mm 20mm 15mm 20mm; }" +
      "  * { box-sizing: border-box; font-family: Arial, sans-serif; font-size: 11pt; color: #000000; }" +
      "  body { font-family: Arial, sans-serif; color: #000000; margin: 0; padding: 0; font-size: 11pt; line-height: 1.4; }" +
      "</style></head><body>" +
      "  <div style='text-align: center; border-bottom: 1px solid #000000; padding-bottom: 8px; margin-bottom: 16px;'>" +
      "    <div style='font-weight: bold; letter-spacing: 2px; text-transform: uppercase;'>RECEITUÁRIO MÉDICO</div>" +
      "    <div style='color: #c00000; font-weight: bold; font-size: 10pt; margin-top: 4px;'>⚠️ DOCUMENTO EM CARÁTER DE RASCUNHO · CONFERÊNCIA MÉDICA OBRIGATÓRIA</div>" +
      "  </div>" +
      "  <table width='100%' cellpadding='0' cellspacing='0' style='width: 100%; border-bottom: 1px solid #000000; margin-bottom: 14px;'>" +
      "    <tr>" +
      "      <td width='70%' align='left' style='padding-bottom: 6px;'>" +
      "        Paciente: <strong>" + nomePaciente + "</strong>" +
      "      </td>" +
      "      <td width='30%' align='right' style='padding-bottom: 6px;'>" +
      "        Data: <strong>" + dataFormatada + "</strong>" +
      "      </td>" +
      "    </tr>" +
      "  </table>" +
      "  <div style='margin-bottom: 18px;'>" +
      htmlCorpo +
      htmlOrientacoes +
      "  </div>" +
      "  <table align='center' width='280' cellpadding='0' cellspacing='0' style='margin: 60px auto 0 auto; text-align: center;'>" +
      "    <tr>" +
      "      <td align='center' style='border-top: 1px solid #000000; padding-top: 6px;'>" +
      "        Assinatura do(a) Médico(a) / CRM" +
      "      </td>" +
      "    </tr>" +
      "  </table>" +
      "</body></html>";
  }

  function obterOuCriarPastaDrive() {
    if(typeof DriveApp==="undefined")return null;
    var props=PropertiesService.getScriptProperties();
    var id=props.getProperty("RECEITAS_PASTA_PRIVADA_ID");
    var folder=id?DriveApp.getFolderById(id):DriveApp.createFolder("Receitas privadas - Ultra Rotina");
    if(!id){folder.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);props.setProperty("RECEITAS_PASTA_PRIVADA_ID",folder.getId());}
    if(folder.getSharingAccess()!==DriveApp.Access.PRIVATE || folder.getEditors().length || folder.getViewers().length)throw new Error("A pasta de receitas precisa ter acesso restrito ao proprietário.");
    return folder;
  }

  return {
    gerarHtml: function(textoPrescricao, dataStr, pacienteStr) {
      return gerarHtmlReceituario(textoPrescricao, dataStr || "03/10/2026", pacienteStr || "Paciente");
    },

    processarEEnviarPdf: function(chatId, textoPrescricao) {
      var tz = ConfigService.get("TIMEZONE", "America/Sao_Paulo");
      var agora = new Date();
      var dataFormatada = Utilities.formatDate(agora, tz, "dd/MM/yyyy");
      var stampArquivo = Utilities.formatDate(agora, tz, "yyyyMMdd_HHmm");
      var nomePaciente = extrairNomePaciente(textoPrescricao);

      var html = gerarHtmlReceituario(textoPrescricao, dataFormatada, nomePaciente);
      var nomeBase = "Receita_" + stampArquivo + "_" + nomePaciente.replace(/\s+/g, "_");

      var blobHtml = Utilities.newBlob(html, "text/html", nomeBase + ".html");
      var blobPdf = blobHtml.getAs("application/pdf");
      blobPdf.setName(nomeBase + ".pdf");

      var linkDrive = "";
      try {
        var pasta = obterOuCriarPastaDrive();
        if (pasta) {
          var arquivo = pasta.createFile(blobPdf);
          // Arquivo mantido restrito ao proprietário da conta Google (sem compartilhamento público)
          linkDrive = arquivo.getUrl();
        }
      } catch (errDrive) {
        Logger.log("Aviso ao salvar no Drive: " + errDrive.message);
      }

      var legenda = "📄 *RECEITUÁRIO MÉDICO (PDF)*\n" +
        "• *Paciente:* " + nomePaciente + "\n" +
        "• *Data:* " + dataFormatada + "\n" +
        (linkDrive ? "🔗 [Abrir no Google Drive](" + linkDrive + ")\n" : "") +
        "✅ Pronto para impressão A4 ou envio direto.";

      var enviado = enviarDocumentoTelegram(chatId, blobPdf, legenda);
      if (!enviado && linkDrive) {
        enviarMensagemParaChat(chatId, "📄 *Receita gerada em PDF no Google Drive:*\n🔗 " + linkDrive);
      }

      var sucessoEfetivo = !!(enviado || (linkDrive && linkDrive.length > 0));
      return {
        sucesso: sucessoEfetivo,
        nomeArquivo: nomeBase + ".pdf",
        linkDrive: linkDrive,
        enviadoTelegram: enviado
      };
    }
  };
})();
