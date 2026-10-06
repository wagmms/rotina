#!/usr/bin/env node
/**
 * Entry point para o servidor de produção do Ultra Rotina (Render / VPS / Docker).
 */
const { startServer } = require('./server/index.js');
startServer();
