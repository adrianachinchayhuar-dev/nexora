// El calendario de la demo es relativo a «hoy»: la fecha del escenario es la de Lima y las ventanas
// y cierres de las compras en grupo se calculan desde ella. Así «Esta semana» y «Próxima semana» siempre coinciden.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');

function load(today) {
  const memory = {}, c = { window: { dispatchEvent() {}, NEXORA_DEMO_TODAY: today }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem: k => delete memory[k] } };
  vm.createContext(c);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), c);
  return c.window.NexoraStore;
}

for (const today of ['2026-10-13', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07', '2027-02-28', '2028-02-28']) {
  const s = load(today), after = s.after;
  assert.equal(s.today(), today, 'La fecha del escenario es hoy');
  const byProduct = id => s.get().opps.find(o => o.product === id);
  // Los cierres se calculan desde el domingo de «Esta semana»: aceite y vasos entregan a tiempo; detergente, la próxima semana.
  const domingo = s.finDeSemana(), d = (Date.parse(domingo) - Date.parse(today)) / 864e5, ventana = Math.max(14, d + 8);
  assert.ok(d >= 2 && d <= 8, 'Queda tiempo de cerrar y entregar');
  for (const [id, close] of [['aceite', Math.max(1, d - 2)], ['detergente', d + 2], ['vasos', d - 1]]) {
    const o = byProduct(id);
    assert.deepEqual([o.from, o.until, o.closeDate, s.opportunityStatus(o)], [today, after(today, ventana), after(today, close), 'abierta'], id);
    assert.ok(o.closeDate < o.entregaDesde && o.entregaDesde <= o.entregaHasta, 'La entrega va después del cierre');
  }
  for (const id of ['aceite', 'vasos']) assert.ok(byProduct(id).entregaHasta <= domingo, id + ' llega esta semana');
  assert.ok(byProduct('detergente').entregaHasta > domingo && byProduct('detergente').entregaHasta <= s.finProximaSemana());
  const arroz = byProduct('arroz');
  assert.deepEqual([arroz.closeDate, s.opportunityStatus(arroz)], [after(today, -2), 'cerrada']);
  assert.ok(s.get().opps.every(o => !('untilDays' in o)), 'La ventana no se guarda como campo extra');
  // Las necesidades de ejemplo se mueven con el mismo desplazamiento y siguen coincidiendo.
  const need = s.get().needs[0];
  assert.equal(need.requiredDate, domingo);
  assert.equal(need.createdAt, today + 'T12:00:00Z');
  assert.ok(s.compatibleNeeds(byProduct('aceite')).some(n => n.id === need.id));
  // Pedido de prueba: 12 botellas de aceite (Botella 1 L), Santa Anita · Centro.
  const llega = byProduct('aceite').entregaHasta;
  for (let n = 0; n <= ventana; n++) { const fecha = after(today, n); assert.equal(s.matches('aceite', 'sa-centro', fecha, 'Botella 1 L', 'botellas').length, fecha >= llega ? 1 : 0, 'Coincide solo si la entrega llega a tiempo: +' + n); }
  assert.equal(s.matches('aceite', 'sa-centro', after(today, ventana + 1), 'Botella 1 L', 'botellas').length, 0, 'Fuera de la ventana no coincide');
  assert.equal(s.matches('aceite', 'sa-centro', today, 'Botella 1 L', 'botellas', { loAntesPosible: true }).length, 1, 'Lo antes posible acepta la primera entrega');
  // «Próxima semana» coincide con todas las abiertas; «Esta semana», con las que entregan antes del domingo.
  for (const [id, detail, unit] of [['aceite', 'Botella 1 L', 'botellas'], ['detergente', 'Bolsa 800 g', 'bolsas'], ['vasos', 'Paquete x 50', 'paquetes']]) {
    assert.equal(s.matches(id, 'sa-centro', s.finProximaSemana(), detail, unit).length, 1, id);
    assert.equal(s.matches(id, 'sa-centro', domingo, detail, unit).length, id === 'detergente' ? 0 : 1, id);
  }
  // Otra zona, otra presentación y arroz cerrado no coinciden.
  assert.equal(s.matches('aceite', 'ves-sector1', domingo, 'Botella 1 L', 'botellas').length, 0);
  assert.equal(s.matches('aceite', 'sa-centro', domingo, 'Botella 2 L', 'botellas').length, 0);
  assert.equal(s.matches('arroz', 'sa-centro', domingo, 'Por kilo', 'kg').length, 0);
  const saved = s.register('12 botellas de aceite', [{ k: 'aceite', qty: 12, price: null, presentation: 'Botella 1 L', brand: '' }], s.finProximaSemana(), 'sa-centro');
  assert.ok(!saved.error, saved.error);
  assert.equal(saved.needs[0].status, 'Con coincidencia');
  assert.deepEqual(Array.from(saved.needs[0].opportunityIds), ['op1']);
}
// Explicación de una línea cuando un pedido guardado no tiene compra en grupo.
{
  const today = '2026-11-03', s = load(today), need = Object.assign({}, s.get().needs[0], { status: 'Registrada' });
  assert.equal(s.noMatchReason(need), null, 'Con coincidencia no hay motivo');
  const reason = patch => s.noMatchReason(Object.assign({}, need, patch));
  assert.deepEqual(Object.assign({}, reason({ requiredDate: '2026-11-20' })), { kind: 'date', text: 'La compra en grupo de aceite vegetal acepta pedidos hasta el 17 nov. Cambia la fecha para unirte.' });
  assert.equal(reason({ zoneId: 'ves-sector1' }).text, 'Aún no hay compras en grupo en Villa El Salvador · Sector 1.');
  assert.equal(reason({ presentation: 'Botella 2 L' }).text, 'Aún no hay compra en grupo para esta presentación.');
  assert.equal(reason({ productId: 'fideos', product: 'Fideos', presentation: 'Paquete 500 g', unit: 'paquetes' }).text, 'Aún no hay compra en grupo para este producto.');
  assert.equal(reason({ productId: 'arroz', product: 'Arroz extra', presentation: 'Por kilo', unit: 'kg' }).text, 'La compra en grupo de arroz extra ya cerró.');
  assert.equal(s.noMatchReason(Object.assign({}, need, { status: 'Borrador', requiredDate: '2026-11-20' })), null, 'Un borrador no se explica');
}
// Sin fecha fijada, la fecha del escenario es la de hoy en Lima.
const limaHoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
assert.equal(load(undefined).today(), limaHoy);
console.log('OK: calendar relative to today in Lima, windows today..+14, closes +5/+7/+8, rice closed, week suggestions always match, other zone/presentation do not');
