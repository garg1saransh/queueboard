# Production Dockerfile for Queueboard
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma
RUN apk add --no-cache libc6-compat openssl

# Copy package management files
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma/

# Install dependencies including devDependencies needed for build
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

# -------------------------------------------------------------
# Runner stage
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV PORT=3000
ENV RUN_WORKER_IN_WEB=true

# Copy package and node_modules from builder
COPY --from=builder /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

# Run prisma migration deploy and start custom HTTP + Socket.IO server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
