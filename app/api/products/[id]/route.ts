import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  await seedIfEmpty();
  const {id}=await params;
  const input=await request.json() as Record<string,any>;
  const database=db();
  const existing=await database.prepare('SELECT id,kind,category FROM public.products WHERE id=?')
    .bind(id).first<{id:string;kind:string;category:string}>();
  if(!existing)return Response.json({error:'Producto no encontrado'},{status:404});

  const name=String(input.name||'').trim(),description=String(input.description||'').trim();
  const category=String(input.category??existing.category??'').trim();
  const price=Number(input.basePrice),components=Array.isArray(input.components)?input.components:[];
  if(!name||name.length>180||!category||category.length>90||description.length>5000||!Number.isInteger(price)||price<1||components.length>50){
   return Response.json({error:'Revisa el nombre, categoría, descripción, precio y componentes.'},{status:400});
  }

  // La asociación es dirigida (A->B), sin generar automáticamente B->A.
  // Si un cliente anterior no envía este campo, mantenemos las relaciones actuales.
  const relationInput=input.relatedProductIds;
  let relatedIds:string[]|null=null;
  if(relationInput!==undefined){
   if(!Array.isArray(relationInput)||relationInput.length>50||
      relationInput.some((x:unknown)=>typeof x!=='string'||!x.trim())){
    return Response.json({error:'Selecciona un máximo de 50 artículos relacionados válidos.'},{status:400});
   }
   relatedIds=relationInput.map((x:string)=>x.trim());
   if(new Set(relatedIds).size!==relatedIds.length||relatedIds.includes(id)){
    return Response.json({error:'No se permiten relaciones repetidas ni asociar un artículo consigo mismo.'},{status:400});
   }
   if(relatedIds.length){
    const available=await database.prepare('SELECT id FROM public.products').all<{id:string}>();
    const validIds=new Set(available.results.map(row=>row.id));
    if(relatedIds.some(target=>!validIds.has(target))){
     return Response.json({error:'Un artículo relacionado ya no está disponible.'},{status:400});
    }
   }
  }

  const isSet=input.kind==='set',now=new Date().toISOString();
  const statements=[
   database.prepare('UPDATE public.products SET name=?,category=?,description=?,base_price=?,kind=?,is_kitchen_set=?,completed=?,updated_at=? WHERE id=?')
    .bind(name,category,description,price,isSet?'set':'individual',!!input.isKitchenSet,!!input.completed,now,id),
   database.prepare('DELETE FROM public.product_components WHERE product_id=?').bind(id)
  ];
  if(isSet)for(const [i,c] of components.entries()){
   const label=String(c.label||'').trim(),qty=Number(c.quantity),target=c.componentProductId?String(c.componentProductId):null;
   if(!label||label.length>180||!Number.isInteger(qty)||qty<1||qty>100||target===id)return Response.json({error:'Revisa los artículos incluidos en el set.'},{status:400});
   if(target&&!await database.prepare('SELECT id FROM public.products WHERE id=?').bind(target).first())return Response.json({error:'Un producto incluido ya no existe.'},{status:400});
   statements.push(database.prepare('INSERT INTO public.product_components (id,product_id,component_product_id,label,quantity,position) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,target,label,qty,i));
  }
  if(relatedIds!==null){
   statements.push(database.prepare('DELETE FROM public.product_relations WHERE product_id=?').bind(id));
   for(const [i,target] of relatedIds.entries()){
    statements.push(database.prepare('INSERT INTO public.product_relations (product_id,related_product_id,position) VALUES (?,?,?)').bind(id,target,i));
   }
  }
  await database.batch(statements);
  return Response.json({ok:true,category,relatedProductIds:relatedIds});
 }catch(e){return responseError(e)}
}
