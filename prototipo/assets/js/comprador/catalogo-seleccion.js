/* Lista del Catálogo: selección privada, visible en «Mi lista». Completarla y guardarla ocurre en la página de registro
   (necesidad-nueva.html?lista=catalogo), con el mismo borrador y sin un segundo registro. */
(function(){
 'use strict';
 var store=window.NexoraStore,ui=window.NexoraUI;
 if(!store||!ui||!window.NexoraCatalogDraft)return;
 var $=function(id){return document.getElementById(id);},draft=window.NexoraCatalogDraft.create(sessionStorage,store),list=$('catalog-list'),dialog=$('cp-discard-dialog');
 var photos = window.NexoraProductImages || {};
 function refresh(){
  var state=draft.get(),locked=state.status!=='editing',count=state.items.length,notice=(state.status==='committing'?'No sabemos si tu último pedido se guardó. Revisa Mis necesidades antes de vaciar esta lista.':state.status==='completed'?'Esta lista ya se guardó. Vacíala para preparar otra.':draft.error());
  var blocked=locked||!count||draft.error().includes('recuperar');
  $('cp-selection-count').textContent='('+count+')';
  $('cp-bar-count').textContent='Mi lista ('+count+')';
  $('cp-selection-bar').hidden=!count&&!notice;
  $('cp-selection-notice').textContent=notice;
  $('cp-continue').disabled=$('cp-bar-continue').disabled=blocked;
  $('cp-discard').hidden=!count&&state.status==='editing';
  $('cp-discard').textContent=state.status==='committing'?'Ya revisé · vaciar lista':'Vaciar lista';
  list.querySelectorAll('[data-catalog-card]').forEach(function(card){
   var id=card.dataset.catalogCard,button=card.querySelector('[data-list-product]');if(!button)return;
   var selected=state.items.some(function(n){return n.k===id;});button.textContent=selected?'En tu lista ✓ · Quitar':'Añadir a mi lista';button.setAttribute('aria-pressed',String(selected));button.disabled=locked;
  });
  var target=$('cp-selection-items');target.replaceChildren();
  if(!count){var empty=document.createElement('li');empty.className='cp-items__empty';empty.textContent='Añade productos y guárdalos juntos como un pedido.';target.append(empty);}
  state.items.forEach(function(n,index){var p=store.productById(n.k),row=document.createElement('li');row.className='cp-item';
   var media=document.createElement('span');media.className='nx-thumb';if(p&&photos[p.id||n.k]){var img=document.createElement('img');img.src='../../assets/images/'+photos[p.id||n.k];img.alt='';img.addEventListener('error',function(){img.remove();media.innerHTML=ui.ic(p.icon);});media.append(img);}else media.innerHTML=ui.ic(p?p.icon:'box');
   var info=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=p?p.name:'Producto por completar';detail.textContent=n.presentation||'';info.append(name,detail);
   var remove=document.createElement('button');remove.type='button';remove.className='nx-btn nx-btn--tertiary nx-btn--sm';remove.textContent='Quitar';remove.setAttribute('aria-label','Quitar '+(p?p.name:'producto por completar'));remove.disabled=locked;remove.addEventListener('click',function(){var next=draft.get();next.items.splice(index,1);if(!draft.update(next))ui.toast(draft.error());refresh();var focus=target.querySelector('button');(focus||$('cp-list')).focus();});row.append(media,info,remove);target.append(row);
  });
 }
 function toggle(id){if(!draft.toggle(id))ui.toast(draft.error()||'Revisa primero tu pedido pendiente en Mis necesidades.');refresh();}
 function continueList(){var state=draft.get();if(state.status!=='editing'||!state.items.length||draft.error().includes('recuperar'))return;location.assign(ui.buyerHref('necesidad-nueva.html?lista=catalogo'));}
 list.addEventListener('click',function(event){var button=event.target.closest('[data-list-product]');if(button){event.preventDefault();toggle(button.dataset.listProduct);}});
 $('cp-continue').addEventListener('click',continueList);$('cp-bar-continue').addEventListener('click',continueList);
 // Confirmación corta, como «Retirarme»; no hay modal de información.
 $('cp-discard').addEventListener('click',function(){var uncertain=draft.get().status==='committing';$('cp-discard-text').textContent=uncertain?'Si tu pedido ya aparece en Mis necesidades, no lo guardes otra vez.':'Se quitan todos los productos. Tus pedidos guardados no cambian.';dialog.showModal();$('cp-discard-no').focus();});
 $('cp-discard-no').addEventListener('click',function(){dialog.close();});
 $('cp-discard-yes').addEventListener('click',function(){dialog.close();if(!draft.discard())ui.toast(draft.error());refresh();$('cp-list').focus();});
 new MutationObserver(refresh).observe(list,{childList:true});refresh();
})();
