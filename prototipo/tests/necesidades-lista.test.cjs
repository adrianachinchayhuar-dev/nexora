require('./helpers/utils-compartidas.cjs'); // fija «hoy» en el 13 de octubre de 2026 para estas pruebas
// Mis necesidades (Fase B): lista con chips de estado, filas que llevan a necesidad.html y detalle como página.
// Sustituye a la prueba de la vista previa retirada; conserva sus garantías de datos y de solo lectura.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(search=''){
 const nodes={},replaced=[];
 function node(id){return nodes[id] ||= {id,value:'',innerHTML:'',textContent:'',handlers:{},hidden:true,addEventListener(t,fn){this.handlers[t]=fn;},querySelectorAll(){return [];},focus(){this.focused=true;}};}
 const memory={},heading={textContent:''};
 const c={Intl,Date,URLSearchParams,Number,location:{search,pathname:'/pages/comprador/necesidades.html',replace(u){replaced.push(u);},assign(u){c.assigned=u;}},history:{replaceState(a,b,u){c.consumed=u;}},
  document:{getElementById:node,contains:()=>true,querySelector:s=>s==='.hello h1'?heading:null,title:''},Event:function(type){this.type=type;},
  sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){memory[k]=v;}},
  window:{NexoraProductImages:require('./helpers/imagenes-producto.cjs'),dispatchEvent(){},addEventListener(){},NexoraDemo:{requireSession:()=>true},
   NexoraUI:{esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),ic:n=>'<svg data-ic="'+n+'"></svg>',money:v=>'S/ '+v.toFixed(2),renderIdentity(){},buyerHref:s=>s,toast(){},plain:s=>String(s||'').replace(/\s*\(demo\)/gi,'').replace(/ · zona /i,' – ').replace(/ · /,' – ').trim()},
   NexoraFlow:{init(config){this.config=config;},open(text){this.opened=text;},openProduct(id){this.product=id;}}}};
 vm.createContext(c);
 for(const f of ['datos-demo.js','estado-demo.js','necesidad-formato.js'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f,'utf8'),c);
 return {c,node,memory,heading,replaced,store:c.window.NexoraStore,flow:c.window.NexoraFlow};
}
const text=html=>html.replace(/<[^>]*>/g,' ');
const visible=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const rows=html=>(html.match(/class="nx-row"/g)||[]).length;
const listSrc=fs.readFileSync('assets/js/comprador/necesidades.js','utf8'),detailSrc=fs.readFileSync('assets/js/comprador/necesidad.js','utf8'),viewSrc=fs.readFileSync('assets/js/comprador/necesidad-formato.js','utf8');

// Lista: conteos en chips, filas clicables hacia el detalle y nada se guarda al mostrar.
let f=fixture();const before=JSON.stringify(f.memory);
vm.runInContext(listSrc,f.c);
assert.equal(JSON.stringify(f.memory),before);
const chips=f.node('needs-status').innerHTML;
assert.ok(/data-status=""[^>]*aria-pressed="true">Todas <span class="nx-chip__count">4</.test(chips));
assert.ok(chips.includes('data-status="Con coincidencia" aria-pressed="false">Con compra en grupo <span class="nx-chip__count">3<'),'Etiqueta clara; el estado guardado no cambia');
assert.ok(chips.includes('Borrador <span class="nx-chip__count">1<'));
let list=f.node('needs-list').innerHTML;
assert.equal(rows(list),4);
assert.ok(list.includes('href="necesidad.html?id=NEC-DEMO-2"'));
assert.ok(!text(list).includes('NEC-'),'Internal IDs never appear as visible text');
assert.ok(text(list).includes('Hay una compra en grupo')&&text(list).includes('Para el ')&&!/oportunidad/i.test(text(list)));
assert.ok(!list.includes('<details')&&!list.includes('Ver detalle'),'One gesture per row, no disclosure');
assert.equal(f.node('needs-count').textContent,'4 necesidades');
// Búsqueda y filtro por estado.
f.node('needs-search').value='detergente';f.node('needs-search').handlers.input();
assert.equal(rows(f.node('needs-list').innerHTML),1);
f.node('needs-status').handlers.click({target:{closest:()=>({dataset:{status:'Borrador'}})}});
assert.ok(f.node('needs-list').innerHTML.includes('No encontramos resultados'));
assert.ok(f.node('needs-status').innerHTML.includes('data-status="Borrador" aria-pressed="true"'));
f.node('needs-list').handlers.click({target:{closest:s=>s==='#empty-action'?{}:null}});
assert.equal(f.node('needs-search').value,'');
assert.equal(rows(f.node('needs-list').innerHTML),4,'Limpiar filtros vuelve a la lista completa');
f.node('needs-status').handlers.click({target:{closest:()=>({dataset:{status:'Borrador'}})}});
assert.ok(text(f.node('needs-list').innerHTML).includes('Arroz extra'));
f.node('needs-status').handlers.click({target:{closest:()=>({dataset:{status:''}})}});
// Registros idénticos del mismo pedido siguen distinguiéndose, sin escribir al mostrar.
for(let i=0;i<2;i++)assert.ok(f.store.register('Pedido demo',[{k:'detergente',qty:8,price:null,presentation:'Bolsa 800 g',brand:''}],'2026-10-18','sa-centro').needs.length);
f.store.get().needs[1].createdAt=f.store.get().needs[0].createdAt;
const disk=JSON.stringify(f.memory);
f.node('needs-search').handlers.input();
assert.equal(rows(f.node('needs-list').innerHTML),6);
assert.ok(f.node('needs-list').innerHTML.includes('Registro 1 de 2'));
assert.equal(JSON.stringify(f.memory),disk);
// Fotos locales del mapa compartido.
for(const product of ['fideos','leche']){const p=f.store.productById(product);assert.ok(f.store.register('Pedido de prueba',[{k:product,qty:2,price:null,presentation:p.detail,brand:''}],'2026-10-18','sa-centro').needs.length);}
f.node('needs-search').handlers.input();
assert.ok(f.node('needs-list').innerHTML.includes('producto-leche.png'));
assert.ok(text(f.node('needs-list').innerHTML).includes('Fideos'));
f.store.get().needs=[];f.node('needs-search').handlers.input();
assert.ok(f.node('needs-list').innerHTML.includes('Tu lista está vacía'));
f.node('needs-list').handlers.click({target:{closest:s=>s==='#empty-action'?{}:null}});
assert.equal(f.c.assigned,'necesidad-nueva.html','Empty list opens the registration page');
console.log('OK: status chips with counts, clickable rows to the detail page, search/filter/clear, twin records, photos, empty list and read-only rendering');

