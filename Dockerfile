# syntax=docker/dockerfile:1

# Use Node 20 (Clerk SDKs work best on Node 20+)
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Install production dependencies (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev


FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application
COPY . .

# Render sets PORT automatically. Your server reads process.env.PORT.
EXPOSE 5000

CMD ["node", "src/server.js"]
