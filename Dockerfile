# Secondary, community-convenience path — not the primary documented
# workflow (see README "Getting started" / "Running with Docker"). Not as
# thoroughly exercised as `npm install && npm run dev`.
#
# TODO: this copies devDependencies into the runtime image and runs the
# regular (non-"standalone") Next.js server via `npm run start`, which is
# simple but not the leanest possible image. Switching to
# `output: "standalone"` in next.config.ts and copying only the standalone
# output would shrink this significantly, but that's a next.config.ts change
# out of scope for this doc-focused pass.

FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "run", "start"]
