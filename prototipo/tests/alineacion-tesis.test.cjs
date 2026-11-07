require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Alineación del comprador con la tesis: tramos y mínimo, ahorro estimado, estados, «No me interesa», retiro, marca y zona.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const plain = v => JSON.parse(JSON.stringify(v));

function loadStore(stored) {
  const memory = stored ? { 'nexora.comprador.demo.v1': stored } : {};
  const c = { window: { dispatchEvent() {} }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem: k => delete memory[k] } };
  vm.createContext(c);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), c);
  return { s: c.window.NexoraStore, memory };
}
const join = (s, opp, need) => { const o = s.get().opps.find(x => x.id === opp), e = o.estado; if (e === 'confirmada') o.estado = 'en_cotizacion'; const r = s.confirmParticipation(s.prepareParticipation(opp, need).proposal); assert.ok(r.participation, r.error); s.get().opps.find(x => x.id === opp).estado = e; return r.participation; };

// 1 · Tramos, mínimo y lo que falta.
{
  const { s } = loadStore(), op = id => s.get().opps.find(o => o.id === id);
  assert.deepEqual(plain(op('op1').tramos), [{ desde: 1, hasta: 49, precio: 7.8 }, { desde: 50, hasta: 99, precio: 7 }, { desde: 100, hasta: null, precio: 6.4 }]);
  assert.equal(op('op1').minimo, 50);
  // Aceite: 38 unidades, cerca del mínimo (faltan 12) y todavía en el precio normal.
  assert.deepEqual(plain(s.resumenCompra(op('op1'))), { total: 38, tramo: 0, tramos: 3, precio: 7.8, precioNormal: 7.8, minimo: 50, alcanzaMinimo: false, faltaMinimo: 12, siguienteTramo: { faltan: 12, precio: 7 } });
  // Detergente: mínimo alcanzado, a 4 unidades del siguiente tramo.
  assert.deepEqual(plain(s.faltaSiguienteTramo(op('op2'))), { faltan: 4, precio: 10.6 });
  assert.equal(s.precioTramo(op('op2')), 11.4); assert.ok(s.alcanzaMinimo(op('op2')));
  // Vasos: último tramo, no hay siguiente.
  assert.equal(s.precioTramo(op('op3')), 7.48); assert.equal(s.faltaSiguienteTramo(op('op3')), null);
  // Arroz: lejos del mínimo.
  assert.equal(s.faltaMinimo(op('op4')), 40); assert.ok(!s.alcanzaMinimo(op('op4')));
  // Unidades hipotéticas (mi pedido antes de unirme) y la mía al unirme: 38 + 12 = 50 → tramo 2.
  assert.equal(s.precioTramo(op('op1'), 12), 7);
  join(s, 'op1', 'NEC-DEMO-1');
  assert.equal(s.cantidadTotal(op('op1')), 50); assert.equal(s.precioTramo(op('op1')), 7); assert.ok(s.alcanzaMinimo(op('op1')));
  // Una sesión guardada antes de este cambio recibe los campos nuevos sin perder los existentes.
  const old = plain(s.get()); old.opps.forEach(o => { delete o.tramos; delete o.minimo; delete o.participantesDemo; });
  const again = loadStore(JSON.stringify(old)).s;
  assert.equal(again.cantidadTotal(again.get().opps[0]), 50); assert.equal(again.get().participations.length, 1);
}
console.log('OK: tramos, mínimo, faltantes y migración de sesiones antiguas');

