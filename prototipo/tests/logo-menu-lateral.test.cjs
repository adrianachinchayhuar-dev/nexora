// Logos y barra lateral en 3 modos (estructura común del comprador). Comprobaciones estáticas: el comportamiento
// se prueba en el navegador (docs/GUIA_PRUEBA_COMPRADOR.md).
const fs = require('node:fs'), assert = require('node:assert/strict');
const png = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 }; };

// 1 · Versiones web de los logos (con transparencia, como PNG) y originales intactos.
assert.equal(png('assets/images/logo-nexora-800.png').w, 800);
for (const w of [256, 64, 32]) assert.equal(png('assets/images/icono-nexora-' + w + '.png').w, w);
assert.ok(png('assets/images/logo-nexora-800.png').alpha&&png('assets/images/icono-nexora-32.png').alpha);
assert.deepEqual([png('assets/images/01_logo_completo.png').w, png('assets/images/02_icono_fondo_lila.png').w], [1370, 390], 'Los originales siguen igual');

// 2 · Uso: el ícono reemplaza a la «N»; el logo es un enlace al inicio; favicon en todas las páginas del comprador y el login.
const js = fs.readFileSync('assets/js/comprador/componentes.js', 'utf8');
assert.ok(!/use href=\\"#N\\"/.test(js), 'Ya no queda la N anterior');
assert.equal((js.match(/aria-label=\\"NEXORA, ir al inicio\\"/g) || []).length, 2, 'Barra lateral y barra superior móvil');
assert.ok(js.includes('icono-nexora-64.png\\" width=\\"36\\"')&&js.includes('icono-nexora-64.png\\" width=\\"32\\"'), '36 px en la barra lateral y 32 px en la superior');
assert.ok(js.includes('href=\\"dashboard.html\\" data-k=\\"inicio\\" aria-label=\\"NEXORA, ir al inicio\\"'));
for (const f of fs.readdirSync('pages/comprador').filter(n => n.endsWith('.html'))) {
  const html = fs.readFileSync('pages/comprador/' + f, 'utf8');
  assert.ok(html.includes('icono-nexora-32.png')&&html.includes('icono-nexora-64.png')&&html.includes('menu-lateral.css'), f);
}
const login = fs.readFileSync('pages/login.html', 'utf8');
assert.ok(login.includes('rel="icon"')&&login.includes('icono-nexora-32.png'));
const logo = login.match(/<img class="login-logo"[^>]*>/)[0];
assert.ok(logo.includes('logo-nexora-800.png')&&/alt="NEXORA[^"]+"/.test(logo), 'Logo horizontal con alt');
assert.ok(!/<a [^>]*>\s*<img class="login-logo"/.test(login), 'En el login el logo no es un enlace');
const listo = fs.readFileSync('assets/js/comprador/flujo-necesidad.js', 'utf8');
assert.ok(listo.includes('class="nr-logo" href="')&&listo.includes('aria-label="NEXORA, ir al inicio"')&&listo.includes('logo-nexora-800.png'));

// 3 · Tres modos: expandida 240 px, compacta 72 px, oculta con ☰ y panel superpuesto; el modo se recuerda con try/catch.
const css = fs.readFileSync('assets/css/comprador/menu-lateral.css', 'utf8');
assert.ok(css.includes('.app[data-menu="expanded"]{grid-template-columns:240px')&&css.includes('.app[data-menu="compact"]{grid-template-columns:72px')&&css.includes('.app[data-menu="hidden"]{grid-template-columns:minmax(0,1fr)}'));
assert.ok(css.includes('transition:grid-template-columns .2s ease'));
assert.ok(css.includes('content:attr(data-tip)')&&css.includes(':focus-visible::after'), 'Etiqueta flotante con mouse y con teclado');
assert.ok(css.includes('.nav-count{position:absolute')&&css.includes('.nav-label:not(:first-child)'), 'Contadores como punto y divisor fino');
for (const need of ['id=\\"side-toggle\\"', 'aria-label=\\"Contraer menú\\"', 'aria-expanded=\\"true\\"', 'id=\\"side-hide\\"', 'aria-label=\\"Ocultar menú\\"', 'id=\\"burger\\" type=\\"button\\" aria-label=\\"Abrir menú\\"']) assert.ok(js.includes(need), need);
assert.ok(js.includes("'Expandir menú'")&&js.includes('nexora.comprador.menu'));
assert.ok(/function savedMode\(\) \{ try \{[^}]*localStorage[^}]*\} catch/.test(js)&&/function saveMode\(v\) \{ try \{[^}]*localStorage[^}]*\} catch/.test(js), 'localStorage siempre dentro de try/catch');
assert.ok(js.includes("w < 900 ? 'hidden' : savedMode() || (w <= 1200 ? 'compact' : 'expanded')"), '<900 oculta; 900-1200 compacta; más ancho expandida');
assert.ok(js.includes('function trapDrawerFocus')&&js.includes("e.key === 'Escape'")&&js.includes("$('scrim').addEventListener('click'"), 'Foco atrapado; Escape y clic fuera cierran');
console.log('OK: web logos, clickable logo/icon with aria-label, favicon, login logo without link, 3 sidebar modes with remembered choice');
