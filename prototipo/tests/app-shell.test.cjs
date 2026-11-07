// Panel de notificaciones, aviso único (toast), bienvenida y barra inferior móvil del comprador.
// Comprobaciones estáticas: el comportamiento se prueba en el navegador (docs/GUIA_PRUEBA_COMPRADOR.md).
const fs = require('node:fs'), assert = require('node:assert/strict');
const js = fs.readFileSync('assets/js/comprador/componentes.js', 'utf8'), css = fs.readFileSync('assets/css/comprador/app.css', 'utf8');

// 1 · Panel de notificaciones: cajón derecho de 380 px, avisos generados con datos existentes, grupos y estado vacío.
assert.ok(css.includes('.bw .pop{position:fixed;top:0;right:0;bottom:0;left:auto;width:380px'));
assert.ok(js.includes('pop-scrim')&&js.includes("function pop(open)")&&js.includes("e.key === 'Escape'")&&js.includes('pclose'), '× / clic fuera / Escape');
for (const kind of ["'close:'", "'notice:'", "'answer:'", "'match:'"]) assert.ok(js.includes(kind), 'Aviso ' + kind);
assert.ok(js.includes("left >= 0 && left <= 2"), 'Compras que cierran en 2 días o menos');
assert.ok(js.includes("'Hoy'")&&js.includes("'Antes'")&&js.includes('Estás al día')&&js.includes('Marcar todo como leído'));
assert.ok(js.includes('data-alert')&&js.includes('Ver notificaciones: '), 'Enlace directo y contador de la campana');
assert.ok(!/\b(PAR|NEC|PED)-/.test(js.match(/function renderNotifs[\s\S]*?function pop/)[0].replace(/\(PAR\|NEC\|PED\)-\[\\w-\]\+/, '')), 'Los avisos no muestran IDs');

// 2 · Toast único: role=status, aria-live=polite, 4 s (5 s con «Deshacer»); abajo a la derecha y al centro en móvil.
assert.ok(js.includes('role=\\"status\\" aria-live=\\"polite\\"')||/id=\\"toast\\" role=\\"status\\" aria-live=\\"polite\\"/.test(js));
assert.ok(js.includes("(toastAction ? 5000 : 4000)"));
assert.ok(css.includes('.toast{position:fixed;left:auto;right:24px;bottom:24px')&&css.includes('.toast{left:50%'));
const part = fs.readFileSync('assets/js/comprador/participacion-detalle.js', 'utf8');
assert.ok(part.includes("{ action: { label: 'Deshacer'")&&part.includes('confirmParticipation'), 'Deshacer vuelve a unirte');
for (const [file, text] of [['flujo-necesidad.js', '✓ Pedido guardado'], ['necesidad.js', '✓ Cambios guardados'], ['detalle-oportunidad.js', "'Te uniste.'"], ['detalle-oportunidad.js', '✓ Pregunta publicada'], ['mensajes.js', '✓ Mensaje enviado']]) assert.ok(fs.readFileSync('assets/js/comprador/' + file, 'utf8').includes(text), file + ': ' + text);
assert.ok(js.includes('Datos del escenario comprador restablecidos.'));

// 3 · Bienvenida: bandera en localStorage con try/catch (si falla no se muestra), logo horizontal, 3 pasos, dos botones; se reabre desde la ayuda y tras restablecer.
assert.ok(/function welcomeSeen\(\) \{\s*try \{[\s\S]*?\} catch \(error\) \{ return true; \}/.test(js), 'Si falla el almacenamiento, no se muestra');
assert.ok(js.includes('logo-nexora-800.png')&&js.includes('Hacer mi primer pedido')&&js.includes('Ver la app')&&js.includes('¡Hola, '));
assert.equal((js.match(/step\('/g) || []).length, 3, 'Tres pasos con íconos');
assert.ok(js.includes("'.side-help'")&&js.includes("e.detail.reason === 'reset'")&&js.includes("page === 'inicio' && !welcomeSeen()"));

// 4 · Barra inferior (< 900 px): Inicio, Necesidades, «+» central, En grupo, Mensajes; área segura; sin botón de arriba.
assert.ok(css.includes('@media (max-width:899px)')&&css.includes('env(safe-area-inset-bottom,0px)')&&css.includes('.nx-topbar-new{display:none}')&&css.includes('.app .main{padding-bottom:calc(96px'));
assert.ok(css.includes('.bot__plus{display:grid;place-items:center;width:52px;height:52px;margin-top:-22px;border-radius:50%'));
const bar = js.match(/\$\('bot'\)\.innerHTML = [^\n]+/)[0];
assert.ok(bar.indexOf("'inicio'") < bar.indexOf("'necesidades'") && bar.indexOf("'necesidades'") < bar.indexOf('bot__new') && bar.indexOf('bot__new') < bar.indexOf("'oportunidades'") && bar.indexOf("'oportunidades'") < bar.indexOf("'mensajes'"));
assert.ok(bar.includes('aria-label="Nueva necesidad"'));
console.log('OK: notification drawer with generated alerts, single toast with undo, first-visit welcome and mobile bottom bar');