// 2 · Ahorro neto estimado = (precio comparable − precio del tramo alcanzado) × cantidad − costos conocidos.
{
  const { s } = loadStore(), op = id => s.get().opps.find(o => o.id === id), need = id => s.get().needs.find(n => n.id === id);
  // Aceite: 38 + mis 12 = 50 → S/ 7.00; (7.80 − 7.00) × 12 = 9.60; transporte desconocido → preliminar.
  let a = s.ahorroEstimado(need('NEC-DEMO-1'), op('op1'));
  assert.deepEqual([a.precioComparable, a.referencial, a.precioTramo, a.bruto, a.costos, a.neto, a.preliminar], [7.8, false, 7, 9.6, 0, 9.6, true]);
  // Detergente: 56 + 8 = 64 → S/ 10.60; (12.50 − 10.60) × 8 = 15.20; transporte conocido (S/ 0).
  a = s.ahorroEstimado(need('NEC-DEMO-2'), op('op2'));
  assert.deepEqual([a.precioTramo, a.neto, a.preliminar], [10.6, 15.2, false]);
  // Vasos: (8.50 − 7.48) × 6 − S/ 3.00 de transporte = 3.12.
  a = s.ahorroEstimado(need('NEC-DEMO-3'), op('op3'));
  assert.deepEqual([a.bruto, a.costos, a.neto], [6.12, 3, 3.12]);
  // Sin «precio de hoy»: usa el precio normal del proveedor y lo marca como referencial.
  const today = s.today(), sinPrecio = s.register('10 botellas de aceite', [{ k: 'aceite', qty: 10, price: null, presentation: 'Botella 1 L', brand: '' }], s.finDeSemana(), 'sa-centro').needs[0];
  a = s.ahorroEstimado(sinPrecio, op('op1'));
  assert.deepEqual([a.referencial, a.precioComparable, a.precioTramo, a.neto], [true, 7.8, 7.8, 0], '38 + 10 = 48: aún en el precio normal');
  // Al unirme, mi cantidad ya cuenta en el total y no se suma dos veces.
  s.selectNeed('op1', 'NEC-DEMO-1'); join(s, 'op1', 'NEC-DEMO-1');
  a = s.ahorroEstimado(need('NEC-DEMO-1'), op('op1'));
  assert.deepEqual([a.precioTramo, a.neto], [7, 9.6]);
  // Ahorro de todo el grupo con el tramo alcanzado: (7.90−7)×14 + (7.80−7)×12 + (8−7)×12 + (7.80−7)×12.
  assert.equal(s.ahorroGrupo(op('op1')), 43.8);
}
console.log('OK: ahorro estimado, referencial y preliminar; ahorro del grupo');

// 3 · Estados: 7 internos → 4 visibles, con fechas relativas a hoy.
{
  const { s } = loadStore(), op = id => s.get().opps.find(o => o.id === id), today = s.today();
  assert.deepEqual(plain(s.estadosInternos), ['propuesta', 'buscando_participantes', 'en_cotizacion', 'precio_por_aceptar', 'confirmada', 'cancelada', 'vencida']);
  assert.deepEqual(['op1', 'op2', 'op3', 'op4'].map(id => s.estadoVisible(op(id)).texto), ['Reuniendo negocios', 'Esperando precio del proveedor', 'Confirmada', 'No se concretó']);
  assert.deepEqual(['op1', 'op2', 'op3', 'op4'].map(id => op(id).estadoDesde), [s.after(today, -3), s.after(today, -1), s.after(today, -1), s.after(today, -2)]);
  // Bajo el mínimo (op1) siempre reúne; con el mínimo (op2) espera precio. Unirse nunca confirma.
  const vis = id => e => s.estadoVisible(Object.assign({}, op(id), { estado: e })).clave;
  assert.deepEqual(plain(s.estadosInternos.map(vis('op1'))), ['reuniendo', 'reuniendo', 'reuniendo', 'reuniendo', 'confirmada', 'no_se_concreto', 'no_se_concreto']);
  assert.deepEqual(plain(s.estadosInternos.map(vis('op2'))), ['esperando_precio', 'esperando_precio', 'esperando_precio', 'esperando_precio', 'confirmada', 'no_se_concreto', 'no_se_concreto']);
  // Una compra que cierra sin confirmarse pasa a «No se concretó»; una confirmada sigue confirmada.
  assert.equal(s.estadoCompra(Object.assign({}, op('op2'), { closeDate: s.after(today, -1) })), 'vencida');
  assert.equal(s.estadoCompra(Object.assign({}, op('op3'), { closeDate: s.after(today, -1) })), 'confirmada');
  // El ahorro pasa de «estimado» a «confirmado» cuando el proveedor confirma el precio.
  const need = id => s.get().needs.find(n => n.id === id);
  assert.equal(s.ahorroEstimado(need('NEC-DEMO-3'), op('op3')).estado, 'confirmado');
  assert.equal(s.ahorroEstimado(need('NEC-DEMO-2'), op('op2')).estado, 'estimado');
}
console.log('OK: estados internos y visibles; ahorro confirmado');

