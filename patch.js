const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

if (!code.includes('fastify.setErrorHandler')) {
  const hooks = `
  // 1.2. Tratamento Global de Erros Fastify (Resiliência)
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(\`[Fastify Global Error] \${error.message} - Rota: \${request.raw.url}\`);
    reply.status(error.statusCode || 500).send({
      ok: false,
      erro: 'Falha interna no servidor.',
      detalhes: error.message
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      ok: false,
      erro: 'Rota não encontrada no backend Ultra Rotina.'
    });
  });
`;

  code = code.replace(
    `  await fastify.register(compress, {\n    threshold: 1024,\n    encodings: ['gzip', 'deflate']\n  });`,
    `  await fastify.register(compress, {\n    global: true,\n    threshold: 1024,\n    zlibOptions: { level: 6 },\n    encodings: ['gzip', 'deflate', 'br']\n  });\n${hooks}`
  );
  fs.writeFileSync('server/index.js', code);
  console.log('Patch applied successfully.');
} else {
  console.log('Already patched.');
}
