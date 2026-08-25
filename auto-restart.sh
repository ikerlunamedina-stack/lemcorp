#!/bin/bash
# Auto-restart para LEMCORP
# Verifica cada 5s si el puerto 3000 responde. Si no, reinicia.
# Este script se ejecuta en primer plano (no en background) para que
# el entorno no lo mate como proceso hijo.

cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"
LOG="/home/z/my-project/dev.log"
RLOG="/home/z/my-project/restart.log"

log() {
  echo "[$(date '+%H:%M:%S')] $1" >> "$RLOG"
}

# Matar todo al inicio
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

log "=== Auto-restart iniciado ==="

while true; do
  # Verificar si el puerto responde
  CODE=$(curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:3000/ 2>/dev/null)

  if [ "$CODE" != "200" ] && [ "$CODE" != "307" ] && [ "$CODE" != "404" ]; then
    log "⚠ Servidor caído (HTTP $CODE). Reiniciando..."

    # Matar procesos muertos
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    sleep 2

    # Lanzar servidor fresco
    nohup bun run dev > "$LOG" 2>&1 < /dev/null &
    log "✓ Servidor lanzado (PID: $!)"

    # Esperar a que arranque
    sleep 15

    # Verificar que arrancó
    CODE2=$(curl -s -o /dev/null -m 3 -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
    if [ "$CODE2" = "200" ]; then
      log "✓ Servidor recuperado"
    else
      log "✗ Servidor no arrancó (HTTP $CODE2)"
    fi
  fi

  sleep 5
done
