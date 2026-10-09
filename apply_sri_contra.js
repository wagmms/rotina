const fs = require('fs');

let js = fs.readFileSync('src/02_calculadoras_puras.js', 'utf8');

js = js.replace(/linhasDoses\.push\('1️⃣ Adjuvante Selecionado(.*?)'\);/g, "linhasDoses.push('1️⃣ Adjuvante Selecionado$1'); if(adj.f.contra) linhasDoses.push('⚠️ ' + adj.f.contra);");
js = js.replace(/linhasDoses\.push\('2️⃣ Indutor Selecionado(.*?)'\);/g, "linhasDoses.push('2️⃣ Indutor Selecionado$1'); if(ind.f.contra) linhasDoses.push('⚠️ ' + ind.f.contra);");
js = js.replace(/linhasDoses\.push\('3️⃣ Bloqueador Selecionado(.*?)'\);/g, "linhasDoses.push('3️⃣ Bloqueador Selecionado$1'); if(blq.f.contra) linhasDoses.push('⚠️ ' + blq.f.contra);");

fs.writeFileSync('src/02_calculadoras_puras.js', js);
console.log('Done SRI contra');
