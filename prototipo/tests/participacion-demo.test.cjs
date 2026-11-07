require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Tests only the simulated shared store; no browser, backend or dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';
function load(memory = {}, fail = () => false) {
  const events = [];
  const context = { window: { dispatchEvent: e => events.push(e) }, Event: function (type) { this.type = type; }, sessionStorage: {
    getItem: k => memory[k] || null,
    setItem: (k, v) => { if (fail(k)) throw new Error('Storage unavailable'); memory[k] = v; },
    removeItem: k => { delete memory[k]; }
  } };
  vm.createContext(context);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), context);
  return { store: context.window.NexoraStore, memory, events, context };
}
function review(s, o = 'op1', n = 'NEC-DEMO-1') {
  s.selectNeed(o, n);
  const result = s.prepareParticipation(o, n);
  assert.ok(!result.error, result.error);
  return JSON.parse(JSON.stringify(result.proposal));
}
const fixture = load(), s = fixture.store;
const originalNeeds = JSON.stringify(s.get().needs), originalOrders = JSON.stringify(s.get().orders);
const prior = JSON.parse(JSON.stringify(s.get())); prior.version = 2; delete prior.user.id;
const raw = JSON.stringify(prior), migrated = load({ [key]: raw });
assert.equal(migrated.store.get().version, 3);
assert.equal(migrated.memory[key + '.backup-etapa3'], raw);
assert.equal(JSON.stringify(migrated.store.get().needs), originalNeeds);
assert.equal(JSON.stringify(migrated.store.get().orders), originalOrders);
assert.equal(migrated.store.get().user.id, 'NEG-DEMO-ROSITA');
console.log('OK: migration preserves needs/orders and exact backup');
const proposal = review(s);
assert.equal(s.get().participations.length, 0); // Reviewing/cancelling never writes.
const confirmed = s.confirmParticipation(proposal);
assert.ok(confirmed.participation);
assert.equal(confirmed.participation.status, 'Confirmada');
assert.equal(confirmed.participation.snapshot.qty, 12);
assert.equal(confirmed.participation.savingSnapshot.unit, 1.4);
assert.equal(confirmed.participation.savingSnapshot.total, 16.8);
assert.equal(confirmed.participation.simulation, true);
assert.equal(s.get().needs[0].status, 'Con coincidencia');
assert.ok(s.confirmParticipation(proposal).error); // Double submission.
assert.equal(s.get().participations.length, 1);
assert.equal(s.participationCounts('op1').participations, 1);
assert.equal(load(fixture.memory).store.get().participations[0].id, confirmed.participation.id);
assert.equal(s.canModifyNeed('NEC-DEMO-1', { qty: 13 }), false);
assert.equal(s.canModifyNeed('NEC-DEMO-1', { presentation: 'Botella 2 L' }), false);
assert.equal(s.canModifyNeed('NEC-DEMO-1', { productId: 'arroz' }), false);
assert.equal(s.canModifyNeed('NEC-DEMO-1', { unit: 'kg' }), false);
assert.equal(s.canModifyNeed('NEC-DEMO-1', { qty: 12 }), true);
const o = s.get().opps[0];
s.get().opps.push({ ...o, id: 'op-test' });
s.selectNeed('op-test', 'NEC-DEMO-1');
assert.ok(s.prepareParticipation('op-test', 'NEC-DEMO-1').error);
console.log('OK: explicit confirmation, duplicate/cross-opportunity blocking, persistence and edit guard');
const result = s.register('5 botellas de aceite', [{ k: 'aceite', qty: 5, presentation: 'Botella 1 L', brand: '', price: null }], '2026-10-18', 'sa-centro');
const n = result.needs[0];
const noPrice = review(s, 'op1', n.id);
assert.equal(noPrice.savingSnapshot, null);
assert.ok(s.confirmParticipation(noPrice).participation);
assert.equal(s.participationCounts('op1').participations, 2);
assert.equal(s.participationCounts('op1').businesses, 1);
assert.equal(o.lotQty, 144); assert.equal(o.interestedCount, 12);
assert.equal(s.get().needs.find(item => item.id === n.id).status, 'Con coincidencia');
s.get().opps[0].status = 'cerrada';
assert.equal(s.opportunityStatus(s.get().opps[0]), 'cerrada');
assert.equal(s.activeParticipations('op1').length, 2); // Closure preserves confirmed history.
assert.ok(s.prepareParticipation('op1', n.id).error);
s.get().participations[0].status = 'Retirada';
assert.equal(s.participationCounts('op1').participations, 1);
assert.equal(s.participationCounts('op1').businesses, 1);
assert.equal(s.participationForNeed(n.id), null);
console.log('OK: two needs/one business, null price, fixed lot/interested counts, closure and reserved Retirada');
for (const price of [6.4, 5]) {
  const f = load(), st = f.store;
  st.get().needs[0].priceIndividual = price;
  const p = review(st);
  assert.equal(p.savingSnapshot.hasSaving, false);
  assert.equal(p.savingSnapshot.total, 0);
  assert.ok(st.confirmParticipation(p).participation);
}
for (const patch of [{ zoneId: 'ves-sector1' }, { requiredDate: '2026-10-28' }, { status: 'Borrador' }, { status: 'Cancelada' }, { unit: 'kg' }, { presentation: 'Botella 2 L' }]) {
  const st = load().store; Object.assign(st.get().needs[0], patch);
  assert.ok(st.prepareParticipation('op1', 'NEC-DEMO-1').error);
}
assert.ok(load().store.prepareParticipation('op4', 'NEC-DEMO-4').error);
const stale = load().store, reviewed = review(stale);
stale.get().needs[0].qty = 13;
assert.ok(stale.confirmParticipation(reviewed).error);
assert.equal(stale.get().participations.length, 0);
const selection = load().store, first = review(selection);
const second = { ...selection.get().needs[0], id: 'NEC-SECOND' }; selection.get().needs.push(second);
selection.selectNeed('op1', second.id);
assert.ok(selection.confirmParticipation(first).error);
console.log('OK: no saving allowed; incompatibility, closure, stale data and changed reference rejected');
let failing = false;
const failed = load({}, k => failing && k === key), fp = review(failed.store);
const beforeMemory = JSON.stringify(failed.store.get()), beforeDisk = failed.memory[key];
failing = true;
assert.ok(failed.store.confirmParticipation(fp).error);
assert.equal(JSON.stringify(failed.store.get()), beforeMemory);
assert.equal(failed.memory[key], beforeDisk);
assert.equal(failed.store.reset(false), false);
assert.equal(JSON.stringify(failed.store.get()), beforeMemory);
failing = false;
assert.ok(failed.store.confirmParticipation(fp).participation);
failed.memory['nexora.comprador.opportunityFilters'] = '{"op-product":"aceite"}';
assert.equal(failed.store.reset(false), true);
assert.equal(failed.store.get().participations.length, 0);
assert.equal(failed.store.get().needs.length, 4);
assert.equal(Object.keys(failed.store.get().selections).length, 0);
assert.equal(failed.memory['nexora.comprador.opportunityFilters'], undefined);
assert.equal(failed.store.get().scenarioDate, '2026-10-13');
assert.equal(failed.store.get().opps[0].lotQty, 144);
console.log('OK: failed writes are atomic, retry succeeds and reset restores scenario/selections/filters');

