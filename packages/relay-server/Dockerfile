# Stage 1: Base dependencies
FROM node:18 AS base

WORKDIR /app

# Copy the Yarn configuration files and package.json
COPY relay-server/package.json ./relay-server/

# Copy the rest of the application files
COPY relay-server/ ./relay-server
COPY shared/ ./shared

# Install dependencies using Yarn
WORKDIR /app/relay-server
RUN yarn install



# Transpile TypeScript to JavaScript
RUN yarn build

# Stage 2: Production
FROM node:18-slim AS production

WORKDIR /app/relay-server

# Install development libraries
RUN apt-get update && apt-get install -y

# Copy the transpiled application from the base stage
COPY --from=base /app/relay-server /app/relay-server
COPY --from=base /app/shared /app/shared

# Expose the necessary port
EXPOSE 3004

# Define environment variables
ENV PORT=3004
ENV NODE_ENV=production

# Run the transpiled app
CMD ["yarn", "start"]
