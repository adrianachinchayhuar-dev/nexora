// Registro con credenciales simuladas: la contraseña nunca queda en texto plano y el login acepta la cuenta nueva y la demo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
function env(){
 const local={},session={};let assigned='';
 const store=m=>({getItem:k=>k in m?m[k]:null,setItem(k,v){m[k]=String(v)},removeItem(k){delete m[k]}});
 const c={window:{location:{assign(u){assigned=u},replace(u){assigned=u}},addEventListener(){},crypto:webcrypto},crypto:webcrypto,TextEncoder,Uint8Array,Promise,JSON,Date,Array,URL,
  localStorage:store(local),sessionStorage:store(session),document:{currentScript:{src:'http://x/assets/js/demo-session.js?v=t'},body:{dataset:{}},getElementById(){return null}}};
 c.window.localStorage=c.localStorage;c.window.sessionStorage=c.sessionStorage;vm.createContext(c);
 vm.runInContext(fs.readFileSync('assets/js/demo-session.js','utf8'),c);
 return {c,local,session,demo:c.window.NexoraDemo,url:()=>assigned};
}
(async()=>{
 const e=env(),datos={business:'Bodega Luz',name:'Luz Rojas',phone:'987654321',email:'Luz@Correo.com',password:'clave1234',distrito:'Santa Anita',zona:'sa-centro',direccion:'Av. Los Ficus 123'};
 assert.equal(await e.demo.crearCuenta(datos),'');
 const raw=e.local['nexora.demo.cuentas.v1'],cuentas=JSON.parse(raw);
 assert.equal(cuentas.length,1);assert.ok(!raw.includes('clave1234'),'La contraseña no se guarda en texto plano');assert.match(cuentas[0].hash,/^[0-9a-f]{64}$/);assert.equal(cuentas[0].email,'luz@correo.com');
 assert.equal(JSON.parse(e.session['nexora.demo.cuentaActiva.v1']).business,'Bodega Luz');assert.ok(!e.session['nexora.demo.cuentaActiva.v1'].includes('hash'));
 assert.ok(e.url().includes('dashboard.html'),'Al crear la cuenta entra al Inicio');
 assert.ok(/Ya existe una cuenta/.test(await e.demo.crearCuenta(datos)),'Correo repetido');
 // Login: la cuenta nueva, una clave mala y la cuenta demo (que sigue igual y desactiva la cuenta nueva).
 const f=env();f.local['nexora.demo.cuentas.v1']=raw;
 assert.ok(/Credenciales incorrectas/.test(await f.demo.enter('luz@correo.com','otra')));
 assert.ok(/Credenciales incorrectas/.test(await f.demo.enter('nadie@correo.com','clave1234')));
 assert.equal(await f.demo.enter('LUZ@correo.com','clave1234'),'');assert.ok(f.session['nexora.demo.cuentaActiva.v1']);
 assert.equal(f.demo.enter('demo@nexora.example','NexoraDemo'),'','La cuenta demo sigue entrando de forma directa');assert.equal(f.session['nexora.demo.cuentaActiva.v1'],undefined);
 assert.ok(/Credenciales incorrectas/.test(f.demo.enter('demo@nexora.example','mala')));
 // El escenario toma el negocio de la cuenta activa.
 const g=env();g.session['nexora.demo.cuentaActiva.v1']=e.session['nexora.demo.cuentaActiva.v1'];
 vm.runInContext(fs.readFileSync('assets/js/comprador/datos-demo.js','utf8'),g.c);
 assert.equal(g.c.window.NexoraScenarioSeed.create().user.business,'Bodega Luz');
 const h=env();vm.runInContext(fs.readFileSync('assets/js/comprador/datos-demo.js','utf8'),h.c);assert.equal(h.c.window.NexoraScenarioSeed.create().user.business,'Bodega Rosita');
 console.log('OK: cuenta simulada con hash, login con cuenta nueva y demo, escenario del negocio activo');
})().catch(e=>{console.error(e);process.exit(1)});
