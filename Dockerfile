# Build + run the whole site in one image.
# Blizzard API credentials are provided at runtime via env vars
# (BNET_CLIENT_ID / BNET_CLIENT_SECRET) — they are NOT baked into the image.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching). Root postinstall also
# installs web/ dependencies, so copy both manifests before running install.
COPY package*.json ./
COPY web/package*.json ./web/
RUN npm install

# Copy source and build the React frontend into web/dist.
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Hosts inject their own PORT; default to 3000 locally.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
