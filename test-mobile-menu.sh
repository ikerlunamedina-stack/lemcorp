#!/bin/bash
cd /home/z/my-project
# Simular móvil: 390x844 (iPhone 12 Pro)
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser set viewport 390 844 2>&1 | tail -1
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
echo "=== Mobile dashboard ==="
agent-browser screenshot /home/z/my-project/mobile-bug-1.png 2>&1 | tail -1
echo "=== Snapshot antes de abrir menú ==="
agent-browser snapshot -i -c 2>&1 | head -15
echo "=== Click en menú hamburguesa (3 rallas) ==="
# Buscar el botón del menú
agent-browser find text "Abrir menú" click 2>&1 | tail -1
sleep 2
agent-browser screenshot /home/z/my-project/mobile-bug-2.png 2>&1 | tail -1
echo "=== Snapshot con menú abierto ==="
agent-browser snapshot -i -c 2>&1 | head -30
echo "=== Errors ==="
agent-browser errors 2>&1 | head -10
echo "=== Done ==="
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
