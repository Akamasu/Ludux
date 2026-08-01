FROM node:24-alpine AS build
WORKDIR /app
COPY connect/package.json connect/package-lock.json ./
RUN npm ci
COPY connect/tsconfig.json ./tsconfig.json
COPY connect/src ./src
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/connect/dist ./dist
COPY connect/package.json ./package.json
USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
