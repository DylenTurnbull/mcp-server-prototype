FROM node:18-slim

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

EXPOSE 8000

CMD ["node", "src/index.js"]