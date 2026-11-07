require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Editar un pedido guardado: mismo ID, sin duplicados, coincidencias recalculadas y bloqueo si ya te uniste.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';

function loadStore() {
  const memory = {}; let failing = false;
  const c = { window: { dispatchEvent() {} }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { if (failing) throw Error('Storage unavailable'); memory[k] = v; }, removeItem: k => delete memory[k] } };
  vm.createContext(c);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), c);
  return { s: c.window.NexoraStore, memory, fail: v => { failing = v; } };
}
const join = (s, opp, need) => { const r = s.confirmParticipation(s.prepareParticipation(opp, need).proposal); assert.ok(r.participation, r.error); return r.participation; };

// 1 · Conserva el ID, el pedido y la fecha de creación; no crea duplicados; solo cambian cantidad, fecha, zona y precio.
{
  const { s } = loadStore(), today = s.today();
  const n = s.register('12 botellas de aceite', [{ k: 'aceite', qty: 12, price: 7.8, presentation: 'Botella 1 L', brand: '' }], s.finDeSemana(), 'sa-centro').needs[0];
  const before = { needs: s.get().needs.length, orders: s.get().orders.length };
  const r = s.updateNeed(n.id, { qty: 20, price: 9, date: s.after(today, 4), zone: 'sa-centro' });
  assert.ok(!r.error, r.error);
  const after = s.get().needs.find(x => x.id === n.id);
  assert.equal(s.get().needs.length, before.needs, 'No crea un pedido nuevo');
  assert.equal(s.get().orders.length, before.orders, 'No crea un registro de pedido nuevo');
  assert.equal(new Set(s.get().needs.map(x => x.id)).size, s.get().needs.length, 'Sin IDs repetidos');
  assert.deepEqual([after.id, after.orderId, after.createdAt, after.productId, after.presentation, after.unit, after.brand], [n.id, n.orderId, n.createdAt, n.productId, n.presentation, n.unit, n.brand], 'Conserva ID, pedido y fecha de creación');
  assert.deepEqual([after.qty, after.priceIndividual, after.requiredDate, after.zoneId], [20, 9, s.after(today, 4), 'sa-centro']);
  assert.equal(JSON.stringify(r.need), JSON.stringify(after));
}

// 2 · Recalcula las coincidencias al guardar.
{
  const { s } = loadStore(), today = s.today();
  const n = s.register('12 botellas de aceite', [{ k: 'aceite', qty: 12, price: null, presentation: 'Botella 1 L', brand: '' }], s.finDeSemana(), 'sa-centro').needs[0];
  assert.deepEqual([n.status, Array.from(n.opportunityIds)], ['Con coincidencia', ['op1']]);
  const edit = patch => { const r = s.updateNeed(n.id, Object.assign({ qty: 12, price: null, date: s.finDeSemana(), zone: 'sa-centro' }, patch)); assert.ok(!r.error, r.error); return s.get().needs.find(x => x.id === n.id); };
  let m = edit({ date: s.after(today, 20) });
  assert.deepEqual([m.status, m.opportunityIds.length], ['Registrada', 0], 'Fecha fuera de la ventana: sin coincidencia');
  assert.equal(s.noMatchReason(m).kind, 'date');
  m = edit({});
  assert.deepEqual([m.status, Array.from(m.opportunityIds)], ['Con coincidencia', ['op1']], 'Vuelve a coincidir al corregir la fecha');
  m = edit({ zone: 'ves-sector1' });
  assert.deepEqual([m.status, m.opportunityIds.length], ['Registrada', 0], 'Otra zona: sin coincidencia');
  assert.equal(s.get().needs.filter(x => x.id === n.id).length, 1);
}

// 3 · Valida igual que el registro y no cambia nada si algo es inválido o falla el guardado.
{
  const f = loadStore(), s = f.s, today = s.today(), need = s.get().needs[0], good = { qty: 12, price: null, date: s.finDeSemana(), zone: 'sa-centro' };
  const snapshot = JSON.stringify(s.get()), disk = f.memory[key];
  for (const bad of [{ qty: 0 }, { qty: 1.5 }, { qty: null }, { price: 0 }, { price: 1.234 }, { date: s.after(today, -1) }, { date: 'no es fecha' }, { zone: 'zona-inexistente' }]) assert.ok(s.updateNeed(need.id, Object.assign({}, good, bad)).error, JSON.stringify(bad));
  assert.ok(s.updateNeed('NO-EXISTE', good).error);
  assert.equal(JSON.stringify(s.get()), snapshot, 'Un cambio inválido no modifica nada');
  f.fail(true);
  assert.ok(s.updateNeed(need.id, Object.assign({}, good, { qty: 30 })).error);
  assert.equal(JSON.stringify(s.get()), snapshot);assert.equal(f.memory[key], disk, 'Un fallo de guardado conserva el pedido anterior');
  f.fail(false);
  assert.ok(s.updateNeed('NEC-DEMO-4', good).error, 'Un borrador no se edita');
}

