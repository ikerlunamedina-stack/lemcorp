#!/bin/bash
# Watchdog daemon para LEMCORP - versión 3 (simplificada y robusta)
# Verifica cada 8s si next-server está vivo. Si no, reinicia todo.

LOG="/home/z/my-project/dev.log"
WLOG="/home/z/my-project/watchdog.log"
PORT=3000

cd /home/z/my-project

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$WLOG"
}

start_server() {
  # Matar todo rastro de next/bun
  pkill -9 -f "next-server" 2>/dev/null
  pkill -9 -f "next dev" 2>/dev/null
  pkill -9 -f "bun run dev" 2>/dev/null
  sleep 2

  # Iniciar bun run dev en background totalmente desacoplado
  nohup bun run dev > "$LOG" 2>&1 < /dev/null &
  log "Servidor iniciado (bun PID: $!)"
}

is_alive() {
  # Verificar proceso next-server Y puerto
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    return 1
  fi
  local code
  code=$(curl -s -o /dev/null -m 5 -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "404" ]
}

# === MAIN ===
log "=== Watchdog v3 iniciado (PID: $$) ==="

# Arrancar el servidor si no está corriendo
if ! is_alive; then
  log "Servidor no está corriendo. Iniciando..."
  start_server
  # Esperar hasta 40s a que arranque
  for i in $(seq 1 8); do
    sleep 5
    if is_alive; then
      log "✓ Servidor recuperado tras $((i*5))s"
      break
    fi
    [ $i -eq 8 ] && log "✗ El servidor no respondió tras 40s"
  done
fi

# Bucle de monitoreo infinito
while true; do
  if ! is_alive; then
    log "⚠ Servidor caído. Reiniciando..."
    start_server
    # Esperar hasta 40s a que arranque
    for i in $(seq 1 8); do
      sleep 5
      if is_alive; then
        log "✓ Servidor recuperado tras $((i*5))s"
        break
      fi
      [ $i -eq 8 ] && log "✗ El servidor no respondió tras 40s tras reinicio"
    done
  fi
  sleep 8
done
