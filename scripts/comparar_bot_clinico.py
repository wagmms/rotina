#!/usr/bin/env python3
"""Comparação pareada e alternada; retoma sem sobrescrever respostas já obtidas."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'reviews/comparacao_clinica_2026_10_04'
def main():
 p=argparse.ArgumentParser();p.add_argument('--rounds',type=int,default=2);p.add_argument('--case');a=p.parse_args()
 if not 1<=a.rounds<=3:raise ValueError('Máximo de três rodadas')
 cases=json.loads((OUT/'casos.json').read_text())
 for rnd in range(1,a.rounds+1):
  for i,case in enumerate(cases):
   if a.case and case['id']!=a.case:continue
   versions=['baseline','candidate'] if (i+rnd)%2 else ['candidate','baseline']
   for version in versions:
    try:
     res=subprocess.run(['node',str(ROOT/'scripts/comparar_bot_clinico.cjs'),version,case['id'],str(rnd)],cwd=ROOT,text=True,capture_output=True,timeout=180)
     if res.returncode:print(json.dumps({'id':case['id'],'version':version,'round':rnd,'runner_error':True}),flush=True)
     else:print(res.stdout.strip(),flush=True)
    except subprocess.TimeoutExpired:
     print(json.dumps({'id':case['id'],'version':version,'round':rnd,'runner_timeout':True}),flush=True)
if __name__=='__main__':main()
