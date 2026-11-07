(function () {
  var store = window.NexoraStore, ui = window.NexoraUI;
  var $ = function (id) { return document.getElementById(id); }, esc = ui.esc, ic = ui.ic, money = ui.money, tx = window.NexoraTesis;
  var C = function () { return store.products; };
  var EX = ['necesito 12 botellas de aceite y 8 bolsas de detergente para esta semana', 'faltan vasos descartables, unos 6 paquetes', '20 kilos de arroz para el viernes'];
  var F, options = {}, returnFocus;
  // Modo página (necesidad-nueva.html): el mismo flujo, reglas y guardado, mostrado en la página y no en un modal.
  var PAGE = !!(document.body && document.body.dataset && document.body.dataset.flow === 'page');
  function surface() { return $(PAGE ? 'flow-page' : 'dlg'); }
  // A suggestion for new entries only. (Marcador usado por el entorno aislado del puerto 8001.)
  // Sugerencia para pedidos nuevos: el domingo de «Esta semana», el mismo calendario con el que se crean
  // las compras en grupo. Así un pedido nuevo puede coincidir con ellas.
  var entryCalendar;
  function calendarForEntry() {
    if (entryCalendar) return entryCalendar;
    var minimum = store.today();
    entryCalendar = { minimum: minimum, suggestedDate: store.finDeSemana() };
    return entryCalendar;
  }
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  // Conservative demonstration rules: never convert units or guess a quantity.
  function unitIn(text) {
    var aliases = { botella: 'botellas', botellas: 'botellas', bolsa: 'bolsas', bolsas: 'bolsas', paquete: 'paquetes', paquetes: 'paquetes', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kilogramos: 'kg', kg: 'kg', lata: 'latas', latas: 'latas' };
    var words = text.match(/\b(botellas?|bolsas?|paquetes?|kilogramos?|kilos?|kg|latas?|cajas?|litros?|galones?|sacos?|docenas?|unidades?|litro|ml|g|gramos?)\b/g) || [];
    return { words: words, units: words.map(function (w) { return aliases[w] || 'unsupported'; }) };
  }
  function reviewUnit(item, text) {
    var p = C()[item.k], u = unitIn(text);
    item.warning = '';
    if (!p) item.warning = 'No reconocimos este producto. Elígelo o quita esta fila si no lo necesitas.';
    else if (!u.units.length) item.warning = 'No identificamos la unidad. Confirma que la cantidad corresponde a ' + p.unit + ' de ' + p.detail + '.';
    else if (u.units.some(function (unit) { return unit !== p.unit; })) {
      item.qty = null;
      item.warning = 'Escribiste «' + u.words.join(', ') + '». No convertimos unidades. Escribe la cantidad en ' + p.unit + ' de ' + p.detail + ' y confírmala.';
    }
    item.reviewed = false;
  }
  function parse(t) {
    var out = [], P = C();
    // A comma between digits belongs to a decimal; other commas separate items.
    norm(t).split(/(?<!\d),|,(?!\d)|;|\n|\by\b|\be\b/).forEach(function (part) {
      var raw = part.trim(); if (!raw) return;
      if (/^(para\s+)?(esta semana|la semana|hoy|manana|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|el fin de semana)[.! ]*$/.test(raw)) return;
      var body = raw.replace(/\bpara\s+(?:esta semana|manana|hoy|el (?:lunes|martes|miercoles|jueves|viernes|sabado|domingo))\b/g, '');
      var ids = Object.keys(P).filter(function (id) { return P[id].re.test(body); });
      var numbers = body.match(/-?\d+(?:[.,]\d+)?/g) || [];
      if (!ids.length && out.length && out[out.length - 1].qty === null && /^(?:unos?\s+)?\d+(?:[.,]\d+)?\s+(?:botellas?|bolsas?|paquetes?|kilos?|kilogramos?|kg|latas?)[.! ]*$/.test(body)) {
        var previous = out[out.length - 1]; previous.qty = Number(numbers[0].replace(',', '.')); previous.raw += ', ' + raw;
        reviewUnit(previous, body); return;
      }
      var ambiguous = ids.length > 1 || numbers.length > 1;
      (ids.length ? ids : ['']).forEach(function (id) {
        var item = { k: id, qty: !ambiguous && numbers.length === 1 ? Number(numbers[0].replace(',', '.')) : null, raw: raw };
        reviewUnit(item, body);
        // Preserve unparsed wording for explicit review, including unknown products.
        var rest = body;
        ids.forEach(function (key) { rest = rest.replace(new RegExp(P[key].re.source, 'g'), ' '); });
        rest = rest.replace(/-?\d+(?:[.,]\d+)?/g, ' ').replace(/\b(necesito|necesitamos|quiero|comprar|faltan|falta|unos|unas|un|una|de|del|en|polvo|vegetal|extra|evaporada|descartables|por|favor|botellas?|bolsas?|paquetes?|kilogramos?|kilos?|kg|latas?)\b/g, ' ').replace(/[\s.!¿?¡:]+/g, ' ').trim();
        if (ambiguous) item.warning = 'Hay varios productos o números juntos. Revisa esta parte: «' + raw + '». Completa cada cantidad, agrega lo que falte y confirma la unidad.';
        else if (id && rest) item.warning = (item.warning ? item.warning + ' ' : '') + 'Revisa el texto que no pudimos ordenar: «' + raw + '». Corrige o agrega los productos que falten antes de confirmar.';
        out.push(item);
      });
    });
    return out;
  }
  function stepper() {
    if (PAGE) return pageStepper();
    $('stp').innerHTML = [F.fromCatalog ? 'Catálogo' : 'Pedido', 'Revisión', 'Registro', 'Coincidencias'].map(function (t, i) {
      var n = i + 1, c = n < F.step ? 'done' : n === F.step ? 'cur' : '';
      return '<li class="' + c + '"' + (c === 'cur' ? ' aria-current="step"' : '') + '><b>' + (n < F.step ? ic('check') : n) + '</b><span>' + t + '</span></li>';
    }).join('');
  }
  function foot(html) { $('mf').innerHTML = html; var b = $('mf').querySelector('button'); if (b && !PAGE && $('dlg').open) b.focus(); }
  function clearT() { F.timers.forEach(clearTimeout); F.timers = []; }
  function view1(err) {
    if (PAGE) return pageWrite(err);
    F.step = 1; stepper(); $('dt').textContent = 'Cuéntanos qué necesitas';
    $('mb').innerHTML = '<p class="hint">Escríbelo como lo dirías en tu negocio. Nosotros lo ordenamos y tú lo confirmas.</p><label class="sr" for="ft">Tu pedido</label><textarea id="ft" rows="4" placeholder="Ej: necesito 12 botellas de aceite y 8 bolsas de detergente">' + esc(F.text) + '</textarea>' + (err ? '<p class="err" role="alert">Escribe al menos un producto para continuar.</p>' : '') + '<div class="ex">Prueba con: ' + EX.map(function (t, i) { return '<button type="button" data-ex="' + i + '">' + EXL[i] + '</button>'; }).join('') + '</div>';
    foot('<button class="btn o" type="button" data-a="close">Cancelar</button><button class="btn p" type="button" data-a="interp">Ordenar mi pedido</button>');
    $('ft').focus();
  }
  function view2load() {
    if (PAGE) return pageLoad();
    F.step = 2; stepper(); $('dt').textContent = 'Interpretando tu pedido';
    $('mb').innerHTML = '<span class="chip sim">Interpretación simulada · sin IA real</span><blockquote class="original-order">«' + esc(F.text) + '»</blockquote><ul class="ln" id="ln"><li>' + ic('check') + 'Leyendo tu mensaje</li><li>' + ic('check') + 'Reconociendo productos</li><li>' + ic('check') + 'Ordenando cantidades</li></ul>';
    foot('');
    clearT();
    [300, 800, 1300].forEach(function (ms, i) { F.timers.push(setTimeout(function () { var l = $('ln'); if (l) l.children[i].classList.add('ok'); }, ms)); });
    F.timers.push(setTimeout(function () { interpret(); view2(); }, 1700));
  }
  function interpret() { F.items = parse(F.text); F.items.forEach(function (i) { var p = C()[i.k]; i.price = null; i.brand = ''; i.marca = ''; i.soloEstaMarca = false; i.presentation = p ? p.detail : ''; }); if (!F.items.length) F.items = [{ k: '', qty: null, raw: F.text, price: null, brand: '', presentation: '' }]; }
  function row(it, i) {
    var P = C(), c = P[it.k], warning = it.warning || (!c ? 'Elige el producto correcto o quita esta fila.' : '');
    var qtyError = it.qty === null || !Number.isFinite(it.qty) || it.qty <= 0 || (c && c.unit !== 'kg' && !Number.isInteger(it.qty));
    var detailsInvalid = !String(it.presentation || '').trim() || (it.price !== null && (!Number.isFinite(it.price) || it.price <= 0 || Math.abs(it.price * 100 - Math.round(it.price * 100)) > 0.000001));
    // A blank catalog quantity is expected initially; validation itself remains unchanged.
    var showQtyError = qtyError && (!F || !F.catalogBatch || F.reviewAttempted);
    var helpId = 'review-help-' + i;
    return '<div class="need-review-row"><div class="rw' + (warning || showQtyError ? ' warn' : '') + '"><span class="rb ' + (c ? c.tone : 'pe') + '">' + ic(c ? c.icon : 'spark') + '</span><div><select data-i="' + i + '" aria-label="Producto ' + (i + 1) + '">' + (c ? '' : '<option value="">Elige un producto…</option>') + Object.keys(P).map(function (k) { return '<option value="' + k + '"' + (k === it.k ? ' selected' : '') + '>' + esc(P[k].name) + '</option>'; }).join('') + '</select><small>' + (c ? esc(it.presentation || c.detail) : esc(it.raw || 'Producto por identificar')) + '</small></div><label class="qt"><span>Cantidad</span><input type="number" required min="' + (c && c.unit === 'kg' ? '0.01' : '1') + '" step="' + (c && c.unit === 'kg' ? '0.01' : '1') + '" value="' + (it.qty === null ? '' : it.qty) + '" data-q="' + i + '"' + (F && F.catalogBatch ? ' aria-invalid="' + !!showQtyError + '"' : '') + ' aria-label="Cantidad de ' + esc(c ? c.name : 'producto ' + (i + 1)) + '" aria-describedby="' + helpId + '"><span>' + (c ? esc(c.unit) : 'Elige producto') + '</span></label><button class="icbtn" type="button" data-a="del" data-i="' + i + '" aria-label="Quitar producto ' + (i + 1) + '">' + ic('trash') + '</button></div><div id="' + helpId + '" class="hint">' + (showQtyError ? '<p>Escribe una cantidad mayor que cero' + (c && c.unit !== 'kg' ? ', sin decimales' : '') + '.</p>' : '') + (warning ? '<p>' + esc(warning) + '</p><label><input type="checkbox" data-review="' + i + '"' + (it.reviewed ? ' checked' : '') + '> He revisado esta fila y su cantidad en ' + esc(c ? c.unit : 'la unidad del producto elegido') + '; agregué los productos que faltaban.</label>' : '') + '</div><details' + (detailsInvalid ? ' open' : '') + '><summary>Más detalles</summary><div class="need-fields"><label>Presentación<input data-field="presentation" data-row="' + i + '" value="' + esc(it.presentation || '') + '" required></label><label>Marca (opcional)<input data-field="brand" data-row="' + i + '" value="' + esc(it.brand || '') + '"></label><label>Precio que pagas por unidad (S/, opcional)<input data-field="price" data-row="' + i + '" type="number" min="0.01" step="0.01" value="' + (it.price === null ? '' : it.price) + '" placeholder="Opcional"></label></div><p class="need-price-note">El precio es opcional y permite estimar tu ahorro. Sin precio, puedes registrar igualmente tu necesidad.</p></details></div>';
  }
  function view2(err, focusSelector) {
    if (PAGE) return pageReview(err, focusSelector);
    F.step = 2; stepper(); $('dt').textContent = F.catalogBatch ? 'Completar necesidades' : 'Revisa tu lista';
    var timing = '<section class="review-timing" aria-label="Fecha y zona de compra"><div class="need-fields order-fields"><label>¿Para cuándo lo necesitas?<input id="required-date" type="date" min="' + store.today() + '" value="' + F.requiredDate + '" required aria-describedby="review-demo-date"></label><label>Zona de compra<select id="required-zone" required><option value="">Elige una zona</option>' + store.zones.map(function (z) { return '<option value="' + z.id + '"' + (z.id === F.zoneId ? ' selected' : '') + '>' + esc(z.name) + '</option>'; }).join('') + '</select></label></div><p class="hint review-date-note" id="review-demo-date">Fecha sugerida: ' + esc(calendarForEntry().suggestedDate) + (F.catalogBatch ? '. Revisa fecha y zona. No se garantizan coincidencias.' : '. Las oportunidades conservan sus propias fechas; registrar no garantiza una coincidencia. Revisa la fecha y la zona; no se interpretan de tu mensaje.') + '</p></section>';
    $('mb').innerHTML = '<div class="review-intro"><p class="hint">' + (F.catalogBatch ? 'Completa la cantidad de cada producto.' : 'Revisa los productos y sus cantidades. Puedes corregirlos aquí.') + '</p><span class="chip sim">' + (F.catalogBatch ? 'Catálogo · demostración' : F.fromCatalog ? 'Producto elegido del catálogo · demostración' : 'Interpretación demostrativa · sin IA real') + '</span></div><div class="review-products" aria-label="Productos detectados">' + F.items.map(row).join('') + '</div><div class="review-list-tools"><button class="link" type="button" data-a="add">+ Agregar otro producto</button>' + (!F.fromCatalog ? '<details><summary>Ver lo que escribiste</summary><blockquote class="original-order">' + esc(F.text) + '</blockquote></details>' : '') + '</div>' + timing + '<p class="hint review-next">' + (F.catalogBatch ? 'Al confirmar, guardaremos estas necesidades. No es una compra ni una participación.' : 'Guardaremos tus necesidades para que puedas revisar oportunidades y decidir si participas. No confirmarás ninguna compra ni participación.') + '</p>' + (err ? '<p class="err" role="alert">' + esc(err) + '</p>' : '');
    foot((F.fromCatalog ? '<button class="btn o" type="button" data-a="close">Cancelar</button>' : '<button class="btn o" type="button" data-a="back">Volver al pedido</button>') + '<button class="btn p" type="button" data-a="save">Registrar necesidades</button>');
    var field = $('mb').querySelector(focusSelector || 'select[data-i]'); if (field) field.focus();
  }
  // Modo edición: el mismo pedido (mismo ID) cambia cantidad, fecha, zona y precio de hoy.
  function pageBlocked(participationId) {
    F.step = 2; $('stp').innerHTML = ''; $('dt').textContent = 'Editar pedido'; asideClear();
    $('mb').innerHTML = '<p class="nx-note">' + ic('shield') + '<span>Ya te uniste con este pedido. Para cambiarlo, primero retírate.</span></p>';
    foot('<a class="nx-btn nx-btn--primary" href="' + esc(ui.buyerHref('participacion.html?id=' + encodeURIComponent(participationId))) + '">Ver mi participación</a>');
  }
  function saveEdit() {
    if (F.busy) return;
    var item = F.items[0]; F.reviewAttempted = true;
    F.busy = true;
    var result = store.updateNeed(F.edit, { qty: item.qty, price: item.price === undefined ? null : item.price, date: F.requiredDate, zone: F.zoneId, loAntesPosible: !!item.loAntesPosible });
    F.busy = false;
    if (result.error) { if (result.participationId) pageBlocked(result.participationId); else view2(result.error); return; }
    location.assign(ui.buyerHref('necesidad.html?id=' + encodeURIComponent(F.edit) + '&guardado=1'));
  }
  function norm(t) { return String(t || '').trim().toLowerCase(); }
  function duplicateOf(item) {
    return store.get().needs.find(function (n) { return n.productId === item.k && norm(n.presentation) === norm(item.presentation) && n.requiredDate === F.requiredDate && !store.participationForNeed(n.id); }) || null;
  }
  function dupBox() {
    var n = store.get().needs.find(function (x) { return x.id === F.dup; }); if (!n) return '';
    return '<section class="nx-card nr-dup" id="dup-box" role="alert"><p>Ya tienes un pedido de <strong>' + esc(n.qty + ' ' + n.unit + ' de ' + n.product.toLowerCase()) + '</strong> para el ' + esc(shortDay(n.requiredDate)) + '. ¿Quieres actualizarlo o guardar uno nuevo?</p><div class="nr-dup__acciones"><button class="nx-btn nx-btn--primary" type="button" data-a="dup-update">Actualizar ese pedido</button><button class="nx-btn nx-btn--secondary" type="button" data-a="dup-new">Guardar otro</button></div></section>';
  }
  function shortDay(iso) { var d = new Date(iso + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : ''; }
  function dupUpdate() {
    var item = F.items[0], result = store.updateNeed(F.dup, { qty: item.qty, price: item.price === undefined ? null : item.price, date: F.requiredDate, zone: F.zoneId, loAntesPosible: !!item.loAntesPosible });
    if (result.error) { F.dup = null; view2(result.error); return; }
    location.assign(ui.buyerHref('necesidad.html?id=' + encodeURIComponent(F.dup) + '&guardado=1'));
  }
  function save() {
    if (F.edit) return saveEdit();
    if (F.saved.length || F.busy || F.blocked) return;
    if (F.catalogBatch) {
      F.reviewAttempted = true;
      var ids = F.items.map(function(i){return i.k;});
      if (new Set(ids).size !== ids.length) { view2('Hay productos repetidos. Quita la fila repetida; no sumamos cantidades automáticamente.'); return; }
      var invalid = store.validate(F.items,F.requiredDate,F.zoneId);
      if (invalid) { view2(invalid); return; }
    }
    if (F.items.some(function (item) { return item.warning && !item.reviewed; })) { view2('Revisa las filas señaladas y confirma su unidad antes de registrar.', '[data-review]:not(:checked)'); return; }
    // Pedido repetido: mismo producto, presentación y fecha, sin participación. Se pregunta antes de guardar.
    if (PAGE && !F.catalogBatch && !F.dupOk && F.items.length === 1) { var twin = duplicateOf(F.items[0]); if (twin) { F.dup = twin.id; view2(false, '#dup-box button'); return; } }
    if (F.catalogBatch && (!batchHooks.beforeRegister || !batchHooks.beforeRegister(batchSnapshot()))) { view2('No se pudo preparar el registro de forma segura. Tu lista se conserva; revisa el aviso del Catálogo.'); return; }
    F.busy = true;
    var result;
    try { result = store.register(F.text, F.items, F.requiredDate, F.zoneId); }
    catch (error) { F.busy = false; if (F.catalogBatch) { F.blocked = true; view2('No pudimos verificar el resultado del registro. Revisa Mis necesidades antes de intentarlo otra vez.'); } else throw error; return; }
    F.busy = false;
    if (result.error) { if (F.catalogBatch && batchHooks.onFailure && !batchHooks.onFailure(batchSnapshot())) F.blocked = true; view2(result.error); return; }
    F.saved = result.needs; if (F.catalogBatch && batchHooks.onRegistered) { try { batchHooks.onRegistered(result.needs); } catch (error) { ui.toast('Tus necesidades se registraron. Revisa Mis necesidades antes de volver a registrar esta lista.'); } } window.dispatchEvent(new Event('nexora-demo-change')); if (options.onSave) options.onSave();
    view3(); ui.toast('✓ Pedido guardado'); if (store.error()) ui.toast(store.error());
  }
  function view3() {
    if (PAGE) return pageDone();
    F.step = 3; stepper(); $('dt').textContent = 'Necesidades registradas';
    $('mb').innerHTML = '<div class="okc">' + ic('check') + '</div><h3>Guardamos las necesidades de tu negocio</h3><p class="hint">Ahora puedes buscar coincidencias con las oportunidades disponibles de esta demostración. Registrar necesidades no es comprar ni confirmar una participación. Tú decides si participas después de revisar una oportunidad.</p>' + F.saved.map(function (n) { return '<div class="mi"><b>' + esc(n.qty + ' ' + n.unit + ' de ' + n.product.toLowerCase()) + '</b><small>' + esc(n.presentation) + '</small><small>' + (n.priceIndividual === null ? 'Ahorro no calculable: falta precio individual.' : 'Precio individual: ' + money(n.priceIndividual)) + '</small></div>'; }).join('') + '<a class="btn o" href="necesidades.html">Ir a Mis necesidades</a>';
    foot('<button class="btn o" type="button" data-a="close">Ahora no</button><button class="btn p" type="button" data-a="match">Buscar oportunidades compatibles</button>');
  }
  function view4load() {
    F.step = 4; stepper(); $('dt').textContent = 'Buscando coincidencias';
    $('mb').innerHTML = '<span class="chip sim">Búsqueda simulada con datos demostrativos</span><ul class="ln"><li class="ok">' + ic('check') + 'Revisando oportunidades abiertas en tu zona…</li></ul>'; foot('');
    clearT(); F.timers.push(setTimeout(view4, 1000));
  }
  // Read registered matches using the existing eligibility rules; never create lots.
  function matchGroups() {
    var hl = {}, unmatched = [], groups = [];
    F.saved.forEach(function (n) {
      var matches = store.get().opps.filter(function (o) { return n.opportunityIds.indexOf(o.id) !== -1 && store.compatible(n, o); });
      if (!matches.length) unmatched.push(n);
      matches.forEach(function (o) {
        var group = groups.find(function (g) { return g.opportunity.id === o.id; });
        if (!group) { group = { opportunity: o, needs: [] }; groups.push(group); }
        group.needs.push(n); hl[o.id] = true;
      });
    });
    return { hl: hl, unmatched: unmatched, groups: groups };
  }
  function view4() {
    var found = matchGroups(), hl = found.hl, unmatched = found.unmatched, groups = found.groups;
    $('dt').textContent = groups.length === 1 ? 'Encontramos una oportunidad para ti' : groups.length ? 'Encontramos oportunidades para ti' : 'Tu lista quedó registrada';
    $('mb').innerHTML = '<div class="match-intro"><span class="chip sim">Coincidencias demostrativas · sin IA real</span><p class="hint">' + (groups.length ? 'Revisa el detalle para conocer el proveedor, los precios y las condiciones. Después puedes decidir si participas.' : 'Todavía no hay oportunidades compatibles para tu lista. Tus necesidades quedaron guardadas y puedes revisarlas en Mis necesidades.') + '</p></div>' + (groups.length ? '<div class="match-results" aria-label="Oportunidades encontradas">' + groups.map(function (g) {
      var o = g.opportunity, product = store.products[o.product], priceValid = Number.isFinite(tx.precio(o)) && tx.precio(o) > 0;
      var unitLabel = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kg' }[o.unit] || o.unit;
      var prices = priceValid ? '<p class="match-joint">Precio en grupo: <strong>' + money(tx.precio(o)) + '</strong> por ' + esc(unitLabel) + '</p>' : '<p class="hint">Precio conjunto no disponible en este escenario.</p>';
      var references = g.needs.map(function (n, index) {
        var saving = tx.ahorro(n, o), individualValid = Number.isFinite(n.priceIndividual) && n.priceIndividual > 0;
        return '<div class="match-reference"><p><strong>' + (g.needs.length > 1 ? 'Registro ' + (index + 1) + ' · ' : '') + 'Tu cantidad: ' + esc(n.qty + ' ' + n.unit) + '</strong>' + (individualValid ? ' · Tu precio por unidad: ' + money(n.priceIndividual) : '') + '</p><p class="match-saving">' + (saving.html || 'Ahorro no calculable por ahora.') + '</p><a class="btn p match-detail" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + '&necesidad=' + encodeURIComponent(n.id))) + '" aria-label="Ver detalle de ' + esc(product ? product.name : n.product) + ' · ' + esc(n.qty + ' ' + n.unit) + (g.needs.length > 1 ? ' · registro ' + (index + 1) : '') + '">Ver detalle ' + ic('arr') + '</a></div>';
      }).join('');
      return '<article class="mi match-card"><header><h3>' + esc(product ? product.name : g.needs[0].product) + '</h3><span class="chip">Abierta · demo</span></header><p class="match-presentation">' + esc(o.presentation) + '</p><p class="match-zone">Zona de compra: ' + esc(store.zoneName(o.zoneId)) + '</p>' + (typeof o.provider === 'string' && o.provider.trim() ? '<p class="match-provider">Proveedor asociado: <strong>' + esc(o.provider) + '</strong></p>' : '') + prices + references + (g.needs.length > 1 ? '<p class="hint">Son necesidades distintas; no sumamos sus cantidades.</p>' : '') + '<p class="match-detail-note">' + (g.needs.length > 1 ? 'Cada enlace corresponde a un registro distinto. Elige cuál quieres revisar.' : 'El enlace lleva al detalle con esta necesidad como referencia, si sigue siendo compatible.') + '</p></article>';
    }).join('') + '</div>' : '') + (unmatched.length ? '<section class="mi match-empty" aria-label="Necesidades sin oportunidad"><h3>' + (groups.length ? 'Estas necesidades siguen registradas' : 'Puedes consultar tu lista cuando quieras') + '</h3>' + unmatched.map(function (n) { return '<p><strong>' + esc(n.product) + '</strong> · ' + esc(n.presentation + ' · ' + n.qty + ' ' + n.unit) + '</p>'; }).join('') + '<p>Por ahora no hay oportunidades compatibles con estos productos, presentaciones, zona y fecha. No necesitas registrarlos de nuevo.</p><a class="btn o" href="' + esc(ui.buyerHref('necesidades.html')) + '">Ir a Mis necesidades</a></section>' : '') + '<p class="hint match-disclaimer">Registrar una necesidad no confirma compras, participaciones ni mensajes al proveedor. Todo lo mostrado pertenece al escenario demostrativo.</p>';
    window.dispatchEvent(new CustomEvent('nexora-demo-matches', { detail: hl }));
    foot('<button class="btn o" type="button" data-a="again">Registrar otra necesidad</button>' + (groups.length ? '<button class="btn p" type="button" data-a="goops">Ver todas las oportunidades</button>' : '<button class="btn o" type="button" data-a="close">Cerrar</button>'));
  }
  // ---------- Modo página: textos de docs/INVENTARIO_CLARIDAD.md (sección 2) ----------
  var EXL = ['12 aceites y 8 detergentes', '6 paquetes de vasos', '20 kilos de arroz'];
  var UNIT_ONE = { botellas: 'botella', bolsas: 'bolsa', paquetes: 'paquete', latas: 'lata', kg: 'kilo' };
  function pageStepper() {
    var current = Math.min(F.step, 3);
    $('stp').innerHTML = ['Escribe', 'Revisa', 'Listo'].map(function (t, i) {
      var n = i + 1, cls = n < current ? 'is-done' : n === current ? 'is-current' : '';
      return '<li class="' + cls + '"' + (n === current ? ' aria-current="step"' : '') + '><span class="nx-steps__dot">' + (n < current ? ic('check') : n) + '</span>' + t + '</li>';
    }).join('');
  }
  // Lo antes posible no fija una fecha: usa el fin de la ventana y acepta la primera entrega.
  function quickDate(when) { return when === 'soon' ? store.after(calendarForEntry().minimum, 14) : when === 'next' ? store.finProximaSemana() : store.finDeSemana(); }
  function aplicarUrgencia() { F.items.forEach(function (i) { i.loAntesPosible = F.when === 'soon'; }); }
  function dayLabel(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d) : '';
  }
  function photo(k, icon) {
    var file = (window.NexoraProductImages || {})[k];
    return '<span class="nx-thumb" aria-hidden="true">' + (file ? '<img src="../../assets/images/' + esc(file) + '" alt="">' : ic(icon || 'box')) + '</span>';
  }
  // Los avisos del intérprete se muestran en una frase corta; su regla y su texto interno no cambian.
  function simpleWarning(it, c) {
    var w = it.warning || '';
    if (!c) return 'No reconocimos este producto. Elígelo:';
    if (/No convertimos unidades/.test(w)) return 'Escribe la cantidad en ' + c.unit + '.';
    if (/No identificamos la unidad/.test(w)) return '¿Son ' + c.unit + '? Revisa la cantidad.';
    if (/varios productos o números/.test(w) || /no pudimos ordenar/.test(w)) return 'No entendimos bien «' + (it.raw || '') + '». Revisa la cantidad.';
    if (/Producto corregido/.test(w)) return 'Escribe la cantidad en ' + c.unit + '.';
    return w;
  }
  function friendly(err) {
    if (!err) return '';
    if (/Revisa las filas señaladas/.test(err)) return 'Revisa los productos marcados y toca «Sí, está bien».';
    return err;
  }
  function pageWrite(err) {
    F.step = 1; stepper(); $('dt').textContent = '¿Qué necesitas comprar?'; asideClear();
    $('mb').innerHTML = '<p class="nr-lead">Escríbelo como lo dirías. Nosotros lo ordenamos.</p><label class="sr" for="ft">Tu pedido</label><textarea id="ft" class="nr-text" rows="3" placeholder="Ej: 12 botellas de aceite y 8 bolsas de detergente">' + esc(F.text) + '</textarea>' + (err ? '<p class="nr-error" role="alert">Escribe al menos un producto para continuar.</p>' : '') + '<div class="nr-examples"><span class="nx-detail">Ejemplos:</span>' + EXL.map(function (t, i) { return '<button type="button" class="nx-chip" data-ex="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div>';
    foot('<a class="nx-btn nx-btn--tertiary" href="' + esc(ui.buyerHref('catalogo.html')) + '">Prefiero elegir del catálogo</a><button class="nx-btn nx-btn--primary" type="button" data-a="interp">Ordenar mi pedido</button>');
    $('ft').focus();
  }
  function pageLoad() {
    F.step = 2; stepper(); $('dt').textContent = 'Ordenando tu pedido…'; asideClear();
    $('mb').innerHTML = '<p class="nr-lead" role="status">Un momento, estamos ordenando lo que escribiste.</p>'; foot('');
    clearT(); F.timers.push(setTimeout(function () { interpret(); view2(); }, 700));
  }
  function groupFor(k) { return store.get().opps.find(function (o) { return o.product === k && store.opportunityStatus(o) === 'abierta'; }); }
  function asideClear() { var box = $('nr-aside'); if (box) box.innerHTML = ''; }
  // Columna «Tu pedido»: resumen que se actualiza al cambiar cantidades, fecha o zona.
  function pageAside() {
    var box = $('nr-aside'); if (!box) return;
    var P = C(), items = F.items.filter(function (i) { return P[i.k]; }), zone = store.zones.find(function (z) { return z.id === F.zoneId; });
    var groups = 0, priced = false, total = 0;
    items.forEach(function (it) {
      var o = groupFor(it.k); if (!o) return; groups++;
      if (Number.isFinite(it.price) && it.price > 0) priced = true;
      if (Number.isFinite(it.qty) && it.qty > 0) { var a = tx.ahorro({ id: 'previa', qty: it.qty, priceIndividual: it.price }, o, { focusable: false }); if (a.hay) total += a.neto; }
    });
    var hint = !groups ? '' : '<div class="nr-aside__group">' + ic('spark') + '<div><strong>Hay compras en grupo para esto</strong><span>' + (total > 0 ? 'Ahorro estimado: <b>' + money(total) + '</b>' + (priced ? '' : ' <span class="tx-tags"><span class="tx-tag" title="No pusiste tu precio de hoy: comparamos con el precio normal del proveedor.">referencial</span></span>') : 'Con tu precio de hoy no hay ahorro.') + '</span></div></div>';
    box.innerHTML = '<section class="nx-card nr-aside__card"><h2 class="nx-h3 dt-title">' + ic('clip') + 'Tu pedido</h2>' +
      '<ul class="nr-sum">' + (items.length ? items.map(function (it) { return '<li><span>' + esc(P[it.k].name) + '</span><b>' + (Number.isFinite(it.qty) ? esc(it.qty + ' ' + P[it.k].unit) : '—') + '</b></li>'; }).join('') : '<li><span>Aún no hay productos</span></li>') + '</ul>' +
      '<p class="nr-sum__when">' + ic('track') + '<span>' + (F.when === 'soon' ? 'Lo antes posible' : 'Para el ' + esc(dayLabel(F.requiredDate))) + (zone ? ' · ' + esc(ui.plain ? ui.plain(zone.name) : zone.name) : '') + '</span></p>' + hint +
      '<div class="nr-savebar"><button class="nx-btn nx-btn--primary nx-btn--block" type="button" data-a="save">' + (F.edit ? 'Guardar cambios' : 'Guardar mi pedido') + '</button></div>' +
      '<p class="nx-note">' + ic('shield') + '<span>Guardar no es comprar. Tú decides después.</span></p></section>' +
      '<section class="nx-card nr-tips"><h2 class="nx-h3 dt-title">' + ic('spark') + 'Consejos</h2><p>Puedes escribir varios productos a la vez.</p><p>Elige la fecha en que realmente lo necesitas.</p></section>';
  }
  // Marca: por defecto «Cualquier marca»; con una marca elegida se decide si acepta similares.
  function brandsFor(k) { var out = []; store.get().opps.forEach(function (o) { if (o.product === k && o.marca && out.indexOf(o.marca) === -1) out.push(o.marca); }); return out; }
  function brandBlock(it, i) {
    var marca = it.marca || '', options = ['<option value="">Cualquier marca</option>'].concat(brandsFor(it.k).map(function (m) { return '<option value="' + esc(m) + '"' + (m === marca ? ' selected' : '') + '>' + esc(m) + '</option>'; })).join('');
    var solo = marca ? '<div class="nr-solo" role="radiogroup" aria-label="¿Aceptas similares?"><label><input type="radio" name="solo-' + i + '" data-solo="' + i + '" value="1"' + (it.soloEstaMarca ? ' checked' : '') + '><span>Solo esta marca</span></label><label><input type="radio" name="solo-' + i + '" data-solo="' + i + '" value="0"' + (it.soloEstaMarca ? '' : ' checked') + '><span>Acepto similares</span></label></div>' : '';
    return '<div class="nr-brand"><label class="nr-field">Marca <small>(opcional)</small><select data-field="marca" data-row="' + i + '">' + options + '</select></label>' + solo + '</div>';
  }
  function pageItem(it, i) {
    var P = C(), c = P[it.k], kg = c && c.unit === 'kg';
    var qtyError = it.qty === null || !Number.isFinite(it.qty) || it.qty <= 0 || (c && !kg && !Number.isInteger(it.qty));
    var warning = it.warning || !c ? simpleWarning(it, c) : '';
    var head = c ? '<div class="nr-item__name"><h3 class="nx-h3">' + esc(c.name) + '</h3><p class="nx-detail">' + esc(it.presentation || c.detail) + '</p>' + (groupFor(it.k) ? '<p class="nr-group">' + ic('check') + 'Hay compra en grupo</p>' : '') + '</div>'
      : '<div class="nr-item__name"><label class="nr-field">' + esc(warning) + '<select data-i="' + i + '"><option value="">Elige un producto…</option>' + Object.keys(P).map(function (k) { return '<option value="' + k + '">' + esc(P[k].name + ' · ' + P[k].detail) + '</option>'; }).join('') + '</select></label>' + (it.raw ? '<p class="nx-detail">Escribiste: «' + esc(it.raw) + '»</p>' : '') + '</div>';
    var qty = c ? '<div class="nr-qty" role="group" aria-label="Cantidad de ' + esc(c.name) + '"><button class="nx-btn nx-btn--secondary nx-btn--icon" type="button" data-a="dec" data-i="' + i + '" aria-label="Uno menos">−</button><input type="number" inputmode="' + (kg ? 'decimal' : 'numeric') + '" min="' + (kg ? '0.01' : '1') + '" step="' + (kg ? '0.01' : '1') + '" value="' + (it.qty === null ? '' : it.qty) + '" data-q="' + i + '" aria-label="Cantidad en ' + esc(c.unit) + '"><button class="nx-btn nx-btn--secondary nx-btn--icon" type="button" data-a="inc" data-i="' + i + '" aria-label="Uno más">+</button><span class="nr-unit">' + esc(c.unit) + '</span></div>' : '';
    var price = c ? '<label class="nr-field nr-price">¿A cuánto lo compras hoy? <small>(opcional)</small><span class="nr-money"><span aria-hidden="true">S/</span><input data-field="price" data-row="' + i + '" type="number" inputmode="decimal" min="0.01" step="0.01" value="' + (it.price === null ? '' : it.price) + '" placeholder="0.00" aria-label="Precio por ' + esc(UNIT_ONE[c.unit] || c.unit) + ' en soles"></span><small>Así calculamos cuánto ahorras.</small></label>' : '';
    var brand = c && !F.edit ? brandBlock(it, i) : '';
    var notes = (c && warning ? '<div class="nr-warn"><p>' + esc(warning) + '</p><label><input type="checkbox" data-review="' + i + '"' + (it.reviewed ? ' checked' : '') + '> Sí, está bien</label></div>' : '') + (c && qtyError && (F.reviewAttempted || it.qty !== null) ? '<p class="nr-error">Escribe un número ' + (kg ? '' : 'entero ') + 'mayor que 0.</p>' : '');
    return '<article class="nx-card nr-item' + (warning ? ' nr-item--warn' : '') + '">' + photo(it.k, c && c.icon) + head + qty + price + brand + (F.edit ? '' : '<button class="nx-btn nx-btn--danger nx-btn--sm nr-remove" type="button" data-a="del" data-i="' + i + '">Quitar</button>') + notes + '</article>';
  }
  function pageReview(err, focusSelector) {
    F.step = 2; stepper(); $('dt').textContent = F.edit ? 'Editar pedido' : 'Revisa tu pedido'; if (F.edit) $('stp').innerHTML = '';
    var when = F.when || (F.items.some(function (i) { return i.loAntesPosible; }) ? 'soon' : F.requiredDate === quickDate('this') ? 'this' : F.requiredDate === quickDate('next') ? 'next' : 'pick');
    var dates = [['soon', 'Lo antes posible'], ['this', 'Esta semana · hasta el ' + window.NexoraCompra.fechaCorta(quickDate('this'))], ['next', 'Próxima semana'], ['pick', 'Elegir fecha']].map(function (d) { return '<button type="button" class="nx-chip" data-a="when" data-when="' + d[0] + '" aria-pressed="' + (when === d[0]) + '">' + d[1] + '</button>'; }).join('');
    var zoneNow = store.zones.find(function (z) { return z.id === F.zoneId; });
    var zones = !F.changeZone ? '<p class="nr-zone-now"><span>Zona: <strong>' + esc(zoneNow ? ui.plain(zoneNow.name) : 'Elige una zona') + '</strong></span> · <button type="button" class="nx-btn nx-btn--tertiary nx-btn--sm" data-a="zone">Cambiar</button></p>' : store.zones.map(function (z) { return '<label class="nr-zone"><input type="radio" name="required-zone" value="' + z.id + '"' + (z.id === F.zoneId ? ' checked' : '') + '><span>' + esc(ui.plain ? ui.plain(z.name) : z.name) + '</span></label>'; }).join('');
    $('mb').innerHTML = '<p class="nr-lead">' + (F.edit ? 'Cambia la cantidad, la fecha, la zona o tu precio.' : 'Cambia las cantidades si hace falta.') + '</p>' + (!F.fromCatalog && F.text ? '<p class="nx-quote"><small>Escribiste</small>«' + esc(F.text) + '»</p>' : '') +
      '<div class="nr-items">' + F.items.map(pageItem).join('') + '</div>' + (F.edit ? '' : '<button class="nr-add" type="button" data-a="add">' + ic('plus') + 'Agregar producto</button>') +
      '<section class="nr-when" aria-labelledby="nr-when-title"><h3 class="nx-h3" id="nr-when-title">¿Para cuándo lo necesitas?</h3><div class="nx-chips">' + dates + '</div>' + (when === 'pick' ? '<label class="nr-field">Fecha<input id="required-date" type="date" min="' + store.today() + '" value="' + esc(F.requiredDate) + '"></label>' : '') + '<p class="nr-date" role="status">Para el ' + esc(dayLabel(F.requiredDate)) + '</p></section>' +
      '<section class="nr-when" aria-labelledby="nr-zone-title"><h3 class="nx-h3" id="nr-zone-title">Zona</h3><div class="nr-zones">' + zones + '</div></section>' +
      (err ? '<p class="nr-error" role="alert">' + esc(friendly(err)) + '</p>' : '') + (F.dup ? dupBox() : '');
    foot(F.fromCatalog || F.edit ? '' : '<button class="nx-btn nx-btn--tertiary" type="button" data-a="back">← Cambiar lo que escribí</button>');
    pageAside();
    $('mb').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ic('box'); }); });
    var field = focusSelector && $('mb').querySelector(focusSelector); if (field) field.focus();
  }
  // Línea corta cuando hay coincidencia: el ahorro estimado, o qué precio pagarías.
  function matchLine(n, o) {
    var a = tx.ahorro(n, o);
    return a.html || 'Precio en grupo: ' + money(tx.precio(o)) + ' por ' + (UNIT_ONE[o.unit] || o.unit) + '.';
  }
  function pageDone() {
    F.step = 3; stepper(); $('dt').textContent = '¡Listo! Guardamos tu pedido.'; asideClear();
    var found = matchGroups();
    var cards = F.saved.map(function (n) {
      var o = found.groups.filter(function (g) { return g.needs.indexOf(n) !== -1; }).map(function (g) { return g.opportunity; })[0];
      var why = o ? null : store.noMatchReason(n);
      return '<article class="nx-card nr-result">' + photo(n.productId) + '<div><h3 class="nx-h3">' + esc(n.product) + '</h3><p class="nx-detail">' + esc(n.qty + ' ' + n.unit) + '</p><p class="nr-result__line">' + (o ? 'Hay una compra en grupo · ' + matchLine(n, o) + '</p><p class="nr-result__line">' + tx.linea(o) + '</p><p class="nr-result__line">' + tx.chipEstado(o) + ' ' + tx.chipLlega(o, n) + '</p><p class="nr-result__line">' + tx.mini(o) : why ? esc(why.text) : 'Aún no hay compras en grupo para esto. Lo verás en Mis necesidades.') + '</p></div>' +
        (o ? '<a class="nx-btn nx-btn--primary" href="' + esc(ui.buyerHref('detalle-oportunidad.html?id=' + encodeURIComponent(o.id) + '&necesidad=' + encodeURIComponent(n.id))) + '">Ver compra en grupo</a>'
          : why && why.kind === 'date' ? '<a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('necesidad-nueva.html?editar=' + encodeURIComponent(n.id))) + '">Cambiar mi fecha</a>'
            : '<a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('oportunidades.html')) + '">Ver compras en grupo</a>') + '</article>';
    }).join('');
    var steps = '<ol class="nx-steps nr-next" aria-label="¿Qué pasa ahora?"><li class="is-done"><span class="nx-steps__dot">' + ic('check') + '</span>Guardaste tu pedido</li><li class="' + (found.groups.length ? 'is-done' : 'is-current') + '"><span class="nx-steps__dot">' + (found.groups.length ? ic('check') : 2) + '</span>' + (found.groups.length ? 'Hay compra en grupo' : 'Buscamos compras en grupo') + '</li><li class="' + (found.groups.length ? 'is-current' : '') + '"><span class="nx-steps__dot">3</span>Tú decides si te unes</li></ol>';
    // Primer pedido guardado por ti: el logo horizontal (enlace al inicio); después, la ilustración de la sección.
    var first = store.get().orders.filter(function (o) { return !/^PED-DEMO-/.test(o.id); }).length === 1;
    var hero = first ? '<a class="nr-logo" href="' + esc(ui.buyerHref('dashboard.html')) + '" data-k="inicio" aria-label="NEXORA, ir al inicio"><img src="../../assets/images/logo-nexora-800.png" width="320" height="90" alt=""></a>' : '<div class="nr-art" aria-hidden="true"></div>';
    if (found.groups.length) steps = tx.pasos(found.groups[0].opportunity);
    $('mb').innerHTML = hero + '<section class="nr-done"><h3 class="nx-h3">¿Qué pasa ahora?</h3>' + steps + '</section><div class="nr-results">' + cards + '</div>';
    window.dispatchEvent(new CustomEvent('nexora-demo-matches', { detail: found.hl }));
    foot('<button class="nx-btn nx-btn--tertiary" type="button" data-a="again">Agregar otro pedido</button><a class="nx-btn nx-btn--secondary" href="' + esc(ui.buyerHref('necesidades.html')) + '">Ver Mis necesidades</a>');
    $('mb').querySelectorAll('.nx-thumb img').forEach(function (img) { img.addEventListener('error', function () { var box = img.parentElement; img.remove(); box.innerHTML = ic('box'); }); });
    $('dt').setAttribute('tabindex', '-1'); $('dt').focus();
  }
  function openFlow(text) {
    var calendar; try { calendar = calendarForEntry(); } catch(error) { ui.toast('No se pudo consultar la fecha de Lima. Tus datos se conservan.'); return false; }
    returnFocus = document.activeElement;
    F = { step: 1, text: text, items: [], saved: [], timers: [], requiredDate: calendar.suggestedDate, zoneId: store.zonaPorDefecto ? store.zonaPorDefecto() : 'sa-centro' };
    if (!PAGE) $('dlg').showModal(); if (text.trim().length >= 3) view2load(); else view1();
  }
  function openEdit(id) {
    var calendar; try { calendar = calendarForEntry(); } catch(error) { ui.toast('No se pudo consultar la fecha de Lima. Tus datos se conservan.'); return false; }
    var n = store.get().needs.find(function (x) { return x.id === id; });
    if (!n || !['Registrada', 'Con coincidencia'].includes(n.status)) { ui.toast('No encontramos este pedido para editar.'); return false; }
    F = { edit: n.id, step: 2, text: '', items: [{ k: n.productId, qty: n.qty, raw: '', brand: n.brand || '', presentation: n.presentation, price: n.priceIndividual === undefined ? null : n.priceIndividual }], saved: [], timers: [], requiredDate: n.requiredDate < calendar.minimum ? calendar.suggestedDate : n.requiredDate, zoneId: n.zoneId };
    var joined = store.participationForNeed(n.id);
    if (joined) { pageBlocked(joined.id); return true; }
    view2(false, '[data-q="0"]'); return true;
  }
  function openProduct(id) {
    var calendar; try { calendar = calendarForEntry(); } catch(error) { ui.toast('No se pudo consultar la fecha de Lima. Tus datos se conservan.'); return false; }
    var p = store.productById(id);
    if (!p || (!PAGE && $('dlg').open)) return false;
    returnFocus = document.activeElement;
    F = { fromCatalog: true, step: 2, text: 'Registro estructurado desde Catálogo · ' + id, items: [{ k: id, qty: null, raw: '', brand: p.brand || '', presentation: p.detail, price: null }], saved: [], timers: [], requiredDate: calendar.suggestedDate, zoneId: store.zonaPorDefecto ? store.zonaPorDefecto() : 'sa-centro' };
    if (!PAGE) $('dlg').showModal(); view2(false, '[data-q="0"]'); return true;
  }
  var batchHooks = {};
  function batchSnapshot() { return JSON.parse(JSON.stringify({items:F.items,requiredDate:F.requiredDate,zoneId:F.zoneId})); }
  function keepBatch(previous) {
    if (!F || !F.catalogBatch || F.saved.length) return;
    if (!batchHooks.onDraft || !batchHooks.onDraft(batchSnapshot())) {
      if(previous) { F.items=previous.items;F.requiredDate=previous.requiredDate;F.zoneId=previous.zoneId; }
      ui.toast('No se pudieron conservar los cambios de tu lista. Se mantiene el valor anterior.');view2('No se guardó el último cambio. Inténtalo de nuevo.');
    }
  }
  function openProducts(draft,hooks) {
    if((!PAGE && $('dlg').open) || !draft || !Array.isArray(draft.items) || !draft.items.length) return false;
    var calendar=calendarForEntry(); batchHooks=hooks||{};returnFocus=document.activeElement;
    F={catalogBatch:true,fromCatalog:true,step:2,text:'Lista de productos seleccionados en Catálogo',items:JSON.parse(JSON.stringify(draft.items)),saved:[],timers:[],requiredDate:draft.requiredDate||calendar.suggestedDate,zoneId:draft.zoneId||'sa-centro'};
    if(!batchHooks.onDraft || !batchHooks.onDraft(batchSnapshot())) {ui.toast('No se pudo conservar la lista. No abrimos el registro.');return false;}
    if (!PAGE) $('dlg').showModal();view2(false,'[data-q="0"]');return true;
  }
  function init(config) {
    options = config || {};
    if ($('ask')) {
    $('ex').innerHTML = '<span>Prueba con:</span>' + EX.map(function (t, i) { return '<button type="button" data-ex="' + i + '">' + EXL[i] + '</button>'; }).join('');
    $('ex').addEventListener('click', function (e) { var b = e.target.closest('[data-ex]'); if (b) { $('tx').value = EX[+b.dataset.ex]; $('err').hidden = true; $('tx').focus(); } });
    $('ask').addEventListener('submit', function (e) { e.preventDefault(); var text = $('tx').value.trim(); if (text.length < 3) { $('err').hidden = false; $('tx').focus(); return; } $('err').hidden = true; if (options.registrationPage) location.assign(ui.buyerHref(options.registrationPage) + '#pedido=' + encodeURIComponent(text)); else openFlow(text); });
    $('tx').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('ask').requestSubmit(); } });
    }
    var dlg = surface();
    if (!dlg) return; // Sin modal en las páginas: el registro vive en necesidad-nueva.html.
    if (!PAGE) {
      dlg.addEventListener('close', function () { clearT(); requestAnimationFrame(function () { if (options.onClose) options.onClose({ fromCatalog: !!F.fromCatalog }); else if (returnFocus && document.contains(returnFocus)) returnFocus.focus(); }); });
      $('dx').addEventListener('click', function () { dlg.close(); });
    }
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ex],[data-a]'); if (!b) return;
      if (b.dataset.ex !== undefined) { $('ft').value = EX[+b.dataset.ex]; return; }
      var a = b.dataset.a;
      if (a === 'close') dlg.close();
      else if (a === 'interp') { F.text = $('ft').value.trim(); F.text.length < 3 ? view1(true) : view2load(); }
      else if (a === 'back') { if(F.catalogBatch) dlg.close(); else view1(); }
      else if (a === 'add') { var previous=F.catalogBatch?batchSnapshot():null;F.items.push({ k: '', qty: null, raw: '', brand: '', presentation: '', price: null }); view2(false, 'select[data-i="' + (F.items.length - 1) + '"]');if(F.catalogBatch)keepBatch(previous); }
      else if (a === 'del') { var before=F.catalogBatch?batchSnapshot():null;F.items.splice(+b.dataset.i, 1); view2();if(F.catalogBatch)keepBatch(before); }
      else if (a === 'save') save();
      else if (a === 'inc' || a === 'dec') { var item = F.items[+b.dataset.i], next = (Number.isFinite(item.qty) ? item.qty : 0) + (a === 'inc' ? 1 : -1); item.qty = next >= 1 ? next : 1; item.reviewed = false; view2(false, '[data-q="' + b.dataset.i + '"]'); }
      else if (a === 'zone') { F.changeZone = true; pageReview(false, 'input[name="required-zone"]'); }
      else if (a === 'dup-update') dupUpdate();
      else if (a === 'dup-new') { F.dupOk = true; F.dup = null; save(); }
      else if (a === 'when') { F.when = b.dataset.when; if (F.when !== 'pick') F.requiredDate = quickDate(F.when); aplicarUrgencia(); view2(false, F.when === 'pick' ? '#required-date' : '[data-when="' + F.when + '"]'); }
      else if (a === 'match') view4load();
      else if (a === 'again') { if ($('tx')) $('tx').value = ''; F.text = ''; F.saved = []; F.fromCatalog = false; F.catalogBatch = false; batchHooks = {}; view1(); }
      else if (a === 'goops') { dlg.close(); if (options.onOpportunities) options.onOpportunities(); else location.assign(ui.buyerHref('oportunidades.html')); }
    });
    dlg.addEventListener('input', function (e) {
      var previous=F&&F.catalogBatch?batchSnapshot():null;var t = e.target;
      if (t.dataset.q !== undefined) { F.items[+t.dataset.q].qty = t.value === '' ? null : Number(t.value); F.items[+t.dataset.q].reviewed = false; var check = $('mb').querySelector('[data-review="' + t.dataset.q + '"]'); if (check) check.checked = false; }
      if (t.dataset.field) { var i = F.items[+t.dataset.row]; i[t.dataset.field] = t.dataset.field === 'price' ? (t.value === '' ? null : Number(t.value)) : t.value; if (t.dataset.field === 'marca') { i.brand = t.value; if (!t.value) i.soloEstaMarca = false; if (PAGE && F.step === 2) pageReview(false, '[data-field="marca"][data-row="' + t.dataset.row + '"]'); } }
      if (t.id === 'required-date') F.requiredDate = t.value;
      if(F.catalogBatch)keepBatch(previous);
      if (PAGE && F.step === 2 && !F.saved.length) pageAside();
    });
    dlg.addEventListener('change', function (e) {
      var previous=F&&F.catalogBatch?batchSnapshot():null;var t = e.target;
      if (t.dataset.review !== undefined) F.items[+t.dataset.review].reviewed = t.checked;
      if (t.dataset.solo !== undefined) F.items[+t.dataset.solo].soloEstaMarca = t.value === '1';
      if (t.id === 'required-zone' || t.name === 'required-zone') F.zoneId = t.value;
      if (t.dataset.i !== undefined && t.tagName === 'SELECT') { var index = +t.dataset.i, p = C()[t.value]; F.items[index].k = t.value; F.items[index].presentation = p ? p.detail : ''; F.items[index].qty = null; F.items[index].reviewed = false; F.items[index].warning = p ? 'Producto corregido. Completa la cantidad en ' + p.unit + ' y confirma la fila.' : 'Elige un producto.'; view2(false, 'select[data-i="' + index + '"]'); }
      if(F.catalogBatch)keepBatch(previous);
      if (PAGE && F.step === 2 && !F.saved.length && t.tagName !== 'SELECT') pageAside();
    });
  }
  window.NexoraFlow = { interpretarPedido: parse, init: init, open: openFlow, openEdit: openEdit, openProduct: openProduct, openProducts: openProducts };
})();
