# Base Node.js Image
FROM node:18-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NEXT_PUBLIC_API_URL="http://localhost:8888"

# Copy the Yarn configuration files and root package.json
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy the nextjs package to ensure its dependencies are available
COPY packages/nextjs/. ./packages/nextjs
COPY packages/shared/. ./packages/shared

# Change to the directory of the specific package
WORKDIR /app/packages/nextjs

# Install dependencies for the specific package with Yarn workspaces support
RUN yarn install

# Build the application
RUN yarn build

# Production stage
FROM base AS runner

WORKDIR /app/packages/nextjs

# Copy the server package files from the base stage
COPY --from=base /app /app

# Run the application
CMD ["yarn", "start"]
