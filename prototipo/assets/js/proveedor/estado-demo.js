/* Filtros y borradores privados. Nunca modifica oportunidades del comprador. */
(function () {
  'use strict';
  var almacen = {
    getItem: function (k) { return window.NexoraShared ? window.NexoraShared.almacen.getItem(k) : sessionStorage.getItem(k); },
    setItem: function (k, v) { if (window.NexoraShared) window.NexoraShared.almacen.setItem(k, v); else sessionStorage.setItem(k, v); }
  };
  var key = 'nexora.proveedor.demo.v1';
  function load() {
    try {
      var raw = almacen.getItem(key), state = raw ? JSON.parse(raw) : { version: 1, providers: {} };
      if (!state || state.version !== 1 || !state.providers || typeof state.providers !== 'object' || Array.isArray(state.providers)) throw new Error('schema');
      return { state: state };
    } catch (error) { return { error: 'No se pudieron leer los datos privados del proveedor. Se conserva el almacenamiento anterior.' }; }
  }
  function filters(id) {
    var result = load(), own = result.state && result.state.providers[id];
    return { search: own && typeof own.search === 'string' ? own.search : '', status: own && ['reuniendo','esperando_precio','confirmada','no_se_concreto'].indexOf(own.status) !== -1 ? own.status : '', zone: own && typeof own.zone === 'string' ? own.zone : '', error: result.error || '' };
  }
  function saveFilters(id, values) {
    if (!window.NexoraProviders.byId(id)) return 'Identidad proveedor no válida.';
    var result = load(); if (result.error) return result.error;
    result.state.providers[id] = { search: String(values.search || ''), status: ['reuniendo','esperando_precio','confirmada','no_se_concreto'].indexOf(values.status) !== -1 ? values.status : '', zone: String(values.zone || '') };
    try { almacen.setItem(key, JSON.stringify(result.state)); return ''; } catch (error) { return 'Los filtros se aplicaron en pantalla, pero no pudieron guardarse para la próxima visita.'; }
  }
  function drafts() {
    var id = window.NexoraProviderSession.current(), result = load();
    if (!id) return { error: 'Inicia la sesión demostrativa del proveedor.', items: [] };
    if (result.error) return { error: result.error, items: [] };
    var collection = result.state.drafts;
    if (collection && (typeof collection !== 'object' || Array.isArray(collection))) return { error: 'Los borradores no son compatibles. No se alteraron los datos.', items: [] };
    return { items: Object.keys(collection || {}).map(function (key) { return collection[key]; }).filter(function (d) { return d && d.providerId === id; }) };
  }
  function validateOffer(price, observation) {
    var text = String(price).trim(), note = String(observation || '').trim();
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return { error: 'Ingresa un precio positivo con hasta dos decimales, sin símbolos.' };
    var value = Number(text.replace(',', '.'));
    if (!(value > 0) || !Number.isSafeInteger(Math.round(value * 100))) return { error: 'El precio debe ser positivo y estar dentro del rango permitido.' };
    if (note.length > 500) return { error: 'La observación puede tener como máximo 500 caracteres.' };
    return { price: value, observation: note };
  }
  function saveDraft(opportunityId, price, observation) {
    var id = window.NexoraProviderSession.current();
    if (!id) return { error: 'Inicia la sesión demostrativa del proveedor.' };
    var source = window.NexoraScenarioRead.read(id);
    if (!source.ok) return { error: source.message };
    var opportunity = source.opportunities.find(function (o) { return o.id === opportunityId; });
    if (!opportunity) return { error: 'La oportunidad no está asociada a tu proveedor.' };
    if (opportunity.status !== 'abierta') return { error: 'La oportunidad está cerrada. Solo puedes consultar los borradores anteriores.' };
    var values = validateOffer(price, observation); if (values.error) return values;
    var result = load(); if (result.error) return { error: result.error };
    var collection = result.state.drafts;
    if (collection && (typeof collection !== 'object' || Array.isArray(collection))) return { error: 'Los borradores no son compatibles. No se alteraron los datos.' };
    collection = collection || {};
    var key = id + ':' + opportunity.id, previous = collection[key], now = new Date().toISOString();
    if (previous && (previous.providerId !== id || previous.opportunityId !== opportunity.id)) return { error: 'La referencia del borrador no es compatible.' };
    var draft = { id: previous ? previous.id : 'BOR-' + id + '-' + opportunity.id, providerId: id, opportunityId: opportunity.id, productId: opportunity.product.id, price: values.price, observation: values.observation, status: 'Borrador privado', published: false, createdAt: previous ? previous.createdAt : now, updatedAt: now };
    collection[key] = draft; result.state.drafts = collection;
    try { almacen.setItem('nexora.proveedor.demo.v1', JSON.stringify(result.state)); }
    catch (error) { return { error: 'No se pudo guardar el borrador. Se conserva la versión anterior; puedes volver a intentarlo.' }; }
    return { draft: draft };
  }
  function profile() {
    var id = window.NexoraProviderSession.current(), result = load(), identity = window.NexoraProviders.byId(id);
    if (!identity) return { error: 'Inicia la sesión del proveedor.' };
    if (result.error) return result;
    var profiles = result.state.profiles;
    if (profiles && (typeof profiles !== 'object' || Array.isArray(profiles))) return { error: 'El perfil privado no es compatible. No se alteraron los datos.' };
    var own = profiles && profiles[id];
    return { value: Object.assign({ name: identity.name, businessType: 'Distribuidor (demo)', contact: '', phone: '', email: '', description: '', image: null }, own || {}, { providerId: id }) };
  }
  function saveProfile(input) {
    var current = profile(); if (current.error) return current;
    var value = {}, limits = { name: 100, businessType: 80, contact: 100, phone: 25, email: 150, description: 500 };
    Object.keys(limits).forEach(function (k) { value[k] = String(input[k] || '').trim(); });
    if (value.name.length < 2 || value.businessType.length < 2) return { error: 'Nombre comercial y rubro deben tener al menos dos caracteres.' };
    if (Object.keys(limits).some(function (k) { return value[k].length > limits[k]; })) return { error: 'Revisa las longitudes máximas indicadas.' };
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { error: 'Ingresa un correo válido o deja el campo vacío.' };
    if (String(input.phone || '') && (!value.phone || !/\d/.test(value.phone) || !/^[+\d ()-]{6,25}$/.test(value.phone))) return { error: 'Deja el teléfono vacío o ingresa de 6 a 25 caracteres con al menos un dígito; se permiten + ( ) y -.' };
    var result = load(); if (result.error) return result;
    value.providerId = current.value.providerId; value.image = current.value.image;
    result.state.profiles = result.state.profiles || {}; result.state.profiles[value.providerId] = value;
    try { almacen.setItem(key, JSON.stringify(result.state)); } catch (error) { return { error: 'No se pudo guardar el perfil. Se conserva la versión anterior; vuelve a intentarlo.' }; }
    return { value: value };
  }
  // Catálogo privado 2A: extensión del estado existente, sin semillas ni escrituras comprador.
  var catalogUnits = ['botellas', 'bolsas', 'paquetes', 'latas', 'cajas', 'unidades', 'kg'];
  function catalogZones() {
    // El registro compartido no expone una enumeración; estos son sus dos IDs actuales.
    return ['sa-centro', 'ves-sector1'];
  }
  function catalogContext() {
    var id = window.NexoraProviderSession.current();
    if (!id || !window.NexoraProviders.byId(id)) return { error: 'Inicia la sesión demostrativa del proveedor.' };
    var result = load(); if (result.error) return result;
    var c = result.state.catalog;
    if (c !== undefined && (!c || c.version !== 1 || !Number.isSafeInteger(c.sequence) || c.sequence < 0 || !Array.isArray(c.items))) return { error: 'El catálogo privado no es compatible. Se conserva intacto.' };
    var seen = {};
    if (c && c.items.some(function (p) {
      if (!p || typeof p.id !== 'string' || !p.id || seen[p.id] || !window.NexoraProviders.byId(p.providerId) || !Number.isFinite(Date.parse(p.createdAt)) || !Number.isFinite(Date.parse(p.updatedAt))) return true;
      seen[p.id] = true;
      return !!catalogValidate(p, p.status, {legacy:true}).error;
    })) return { error: 'El catálogo contiene productos incompatibles. Se conserva intacto.' };
    return { providerId: id, state: result.state, catalog: c || { version: 1, sequence: 0, items: [] } };
  }
  function catalogQuantity(value, unit) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER && (unit === 'kg' || Number.isSafeInteger(value));
  }
  function catalogPrice(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
  }
  // Validación privada compartida por el formulario y todas las escrituras del catálogo.
  var contentUnits = ['L','mL','g','kg','unidades'];
  var packages = {botella:'Botella',bolsa:'Bolsa',paquete:'Paquete',lata:'Lata',granel:'Por peso',unidad:'Unidad',otro:'Otro envase'};
  function presentationKind(label) {
    var s=String(label || '').trim().toLowerCase();
    if (/^por (kilo|kg|peso)/.test(s)) return 'granel';
    return Object.keys(packages).find(function(k){return k!=='otro' && s.indexOf(packages[k].toLowerCase())===0;}) || 'otro';
  }
  function buildPresentation(kind, quantity, unit, custom) {
    var known=Object.prototype.hasOwnProperty.call(packages,kind);
    if(!known)return {label:kind===''?'':null,contentQuantity:quantity===undefined?null:quantity,contentUnit:unit || null};
    var label=kind==='otro'?String(custom || '').trim():packages[kind];
    return {label:label + (quantity!==null && quantity!==undefined && quantity!=='' ? ' '+quantity : '') + (unit ? ' '+unit : ''),contentQuantity:quantity===undefined?null:quantity,contentUnit:unit || null};
  }
  function presentationFields(p) {
    if(!p || !p.label)return {kind:'',customLabel:''};
    var kind=presentationKind(p.label);
    return {kind:kind,customLabel:kind==='otro'?String(p.label || '').replace(/\s*\d+(?:[.,]\d+)?\s*(?:L|mL|g|kg|unidades)\s*$/,'').trim():''};
  }
  function catalogDefaults(input) {
    return Object.assign({name:'',categoryId:null,brand:'',presentation:null,saleUnit:null,unitsPerSale:null,image:null,normalUnitPrice:null,priceTiers:[],minimumQuantity:null,available:null,zoneIds:[],status:'borrador'},input);
  }
  function catalogValidate(p, status, options) {
    options=options || {};
    var errors=[],complete=status==='activo',legacy=options.legacy;
    function add(field,step,message) { if(!options.step || options.step===4 || options.step===step)errors.push({field:field,step:step,message:message}); }
    function text(v) { return typeof v==='string' && /\p{L}/u.test(v) && !/[<>\u0000-\u001f\u007f]/.test(v) && v.length<=120; }
    if(!['borrador','activo','inactivo'].includes(status))add('status',4,'Selecciona un estado válido.');
    if(typeof p.name!=='string' || (complete && !p.name.trim()))add('name',1,'Escribe el nombre del producto.');
    else if(!legacy && p.name.trim() && !text(p.name))add('name',1,'Usa un nombre con letras, de hasta 120 caracteres, sin etiquetas ni símbolos de control.');
    if(typeof p.brand!=='string' || (!legacy && (p.brand.length>120 || /[<>\u0000-\u001f\u007f]/.test(p.brand))))add('brand',1,'Escribe la marca o deja el campo vacío.');
    if((complete || p.categoryId!==null) && (!window.NexoraData || !window.NexoraData.categories || !Object.prototype.hasOwnProperty.call(window.NexoraData.categories,p.categoryId)))add('categoryId',1,'Selecciona una categoría del sistema.');
    if((complete || p.saleUnit!==null) && !catalogUnits.includes(p.saleUnit))add('saleUnit',1,'Selecciona una forma de venta válida.');
    var f=p.presentation;
    if(f===null){if(complete)add('package',1,'Selecciona cómo viene el producto.');}
    else if(!f || typeof f!=='object' || Array.isArray(f) || Object.keys(f).some(function(k){return !['label','contentQuantity','contentUnit'].includes(k);}))add('package',1,'Revisa los datos del envase.');
    else {
      if(typeof f.label!=='string' || (complete && !f.label.trim()) || (!legacy && f.label && (!text(f.label) || !/\p{L}/u.test(f.label.replace(/\s*\d+(?:[.,]\d+)?\s*(?:L|mL|g|kg|unidades)\s*$/,'')))))add('package',1,'Indica un tipo de envase con un nombre claro.');
      if((complete || f.contentQuantity!==null) && (typeof f.contentQuantity!=='number' || !Number.isFinite(f.contentQuantity) || f.contentQuantity<=0 || f.contentQuantity>Number.MAX_SAFE_INTEGER))add('contentQuantity',1,'La cantidad por envase debe ser un número mayor que cero.');
      if((complete || f.contentUnit!==null) && (legacy ? typeof f.contentUnit!=='string' || !f.contentUnit.trim() : !contentUnits.includes(f.contentUnit)))add('contentUnit',1,'Selecciona una unidad de medida válida.');
      if(!legacy && f.contentUnit==='unidades' && typeof f.contentQuantity==='number' && !Number.isSafeInteger(f.contentQuantity))add('contentQuantity',1,'Para unidades, indica una cantidad entera mayor que cero.');
      if(!legacy && typeof f.label==='string') {
        var tail=f.label.match(/\s(\d+(?:[.,]\d+)?)\s*(L|mL|g|kg|unidades)$/);
        if(tail && f.contentQuantity!==null && f.contentUnit!==null && (Number(tail[1].replace(',','.'))!==f.contentQuantity || tail[2]!==f.contentUnit))add('package',1,'La presentación debe coincidir con la cantidad y unidad del envase.');
        var kind=presentationKind(f.label),direct={botellas:'botella',bolsas:'bolsa',latas:'lata'};
        if(direct[p.saleUnit] && kind!==direct[p.saleUnit] && f.label.trim())add('saleUnit',1,'La forma de venta no coincide con el envase. Usa cajas para vender varios envases.');
        if((direct[p.saleUnit] || p.saleUnit==='unidades' || (p.saleUnit==='paquetes' && kind==='paquete')) && Number.isSafeInteger(p.unitsPerSale) && p.unitsPerSale>0 && p.unitsPerSale!==1)add('unitsPerSale',1,'Al vender un envase individual, indica 1. Para varios envases, elige cajas o paquetes.');
        if(p.saleUnit==='kg' && f.contentUnit && !['kg','g'].includes(f.contentUnit))add('saleUnit',1,'Para vender por kg, el contenido debe expresarse en g o kg. No convertimos volumen a peso.');
      }
    }
    if((complete || p.unitsPerSale!==null) && (!Number.isSafeInteger(p.unitsPerSale) || p.unitsPerSale<=0))add('unitsPerSale',1,'Los envases por unidad vendida deben ser un número entero mayor que cero.');
    if(p.image!==null && (typeof p.image!=='string' || !/^assets\/images\/[a-zA-Z0-9_\/-]+\.(png|jpe?g|webp|svg)$/.test(p.image) || p.image.includes('..')))add('image',1,'Selecciona una imagen local o deja el campo vacío.');
    if(!legacy && p.image && typeof p.name==='string') {
      var imageId=String(p.image).match(/\/producto-([a-z]+)\.png$/), data=window.NexoraData && window.NexoraData.products;
      if(imageId && data){var matches=Object.keys(data).filter(function(k){return data[k].re && data[k].re.test(p.name.toLowerCase());});if(matches.length===1 && matches[0]!==imageId[1])add('image',1,'La imagen elegida corresponde a otro producto. Cámbiala o selecciona Sin imagen.');}
    }
    if((complete || p.normalUnitPrice!==null) && !catalogPrice(p.normalUnitPrice))add('price',2,'El precio normal debe ser positivo, en soles y con hasta dos decimales.');
    if(!Array.isArray(p.priceTiers))add('tiers',2,'Revisa la lista de precios por volumen.');
    else {var previous=0;p.priceTiers.forEach(function(t,i){
      if(!t || typeof t!=='object' || Array.isArray(t) || Object.keys(t).some(function(k){return !['minQuantity','unitPrice'].includes(k);})){add('tiers',2,'Revisa los datos del tramo '+(i+1)+'. Usa solo cantidad de inicio y precio.');return;}
      if(!catalogQuantity(t.minQuantity,p.saleUnit))add('tier-'+i+'-qty',2,'Tramo '+(i+1)+': indica una cantidad positiva que respete la forma de venta.');
      else if(t.minQuantity<=previous)add('tier-'+i+'-qty',2,'Tramo '+(i+1)+': la cantidad debe ser mayor que la del tramo anterior, sin repetir.');
      if(!catalogPrice(t.unitPrice))add('tier-'+i+'-price',2,'Tramo '+(i+1)+': usa un precio mayor que cero, con hasta dos decimales.');
      previous=t.minQuantity;
    });}
    if((complete || p.minimumQuantity!==null) && !catalogQuantity(p.minimumQuantity,p.saleUnit))add('minimum',3,'El mínimo debe ser positivo y respetar la forma de venta: cantidades enteras salvo kg.');
    if((complete || p.available!==null) && typeof p.available!=='boolean')add('available',3,'Selecciona Disponible o No disponible.');
    if(!Array.isArray(p.zoneIds) || p.zoneIds.some(function(z){return !catalogZones().includes(z);}) || new Set(p.zoneIds).size!==p.zoneIds.length || (complete && !p.zoneIds.length))add('zones',3,'Selecciona al menos una zona válida, sin repetir.');
    errors=errors.filter(function(e,i,all){return all.findIndex(function(x){return x.field===e.field;})===i;});
    return errors.length ? {ok:false,error:errors[0].message,field:errors[0].field,step:errors[0].step,errors:errors} : {ok:true,errors:[]};
  }
  function catalogPublicValidate(input, options) {
    options=options || {};
    if(!input || typeof input!=='object' || Array.isArray(input))return {ok:false,error:'Revisa los datos del producto.',field:'name',step:1,errors:[{field:'name',step:1,message:'Revisa los datos del producto.'}]};
    if(options.step!==undefined && ![1,2,3,4].includes(options.step))return {ok:false,error:'Selecciona un paso válido.',field:'name',step:1,errors:[{field:'name',step:1,message:'Selecciona un paso válido.'}]};
    var p=catalogDefaults(input);
    return catalogValidate(p,options.draft?'borrador':'activo',{step:options.step});
  }
  function catalogList(filters) {
    var result = catalogContext(); if (result.error) return { error: result.error, items: [] };
    filters = filters || {};
    var norm = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
    var items = result.catalog.items.filter(function (p) {
      return p.providerId === result.providerId && (!filters.search || norm(p.name + ' ' + p.brand + ' ' + (p.presentation ? p.presentation.label : '')).includes(norm(filters.search).trim())) && (!filters.status || p.status === filters.status) && (!filters.categoryId || p.categoryId === filters.categoryId) && (!filters.zoneId || p.zoneIds.includes(filters.zoneId)) && (filters.available === undefined || p.available === filters.available);
    });
    return { items: items };
  }
  function catalogDetail(id) {
    var result = catalogList(); if (result.error) return { error: result.error };
    var product = result.items.find(function (p) { return p.id === id; });
    return product ? { product: product } : { error: 'El producto no está disponible para tu proveedor.' };
  }
  function catalogSave(id, input, forcedStatus) {
    if (id !== null && (typeof id !== 'string' || !id.trim())) return { error: 'Indica un identificador de producto válido.' };
    var result = catalogContext(); if (result.error) return { error: result.error };
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Revisa los datos del producto.' };
    var editable = ['name','categoryId','brand','presentation','saleUnit','unitsPerSale','image','normalUnitPrice','priceTiers','minimumQuantity','available','zoneIds','status'];
    if (Object.keys(input).some(function (k) { return !editable.includes(k); })) return { error: 'Solo puedes modificar los campos del producto; su identidad y propietario no cambian.' };
    var previous = id ? result.catalog.items.find(function (p) { return p.id === id && p.providerId === result.providerId; }) : null;
    if (id && !previous) return { error: 'El producto no está disponible para tu proveedor.' };
    var product = Object.assign({ name: '', categoryId: null, brand: '', presentation: null, saleUnit: null, unitsPerSale: null, image: null, normalUnitPrice: null, priceTiers: [], minimumQuantity: null, available: null, zoneIds: [], status: 'borrador' }, previous || {}, input);
    if (typeof product.name === 'string') product.name = product.name.trim();
    if (typeof product.brand === 'string') product.brand = product.brand.trim();
    if (forcedStatus) product.status = forcedStatus;
    var validation = catalogValidate(product, product.status); if (validation.error) return validation;
    var now = new Date().toISOString(), sequence = result.catalog.sequence;
    if (!previous) {
      do { sequence++; if (!Number.isSafeInteger(sequence)) return { error: 'No se pudo asignar un identificador seguro.' }; product.id = 'CAT-' + result.providerId + '-' + sequence; } while (result.catalog.items.some(function (p) { return p.id === product.id; }));
    }
    product.providerId = result.providerId; product.createdAt = previous ? previous.createdAt : now; product.updatedAt = now;
    result.catalog.items = previous ? result.catalog.items.map(function (p) { return p.id === id ? product : p; }) : result.catalog.items.concat([product]);
    result.catalog.sequence = sequence; result.state.catalog = result.catalog;
    try { almacen.setItem(key, JSON.stringify(result.state)); }
    catch (error) { return { error: 'No se pudo guardar el producto. Se conserva la versión anterior.' }; }
    return { product: JSON.parse(JSON.stringify(product)) };
  }
  function catalogPricingProduct(id, quantity) {
    var result = catalogDetail(id); if (result.error) return result;
    if (!catalogUnits.includes(result.product.saleUnit) || !catalogQuantity(quantity, result.product.saleUnit)) return { error: 'La cantidad debe ser positiva y respetar la unidad de venta del producto.' };
    return result;
  }
  function catalogPriceFor(id, quantity) {
    var result = catalogPricingProduct(id, quantity); if (result.error) return result;
    var p = result.product;
    if (!catalogPrice(p.normalUnitPrice)) return { error: 'Completa el precio normal antes de calcular.' };
    var tier = null;
    p.priceTiers.forEach(function (t) { if (quantity >= t.minQuantity) tier = t; });
    return { unitPrice: tier ? tier.unitPrice : p.normalUnitPrice, currency: 'PEN', quantity: quantity, saleUnit: p.saleUnit, tierMinQuantity: tier ? tier.minQuantity : null };
  }
  function catalogMinimum(id, quantity) {
    var result = catalogPricingProduct(id, quantity); if (result.error) return result;
    var p = result.product;
    if (!catalogQuantity(p.minimumQuantity, p.saleUnit)) return { error: 'Completa el mínimo para compra conjunta.' };
    return { reached: quantity >= p.minimumQuantity, quantity: quantity, minimumQuantity: p.minimumQuantity, saleUnit: p.saleUnit };
  }
  function catalogServesZone(id, zoneId) {
    var result = catalogDetail(id); if (result.error) return result;
    if (!catalogZones().includes(zoneId)) return { error: 'Selecciona una zona definida por el sistema.' };
    return { serves: result.product.zoneIds.includes(zoneId), zoneId: zoneId };
  }
  var catalogAPI = {
    validate: catalogPublicValidate, presentationKind: presentationKind, presentationFields: presentationFields, buildPresentation: buildPresentation,
    priceFor: catalogPriceFor, meetsMinimum: catalogMinimum, servesZone: catalogServesZone,
    register: function (input) { return catalogSave(null, input); },
    list: catalogList, detail: catalogDetail,
    edit: function (id, patch) { return catalogSave(id, patch); },
    saveDraft: function (input, id) { return catalogSave(id === undefined ? null : id, input, 'borrador'); },
    deactivate: function (id) { return catalogSave(id, {}, 'inactivo'); },
    reactivate: function (id) { return catalogSave(id, {}, 'activo'); },
    options: function () { return { contentUnits: contentUnits.slice(), packages: Object.keys(packages).map(function(k){return {id:k,label:packages[k]};}), saleUnits: catalogUnits.slice(), zoneIds: catalogZones(), categoryIds: Object.keys(window.NexoraData.categories) }; }
  };
  window.NexoraProviderState = { catalog: catalogAPI, profile: profile, saveProfile: saveProfile, filters: filters, saveFilters: saveFilters, drafts: drafts, validateOffer: validateOffer, saveDraft: saveDraft };
})();
