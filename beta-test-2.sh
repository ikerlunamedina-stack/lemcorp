#!/bin/bash
# Beta test 2 - IA chat, pistolear scanning, mobile responsive
cd /home/z/my-project

pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

setsid bun run dev > dev.log 2>&1 < /dev/null &
echo "[1] Server starting..."
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "[1] Server ready after ${i}s"
    break
  fi
  sleep 1
done

echo "[2] Opening browser + setting up data..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"CAB-FO","name":"Cable Fibra Optica","quantity":800,"minStock":100,"udm":"METROS"},{"id":"p3","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"ZTE","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1

echo "[3] Test IA chat..."
agent-browser find text "Alana" click 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-ia-empty.png 2>&1 | tail -1
agent-browser snapshot -i -c 2>&1 | head -25

echo "[4] Send a math question to Alana..."
# Find the textarea and type a math question
INPUT_REF=$(agent-browser snapshot -i -c 2>&1 | grep "textbox" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
echo "Input ref: $INPUT_REF"
if [ -n "$INPUT_REF" ]; then
  agent-browser fill @$INPUT_REF "cuanto es 15 * 23 + 100?" 2>&1 | tail -1
  sleep 1
  # Find send button
  SEND_REF=$(agent-browser snapshot -i -c 2>&1 | grep -i "send\|enviar" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
  echo "Send ref: $SEND_REF"
  if [ -n "$SEND_REF" ]; then
    agent-browser click @$SEND_REF 2>&1 | tail -1
  else
    agent-browser press Enter 2>&1 | tail -1
  fi
  sleep 8
  agent-browser wait --load networkidle 2>&1 | tail -1
  echo "=== IA Response ==="
  agent-browser snapshot -c 2>&1 | tail -30
  agent-browser screenshot /home/z/my-project/beta-ia-math.png 2>&1 | tail -1
fi

echo "[5] Test pistolear - scan many series..."
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
# Find the scan input
SCAN_REF=$(agent-browser snapshot -i -c 2>&1 | grep "textbox" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
echo "Scan input ref: $SCAN_REF"
if [ -n "$SCAN_REF" ]; then
  # Scan 5 series quickly
  for i in 1 2 3 4 5; do
    agent-browser fill @$SCAN_REF "ZTE00$i" 2>&1 | tail -1
    agent-browser press Enter 2>&1 | tail -1
    sleep 0.3
  done
  sleep 2
  echo "=== After 5 scans ==="
  agent-browser screenshot /home/z/my-project/beta-pistolear-5.png 2>&1 | tail -1
  agent-browser snapshot -c 2>&1 | grep -i "captur\|serie\|guardar" | head -10
fi

echo "[6] Test mobile responsive..."
agent-browser set viewport 390 844 2>&1 | tail -1
sleep 1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-mobile-dashboard.png 2>&1 | tail -1
echo "=== Mobile snapshot ==="
agent-browser snapshot -i -c 2>&1 | head -20

echo "[7] Open mobile menu..."
MENU_REF=$(agent-browser snapshot -i -c 2>&1 | grep -i "menu\|hamburger\|Abrir men" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
echo "Menu ref: $MENU_REF"
if [ -n "$MENU_REF" ]; then
  agent-browser click @$MENU_REF 2>&1 | tail -1
  sleep 2
  agent-browser screenshot /home/z/my-project/beta-mobile-menu.png 2>&1 | tail -1
  agent-browser snapshot -i -c 2>&1 | head -20
fi

echo "[8] Check errors..."
agent-browser errors 2>&1 | head -15
echo "=== DEV LOG ==="
tail -15 dev.log

echo "[9] Test IA with knowledge question..."
agent-browser set viewport 1280 800 2>&1 | tail -1
agent-browser find text "Alana" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
INPUT_REF=$(agent-browser snapshot -i -c 2>&1 | grep "textbox" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
if [ -n "$INPUT_REF" ]; then
  agent-browser fill @$INPUT_REF "que es un ONT?" 2>&1 | tail -1
  agent-browser press Enter 2>&1 | tail -1
  sleep 10
  agent-browser wait --load networkidle 2>&1 | tail -1
  agent-browser screenshot /home/z/my-project/beta-ia-knowledge.png 2>&1 | tail -1
  echo "=== IA knowledge response ==="
  agent-browser snapshot -c 2>&1 | tail -20
fi

echo "[DONE] Killing server..."
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
echo "=== BETA TEST 2 COMPLETE ==="
