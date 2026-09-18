#!/bin/bash
# Beta test script - runs server + all browser tests in one session
cd /home/z/my-project

pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

setsid bun run dev > dev.log 2>&1 < /dev/null &
echo "[1/8] Server starting..."
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "[1/8] Server ready after ${i}s"
    break
  fi
  sleep 1
done

echo "[2/8] Opening browser..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1

echo "[3/8] Setting localStorage to skip onboarding..."
agent-browser storage local set "lemcorp-onboarding-done-v1" "1" 2>&1 | tail -1
agent-browser storage local set "lemcorp-v3" '{"state":{"products":[{"id":"p1","sku":"CONN-001","name":"Conector SC/APC","quantity":1500,"minStock":200,"udm":"UNIDADES"},{"id":"p2","sku":"CAB-FO","name":"Cable Fibra Optica","quantity":800,"minStock":100,"udm":"METROS"},{"id":"p3","sku":"ONT-ZTE","name":"ONT ZTE F660","quantity":45,"minStock":50,"udm":"UNIDADES"},{"id":"p4","sku":"SPL-1x8","name":"Splitter 1x8","quantity":120,"minStock":30,"udm":"UNIDADES"}],"equipos":[],"entradas":[],"despachos":[],"notas":[],"recordatorios":[],"notificaciones":[],"miembros":[],"pistoleoFilas":[],"horario":[],"memoriaIA":[],"empresa":{"id":"e1","nombre":"Lemcorp","ruc":"20512345678","direccion":"Av. Lima 123","telefono":"+51 999 888 777"},"settings":{"usuario":"Iker","tema":"claro","vozActivada":true,"pistoleoPrefijo":"ZTE","pistoleoPrefijoEnabled":true},"pistoleoCampo":"serie","pistoleoModelo":"","pistoleoEstado":"disponible","bajoStockVisto":0,"sesionUsuarioId":null},"version":11}' 2>&1 | tail -1

echo "[4/8] Reloading..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 5
agent-browser wait --load networkidle 2>&1 | tail -1

echo "[5/8] Dashboard snapshot..."
agent-browser snapshot -i -c 2>&1 | head -40
agent-browser screenshot /home/z/my-project/beta-dashboard.png 2>&1 | tail -1

echo "[6/8] Checking for console errors..."
agent-browser errors 2>&1 | head -20

echo "[7/8] Navigating to pistolear..."
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser snapshot -i -c 2>&1 | head -30
agent-browser screenshot /home/z/my-project/beta-pistolear.png 2>&1 | tail -1

echo "[8/8] Testing heavy load - injecting 1000 series via JS..."
agent-browser eval "
(function(){
  try {
    var raw = localStorage.getItem('lemcorp-v3');
    var data = JSON.parse(raw);
    var equipos = [];
    for (var i = 1; i <= 1000; i++) {
      var serie = 'ZTE' + String(i).padStart(6, '0');
      equipos.push({
        id: 'eq' + i,
        serie: serie,
        modelo: i % 3 === 0 ? 'ONT ZTE F660' : (i % 3 === 1 ? 'Splitter 1x8' : 'Conector SC/APC'),
        estado: i % 10 === 0 ? 'averiado' : 'disponible',
        ubicacion: 'Almacen HUB',
        mac: i % 2 === 0 ? 'AA:BB:CC:DD:EE:' + String(i).padStart(2,'0').slice(-2) : undefined,
        cmMac: undefined,
        observacion: '',
        createdAt: Date.now() - i * 1000,
        updatedAt: Date.now()
      });
    }
    data.state.equipos = equipos;
    // Add 50 products too
    var products = data.state.products.slice();
    for (var j = 5; j <= 50; j++) {
      products.push({
        id: 'p' + j,
        sku: 'SKU-' + String(j).padStart(4, '0'),
        name: 'Producto ' + j,
        quantity: Math.floor(Math.random() * 500) + 10,
        minStock: 50,
        udm: 'UNIDADES'
      });
    }
    data.state.products = products;
    localStorage.setItem('lemcorp-v3', JSON.stringify(data));
    return 'OK: ' + equipos.length + ' equipos, ' + products.length + ' productos';
  } catch(e) { return 'ERROR: ' + e.message; }
})()
" 2>&1 | tail -5

echo "[done] Reloading to apply heavy data..."
agent-browser open http://localhost:3000/ 2>&1 | tail -1
sleep 6
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-heavy-dashboard.png 2>&1 | tail -1

echo "[done] Navigate to series (1000 items)..."
agent-browser find text "Series" click 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-heavy-series.png 2>&1 | tail -1
agent-browser snapshot -i -c 2>&1 | head -20

echo "[done] Navigate to equipos..."
agent-browser find text "Equipos" click 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-heavy-equipos.png 2>&1 | tail -1

echo "[done] Navigate to inventario (50 products)..."
agent-browser find text "Inventario" click 2>&1 | tail -1
sleep 4
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-heavy-inventario.png 2>&1 | tail -1

echo "[done] Navigate to pistolear and test input..."
agent-browser find text "Pistolear" click 2>&1 | tail -1
sleep 3
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser screenshot /home/z/my-project/beta-heavy-pistolear.png 2>&1 | tail -1

echo "[done] Check console errors after heavy load..."
agent-browser errors 2>&1 | head -20

echo "[done] Check dev log for errors..."
tail -20 dev.log

echo "[DONE] All tests complete. Killing server."
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
echo "=== BETA TEST COMPLETE ==="