// 4 · «No me interesa» con deshacer; al retirarse se recalcula todo y, si cambia el tramo, hay aviso interno.
{
  const { s } = loadStore(), op = id => s.get().opps.find(o => o.id === id);
  assert.ok(!s.descartada('op2', 'NEC-DEMO-2'));
  assert.ok(s.noMeInteresa('op2', 'NEC-DEMO-2').descarte);
  assert.ok(s.descartada('op2', 'NEC-DEMO-2')); assert.equal(s.get().descartes.length, 1);
  s.noMeInteresa('op2', 'NEC-DEMO-2'); assert.equal(s.get().descartes.length, 1, 'No se duplica');
  assert.ok(!s.descartada('op1', 'NEC-DEMO-2'), 'Es por compra y por pedido');
  assert.ok(!s.deshacerNoMeInteresa('op2', 'NEC-DEMO-2').error); assert.ok(!s.descartada('op2', 'NEC-DEMO-2'));
  assert.ok(s.noMeInteresa('nada', 'NEC-DEMO-2').error);
  // Retiro que baja de tramo: aceite 50 → 38, S/ 7.00 → S/ 7.80.
  const p = join(s, 'op1', 'NEC-DEMO-1');
  assert.ok(s.noMeInteresa('op1', 'NEC-DEMO-1').error, 'No se descarta si ya te uniste');
  assert.equal(s.ahorroGrupo(op('op1')), 43.8);
  assert.ok(!s.confirmWithdrawal(s.prepareWithdrawal(p.id).proposal).error);
  assert.deepEqual([s.cantidadTotal(op('op1')), s.precioTramo(op('op1'))], [38, 7.8]);
  assert.equal(s.ahorroGrupo(op('op1')), 3.8, 'El ahorro de todos se recalcula con el precio normal');
  assert.equal(s.ahorroEstimado(s.get().needs[0], op('op1')).precioTramo, 7, 'Si vuelvo a unirme, vuelvo al tramo 2');
  const avisos = s.avisosInternos(op('op1'));
  assert.deepEqual(plain(avisos.map(a => [a.text, a.precioAntes, a.precioDespues, a.date])), [['El precio cambió porque un negocio se retiró', 7, 7.8, s.today()]]);
  assert.ok(s.get().notifs[0].text.startsWith('El precio cambió porque un negocio se retiró'));
  // Retiro que no cambia de tramo: vasos 54 → 48, sigue en S/ 7.48; sin aviso.
  const v = join(s, 'op3', 'NEC-DEMO-3');
  s.confirmWithdrawal(s.prepareWithdrawal(v.id).proposal);
  assert.equal(s.precioTramo(op('op3')), 7.48); assert.equal(s.avisosInternos(op('op3')).length, 0);
}
console.log('OK: «No me interesa» con deshacer; recálculo y aviso al retirarse');

