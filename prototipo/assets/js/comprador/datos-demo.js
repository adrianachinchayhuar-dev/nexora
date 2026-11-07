/* Contrato único de la compra en grupo: los 3 perfiles calculan cantidades, precio, negocios, estado y fechas con estas funciones. Puro: no lee ni escribe almacenamiento. */
(function () {
  'use strict';
  var ESTADOS = ['propuesta', 'buscando_participantes', 'en_cotizacion', 'precio_por_aceptar', 'confirmada', 'cancelada', 'vencida'];
  var VISIBLES = {
    propuesta: { clave: 'reuniendo', texto: 'Reuniendo negocios' }, buscando_participantes: { clave: 'reuniendo', texto: 'Reuniendo negocios' },
    en_cotizacion: { clave: 'esperando_precio', texto: 'Esperando precio del proveedor' }, precio_por_aceptar: { clave: 'esperando_precio', texto: 'Esperando precio del proveedor' },
    confirmada: { clave: 'confirmada', texto: 'Confirmada' },
    cancelada: { clave: 'no_se_concreto', texto: 'No se concretó' }, vencida: { clave: 'no_se_concreto', texto: 'No se concretó' }
  };
  // Puntualidad simulada: [entregadas a tiempo, entregadas].
  var PUNTUALIDAD = { 'Distribuidora Andina (demo)': [18, 19], 'Mayorista Lima Sur (demo)': [27, 30] };
  function despues(fecha, dias) { var d = new Date(fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); }
  // Días hasta el domingo de «Esta semana». Sábado y domingo apuntan al domingo siguiente: no queda tiempo de cerrar y entregar.
  function diasAlDomingo(hoy) { var dia = new Date(hoy + 'T12:00:00Z').getUTCDay(), d = (7 - dia) % 7; return d < 2 ? d + 7 : d; }
  function finDeSemana(hoy) { return despues(hoy, diasAlDomingo(hoy)); }
  function finProximaSemana(hoy) { return despues(finDeSemana(hoy), 7); }
  function activas(o, participaciones) { return (participaciones || []).filter(function (p) { return p && p.status === 'Confirmada' && p.opportunityId === o.id; }); }
  function cantidadTotal(o, participaciones, extra) {
    if (!o) return 0;
    var simulados = (o.participantesDemo || []).reduce(function (t, p) { return t + (Number.isFinite(p.qty) ? p.qty : 0); }, 0);
    var reales = activas(o, participaciones).reduce(function (t, p) { return t + (p.snapshot && Number.isFinite(p.snapshot.qty) ? p.snapshot.qty : 0); }, 0);
    return simulados + reales + (Number.isFinite(extra) && extra > 0 ? extra : 0);
  }
  // Negocios unidos: los simulados cuentan igual que los reales en los 3 perfiles.
  function negocios(o, participaciones) {
    var propios = activas(o, participaciones).map(function (p) { return p.businessId; }).filter(function (id, i, lista) { return id && lista.indexOf(id) === i; });
    return (o.participantesDemo || []).length + propios.length;
  }
  function tramos(o) { return o && Array.isArray(o.tramos) && o.tramos.length ? o.tramos : null; }
  function indiceTramo(o, total) { var i = 0; (tramos(o) || []).forEach(function (t, k) { if (total >= t.desde) i = k; }); return i; }
  function resumen(o, participaciones, extra) {
    var lista = tramos(o); if (!lista) return null;
    var total = cantidadTotal(o, participaciones, extra), i = indiceTramo(o, total), sig = lista[i + 1], minimo = Number.isFinite(o.minimo) ? o.minimo : null;
    return { total: total, tramo: i, tramos: lista.length, precio: lista[i].precio, precioNormal: lista[0].precio, minimo: minimo, alcanzaMinimo: minimo !== null && total >= minimo, faltaMinimo: minimo === null ? null : Math.max(0, minimo - total), siguienteTramo: sig ? { faltan: sig.desde - total, precio: sig.precio } : null };
  }
  // Una compra abierta pasa a esperar precio al alcanzar el mínimo y vuelve si un retiro la deja por debajo. Unirse nunca la confirma (D3).
  // Si el proveedor está suspendido, la compra sin confirmar no se concreta (D4); las confirmadas se mantienen.
  function estadoCompra(o, participaciones, abierta, suspendido) {
    if (!o) return null;
    var e = ESTADOS.indexOf(o.estado) === -1 ? 'buscando_participantes' : o.estado, pendiente = ['propuesta', 'buscando_participantes', 'en_cotizacion', 'precio_por_aceptar'].indexOf(e) !== -1;
    if (suspendido && pendiente) return 'cancelada';
    if (!abierta && pendiente) return 'vencida';
    if (!pendiente || !Number.isFinite(o.minimo)) return e;
    var alcanza = cantidadTotal(o, participaciones) >= o.minimo;
    if (alcanza && (e === 'propuesta' || e === 'buscando_participantes')) return 'en_cotizacion';
    if (!alcanza && (e === 'en_cotizacion' || e === 'precio_por_aceptar')) return 'buscando_participantes';
    return e;
  }
  function estadoVisible(o, participaciones, abierta, suspendido) {
    var e = estadoCompra(o, participaciones, abierta, suspendido);
    return e ? Object.assign({ interno: e, desde: o.estadoDesde || null }, VISIBLES[e]) : null;
  }
  function fechaCorta(iso) {
    var d = new Date(String(iso) + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d).replace('.', '') : '';
  }
  // «entre el 17 y el 18 oct» o «el 18 oct»; `hasta` es la fecha que cuenta para llegar a tiempo.
  function entregaTexto(o) {
    if (!o || !o.entregaHasta) return 'Por definir';
    if (!o.entregaDesde || o.entregaDesde === o.entregaHasta) return 'el ' + fechaCorta(o.entregaHasta);
    var a = fechaCorta(o.entregaDesde), b = fechaCorta(o.entregaHasta), mismoMes = o.entregaDesde.slice(0, 7) === o.entregaHasta.slice(0, 7);
    return 'entre el ' + (mismoMes ? a.split(' ')[0] : a) + ' y el ' + b;
  }
  function llegaATiempo(o, requerida) { return !o || !o.entregaHasta || o.entregaHasta <= requerida; }
  function puntualidad(proveedor) {
    var p = PUNTUALIDAD[proveedor]; if (!p) return null;
    return { aTiempo: p[0], total: p[1], pct: Math.round(p[0] / p[1] * 100), texto: 'Entregó a tiempo ' + p[0] + ' de ' + p[1] + ' compras · ' + Math.round(p[0] / p[1] * 100) + '%' };
  }
  window.NexoraCompra = Object.freeze({ estados: ESTADOS, despues: despues, diasAlDomingo: diasAlDomingo, finDeSemana: finDeSemana, finProximaSemana: finProximaSemana, activas: activas, cantidadTotal: cantidadTotal, negocios: negocios, tramos: tramos, resumen: resumen, estadoCompra: estadoCompra, estadoVisible: estadoVisible, fechaCorta: fechaCorta, entregaTexto: entregaTexto, llegaATiempo: llegaATiempo, puntualidad: puntualidad });
})();

