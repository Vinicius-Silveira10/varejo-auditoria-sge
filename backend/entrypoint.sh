#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations do Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Executando seed..."
npx prisma db seed

echo "[entrypoint] Iniciando o servidor NestJS..."
exec node dist/src/main

