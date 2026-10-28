# Build + runtime de EggSys (Next.js). El adaptador LSG tiene su propio Dockerfile.
FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# El datasource de Prisma no declara `url` (la conexion la abre el driver adapter),
# asi que `prisma generate` no necesita DATABASE_URL en build.
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001 NEXT_TELEMETRY_DISABLED=1
# Se copia la app entera en vez de usar output "standalone": la imagen pesa
# mas, pero no hay que copiar a mano el client de Prisma.
COPY --from=build /app ./
EXPOSE 3001
CMD ["npm", "start"]
