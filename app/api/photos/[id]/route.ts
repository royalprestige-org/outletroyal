import {db,requireAdmin,responseError} from '@/lib/catalog-db';
import {productStorage} from '@/lib/supabase/storage';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const row=await db().prepare('SELECT object_key FROM product_photos WHERE id=?')
      .bind(id).first<{object_key:string}>();
    if(!row||row.object_key==='static:chef-assist')return new Response('Foto no encontrada',{status:404});
    const {data,error}=await productStorage().download(row.object_key);
    if(error||!data)return new Response('Foto no encontrada',{status:404});
    return new Response(await data.arrayBuffer(),{headers:{
      'Content-Type':data.type||'application/octet-stream',
      'X-Content-Type-Options':'nosniff',
      'Cache-Control':'public, max-age=3600',
    }});
  }catch(e){return responseError(e)}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
  try{
    const {id}=await params,database=db();
    const row=await database.prepare('SELECT object_key FROM product_photos WHERE id=?')
      .bind(id).first<{object_key:string}>();
    if(!row)return Response.json({error:'Foto no encontrada'},{status:404});
    if(row.object_key!=='static:chef-assist'){
      const {error}=await productStorage().remove([row.object_key]);
      if(error)throw error;
    }
    await database.prepare('DELETE FROM product_photos WHERE id=?').bind(id).run();
    return Response.json({ok:true});
  }catch(e){return responseError(e)}
}
