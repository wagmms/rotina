#!/usr/bin/env python3
"""
Mapeador e Identificador Clínico das Aulas Flash do Extensivo R1
Lê as transcrições em TXT de cada aula flash, compreende o conteúdo clínico
e gera títulos clínicos precisos na memória e em arquivo estruturado.
"""

import sqlite3
import re
import json
from pathlib import Path

APOSTILAS_BASE = Path("/home/wagmoraes/Documents/Apostilas/Extensivo R1 2027 [Bônus 2026]")
KATOMA_DB = Path("/home/wagmoraes/.config/katomart/katomart.db")
OUTPUT_JSON = Path("/home/wagmoraes/Projetos IA/Rotina/src/data/aulas_flash_titulos.json")

# Mapa com refinamentos cirúrgicos identificados nas transcrições das aulas flash
MAPA_EXPLICITO = {
    # Cirurgia Geral
    ("Cirurgia Geral", 1, 4): "Diverticulite Aguda: Classificação de Hinchey e Conduta Cirúrgica",
    ("Cirurgia Geral", 3, 4): "Isquemia Mesentérica Aguda e Anatomia Vascular do Abdome",
    ("Cirurgia Geral", 4, 4): "Abdome Agudo Obstrutivo: Diagnóstico Diferencial Alta vs Baixa e Raio-X",
    ("Cirurgia Geral", 5, 4): "Abdome Agudo Perfurativo: Etiologias, Pneumoperitônio e Conduta",
    ("Cirurgia Geral", 6, 7): "Atendimento ao Trauma: Epidemiologia, Pico Trimodal e Princípios do xABCDE",
    ("Cirurgia Geral", 6, 8): "Trauma xABCDE: Manejo de Via Aérea (A) e Ventilação/Tórax (B)",
    ("Cirurgia Geral", 6, 9): "Trauma xABCDE: Circulação/Choque (C), Déficit Neurológico (D) e Exposição (E)",
    ("Cirurgia Geral", 8, 6): "Pancreatite Crônica: Etiologia Alcoólica, Quadro Clínico e Tratamento",
    ("Cirurgia Geral", 8, 7): "Pancreatite Aguda: Critérios Diagnósticos, Fatores de Risco e Gravidade",
    ("Cirurgia Geral", 8, 8): "Complicações Locais da Pancreatite Aguda: Coleções Fluídas, Pseudocisto e Necrose",
    ("Cirurgia Geral", 9, 4): "Hiperplasia Prostática Benigna (HPB) e Retenção Urinária Aguda",
    ("Cirurgia Geral", 9, 15): "Litíase Urinária: Abordagem Aguda, Imagem e Tratamento Clínico vs Cirúrgico",
    ("Cirurgia Geral", 9, 16): "Escroto Agudo: Torção Testicular vs Orquiepididimite",
    ("Cirurgia Geral", 10, 1): "Avaliação Pré-Anestésica: Classificação ASA e Jejum Pré-Operatório",
    ("Cirurgia Geral", 11, 4): "Aneurisma de Aorta Abdominal (AAA): Rastreio, Indicação Cirúrgica e Ruptura",
    ("Cirurgia Geral", 12, 4): "Cirurgia Bariátrica: Indicações, Bypass em Y-de-Roux e Sleeve",
    ("Cirurgia Geral", 15, 6): "Derrame Pleural e Empiema: Critérios de Light e Drenagem Torácica",
    ("Cirurgia Geral", 16, 6): "Doenças Orificiais: Hemorroidas, Fissura Anal e Abscesso/Fístula Perianal",
    ("Cirurgia Geral", 17, 7): "Complicações Pós-Operatórias: Febre nos Primeiros Dias e Deiscência de Ferida",
    ("Cirurgia Geral", 19, 9): "Avaliação do Risco Cirúrgico Cardiovascular e Escore de Goldman/ACP",
    ("Cirurgia Geral", 20, 6): "Doença Arterial Obstrutiva Periférica (DAOP): Classificação de Fontaine e Rutherford",
    ("Cirurgia Geral", 21, 4): "Trombose Venosa Profunda (TVP) e Insuficiência Venosa Crônica",
    ("Cirurgia Geral", 25, 6): "Hérnias Inguinais e Crurais: Anatomia do Trígono de Hesselbach e Classificação de Nyhus",
    
    # Clínica Médica
    ("Clínica Médica", 1, 3): "Manejo das Bradiarritmias e Indicações de Marcapasso (ACLS)",
    ("Clínica Médica", 1, 4): "Taquiarritmias: Abordagem Inicial e Estabilidade vs Instabilidade",
    ("Clínica Médica", 1, 13): "Fibrilação Atrial (FA): Controle de Frequência, Ritmo e Anticoagulação (CHA2DS2-VASc)",
    ("Clínica Médica", 1, 14): "Taquicardia Supraventricular por Reentrada Nodal (TPSV) e Flutter Atrial",
    ("Clínica Médica", 1, 15): "Síncope: Vasovagal vs Neurogênica vs Cardíaca e Estratificação de Risco",
    ("Clínica Médica", 1, 16): "Parada Cardiorrespiratória: Ritmos Chocáveis (FV/TVSP) e Não Chocáveis (AESP/Assistolia)",
    ("Clínica Médica", 3, 2): "Parasitoses Intestinais: Helmintíases e Protozooses de Alto Rendimento",
        ("Clínica Médica", 4, 4): "Parada Cardiorrespiratória: Cadeia de Sobrevivência e Suporte Básico de Vida",
    ("Clínica Médica", 4, 13): "Ritmos Chocáveis na PCR: FV e TV sem Pulso (Desfibrilação e Amiodarona)",
    ("Clínica Médica", 4, 14): "Ritmos Não Chocáveis na PCR: AESP e Assistolia (Protocolo da Linha Reta e 5Hs/5Ts)",
    ("Clínica Médica", 4, 15): "Retorno da Circulação Espontânea (RCE) e Cuidados Pós-PCR",
    ("Clínica Médica", 4, 16): "Manejo da Via Aérea na PCR, Capnografia e Drogas Vasopressoras",
    ("Cirurgia Geral", 19, 9): "Risco Cirúrgico Cardiovascular e Escore de Lee / ACP",
    ("Clínica Médica", 7, 3): "HAS na Infância e Adolescência: Diagnóstico por Percentis e Tratamento",
    ("Clínica Médica", 18, 3): "Síndrome Metabólica na Infância: Critérios Diagnósticos e Manejo",
    ("Clínica Médica", 27, 27): "Pneumonia Adquirida na Comunidade (PAC) na Pediatria: Etiologia e Antibioticoterapia",
    ("Clínica Médica", 32, 32): "Transmissão Vertical do HIV e Profilaxia no Neonato",
    ("Clínica Médica", 34, 3): "Síndromes Febris na Infância e Febre Sem Foco: Conduta por Faixa Etária",
    ("Clínica Médica", 36, 36): "Glomerulonefrite Difusa Aguda (GNPE) e Síndrome Nefrótica em Pediatria",

    ("Clínica Médica", 4, 13): "Ritmos de Choque na PCR: Fibrilação Ventricular e TV sem Pulso",
    ("Clínica Médica", 4, 14): "Ritmos Não Chocáveis na PCR: Atividade Elétrica Sem Pulso e Assistolia (5Hs e 5Ts)",
    ("Clínica Médica", 4, 15): "Cuidados Pós-Ressuscitação Cardiorrespiratória (RCE) e Controle Direcionado de Temperatura",
    ("Clínica Médica", 4, 16): "Manejo de Via Aérea Avançada e Fármacos na PCR (Adrenalina e Amiodarona)",
    ("Clínica Médica", 7, 3): "HAS na Infância e Adolescência: Definição por Percentis e Investigação Secundária",
    ("Clínica Médica", 10, 3): "Insuficiência Cardíaca com Fração de Ejeção Reduzida (ICFER): Terapia Quádrupla Otimizada",
    ("Clínica Médica", 11, 4): "Síndrome Coronariana Aguda sem Supra de ST (SCASST): TIMI e GRACE",
    ("Clínica Médica", 12, 4): "Infarto Agudo do Miocárdio com Supra de ST (IAMCSST): Trombolítico vs Angioplastia Primária",
    ("Clínica Médica", 20, 4): "Diabetes Mellitus: Critérios Diagnósticos e Metas Terapêuticas de Hemoglobina Glicada",
    ("Clínica Médica", 21, 5): "Cetoacidose Diabética (CAD) e Estado Hiperosmolar Hiperglicêmico (EHH)",
    ("Clínica Médica", 27, 4): "Pneumonia Adquirida na Comunidade (PAC): Escore CURB-65 e Esquemas Antimicrobianos",
    ("Clínica Médica", 32, 3): "Profilaxia Pós-Exposição (PEP) e Pré-Exposição (PrEP) ao HIV",
    ("Clínica Médica", 36, 3): "Glomerulopatias Pediátricas: Síndrome Nefrótica por Lesão Mínima e GNPE",
    
    # Ginecologia e Obstetrícia
    ("Ginecologia e Obstetrícia", 1, 7): "Câncer de Colo Uterino: Estadiamento da FIGO e Indicações Cirúrgicas",
    ("Ginecologia e Obstetrícia", 2, 5): "Assistência Pré-Natal: Calendário de Consultas, Exames Obrigatórios e Suplementação",
    ("Ginecologia e Obstetrícia", 3, 3): "Rastreamento do Câncer de Colo Uterino: Citopatologia Oncótica e Indicações de Colposcopia",
    ("Ginecologia e Obstetrícia", 4, 6): "Sangramento Uterino Anormal: Classificação PALM-COEIN e Miomatose Uterina",
    ("Ginecologia e Obstetrícia", 5, 4): "Amenorreias Primárias e Secundárias: Investigação Diagnóstica em 4 Passos",
    ("Ginecologia e Obstetrícia", 6, 7): "Hepatites Virais (B e C) na Gestação: Transmissão Vertical e Profilaxia Neonatal",
    ("Ginecologia e Obstetrícia", 6, 8): "HIV na Gestação: Terapia Antirretroviral, Carga Viral e Via de Parto",
    ("Ginecologia e Obstetrícia", 6, 9): "Sífilis Congênita e Gestacional: Testagem Rápida, Tratamento Adequado e Seguimento",
    ("Ginecologia e Obstetrícia", 10, 4): "Síndromes Hipertensivas na Gestação: Pré-Eclâmpsia, Eclâmpsia e Sulfato de Magnésio (Pritchard/Zuspan)",
    ("Ginecologia e Obstetrícia", 11, 4): "Diabetes Mellitus Gestacional (DMG): Diagnóstico pelo TOTG 75g e Alvos Glicêmicos",
    ("Ginecologia e Obstetrícia", 15, 4): "Hemorragias da Primeira Metade da Gestação: Abortamento, Ectópica e Doença Trofoblástica",
    ("Ginecologia e Obstetrícia", 16, 4): "Hemorragias da Segunda Metade da Gestação: Descolamento Prematuro de Placenta (DPP) e Placenta Prévia",
    
    # Pediatria
    ("Pediatria", 1, 7): "Anafilaxia na Infância: Reconhecimento Imediato e Adrenalina Intramuscular",
    ("Pediatria", 1, 8): "Alergia à Proteína do Leite de Vaca (APLV) e Erros Inatos da Imunidade (EII)",
    ("Pediatria", 2, 6): "Cardiopatias Congênitas: Transição Fetal-Neonatal e Teste do Coraçãozinho",
    ("Pediatria", 2, 7): "Cardiopatias Congênitas Acianogênicas (CIV, CIA, PCA, Coarctação) vs Cianogênicas (Tetralogia de Fallot)",
    ("Pediatria", 13, 3): "Icterícia Neonatal: Fisiológica vs Patológica, Fototerapia e Escala de Kramer",
    ("Pediatria", 14, 8): "Reanimação Neonatal em Sala de Parto (>= 34 semanas): Minuto de Ouro e Passos Iniciais",
    ("Pediatria", 14, 9): "Reanimação Neonatal no Prematuro (< 34 semanas): CPAP em Sala de Parto e Cuidados Térmicos",
    ("Pediatria", 14, 11): "Infecções Congênitas (TORCH): Toxoplasmose Congênita e Citomegalovírus",
    ("Pediatria", 14, 12): "Sepse Neonatal Precoce vs Tardia: Fatores de Risco Maternos e Antibioticoterapia Empírica",
    ("Pediatria", 14, 13): "Sífilis Congênita: Notificação Compulsória, VDRL no Líquor e Penicilina Cristalina",
    ("Pediatria", 19, 8): "Triagem Neonatal: Teste do Pezinho, Olhinho, Orelhinha e Coraçãozinho",
    ("Pediatria", 19, 9): "Cuidados no Alojamento Conjunto, Clampeamento do Cordão e Profilaxia com Vitamina K e Nitrato de Prata",
    ("Pediatria", 20, 6): "Manejo Agudo da Crise Convulsiva: Tempos T1/T2, Benzodiazepínicos e Drogas de 2ª Linha",
    ("Pediatria", 20, 7): "Síndromes Epilépticas da Infância: Síndrome de West e Epilepsia Ausência",
    
    # Medicina Preventiva e Social
    ("Medicina Preventiva e Social", 101, 3): "Transição Demográfica e Epidemiológica no Brasil: Envelhecimento Populacional e Tripla Carga de Doenças",
    ("Medicina Preventiva e Social", 101, 4): "Indicadores de Mortalidade Geral, Infantil e Taxa de Letalidade",
    ("Medicina Preventiva e Social", 101, 5): "Mortalidade Proporcional por Idade (Nelson de Moraes e Razão de Swaroop-Uemura)",
    ("Medicina Preventiva e Social", 101, 6): "Carga Global de Doença e Indicadores Compostos: DALY, QALY e APVP",
    ("Medicina Preventiva e Social", 101, 8): "Mortalidade Proporcional, Letalidade e Indicadores Ajustados (DALY/APVP) em Questões",
    ("Medicina Preventiva e Social", 102, 3): "Evolução Histórica do SUS: Das Caixas de Aposentadoria (CAPs) à Constituição de 1988",
    ("Medicina Preventiva e Social", 102, 4): "Princípios Doutrinários e Organizativos do SUS (Leis 8.080 e 8.142)",
    ("Medicina Preventiva e Social", 103, 3): "Estratégia Saúde da Família (ESF) e Atributos da Atenção Primária à Saúde",
    ("Medicina Preventiva e Social", 104, 3): "Estudos Epidemiológicos: Coorte, Caso-Controle, Transversal e Ensaio Clínico Randomizado",
    ("Medicina Preventiva e Social", 104, 4): "Medidas de Associação: Risco Relativo (RR), Odds Ratio (OR) e Razão de Prevalência (RP)",
    ("Medicina Preventiva e Social", 105, 3): "Testes Diagnósticos: Sensibilidade, Especificidade, VPP, VPN e Curva ROC",
}

