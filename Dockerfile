FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ------- dependency install -------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY api/package.json api/package.json
COPY api/prisma api/prisma
COPY packages/common-types/package.json packages/common-types/package.json

RUN pnpm install --frozen-lockfile --prod=false

# ------- build -------
FROM deps AS build

COPY api/ api/
COPY packages/common-types/ packages/common-types/

RUN pnpm --filter @financial-app/api exec prisma generate
RUN pnpm --filter @financial-app/api run build

# ------- production -------
FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/api/dist ./dist
COPY --from=build /app/api/prisma ./prisma
COPY --from=build /app/api/node_modules ./node_modules
COPY --from=build /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build /app/api/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE ${PORT}

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
