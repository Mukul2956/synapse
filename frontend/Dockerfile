FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG FORGE_BACKEND_URL
ARG GENESIS_BACKEND_URL
ARG PULSE_BACKEND_URL
ARG ORBIT_BACKEND_URL
ENV FORGE_BACKEND_URL=$FORGE_BACKEND_URL
ENV GENESIS_BACKEND_URL=$GENESIS_BACKEND_URL
ENV PULSE_BACKEND_URL=$PULSE_BACKEND_URL
ENV ORBIT_BACKEND_URL=$ORBIT_BACKEND_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
