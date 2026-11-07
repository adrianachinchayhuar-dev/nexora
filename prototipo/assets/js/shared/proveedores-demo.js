/* Relaciones demostrativas externas. No modifica oportunidades ni historial. */
(function () {
  var providers = {
    'PROV-DEMO-ANDINA': Object.freeze({ id: 'PROV-DEMO-ANDINA', name: 'Distribuidora Andina (demo)', initials: 'DA' }),
    'PROV-DEMO-LIMA-SUR': Object.freeze({ id: 'PROV-DEMO-LIMA-SUR', name: 'Mayorista Lima Sur (demo)', initials: 'LS' })
  };
  var associations = Object.freeze({ op1: 'PROV-DEMO-ANDINA', op3: 'PROV-DEMO-ANDINA', op2: 'PROV-DEMO-LIMA-SUR', op4: 'PROV-DEMO-LIMA-SUR' });
  // Etiquetas de presentación para los códigos existentes; no son reglas de compatibilidad.
  var zones = Object.freeze({ 'sa-centro': 'Santa Anita · zona Centro (demo)', 'ves-sector1': 'Villa El Salvador · Sector 1 (demo)' });
  // Proveedores registrados en la demo: su identidad sale de la cuenta (no de la lista fija).
  function registrado(id) {
    var cuentas = window.NexoraAccounts, p = cuentas && typeof id === 'string' && /^PROV-[A-Z0-9]{8}$/.test(id) ? cuentas.proveedor(id) : null;
    if (!p) return null;
    var palabras = p.razonSocial.split(/\s+/).filter(Boolean);
    return Object.freeze({ id: p.id, name: p.razonSocial, initials: (palabras[0].charAt(0) + (palabras.length > 1 ? palabras[palabras.length - 1].charAt(0) : palabras[0].charAt(1) || '')).toUpperCase() });
  }
  window.NexoraProviders = Object.freeze({
    byId: function (id) { return Object.prototype.hasOwnProperty.call(providers, id) ? providers[id] : registrado(id); },
    zonaValida: function (id) { return Object.prototype.hasOwnProperty.call(zones, id); },
    zonas: function () { return Object.keys(zones).map(function (id) { return { id: id, name: zones[id].replace(/\s*\(demo\)/i, '') }; }); },
    providerFor: function (opportunityId) { return Object.prototype.hasOwnProperty.call(associations, opportunityId) ? associations[opportunityId] : null; },
    zoneName: function (id) { return Object.prototype.hasOwnProperty.call(zones, id) ? zones[id] : id; }
  });
})();
