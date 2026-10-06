FROM node:24-alpine

WORKDIR /app

# Instala dependências de produção
COPY package*.json ./
RUN npm ci --only=production

# Copia código-fonte e bases locais
COPY server/ ./server/
COPY src/ ./src/
COPY server.js ./
COPY REMUME_RP.csv ./
COPY .deploy_state.json ./

# Cria pasta de dados persistentes
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/health || exit 1

CMD ["node", "server.js"]