// 5 · Marca: vacía = «Cualquier marca»; «solo esta marca» exige que coincida.
{
  const { s } = loadStore(), today = s.today(), item = extra => Object.assign({ k: 'aceite', qty: 12, price: 7.8, presentation: 'Botella 1 L' }, extra);
  assert.deepEqual(['op1', 'op2', 'op3', 'op4'].map(id => s.get().opps.find(o => o.id === id).marca), ['Girasol Andino', 'Espuma Plus', 'Descartex', 'Grano Real']);
  const demo = s.get().needs[0]; assert.deepEqual([demo.marca, demo.soloEstaMarca, s.marcaTexto(demo)], ['', false, 'Cualquier marca']);
  const reg = extra => s.register('aceite', [item(extra)], s.finDeSemana(), 'sa-centro').needs[0];
  let n = reg({ marca: 'Otra Marca', soloEstaMarca: false });
  assert.deepEqual(plain(n.opportunityIds), ['op1'], 'Acepta similares');
  n = reg({ marca: 'Otra Marca', soloEstaMarca: true });
  assert.deepEqual([n.status, n.opportunityIds.length], ['Registrada', 0]);
  assert.deepEqual(plain(s.noMatchReason(n)), { kind: 'brand', text: 'Solo aceptas la marca Otra Marca.' });
  n = reg({ marca: 'girasol andino', soloEstaMarca: true });
  assert.deepEqual(plain(n.opportunityIds), ['op1'], 'Misma marca (sin importar mayúsculas)');
  n = reg({ marca: '', soloEstaMarca: true });
  assert.deepEqual([n.soloEstaMarca, n.opportunityIds.length], [false, 1], 'Sin marca no hay «solo esta marca»');
  // Editar el pedido conserva la marca y la regla.
  const strict = reg({ marca: 'Otra Marca', soloEstaMarca: true });
  const r = s.updateNeed(strict.id, { qty: 20, price: 7.8, date: s.finDeSemana(), zone: 'sa-centro' });
  assert.deepEqual([r.need.marca, r.need.soloEstaMarca, r.need.opportunityIds.length], ['Otra Marca', true, 0]);
  assert.equal(s.updateNeed(strict.id, { qty: 20, price: 7.8, date: s.finDeSemana(), zone: 'sa-centro', soloEstaMarca: false }).need.opportunityIds.length, 1);
}
console.log('OK: marca estricta o similares');

// 6 · Ubicación del negocio, zonas por distrito, zona por defecto y zonas compatibles.
{
  const { s } = loadStore(), today = s.today(), u = s.get().user;
  assert.deepEqual([u.direccion, u.distrito, u.zona], ['Jr. Las Begonias 245 (demo)', 'Santa Anita', 'sa-centro']);
  assert.deepEqual(plain(s.zonasPorDistrito()), [{ distrito: 'Santa Anita', zonas: [{ id: 'sa-centro', name: 'Santa Anita · zona Centro (demo)' }] }, { distrito: 'Villa El Salvador', zonas: [{ id: 'ves-sector1', name: 'Villa El Salvador · Sector 1 (demo)' }] }]);
  assert.equal(s.zonaPorDefecto(), 'sa-centro');
  const item = { k: 'aceite', qty: 5, price: null, presentation: 'Botella 1 L' };
  let n = s.register('aceite', [item], s.finDeSemana()).needs[0];
  assert.deepEqual([n.zoneId, plain(n.opportunityIds)], ['sa-centro', ['op1']], 'Sin zona: usa la del negocio');
  n = s.register('aceite', [item], s.finDeSemana(), 'ves-sector1').needs[0];
  assert.equal(n.opportunityIds.length, 0, 'Otra zona, no compatible');
  assert.ok(!s.zonasCompatibles('ves-sector1', 'sa-centro'));
  s.zones.find(z => z.id === 'ves-sector1').compatibles.push('sa-centro');
  assert.ok(s.zonasCompatibles('ves-sector1', 'sa-centro') && s.zonasCompatibles('sa-centro', 'ves-sector1'));
  n = s.register('aceite', [item], s.finDeSemana(), 'ves-sector1').needs[0];
  assert.deepEqual(plain(n.opportunityIds), ['op1'], 'Zona marcada como compatible');
  // Editar sin zona conserva la del pedido.
  assert.equal(s.updateNeed(n.id, { qty: 6, price: null, date: s.finDeSemana() }).need.zoneId, 'ves-sector1');
  // Una sesión sin ubicación la recibe desde sus datos anteriores.
  const old = plain(s.get()); delete old.user.direccion; delete old.user.distrito; delete old.user.zona; old.user.zoneId = 'ves-sector1';
  const again = loadStore(JSON.stringify(old)).s;
  assert.deepEqual([again.get().user.zona, again.zonaPorDefecto()], ['ves-sector1', 'ves-sector1']);
}
console.log('OK: ubicación del negocio, zona por defecto y zonas compatibles');
