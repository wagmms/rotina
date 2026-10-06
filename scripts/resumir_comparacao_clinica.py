#!/usr/bin/env python3
"""Resumo descritivo; nunca autoriza publicação nem infere equivalência clínica."""
import collections,json,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'reviews/comparacao_clinica_2026_10_04'

def main():
 records=[json.loads(p.read_text()) for p in OUT.glob('*_*.json') if __import__('re').fullmatch(r'[A-Z]\d{2}_(baseline|candidate)_[123]\.json',p.name)]
 for r in records:
  r['censored']=bool(r.get('censored') or any('Limite de requisições da avaliação' in x for x in r.get('logs',[])))
 groups={(r['id'],r['round'],r['version']):r for r in records}
 summary={'n':len(records),'publication':'NOT_APPROVED','note':'Tempos descritivos de geração + auditoria em ambiente local com APIs reais. Sem comprovação de não inferioridade clínica ou latência do GAS/Telegram.','versions':{},'pairs':[]}
 for version in ['baseline','candidate']:
  rs=[r for r in records if r['version']==version]
  successful=[r for r in rs if r['result'] and not r['error']]
  statuses=collections.Counter(str(c['status']) for r in rs for c in r['calls'])
  summary['versions'][version]={'runs':len(rs),'with_text':len(successful),'censored':sum(r['censored'] for r in rs),'http_statuses':dict(statuses),'requests':sum(len(r['calls']) for r in rs),'median_ms_with_text':statistics.median([r['total_ms'] for r in successful]) if successful else None,'max_ms_with_text':max([r['total_ms'] for r in successful],default=None)}
 def profile(r):return [(c['phase'],c.get('resolved_model')) for c in r['calls'] if c['status']==200]
 for cid,rnd in sorted(set((r['id'],r['round']) for r in records)):
  a=groups.get((cid,rnd,'baseline'));b=groups.get((cid,rnd,'candidate'))
  if not a or not b:continue
  pa,pb=profile(a),profile(b)
  summary['pairs'].append({'id':cid,'round':rnd,'baseline_ms':a['total_ms'],'candidate_ms':b['total_ms'],'both_returned_text':bool(a['result'] and b['result']),'censored':a['censored'] or b['censored'],'same_reported_success_models':bool(pa and pa==pb and all(x[1] for x in pa) and not a['censored'] and not b['censored']),'baseline_profile':pa,'candidate_profile':pb,'baseline_errors':sum(c['status']!=200 for c in a['calls']),'candidate_errors':sum(c['status']!=200 for c in b['calls'])})
 (OUT/'resumo_tecnico.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 lines=['# Tempos da comparação controlada','', 'Unidade: segundos. Inclui geração e auditoria quando aplicável. Leituras de Sheets/cache são locais simuladas; não inclui Telegram. Mesmo modelo não elimina variabilidade de carga, tokens, retries ou amostragem.','', '| Caso | Rodada | Anterior | Candidata | Mesmo modelo reportado nas etapas bem-sucedidas? | HTTPs com falha (anterior/candidata) |','|---|---:|---:|---:|---|---:|']
 for p in summary['pairs']:
  lines.append(f"| {p['id']} | {p['round']} | {p['baseline_ms']/1000:.2f} | {p['candidate_ms']/1000:.2f} | {'Sim' if p['same_reported_success_models'] else 'Não ou não comprovado'} | {p['baseline_errors']}/{p['candidate_errors']} |")
 lines+=['','Tempos de respostas ausentes não representam desempenho clínico. Execuções limitadas pelo teto de 12 chamadas são censuradas, não falhas conclusivas do bot em produção; consultar resumo_tecnico.json. Nenhum resultado desta tabela autoriza publicação.']
 (OUT/'TEMPOS.md').write_text('\n'.join(lines)+'\n')
 print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
