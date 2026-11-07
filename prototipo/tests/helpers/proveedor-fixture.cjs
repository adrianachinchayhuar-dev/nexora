const fs=require('node:fs'),vm=require('node:vm');
const buyerKey='nexora.comprador.demo.v1';
function fixture(){
 const memory={};const c={window:{dispatchEvent(){}},Event:function(){},sessionStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v,removeItem:k=>delete memory[k]}};vm.createContext(c);
 for(const f of ['datos-demo.js','estado-demo.js'])vm.runInContext(fs.readFileSync('assets/js/comprador/'+f,'utf8'),c);
 const s=c.window.NexoraStore;
 const first=s.confirmParticipation(s.prepareParticipation('op1','NEC-DEMO-1').proposal).participation;s.confirmWithdrawal(s.prepareWithdrawal(first.id).proposal);s.confirmParticipation(s.prepareParticipation('op1','NEC-DEMO-1').proposal);
 const n=s.register('PRIVATE-ORDER',[{k:'aceite',qty:2,price:999.99,brand:'PRIVATE-BRAND',presentation:'Botella 1 L'}],'2026-10-18','sa-centro').needs[0];s.selectNeed('op1',n.id);s.confirmParticipation(s.prepareParticipation('op1',n.id).proposal);
 s.confirmParticipation(s.prepareParticipation('op2','NEC-DEMO-2').proposal);{const o3=s.get().opps.find(o=>o.id==='op3'),e=o3.estado;o3.estado='en_cotizacion';s.confirmParticipation(s.prepareParticipation('op3','NEC-DEMO-3').proposal);s.get().opps.find(o=>o.id==='op3').estado=e;s.persist();}
 s.updateProfile({business:'PRIVATE-BUSINESS',name:'PRIVATE-PERSON',businessType:'Bodega',phone:'',email:'private@nexora.example',description:'PRIVATE-DESCRIPTION'});s.sendDemoMessage('CONV-DEMO-ACEITE','PRIVATE-CONVERSATION');
 return memory;
}
function supplier(memory,options={}){
 const writes=[],removals=[],redirects=[],nodes={};
 const node=()=>({outerHTML:'',innerHTML:'',hidden:true,classList:{toggle(){},contains(){return false;}},setAttribute(){},contains(){return false;},focus(){},addEventListener(){},querySelector(){return {focus(){}};},querySelectorAll(){return [];}});
 const c={URL,URLSearchParams,console,location:{href:'http://localhost:8000/pages/proveedor/'+(options.page||'dashboard.html'),search:'?revision=test',assign:u=>redirects.push(u),replace:u=>redirects.push(u)},document:{currentScript:{src:'http://localhost:8000/assets/js/proveedor/componentes.js?v=test'},body:{dataset:{page:options.rolePage||'inicio'}},getElementById:id=>nodes[id]||(nodes[id]=node()),addEventListener(){}},window:{addEventListener(){},innerWidth:1280},sessionStorage:{getItem(k){if(options.failRead)throw Error('read');return memory[k]||null;},setItem(k,v){writes.push(k);if(k===buyerKey)throw Error('Buyer write forbidden');if(options.failWrite)throw Error('write');memory[k]=v;},removeItem(k){removals.push(k);if(k===buyerKey)throw Error('Buyer removal forbidden');delete memory[k];}}};vm.createContext(c);
 for(const f of ['shared/proveedores-demo.js','comprador/datos-demo.js','shared/escenario-lectura.js','proveedor/sesion-demo.js','proveedor/estado-demo.js','proveedor/mensajes-estado.js','proveedor/componentes.js'])vm.runInContext(fs.readFileSync('assets/js/'+f,'utf8'),c,{filename:f});
 return {c,writes,removals,redirects,nodes,read:c.window.NexoraScenarioRead.read};
}
module.exports={fixture,supplier,buyerKey};
