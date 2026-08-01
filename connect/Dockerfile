FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY connect ./connect
RUN npm ci && npm run connect:build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/connect/dist ./dist
COPY connect/package.json ./package.json
USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