def normalizar_area(area_str):
    s = area_str.lower()
    if "cirurg" in s: return "Cirurgia Geral"
    if "clín" in s or "clin" in s: return "Clínica Médica"
    if "ginec" in s or "obstetr" in s or "go" in s: return "Ginecologia e Obstetrícia"
    if "pediat" in s: return "Pediatria"
    if "prevent" in s or "social" in s: return "Medicina Preventiva e Social"
    return area_str.strip()

def extrair_numero(texto):
    m = re.search(r'(\d+)', texto or '')
    return int(m.group(1)) if m else None

def indexar_arquivos_txt():
    todos_txts = list(APOSTILAS_BASE.rglob("*Flash*.txt"))
    indice = {}
    for p in todos_txts:
        rel = p.relative_to(APOSTILAS_BASE)
        area = normalizar_area(rel.parts[0])
        mod_pasta = p.parent.name
        mod_num = extrair_numero(mod_pasta)
        aula_num = extrair_numero(p.name)
        if mod_num is not None and aula_num is not None:
            indice[(area, mod_num, aula_num)] = p
        indice[(area, mod_pasta.lower(), aula_num)] = p
    return indice, todos_txts

def limpar_fala_introducao(texto):
    t = texto.strip()
    padroes = [
        r"^(fala|olá|oi|bem-vindos|sejam muito bem-vindos|e aí)[^.!?\n]*[.!?\n]",
        r"^(eu sou [^.!?\n]*[.!?\n])",
        r"^(aula do extensivo|aula flash|vamos lá|bora lá)[^.!?\n]*[.!?\n]",
    ]
    for padrao in padroes:
        t = re.sub(padrao, "", t, flags=re.IGNORECASE).strip()
    return t

