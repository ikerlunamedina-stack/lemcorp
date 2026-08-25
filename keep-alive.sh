#!/bin/bash
# Keep-alive: verifica cada 10s y reinicia si está caído
# Se ejecuta en un subshell completamente separado

while true; do
  cd /home/z/my-project
  
  # Verificar si next-server está corriendo
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date '+%H:%M:%S')] next-server no encontrado. Reiniciando..." >> /home/z/my-project/watchdog.log
    
    # Matar todo rastro
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    sleep 2
    
    # Lanzar en background con nohup
    nohup bun run dev > /home/z/my-project/dev.log 2>&1 < /dev/null &
    
    # Esperar a que arranque
    sleep 15
    
    if pgrep -f "next-server" > /dev/null 2>&1; then
      echo "[$(date '+%H:%M:%S')] ✓ Servidor recuperado" >> /home/z/my-project/watchdog.log
    else
      echo "[$(date '+%H:%M:%S')] ✗ Falló el reinicio" >> /home/z/my-project/watchdog.log
    fi
  fi
  
  sleep 10
done
