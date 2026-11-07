require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Avisos del proveedor y preguntas de la compra (modelo mixto, datos de demostración):
// solo ven avisos y preguntas quienes ya se unieron; las preguntas son anónimas; Mensajes tiene dos pestañas.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';
const visible = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const plain = t => String(t || '').replace(/\s*\(demo\)/gi, '').trim();
const plainJSON = v => JSON.parse(JSON.stringify(v));
const join = (s, opp, need) => { const r = s.confirmParticipation(s.prepareParticipation(opp, need).proposal); assert.ok(r.participation, r.error); return r.participation; };

// 1 · Datos y store: fechas relativas a hoy, más recientes primero, preguntas anónimas.
{
  const memory = {}, c = { window: { dispatchEvent() {} }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem: k => delete memory[k] } };
  vm.createContext(c);
  for (const f of ['datos-demo.js', 'estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f, 'utf8'), c);
  const s = c.window.NexoraStore, today = s.today(), op = id => s.get().opps.find(o => o.id === id);
  assert.deepEqual(plainJSON(s.opportunityNotices(op('op1')).map(n => [n.date, n.text])), [[today, 'La entrega sería el día siguiente al cierre, en la mañana.'], [s.after(today, -1), 'Ya vamos 38 botellas: con 50 el precio baja a S/ 7.00.']]);
  assert.deepEqual(plainJSON(s.opportunityQuestions(op('op1')).map(q => [q.date, q.zoneId, q.text, q.answer, q.answeredAt])), [[s.after(today, -1), 'sa-centro', '¿Aceptan pago con Yape?', 'Sí, al momento de la entrega.', today]]);
  for (const id of ['op2', 'op3']) assert.equal(s.opportunityNotices(op(id)).length, 1, id + ' tiene un aviso de ejemplo');
  assert.equal(s.opportunityNotices(op('op4')).length, 0, 'El arroz cerrado no tiene avisos');
  // Preguntar exige haberse unido, validar el texto y no guardar nada que identifique al negocio.
  const before = JSON.stringify(s.get());
  assert.ok(s.askQuestion('op1', '¿Entregan en la bodega?').error, 'Sin unirte no puedes preguntar');
  assert.equal(JSON.stringify(s.get()), before);
  join(s, 'op1', 'NEC-DEMO-1');
  for (const bad of ['', '  ', 'ab', 'x'.repeat(201)]) assert.ok(s.askQuestion('op1', bad).error, JSON.stringify(bad));
  assert.ok(s.askQuestion('NO-EXISTE', 'Hola').error);
  const r = s.askQuestion('op1', '  ¿Entregan   en la bodega?  ');
  assert.ok(!r.error, r.error);
  assert.deepEqual(Object.keys(r.question).sort(), ['answer', 'answeredAt', 'date', 'id', 'text', 'zoneId'], 'Solo zona y texto: sin negocio ni cantidad');
  assert.deepEqual([r.question.text, r.question.answer, r.question.date, r.question.zoneId], ['¿Entregan en la bodega?', null, today, 'sa-centro']);
  assert.equal(s.opportunityQuestions(op('op1')).length, 2);assert.equal(s.opportunityQuestions(op('op2')).length, 0, 'No toca otras compras');
  const stored = JSON.parse(memory[key]).opps.find(o => o.id === 'op1').questions;
  assert.equal(stored.length, 2);assert.ok(!JSON.stringify(stored).includes(s.get().user.business) && !JSON.stringify(stored).includes(s.get().user.id), 'La pregunta no lleva el nombre del negocio');
}
console.log('OK: notices and questions use dates relative to today, newest first; asking needs a join and stays anonymous');

// 2 · Detalle de la compra en grupo: tarjeta «Comunidad de esta compra» con pestañas.
function detail(joined) {
  const memory = {}, nodes = {}, listeners = {}, heading = { textContent: '' };
  function node(id) { return nodes[id] ||= { id, value: '', innerHTML: '', textContent: '', hidden: true, open: false, disabled: false, handlers: {}, addEventListener(k, f) { this.handlers[k] = f; }, showModal() {}, close() {}, focus() {}, querySelectorAll() { return []; } }; }
  const c = { window: { dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); }, addEventListener(k, f) { (listeners[k] ||= []).push(f); }, NexoraDemo: { requireSession: () => true } }, Event: function (type) { this.type = type; }, URLSearchParams, Intl, Date,
    location: { pathname: '/pages/comprador/detalle-oportunidad.html', search: '?id=op1&necesidad=NEC-DEMO-1', hash: '', assign() {} }, history: { replaceState() {} },
    sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem(k) { delete memory[k]; } }, document: { getElementById: node, querySelector: s => s === '.hello h1' ? heading : null, title: '' } };
  vm.createContext(c);
  for (const f of ['datos-demo', 'estado-demo', 'imagenes-producto']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f + '.js', 'utf8'), c);
  c.window.NexoraUI = { esc, money: n => 'S/ ' + n.toFixed(2), ic: id => '<svg data-icon="' + id + '"></svg>', buyerHref: s => s, renderIdentity() {}, toasts: [], toast(m) { this.toasts.push(m); }, plain };
  if (joined) join(c.window.NexoraStore, 'op1', 'NEC-DEMO-1');
  const root = node('op-detail'), field = { value: '' }, errorBox = { textContent: '' }, send = { disabled: true };
  root.querySelector = sel => sel === '#q-text' ? field : sel === '#q-error' ? errorBox : sel === '#q-publish' ? send : null;
  vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/detalle-oportunidad.js', 'utf8'), c);
  return { c, s: c.window.NexoraStore, html: () => root.innerHTML, field, errorBox, send,
    click: sel => root.handlers.click({ target: { closest: s => s === sel ? {} : null } }),
    tab: name => root.handlers.click({ target: { closest: s => s === '[data-ctab]' ? { dataset: { ctab: name } } : null } }),
    type: value => { field.value = value; root.handlers.input({ target: { id: 'q-text', value } }); } };
}
{
  const t = detail(false), html = t.html(), text = visible(html);
  assert.ok(text.includes('Únete para ver los avisos y preguntas de esta compra')&&html.includes('data-icon="megaphone"'));
  assert.ok(html.includes('data-participate')&&text.includes('Unirme con 12 botellas'), 'Un solo estado: megáfono, mensaje y botón para unirse');
  for (const hidden of ['Comunidad de esta compra', 'Avisos (', 'Preguntas (', 'Yape', 'La entrega sería', 'Haz una pregunta para todos', 'Publicar']) assert.ok(!text.includes(hidden) && !html.includes(hidden), 'Sin unirte no se muestra: ' + hidden);
  assert.ok(text.includes('3 negocios unidos'));
  // El botón de la tarjeta abre la misma confirmación de unirse.
  const before = t.s.ownParticipations().length;t.click('[data-participate]');assert.equal(t.s.ownParticipations().length, before, 'Solo abre la confirmación; no te une sola');
}
{
  const t = detail(true);let html = t.html(), text = visible(html);
  assert.ok(!text.includes('Únete para ver los avisos'));
  // Estructura: 2 columnas; el contenido en el orden pedido y nada debajo de la columna de acciones.
  assert.ok(html.indexOf('dt-main') < html.indexOf('dt-top') && html.indexOf('dt-top') < html.indexOf('dt-interest') && html.indexOf('dt-interest') < html.indexOf('dt-community') && html.indexOf('dt-community') < html.indexOf('class="nx-aside"'));
  assert.ok(html.indexOf('dt-product') < html.indexOf('dt-steps') && html.indexOf('dt-steps') < html.indexOf('dt-interest'));
  assert.ok(html.indexOf('cg-actions') > html.indexOf('class="nx-aside"') && html.indexOf('dt-provider') > html.indexOf('cg-actions'));
  assert.ok(html.trimEnd().endsWith('</aside></div>'), 'Nada ocupa el ancho completo debajo de la columna de acciones');
  // Encabezado de la tarjeta y pestañas.
  assert.ok(text.includes('Comunidad de esta compra')&&text.includes('Los demás negocios no ven tu nombre ni tu cantidad')&&html.includes('data-icon="shield"'));
  assert.ok(text.includes('Avisos (2)')&&text.includes('Preguntas (1)')&&html.includes('data-ctab="avisos" aria-selected="true"')&&html.includes('data-ctab="preguntas" aria-selected="false"'), 'Por defecto, Avisos');
  // Avisos: línea de tiempo, solo lectura.
  assert.ok(html.includes('dt-timeline')&&text.includes('Distribuidora Andina')&&html.includes('>Proveedor<')&&html.includes('>DA<'));
  assert.ok(html.includes('dt-seal--new')&&text.includes('Nuevo')&&text.includes('hoy')&&text.includes('ayer'), 'El más reciente va con «Nuevo»; tiempos relativos');
  assert.ok(text.includes('La entrega sería el día siguiente al cierre, en la mañana.')&&text.includes('Ya vamos 38 botellas: con 50 el precio baja a S/ 7.00.'), 'La pestaña muestra todos los avisos');
  assert.ok(!text.includes('Ver todos')&&!html.includes('notices-all')&&!html.includes('<textarea'), 'Sin «Ver todos» ni caja de texto en Avisos');
  assert.ok(text.indexOf('La entrega sería') < text.indexOf('Ya vamos 38'), 'El más reciente va arriba');
  assert.ok(text.includes('4 negocios unidos'), 'Los demás participantes solo como cifra');
  for (const hidden of ['Bodega Rosita', 'Pilar', 'NEG-DEMO']) assert.ok(!text.includes(hidden), 'Nunca nombres de negocios: ' + hidden);
  // Preguntas: foro.
  t.tab('preguntas');html = t.html();text = visible(html);
  assert.ok(html.includes('data-ctab="preguntas" aria-selected="true"'));
  assert.ok(html.includes('placeholder="Haz una pregunta para todos…"')&&html.includes('id="q-publish" aria-label="Publicar pregunta" disabled')&&html.includes('data-icon="arr"'), 'Campo de comentario con botón de enviar deshabilitado');
  assert.ok(html.indexOf('dt-compose') < html.indexOf('dt-forum'), 'El campo va arriba de la lista');
  assert.ok(text.includes('Una bodega de Santa Anita')&&text.includes('ayer')&&text.includes('¿Aceptan pago con Yape?')&&text.includes('✓ Respondida')&&html.includes('data-icon="store"'));
  assert.ok(html.includes('dt-reply')&&text.includes('Sí, al momento de la entrega.')&&!text.includes('Tu pregunta')&&!text.includes('Esperando respuesta'));
  // Publicar: el botón se habilita con texto; uno corto da error; uno válido queda esperando respuesta y es «Tu pregunta».
  t.type('x');assert.equal(t.send.disabled, false);t.type('   ');assert.equal(t.send.disabled, true);
  t.field.value = 'ab';t.click('#q-publish');assert.ok(t.errorBox.textContent.includes('pocas palabras'));assert.equal(t.s.opportunityQuestions(t.s.get().opps[0]).length, 1);
  t.field.value = '¿Entregan en la bodega?';t.click('#q-publish');
  assert.equal(t.s.opportunityQuestions(t.s.get().opps[0]).length, 2);assert.ok(t.c.window.NexoraUI.toasts.includes('✓ Pregunta publicada'));
  html = t.html();text = visible(html);assert.ok(html.includes('data-ctab="preguntas" aria-selected="true"'), 'Se queda en Preguntas');
  assert.ok(text.includes('Preguntas (2)')&&text.includes('¿Entregan en la bodega?')&&text.includes('⏱ Esperando respuesta')&&text.includes('Tu pregunta'));
  assert.ok(text.indexOf('¿Entregan en la bodega?') < text.indexOf('¿Aceptan pago con Yape?'), 'La pregunta aparece arriba');
}
{
  // Más de 5: «Ver más» en lugar de «Ver todos».
  const t = detail(true);for (let i = 0; i < 6; i++) assert.ok(!t.s.askQuestion('op1', 'Pregunta número ' + i).error);
  t.tab('preguntas');let html = t.html(), text = visible(html);
  assert.equal((html.match(/class="dt-qa__q"/g) || []).length, 5);assert.ok(text.includes('Ver más')&&html.includes('questions-more'));
  t.click('#questions-more');html = t.html();assert.equal((html.match(/class="dt-qa__q"/g) || []).length, 7);assert.ok(visible(html).includes('Ver menos'));
}
console.log('OK: two columns with nothing under the sticky actions; «Comunidad de esta compra» with Avisos timeline and Preguntas forum; before joining a single locked state with a join button');

