/* Presentación de la tesis: barra de tramos, estado visible, ahorro estimado y «No me interesa».
   Solo muestra lo que calcula NexoraStore (tramoActual, resumenCompra, estadoVisible, ahorroEstimado…): no recalcula nada. */
(function () {
  var store = window.NexoraStore, ui = window.NexoraUI;
  if (!store || !ui) return;
  var esc = ui.esc, money = ui.money;
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  function unitOne(o) { return UNIT_ONE[o && o.unit] || (o && o.unit) || 'unidad'; }
  function svg(path) { return '<svg class="tx-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>'; }
  var ICONOS = {
    reuniendo: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M17 5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6"/>'),
    esperando_precio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    confirmada: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    no_se_concreto: svg('<path d="M6 6l12 12M18 6L6 18"/>')
  };
  var EXPLICA = {
    reuniendo: 'Otros negocios se están sumando. Aún no hay precio final.',
    esperando_precio: 'Ya hay negocios suficientes. El proveedor confirma su precio.',
    confirmada: 'El proveedor confirmó el precio. Sigue su aviso para coordinar.',
    no_se_concreto: 'No se reunió lo necesario a tiempo. No pagas nada.'
  };
  // El precio en grupo que vale hoy: el del tramo alcanzado (o el fijo si la compra no tiene tramos).
  function precio(o) { var p = store.precioTramo ? store.precioTramo(o) : null; return Number.isFinite(p) ? p : o.priceJoint; }

  // ── Estado (4 visibles) ──
  function estado(o) { return store.estadoVisible ? store.estadoVisible(o) : null; }
  function chipEstado(o) {
    var e = estado(o); if (!e) return '';
    return '<span class="tx-estado tx-estado--' + e.clave + '">' + ICONOS[e.clave] + '<span>' + esc(e.texto) + '</span></span>';
  }
  // «¿Qué pasa ahora?»: reuniendo → esperando precio → confirmada (o «No se concretó» al final).
  function pasos(o) {
    var e = estado(o); if (!e) return '';
    var orden = ['reuniendo', 'esperando_precio', e.clave === 'no_se_concreto' ? 'no_se_concreto' : 'confirmada'];
    var TXT = { reuniendo: 'Reuniendo negocios', esperando_precio: 'Esperando precio del proveedor', confirmada: 'Confirmada', no_se_concreto: 'No se concretó' };
    var actual = orden.indexOf(e.clave);
    return '<ol class="nx-steps tx-pasos" aria-label="¿Qué pasa ahora?">' + orden.map(function (k, i) {
      var cls = i < actual ? 'is-done' : i === actual ? 'is-current' : '';
      if (k === 'no_se_concreto') cls += ' is-fail';
      return '<li class="' + cls + '"' + (i === actual ? ' aria-current="step"' : '') + '><span class="nx-steps__dot">' + ICONOS[i < actual ? 'confirmada' : k] + '</span><span class="nx-steps__t"><b>' + TXT[k] + '</b><small>' + (i === actual ? EXPLICA[k] : '') + '</small></span></li>';
    }).join('') + '</ol>';
  }

  // ── Ahorro ──
  function tag(texto, tip, focusable) { return '<span class="tx-tag" data-tip="' + esc(tip) + '"' + (focusable ? ' tabindex="0" role="note" aria-label="' + esc(texto + ': ' + tip) + '"' : ' title="' + esc(tip) + '"') + '>' + esc(texto) + '</span>'; }
  // Devuelve {html, neto, hay}. `focusable:false` dentro de enlaces (tarjetas).
  function ahorro(need, o, opts) {
    opts = opts || {};
    var a = need && o && store.ahorroEstimado ? store.ahorroEstimado(need, o) : null;
    if (!a) return { html: '', hay: false, neto: 0, datos: null };
    if (!(a.neto > 0)) return { html: '<span class="tx-ahorro tx-ahorro--no">En grupo no sale más barato que tu precio.</span>', hay: false, neto: a.neto, datos: a };
    var f = opts.focusable !== false, confirmado = a.estado === 'confirmado', etiqueta = confirmado ? 'Ahorro confirmado' : 'Ahorro estimado';
    // El ahorro usa el precio que alcanzaría el grupo CON tu pedido (a.precioTramo); aquí se dice explícitamente.
    var mia = store.participationForNeed ? store.participationForNeed(need.id) : null, unido = !!mia && mia.opportunityId === o.id;
    var hoy = unido ? a.precioTramo : store.precioTramo(o), conTu = a.precioTramo;
    var tags = (a.referencial ? tag('referencial', 'No pusiste tu precio de hoy: comparamos con el precio normal del proveedor.', f) : '') +
      (a.preliminar ? tag('preliminar', 'Falta el costo de transporte: el ahorro final puede ser menor.', f) : '');
    var cifra = '<strong>' + money(a.neto) + '</strong>', cola = tags ? ' <span class="tx-tags">' + tags + '</span>' : '', cuerpo;
    if (unido) cuerpo = 'Tu precio: ' + money(conTu) + ' · ' + etiqueta + ' ' + cifra;
    else if (opts.modo === 'detalle') cuerpo = 'Si te unes: ' + etiqueta.toLowerCase() + ' ' + cifra + ' · el precio ' + (conTu < hoy ? 'bajaría a ' : 'sería ') + money(conTu);
    else cuerpo = 'Precio en grupo hoy: ' + money(hoy) + ' · Si te unes: ' + money(conTu) + ' · ' + etiqueta + ' ' + cifra;
    a = Object.assign({ hoy: hoy, conTu: conTu, unido: unido }, a);
    return { html: '<span class="tx-ahorro">' + cuerpo + cola + '</span>', hay: true, neto: a.neto, datos: a };
  }
  // Para «Podrías ahorrar» (suma de los pedidos de las compras abiertas) y para textos cortos.
  function ahorroTexto(need, o) { var a = ahorro(need, o); return a.hay ? (a.datos.estado === 'confirmado' ? 'Ahorro confirmado: ' : 'Ahorro estimado: ') + money(a.neto) : ''; }

  // ── Tramos ──
  function listaTramos(o) {
    var r = store.resumenCompra ? store.resumenCompra(o) : null; if (!r) return '';
    return '<ol class="tx-lista">' + o.tramos.map(function (t, i) {
      var hasta = Number.isFinite(t.hasta) ? 'de ' + t.desde + ' a ' + t.hasta : 'desde ' + t.desde;
      return '<li class="' + (i === r.tramo ? 'is-actual' : i < r.tramo ? 'is-pasado' : '') + '"><span>' + esc(hasta + ' ' + o.unit) + '</span><strong>' + money(t.precio) + '</strong>' + (i === r.tramo ? '<em>Precio actual</em>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function barra(o, opts) {
    opts = opts || {};
    var r = store.resumenCompra ? store.resumenCompra(o) : null; if (!r) return '';
    var extra = opts.extra > 0 ? store.resumenCompra(o, opts.extra) : null;
    var ultimo = o.tramos[o.tramos.length - 1].desde, tope = Math.max(ultimo * 1.2, r.total * 1.05, 1);
    var pct = function (n) { return Math.min(100, Math.round(n / tope * 1000) / 10); };
    // Cerca de los bordes la etiqueta se alinea hacia adentro para no salirse.
    var borde = function (p) { return p > 88 ? ' data-borde="der"' : p < 12 ? ' data-borde="izq"' : ''; };
    var marcas = o.tramos.slice(1).map(function (t) { return '<i class="tx-mark' + (r.total >= t.desde ? ' is-hit' : '') + '" style="left:' + pct(t.desde) + '%"' + borde(pct(t.desde)) + '><span>' + t.desde + '</span></i>'; }).join('');
    var minimo = Number.isFinite(o.minimo) ? '<i class="tx-mark tx-mark--min' + (r.alcanzaMinimo ? ' is-hit' : '') + '" style="left:' + pct(o.minimo) + '%"' + borde(pct(o.minimo)) + '><span>Mínimo ' + o.minimo + '</span></i>' : '';
    var falta = r.siguienteTramo ? 'Faltan <strong>' + r.siguienteTramo.faltan + '</strong> para bajar a <strong>' + money(r.siguienteTramo.precio) + '</strong>' : 'Ya tienes el mejor precio del grupo.';
    var min = !Number.isFinite(o.minimo) ? '' : r.alcanzaMinimo ? 'Mínimo para comprar en grupo: ' + o.minimo + ' · ya se alcanzó.' : 'Mínimo para comprar en grupo: ' + o.minimo + ' · faltan ' + r.faltaMinimo + '.';
    var conTu = extra ? '<p class="tx-contigo">Con tu pedido de ' + opts.extra + ' llegan a ' + extra.total + ' y el precio sería <strong>' + money(extra.precio) + '</strong>.</p>' : '';
    return '<section class="tx-barra" aria-label="Precio por cantidad"><div class="tx-barra__top"><p class="tx-barra__qty"><strong>' + r.total + '</strong> ' + esc(o.unit) + ' reunidas</p><p class="tx-barra__precio"><strong>' + money(r.precio) + '</strong><small>por ' + esc(unitOne(o)) + '</small></p></div>' +
      '<div class="tx-track" role="img" aria-label="' + r.total + ' de ' + ultimo + ' ' + esc(o.unit) + '"><i class="tx-fill" style="width:' + pct(r.total) + '%"></i>' + marcas + minimo + '</div>' +
      '<p class="tx-falta">' + falta + '</p>' + conTu + listaTramos(o) + (min ? '<p class="tx-minimo">' + esc(min) + '</p>' : '') + '</section>';
  }
  // Versión mini para tarjetas: «72 / 100 · faltan 28 para S/ 6.40».
  function mini(o) {
    var r = store.resumenCompra ? store.resumenCompra(o) : null; if (!r) return '';
    var sig = r.siguienteTramo, meta = sig ? r.total + sig.faltan : r.total;
    var texto = sig ? r.total + ' / ' + meta + ' · faltan ' + sig.faltan + ' para ' + money(sig.precio) : r.total + ' ' + o.unit + ' · mejor precio ' + money(r.precio);
    return '<span class="tx-mini"><span class="tx-mini__bar" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(r.total / Math.max(meta, 1) * 100)) + '%"></i></span><span class="tx-mini__txt">' + esc(texto) + '</span></span>';
  }

  // ── «No me interesa» con deshacer ──
  function descartar(oppId, needId, despues) {
    var r = store.noMeInteresa(oppId, needId);
    if (r.error) { ui.toast(r.error); return false; }
    ui.toast('Ocultamos esta compra', { action: { label: 'Deshacer', onClick: function () { var u = store.deshacerNoMeInteresa(oppId, needId); if (u.error) ui.toast(u.error); else if (despues) despues(); } } });
    if (despues) despues();
    return true;
  }

  // ── Fechas: lo que necesitas, cuándo cierra y cuándo llega ──
  function dia(iso) { return window.NexoraCompra.fechaCorta(iso); }
  function fechaEntrega(o) { var t = store.entregaTexto(o); return t.charAt(0).toUpperCase() + t.slice(1); }
  function lineaEntrega(o) { return 'Entrega estimada: ' + store.entregaTexto(o); }
  function puntualidad(o) { var p = store.puntualidad(o && o.provider); return p ? '<small class="dt-trust">' + esc(p.texto) + '</small>' : ''; }
  // Franja grande Hoy → Cierra → Entrega con tu fecha marcada; línea destacada de tarjeta; chip de llegada (NexoraFechas).
  function fechas(o, need) { return window.NexoraFechas.franja(o, store.today(), { need: need, verbo: 'Entrega' }); }
  function linea(o) { return window.NexoraFechas.lineaHtml(o, store.today(), 'Llega'); }
  function chipLlega(o, need) { return window.NexoraFechas.chipLlegada(o, need); }
  window.NexoraTesis = { linea: linea, chipLlega: chipLlega, fechas: fechas, lineaEntrega: lineaEntrega, puntualidad: puntualidad, precio: precio, unitOne: unitOne, estado: estado, chipEstado: chipEstado, pasos: pasos, ahorro: ahorro, ahorroTexto: ahorroTexto, barra: barra, mini: mini, listaTramos: listaTramos, descartar: descartar };
})();
