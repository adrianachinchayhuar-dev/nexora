require('./helpers/utils-compartidas.cjs');
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const key = 'nexora.comprador.demo.v1';
function load(memory = {}, fail = () => false) {
 const c = { window: { dispatchEvent() {} }, Event: function () {}, sessionStorage: { getItem: k => memory[k] || null, setItem(k,v) { if(fail(k)) throw Error('Storage unavailable'); memory[k] = v; }, removeItem(k) {delete memory[k];} } };
 vm.createContext(c);
 for(const f of ['datos-demo.js','estado-demo.js']) vm.runInContext(fs.readFileSync('assets/js/comprador/'+f,'utf8'),c);
 return c.window.NexoraStore;
}
// Session from stage 6 with confirmed/withdrawn participations and retained filters.
const memory={}, initial=load(memory);
let old=JSON.parse(memory[key]);delete old.messaging;
const fixture=load({[key]:JSON.stringify(old)});
let p=fixture.confirmParticipation(fixture.prepareParticipation('op1','NEC-DEMO-1').proposal).participation;
fixture.confirmWithdrawal(fixture.prepareWithdrawal(p.id).proposal);
fixture.confirmParticipation(fixture.prepareParticipation('op2','NEC-DEMO-2').proposal);
old=JSON.parse(JSON.stringify(fixture.get()));delete old.messaging;
memory[key]=JSON.stringify(old);memory['nexora.comprador.catalogFilters']='{"search":"aceite"}';
let failing=false;let s=load(memory, k=>failing && k===key);
assert.equal(memory[key+'.backup-etapa7'],JSON.stringify(old));
for(const k of Object.keys(old)) assert.equal(JSON.stringify(s.get()[k]),JSON.stringify(old[k]),k);
assert.equal(s.get().messaging.conversations.length,1);assert.equal(s.unreadConversations(),1);
const invariant=()=>JSON.stringify(['needs','orders','opps','participations','notifs','selections','msgs'].map(k=>s.get()[k]));
const baseline=invariant();
assert.equal(s.openConversation('op1').conversation.id,'CONV-DEMO-ACEITE');
const c=s.openConversation('op2').conversation;assert.ok(c);
assert.equal(s.openConversation('op2').conversation.id,c.id);assert.equal(s.ownConversations().length,2);
assert.equal(s.conversationMessages(c.id).length,0);
assert.ok(s.openConversation('op4').error);assert.ok(s.openConversation('bad').error);
for(const t of ['', '   ', 'x'.repeat(1001)]) assert.ok(s.sendDemoMessage(c.id,t).error);
assert.equal(s.saveMessageDraft(c.id,'borrador').error,undefined);
failing=true;const stored=memory[key];
assert.ok(s.sendDemoMessage(c.id,'borrador').error);assert.equal(memory[key],stored);assert.equal(s.conversationMessages(c.id).length,0);assert.equal(s.get().messaging.drafts[c.id],'borrador');
assert.ok(s.markConversationRead('CONV-DEMO-ACEITE').error);assert.equal(s.unreadConversations(),1);
assert.ok(s.openConversation('op3').error);assert.equal(s.ownConversations().length,2);
failing=false;assert.ok(s.sendDemoMessage(c.id,'x'.repeat(1000)).message);assert.equal(s.get().messaging.drafts[c.id],undefined);
assert.ok(s.sendDemoMessage(c.id,'<img src=x onerror=alert(1)>').message);
assert.equal(s.markConversationRead('CONV-DEMO-ACEITE').error,undefined);assert.equal(s.unreadConversations(),0);
assert.equal(invariant(),baseline);assert.equal(memory['nexora.comprador.catalogFilters'],'{"search":"aceite"}');
s=load(memory);assert.equal(s.ownConversations().length,2);assert.equal(s.conversationMessages(c.id).length,2);
// A withdrawn participation does not delete the conversation or rebind it.
assert.ok(s.get().participations.some(p=>p.status==='Retirada'));assert.equal(s.conversationById('CONV-DEMO-ACEITE').participationId,null);
s.get().opps.find(o=>o.id==='op2').status='cerrada';s.persist();
assert.equal(s.openConversation('op2').conversation.id,c.id);assert.ok(s.sendDemoMessage(c.id,'blocked').error);
s.get().user.id='OTHER';assert.equal(s.conversationById(c.id),null);assert.equal(s.conversationMessages(c.id).length,0);assert.ok(s.sendDemoMessage(c.id,'blocked').error);
s=load(memory);assert.ok(s.reset(false));assert.equal(s.ownConversations().length,1);assert.equal(s.unreadConversations(),1);assert.equal(s.get().messaging.messages.length,1);assert.deepEqual(Object.keys(s.get().messaging.drafts),[]);
console.log('OK: migration, preserved stages 1–6, explicit creation, duplicates, ownership, withdrawn/closed, validation, draft/storage failure, read counts, reload and reset');

// A missing module must produce a recoverable page, never a silent blank.
let recovery='';
vm.runInNewContext(fs.readFileSync('assets/js/comprador/mensajes.js','utf8'), { window:{NexoraDemo:{requireSession:()=>true}}, document:{getElementById:()=>({set innerHTML(value){recovery=value;}})}, console:{error(){}} });
assert.ok(recovery.includes('No se pudo iniciar Mensajes'));assert.ok(recovery.includes('Recargar Mensajes'));
console.log('OK: incompatible dependencies show a recoverable initialization error');
