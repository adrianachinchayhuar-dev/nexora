// Recalcula las huellas de revisión (?v=) de las páginas del comprador, del proveedor y del administrador.
// Cada huella es el hash de los archivos que cargan las páginas; sus pruebas fallan si no coincide.
// Uso (desde la raíz del proyecto):  node tests/helpers/actualizar-huellas.cjs
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const GRUPOS = [
  // [carpeta, prefijo, expresión de los archivos que cuentan]
  ['pages/comprador', 'estable-', /(?:src|href)="(\.\.\/\.\.\/assets\/[^"?]+\.(?:css|js))(\?[^"]*)?"/g],
  // Proveedor: una huella por página (rama «proveedor»); acceso.html conserva el prefijo anterior.
  ['pages/proveedor', 'proveedor-claridad-', /(?:src|href)="(\.\.\/\.\.\/assets\/[^"?]+)(\?[^"]*)?"/g, { porPagina: true, prefijos: { 'acceso.html': 'proveedor-p4-' } }],
  ['pages/administrador', 'admin-a4-', /(?:src|href)="(\.\.\/\.\.\/assets\/[^"?]+)(\?[^"]*)?"/g],
];
function huella(prefijo, carpeta, paginas, expresion) {
  const archivos = new Set();
  for (const pagina of paginas) {
    const texto = fs.readFileSync(path.join(carpeta, pagina), 'utf8');
    for (const m of texto.matchAll(expresion)) archivos.add(path.relative('.', path.resolve(carpeta, m[1])));
  }
  const hash = crypto.createHash('sha256');
  for (const f of [...archivos].sort()) hash.update(f + '\0').update(fs.readFileSync(f)).update('\0');
  return prefijo + hash.digest('hex').slice(0, 12);
}
for (const [carpeta, prefijoGrupo, expresion, opciones = {}] of GRUPOS) {
  const paginas = fs.readdirSync(carpeta).filter(f => f.endsWith('.html')).sort(), comun = huella(prefijoGrupo, carpeta, paginas, expresion);
  let cambios = 0, nueva = comun;
  for (const pagina of paginas) {
    const prefijo = (opciones.prefijos || {})[pagina] || prefijoGrupo;
    if (opciones.porPagina) nueva = huella(prefijo, carpeta, [pagina], expresion);
    const ruta = path.join(carpeta, pagina), texto = fs.readFileSync(ruta, 'utf8');
    // Solo se reescribe la versión de los archivos que cuentan en la huella (y los enlaces ?revision= del proveedor/admin).
    let nuevo = texto.replace(expresion, (todo, archivo, consulta) => consulta ? todo.replace(/([?&]v=)[^"&]+/, '$1' + nueva) : todo);
    if (prefijo !== 'estable-') nuevo = nuevo.replace(new RegExp(prefijo + '[0-9a-f]{12}', 'g'), nueva);
    if (opciones.porPagina) nuevo = nuevo.replace(/proveedor-(?:p4|claridad)-[0-9a-f]{12}/g, nueva);
    if (nuevo !== texto) { fs.writeFileSync(ruta, nuevo); cambios++; }
  }
  console.log(carpeta, '->', opciones.porPagina ? 'una huella por página' : nueva, '(' + cambios + ' páginas actualizadas)');
}
