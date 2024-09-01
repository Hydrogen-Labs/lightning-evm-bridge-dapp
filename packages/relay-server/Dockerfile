# Stage 1: Base dependencies
FROM node:18 AS base

WORKDIR /app

# Copy the package.json
COPY package.json ./

# Copy the rest of the application files
COPY . .

# Install dependencies using Yarn
RUN yarn install

# Compile TypeScript to JavaScript
RUN yarn build

# Stage 2: Production
FROM node:18-slim AS production

WORKDIR /app

# Install development libraries
RUN apt-get update && apt-get install -y

# Copy the compiled application from the base stage
COPY --from=base /app /app

# Expose the necessary port
EXPOSE 3004

# Define environment variables
ENV PORT=3004
ENV NODE_ENV=production

# Run the app
CMD ["yarn", "start"]
