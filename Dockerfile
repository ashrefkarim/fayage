FROM node:24-alpine

# libc6-compat lets Alpine run the glibc-linked esbuild binary
RUN apk add --no-cache python3 make g++ libc6-compat
RUN npm install -g pnpm@10

WORKDIR /app

# --- Workspace config ---
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json tsconfig.json ./

# --- API server (full source) ---
COPY artifacts/api-server ./artifacts/api-server

# --- Stub package.json files for other workspace packages ---
# Required so pnpm can resolve the workspace graph without their full source
COPY artifacts/mobile/package.json ./artifacts/mobile/package.json
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/package.json
COPY scripts/package.json ./scripts/package.json

# --- Lib packages ---
# api-server imports @workspace/api-zod; esbuild bundles it from source
COPY lib/api-zod ./lib/api-zod
COPY lib/api-client-react/package.json ./lib/api-client-react/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json
COPY lib/db/package.json ./lib/db/package.json

# --- Install (only api-server and its workspace deps) ---
RUN pnpm install --frozen-lockfile --filter @workspace/api-server...

# --- Build ---
RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
