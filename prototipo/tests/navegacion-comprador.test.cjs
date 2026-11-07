require('./helpers/utils-compartidas.cjs');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve('.'), dir = 'pages/comprador';
const pages = fs.readdirSync(dir).filter(p => p.endsWith('.html')).sort();
// 8 secciones del menú + páginas de nivel 2 (Fase B: necesidad, necesidad-nueva y participacion).
assert.equal(pages.length, 11);
const assets = new Set(), revisions = new Set();
for (const name of pages) {
 const source = fs.readFileSync(path.join(dir, name), 'utf8');
 for (const match of source.matchAll(/(?:src|href)="(\.\.\/\.\.\/assets\/[^"?]+\.(?:css|js))(\?[^\"]*)?"/g)) {
  const file = path.relative(root, path.resolve(dir,match[1])); assert.ok(fs.existsSync(file), file);
  const v = new URLSearchParams((match[2] || '').slice(1)).get('v'); assert.ok(v, name+': unversioned resource');
  assets.add(file); revisions.add(v);
 }
 const scripts = Array.from(source.matchAll(/<script src="([^"]+)"/g), m => m[1].split('?')[0].split('/').pop());
 assert.equal(scripts[0],'acceso-roles.js');assert.deepEqual(scripts.slice(1,8), ['datos-compartidos.js','cuentas.js','utils.js','demo-session.js','datos-demo.js','estado-demo.js','componentes.js']);
 if(name==='mensajes.html') assert.ok(scripts.indexOf('mensajeria-demo.js') < scripts.indexOf('mensajes.js'));
}
assert.equal(revisions.size,1); const revision = [...revisions][0];
const hash = crypto.createHash('sha256'); for(const file of [...assets].sort()) hash.update(file+'\0').update(fs.readFileSync(file)).update('\0');
assert.equal(revision, 'estable-'+hash.digest('hex').slice(0,12), 'Update the release references when any shipped asset changes');

const source = fs.readFileSync('assets/js/comprador/componentes.js','utf8');
assert.ok(!source.includes('Esta pantalla se conectará al integrar el prototipo completo'));
assert.ok(!source.includes("ROUTES[m[0]] || '#'"));
function setup(name) {
 const html = fs.readFileSync(path.join(dir,name),'utf8'); let loggedOut=false, errors=[];
 const node=()=>({innerHTML:'',textContent:'',hidden:true,classList:{toggle(){},add(){},remove(){}},setAttribute(){},contains(){return false;},querySelector(){return {focus(){}};}});
 const nodes=Object.fromEntries(['nav','bot','side','scrim','burger','pop','toast'].map(k=>[k,node()]));
 const ctx={URL,URLSearchParams,console:{error:message=>errors.push(message)},setTimeout:()=>0,clearTimeout(){},location:{href:'http://localhost:8000/pages/comprador/'+name,pathname:'/pages/comprador/'+name},document:{currentScript:{src:'http://localhost:8000/assets/js/comprador/componentes.js?v='+revision},body:{dataset:{page:html.match(/data-page="([^"]+)"/)[1]}},getElementById:k=>nodes[k],activeElement:null},window:{NexoraDemo:{requireSession:()=>false,logout(){loggedOut=true;}}}};
 vm.createContext(ctx);vm.runInContext(source.replace('window.NexoraUI = {','window.__navAudit = {renderNav:renderNav, navigateMenu:navigateMenu, versionLink:versionLink, routeHref:routeHref, routes:ROUTES, buyerHref:buyerHref}; window.NexoraUI = {'),ctx);
 return {api:ctx.window.__navAudit,nodes,errors,get loggedOut(){return loggedOut;}};
}
function link(key, href='http://localhost:8000/pages/comprador/dashboard.html') {return {dataset:{k:key},href,setAttribute(k,v){this[k]=v;}};}
function event(a){return {prevented:false,preventDefault(){this.prevented=true;},target:{closest:selector=>selector==='a[data-k]'||selector==='a[href]'?a:null}};}
for(const name of pages) {
 const s=setup(name);s.api.renderNav();
 const nav=s.nodes.nav.innerHTML;
 // Perfil salió del menú lateral: ahora está en el menú de la cuenta (avatar), así que en Perfil no hay opción activa.
 const enMenu=name!=='perfil.html';
 assert.equal((nav.match(/class="on"/g)||[]).length,enMenu?1:0);
 assert.equal((nav.match(/aria-current="page"/g)||[]).length,enMenu?1:0);
 const active=enMenu?nav.match(/data-k="([^"]+)" class="on"/)[1]:null;
 const parents={'detalle-oportunidad.html':'oportunidades','necesidad.html':'necesidades','necesidad-nueva.html':'necesidades','participacion.html':'seguimiento'};
 if(enMenu)assert.equal(active,parents[name]||Object.keys(s.api.routes).find(k=>s.api.routes[k]===name));
 assert.ok((s.nodes.bot.innerHTML.match(/aria-current="page"/g)||[]).length<=1);
 const anchors=Array.from(nav.matchAll(/<a href="([^"]+)" data-k="([^"]+)"/g));assert.equal(anchors.length,6);assert.ok(!anchors.some(a=>a[2]==='perfil'),'Perfil no está en el menú lateral');
 const profile=event(link('perfil'));s.api.navigateMenu(profile);assert.equal(profile.prevented,name==='perfil.html');assert.equal(s.errors.length,0);
 for(const [,href,key] of anchors) {
  const u=new URL(href,'http://localhost:8000/pages/comprador/'+name);assert.equal(u.searchParams.get('revision'),revision);assert.ok(fs.existsSync(path.join(dir,path.basename(u.pathname))));
  const a=link(key),e=event(a);s.api.navigateMenu(e);assert.equal(a.href,href);assert.equal(e.prevented,s.api.routes[key]===name);assert.equal(s.errors.length,0);assert.ok(!s.nodes.toast.textContent);
 }
 assert.equal(new URL(s.api.buyerHref('mensajes.html?conversacion=CONV-DEMO')).searchParams.get('revision'),revision);
 assert.equal(new URL(s.api.buyerHref('mensajes.html?conversacion=CONV-DEMO')).searchParams.get('conversacion'),'CONV-DEMO');
 const related=link(null,'http://localhost:8000/pages/comprador/detalle-oportunidad.html?id=op1&producto=aceite#op-op1');s.api.versionLink(event(related));const u=new URL(related.href);assert.equal(u.searchParams.get('id'),'op1');assert.equal(u.searchParams.get('producto'),'aceite');assert.equal(u.hash,'#op-op1');assert.equal(u.searchParams.get('revision'),revision);
 const external=link(null,'https://example.org/');s.api.versionLink(event(external));assert.equal(external.href,'https://example.org/');
 const logout=event(link('salir'));s.api.navigateMenu(logout);assert.ok(logout.prevented);assert.ok(s.loggedOut);
 const unknown=event(link('desconocida'));s.api.navigateMenu(unknown);assert.ok(unknown.prevented);assert.ok(s.errors[0].includes('Error de integración'));assert.ok(s.nodes.toast.textContent.includes('Error de integración'));assert.throws(()=>s.api.routeHref('desconocida'),/Error de integración/);
}
console.log('OK: 8 pages, content-derived revision, resource order, 56 menu combinations, one active option, related IDs/hash preserved, logout, unknown route and no provisional warning');

const css = fs.readFileSync('assets/css/shared/base.css','utf8');
assert.ok(!/background/.test(css.match(/\.nav a:hover\{([^}]+)\}/)[1]));
console.log('OK: destination builder preserves conversation IDs/revision; hover cannot imitate the active background');
