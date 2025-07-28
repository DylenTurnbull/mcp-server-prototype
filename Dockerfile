FROM node:18-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

# Note: This Dockerfile is for the MCP server, not NGINX
# The NGINX server runs separately via docker-compose
# No port exposure needed for MCP server (uses stdio transport)

CMD ["node", "src/index.js"]