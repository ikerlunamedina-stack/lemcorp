#!/bin/bash
cd /home/z/my-project
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

setsid bun run dev > dev.log 2>&1 < /dev/null &
echo "[1] Server starting..."
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "[1] Ready ${i}s"
    break
  fi
  sleep 1
done

echo "[2] Open browser + setup data..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"CAB-FO","name":"Cable Fibra Optica","quantity":800,"minStock":100,"udm":"METROS"},{"id":"p3","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"},{"id":"p4","sku":"SPL-1x8","name":"Splitter 1x8","quantity":120,"minStock":30,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1

echo "[3] Dashboard screenshot..."
agent-browser screenshot /home/z/my-project/show-dashboard.png 2>&1 | tail -1

echo "[4] Inventario..."
agent-browser find text "Inventario" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/show-inventario.png 2>&1 | tail -1

echo "[5] Pistolear..."
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/show-pistolear.png 2>&1 | tail -1

echo "[6] Alana IA..."
agent-browser find text "Alana" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/show-alana.png 2>&1 | tail -1

echo "[7] Send question to Alana..."
IA_INPUT=$(agent-browser snapshot -i -c 2>&1 | grep "Pregúntame" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
if [ -n "$IA_INPUT" ]; then
  agent-browser fill @$IA_INPUT "hola alana" 2>&1 | tail -1
  agent-browser press Enter 2>&1 | tail -1
  sleep 8
  agent-browser screenshot /home/z/my-project/show-alana-response.png 2>&1 | tail -1
  echo "=== Alana response ==="
  agent-browser snapshot -c 2>&1 | grep -v "link\|tab\|combobox\|Notifications\|Next.js" | tail -15
fi

echo "[8] Mobile view..."
agent-browser set viewport 390 844 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser screenshot /home/z/my-project/show-mobile.png 2>&1 | tail -1

echo "[9] Mobile menu..."
MENU=$(agent-browser snapshot -i -c 2>&1 | grep "Abrir men" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
if [ -n "$MENU" ]; then
  agent-browser click @$MENU 2>&1 | tail -1
  sleep 2
  agent-browser screenshot /home/z/my-project/show-mobile-menu.png 2>&1 | tail -1
fi

echo "[DONE]"
ls -la show-*.png 2>/dev/null
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
