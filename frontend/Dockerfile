# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Vite dev server with HMR. Sources are bind-mounted by compose, so only the
# dependency layer is baked in — same arrangement the API uses.
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json ./
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