def extrair_titulo_clinico_inteligente(conteudo_txt, area, mod_num, aula_num, modulo_titulo, nome_arquivo):
    # 1. Checar mapa explícito curado
    if (area, mod_num, aula_num) in MAPA_EXPLICITO:
        return MAPA_EXPLICITO[(area, mod_num, aula_num)]

    # 2. Sufixo específico no nome do arquivo
    m_sufixo = re.search(r'-\s*([^-]+)\s*\(Flash\)\.txt', nome_arquivo, re.IGNORECASE)
    if m_sufixo:
        candidato = m_sufixo.group(1).strip()
        if len(candidato) > 4 and not candidato.lower().startswith("aula"):
            return candidato

    # 3. Analisar transcrição
    trecho = conteudo_txt[:3500].replace("\r", " ")
    
    padroes_tema = [
        r"(?:vamos olhar|olhar para|ver) (?:o que a gente tem de (?:mais )?importante|os pontos mais importantes) (?:de|sobre|do|da)\s+([^.!?,\n]{4,65})",
        r"(?:vamos|bora) (?:falar|conversar|discutir|abordar) (?:sobre|de|do|da)\s+([^.!?,\n]{4,65})",
        r"(?:quero|vou) (?:abordar|falar|trazer|discutir) (?:com vocês )?(?:sobre|de|do|da)\s+([^.!?,\n]{4,65})",
        r"(?:tema da nossa aula|assunto de hoje|foco de hoje é)\s+([^.!?,\n]{4,65})",
        r"(?:principais coisas|o principal) (?:sobre|de|do|da)\s+([^.!?,\n]{4,65})",
    ]
    
    for p in padroes_tema:
        m = re.search(p, trecho, re.IGNORECASE)
        if m:
            tema = m.group(1).strip()
            # Eliminar ruídos
            tema = re.sub(r'(\s+e\s+a\s+gente|\s+para\s+a\s+gente|\s+começando|\s+que|\s+com\s+foco).*$', '', tema, flags=re.IGNORECASE).strip(" :.-")
            # Se for tema genérico ("nossa prova", "uma entidade", "aula flash"), ignorar
            if any(ruido in tema.lower() for ruido in ["nossa prova", "uma entidade", "aula flash", "essa flash", "revisar as"]):
                continue
            if 5 <= len(tema) <= 75:
                return tema[0].upper() + tema[1:]

    # 4. Fallback contextual no módulo
    mod_limpo = modulo_titulo.split("—")[-1].strip()
    mod_limpo = re.sub(r'^\d+\.\s*', '', mod_limpo)
    return mod_limpo