// Stage 5: historical queries and voluntary withdrawal.
const tracking = load(), tr = tracking.store;
const participation = tr.confirmParticipation(review(tr)).participation;
const historicalSnapshot = JSON.stringify(participation.snapshot), historicalSaving = JSON.stringify(participation.savingSnapshot);
const withdrawal = tr.prepareWithdrawal(participation.id).proposal;
assert.ok(withdrawal);
assert.equal(tr.ownParticipationCounts().confirmed, 1);
assert.equal(tr.ownParticipationCounts().withdrawn, 0);
assert.equal(tr.get().participations[0].status, 'Confirmada'); // Review/cancel does not change data.
assert.ok(tr.confirmWithdrawal(withdrawal).participation);
const withdrawn = tr.participationById(participation.id);
assert.equal(withdrawn.status, 'Retirada');
assert.ok(withdrawn.withdrawnAt);
assert.equal(withdrawn.scenarioDateAtWithdrawal, '2026-10-13');
assert.equal(JSON.stringify(withdrawn.snapshot), historicalSnapshot);
assert.equal(JSON.stringify(withdrawn.savingSnapshot), historicalSaving);
assert.equal(withdrawn.confirmedAt, participation.confirmedAt);
assert.ok(tr.confirmWithdrawal(withdrawal).error);
assert.equal(tr.participationForNeed(withdrawn.needId), null);
assert.equal(tr.canModifyNeed(withdrawn.needId, { qty: 13 }), true);
assert.equal(tr.participationCounts('op1').participations, 0);
assert.equal(tr.participationCounts('op1').businesses, 0);
assert.equal(tr.ownParticipationCounts().historical, 1);
const reconfirmed = tr.confirmParticipation(review(tr)).participation;
assert.ok(reconfirmed); assert.notEqual(reconfirmed.id, withdrawn.id);
assert.equal(tr.participationById(withdrawn.id).status, 'Retirada');
assert.equal(tr.participationHistoryForNeed(withdrawn.needId).length, 2);
assert.equal(tr.ownParticipationCounts().confirmed, 1);
assert.equal(tr.ownParticipationCounts().withdrawn, 1);
assert.equal(tr.ownParticipationCounts().historical, 2);
assert.equal(load(tracking.memory).store.ownParticipationCounts().historical, 2);
assert.equal(tr.get().opps[0].lotQty, 144);
assert.equal(tr.get().opps[0].interestedCount, 12);
tr.get().opps[0].priceJoint = 99;
assert.equal(JSON.stringify(tr.participationById(withdrawn.id).savingSnapshot), historicalSaving);
console.log('OK: withdrawal is explicit, irreversible on old ID, persisted, frees need and preserves historical prices/savings');