// 4 · Bloquea si ya te uniste con ese pedido; al retirarte vuelve a poder editarse.
{
  const { s } = loadStore(), today = s.today(), change = { qty: 10, price: null, date: s.after(today, 3), zone: 'sa-centro' };
  const p = join(s, 'op1', 'NEC-DEMO-1');
  const snapshot = JSON.stringify(s.get());
  const blocked = s.updateNeed('NEC-DEMO-1', change);
  assert.equal(blocked.error, 'Ya te uniste con este pedido. Para cambiarlo, primero retírate.');
  assert.equal(blocked.participationId, p.id);
  assert.equal(JSON.stringify(s.get()), snapshot, 'No cambia nada si ya te uniste');
  assert.ok(!s.confirmWithdrawal(s.prepareWithdrawal(p.id).proposal).error);assert.equal(s.participationById(p.id).status, 'Retirada');
  const ok = s.updateNeed('NEC-DEMO-1', change);
  assert.ok(!ok.error, ok.error);
  assert.equal(s.get().needs.find(x => x.id === 'NEC-DEMO-1').qty, 10);
}

// 5 · Página de registro en modo edición.
function flowFixture(search, prepare) {
  const memory = {}, nodes = {}, listeners = {}, heading = { textContent: '' };
  function node(id) { return nodes[id] ||= { id, value: '', innerHTML: '', textContent: '', hidden: true, handlers: {}, dataset: {}, attrs: {}, addEventListener(k, f) { this.handlers[k] = f; }, setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, querySelector() { return null; }, querySelectorAll() { return []; } }; }
  const c = { window: { dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); }, addEventListener(k, f) { (listeners[k] ||= []).push(f); }, NexoraDemo: { requireSession: () => true }, NexoraProductImages: require('./helpers/imagenes-producto.cjs') },
    Event: function (type) { this.type = type; }, CustomEvent: function (type, o) { this.type = type; this.detail = o && o.detail; }, URLSearchParams, Intl, Date, setTimeout: f => { f(); return 0; }, clearTimeout() {}, requestAnimationFrame: f => f(),
    location: { pathname: '/pages/comprador/necesidad-nueva.html', search, hash: '', assign(u) { c.assigned = u; } }, history: { replaceState() {} },
    sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem(k) { delete memory[k]; } },
    document: { body: { dataset: { flow: 'page' } }, title: '', getElementById: node, querySelector: s => s === '.hello h1' ? heading : null, activeElement: null, contains: () => true } };
  vm.createContext(c);
  for (const f of ['datos-demo', 'estado-demo']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f + '.js', 'utf8'), c);
  c.window.NexoraUI = { esc: s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'), ic: n => '<svg data-ic="' + n + '"></svg>', money: n => 'S/ ' + n.toFixed(2), buyerHref: s => s, toast() {}, renderIdentity() {}, plain: t => String(t || '').replace(/\s*\(demo\)/gi, '') };
  if (prepare) prepare(c.window.NexoraStore);
  vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/flujo-necesidad.js', 'utf8'), c);
  vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/necesidad-nueva.js', 'utf8'), c);
  const surface = node('flow-page');
  return { c, node, heading, store: c.window.NexoraStore, act: (a, extra = {}) => surface.handlers.click({ target: { closest: () => ({ dataset: { a, ...extra } }) } }), input: (dataset, value, id = '') => surface.handlers.input({ target: { dataset, value, id } }) };
}
const visible = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
{
  const f = flowFixture('?editar=NEC-DEMO-1'), before = JSON.stringify(f.store.get().needs.map(n => n.id));
  assert.equal(f.heading.textContent, 'Editar pedido');assert.equal(f.node('dt').textContent, 'Editar pedido');
  const mb = f.node('mb').innerHTML, aside = f.node('nr-aside').innerHTML;
  assert.ok(mb.includes('Aceite vegetal')&&mb.includes('data-q="0"')&&mb.includes('value="12"'), 'Muestra el pedido con sus datos actuales');
  assert.ok(!mb.includes('Agregar producto')&&!mb.includes('Quitar')&&!mb.includes('data-a="add"'), 'Un solo producto: sin «Agregar producto» ni «Quitar»');
  assert.ok(aside.includes('>Guardar cambios<')&&!aside.includes('Guardar mi pedido'));assert.equal(f.node('stp').innerHTML, '');
  f.input({ q: '0' }, '15');
  f.act('save');
  assert.equal(f.c.assigned, 'necesidad.html?id=NEC-DEMO-1&guardado=1', 'Vuelve al detalle de la misma necesidad');
  const needs = f.store.get().needs;
  assert.equal(JSON.stringify(needs.map(n => n.id)), before, 'No crea pedidos nuevos');
  assert.equal(needs.find(n => n.id === 'NEC-DEMO-1').qty, 15);
}
{
  const f = flowFixture('?editar=NEC-DEMO-1', s => join(s, 'op1', 'NEC-DEMO-1')), p = f.store.ownParticipations()[0];
  assert.equal(f.node('dt').textContent, 'Editar pedido');
  assert.ok(visible(f.node('mb').innerHTML).includes('Ya te uniste con este pedido. Para cambiarlo, primero retírate.'));
  assert.ok(f.node('mf').innerHTML.includes('>Ver mi participación<')&&f.node('mf').innerHTML.includes('href="participacion.html?id=' + p.id + '"'));
  assert.equal(f.node('nr-aside').innerHTML, '');
}
{
  const detail = fs.readFileSync('assets/js/comprador/necesidad.js', 'utf8');
  assert.ok(detail.includes('necesidad-nueva.html?editar=')&&!detail.includes('necesidad-nueva.html?producto='));
  assert.ok(detail.includes('✓ Cambios guardados')&&detail.includes("get('guardado') === '1'"));
}
console.log('OK: updateNeed keeps ID/order/creation date without duplicates, recalculates matches, validates atomically, blocks when joined; edit page has one product, «Guardar cambios» and returns to the detail');
