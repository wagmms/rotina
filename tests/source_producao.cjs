// Mesma ordem de módulos utilizada pelo runtime Node.js, sem carregar segredos.
const fs = require('node:fs');
const path = require('node:path');
const src = path.resolve(__dirname, '../src');
module.exports = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort()
  .map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
