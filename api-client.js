// Only an origin is stored. Identity and permission checks always happen on the server.
export class ApiError extends Error { constructor(message,status=0) { super(message);this.status=status; } }
export function apiBase() {
  const raw=localStorage.getItem('boxpanel_api_origin');
  if (!raw) return location.origin;
  const u=new URL(raw); if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/') throw new ApiError('Configura una dirección HTTPS válida en Conexión.');
  return u.origin;
}
export function configureApi(raw) {
  const u=new URL(raw.trim());
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/') throw new ApiError('Usa solo la dirección HTTPS del servicio, sin rutas ni credenciales.');
  localStorage.setItem('boxpanel_api_origin',u.origin);
}
export function apiUrl(path) { if(!path.startsWith('/')||path.startsWith('//')) throw new ApiError('Ruta inválida.');return apiBase()+path; }
export async function api(path,{method='GET',body,signal,blob=false}={}) {
  const headers={};
  if (!['GET','HEAD'].includes(method)) headers['X-Boxpanel-Request']='1';
  if (body instanceof Blob) headers['content-type']=body.type;
  else if(body!==undefined) headers['content-type']='application/json';
  let res;
  try {res=await fetch(apiUrl(path),{method,credentials:'include',headers,body:body===undefined?undefined:body instanceof Blob?body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:signal||AbortSignal.timeout(20000)});}
  catch {throw new ApiError('No se pudo conectar. Abre Iniciar sesión o revisa la dirección del servicio.');}
  const isJson=(res.headers.get('content-type')||'').includes('application/json');
  if(blob&&res.ok&&!isJson)return res.blob();
  const data=isJson?await res.json():null;
  if(!res.ok)throw new ApiError(data?.error||'No se pudo completar la operación ('+res.status+').',res.status);
  if(!data)throw new ApiError('El servicio no devolvió datos. Revisa la conexión e inicia sesión.');
  return data;
}
