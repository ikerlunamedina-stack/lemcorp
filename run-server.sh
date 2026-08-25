#!/bin/bash
# Servidor con auto-restart: si bun run dev se cae, se reinicia automáticamente
cd /home/z/my-project
while true; do
  echo "[$(date '+%H:%M:%S')] Iniciando servidor..." >> /home/z/my-project/watchdog.log
  bun run dev > /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date '+%H:%M:%S')] Servidor terminó con código $EXIT_CODE. Reiniciando en 3s..." >> /home/z/my-project/watchdog.log
  sleep 3
done
