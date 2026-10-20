import {api,apiBase,apiUrl,configureApi} from './api-client.js';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=document.body.dataset.page;let account,session,tab='ads',resellers=[],items=[],products=[],revision=0,objectUrls=[];
const selected=new URLSearchParams(location.search).get('reseller_id');
const date=s=>new Date(s.includes('T')?s:s.replace(' ','T')+'Z').toLocaleString('es-US');
function report(message,error=false){$('status').textContent=message;$('status').className='status '+(error?'error':'ok');}
function links(){try{$('login').href=apiUrl('/api/login');$('logout').href=apiUrl('/cdn-cgi/access/logout');}catch{}}
function scoped(path){if(account?.role==='super_admin'&&selected)return path+(path.includes('?')?'&':'?')+'reseller_id='+encodeURIComponent(selected);return path;}
function revokeImages(){objectUrls.forEach(URL.revokeObjectURL);objectUrls=[];}
function showModal(title,fields,onSave,label='Guardar') {
  const dialog=$('dialog');dialog.innerHTML='<form><h2>'+esc(title)+'</h2>'+fields+'<p id="formError" class="error" role="alert"></p><div class="row"><button type="submit">'+esc(label)+'</button><button type="button" class="secondary" id="cancel">← Regresar sin guardar</button></div></form>';
  dialog.showModal();let busy=false;
  $('cancel').onclick=()=>dialog.close();
  dialog.oncancel=e=>{if(busy)e.preventDefault();};
  dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);$('formError').textContent='';
    try{await onSave(new FormData(e.target));dialog.close();try{await refresh();}catch(e){report('Cambio guardado. No se pudo actualizar la vista: '+e.message,true);}}
    catch(e){$('formError').textContent=e.message;}
    finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}
  };
}
function label(title,name,value='',attrs=''){return '<label>'+esc(title)+'<input name="'+name+'" value="'+esc(value)+'" '+attrs+'></label>';}
async function connect(){
  links();
  try{session=await api('/api/session');account=session.account;$('identity').textContent=account.role==='super_admin'?'Administrador propietario':account.display_name||'Reseller';$('masterLink').hidden=account.role!=='super_admin';$('login').hidden=true;$('logout').hidden=false;
    if(page==='master'&&account.role!=='super_admin'){report('Esta página es exclusiva del administrador.',true);$('content').innerHTML='<a class="button" href="reseller.html">Abrir mi panel</a>';return;}
    if(page==='reseller'&&account.role==='super_admin'&&!selected){report('Selecciona un reseller desde el panel maestro.',true);$('content').innerHTML='<a class="button" href="master.html">Ver resellers</a>';return;}
    await refresh();
  }catch(e){report(e.message,true);$('content').innerHTML='<div class="card"><h2>Conecta tu cuenta</h2><p>Abre el panel alojado en el servicio de BOXPANEL e inicia sesión. Si todavía no se ha activado, configura primero la conexión.</p><a class="button" href="conexion.html">Configurar conexión</a></div>';}
}
async function refresh(){if(page==='master')await drawMaster();else if(page==='reseller')await drawReseller();}
async function drawMaster(){
 const result=await api('/api/master/resellers');resellers=result.resellers;
 report(result.truncated?'Mostrando los primeros 200 resellers. La lista está limitada.':'Conectado · Datos del servidor');
 $('content').innerHTML='<div class="stats">'+[['Resellers',resellers.length],['Activos',resellers.filter(x=>x.status==='active').length],['Anuncios',resellers.reduce((n,x)=>n+x.ads_count,0)],['DNS',resellers.reduce((n,x)=>n+x.dns_count,0)]].map(([k,v])=>'<div class="stat">'+k+'<strong>'+v+'</strong></div>').join('')+'</div><section class="card"><div class="row"><h2>Resellers</h2><button id="create">+ Crear reseller</button></div><label>Buscar<input type="search" id="search" placeholder="Nombre o usuario"></label><div class="scroll" id="list"></div></section><section class="card"><div class="row"><h2>Catálogo público</h2><button id="newProduct">+ Agregar producto</button></div><p class="help">Solo los productos publicados aparecen en el catálogo conectado.</p><div id="products" class="scroll">Cargando…</div></section>';
 const draw=()=>{const q=$('search').value.toLowerCase();$('list').innerHTML='<table><thead><tr><th>Reseller</th><th>Estado</th><th>ADS / DNS</th><th>Acceso</th><th>Acciones</th></tr></thead><tbody>'+resellers.filter(x=>(x.display_name+' '+x.username).toLowerCase().includes(q)).map(x=>'<tr><td><b>'+esc(x.display_name)+'</b><br><small>'+esc(x.username)+'</small></td><td><span class="badge '+(x.status==='active'?'':'off')+'">'+(x.status==='active'?'Activo':'Suspendido')+'</span></td><td>'+x.ads_count+'/8 · '+x.dns_count+'/3</td><td>'+x.accounts_count+' cuenta(s)</td><td><a class="button secondary" href="reseller.html?reseller_id='+encodeURIComponent(x.id)+'">Administrar</a> <button data-account="'+x.id+'" class="secondary">Vincular acceso</button> <button data-status="'+x.id+'" class="secondary">'+(x.status==='active'?'Suspender':'Activar')+'</button></td></tr>').join('')+'</tbody></table>';
 $('list').querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{const r=resellers.find(x=>x.id===b.dataset.status);showModal(r.status==='active'?'Suspender reseller':'Activar reseller','<p>'+esc(r.display_name)+'</p>',()=>api('/api/master/resellers/'+r.id+'/status',{method:'PUT',body:{status:r.status==='active'?'suspended':'active'}}),'Confirmar');});
 $('list').querySelectorAll('[data-account]').forEach(b=>b.onclick=()=>showModal('Vincular acceso',label('Identificador verificado de Cloudflare Access','access_identity','','required maxlength="256"')+'<p class="help">Usa el identificador de la identidad autenticada; no una contraseña. Vincula únicamente a la persona verificada de este reseller.</p>',f=>api('/api/master/resellers/'+b.dataset.account+'/account',{method:'PUT',body:Object.fromEntries(f)})));
 };draw();$('search').oninput=draw;
 $('create').onclick=()=>showModal('Nuevo reseller',label('Nombre','display_name','','required maxlength="100"')+label('Usuario','username','','required pattern="[a-zA-Z0-9_-]{3,40}" maxlength="40"')+label('Identificador Access (opcional)','access_identity','','maxlength="256"')+'<p class="help">Sin vincular una identidad, la cuenta se crea sin acceso de inicio de sesión.</p>',f=>api('/api/master/resellers',{method:'POST',body:Object.fromEntries(f)}),'Crear reseller');
 $('newProduct').onclick=()=>editProduct();await drawProducts();
}
async function drawProducts(){
 products=(await api('/api/admin/products')).products;
 $('products').innerHTML=products.length?'<table><thead><tr><th>Producto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>'+products.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+(p.published?'Publicado':'Borrador')+'</td><td><button class="secondary" data-product="'+p.id+'">Editar</button><button class="danger" data-product-delete="'+p.id+'">Eliminar</button></td></tr>').join('')+'</tbody></table>':'<p class="empty">Todavía no hay productos.</p>';
 $('products').querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>editProduct(products.find(p=>p.id===b.dataset.product)));
 $('products').querySelectorAll('[data-product-delete]').forEach(b=>b.onclick=()=>showModal('Eliminar producto','<p>Se retirará del catálogo.</p>',()=>api('/api/admin/products/'+b.dataset.productDelete,{method:'DELETE'}),'Eliminar'));
}
function editProduct(p={}){
 showModal(p.id?'Editar producto':'Nuevo producto',label('Nombre','name',p.name||'','required maxlength="100"')+label('Categoría','category',p.category||'TV','required maxlength="80"')+label('Icono','icon',p.icon||'📺','required maxlength="16"')+'<label>Descripción<textarea name="description" maxlength="2000">'+esc(p.description||'')+'</textarea></label>'+label('Imagen HTTPS (opcional)','image_url',p.image_url||'','type="url"')+label('Descarga HTTPS (opcional)','download_url',p.download_url||'','type="url"')+'<label><input type="checkbox" name="published" '+(p.published?'checked':'')+'> Publicado</label>',f=>api('/api/admin/products'+(p.id?'/'+p.id:''),{method:p.id?'PUT':'POST',body:{...Object.fromEntries(f),published:f.has('published')}}));
}
async function drawReseller(){
 const seq=++revision;revokeImages();
 const result=await api(scoped('/api/reseller/'+tab));if(seq!==revision)return;items=result.items;
 report('Conectado · '+(tab==='ads'?'Anuncios':'DNS')+' '+items.length+'/'+result.limit);
 $('content').innerHTML=(account.role==='super_admin'?'<a href="master.html">← Regresar al panel maestro</a>':'')+'<div class="tabs"><button id="adsTab" class="'+(tab==='ads'?'active':'secondary')+'">Anuncios</button><button id="dnsTab" class="'+(tab==='dns'?'active':'secondary')+'">DNS</button></div><section class="card"><div class="row"><h2>'+(tab==='ads'?'Anuncios':'Servidores DNS')+'</h2><button id="add" '+(items.length>=result.limit||(tab==='ads'&&!result.uploads_enabled)?'disabled':'')+'>+ '+(tab==='ads'?'Nuevo anuncio':'Nuevo DNS')+'</button></div><p class="help">'+(tab==='ads'?(result.uploads_enabled?'Selecciona una imagen de tu galería de hasta 5 MB; se optimiza antes de subirla.':'La subida está pendiente de activación por el propietario.'):'Máximo 3 servidores por reseller. '+(session.allow_http_dns?'Se admiten HTTP y HTTPS.':'Usa HTTPS.'))+'</p><div class="scroll" id="list"></div></section>';
 $('adsTab').onclick=()=>changeTab('ads');$('dnsTab').onclick=()=>changeTab('dns');$('add').onclick=()=>tab==='ads'?addAd():editDns();
 $('list').innerHTML=items.length?'<table><thead><tr><th>Título</th><th>'+(tab==='ads'?'Imagen':'Dirección')+'</th><th>Creado</th><th>Acciones</th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+(tab==='ads'?'<img class="preview" data-preview="'+x.id+'" alt="Anuncio: '+esc(x.title)+'">':esc(x.server_url))+'</td><td>'+esc(date(x.created_at))+'</td><td>'+(tab==='dns'?'<button class="secondary" data-edit="'+x.id+'">Editar</button>':'')+'<button class="danger" data-delete="'+x.id+'">Eliminar</button></td></tr>').join('')+'</tbody></table>':'<p class="empty">No hay registros. Agrega uno para comenzar.</p>';
 $('list').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editDns(items.find(x=>x.id===b.dataset.edit)));
 $('list').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{const kind=tab;showModal('Eliminar '+(kind==='ads'?'anuncio':'DNS'),'<p>'+esc(items.find(x=>x.id===b.dataset.delete).title)+'</p>',()=>api(scoped('/api/reseller/'+kind+'/'+b.dataset.delete),{method:'DELETE'}),'Eliminar');});
 if(tab==='ads') for(const img of $('list').querySelectorAll('[data-preview]')) {try{const blob=await api(scoped('/api/reseller/ads/'+img.dataset.preview),{blob:true});if(seq!==revision)return;const src=URL.createObjectURL(blob);objectUrls.push(src);img.src=src;}catch{if(seq===revision){img.alt='No se pudo cargar la imagen';report('No se pudo cargar una imagen. Usa Actualizar o vuelve a abrir esta página.',true);}}}
}
async function changeTab(value){tab=value;try{await drawReseller();}catch(e){report(e.message,true);}}
function editDns(p={}){showModal(p.id?'Editar DNS':'Nuevo DNS',label('Título','title',p.title||'','required maxlength="100"')+label('Dirección del servidor','url',p.server_url||'','required type="url" maxlength="1500" placeholder="https://servidor.ejemplo.com"'),f=>api(scoped('/api/reseller/dns'+(p.id?'/'+p.id:'')),{method:p.id?'PUT':'POST',body:Object.fromEntries(f)}));}
async function optimizeImage(file){
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5*1024*1024)throw Error('Selecciona JPG, PNG o WebP de hasta 5 MB.');
 const bitmap=await createImageBitmap(file);try{
  const canvas=document.createElement('canvas');let scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  for(let attempt=0;attempt<5;attempt++){
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));if(blob&&blob.size<=262144)return blob;scale*=0.7;
  }throw Error('No se pudo optimizar la imagen. Selecciona una más pequeña.');
 }finally{bitmap.close();}
}
function addAd(){showModal('Nuevo anuncio',label('Título','title','','required maxlength="100"')+'<label>Imagen de tu galería<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required></label><p class="help">La imagen se optimiza para reducir el espacio y los datos móviles.</p>',async f=>{const blob=await optimizeImage(f.get('image'));await api(scoped('/api/reseller/ads?title='+encodeURIComponent(f.get('title'))),{method:'POST',body:blob});},'Subir anuncio');}
function connection(){
 links();report('Configura el servicio y comprueba tu sesión.');
 $('content').innerHTML='<section class="card"><h2>Dirección del servicio</h2><form id="connectionForm">'+label('Dirección HTTPS','endpoint','','required type="url" placeholder="https://boxpanel-api.tu-cuenta.workers.dev"')+'<button>Guardar dirección</button></form><div class="actions"><button id="test" class="secondary">Comprobar conexión</button><a class="button secondary" id="openPanel">Abrir panel en el servicio</a></div><p class="help">Inicia sesión desde el panel alojado en el servicio para que el navegador pueda mantener tu sesión.</p></section><section class="card"><h2>Identidad de acceso</h2><p class="help">Después de iniciar sesión, consulta el identificador verificado que el propietario necesita para vincular tu cuenta. No es una contraseña.</p><button id="identityCheck" class="secondary">Consultar mi identidad</button><p id="identityResult" class="status"></p></section>';
 try{$('connectionForm').elements.endpoint.value=apiBase();$('openPanel').href=apiUrl('/api/login');}catch{}
 $('connectionForm').onsubmit=e=>{e.preventDefault();try{configureApi(e.target.elements.endpoint.value);links();$('openPanel').href=apiUrl('/api/login');report('Dirección guardada. Comprueba la conexión e inicia sesión.');}catch(e){report(e.message,true);}};
 $('test').onclick=async()=>{try{const r=await api('/health');report(r.ok===true&&r.service==='BOXPANEL API'?'Servicio BOXPANEL conectado. Inicia sesión para acceder.':'La dirección no corresponde a BOXPANEL.',r.service!=='BOXPANEL API');}catch(e){report(e.message,true);}};
 $('identityCheck').onclick=async()=>{try{const r=await api('/api/identity');$('identityResult').textContent='Identificador verificado: '+r.sub;}catch(e){$('identityResult').textContent=e.message;}};
}
addEventListener('pagehide',revokeImages);
if(page==='conexion')connection();else connect();
