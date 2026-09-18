#!/bin/bash
# Watchdog - mantiene el servidor vivo
cd /home/z/my-project

while true; do
  # Check if server is alive
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" != "200" ]; then
    echo "[$(date +%H:%M:%S)] Server down (code: $CODE). Restarting..."
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    sleep 2
    setsid bun run dev > dev.log 2>&1 < /dev/null &
    echo "[$(date +%H:%M:%S)] Started new server (PID: $!)"
    # Wait for it to be ready
    for i in $(seq 1 30); do
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/ 2>/dev/null)
      if [ "$CODE" = "200" ]; then
        echo "[$(date +%H:%M:%S)] Server ready after ${i}s"
        break
      fi
      sleep 1
    done
  else
    echo "[$(date +%H:%M:%S)] Server OK (HTTP 200)"
  fi
  sleep 15
done
