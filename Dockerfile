FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY db ./db
COPY scripts ./scripts
COPY src ./src

ENV NODE_ENV=production

USER node

EXPOSE 9092

CMD ["node", "src/index.js"]
