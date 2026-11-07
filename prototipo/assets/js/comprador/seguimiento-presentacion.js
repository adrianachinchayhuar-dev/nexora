/* Presentación de la lista de Seguimiento. El controlador gestiona los filtros; el detalle y el retiro están en participacion.html. */
(function(){
 'use strict';
 if(!window.NexoraDemo.requireSession())return;
 var store=window.NexoraStore,ui=window.NexoraUI,base=window.NexoraParticipationSummary,photos=window.NexoraProductImages||{},esc=ui.esc;
 var $=function(id){return document.getElementById(id);};
 function text(v){return typeof v==='string'&&v.trim()?v:'No registrado';}
 function photo(p){var s=p.snapshot||{},product=store.products[s.productId],file=product&&photos[s.productId];return '<span class="tp-photo'+(file?' has-photo':'')+'" aria-hidden="true">'+ui.ic(product?product.icon:'box')+(file?'<img class="tp-product-image" src="../../assets/images/'+esc(file)+'" alt="">':'')+'</span>';}
 function status(p){var known=p.status==='Confirmada'||p.status==='Retirada';return '<span class="tp-state '+(p.status==='Confirmada'?'tp-confirmed':p.status==='Retirada'?'tp-withdrawn':'')+'">'+ui.ic(p.status==='Retirada'?'trash':'check')+esc(p.status==='Confirmada'?'Te uniste':p.status==='Retirada'?'Te retiraste':'Estado no disponible')+'</span>';}
 function extra(p){var o=base.opportunity(p),n=store.get().needs.find(function(x){return x.id===p.needId;}),tx=window.NexoraTesis;if(!o||!tx)return '';var a=p.status==='Confirmada'&&n?tx.ahorro(n,o,{focusable:false}):null;return '<div class="tx-seg">'+tx.linea(o)+' '+tx.chipEstado(o)+' '+tx.chipLlega(o,p.snapshot)+(a&&a.hay?' '+a.html:'')+'</div>';}
 function record(p){var s=p.snapshot||{};return '<div class="tp-record"><div class="tp-product">'+photo(p)+'<div><strong>'+esc(text(s.product))+'</strong><small>'+esc(text(s.presentation))+'</small></div></div><div class="tp-quantity"><span class="tp-cell-label">Cantidad</span>'+esc(base.quantity(p))+'</div><div class="tp-provider"><span class="tp-cell-label">Proveedor</span>'+esc(text(s.provider))+'</div><div class="tp-date"><span class="tp-cell-label">Te uniste · Lima</span>'+esc(base.realDate(p.confirmedAt).replace(' · hora de Lima',''))+(p.status==='Retirada'?'<small>Retirada: '+esc(base.realDate(p.withdrawnAt).replace(' · hora de Lima',''))+'</small>':'')+'</div><div class="tp-row-status"><span class="tp-cell-label">Participación</span>'+status(p)+'</div>'+extra(p)+'</div>';}
 function money(v){return Number.isFinite(v)&&v>=0?ui.money(v):'No registrado';}
 // Only this page opts into the presentation; the shared module file is not edited.
 window.NexoraParticipationSummary=Object.assign({},base,{record:record});
 function enhanceSummary(){var labels=['Te uniste','Te retiraste','Total de participaciones'],icons=['check','trash','clip'];$('tracking-summary').querySelectorAll(':scope>div').forEach(function(card,i){if(card.dataset.tpReady)return;card.dataset.tpReady='true';card.classList.add('tp-metric','tp-metric-'+i);var amount=card.querySelector('b').textContent;card.innerHTML='<span class="tp-metric-icon">'+ui.ic(icons[i])+'</span><div><strong>'+esc(amount)+'</strong><span>'+labels[i]+'</span></div>';});}
 function enhanceRows(){$('tracking-list').querySelectorAll('[data-participation-card]').forEach(function(card){card.setAttribute('role','listitem');var button=card.querySelector('[data-participation]');if(button)button.textContent='Ver detalle';});}
 new MutationObserver(enhanceSummary).observe($('tracking-summary'),{childList:true});new MutationObserver(enhanceRows).observe($('tracking-list'),{childList:true});
 document.addEventListener('error',function(e){var img=e.target;if(img.classList&&img.classList.contains('tp-product-image')){img.parentElement.classList.remove('has-photo');img.remove();}},true);
 $('sub').textContent='Revisa tus participaciones y conserva el historial de tu negocio.';
})();
