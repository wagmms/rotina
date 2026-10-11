'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
// Mesmo modo Script do runtime. Cada módulo é compilado separadamente.
const modules = process.argv[2] === '--stdin'
  ? JSON.parse(fs.readFileSync(0, 'utf8'))
  : process.argv.slice(2).map(file => ({ file, source: fs.readFileSync(file, 'utf8') }));
for (const { file, source } of modules) {
  try { new vm.Script(source, { filename: file }); }
  catch (error) { console.error(`${file}: ${error.message}`); process.exitCode = 1; }
}
