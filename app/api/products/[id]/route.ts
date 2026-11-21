import {db,requireAdmin,responseError,seedIfEmpty} from '@/lib/catalog-db';
import {hasRestrictedBrand} from '@/lib/brand-policy';

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await requireAdmin())return Response.json({error:'Acceso no autorizado'},{status:401});
 try{
  await seedIfEmpty();
  const {id}=await params;
  const input=await request.json() as Record<string,any>;
  const database=db();
  const existing=await database.prepare('SELECT id,kind,category_id,subcategory_id,is_gift_eligible FROM public.products WHERE id=?')
    .bind(id).first<{id:string;kind:string;category_id:string|null;subcategory_id:string|null;is_gift_eligible:boolean}>();
  if(!existing)return Response.json({error:'Producto no encontrado'},{status:404});

  const name=String(input.name||'').trim(),description=String(input.description||'').trim();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const categoryValue=Object.hasOwn(input,'categoryId')?input.categoryId:existing.category_id;
  const subcategoryValue=Object.hasOwn(input,'subcategoryId')?input.subcategoryId:existing.subcategory_id;
  const categoryId=categoryValue===null||categoryValue===''?null:categoryValue;
  const subcategoryId=subcategoryValue===null||subcategoryValue===''?null:subcategoryValue;
  if((categoryId!==null&&(typeof categoryId!=='string'||!uuid.test(categoryId)))||
     (subcategoryId!==null&&(typeof subcategoryId!=='string'||!uuid.test(subcategoryId)))||
     (subcategoryId!==null&&categoryId===null)){
    return Response.json({error:'Elige una categoría y subcategoría válidas.'},{status:400});
  }
  if(categoryId){
    const found=await database.prepare('SELECT id FROM public.catalog_categories WHERE id=?').bind(categoryId).first();
    if(!found)return Response.json({error:'La categoría seleccionada ya no existe.'},{status:400});
  }
  if(subcategoryId){
    const found=await database.prepare('SELECT id FROM public.catalog_subcategories WHERE id=? AND category_id=?').bind(subcategoryId,categoryId).first();
    if(!found)return Response.json({error:'La subcategoría no pertenece a la categoría elegida.'},{status:400});
  }
  const price=Number(input.basePrice),components=Array.isArray(input.components)?input.components:[];
  if(hasRestrictedBrand(name)||hasRestrictedBrand(description)||components.some(c=>hasRestrictedBrand(c?.label)))
   return Response.json({error:'Utiliza nombres y descripciones neutrales, sin marcas de fabricante.'},{status:400});
  if(!name||name.length>180||description.length>5000||!Number.isInteger(price)||price<1||components.length>50){
   return Response.json({error:'Revisa el nombre, descripción, precio y componentes.'},{status:400});
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

  if(input.isGiftEligible!==undefined&&typeof input.isGiftEligible!=='boolean')
    return Response.json({error:'La elegibilidad para regalo debe ser una opción válida.'},{status:400});
  const giftEligibleFlag=input.isGiftEligible===undefined?existing.is_gift_eligible:input.isGiftEligible;
  const isSet=input.kind==='set',now=new Date().toISOString();
  const statements=[
   database.prepare("UPDATE public.products SET name=?,category='',category_id=?,subcategory_id=?,description=?,base_price=?,kind=?,is_kitchen_set=?,is_gift_eligible=?,completed=?,updated_at=? WHERE id=?")
    .bind(name,categoryId,subcategoryId,description,price,isSet?'set':'individual',!!input.isKitchenSet,giftEligibleFlag,!!input.completed,now,id),
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
  return Response.json({ok:true,categoryId,subcategoryId,relatedProductIds:relatedIds});
 }catch(e){return responseError(e)}
}
