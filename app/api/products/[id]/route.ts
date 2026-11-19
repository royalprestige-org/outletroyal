import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  await seedIfEmpty();const {id}=await params;const input=await request.json() as Record<string,any>;
  const name=String(input.name||'').trim(),description=String(input.description||'').trim();
  const price=Number(input.basePrice),components=Array.isArray(input.components)?input.components:[];
  if(!name||name.length>180||description.length>5000||!Number.isInteger(price)||price<1||components.length>50)return Response.json({error:'Revisa nombre, descripción, precio y componentes.'},{status:400});
  const database=db(),existing=await database.prepare('SELECT id,kind FROM products WHERE id=?').bind(id).first<{id:string;kind:string}>();
  if(!existing)return Response.json({error:'Producto no encontrado'},{status:404});
  const isSet=input.kind==='set';
  const now=new Date().toISOString();
  const statements=[database.prepare('UPDATE products SET name=?,description=?,base_price=?,kind=?,is_kitchen_set=?,completed=?,updated_at=? WHERE id=?').bind(name,description,price,isSet?'set':'individual',!!input.isKitchenSet,!!input.completed,now,id),database.prepare('DELETE FROM product_components WHERE product_id=?').bind(id)];
  if(isSet)for(const [i,c] of components.entries()){
   const label=String(c.label||'').trim(),qty=Number(c.quantity),target=c.componentProductId?String(c.componentProductId):null;
   if(!label||label.length>180||!Number.isInteger(qty)||qty<1||qty>100||target===id)return Response.json({error:'Revisa los artículos incluidos en el set.'},{status:400});
   if(target && !await database.prepare('SELECT id FROM products WHERE id=?').bind(target).first())return Response.json({error:'Un producto incluido ya no existe.'},{status:400});
   statements.push(database.prepare('INSERT INTO product_components (id,product_id,component_product_id,label,quantity,position) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,target,label,qty,i));
  }
  await database.batch(statements);
  return Response.json({ok:true});
 }catch(e){return responseError(e)}
}