// Entradas: desde Catálogo, desde «Nueva necesidad» y enlaces antiguos al detalle.
f=fixture('?producto=aceite');vm.runInContext(listSrc,f.c);
assert.deepEqual(f.replaced,['necesidad-nueva.html?producto=aceite']);assert.equal(f.flow.product,undefined);
f=fixture('?nueva=1');vm.runInContext(listSrc,f.c);
assert.deepEqual(f.replaced,['necesidad-nueva.html']);assert.equal(f.flow.opened,undefined);
f=fixture('?necesidad=NEC-DEMO-2');vm.runInContext(listSrc,f.c);
assert.deepEqual(f.replaced,['necesidad.html?id=NEC-DEMO-2']);assert.equal(f.node('needs-list').innerHTML,'');
console.log('OK: catalog entry, global new-need entry and legacy links go to the registration and detail pages');

// Detalle como página: datos, pasos, siguiente paso y estados especiales; solo lectura.
function detail(id){const d=fixture('?id='+id);d.c.location.pathname='/pages/comprador/necesidad.html';const prior=JSON.stringify(d.memory);vm.runInContext(fs.readFileSync('assets/js/comprador/tesis-ui.js','utf8'),d.c);vm.runInContext(detailSrc,d.c);assert.equal(JSON.stringify(d.memory),prior);return d;}
let d=detail('NEC-DEMO-2');let page=d.node('need-page').innerHTML;
assert.equal(d.heading.textContent,'Detergente en polvo');
assert.ok(page.includes('href="detalle-oportunidad.html?id=op2&amp;necesidad=NEC-DEMO-2"'));
assert.ok(page.includes('Hay una compra en grupo')&&visible(page).includes('Ahorro estimado S/ 15.20')&&visible(page).includes('¿Qué pasa ahora?'));
assert.ok(visible(page).includes('Hoy pagas')&&!/Registrada|07:00|\(demo\)|oportunidad compatible/.test(visible(page)));
assert.ok(page.includes('aria-current="step"')&&page.includes('class="is-done"'));
assert.ok(page.includes('nx-card nx-card--raised'),'Next step lives on the elevated layer');
assert.ok(!text(page).includes('NEC-')&&!page.includes('<details')&&!page.includes('<dialog'));
d=detail('NEC-DEMO-4');page=d.node('need-page').innerHTML;
assert.ok(page.includes('Es un borrador de ejemplo'));
assert.ok(page.includes('Ver compras en grupo')&&!page.includes('Ver compra en grupo<'));
d=detail('NO-EXISTE');
assert.ok(d.node('need-page').innerHTML.includes('No encontramos esta necesidad'));
assert.ok(d.node('need-page').innerHTML.includes('href="necesidades.html"'));
for(const src of [listSrc,detailSrc,viewSrc])assert.ok(!/sessionStorage|store\.(register|reset|persist|selectNeed)\(/.test(src));
console.log('OK: detail page shows steps, facts, exact opportunity reference, draft and not-found states without writes');

// Marcado: sin modales ni acordeones de información; nivel 2 declarado.
const listHtml=fs.readFileSync('pages/comprador/necesidades.html','utf8'),detailHtml=fs.readFileSync('pages/comprador/necesidad.html','utf8');
for(const html of [listHtml,detailHtml]){assert.ok(!html.includes('<dialog')&&!html.includes('<details'));assert.ok(html.includes('shared/tokens.css')&&html.includes('shared/componentes.css'));}
assert.ok(listHtml.includes('data-page="necesidades"')&&!listHtml.includes('buyer-entry')&&!listHtml.includes('flujo-necesidad.js'),'El registro vive en necesidad-nueva.html');
assert.ok(!listHtml.includes('datos ficticios'),'Modo demo global, sin aviso repetido');
assert.ok(listHtml.includes('Tu guía de compras')&&listHtml.includes('Registra, encuentra y participa'));
assert.ok(!listHtml.includes('np-register'),'The global top-bar button replaces the page-level one');
assert.ok(detailHtml.includes('data-page="necesidad" data-parent="necesidades"'));
const scripts=Array.from(detailHtml.matchAll(/<script src="([^"]+)"/g),m=>m[1].split('?')[0].split('/').pop());
assert.deepEqual(scripts,['acceso-roles.js','datos-compartidos.js','cuentas.js','utils.js','demo-session.js','datos-demo.js','estado-demo.js','componentes.js','tesis-ui.js','imagenes-producto.js','necesidad-formato.js','necesidad.js','asistente.js']);
console.log('OK: no information dialogs or disclosures, guide kept visible and the detail page declares its parent section');
