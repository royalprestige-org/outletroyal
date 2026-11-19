import {env} from 'cloudflare:workers';
import {db,requireAdmin,responseError} from '@/lib/catalog-db';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;const row=await db().prepare('SELECT object_key FROM product_photos WHERE id=?').bind(id).first<{object_key:string}>();
  if(!row)return new Response('No encontrada',{status:404});
  if(row.object_key==='static:chef-assist')return Response.redirect(new URL('/chef-assist.webp',_request.url));
  const object=await env.BUCKET?.get(row.object_key);if(!object)return new Response('No encontrada',{status:404});
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set('Cache-Control','public, max-age=3600');
  return new Response(object.body,{headers});
 }catch(e){return responseError(e)}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{const {id}=await params;const database=db();const row=await database.prepare('SELECT object_key FROM product_photos WHERE id=?').bind(id).first<{object_key:string}>();
  if(!row)return Response.json({error:'Foto no encontrada'},{status:404});
  await database.prepare('DELETE FROM product_photos WHERE id=?').bind(id).run();
  if(row.object_key!=='static:chef-assist')await env.BUCKET?.delete(row.object_key);
  return Response.json({ok:true});
 }catch(e){return responseError(e)}
}
