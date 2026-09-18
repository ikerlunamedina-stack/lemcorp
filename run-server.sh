#!/bin/bash
# Script robusto para mantener el servidor de LEMCORP vivo
# Lanza el servidor con NODE_OPTIONS para limitar memoria
# y lo reinicia automáticamente si se cae

cd /home/z/my-project

export NODE_OPTIONS="--max-old-space-size=1536"

while true; do
  echo "[$(date '+%H:%M:%S')] Iniciando servidor con NODE_OPTIONS=$NODE_OPTIONS" >> /home/z/my-project/watchdog.log

  # Matar cualquier proceso previo
  pkill -9 -f "next-server" 2>/dev/null
  pkill -9 -f "next dev" 2>/dev/null
  sleep 2

  # Lanzar el servidor en background
  bun run dev > /home/z/my-project/dev.log 2>&1 &
  SERVER_PID=$!

  # Esperar a que arranque
  sleep 15

  # Verificar si está vivo
  if curl -s -o /dev/null -m 5 http://localhost:3000/ 2>/dev/null; then
    echo "[$(date '+%H:%M:%S')] ✓ Servidor arriba (PID: $SERVER_PID)" >> /home/z/my-project/watchdog.log
  else
    echo "[$(date '+%H:%M:%S')] ✗ Servidor no arrancó" >> /home/z/my-project/watchdog.log
  fi

  # Esperar a que el proceso termine (se caiga)
  wait $SERVER_PID 2>/dev/null
  echo "[$(date '+%H:%M:%S')] ⚠ Servidor se cayó (exit: $?). Reiniciando en 5s..." >> /home/z/my-project/watchdog.log
  sleep 5
done
