import {env} from 'cloudflare:workers';
import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';
const allowed=new Set(['image/jpeg','image/png','image/webp']);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  await seedIfEmpty();const {id}=await params;const database=db();
  if(!await database.prepare('SELECT id FROM products WHERE id=?').bind(id).first())return Response.json({error:'Producto no encontrado'},{status:404});
  const photoCount=await database.prepare('SELECT COUNT(*) AS n FROM product_photos WHERE product_id=?').bind(id).first<{n:number}>();
  if((photoCount?.n||0)>=5)return Response.json({error:'Se permiten hasta cinco fotos por artículo.'},{status:400});
  const form=await request.formData();const file=form.get('photo');
  if(!(file instanceof File)||!allowed.has(file.type)||file.size>8*1024*1024||file.size===0)return Response.json({error:'Sube una imagen JPG, PNG o WebP de hasta 8 MB.'},{status:400});
  if(!env.BUCKET)throw new Error('Almacenamiento de fotos no disponible');
  const photoId=crypto.randomUUID(),objectKey=`products/${id}/${photoId}`;
  await env.BUCKET.put(objectKey,file.stream(),{httpMetadata:{contentType:file.type}});
  try{await database.prepare('INSERT INTO product_photos (id,product_id,object_key,position) VALUES (?,?,?,?)').bind(photoId,id,objectKey,photoCount?.n||0).run()}
  catch(e){await env.BUCKET.delete(objectKey);throw e}
  return Response.json({ok:true,id:photoId,url:`/api/photos/${photoId}`});
 }catch(e){return responseError(e)}
}