// 3 · Mensajes: pestañas Avisos y Conversaciones.
function messages(joined) {
  const memory = {}, nodes = {}, listeners = {}; let replaced = '';
  function node(id) { return nodes[id] ||= { id, value: '', innerHTML: '', textContent: '', hidden: true, handlers: {}, attrs: {}, classList: { on: {}, toggle(k, v) { this.on[k] = v; } }, addEventListener(k, f) { this.handlers[k] = f; }, setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, querySelector() { return { scrollTop: 0, scrollHeight: 0 }; }, querySelectorAll() { return []; } }; }
  const c = { window: { dispatchEvent(e) { (listeners[e.type] || []).forEach(f => f(e)); }, addEventListener(k, f) { (listeners[k] ||= []).push(f); }, NexoraDemo: { requireSession: () => true }, matchMedia: () => ({ matches: true }) }, Event: function (type) { this.type = type; }, URLSearchParams, Intl, Date, console,
    location: { pathname: '/pages/comprador/mensajes.html', search: '' }, history: { replaceState(a, b, u) { replaced = u; } }, sessionStorage: { getItem: k => memory[k] || null, setItem(k, v) { memory[k] = v; }, removeItem: k => delete memory[k] }, document: { getElementById: node } };
  vm.createContext(c);
  for (const f of ['datos-demo', 'estado-demo', 'mensajeria-demo', 'imagenes-producto']) vm.runInContext(fs.readFileSync('assets/js/comprador/' + f + '.js', 'utf8'), c);
  c.window.NexoraUI = { esc, money: n => 'S/ ' + n.toFixed(2), ic: id => '<svg data-icon="' + id + '"></svg>', buyerHref: s => s, plain };
  if (joined) join(c.window.NexoraStore, 'op1', 'NEC-DEMO-1');
  vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/mensajes.js', 'utf8'), c);
  return { c, node, get replaced() { return replaced; }, tab: name => node('tab-' + name).handlers.click.call({ dataset: { tab: name } }) };
}
{
  const html = fs.readFileSync('pages/comprador/mensajes.html', 'utf8');
  assert.ok(html.includes('>Avisos<')&&html.includes('>Conversaciones<')&&html.includes('role="tablist"'));
  // Conversaciones: el chat privado de siempre, con la línea que lo distingue de las preguntas de la compra.
  let t = messages(true);
  let panel = visible(t.node('conversation-panel').innerHTML);
  assert.ok(panel.includes('Chat privado con Distribuidora Andina. Para dudas de todos, usa Preguntas de la compra.'));
  assert.ok(visible(t.node('conversation-list').innerHTML).includes('Distribuidora Andina'));
  // Avisos: un ítem por compra a la que te uniste, con el último aviso; al abrirlo, todos y solo lectura.
  t.tab('avisos');
  assert.equal(t.node('tab-avisos').attrs['aria-selected'], 'true');assert.equal(t.node('tab-conversaciones').attrs['aria-selected'], 'false');
  let list = t.node('conversation-list').innerHTML;
  assert.ok(list.includes('data-icon="megaphone"')&&list.includes('data-notice="op1"'));
  assert.ok(visible(list).includes('Aceite vegetal')&&visible(list).includes('La entrega sería el día siguiente al cierre, en la mañana.'));
  assert.ok(!visible(list).includes('Detergente'), 'Solo las compras a las que te uniste');
  assert.ok(!visible(list).includes('Distribuidora Andina'), 'El chat privado no se mezcla con los avisos');
  t.node('conversation-list').handlers.click({ target: { closest: s => s === '[data-notice]' ? { dataset: { notice: 'op1' } } : null }, preventDefault() {} });
  assert.ok(t.replaced.includes('aviso=op1'));
  const html2 = t.node('conversation-panel').innerHTML;panel = visible(html2);
  assert.ok(panel.includes('Avisos de Aceite vegetal')&&panel.includes('La entrega sería')&&panel.includes('Ya vamos 38 botellas')&&panel.includes('Solo lectura'));
  assert.ok(!html2.includes('<textarea')&&!html2.includes('message-compose'), 'Los avisos no tienen caja de texto');
  t.tab('conversaciones');
  assert.ok(visible(t.node('conversation-panel').innerHTML).includes('Chat privado con Distribuidora Andina'));
  // Sin unirte no hay avisos.
  t = messages(false);t.tab('avisos');
  assert.ok(visible(t.node('conversation-list').innerHTML).includes('Aún no tienes avisos'));
}
console.log('OK: Mensajes has Avisos (one item per joined purchase, read-only) and Conversaciones (private chat with its explanatory line)');
