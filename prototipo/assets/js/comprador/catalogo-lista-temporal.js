/* Borrador privado. Nunca escribe en el escenario comprador ni registra necesidades. */
(function(){
 'use strict';
 function create(storage,store){
  var s=store.get(),context=JSON.stringify([s.user.id,s.scenarioId||null,s.baseDate,s.opps.map(function(o){return [o.id,o.from,o.until,o.closeDate];})]);
  var key='nexora.catalogo.lista.v1:'+encodeURIComponent(context),value={version:1,context:context,status:'editing',items:[],requiredDate:null,zoneId:null},error='';
  function clone(v){return JSON.parse(JSON.stringify(v));}
  try{var raw=storage.getItem(key);if(raw){var parsed=JSON.parse(raw);if(parsed.version!==1||parsed.context!==context||!Array.isArray(parsed.items)||!['editing','committing','completed'].includes(parsed.status))throw Error('invalid');value=parsed;}}
  catch(e){error='No se pudo recuperar tu lista temporal. No la sobrescribiremos. Revisa el almacenamiento antes de continuar.';}
  function save(next){if(error&&error.indexOf('recuperar')!==-1)return false;try{storage.setItem(key,JSON.stringify(next));value=next;error='';return true;}catch(e){error='No se pudo conservar tu lista temporal. Se mantiene el valor anterior. Inténtalo de nuevo.';return false;}}
  function editable(){return value.status==='editing';}
  function snapshot(draft){var next=clone(value);next.items=clone(draft.items);next.requiredDate=draft.requiredDate;next.zoneId=draft.zoneId;return next;}
  return {get:function(){return clone(value);},error:function(){return error;},key:key,
   toggle:function(id){if(!editable()||!store.productById(id))return false;var next=clone(value),i=next.items.findIndex(function(n){return n.k===id;});if(i>=0)next.items.splice(i,1);else{var p=store.productById(id);next.items.push({k:id,qty:null,raw:'',brand:p.brand||'',presentation:p.detail,price:null});}return save(next);},
   discard:function(){return save({version:1,context:context,status:'editing',items:[],requiredDate:null,zoneId:null});},
   update:function(draft){if(!editable())return false;return save(snapshot(draft));},
   begin:function(draft){if(!editable())return false;var next=snapshot(draft);next.status='committing';return save(next);},
   failed:function(draft){var next=snapshot(draft);next.status='editing';return save(next);},
   complete:function(needs){var next=clone(value);next.status='completed';next.registeredIds=needs.map(function(n){return n.id;});next.items=[];var ok=save(next);if(!ok){value=next;return false;}try{storage.removeItem(key);value={version:1,context:context,status:'editing',items:[],requiredDate:null,zoneId:null};}catch(e){error='Tus necesidades se registraron. No se pudo retirar el comprobante temporal; no vuelvas a registrarlas.';}return true;}
  };
 }
 window.NexoraCatalogDraft={create:create};
})();