def main():
    print("=" * 70)
    print("PROCESSAMENTO CIRÚRGICO DA MEMÓRIA CLÍNICA DAS AULAS FLASH R1")
    print("=" * 70)
    
    indice_txt, todos_txts = indexar_arquivos_txt()
    conn = sqlite3.connect(str(KATOMA_DB))
    cur = conn.cursor()
    course_id = "2b6362b9-8f1f-4096-92ab-26c10f76fd59"
    
    query = """
        SELECT 
            l.id as lesson_id,
            m.title as modulo_titulo,
            l.title as aula_titulo,
            lv.title as video_titulo,
            lv.file_path as video_path,
            lv.duration as duracao,
            m.order_index,
            l.order_index
        FROM lessons l
        JOIN modules m ON l.module_id = m.id
        LEFT JOIN lesson_videos lv ON lv.lesson_id = l.id
        WHERE m.course_id = ? AND l.title LIKE '%Flash%'
        ORDER BY m.order_index, l.order_index;
    """
    rows = cur.execute(query, (course_id,)).fetchall()
    
    catalogo = []
    
    for r in rows:
        lesson_id, mod_title, aula_title, vid_title, vid_path, duracao, m_idx, l_idx = r
        area = normalizar_area(mod_title.split("—")[0])
        mod_num = extrair_numero(mod_title.split("—")[1] if "—" in mod_title else mod_title)
        aula_num = extrair_numero(aula_title)
        
        # Localizar TXT
        txt_file = indice_txt.get((area, mod_num, aula_num))
        if not txt_file:
            mod_limpo = mod_title.split("—")[-1].strip().lower()
            for (a, m_chave, a_num), caminho in indice_txt.items():
                if a == area and a_num == aula_num and isinstance(m_chave, str):
                    if any(w in m_chave for w in mod_limpo.split()[:3] if len(w) > 4):
                        txt_file = caminho
                        break
        
        if (area, mod_num, aula_num) in MAPA_EXPLICITO:
            titulo_clinico = MAPA_EXPLICITO[(area, mod_num, aula_num)]
            if txt_file and txt_file.exists():
                conteudo = txt_file.read_text(encoding="utf-8", errors="ignore")
                fala_limpa = limpar_fala_introducao(conteudo)
                resumo_curto = fala_limpa[:180].replace("\n", " ").strip() + "..."
            else:
                resumo_curto = f"Revisão flash de alto rendimento sobre {titulo_clinico}."
        elif txt_file and txt_file.exists():
            conteudo = txt_file.read_text(encoding="utf-8", errors="ignore")
            nome_arquivo = txt_file.name
            titulo_clinico = extrair_titulo_clinico_inteligente(conteudo, area, mod_num, aula_num, mod_title, nome_arquivo)
            fala_limpa = limpar_fala_introducao(conteudo)
            resumo_curto = fala_limpa[:180].replace("\n", " ").strip() + "..."
        else:
            mod_limpo = mod_title.split("—")[-1].strip()
            mod_limpo = re.sub(r'^\d+\.\s*', '', mod_limpo)
            titulo_clinico = f"{mod_limpo}"
            resumo_curto = f"Revisão flash de alto rendimento sobre {mod_limpo}."
            
        mod_nome_limpo = mod_title.split("—")[-1].strip() if "—" in mod_title else mod_title
        
        titulo_formatado = f"{aula_num:02d}. {titulo_clinico}" if aula_num else titulo_clinico
        
        catalogo.append({
            "id": lesson_id,
            "grande_area": area,
            "modulo": mod_nome_limpo,
            "modulo_completo": mod_title,
            "aula_num": aula_num,
            "titulo_original": aula_title,
            "titulo_clinico": titulo_formatado,
            "resumo_clinico": resumo_curto,
            "video_path": vid_path,
            "duracao_segundos": duracao or 0,
            "modulo_index": m_idx,
            "aula_index": l_idx
        })
        
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Processamento concluído com sucesso!")
    print(f"✓ {len(catalogo)} aulas flash memorizadas com títulos clínicos de alto rendimento.")
    print(f"✓ Arquivo estruturado atualizado em: {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
