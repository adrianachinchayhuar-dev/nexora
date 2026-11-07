/* Mensajes privados de la demo del proveedor. No escribe en el historial comprador. */
(function () {
  'use strict';
  var almacen = {
    getItem: function (k) { return window.NexoraShared ? window.NexoraShared.almacen.getItem(k) : sessionStorage.getItem(k); },
    setItem: function (k, v) { if (window.NexoraShared) window.NexoraShared.almacen.setItem(k, v); else sessionStorage.setItem(k, v); }
  };
  var key = 'nexora.proveedor.demo.v1', limit = 1000;
  function load() {
    try {
      var raw = almacen.getItem(key), state = raw ? JSON.parse(raw) : { version: 1, providers: {} };
      if (!state || state.version !== 1 || !state.providers || typeof state.providers !== 'object' || Array.isArray(state.providers) || (state.messages !== undefined && !Array.isArray(state.messages))) throw Error('schema');
      if ((state.messages || []).some(function (m) { return !m || typeof m.id !== 'string' || typeof m.providerId !== 'string' || typeof m.conversationId !== 'string' || typeof m.text !== 'string' || !m.text.trim() || m.text.length > limit || !Number.isFinite(Date.parse(m.createdAt)); })) throw Error('message');
      return { state: state };
    } catch (error) { return { error: 'No se pudieron leer tus mensajes guardados. Se conservan los datos anteriores.' }; }
  }
  function list() {
    var id = window.NexoraProviderSession.current();
    if (!id) return { error: 'Inicia la sesión demostrativa del proveedor.', items: [] };
    if (window.NexoraShared && window.NexoraShared.activo()) return { items: [] };
    var result = load(); if (result.error) return { error: result.error, items: [] };
    return { items: (result.state.messages || []).filter(function (m) { return m.providerId === id; }) };
  }
  function send(conversationId, input) {
    var id = window.NexoraProviderSession.current();
    if (!id) return { error: 'Inicia la sesión demostrativa del proveedor.' };
    var history = window.NexoraScenarioRead.conversations(id);
    if (!history.ok) return { error: history.message };
    if (!history.items.some(function (c) { return c.id === conversationId; })) return { error: 'Esta conversación no está disponible para tu negocio.' };
    var text = String(input || '').trim();
    if (!text) return { error: 'Escribe un mensaje antes de enviar.' };
    if (text.length > limit) return { error: 'El mensaje puede tener como máximo 1000 caracteres.' };
    if (window.NexoraShared && window.NexoraShared.activo()) {
      var message, problem = '';
      try {
        var saved = window.NexoraShared.transaccion(function (state) {
          var c = state.messaging.conversations.find(function (c) { return c.id === conversationId; });
          var o = c && state.opps.find(function (o) { return o.id === c.opportunityId; });
          if (id !== 'PROV-DEMO-ANDINA' || !o || o.status !== 'abierta') { problem = 'Compra cerrada o no disponible: conversación en solo lectura.'; return false; }
          message = { id: 'MP-' + Date.now() + '-' + Math.random().toString(36).slice(2), conversationId: conversationId, direction: 'received', autorRol: 'proveedor', autorId: id, text: text, createdAt: new Date().toISOString(), readAt: null, simulation: true };
          state.messaging.messages.push(message);
        });
        return saved ? { message: message } : { error: problem || 'No se pudo guardar el mensaje. Conserva tu texto y reintenta.' };
      } catch (error) { return { error: 'No se pudo guardar el mensaje. Conserva tu texto y reintenta.' }; }
    }
    var result = load(); if (result.error) return result;
    var messages = result.state.messages || [], now = new Date().toISOString();
    var message = { id: 'MP-' + now + '-' + messages.length, providerId: id, conversationId: conversationId, text: text, createdAt: now };
    result.state.messages = messages.concat([message]);
    try { almacen.setItem(key, JSON.stringify(result.state)); }
    catch (error) { return { error: 'No se pudo guardar el mensaje. Conservamos tu texto; vuelve a intentarlo.' }; }
    return { message: message };
  }
  window.NexoraProviderMessages = { list: list, send: send, limit: limit };
})();
