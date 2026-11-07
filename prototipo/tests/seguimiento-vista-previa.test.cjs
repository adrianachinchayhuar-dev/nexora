require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Real shared store/controller, isolated in-memory session. Never open the user's Safari session.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
function fixture(pathname='/pages/comprador/seguimiento.html'){
 const memory={},nodes={},listeners={},domEvents={};let fail=false;
 function node(id){return nodes[id]||={id,value:'',innerHTML:'',textContent:'',hidden:true,open:false,handlers:{},dataset:{},classList:{add(){},contains(){return false}},setAttribute(){},focus(){},addEventListener(k,f){this.handlers[k]=f},showModal(){this.open=true},close(){this.open=false;if(this.handlers.close)this.handlers.close()},querySelector(){return null},querySelectorAll(selector){if(id==='tracking-list'&&selector==='[data-participation-card]')return [...this.innerHTML.matchAll(/data-participation-card="([^"]+)"/g)].map(m=>({dataset:{participationCard:m[1]},querySelector:()=>({focus(){}})}));return [];}};}
 const c={window:{dispatchEvent(e){(listeners[e.type]||[]).forEach(f=>f(e))},addEventListener(k,f){(listeners[k]||=[]).push(f)},NexoraDemo:{requireSession:()=>true}},Event:function(type){this.type=type},URLSearchParams,location:{pathname:pathname,search:'',assign(u){c.assigned=u},replace(u){c.replaced=u}},history:{replaceState(_a,_b,url){c.location.search=url.includes('?')?'?'+url.split('?')[1]:''}},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(fail&&k==='nexora.comprador.demo.v1')throw Error('quota');memory[k]=v},removeItem(k){delete memory[k]}},document:{getElementById:node,addEventListener(k,f){domEvents[k]=f}},requestAnimationFrame:f=>f(),MutationObserver:function(){this.observe=()=>{}}};
 vm.createContext(c);for(const file of ['datos-demo','estado-demo','imagenes-producto'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+file+'.js','utf8'),c);
 c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),ic:id=>'<svg data-icon="'+id+'"></svg>',media:()=>'<span>icon</span>',buyerHref:s=>s,bindImages(){},renderIdentity(){},toast(){}};
 vm.runInContext(fs.readFileSync('assets/js/comprador/resumen-participacion.js','utf8'),c);const originalSummary=c.window.NexoraParticipationSummary;
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/seguimiento-presentacion.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/seguimiento.js','utf8'),c);
 const s=c.window.NexoraStore;
 function participate(op='op1',need='NEC-DEMO-1'){s.selectNeed(op,need);const proposal=s.prepareParticipation(op,need);assert.ok(!proposal.error,proposal.error);return s.confirmParticipation(proposal.proposal).participation;}
 // Fase B: el detalle es la página participacion.html (ver tests/participacion-detalle.test.cjs).
 function detail(id){c.assigned=null;node('tracking-list').handlers.click({target:{closest:()=>({dataset:{participation:id}})}});assert.equal(c.assigned,'participacion.html?id='+encodeURIComponent(id));}
 return {c,s,node,memory,participate,detail,originalSummary,summary:c.window.NexoraParticipationSummary,fail:v=>fail=v};
}
let t=fixture();assert.ok(t.node('tracking-list').innerHTML.includes('Todavía no tienes participaciones'));
assert.notEqual(t.originalSummary,t.summary);assert.equal(t.originalSummary.quantity,t.summary.quantity);assert.equal(t.summary.detail,t.originalSummary.detail,'El presentador del modal de detalle se retiró');
const first=t.participate(),original=JSON.stringify(first),historicalSaving=JSON.stringify(first.savingSnapshot);
t.detail(first.id);assert.ok(!t.node('tracking-detail').open,'El detalle ya no es un modal');
const visible=s=>s.replace(/<[^>]*>/g,' ');const rows=visible(t.node('tracking-list').innerHTML);assert.ok(!/NEC-|PAR-|PED-|op1/.test(rows));assert.ok(rows.includes('Distribuidora Andina'));assert.ok(rows.includes('Te uniste')&&!rows.includes('Confirmada '));
const before=JSON.stringify(t.s.get());t.node('tracking-search').value='aceite';t.node('tracking-search').handlers.input();assert.ok(t.node('tracking-list').innerHTML.includes(first.id));assert.equal(JSON.stringify(t.s.get()),before);
t.node('tracking-status-chips').handlers.click({target:{closest:()=>({dataset:{chip:'Retirada'}})}});assert.ok(t.node('tracking-list').innerHTML.includes('Sin resultados'));
t.node('tracking-clear').handlers.click();t.detail(first.id);
// Retirarse se prueba en la página de detalle; aquí se retira con las mismas reglas del estado.
const leave=t.s.prepareWithdrawal(first.id);assert.ok(!leave.error);assert.ok(!t.s.confirmWithdrawal(leave.proposal).error);assert.equal(t.s.participationById(first.id).status,'Retirada');assert.equal(JSON.stringify(t.s.participationById(first.id).savingSnapshot),historicalSaving);
const second=t.participate();assert.notEqual(second.id,first.id);assert.equal(t.s.ownParticipationCounts().historical,2);assert.equal((t.node('tracking-list').innerHTML.match(/data-participation-card=/g)||[]).length,2);
t.s.get().needs.find(n=>n.id===second.needId).requiredDate='2026-11-01';const selected=t.s.get().selections.op1,beforeConsult=JSON.stringify(t.s.get());
t.s.get().opps[0].status='cerrada';t.detail(second.id);assert.ok(t.s.prepareWithdrawal(second.id).error,'No se retira de una compra cerrada');
const old={id:'PAR-OLD',needId:'NEC-MISSING',opportunityId:'op1',status:'Retirada',snapshot:{productId:'fideos',product:'Fideos',presentation:'Paquete 500 g'},savingSnapshot:null};
assert.ok(!fs.readFileSync('pages/comprador/seguimiento.html','utf8').includes('<dialog'),'Seguimiento ya no tiene modales');
const html=fs.readFileSync('pages/comprador/seguimiento.html','utf8'),official=fs.readFileSync('pages/comprador/seguimiento.html','utf8'),css=fs.readFileSync('assets/css/comprador/seguimiento-presentacion.css','utf8'),js=fs.readFileSync('assets/js/comprador/seguimiento-presentacion.js','utf8');
assert.equal(official,html.replace('<title>NEXORA · Seguimiento · Vista previa</title>','<title>NEXORA · Seguimiento de participaciones</title>'));assert.ok(official.includes('seguimiento-presentacion.js'));const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
for(const id of [...official.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))assert.ok(ids.includes(id),id);
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.equal(scripts.filter(s=>s.includes('/seguimiento.js?')).length,1);assert.ok(scripts.findIndex(s=>s.includes('/seguimiento-presentacion.js?'))<scripts.findIndex(s=>s.includes('/seguimiento.js?')));
for(const m of html.matchAll(/(?:src|href)="(\.\.\/\.\.\/assets\/[^"?]+)/g))assert.ok(fs.existsSync(path.resolve('pages/comprador',m[1])));
assert.ok(css.includes('flex:0 1 auto'));assert.ok(css.includes('object-fit:contain'));assert.ok(css.includes('@media(max-width:1200px)'));assert.ok(css.includes('@media(max-width:760px)'));assert.ok(!css.includes(':root'));
assert.ok(!/sessionStorage|localStorage|store\.(selectNeed|register|confirmParticipation|confirmWithdrawal|reset)\(/.test(js));
console.log('OK tracking preview: compact rows, shared controller/withdrawal, real historical prices, exact references, incompatible read-only consultation, missing/closed cases, filters and no business writes in presenter.');

// The same approved presenter/controller now runs under the official URL as well.
const integrated=fixture('/pages/comprador/seguimiento.html');const integratedRecord=integrated.participate();const integratedBefore=JSON.stringify(integrated.s.get());
integrated.detail(integratedRecord.id);assert.equal(JSON.stringify(integrated.s.get()),integratedBefore);
const linked=fixture('/pages/comprador/seguimiento.html');const linkedRecord=linked.participate();linked.c.location.search='?participacion='+linkedRecord.id;vm.runInContext(fs.readFileSync('assets/js/comprador/seguimiento.js','utf8'),linked.c);assert.equal(linked.c.replaced,'participacion.html?id='+encodeURIComponent(linkedRecord.id));
assert.ok(integrated.memory['nexora.comprador.trackingFilters']);
console.log('OK official Seguimiento: same historical controller, detail opens as its own page (also from ?participacion= links), no mutation on navigation.');
