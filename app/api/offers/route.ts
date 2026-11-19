import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';
async function load(){const database=db();const [o,i]=await Promise.all([database.prepare('SELECT * FROM offers ORDER BY updated_at DESC').all(),database.prepare('SELECT oi.*,p.name AS product_name,p.base_price FROM offer_items oi JOIN products p ON p.id=oi.product_id').all()]);return o.results.map(row=>({id:row.id,name:row.name,description:row.description,specialPrice:row.special_price,active:!!row.active,items:i.results.filter(item=>item.offer_id===row.id).map(item=>({productId:item.product_id,name:item.product_name,basePrice:item.base_price,quantity:item.quantity}))}));}
export async function GET(){if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});try{await seedIfEmpty();return Response.json({offers:await load()})}catch(e){return responseError(e)}}
async function save(request:Request,id?:string){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  await seedIfEmpty();const input=await request.json() as Record<string,any>,database=db();
  const name=String(input.name||'').trim(),description=String(input.description||'').trim(),specialPrice=Number(input.specialPrice),items=Array.isArray(input.items)?input.items:[];
  if(!name||name.length>160||description.length>2000||!Number.isInteger(specialPrice)||specialPrice<1||items.length<2||items.length>30)return Response.json({error:'La oferta necesita un nombre, precio especial y al menos dos artículos.'},{status:400});
  const ids=new Set<string>();let totalBase=0;
  for(const item of items){const productId=String(item.productId||''),qty=Number(item.quantity);if(ids.has(productId)||!Number.isInteger(qty)||qty<1||qty>100)return Response.json({error:'Revisa los artículos y cantidades de la oferta.'},{status:400});ids.add(productId);const product=await database.prepare('SELECT base_price FROM products WHERE id=?').bind(productId).first<{base_price:number}>();if(!product)return Response.json({error:'Un artículo de la oferta ya no existe.'},{status:400});totalBase+=product.base_price*qty;}
  const offerId=id||crypto.randomUUID(),now=new Date().toISOString();
  if(id&&!await database.prepare('SELECT id FROM offers WHERE id=?').bind(id).first())return Response.json({error:'Oferta no encontrada'},{status:404});
  const statements=id?[database.prepare('UPDATE offers SET name=?,description=?,special_price=?,active=?,updated_at=? WHERE id=?').bind(name,description,specialPrice,!!input.active,now,id),database.prepare('DELETE FROM offer_items WHERE offer_id=?').bind(id)]:[database.prepare('INSERT INTO offers (id,name,description,special_price,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(offerId,name,description,specialPrice,!!input.active,now,now)];
  for(const item of items)statements.push(database.prepare('INSERT INTO offer_items (id,offer_id,product_id,quantity) VALUES (?,?,?,?)').bind(crypto.randomUUID(),offerId,String(item.productId),Number(item.quantity)));
  await database.batch(statements);return Response.json({ok:true,id:offerId,totalBase});
 }catch(e){return responseError(e)}
}
export async function POST(request:Request){return save(request)}
export {save};
