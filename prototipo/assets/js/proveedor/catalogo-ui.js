/* Interfaz 2B. Las decisiones comerciales y la persistencia pertenecen al store 2A. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('vista') === 'precios') return;
  var ui = window.NexoraProviderUI, api = window.NexoraProviderState.catalog;
  var root, model = null, editingId = null, step = 1, dirty = false, pending = null;
  var filters = {search:'', categoryId:'', status:''}, activeId = null;
  var statuses = {borrador:'Borrador privado', activo:'Activo · privado', inactivo:'Inactivo'};
  var images = ['aceite','vasos','detergente','arroz','leche','fideos'];
  var packageChoice='', customPackage='', touched={};
  var steps = ['Producto','Precios','Condiciones','Revisión'];
  function esc(v) { return ui.esc(v == null ? '' : v); }
  function $(id) { return document.getElementById(id); }
  function money(v) { return typeof v === 'number' ? esc(ui.money(v)) : 'Sin definir'; }
  function btn(action, text, primary, id) { return '<button type="button" class="nx-btn nx-btn--' + (primary ? 'primary' : 'secondary') + '" data-cat-action="' + action + '"' + (id ? ' data-cat-id="' + esc(id) + '"' : '') + '>' + text + '</button>'; }
  function picture(p) { return p.image ? '<img src="../../' + esc(p.image) + '" alt="' + esc(p.name || 'Producto') + '" width="128" height="128">' : '<span class="cat-no-image">Sin imagen</span>'; }
  function badge(p) { return '<span class="cat-state cat-state--' + p.status + '">' + statuses[p.status] + '</span>'; }
  function field(key, label, input) { return '<div class="cat-field"><label for="cat-' + key + '">' + label + '</label>' + input + '<span class="cat-field-error" aria-live="polite" id="cat-error-' + key + '"></span></div>'; }
  function input(key, type, value) { return '<input' + (['contentQuantity','unitsPerSale','price','minimum'].includes(key) ? ' inputmode="decimal"' : '') + ' id="cat-' + key + '" type="' + (type || 'text') + '" value="' + esc(value) + '" aria-describedby="cat-error-' + key + '">'; }
  function select(key, values, selected, placeholder) { return '<select id="cat-' + key + '" aria-describedby="cat-error-' + key + '"><option value="">' + (placeholder || 'Selecciona') + '</option>' + values.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === selected ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function announce(text) { if (ui.toast) ui.toast(text); }
  function url(mode, id) { var p = new URLSearchParams(); if (mode) p.set(mode, id || '1'); return ui.href('productos-ofertas.html' + (p.toString() ? '?' + p : '')); }
  function setURL(mode, id) { if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', url(mode,id)); }
  function focusView(selector) { var h=root.querySelector(selector); if(h && h.setAttribute){h.setAttribute('tabindex','-1');h.focus();} }
  function note() { return '<p class="cat-private">Catálogo privado de tu negocio. Los compradores todavía no ven estos productos.</p>'; }
  function error(message) { root.innerHTML = '<section class="cat-panel"><h2>No pudimos abrir tu catálogo</h2><p role="alert">' + esc(message) + '</p>' + btn('list','Volver a consultar',true) + '</section>'; }
  function volume(p) { return p.priceTiers.length ? money(Math.min.apply(null,p.priceTiers.map(function (t) { return t.unitPrice; }))) : 'Sin tramos'; }
  function countText(n) { return n + (n===1 ? ' producto encontrado' : ' productos encontrados'); }
  function card(p) {
    return '<article class="cat-card"><div class="cat-product"><div class="cat-photo">' + picture(p) + '</div><div>' + badge(p) + '<h2>' + esc(p.name || 'Producto sin nombre') + '</h2><p>' + esc(p.presentation ? p.presentation.label : 'Presentación pendiente') + '</p><small>' + esc(p.brand || 'Sin marca indicada') + '</small><p class="cat-sale-unit">' + (p.saleUnit ? 'Venta en ' + esc(p.saleUnit) + (p.unitsPerSale ? ' · ' + p.unitsPerSale + (p.unitsPerSale===1 ? ' presentación' : ' presentaciones') : '') : 'Unidad de venta pendiente') + '</p></div></div><dl class="cat-facts"><div><dt>Precio normal</dt><dd>' + money(p.normalUnitPrice) + '</dd></div><div><dt>Volumen desde</dt><dd>' + volume(p) + '</dd></div><div><dt>Mínimo en ' + esc(p.saleUnit || 'unidades de venta') + '</dt><dd>' + esc(p.minimumQuantity === null ? 'Sin definir' : p.minimumQuantity) + '</dd></div></dl><div class="cat-actions">' + btn('detail','Ver detalle',false,p.id) + btn('edit','Editar',true,p.id) + btn(p.status === 'inactivo' ? 'reactivate' : 'deactivate',p.status === 'inactivo' ? 'Reactivar' : 'Desactivar',false,p.id) + '</div></article>';
  }
  function list() {
    dirty = false; model = null; activeId = null; setURL();
    var all = api.list(), view = api.list(filters); if (all.error || view.error) { error(all.error || view.error); return; }
    var opts = api.options();
    root.innerHTML = '<div class="cat-page-head"><div><h2>Tus productos</h2><p>Organiza precios, cantidades y zonas de atención.</p></div>' + btn('new','+ Registrar producto',true) + '</div>' + note() + '<section class="cat-counts" aria-label="Productos por estado">' + [['activo','Activos'],['borrador','Borradores'],['inactivo','Inactivos']].map(function (s) { return '<div><strong>' + all.items.filter(function(p){return p.status===s[0];}).length + '</strong><span>' + s[1] + '</span></div>'; }).join('') + '</section><nav class="cat-tabs" aria-label="Estado de productos">' + [['','Todos los productos'],['activo','Activos'],['borrador','Borradores'],['inactivo','Inactivos']].map(function(s){return '<button type="button" data-cat-status="' + s[0] + '" aria-pressed="' + (filters.status===s[0]) + '">' + s[1] + '</button>';}).join('') + '</nav><section class="cat-panel cat-filters">' + field('search','Buscar por nombre o marca',input('search','search',filters.search)) + field('category','Categoría',select('category',opts.categoryIds.map(function(k){return [k,window.NexoraData.categories[k].name];}),filters.categoryId,'Todas las categorías')) + field('status','Estado',select('status',[['activo','Activo'],['borrador','Borrador'],['inactivo','Inactivo']],filters.status,'Todos los estados')) + btn('clear','Limpiar filtros') + '</section><p id="cat-count" role="status">' + countText(view.items.length) + '</p><div id="cat-results">' + results(view.items,all.items.length) + '</div><aside class="cat-legacy"><h2>Precios para compras existentes</h2><p>Consulta los borradores que guardaste para cada compra en grupo.</p><a class="nx-btn nx-btn--secondary" href="' + ui.href('productos-ofertas.html?vista=precios') + '">Ver precios por compra</a></aside>';
  }
  function results(items,total) { return items.length ? '<div class="cat-grid">' + items.map(card).join('') + '</div>' : '<section class="cat-panel cat-empty"><h2>' + (total ? 'No encontramos productos con esos filtros' : 'Tu catálogo está por comenzar') + '</h2><p>' + (total ? 'Prueba otro nombre, categoría o estado.' : 'Registra tu primer producto o guarda un borrador para completarlo después.') + '</p></section>'; }
  function filterList() { filters.search=$('cat-search').value; filters.categoryId=$('cat-category').value; filters.status=$('cat-status').value; var all=api.list(),r=api.list(filters); if(r.error||all.error){error(r.error||all.error);return;} $('cat-results').innerHTML=results(r.items,all.items.length); $('cat-count').textContent=countText(r.items.length); root.querySelectorAll('[data-cat-status]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.catStatus===filters.status));}); }
  function facts(p) {
    function row(k,v){return '<div><dt>'+k+'</dt><dd>'+v+'</dd></div>';}
    return '<dl class="cat-detail-facts">' + row('Presentación',esc(p.presentation ? p.presentation.label : 'Sin definir')) + row('Contenido por presentación',p.presentation ? esc(p.presentation.contentQuantity+' '+p.presentation.contentUnit) : 'Sin definir') + row('Unidad de venta',esc(p.saleUnit || 'Sin definir')) + row('Presentaciones por unidad vendida',esc(p.unitsPerSale === null ? 'Sin definir' : p.unitsPerSale)) + row('Marca',esc(p.brand || 'Sin marca indicada')) + row('Categoría',esc(p.categoryId ? window.NexoraData.categories[p.categoryId].name : 'Sin definir')) + row('Precio normal por unidad de venta',money(p.normalUnitPrice)) + row('Mínimo para compra conjunta',esc(p.minimumQuantity === null ? 'Sin definir' : p.minimumQuantity+' '+p.saleUnit)) + row('Disponibilidad',p.available===null?'Sin definir':p.available?'Disponible':'No disponible') + row('Zonas de atención',p.zoneIds.length ? p.zoneIds.map(function(z){return esc(window.NexoraProviders.zoneName(z));}).join('<br>') : 'Sin definir') + '</dl>';
  }
  function detail(id) { var r=api.detail(id); if(r.error){error(r.error);return;} var p=r.product; activeId=id; model=null; dirty=false; setURL('producto',id); root.innerHTML='<div class="cat-page-head">'+btn('list','← Mi catálogo')+'<div class="cat-actions">'+btn('edit','Editar',true,id)+btn(p.status==='inactivo'?'reactivate':'deactivate',p.status==='inactivo'?'Reactivar':'Desactivar',false,id)+'</div></div>'+note()+'<section class="cat-panel cat-detail"><div class="cat-detail-photo">'+picture(p)+'</div><div>'+badge(p)+'<h2>'+esc(p.name||'Producto sin nombre')+'</h2>'+facts(p)+'</div></section><section class="cat-panel"><h2>Precios por volumen</h2><p>El precio cambia al alcanzar cada cantidad. Se aplica a la unidad de venta indicada.</p><p>Por debajo del primer tramo se usa el precio normal. No convertimos cajas a botellas.</p>'+tiersView(p)+'</section><p id="cat-action-error" role="alert"></p>'; focusView('.cat-detail h2'); }
  function tiersView(p) { return p.priceTiers.length ? '<ul class="cat-tier-list">'+p.priceTiers.map(function(t){return '<li><span>Desde <strong>'+t.minQuantity+' '+esc(p.saleUnit||'unidades de venta')+'</strong></span><strong>'+money(t.unitPrice)+'</strong></li>';}).join('')+'</ul>' : '<p class="cat-muted">No hay tramos de volumen configurados.</p>'; }
  function blank() { return {name:'',brand:'',categoryId:null,presentation:null,saleUnit:null,unitsPerSale:null,image:null,normalUnitPrice:null,priceTiers:[],minimumQuantity:null,available:null,zoneIds:[],status:'borrador'}; }
  function edit(id) { var r=id?api.detail(id):{product:blank()}; if(r.error){error(r.error);return;} var p=r.product; model=JSON.parse(JSON.stringify(p)); delete model.id;delete model.providerId;delete model.createdAt;delete model.updatedAt;packageChoice=api.presentationFields(model.presentation).kind;customPackage=api.presentationFields(model.presentation).customLabel;touched={};editingId=id||null;activeId=null;step=1;dirty=false;setURL(id?'editar':'nuevo',id);wizard(); }
  function numeric(text) { var s=String(text == null ? '' : text).trim(),n=Number(s.replace(',','.')); return s===''?null:Number.isFinite(n)?n:s; }
  function number(id) { return numeric($(id).value); }
  function capture() {
    if(!model)return;
    if(step===1){model.name=$('cat-name').value;model.brand=$('cat-brand').value;model.categoryId=$('cat-categoryId').value||null;model.saleUnit=$('cat-saleUnit').value||null;model.unitsPerSale=number('cat-unitsPerSale');model.image=$('cat-image').value||null;packageChoice=$('cat-package').value||'';customPackage=packageChoice==='otro'?$('cat-customPackage').value||'':customPackage;var qty=number('cat-contentQuantity'),unit=$('cat-contentUnit').value||'';model.presentation=packageChoice||qty!==null||unit?api.buildPresentation(packageChoice,qty,unit,customPackage):null;}
    if(step===2){model.normalUnitPrice=number('cat-price');model.priceTiers=Array.from(root.querySelectorAll('[data-cat-tier]')).map(function(row){return {minQuantity:numeric(row.querySelector('[data-tier-qty]').value),unitPrice:numeric(row.querySelector('[data-tier-price]').value)};});}
    if(step===3){model.minimumQuantity=number('cat-minimum');var availability=$('cat-available').value;model.available=availability===''?null:availability==='true'?true:availability==='false'?false:availability;model.zoneIds=Array.from(root.querySelectorAll('[data-cat-zone]:checked')).map(function(c){return c.value;});}
  }
  function wizard() {
    var opts=api.options(),p=model,pr=p.presentation||{},body='';
    if(step===1)body='<div class="cat-fields">'+field('name','Nombre del producto',input('name','text',p.name))+field('brand','Marca (opcional)',input('brand','text',p.brand))+field('categoryId','Categoría',select('categoryId',opts.categoryIds.map(function(k){return [k,window.NexoraData.categories[k].name];}),p.categoryId))+field('package','¿Cómo viene el producto?',select('package',opts.packages.map(function(k){return[k.id,k.label];}),packageChoice))+(packageChoice==='otro'?field('customPackage','Describe el envase',input('customPackage','text',customPackage)):'')+field('contentQuantity','Cantidad por envase',input('contentQuantity','text',pr.contentQuantity))+field('contentUnit','Unidad de medida',select('contentUnit',opts.contentUnits.map(function(k){return[k,k];}),pr.contentUnit))+field('saleUnit','Forma de venta',select('saleUnit',opts.saleUnits.map(function(k){return[k,k];}),p.saleUnit))+field('unitsPerSale','Envases por unidad vendida',input('unitsPerSale','text',p.unitsPerSale))+field('image','Imagen del producto (opcional)',select('image',images.map(function(k){return['assets/images/producto-'+k+'.png',window.NexoraData.products[k].name];}).concat(p.image&&!images.some(function(k){return p.image==='assets/images/producto-'+k+'.png';})?[[p.image,'Imagen guardada']]:[]),p.image,'Sin imagen'))+'</div><p class="cat-hint" id="cat-presentation-preview"></p><p class="cat-hint">Ejemplo: una caja de 12 botellas de 1 L vende “cajas”, con 12 presentaciones.</p>';
    if(step===2)body=field('price','Precio normal por '+esc(p.saleUnit||'unidad de venta')+' (S/)',input('price','text',p.normalUnitPrice))+'<h3>Precios por volumen</h3><p class="cat-hint">Agrega cantidades de inicio en orden creciente. El último tramo no tiene límite superior.</p><div id="cat-tiers">'+p.priceTiers.map(function(t,i){return '<div class="cat-tier-row" data-cat-tier><label for="cat-tier-'+i+'-qty">Desde cantidad<input id="cat-tier-'+i+'-qty" aria-describedby="cat-error-tier-'+i+'-qty" data-tier-qty inputmode="decimal" aria-label="Cantidad del tramo '+(i+1)+'" value="'+esc(t.minQuantity)+'"><span class="cat-field-error" aria-live="polite" id="cat-error-tier-'+i+'-qty"></span></label><label for="cat-tier-'+i+'-price">Precio (S/)<input id="cat-tier-'+i+'-price" aria-describedby="cat-error-tier-'+i+'-price" data-tier-price inputmode="decimal" aria-label="Precio del tramo '+(i+1)+'" value="'+esc(t.unitPrice)+'"><span class="cat-field-error" aria-live="polite" id="cat-error-tier-'+i+'-price"></span></label><button class="nx-btn nx-btn--secondary" type="button" data-cat-action="remove-tier" data-index="'+i+'" aria-label="Quitar tramo '+(i+1)+'">Quitar</button></div>';}).join('')+'</div><span class="cat-field-error" aria-live="polite" id="cat-error-tiers"></span>'+btn('add-tier','+ Agregar tramo');
    if(step===3)body='<div class="cat-fields">'+field('minimum','Mínimo para compra conjunta en '+esc(p.saleUnit||'unidades de venta'),input('minimum','text',p.minimumQuantity))+field('available','Disponibilidad',select('available',[['true','Disponible'],['false','No disponible']],p.available===null?'':String(p.available)))+'</div><fieldset class="cat-zones" id="cat-zones" tabindex="-1" aria-describedby="cat-error-zones"><legend>Zonas de atención</legend>'+opts.zoneIds.map(function(z){return '<label><input type="checkbox" value="'+z+'" data-cat-zone'+(p.zoneIds.includes(z)?' checked':'')+'> '+esc(window.NexoraProviders.zoneName(z))+'</label>';}).join('')+'<span class="cat-field-error" aria-live="polite" id="cat-error-zones"></span></fieldset>';
    if(step===4)body='<div class="cat-review"><div class="cat-photo">'+picture(p)+'</div><div><h3>'+esc(p.name||'Nombre pendiente')+'</h3><p>Revisa tus datos antes de guardar. Puedes volver a cualquier paso.</p></div></div>'+facts(p)+tiersView(p)+'<p><strong>Estado al guardar: '+(p.status==='inactivo'?'Inactivo':'Activo · privado')+'</strong></p><p class="cat-hint">' + (p.status==='inactivo'?'Se conserva inactivo al guardar.':'Registrar lo deja activo en tu catálogo privado.') + ' No se publica para compradores.</p>';
    root.innerHTML='<div class="cat-page-head"><h2>'+(editingId?'Editar producto':'Registrar producto')+'</h2>'+btn('cancel','Cancelar')+'</div>'+note()+'<ol class="cat-steps">'+steps.map(function(s,i){return '<li'+(i+1===step?' aria-current="step"':'')+'><span>'+(i+1)+'</span>'+s+'</li>';}).join('')+'</ol><section class="cat-panel cat-wizard"><h3>Paso '+step+' · '+steps[step-1]+'</h3><form id="cat-form" novalidate>'+body+'<p id="cat-error" class="cat-error" role="alert" tabindex="-1"></p><div class="cat-actions cat-wizard-actions">'+(step>1?btn('previous','← Anterior'):'')+btn('draft','Guardar borrador')+(step<4?'<button id="cat-continue" class="nx-btn nx-btn--primary" type="submit">Continuar →</button>':'<button id="cat-continue" class="nx-btn nx-btn--primary" type="submit">'+(editingId?'Guardar producto':'Registrar producto')+'</button>')+'</div></form></section>'; refreshValidation(false); focusView('.cat-wizard h3');
  }
  function checked(draft) { return api.validate(model,{step:step,draft:!!draft}); }
  function fieldNode(key) { return $('cat-'+(key==='package' && packageChoice==='otro'?'customPackage':key)); }
  function refreshValidation(showAll) {
    var result=checked(false), errors=result.errors||[];
    // Field identities come from the model, never from translated error text.
    var keys=['name','brand','categoryId','package','contentQuantity','contentUnit','saleUnit','unitsPerSale','image','price','tiers','minimum','available','zones'];
    model.priceTiers.forEach(function(t,i){keys.push('tier-'+i+'-qty','tier-'+i+'-price');});
    keys.forEach(function(key){var span=$('cat-error-'+key),control=fieldNode(key),err=errors.find(function(e){return e.field===key;});var visible=err&&(showAll||touched[key]);if(span)span.textContent=visible?err.message:'';if(control)control.setAttribute('aria-invalid',visible?'true':'false');});
    var submit=$('cat-continue');if(submit)submit.disabled=!result.ok;
    var preview=$('cat-presentation-preview');if(step===1&&preview)preview.textContent=model.presentation&&model.presentation.label?'Presentación: '+model.presentation.label:'';
    return result;
  }
  function validation(result) {
    if(result.step && result.step!==step){step=result.step;wizard();}
    var errors=result.errors||[],first=errors[0];
    refreshValidation(false);
    errors.forEach(function(e){touched[e.field]=true;var span=$('cat-error-'+e.field),control=fieldNode(e.field);if(span)span.textContent=e.message;if(control)control.setAttribute('aria-invalid','true');});
    if(first){var target=fieldNode(first.field)||$('cat-error-'+first.field);if(target){target.setAttribute('aria-invalid','true');target.focus();return;}}
    $('cat-error').textContent=result.error||'Revisa los datos del producto.';$('cat-error').focus();
  }
  function save(draft) {
    if(!model)return;capture();var data=Object.assign({},model);data.status=draft?'borrador':model.status==='inactivo'?'inactivo':'activo';
    var check=api.validate(data,{draft:!!draft});if(!check.ok){validation(check);return;}
    var r=draft?api.saveDraft(data,editingId||undefined):editingId?api.edit(editingId,data):api.register(data);
    if(r.error){validation(r);return;}dirty=false;detail(r.product.id);announce(draft?'Borrador privado guardado.':'Producto guardado en tu catálogo privado.');
  }
  function changed(e) {
    if(!model)return;dirty=true;var key=(e.target.id||'').replace(/^cat-/,'');if(key==='customPackage')key='package';if(e.target.dataset&&e.target.dataset.catZone!==undefined)key='zones';touched[key]=true;capture();
    if(e.target.id==='cat-package'){wizard();if(packageChoice==='otro')$('cat-customPackage').focus();else $('cat-package').focus();}else refreshValidation(false);
  }
  function confirmAction(message,action) { pending=action;var box=$('cat-confirm');if(!box){root.insertAdjacentHTML('beforeend','<section class="cat-panel cat-confirm" id="cat-confirm" role="alertdialog" aria-labelledby="cat-confirm-title"><h2 id="cat-confirm-title"></h2><div class="cat-actions">'+btn('keep','Cancelar')+btn('confirm','Confirmar',true)+'</div></section>');}$('cat-confirm-title').textContent=message;$('cat-confirm').scrollIntoView({block:'nearest'}); var safe=$('cat-confirm').querySelector('[data-cat-action=keep]'); if(safe)safe.focus(); }
  function askCancel(action) { if(dirty)confirmAction('¿Descartar los cambios sin guardar?',action);else action(); }
  root = $('provider-content');
  window.addEventListener('beforeunload',function(e){if(dirty){e.preventDefault();e.returnValue='';}});
  document.addEventListener('click',function(e){if(!dirty)return;var a=e.target.closest('a[href]'), logout=e.target.closest('#provider-logout');if(a||logout){e.preventDefault();e.stopImmediatePropagation();var target=a&&a.href;confirmAction('¿Salir sin guardar los cambios?',function(){dirty=false;if(target)location.assign(target);else logout.click();});}},true);
  ui.start(function(){
    root=$('provider-content');
    if(typeof document.querySelector==='function'){var h=document.querySelector('.provider-top .hello h1'),d=document.querySelector('.provider-top .hello p');if(h)h.textContent='Mi catálogo';if(d)d.textContent='Organiza tus productos, precios y zonas de atención.';}
    var params=new URLSearchParams(location.search);
    if(params.get('editar'))edit(params.get('editar'));else if(params.get('producto'))detail(params.get('producto'));else if(params.has('nuevo'))edit();else list();
    root.oninput=function(e){if(e.target.id==='cat-search'){filterList();return;}changed(e);};
    root.onchange=function(e){if(e.target.id==='cat-category'||e.target.id==='cat-status')filterList();else changed(e);};
    root.onsubmit=function(e){if(e.target.id!=='cat-form'||!model)return;e.preventDefault();capture();var result=checked(false);if(!result.ok){validation(result);return;}if(step<4){step++;wizard();}else save(false);};
    root.onclick=function(e){
      var tab=e.target.closest('[data-cat-status]');if(tab){filters.status=tab.dataset.catStatus;list();return;}
      var b=e.target.closest('[data-cat-action]');if(!b)return;var a=b.dataset.catAction,id=b.dataset.catId;
      if(a==='list')list();if(a==='new')edit();if(a==='detail')detail(id);if(a==='edit')edit(id);
      if(a==='clear'){filters={search:'',categoryId:'',status:''};list();}
      if(a==='draft')save(true);if(a==='previous'){capture();if(step>1)step--;wizard();}
      if(a==='add-tier'){capture();model.priceTiers.push({minQuantity:'',unitPrice:''});dirty=true;wizard();}
      if(a==='remove-tier'){capture();model.priceTiers.splice(Number(b.dataset.index),1);dirty=true;wizard();}
      if(a==='cancel')askCancel(function(){dirty=false;if(editingId)detail(editingId);else list();});
      if(a==='keep'){var c=$('cat-confirm');if(c)c.remove();pending=null;}
      if(a==='confirm'&&pending){var fn=pending;pending=null;$('cat-confirm').remove();fn();}
      if(a==='deactivate'||a==='reactivate')confirmAction(a==='deactivate'?'¿Desactivar este producto?':'¿Reactivar este producto?',function(){var r=a==='deactivate'?api.deactivate(id):api.reactivate(id);if(r.error){if($('cat-action-error'))$('cat-action-error').textContent=r.error;else announce(r.error);return;}if(activeId)detail(id);else list();announce(a==='deactivate'?'Producto desactivado.':'Producto reactivado.');});
    };
  }, { sinSync: true }); // Datos propios en edición: otra pestaña no los cambia
})();
