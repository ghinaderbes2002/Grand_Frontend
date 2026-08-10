# syntax=docker/dockerfile:1

# Node 22: matches the local toolchain and is what Next 16 is tested against.
ARG NODE_VERSION=22-alpine

# --- dependencies ------------------------------------------------------------
# Split from the build so a source-only change does not reinstall packages.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `NEXT_PUBLIC_*` values are inlined into the client bundle at build time, so
# this one cannot be supplied at run time like the others. Rebuild the image if
# the object store moves. Left empty, images render unoptimized rather than
# breaking — see components/ui/remote-image.tsx.
ARG NEXT_PUBLIC_MEDIA_ORIGIN=""
ENV NEXT_PUBLIC_MEDIA_ORIGIN=${NEXT_PUBLIC_MEDIA_ORIGIN}

# Also build-time: `proxy.ts` reads it, and the proxy bundle has its
# environment inlined during the build. Set it to `false` only while the site
# is served over plain HTTP — a `Secure` cookie is dropped by the browser on
# such an origin, which logs every user out on every navigation.
ARG COOKIE_SECURE=""
ENV COOKIE_SECURE=${COOKIE_SECURE}

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user. Alpine's node image already ships `node` (uid 1000).
USER node

# `standalone` carries its own minimal node_modules and server.js; `static` and
# `public` are not included in it and have to come along separately.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000
ENV PORT=3000
# Without this the server binds to localhost inside the container and nothing
# from outside can reach it.
ENV HOSTNAME=0.0.0.0

# Fails the container's health check if the app stops answering, so the
# restart policy can act on it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/ar').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
