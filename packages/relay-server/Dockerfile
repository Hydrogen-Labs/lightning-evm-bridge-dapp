# Stage 1: Base dependencies
FROM node:18 AS base

WORKDIR /app

# Copy the Yarn configuration files and root package.json
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy the relay-server package to ensure its dependencies are available
COPY packages/relay-server/. ./packages/relay-server

# Install dependencies using Yarn, resolving workspace packages
WORKDIR /app/packages/relay-server
RUN yarn install

# Stage 2: Production
FROM node:18-slim AS production

WORKDIR /app/packages/relay-server

# Install development libraries
RUN apt-get update && apt-get install -y

# Copy the server package files from the base stage
COPY --from=base /app /app

# Expose the necessary ports
EXPOSE 3004 3004

# Define environment variables
ENV PORT=3003
ENV NODE_ENV=production

# Run the app
CMD ["yarn", "start"]