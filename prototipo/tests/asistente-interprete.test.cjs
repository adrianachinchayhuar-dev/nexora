const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={window:{},document:{body:{dataset:{}}}};vm.createContext(c);
vm.runInContext(fs.readFileSync('assets/js/comprador/datos-demo.js','utf8'),c);
c.window.NexoraStore={products:c.window.NexoraData.products};c.window.NexoraUI={};
const src=fs.readFileSync('assets/js/comprador/flujo-necesidad.js','utf8');
vm.runInContext(src.replace('  window.NexoraFlow =','  window.formularioInterpreta = parse;\n  window.NexoraFlow ='),c);
assert.equal(c.window.NexoraFlow.interpretarPedido,c.window.formularioInterpreta);
for(const texto of ['12 botellas de aceite y 8 bolsas de detergente','aceite','2 cajas de aceite','1,5 kilos de arroz','12 botellas de aceite 8 bolsas de detergente','2 paquetes de azúcar','faltan vasos descartables, unos 6 paquetes']){
 assert.deepEqual(c.window.NexoraFlow.interpretarPedido(texto),c.window.formularioInterpreta(texto));
}
assert.equal(c.window.NexoraFlow.interpretarPedido('aceite')[0].qty,null);
assert.equal(c.window.NexoraFlow.interpretarPedido('1,5 kilos de arroz')[0].qty,1.5);
assert.equal(c.window.NexoraFlow.interpretarPedido('2 cajas de aceite')[0].qty,null);
console.log('OK intérprete público idéntico al formulario, sin reglas nuevas');
