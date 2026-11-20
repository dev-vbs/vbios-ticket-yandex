FROM node:24-alpine AS push
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY *.mjs ./
RUN mkdir /data && chown node:node /data
USER node
ENV PORT=8090
EXPOSE 8090
CMD ["node", "server.mjs"]