const foreign = { ...reconfirmed, id: 'PAR-OTHER', businessId: 'NEG-OTHER', needId: 'NEC-OTHER' };
tr.get().participations.push(foreign);
assert.equal(tr.ownParticipations().length, 2);
assert.equal(tr.participationById('PAR-OTHER'), null);
assert.ok(tr.prepareWithdrawal('PAR-OTHER').error);
assert.equal(tr.participationCounts('op1').participations, 2);
assert.equal(tr.participationCounts('op1').businesses, 2);
assert.ok(tr.prepareWithdrawal('PAR-MISSING').error);
console.log('OK: own history is isolated by business; opportunity counters still count distinct businesses');

for (const change of [p => { p.get().opps[0].status = 'cerrada'; }, p => { p.get().opps[0].closeDate = '2026-10-12'; }, p => { p.get().opps = []; }]) {
  const st = load().store, pr = st.confirmParticipation(review(st)).participation;
  const preview = st.prepareWithdrawal(pr.id).proposal; change(st);
  assert.ok(st.confirmWithdrawal(preview).error);
  assert.equal(st.participationById(pr.id).status, 'Confirmada');
}
const staleWithdrawal = load().store, staleRecord = staleWithdrawal.confirmParticipation(review(staleWithdrawal)).participation;
const stalePreview = staleWithdrawal.prepareWithdrawal(staleRecord.id).proposal;
staleWithdrawal.get().participations[0].snapshot.qty = 15;
assert.ok(staleWithdrawal.confirmWithdrawal(stalePreview).error);
const incomplete = load().store;
incomplete.get().participations.push({ id: 'PAR-OLD', businessId: incomplete.get().user.id, opportunityId: 'op1', needId: 'NEC-DEMO-1', status: 'Confirmada' });
assert.ok(incomplete.participationById('PAR-OLD'));
assert.ok(incomplete.prepareWithdrawal('PAR-OLD').error);
const initialRaw = JSON.stringify(incomplete.get()), oldReload = load({ [key]: initialRaw });
assert.equal(JSON.stringify(oldReload.store.get()), initialRaw); // Existing records are not guessed or rewritten.
assert.equal(oldReload.store.ownParticipations().length, 1);
console.log('OK: closed/missing opportunity, stale withdrawal, old incomplete record and unknown IDs handled safely');

let withdrawalWriteFails = false;
const wf = load({}, k => withdrawalWriteFails && k === key), wr = wf.store.confirmParticipation(review(wf.store)).participation;
const wp = wf.store.prepareWithdrawal(wr.id).proposal;
const diskBefore = wf.memory[key], memoryBefore = JSON.stringify(wf.store.get());
withdrawalWriteFails = true;
assert.ok(wf.store.confirmWithdrawal(wp).error);
assert.equal(wf.memory[key], diskBefore); assert.equal(JSON.stringify(wf.store.get()), memoryBefore);
withdrawalWriteFails = false;
assert.ok(wf.store.confirmWithdrawal(wp).participation);
wf.memory['nexora.comprador.trackingFilters'] = '{"tracking-status":"Retirada"}';
assert.equal(wf.store.reset(false), true);
assert.equal(wf.store.ownParticipationCounts().historical, 0);
assert.equal(wf.memory['nexora.comprador.trackingFilters'], undefined);
console.log('OK: failed withdrawal writes do not change state; reset clears tracking filters and history');


// Historical presentation is shared with detail and tolerates older missing fields.
const presentation = load();
presentation.context.window.NexoraUI = {
  esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  money: value => 'S/ ' + value.toFixed(2),
  ic: () => '<svg></svg>', media: () => '<span>icon</span>'
};
vm.runInContext(fs.readFileSync('assets/js/comprador/resumen-participacion.js', 'utf8'), presentation.context);
const summary = presentation.context.window.NexoraParticipationSummary;
const old = { id: 'PAR-OLD', businessId: presentation.store.get().user.id, status: 'Confirmada', opportunityId: 'op1' };
assert.match(summary.detail(old), /Información histórica de ahorro no disponible/);
assert.match(summary.record(old), /Fecha histórica no disponible/);
assert.match(summary.record(old), /Cantidad histórica no disponible/);
assert.ok(!summary.detail(old).includes('S/ 6.40')); // Never invent missing historical price from current opportunity.
assert.match(summary.detail(old), /necesidad vinculada no está disponible/);
assert.match(summary.realDate('2026-10-14T01:00:00Z'), /13 oct/); // Previous calendar day in Lima.
const withPrice = presentation.store.confirmParticipation(review(presentation.store)).participation;
presentation.store.get().opps[0].priceJoint = 20;
assert.match(summary.detail(withPrice), /S\/ 6.40 por unidad/);
assert.match(summary.detail(withPrice), /S\/ 16.80 total/);
console.log('OK: shared historical presentation tolerates older records, uses Lima dates and never recalculates prices/savings');
