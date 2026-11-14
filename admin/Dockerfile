FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:stable-alpine AS admin
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV SHM_HOST=http://api
COPY --from=builder /app/dist /usr/share/nginx/html
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
