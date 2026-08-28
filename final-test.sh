#!/bin/bash
# Final verification test - all key flows
cd /home/z/my-project

pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

setsid bun run dev > dev.log 2>&1 < /dev/null &
echo "[1] Server starting..."
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "[1] Ready after ${i}s"
    break
  fi
  sleep 1
done

echo "[2] Setup..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/final-1-dashboard.png 2>&1 | tail -1

echo "[3] Test pistolear scanning (correct input)..."
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
# Find the scan input (the one with placeholder about scanning)
echo "=== All textboxes ==="
agent-browser snapshot -i -c 2>&1 | grep "textbox"
# Use the last textbox (scan input is usually the main one)
SCAN_INPUT=$(agent-browser snapshot -i --json 2>&1 | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    def find_textboxes(node, depth=0):
        results = []
        if isinstance(node, dict):
            if node.get('role') == 'textbox':
                results.append(node)
            for v in node.values():
                results.extend(find_textboxes(v, depth+1))
        elif isinstance(node, list):
            for item in node:
                results.extend(find_textboxes(item, depth+1))
        return results
    tbs = find_textboxes(data)
    # Find the scan input - it has placeholder containing 'serie' or is the main scan input
    for tb in tbs:
        name = tb.get('name', '') or ''
        if 'serie' in name.lower() or 'scan' in name.lower() or 'lectura' in name.lower() or 'ZTE00' in name:
            print(tb.get('ref', ''))
            break
    else:
        # fallback to last textbox
        if tbs:
            print(tbs[-1].get('ref', ''))
except Exception as e:
    print('', file=sys.stderr)
" 2>/dev/null)
echo "Scan input ref: $SCAN_INPUT"

# Fallback: just use the textbox that's NOT the prefix config
if [ -z "$SCAN_INPUT" ]; then
  SCAN_INPUT=$(agent-browser snapshot -i -c 2>&1 | grep "textbox" | grep -iv "ej: zte\|prefijo" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
  echo "Fallback scan ref: $SCAN_INPUT"
fi

if [ -n "$SCAN_INPUT" ]; then
  echo "=== Scanning 3 series ==="
  for i in 1 2 3; do
    agent-browser fill @$SCAN_INPUT "SN-TEST-00$i" 2>&1 | tail -1
    agent-browser press Enter 2>&1 | tail -1
    sleep 0.5
  done
  sleep 2
  agent-browser screenshot /home/z/my-project/final-2-pistolear-scanned.png 2>&1 | tail -1
  echo "=== After scanning ==="
  agent-browser snapshot -c 2>&1 | grep -iE "captur|guardar|serie|aceptad" | head -10
fi

echo "[4] Test IA math again..."
agent-browser find text "Alana" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
IA_INPUT=$(agent-browser snapshot -i -c 2>&1 | grep "Pregúntame\|pregúntame" | head -1 | sed 's/.*\[ref=\([^]]*\)\].*/\1/')
echo "IA input ref: $IA_INPUT"
if [ -n "$IA_INPUT" ]; then
  agent-browser fill @$IA_INPUT "cuanto es 25 + 17?" 2>&1 | tail -1
  agent-browser press Enter 2>&1 | tail -1
  sleep 6
  agent-browser wait --load networkidle 2>&1 | tail -1
  # Scroll down to see response
  agent-browser scroll down 300 2>&1 | tail -1
  sleep 1
  agent-browser screenshot /home/z/my-project/final-3-ia-math.png 2>&1 | tail -1
  echo "=== IA math response ==="
  agent-browser snapshot -c 2>&1 | grep -iE "42|cuarenta|veinti" | head -5
fi

echo "[5] Test despachos page..."
agent-browser find text "Despachos" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/final-4-despachos.png 2>&1 | tail -1
echo "=== Despachos snapshot ==="
agent-browser snapshot -i -c 2>&1 | head -15

echo "[6] Test horario page..."
agent-browser find text "Horario" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/final-5-horario.png 2>&1 | tail -1

echo "[7] Test bloc page..."
agent-browser find text "Bloc" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/final-6-bloc.png 2>&1 | tail -1

echo "[8] Test config page..."
agent-browser find text "Avisos" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/final-7-avisos.png 2>&1 | tail -1

echo "[9] Final error check..."
echo "=== Console errors ==="
agent-browser errors 2>&1 | head -15
echo "=== Dev log ==="
tail -20 dev.log

echo "[DONE] Killing server..."
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
echo "=== FINAL TEST COMPLETE ==="