/* Fechas visibles de la compra: cierre, entrega y «lo necesitas para», con la misma presentación en los 3 perfiles. Solo presenta; no cambia reglas. */
(function () {
  'use strict';
  var C = window.NexoraCompra;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dias(desde, hasta) { return Math.round((Date.parse(hasta + 'T12:00:00Z') - Date.parse(desde + 'T12:00:00Z')) / 864e5); }
  function cuando(n) { return n <= 0 ? 'hoy' : n === 1 ? 'mañana' : 'en ' + n + ' días'; }
  function partes(iso) { var t = C.fechaCorta(iso).split(' '); return { dia: t[0], mes: t[1] || '' }; }
  // Cierre con su urgencia: rojo si es hoy, naranja si faltan 2 días o menos.
  function cierre(o, hoy) {
    var n = dias(hoy, o.closeDate);
    if (n < 0) return { dias: n, cuando: 'cerró', texto: 'Cerró el ' + C.fechaCorta(o.closeDate), nivel: 'pasado' };
    return { dias: n, cuando: cuando(n), texto: 'Cierra ' + cuando(n), nivel: n === 0 ? 'hoy' : n <= 2 ? 'pronto' : 'normal' };
  }
  // «7–8 nov.» · «30 oct.–2 nov.» · «8 nov.»
  function rango(o) {
    if (!o || !o.entregaHasta) return 'por definir';
    var h = partes(o.entregaHasta);
    if (!o.entregaDesde || o.entregaDesde === o.entregaHasta) return h.dia + ' ' + h.mes + '.';
    var d = partes(o.entregaDesde);
    return d.mes === h.mes ? d.dia + '–' + h.dia + ' ' + h.mes + '.' : d.dia + ' ' + d.mes + '.–' + h.dia + ' ' + h.mes + '.';
  }
  // Línea destacada de una tarjeta: «Cierra mañana · Llega 7–8 nov.». `verbo`: Llega (comprador), Entregas (proveedor), Entrega (admin).
  function linea(o, hoy, verbo) { var c = cierre(o, hoy); return { texto: c.texto + ' · ' + (verbo || 'Llega') + ' ' + rango(o), nivel: c.nivel }; }
  function lineaHtml(o, hoy, verbo) { var l = linea(o, hoy, verbo); return '<span class="nxf-linea nxf-linea--' + l.nivel + '"><span class="nxf-linea__ic" aria-hidden="true"></span>' + esc(l.texto) + '</span>'; }
  // ¿Llega a tiempo para la fecha del pedido? null si no aplica (sin pedido, «lo antes posible» o sin entrega).
  function llega(o, need) {
    if (!o || !need || need.loAntesPosible || !need.requiredDate || !o.entregaHasta) return null;
    return C.llegaATiempo(o, need.requiredDate);
  }
  function chipLlegada(o, need) {
    var ok = llega(o, need); if (ok === null) return '';
    return ok ? '<span class="nxf-chip nxf-chip--ok">✓ Llega a tiempo para tu fecha</span>' : '<span class="nxf-chip nxf-chip--tarde">⚠ Llega tarde para tu fecha</span>';
  }
  // Franja grande Hoy → Cierra → Entrega. Con `need`, su fecha queda marcada sobre la línea.
  function franja(o, hoy, opciones) {
    opciones = opciones || {}; var need = opciones.need, verbo = opciones.verbo || 'Entrega', c = cierre(o, hoy), puntos = [];
    var marca = need && !need.loAntesPosible && need.requiredDate ? need.requiredDate : null;
    puntos.push({ f: hoy, o: 0, clase: 'is-hoy', titulo: 'Hoy', fecha: C.fechaCorta(hoy), nota: '' });
    puntos.push({ f: o.closeDate, o: 1, clase: 'is-cierre is-' + c.nivel, titulo: c.dias < 0 ? 'Cerró' : 'Cierra', fecha: C.fechaCorta(o.closeDate), nota: c.dias < 0 ? '' : c.cuando });
    if (o.entregaHasta) puntos.push({ f: o.entregaHasta, o: 2, clase: 'is-entrega', titulo: verbo, fecha: rango(o), nota: '' });
    if (marca) { var ok = llega(o, need); puntos.push({ f: marca, o: 3, clase: 'is-pedido' + (ok === false ? ' is-tarde' : ''), titulo: 'Lo necesitas para', fecha: C.fechaCorta(marca), nota: ok === null ? '' : ok ? 'llega a tiempo' : 'llega tarde' }); }
    else if (need && need.loAntesPosible) puntos.push({ f: o.entregaHasta || o.closeDate, o: 3, clase: 'is-pedido', titulo: 'Lo necesitas', fecha: 'Lo antes posible', nota: '' });
    puntos.sort(function (a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : a.o - b.o; });
    return '<section class="nxf-franja" aria-label="Fechas de esta compra"><ol class="nxf-franja__linea">' + puntos.map(function (p) {
      return '<li class="' + p.clase + '"><i aria-hidden="true"></i><span class="nxf-t">' + esc(p.titulo) + '</span><strong class="nxf-f">' + esc(p.fecha) + '</strong>' + (p.nota ? '<small class="nxf-n">' + esc(p.nota) + '</small>' : '') + '</li>';
    }).join('') + '</ol></section>';
  }
  // «hace 5 min» · «hace 2 h» · «ayer» · «hace 3 días»
  function relativo(iso, ahora) {
    var ms = Number.isFinite(ahora) ? ahora : Date.now(), t = Date.parse(iso); if (!Number.isFinite(t)) return '';
    var min = Math.max(0, Math.round((ms - t) / 60000));
    if (min < 1) return 'ahora'; if (min < 60) return 'hace ' + min + ' min'; if (min < 1440) return 'hace ' + Math.round(min / 60) + ' h';
    var d = Math.round(min / 1440); return d === 1 ? 'ayer' : 'hace ' + d + ' días';
  }
  window.NexoraFechas = Object.freeze({ dias: dias, cuando: cuando, cierre: cierre, rango: rango, linea: linea, lineaHtml: lineaHtml, llega: llega, chipLlegada: chipLlegada, franja: franja, relativo: relativo });
})();

