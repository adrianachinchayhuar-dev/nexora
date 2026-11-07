/* Consultas y presentación de mensajería. Las escrituras pertenecen a NexoraStore. */
(function () {
  var store = window.NexoraStore;
  if (!store || store.messagingVersion !== 1) return;
  function context(c) {
    var o = store.conversationOpportunity(c), p = o && store.productById(o.product);
    return { opportunity: o, product: p ? p.name : 'Producto no disponible', status: o ? store.opportunityStatus(o) : null };
  }
  function date(value) {
    if (!value || Number.isNaN(Date.parse(value))) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) + ' · Lima';
  }
  function preview(c) { var messages = store.conversationMessages(c.id); return messages.length ? messages[messages.length - 1] : null; }
  function unread(c) { return store.conversationMessages(c.id).some(function (m) { return m.direction === 'received' && !m.readAt; }); }
  window.NexoraMessaging = { context: context, date: date, preview: preview, unread: unread };
})();
