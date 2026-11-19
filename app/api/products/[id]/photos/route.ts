import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';
import {productStorage} from '@/lib/supabase/storage';
export const runtime='nodejs';
const allowed=new Set(['image/jpeg','image/png','image/webp']);
function validSignature(type:string,bytes:Uint8Array) {
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(type==='image/png')return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if(type==='image/webp')return [82,73,70,70].every((v,i)=>bytes[i]===v)&&
    [87,69,66,80].every((v,i)=>bytes[i+8]===v);
  return false;
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
  try{
    await seedIfEmpty();
    const {id}=await params,database=db();
    if(!/^RP-\d{3}$/.test(id))return Response.json({error:'Identificador no válido'},{status:400});
    if(!await database.prepare('SELECT id FROM products WHERE id=?').bind(id).first())
      return Response.json({error:'Producto no encontrado'},{status:404});
    const count=await database.prepare('SELECT COUNT(*) AS n FROM product_photos WHERE product_id=?')
      .bind(id).first<{n:number}>();
    if((count?.n||0)>=5)return Response.json({error:'Máximo cinco fotos por artículo.'},{status:400});
    const form=await request.formData(),file=form.get('photo');
    if(!(file instanceof File)||!allowed.has(file.type)||file.size>8*1024*1024||file.size===0)
      return Response.json({error:'Sube JPG, PNG o WebP de hasta 8 MB.'},{status:400});
    const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
    if(!validSignature(file.type,bytes))
      return Response.json({error:'El contenido de la imagen no coincide con su formato.'},{status:400});
    const photoId=crypto.randomUUID(),objectKey='products/'+id+'/'+photoId;
    const storage=productStorage();
    const uploaded=await storage.upload(objectKey,file,{contentType:file.type,upsert:false});
    if(uploaded.error)throw uploaded.error;
    try{
      await database.prepare('INSERT INTO product_photos (id,product_id,object_key,position) VALUES (?,?,?,?)')
        .bind(photoId,id,objectKey,count?.n||0).run();
    }catch(e){await storage.remove([objectKey]);throw e}
    return Response.json({ok:true,id:photoId,url:'/api/photos/'+photoId});
  }catch(e){return responseError(e)}
}
