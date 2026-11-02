# Multi-stage production build for P2UWM
FROM node:22-alpine AS builder

WORKDIR /app

# Ensure npm resolves dependencies without strict engine/peer conflicts
COPY package.json package-lock.json* .npmrc* ./

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .

RUN npm run build

# Stage 2: Ultra-lightweight Nginx server
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
