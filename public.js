import {api} from './api-client.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let products=[],loadError='',loaded=false,revision=0;
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
function cards(list){return list.length?'<div class="grid">'+list.map(p=>'<a class="card" href="#/producto/'+encodeURIComponent(p.id)+'"><small>'+esc(p.category)+'</small>'+(safeUrl(p.image_url)?'<img class="product-image" src="'+esc(safeUrl(p.image_url))+'" loading="lazy" alt="'+esc(p.name)+'">':'<div class="art">'+esc(p.icon)+'</div>')+'<h2>'+esc(p.name)+'</h2><p class="muted">'+esc(p.description)+'</p><b>Ver detalles →</b></a>').join('')+'</div>':'<p class="status">Todavía no hay aplicaciones publicadas.</p>';}
async function render(){
 const seq=++revision,root=document.getElementById('app'),path=location.hash.slice(1)||'/';
 if(!loaded){root.innerHTML='<p class="status">Cargando catálogo…</p>';try{products=(await api('/api/products')).products;}catch(e){loadError=e.message;}loaded=true;}
 if(seq!==revision)return;
 const availability=loadError?'<p class="status error">Catálogo temporalmente no disponible. <a href="conexion.html">Revisar conexión</a></p>':cards(products);
 if(path==='/'){root.innerHTML='<section class="hero"><small>APLICACIONES · EXPERIENCIAS DIGITALES</small><h1>Cada pantalla.<br><span>Una nueva experiencia.</span></h1><p class="muted">Descubre las aplicaciones publicadas por BOXPANEL y administra tus anuncios y servidores desde tu cuenta.</p><div class="actions"><a class="button" href="#/catalogo">Explorar catálogo →</a><a class="button secondary" href="reseller.html">Abrir mi panel</a></div></section><section><h2>Aplicaciones</h2>'+availability+'</section>';}
 else if(path==='/catalogo'){
  root.innerHTML='<h1>Catálogo de aplicaciones</h1><p class="muted">Productos publicados por el administrador de BOXPANEL.</p><label>Buscar<input id="search" type="search" placeholder="Nombre o categoría"></label><div id="results">'+availability+'</div>';
  document.getElementById('search').oninput=e=>{if(loadError)return;const q=e.target.value.toLowerCase();const list=products.filter(p=>(p.name+' '+p.category+' '+p.description).toLowerCase().includes(q));document.getElementById('results').innerHTML=list.length?cards(list):'<p class="status">No se encontraron aplicaciones.</p>';};
 }else if(path.startsWith('/producto/')){
  let id;try{id=decodeURIComponent(path.slice('/producto/'.length));}catch{id='';}const p=products.find(x=>x.id===id);
  root.innerHTML='<a href="#/catalogo">← Regresar al catálogo</a>'+(p?'<section class="card"><div class="art">'+esc(p.icon)+'</div><small>'+esc(p.category)+'</small><h1>'+esc(p.name)+'</h1><p>'+esc(p.description)+'</p>'+(safeUrl(p.image_url)?'<img class="product-image" src="'+esc(safeUrl(p.image_url))+'" alt="'+esc(p.name)+'">':'')+(safeUrl(p.download_url)?'<div class="actions"><a class="button" href="'+esc(safeUrl(p.download_url))+'" rel="noopener noreferrer">Descargar aplicación ↗</a></div>':'<p class="muted">Descarga todavía no disponible.</p>')+'</section>':'<p class="status">'+(loadError?'No se pudo consultar el producto.':'Producto no encontrado.')+'</p>');
 }else if(path==='/funciones')root.innerHTML='<h1>Todo desde BOXPANEL</h1><div class="grid"><section class="card"><h2>Anuncios</h2><p>Gestiona hasta ocho imágenes por reseller desde tu celular.</p></section><section class="card"><h2>Servidores DNS</h2><p>Agrega, edita o elimina hasta tres direcciones de servidor.</p></section><section class="card"><h2>Acceso individual</h2><p>Cada reseller administra sus propios registros. El propietario gestiona el conjunto.</p></section></div>';
 else if(path==='/contacto')root.innerHTML='<h1>Contacto y acceso</h1><section class="card"><h2>Habla con el propietario de BOXPANEL</h2><p>Solicita tu acceso mediante el contacto que te entregó tu cuenta.</p><p class="muted">Los canales públicos oficiales se agregarán cuando estén confirmados.</p><a class="button" href="reseller.html">Abrir mi panel</a></section>';
 else root.innerHTML='<h1>Página no encontrada</h1><a class="button" href="#/">Regresar al inicio</a>';
 window.scrollTo(0,0);
}
addEventListener('hashchange',render);render();
