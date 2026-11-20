# One image = API + built website (single free web service). Build from the repository root.
# ---- 1) build the React app ----
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2) API that also serves the built site ----
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY --from=web /web/dist ./public
RUN chown -R node:node /app
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s CMD node -e "fetch('http://localhost:'+(process.env.PORT||10000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "scripts/start.sh"]
