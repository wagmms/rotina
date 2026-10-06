import re
import csv

with open('/tmp/remume_rp.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
meds = []
for line in lines:
    line = line.strip()
    if not line: continue
    # Must start with a capital letter
    if not re.match(r'^[A-ZÁÉÍÓÚÂÊÔÇ]', line): continue
    # Must contain dosage unit
    if not re.search(r'\b(mg|mcg|mL|g|UI|%)\b', line): continue
    # Exclude common headers
    exclude_words = ['Divisão', 'Serviço', 'Secretaria', 'ANVISA', 'Prefeitura', 'Gestão', 'Janeiro', 'Fevereiro', 'Página', 'Cód', 'D/T', 'DVE', 'SINAN', 'Oftalmo', 'Conitec', 'Farmacêutica', 'Júlio', 'Lucia', 'Lúcia', 'Luana', 'Giuliene']
    if any(ew in line for ew in exclude_words): continue
    if len(line) > 100: continue
    
    # Clean up trailing spaces or weird characters
    line = re.sub(r'\s+', ' ', line).strip()
    meds.append(line)

meds = sorted(list(set(meds)))

with open('REMUME_RP.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Medicamento'])
    for m in meds:
        writer.writerow([m])

print(f"Created REMUME_RP.csv with {len(meds)} lines.")
