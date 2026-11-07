// Consume the actual browser map; tests never maintain another set of image paths.
const fs=require('node:fs'),vm=require('node:vm');
const c={window:{}};vm.runInNewContext(fs.readFileSync('assets/js/comprador/imagenes-producto.js','utf8'),c);
module.exports=c.window.NexoraProductImages;