(function () {
  // La fecha del escenario es HOY en Lima cada vez que se prepara el escenario.
  // window.NEXORA_DEMO_TODAY solo la fija en las pruebas automáticas.
  function limaToday() {
    var fixed = window.NEXORA_DEMO_TODAY;
    if (typeof fixed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed;
    try { var day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day; } catch (error) { /* usa la fecha de respaldo */ }
    return '2026-10-13';
  }
  var HOY = limaToday(), DOMINGO = window.NexoraCompra.diasAlDomingo(HOY);
  // Fechas de las compras: aceite y vasos entregan antes del domingo («Esta semana»); detergente, la próxima semana.
  var CIERRE_ACEITE = Math.max(1, DOMINGO - 2), VENTANA = Math.max(14, DOMINGO + 8);
  var SEED = {
    user: { name: 'Ana', business: 'Bodega Rosita', district: 'Santa Anita', zoneId: 'sa-centro', direccion: 'Jr. Las Begonias 245 (demo)', distrito: 'Santa Anita', zona: 'sa-centro', businessType: 'Bodega', phone: '', email: '', description: '', image: null },
    categories: { abarrotes: { name: 'Abarrotes' }, limpieza: { name: 'Limpieza' }, descartables: { name: 'Descartables' } },
    products: {
      aceite: { categoryId: 'abarrotes', name: 'Aceite vegetal', detail: 'Botella 1 L', unit: 'botellas', icon: 'drop', tone: 'pe', re: /aceite/ },
      detergente: { categoryId: 'limpieza', name: 'Detergente en polvo', detail: 'Bolsa 800 g', unit: 'bolsas', icon: 'box', tone: 'l', re: /detergente|jabon en polvo/ },
      vasos: { categoryId: 'descartables', name: 'Vasos descartables', detail: 'Paquete x 50', unit: 'paquetes', icon: 'cup', tone: 'l', re: /vaso/ },
      arroz: { categoryId: 'abarrotes', name: 'Arroz extra', detail: 'Por kilo', unit: 'kg', icon: 'box', tone: 'pe', re: /arroz/ },
      fideos: { categoryId: 'abarrotes', name: 'Fideos', detail: 'Paquete 500 g', unit: 'paquetes', icon: 'box', tone: 'l', re: /fideo|tallarin/ },
      leche: { categoryId: 'abarrotes', name: 'Leche evaporada', detail: 'Lata 400 g', unit: 'latas', icon: 'drop', tone: 'pe', re: /leche/ }
    },
    baseDate: HOY,
    // Compras en grupo. Precio por tramos: el primero es el precio normal del proveedor; `minimo` son las unidades para que
    // exista la compra. `costoTransporte`: costo adicional conocido por negocio (null = aún no se sabe). `participantesDemo` son los otros negocios simulados (solo cantidades y zona, nunca nombres).
    // `marca`: la marca que ofrece el proveedor (ficticia).
    // `estado` es el estado interno de la tesis (propuesta, buscando_participantes, en_cotizacion, precio_por_aceptar,
    // confirmada, cancelada, vencida); `estadoDias` = hace cuántos días entró en ese estado (se guarda como `estadoDesde`).
    opps: [
      { id: 'op1', providerId: 'PROV-DEMO-ANDINA', product: 'aceite', qty: 12, priceInd: 7.80, priceJoint: 6.40, businesses: 12, lotQty: 144, closeDays: CIERRE_ACEITE, entregaDias: [1, DOMINGO - CIERRE_ACEITE], untilDays: VENTANA,
        marca: 'Girasol Andino', estado: 'buscando_participantes', estadoDias: 3,
        tramos: [{ desde: 1, hasta: 49, precio: 7.80 }, { desde: 50, hasta: 99, precio: 7.00 }, { desde: 100, hasta: null, precio: 6.40 }], minimo: 50, costoTransporte: null,
        participantesDemo: [{ id: 'NEG-DEMO-P01', nombre: 'Bodega Don Lucho', zoneId: 'sa-centro', qty: 14, precioHoy: 7.90 }, { id: 'NEG-DEMO-P02', nombre: 'Minimarket Pilar', zoneId: 'sa-centro', qty: 12, precioHoy: null }, { id: 'NEG-DEMO-P03', nombre: 'Bodega San Martín', zoneId: 'sa-centro', qty: 12, precioHoy: 8.00 }],
        notices: [{ daysAgo: 1, text: 'Ya vamos 38 botellas: con 50 el precio baja a S/ 7.00.' }, { daysAgo: 0, text: 'La entrega sería el día siguiente al cierre, en la mañana.' }],
        questions: [{ daysAgo: 1, zoneId: 'sa-centro', text: '¿Aceptan pago con Yape?', answer: 'Sí, al momento de la entrega.', answeredDaysAgo: 0 }], provider: 'Distribuidora Andina (demo)', status: 'abierta' },
      { id: 'op2', providerId: 'PROV-DEMO-LIMA-SUR', product: 'detergente', qty: 8, priceInd: 12.50, priceJoint: 10.60, businesses: 8, lotQty: 64, closeDays: DOMINGO + 2, entregaDias: [1, 3], untilDays: VENTANA,
        marca: 'Espuma Plus', estado: 'en_cotizacion', estadoDias: 1,
        tramos: [{ desde: 1, hasta: 29, precio: 12.50 }, { desde: 30, hasta: 59, precio: 11.40 }, { desde: 60, hasta: null, precio: 10.60 }], minimo: 30, costoTransporte: 0,
        participantesDemo: [{ id: 'NEG-DEMO-P04', nombre: 'Bodega La Esquina', zoneId: 'sa-centro', qty: 20, precioHoy: 12.80 }, { id: 'NEG-DEMO-P05', nombre: 'Tienda Doña Rosa', zoneId: 'sa-centro', qty: 20, precioHoy: null }, { id: 'NEG-DEMO-P06', nombre: 'Bodega El Ahorro', zoneId: 'sa-centro', qty: 16, precioHoy: 12.50 }],
        notices: [{ daysAgo: 1, text: 'Ya se llegó al mínimo. Estamos revisando el precio final con el volumen reunido.' }], questions: [], provider: 'Mayorista Lima Sur (demo)', status: 'abierta' },
      { id: 'op3', providerId: 'PROV-DEMO-ANDINA', product: 'vasos', qty: 6, priceInd: 8.50, priceJoint: 7.48, businesses: 6, lotQty: 36, closeDays: DOMINGO - 1, entregaDias: [1, 1], untilDays: VENTANA,
        marca: 'Descartex', estado: 'confirmada', estadoDias: 1,
        tramos: [{ desde: 1, hasta: 23, precio: 8.50 }, { desde: 24, hasta: 47, precio: 7.90 }, { desde: 48, hasta: null, precio: 7.48 }], minimo: 24, costoTransporte: 3.00,
        participantesDemo: [{ id: 'NEG-DEMO-P07', nombre: 'Minimarket Andrea', zoneId: 'sa-centro', qty: 18, precioHoy: 8.50 }, { id: 'NEG-DEMO-P08', nombre: 'Bodega Tres Hermanos', zoneId: 'sa-centro', qty: 18, precioHoy: 8.70 }, { id: 'NEG-DEMO-P09', nombre: 'Bodega Santa Rosa', zoneId: 'sa-centro', qty: 12, precioHoy: null }],
        notices: [{ daysAgo: 0, text: 'Precio confirmado: S/ 7.48 por paquete. Tenemos stock para el lote completo.' }], questions: [], provider: 'Distribuidora Andina (demo)', status: 'abierta' },
      { id: 'op4', providerId: 'PROV-DEMO-LIMA-SUR', product: 'arroz', qty: 20, priceInd: null, priceJoint: 3.80, businesses: 5, lotQty: 200, closeDays: -2, entregaDias: [1, 3], untilDays: VENTANA,
        marca: 'Grano Real', estado: 'vencida', estadoDias: 2,
        tramos: [{ desde: 1, hasta: 99, precio: 4.20 }, { desde: 100, hasta: 199, precio: 4.00 }, { desde: 200, hasta: null, precio: 3.80 }], minimo: 100, costoTransporte: null,
        participantesDemo: [{ id: 'NEG-DEMO-P10', nombre: 'Bodega La Unión', zoneId: 'sa-centro', qty: 25, precioHoy: 4.30 }, { id: 'NEG-DEMO-P11', nombre: 'Tienda Don Pepe', zoneId: 'sa-centro', qty: 20, precioHoy: null }, { id: 'NEG-DEMO-P12', nombre: 'Minimarket Central', zoneId: 'sa-centro', qty: 15, precioHoy: 4.20 }],
        provider: 'Mayorista Lima Sur (demo)', status: 'cerrada' }
    ],
    notifs: [
      { text: 'Se formó una oportunidad de aceite vegetal con 3 negocios de tu zona.', when: 'Hace 1 h', read: false },
      { text: 'Mayorista Lima Sur (demo) actualizó su precio por volumen de detergente.', when: 'Hace 3 h', read: false },
      { text: 'Tu pedido de vasos fue interpretado. Revísalo y confírmalo.', when: 'Ayer', read: false },
      { text: 'Bienvenida a NEXORA. Recuerda: tú decides si participas.', when: 'Hace 3 días', read: true }
    ],
    msgs: [
      { from: 'Distribuidora Andina (demo)', kind: 'Proveedor', text: 'Podemos atender el lote de aceite con la cantidad mínima indicada.', when: 'Hace 40 min' },
      { from: 'Grupo: Aceite vegetal', kind: 'Negocios', text: 'Pilar (demo): ¿coordinamos el recojo en un punto común?', when: 'Hace 2 h' }
    ]
  };
  Object.keys(SEED.products).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(SEED.products[id], 'image')) SEED.products[id].image = null;
    if (!Object.prototype.hasOwnProperty.call(SEED.products[id], 'brand')) SEED.products[id].brand = '';
    if (!Object.prototype.hasOwnProperty.call(SEED.products[id], 'description')) SEED.products[id].description = null;
    if (!Object.prototype.hasOwnProperty.call(SEED.products[id], 'provider')) SEED.products[id].provider = null;
  });
  window.NexoraData = SEED;
})();

