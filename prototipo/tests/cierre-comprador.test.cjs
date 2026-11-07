require('./helpers/utils-compartidas.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const key='nexora.comprador.demo.v1';
function load(){const memory={},events=[];let failing=false;const c={window:{dispatchEvent(e){events.push(e.detail);}},Event:function(){},sessionStorage:{getItem:k=>memory[k]||null,setItem(k,v){if(failing)throw Error('Storage unavailable');memory[k]=v;},removeItem:k=>delete memory[k]}};vm.createContext(c);for(const f of ['datos-demo.js','estado-demo.js'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f,'utf8'),c);return {s:c.window.NexoraStore,memory,events,fail(v){failing=v;}};}
function unchanged(f,before,disk){assert.equal(JSON.stringify(f.s.get()),before);assert.equal(f.memory[key],disk);}
const f=load(),s=f.s;
const n=s.register('Pedido ficticio adicional',[{k:'aceite',qty:2,price:20,presentation:'Botella 1 L',brand:''}],'2026-10-18','sa-centro').needs[0];
assert.ok(s.selectNeed('op1','NEC-DEMO-1'));const before=JSON.stringify(s.get()),disk=f.memory[key],events=f.events.length;
f.fail(true);assert.equal(s.selectNeed('op1',n.id),false);unchanged(f,before,disk);assert.equal(f.events.length,events);assert.equal(s.selectedNeed(s.get().opps[0]).id,'NEC-DEMO-1');assert.ok(s.error());
let toast='';
unchanged(f,before,disk);
const detailLine=fs.readFileSync('assets/js/comprador/detalle-oportunidad.js','utf8').split('\n').find(l=>l.includes("root.addEventListener('change'"));const detailFn=detailLine.slice(detailLine.indexOf('function (e)'),-2);toast='';let rerendered=0;const detailField={name:'detail-reference',value:n.id};vm.runInNewContext('('+detailFn+')(event)',{store:s,id:'op1',ui:{toast:m=>toast=m},render:()=>rerendered++,event:{target:detailField}});assert.ok(toast,'Storage failure is reported');assert.equal(rerendered,1,'The page re-renders the previous selection');assert.equal(s.selectedNeed(s.get().opps[0]).id,'NEC-DEMO-1');unchanged(f,before,disk);
f.fail(false);assert.equal(s.selectNeed('op1',n.id),true);assert.equal(s.selectedNeed(s.get().opps[0]).id,n.id);assert.equal(JSON.parse(f.memory[key]).selections.op1,n.id);assert.equal(s.saving(s.selectedNeed(s.get().opps[0]),s.get().opps[0]).total,27.2);
f.fail(true);const selected=JSON.stringify(s.get()),selectedDisk=f.memory[key];assert.equal(s.selectNeed('op1',''),false);unchanged(f,selected,selectedDisk);f.fail(false);assert.ok(s.selectNeed('op1',''));assert.equal(s.selectedNeed(s.get().opps[0]),null);
console.log('OK: reference success/failure/deselection, previous savings and state preserved, card/detail controls restore previous selection');
const components=fs.readFileSync('assets/js/comprador/componentes.js','utf8');
function handler(marker){const line=components.split('\n').find(l=>l.includes(marker));return line.slice(line.indexOf('function ('),-2);}
for(const index of [0,undefined]){
 const g=load(),old=JSON.stringify(g.s.get()),stored=g.memory[key];g.fail(true);let renders=0,notice='';
 const e={stopPropagation(){},target:{closest(){return {dataset:{read:'0'}};}}};
 const ctx={store:g.s,event:e,toast:m=>notice=m,renderNotifs(){renders++;},$:()=>({focus(){},querySelector(){return null;}})};
 const fn=handler(index===undefined?"$('readall').addEventListener":"$('nl').addEventListener");
 vm.runInNewContext('('+fn+')(event)',ctx);unchanged(g,old,stored);assert.equal(renders,0);assert.ok(notice);assert.ok(!notice.includes('marcadas como leídas'));
 g.fail(false);vm.runInNewContext('('+fn+')(event)',ctx);assert.equal(renders,1);
 assert.equal(g.s.get().notifs.filter(n=>!n.read).length,index===undefined?0:2);
 assert.equal(JSON.stringify(g.s.get()),g.memory[key]);
 const expected=JSON.parse(old);expected.notifs.forEach((n,i)=>{if(index===undefined||i===index)n.read=true;});assert.equal(JSON.stringify(g.s.get()),JSON.stringify(expected));
}
console.log('OK: individual/all notification reads persist first; failures do not rerender, announce success, or mutate prior state');
(async()=>{
 const g=load();g.s.updateProfile({business:'Bodega de prueba ficticia',name:'Ana',businessType:'Bodega',phone:'',email:'',description:''});g.s.sendDemoMessage('CONV-DEMO-ACEITE','Mensaje ficticio conservado');g.s.confirmParticipation(g.s.prepareParticipation('op1','NEC-DEMO-1').proposal);g.s.selectNeed('op2','NEC-DEMO-2');g.memory['nexora.comprador.catalogFilters']='{"search":"aceite"}';
 const baseline=JSON.stringify(g.s.get()),stored=JSON.stringify(g.memory);let resetCalls=0;const originalReset=g.s.reset;g.s.reset=function(){resetCalls++;return originalReset.apply(g.s,arguments);};
 const c={window:{NexoraStore:g.s,NexoraDemo:{requireSession:()=>false}},document:{currentScript:{src:'http://localhost/assets/js/comprador/componentes.js?v=test'}},location:{pathname:'/pages/comprador/necesidades.html'},URL};vm.createContext(c);vm.runInContext(components,c);const ui=c.window.NexoraUI;
 for(const empty of [true,false])for(const term of ['necesidades y pedidos','participaciones confirmadas y retiradas','historial','referencias y filtros','perfil del negocio','conversaciones, mensajes y borradores','otros datos de sesión'])assert.ok(ui.resetWarning(empty).includes(term),term);
 let warning='';ui.confirm=async text=>{warning=text;return false;};
 assert.ok(!fs.readFileSync('pages/comprador/necesidades.html','utf8').includes('id="empty-demo"'));
 const resetLine=components.split('\n').find(l=>l.includes("$('reset').addEventListener"));const resetFn=resetLine.slice(resetLine.indexOf('async function'),-2);
 await vm.runInNewContext('('+resetFn+')()',{store:g.s,resetWarning:ui.resetWarning,confirmDemo:ui.confirm});assert.equal(warning,ui.resetWarning(false));
 assert.equal(resetCalls,0);assert.equal(JSON.stringify(g.s.get()),baseline);assert.equal(JSON.stringify(g.memory),stored);
 console.log('OK: complete reset warnings and single shared control; cancel preserves profile, history, messages, references, filters and storage without invoking reset');
})().catch(error=>{console.error(error);process.exitCode=1;});
