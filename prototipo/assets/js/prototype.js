(function(){
 function route(){
  var home=document.getElementById('v-home');
  if(!home)return;
  var h=location.hash.slice(1);
  var el=h?document.getElementById(h):null;
  if(el)el.scrollIntoView();else window.scrollTo(0,0);
  document.querySelectorAll('.menu a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+(h||'inicio'))});
 }
 addEventListener('hashchange',route);route();
 document.querySelectorAll('form[data-demo]').forEach(function(f){f.addEventListener('submit',function(e){
  e.preventDefault();
  var m=f.querySelector('.msg');
  if(document.getElementById('v-login')){
   Promise.resolve(window.NexoraDemo.enter(document.getElementById('le').value,document.getElementById('lp').value)).then(function(text){
    m.textContent=text;
    m.style.display=m.textContent?'block':'none';
   });
  }else{
   m.textContent=f.dataset.demo+' No se ha creado ninguna cuenta. Puedes continuar desde «Inicia sesión» con la cuenta demo.';
   m.style.display='block';
  }
 })});
})();
