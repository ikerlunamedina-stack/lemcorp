#!/bin/bash
cd /home/z/my-project
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"}],"equipos":[{"id":"e1","serie":"ZTE001","modelo":"ONT ZTE F660","estado":"disponible","ubicacion":"Almacen HUB","createdAt":1700000000000,"updatedAt":1700000000000},{"id":"e2","serie":"ZTE002","modelo":"ONT ZTE F660","estado":"averiado","ubicacion":"Taller","createdAt":1700000000000,"updatedAt":1700000000000}],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":false,"pistoleoPrefijo":"","pistoleoPrefijoEnabled":false},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser screenshot /home/z/my-project/circular-dashboard.png 2>&1 | tail -1
agent-browser find text "Equipos" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/circular-equipos.png 2>&1 | tail -1
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/circular-pistolear.png 2>&1 | tail -1
agent-browser errors 2>&1 | head -5
tail -5 dev.log
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
echo "=== DONE ==="
