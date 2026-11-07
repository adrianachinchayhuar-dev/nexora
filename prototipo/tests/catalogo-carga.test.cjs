require('./helpers/utils-compartidas.cjs');
const vm = require('node:vm'), fs = require('node:fs'), assert = require('node:assert/strict');
const source = fs.readFileSync('assets/js/comprador/catalogo.js', 'utf8');
for (const store of [undefined, { products: {} }]) {
  let message = '', logged = false;
  const context = {
    window: { NexoraDemo: { requireSession: () => true }, NexoraStore: store, NexoraUI: { esc: s => s } },
    document: { getElementById: id => id === 'catalog-list' ? { set innerHTML(value) { message = value; } } : { addEventListener() {} } },
    console: { error() { logged = true; } }
  };
  assert.doesNotThrow(() => vm.runInNewContext(source, context));
  assert.ok(message.includes('No se pudo cargar el catálogo'));
  assert.ok(message.includes('catalog-reload'));
  assert.ok(logged);
}
console.log('OK: missing and outdated shared dependencies produce a recovery message instead of a blank catalog');
