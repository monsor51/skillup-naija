# Dockerfile for Node app
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p /usr/src/app/data
EXPOSE 3000
CMD ["node", "server.js"]
