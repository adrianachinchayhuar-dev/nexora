require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';
function load(memory = {}, fail = () => false) {
  const context = { window: { dispatchEvent() {} }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem: (k, v) => { if (fail(k)) throw new Error('Storage unavailable'); memory[k] = v; }, removeItem: k => { delete memory[k]; } } };
  vm.createContext(context);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), context);
  return { store: context.window.NexoraStore, data: context.window.NexoraData, memory };
}
const fixture = load(), s = fixture.store;
assert.equal(Object.keys(s.products).length, 6);
assert.deepEqual(Object.keys(s.categories), ['abarrotes','limpieza','descartables']);
for (const id of ['aceite','arroz','fideos','leche']) assert.equal(s.productById(id).categoryId, 'abarrotes');
assert.equal(s.productById('detergente').categoryId, 'limpieza');
assert.equal(s.productById('vasos').categoryId, 'descartables');
assert.equal(s.productById('inexistente'), null); assert.equal(s.productById('__proto__'), null);
for (const p of Object.values(s.products)) { assert.equal(p.image, null); assert.equal(p.provider, null); assert.equal(p.description, null); assert.equal(p.brand, ''); assert.equal(p.priceJoint, undefined); }
console.log('OK: six central products/categories, no invented photos/prices/providers and invalid IDs; interpreter behavior is covered by flujo-necesidad-seguro.test.cjs');
function items(id, qty = 2, price = null) { const p = s.productById(id); return [{ k: id, qty, presentation: p.detail, brand: '', price }]; }
for (const id of Object.keys(s.products)) {
  const before = s.get().needs.length, result = s.register('Registro estructurado desde Catálogo · ' + id, items(id, id === 'arroz' ? 1.25 : 2), '2026-10-18', 'sa-centro');
  assert.ok(!result.error, result.error); assert.equal(result.needs.length, 1); assert.equal(s.get().needs.length, before + 1);
  assert.equal(result.needs[0].unit, s.productById(id).unit); assert.equal(result.needs[0].presentation, s.productById(id).detail);
  assert.equal(result.needs[0].priceIndividual, null); assert.ok(s.get().orders.some(p => p.id === result.needs[0].orderId));
}
for (const qty of [null, 0, -1, 1.5]) assert.ok(s.register('Invalid', items('aceite', qty), '2026-10-18', 'sa-centro').error);
for (const price of [0, -1, 1.234]) assert.ok(s.register('Invalid', items('aceite', 2, price), '2026-10-18', 'sa-centro').error);
for (const date of ['', '2026-10-12', 'not-a-date']) assert.ok(s.register('Invalid', items('aceite'), date, 'sa-centro').error);
assert.ok(s.register('Invalid', items('aceite'), '2026-10-18', 'invalid-zone').error);
assert.ok(s.register('Invalid', [{...items('aceite')[0], presentation: ''}], '2026-10-18', 'sa-centro').error);
assert.ok(s.register('Invalid', [{...items('aceite')[0], k: '__proto__'}], '2026-10-18', 'sa-centro').error);
assert.equal(s.get().participations.length, 0);
console.log('OK: all six products register through shared validation, decimal kg, IDs/order links and invalid fields');

let failing = false;
const failure = load({}, k => failing && k === key), st = failure.store;
const before = JSON.stringify(st.get()), disk = failure.memory[key];
failing = true;
assert.ok(st.register('Failed', items('aceite'), '2026-10-18', 'sa-centro').error);
assert.equal(JSON.stringify(st.get()), before); assert.equal(failure.memory[key], disk);
failing = false;
assert.ok(!st.register('Retry', items('aceite'), '2026-10-18', 'sa-centro').error);
assert.equal(st.get().needs.length, 5); assert.equal(st.get().orders.length, 5);
assert.equal(st.get().notifs.length, 5);
console.log('OK: failed storage preserves needs/orders/notifications; retry creates exactly one need');

st.selectNeed('op1', 'NEC-DEMO-1');
let p = st.confirmParticipation(st.prepareParticipation('op1', 'NEC-DEMO-1').proposal).participation;
st.confirmWithdrawal(st.prepareWithdrawal(p.id).proposal);
st.selectNeed('op2', 'NEC-DEMO-2'); st.confirmParticipation(st.prepareParticipation('op2','NEC-DEMO-2').proposal);
const previous = JSON.stringify(st.get().participations), previousOps = JSON.stringify(st.get().opps), selections = JSON.stringify(st.get().selections);
failure.memory['nexora.comprador.opportunityFilters'] = '{"op-product":"aceite"}';
failure.memory['nexora.comprador.trackingFilters'] = '{"tracking-status":"Retirada"}';
failure.memory['nexora.comprador.catalogFilters'] = '{"category":"limpieza"}';
assert.ok(!st.register('Catálogo', items('leche', 2), '2026-10-18', 'sa-centro').error);
assert.equal(JSON.stringify(st.get().participations), previous); assert.equal(JSON.stringify(st.get().opps), previousOps); assert.equal(JSON.stringify(st.get().selections), selections);
const reloaded = load(failure.memory).store;
assert.equal(JSON.stringify(reloaded.get()), JSON.stringify(st.get()));
assert.equal(failure.memory['nexora.comprador.opportunityFilters'], '{"op-product":"aceite"}');
assert.equal(failure.memory['nexora.comprador.trackingFilters'], '{"tracking-status":"Retirada"}');
assert.equal(st.reset(false), true);
for (const k of ['opportunityFilters','trackingFilters','catalogFilters']) assert.equal(failure.memory['nexora.comprador.'+k], undefined);
assert.equal(st.get().needs.length, 4); assert.equal(st.ownParticipationCounts().historical, 0);
console.log('OK: existing confirmations/withdrawals/snapshots/selections/filters preserved across registration and reload; reset clears all filters');