/* Constructor único del escenario inicial. Puro: no lee ni escribe almacenamiento. */
(function(){
 'use strict';
 function after(date,days){var d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
  function fresh(opciones) {
    opciones = opciones || {};
    var seed = window.NexoraData, catalog=seed.products, date = opciones.base || seed.baseDate;
    var opps = JSON.parse(JSON.stringify(seed.opps));
    opps = enrichOpportunities(opps, date);
    var needs = ['aceite', 'detergente', 'vasos', 'arroz'].map(function (id, i) {
      var p = catalog[id], o = opps.find(function (o) { return o.product === id; });
      return { id: 'NEC-DEMO-' + (i + 1), orderId: 'PED-DEMO-' + (i + 1), productId: id, product: p.name, brand: '', marca: '', soloEstaMarca: false, presentation: p.detail, qty: [12, 8, 6, 20][i], unit: p.unit, requiredDate: id === 'detergente' ? window.NexoraCompra.finProximaSemana(date) : window.NexoraCompra.finDeSemana(date), loAntesPosible: false, priceIndividual: i === 3 ? null : o.priceInd, zoneId: 'sa-centro', status: i === 3 ? 'Borrador' : 'Con coincidencia', opportunityIds: i === 3 ? [] : [o.id], createdAt: date + 'T12:00:00Z' };
    });
    // Si se entró con una cuenta creada en el registro (simulado), el negocio es esa cuenta.
    function cuentaActiva() { try { var c = JSON.parse(sessionStorage.getItem('nexora.demo.cuentaActiva.v1') || 'null'); return c && typeof c.id === 'string' ? c : {}; } catch (error) { return {}; } }
    return { version: 3, profileVersion: 1, baseDate: date, scenarioDate: date, selections: {}, user: Object.assign({ id: 'NEG-DEMO-ROSITA' }, JSON.parse(JSON.stringify(seed.user)), opciones.sinCuenta ? {} : cuentaActiva()), needs: needs, orders: needs.map(function (n) { return { id: n.orderId, text: n.qty + ' ' + n.unit + ' de ' + n.product, createdAt: n.createdAt }; }), opps: opps, participations: [], descartes: [], notifs: JSON.parse(JSON.stringify(seed.notifs)), msgs: JSON.parse(JSON.stringify(seed.msgs)), messaging: initialMessaging('NEG-DEMO-ROSITA', date, seed.msgs) };
  }
  function enrichOpportunities(opps, base) {
    var catalog=window.NexoraData.products;
    var result = opps.map(function (o) { return Object.assign({}, o); });
    window.NexoraData.opps.forEach(function (seed) {
      var index = result.findIndex(function (o) { return o.id === seed.id; });
      var current = index === -1 ? seed : result[index], product = catalog[seed.product];
      var item = Object.assign({}, seed, current, { product: seed.product, presentation: product.detail, unit: product.unit, zoneId: current.zoneId || 'sa-centro', from: current.from || base, until: current.until || after(base, seed.untilDays || 7), closeDate: current.closeDate || after(base, seed.closeDays), lotQty: seed.lotQty, interestedCount: seed.businesses });
      // Entrega estimada: rango después del cierre. Las compras ya guardadas conservan su cierre y reciben su entrega.
      item.entregaDesde = current.entregaDesde || after(item.closeDate, seed.entregaDias[0]);
      item.entregaHasta = current.entregaHasta || after(item.closeDate, seed.entregaDias[1]);
      delete item.entregaDias;
      // Avisos y preguntas de la compra: fechas relativas a hoy; las ya guardadas en el estado no se tocan.
      var stamped = function (list) { return Array.isArray(list) && list.every(function (x) { return x && x.id; }); };
      item.notices = stamped(current.notices) ? current.notices : (seed.notices || []).map(function (n, i) { return { id: 'AV-' + seed.id + '-' + (i + 1), date: after(base, -n.daysAgo), text: n.text }; });
      item.questions = stamped(current.questions) ? current.questions : (seed.questions || []).map(function (q, i) { return { id: 'PRE-' + seed.id + '-' + (i + 1), date: after(base, -q.daysAgo), zoneId: q.zoneId, text: q.text, answer: q.answer || null, answeredAt: q.answer ? after(base, -(q.answeredDaysAgo || 0)) : null }; });
      item.estado = current.estado || seed.estado || 'buscando_participantes';
      item.estadoDesde = current.estadoDesde || after(base, -(seed.estadoDias || 0));
      delete item.estadoDias;
      delete item.untilDays; // solo sirve para calcular la ventana; no se guarda en el estado
      delete item.confirmedCount; // Participation counts are derived, never stored on opportunities.
      if (index === -1) result.push(item); else result[index] = item;
    });
    return result;
  }
  function initialMessaging(owner, base, legacy) {
    var first = Array.isArray(legacy) && legacy.find(function (m) { return m.from === 'Distribuidora Andina (demo)'; });
    var at = base + 'T12:00:00Z';
    return { version: 1, conversations: [{ id: 'CONV-DEMO-ACEITE', businessId: owner, opportunityId: 'op1', interlocutorId: 'SUP-DEMO-op1', interlocutorName: 'Distribuidora Andina (demo)', createdAt: at, participationId: null, simulation: true }], messages: [{ id: 'MSG-DEMO-ACEITE', conversationId: 'CONV-DEMO-ACEITE', direction: 'received', text: first ? first.text : 'Ejemplo ficticio: consulta las condiciones demostrativas de esta oportunidad.', createdAt: at, readAt: null, simulation: true, scenarioExample: true }], drafts: {} };
  }
 function validDay(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
 function validate(s){
  if(!s||s.version!==3||s.profileVersion!==1||!s.user||typeof s.user.id!=='string'||!s.user.id||!validDay(s.baseDate)||!validDay(s.scenarioDate)||!s.selections||typeof s.selections!=='object')return false;
  if(['needs','orders','opps','participations','notifs','msgs'].some(function(k){return !Array.isArray(s[k]);}))return false;
  if(!s.messaging||s.messaging.version!==1||!Array.isArray(s.messaging.conversations)||!Array.isArray(s.messaging.messages)||!s.messaging.drafts||typeof s.messaging.drafts!=='object')return false;
  var seen={};return s.opps.every(function(o){if(!o||typeof o.id!=='string'||seen[o.id]||!window.NexoraData.products[o.product]||!validDay(o.from)||!validDay(o.until)||!validDay(o.closeDate)||o.from>o.until||!['abierta','cerrada'].includes(o.status)||!Number.isFinite(o.priceJoint)||o.priceJoint<=0)return false;seen[o.id]=true;return typeof o.presentation==='string'&&typeof o.unit==='string'&&typeof o.zoneId==='string';});
 }
 window.NexoraScenarioSeed=Object.freeze({create:fresh,enrich:enrichOpportunities,messaging:initialMessaging,validate:validate});
})();
