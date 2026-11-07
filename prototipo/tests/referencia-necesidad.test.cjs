require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Isolated store + DOM fixture: no access to real browser sessionStorage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const key='nexora.comprador.demo.v1';
function session(memory={}) {
 let failing=false;const listeners={};
 const c={window:{dispatchEvent(e){if(listeners[e.type])listeners[e.type]();},addEventListener(type,fn){listeners[type]=fn;}},Event:function(type){this.type=type;},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(failing)throw Error('Storage unavailable');memory[k]=v;},removeItem:k=>delete memory[k]}};
 vm.createContext(c);for(const f of ['datos-demo.js','estado-demo.js'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f,'utf8'),c);
 return {c,s:c.window.NexoraStore,memory,fail(v){failing=v;}};
}
function detail(f,query) {
 const nodes={}, notices=[];function node(id){return nodes[id] ||= {innerHTML:'',href:'',handlers:{},focus(){},addEventListener(type,fn){this.handlers[type]=fn;},insertAdjacentHTML(where,text){this.innerHTML+=text;},querySelectorAll(){return [];},showModal(){this.open=true;},close(){this.open=false;}};}
 let url='http://localhost/pages/comprador/detalle-oportunidad.html'+query+'#contenido',activeNeed=null;
 const c=f.c;c.URLSearchParams=URLSearchParams;c.location={search:query,pathname:'/pages/comprador/detalle-oportunidad.html',hash:'#contenido',assign(){}};c.history={replaceState(a,b,newUrl){url=newUrl;}};const heading={textContent:''};c.document={getElementById:node,querySelector:s=>s==='.hello h1'?heading:null,title:''};
 c.window.NexoraDemo={requireSession:()=>true};c.window.NexoraUI={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:n=>'S/ '+n.toFixed(2),media:()=>'',bindImages(){},renderIdentity(){},toast:m=>notices.push(m),buyerHref:s=>s};
 const opId=new URLSearchParams(query).get('id');c.window.NexoraProductImages={};c.window.NexoraUI.ic=()=>'';c.window.NexoraUI.plain=s=>String(s||'');
 vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('assets/js/comprador/detalle-oportunidad.js','utf8'),c);
 return {nodes,notices,get html(){return node('op-detail').innerHTML;},get url(){return url;},get need(){const o=f.s.get().opps.find(x=>x.id===opId);return o?f.s.selectedNeed(o):null;},heading,change(value){node('op-detail').handlers.change({target:{name:'detail-reference',value}});}};
}
function add(f,qty=8,price=null) {return f.s.register('Pedido ficticio',[{k:'detergente',qty,price,brand:'',presentation:'Bolsa 800 g'}],'2026-10-25','sa-centro').needs[0];}
let f=session(),one=detail(f,'?id=op2');assert.equal(one.need.id,'NEC-DEMO-2');assert.ok(!one.html.includes('name="detail-reference"'));assert.ok(!one.html.replace(/<[^>]*>/g,'').includes('NEC-'));assert.equal(one.heading.textContent,'Detergente en polvo');
let a=add(f,8,12),b=add(f,8,null);a=f.s.get().needs.find(n=>n.id===a.id);a.createdAt='2026-10-27T22:15:38.000Z';b.createdAt=a.createdAt;
// Fixture changes stay in memory; make these two intentionally identical for tie testing.
a.priceIndividual=null;f.s.persist();let direct=detail(f,'?id=op2');assert.ok(direct.need&&[a.id,b.id].includes(direct.need.id),'Sin pedido en el enlace se preselecciona el más reciente');
assert.ok(direct.html.includes('value="'+a.id+'"'));assert.ok(direct.html.includes('value="'+b.id+'"'));
const visible=direct.html.replace(/<[^>]*>/g,'');assert.ok(!visible.includes('NEC-'));assert.ok(visible.includes('8 bolsas · para el 25 oct'));assert.ok(visible.includes('Registro 1 de 2'));assert.ok(visible.includes('Registro 2 de 2'));
const baseline=JSON.parse(JSON.stringify(f.s.get()));
f.memory['nexora.comprador.opportunityFilters']='{"product":"detergente"}';
let linked=detail(f,'?id=op2&necesidad='+encodeURIComponent(a.id)+'&revision=release');
assert.equal(linked.need.id,a.id);assert.equal(JSON.parse(f.memory[key]).selections.op2,a.id);assert.ok(!linked.url.includes('necesidad='));assert.ok(linked.url.includes('id=op2'));assert.ok(linked.url.includes('revision=release'));assert.ok(linked.url.endsWith('#contenido'));assert.ok(linked.html.includes('no pusiste tu precio de hoy'));
assert.ok(!linked.html.includes('name="detail-reference"')&&linked.html.includes('Con tu pedido de')&&linked.html.includes('id="change-need"'),'Pedido en la URL: se usa, sin lista de elección y con «Cambiar pedido»');
assert.ok(direct.html.replace(/<[^>]*>/g,'').includes('Registrado '),'Las opciones se diferencian por cuándo se registraron');
linked.change(b.id);assert.equal(linked.need.id,b.id);
const disk=f.memory[key];let reloaded=session({...f.memory}),reloadedDetail=detail(reloaded,linked.url.slice(linked.url.indexOf('?')).split('#')[0]);assert.equal(reloadedDetail.need.id,b.id);assert.equal(reloaded.memory[key],disk);
assert.equal(JSON.stringify(f.s.get().needs),JSON.stringify(baseline.needs));assert.equal(JSON.stringify(f.s.get().orders),JSON.stringify(baseline.orders));assert.equal(JSON.stringify(f.s.get().opps),JSON.stringify(baseline.opps));assert.equal(JSON.stringify(f.s.get().participations),JSON.stringify(baseline.participations));assert.equal(JSON.stringify(f.s.get().messaging),JSON.stringify(baseline.messaging));
console.log('OK: singleton, repeated friendly labels, exact linked selection, query consumption, manual selection and reload without altering records');
for(const query of ['?id=op2&necesidad=missing','?id=op2&necesidad=NEC-DEMO-1','?id=op2&necesidad='+a.id+'&necesidad='+b.id]) {
 const before=JSON.stringify(f.s.get()),saved=f.memory[key];const invalid=detail(f,query);assert.equal(JSON.stringify(f.s.get()),before);assert.equal(f.memory[key],saved);assert.equal(invalid.need.id,b.id);assert.ok(invalid.html.includes('ya no coincide con esta compra. No elegimos otro por ti.'));assert.ok(!invalid.url.includes('necesidad='));
}
let closed=detail(f,'?id=op4&necesidad='+a.id);assert.equal(closed.need,null);assert.ok(closed.heading.textContent==='Arroz extra'&&!closed.html.includes('id="participate"'));
const beforeFailure=JSON.stringify(f.s.get()),beforeDisk=f.memory[key];f.fail(true);let failed=detail(f,'?id=op2&necesidad='+a.id);assert.equal(failed.need.id,b.id);assert.equal(JSON.stringify(f.s.get()),beforeFailure);assert.equal(f.memory[key],beforeDisk);assert.ok(/No se pudo guardar|No pudimos guardar/.test(failed.html));assert.ok(!failed.url.includes('necesidad='));f.fail(false);
console.log('OK: invalid, incompatible, duplicate URL IDs, closed opportunity and failed persistence never replace the prior reference');
let empty=session();empty.s.get().needs=[];empty.s.persist();const absent=detail(empty,'?id=op2');assert.equal(absent.need,null);assert.ok(absent.html.includes('No tienes un pedido para este producto.'));
let saving=session(),n=add(saving,8,12);let d=detail(saving,'?id=op2&necesidad='+n.id);assert.equal(saving.s.saving(d.need,saving.s.get().opps.find(o=>o.id==='op2')).total,11.2);
let prepared=saving.s.prepareParticipation('op2',n.id);assert.ok(!prepared.error);const participation=saving.s.confirmParticipation(prepared.proposal).participation;assert.ok(participation);
const snapshot=JSON.stringify(saving.s.get().participations);detail(saving,'?id=op2');assert.equal(JSON.stringify(saving.s.get().participations),snapshot);assert.equal(saving.s.get().participations[0].snapshot.qty,8);assert.equal(saving.s.get().participations[0].savingSnapshot.total,11.2);
console.log('OK: no compatible needs, unchanged savings and participation snapshots after reference navigation');

assert.equal(f.memory['nexora.comprador.opportunityFilters'],'{"product":"detergente"}');
console.log('OK: unrelated stored filters preserved');
