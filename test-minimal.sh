#!/bin/bash
cd /home/z/my-project
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2
rm -rf .next

setsid bun run dev > dev.log 2>&1 < /dev/null &
for i in $(seq 1 40); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then echo "Ready ${i}s"; break; fi
  sleep 1
done

agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser screenshot /home/z/my-project/minimal-dashboard.png 2>&1 | tail -1

agent-browser find text "Inventario" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/minimal-inventario.png 2>&1 | tail -1

agent-browser find text "Equipos" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/minimal-equipos.png 2>&1 | tail -1

agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/minimal-pistolear.png 2>&1 | tail -1

agent-browser find text "Alana" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/minimal-alana.png 2>&1 | tail -1

agent-browser find text "Horario" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/minimal-horario.png 2>&1 | tail -1

agent-browser errors 2>&1 | head -10
echo "=== DEV LOG ==="
tail -8 dev.log
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
echo "=== DONE ==="
