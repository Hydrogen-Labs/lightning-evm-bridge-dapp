# Stage 1: Base dependencies
FROM node:18 AS base

WORKDIR /app

# Copy the Yarn configuration files and root package.json
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy the server package to ensure its dependencies are available
COPY packages/server/. ./packages/server
COPY packages/shared/. ./packages/shared

# Set the environment variable for Prisma
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=binary
ENV PRISMA_CLIENT_ENGINE_TYPE=binary
ENV PRISMA_GENERATE_SCHEMA_PATH=src/prisma/schema.prisma

# Install dependencies using Yarn, resolving workspace packages
WORKDIR /app/packages/server
RUN yarn install

# Ensure Prisma binaries are downloaded using npx
RUN yarn prisma generate --schema=$PRISMA_GENERATE_SCHEMA_PATH

# Stage 2: Production
FROM node:18-slim AS production

WORKDIR /app/packages/server

# Install OpenSSL and development libraries
RUN apt-get update && apt-get install -y openssl libssl-dev

# Copy the server package files from the base stage
COPY --from=base /app /app

# Expose the necessary ports
EXPOSE 3003 3002

# Define environment variables
ENV PORT=3003
ENV HTTP_PORT=3002
ENV NODE_ENV=production

# Run the app
CMD ["yarn", "start"]