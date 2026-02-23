FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl

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

# ------- prune for production -------
FROM build AS prune

RUN pnpm --filter @financial-app/api deploy --prod --legacy /app/pruned
RUN cp -r /app/api/dist /app/pruned/dist
RUN cp -r /app/api/prisma /app/pruned/prisma

# ------- production -------
FROM node:22-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=prune /app/pruned ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE ${PORT}

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
