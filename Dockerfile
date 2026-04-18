# Stage 1
FROM node:20.11.0 as builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build


# Stage 2
FROM node:20.11.0
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4009
CMD sh -c "npx prisma migrate deploy && node dist/main.js"