# ─── Stage 1 : Développement (hot-reload) ─────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]


# ─── Stage 2 : Build production ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# ─── Stage 3 : Production (nginx) ─────────────────────────────────────────────
FROM nginx:alpine AS production

# Supprimer la config nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier notre config SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular
# Adapter "inubil-verify" au nom du projet Angular défini dans angular.json
COPY --from=builder /app/dist/inubil-verify/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
