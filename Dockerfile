# --- Faza 1: odvisnosti ---
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
# --ignore-scripts prepreči postinstall (electron-rebuild ni relevanten/
# ne deluje v headless Docker okolju) - prisma generate kličemo eksplicitno spodaj
RUN bun install --frozen-lockfile --ignore-scripts

# --- Faza 2: build ---
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# .env.docker je Docker-kompatibilna verzija .env (BREZ narekovajev okoli
# vrednosti - Docker jih, za razliko od bash/Next.js, ne zna odstraniti
# sam). Preimenujemo jo v .env ZNOTRAJ slike, ker Next.js pričakuje
# točno to ime - tako dobimo pravilno parsirane vrednosti brez potrebe
# po ročnem ARG/ENV seznamu za vsako spremenljivko posebej.
# RUN cp .env.docker .env

RUN bunx prisma generate
RUN bun run build

# --- Faza 3: runtime (minimalna, produkcijska slika) ---
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root uporabnik za varnost (Debian-style ukazi, ker oven/bun ni Alpine-based)
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]